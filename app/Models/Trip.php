<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\SoftDeletes;
class Trip extends Model
{
   use SoftDeletes; // <<

    protected $fillable = [
        'user_id','vehicle_id',
        'from_lat','from_lng','from_addr',
        'to_lat','to_lng','to_addr',
        'departure_at','seats_total','seats_taken',
        'price_amd','pay_methods','status','description',
        'type_ab_fixed','type_pax_to_pax','type_pax_to_b','type_a_to_pax',
        'start_free_km','start_amd_per_km','start_max_km',
        'end_free_km','end_amd_per_km','end_max_km',
        'driver_state','driver_started_at','driver_finished_at',
        'company_id','assigned_driver_id',
        'eta_sec' ,
    ];

    protected $casts = [
        'pay_methods' => 'array',
        'departure_at' => 'datetime',
        'driver_finished_at' => 'datetime',
        'type_ab_fixed' => 'bool',
        'type_pax_to_pax' => 'bool',
        'type_pax_to_b' => 'bool',
        'type_a_to_pax' => 'bool',
        'from_lat' => 'float','from_lng'=>'float',
        'to_lat' => 'float','to_lng'=>'float',
        'start_free_km' => 'float','start_max_km'=>'float',
        'end_free_km' => 'float','end_max_km'=>'float',
        'eta_sec' => 'int',
        'corridor_km'      => 'float',
        'route_length_km'  => 'float',
    ];

    protected $appends = ['amenity_ids'];

    protected static function booted(): void
    {
        static::saving(function (Trip $trip) {
            $trip->from_addr_search = self::normalizeForSearch($trip->from_addr);
            $trip->to_addr_search = self::normalizeForSearch($trip->to_addr);
        });
          static::created(function($trip){
        if ($trip->status === 'published') event(new \App\Events\TripPublished($trip));
    });
    static::updated(function($trip){
        if ($trip->wasChanged('status') && $trip->status === 'published') {
            event(new \App\Events\TripPublished($trip));
        }
    });
    }

    private static function normalizeForSearch(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        try {
            $latin = Str::transliterate($trimmed);
        } catch (\Throwable) {
            $latin = Str::ascii($trimmed);
        }

        $normalized = Str::of($latin)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/u', ' ')
            ->squish()
            ->value();

        return $normalized === '' ? null : $normalized;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function requests()
    {
        return $this->hasMany(RideRequest::class);
    }

    public function rideRequests()
    {
        return $this->hasMany(RideRequest::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function assignedDriver()
    {
        return $this->belongsTo(User::class, 'assigned_driver_id');
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class)
            ->withPivot(['selected_at', 'notes'])
            ->withTimestamps();
    }

    /** Скоуп для фильтрации по наборам удобств: все выбранные должны присутствовать */
    public function scopeWithAllAmenities($q, array $amenityIds)
    {
        foreach ($amenityIds as $id) {
            $q->whereHas('amenities', fn($qq) => $qq->where('amenities.id', $id));
        }
        return $q;
    }

    public function getAmenityIdsAttribute(): array
    {
        if ($this->relationLoaded('amenities')) {
            return $this->amenities->pluck('id')->all();
        }
        // ВАЖНО: плучаем ИМЕННО amenities.id, иначе будет пусто
        return $this->amenities()->pluck('amenities.id')->all();
    }

    public function stops()
    {
        return $this->hasMany(\App\Models\TripStop::class)->orderBy('position');
    }

    public function ratings()
    {
        return $this->hasMany(\App\Models\Rating::class);
    }
    public function typeKey(): string
    {
        if ($this->type_ab_fixed)   return 'AB';
        if ($this->type_pax_to_pax) return 'PAX_PAX';
        if ($this->type_pax_to_b)   return 'PAX_B';
        if ($this->type_a_to_pax)   return 'A_PAX';
        return 'UNKNOWN';
    }
   public function freeSeats(): int
    {
        return max(0, (int)$this->seats_total - (int)$this->seats_taken);
    }
    public function tariffStart(): array { return [
        'free_km'=>$this->start_free_km,'amd_per_km'=>$this->start_amd_per_km,'max_km'=>$this->start_max_km
    ];}

    public function tariffEnd(): array { return [
        'free_km'=>$this->end_free_km,'amd_per_km'=>$this->end_amd_per_km,'max_km'=>$this->end_max_km
    ];}
    public function routePointsFor(?User $viewer = null): \Illuminate\Support\Collection
    {
        $viewerId = $viewer?->id;
        $near = static function(float $aLat,float $aLng,float $bLat,float $bLng): bool {
            // ~40–60 м
            $eps = 0.0006;
            return (abs($aLat-$bLat) <= $eps) && (abs($aLng-$bLng) <= $eps);
        };

        // Координаты приватных точек (созданных клиентами, не равными текущему зрителю)
        $foreignPrivate = [];
        foreach ($this->rideRequests()->where('status','accepted')->get(['created_by_user_id','meta']) as $rr) {
            $cid = $rr->created_by_user_id;
            $m   = (array)$rr->meta;
            if ($cid && $cid !== $viewerId) {
                foreach (['pickup','drop'] as $k) {
                    if (!empty($m[$k]['lat']) && !empty($m[$k]['lng'])) {
                        $foreignPrivate[] = ['lat'=>(float)$m[$k]['lat'],'lng'=>(float)$m[$k]['lng']];
                    }
                }
            }
        }

        $pts = [];

        // A
        $pts[] = ['lat'=>(float)$this->from_lat,'lng'=>(float)$this->from_lng,'public'=>true,'source'=>'A'];

        // Ordered stops: маркер скрываем, если совпал с чьей-то приватной точкой
        foreach ($this->stops()->orderBy('position')->get(['lat','lng']) as $s) {
            $isPublic = true;
            foreach ($foreignPrivate as $p) {
                if ($near((float)$s->lat,(float)$s->lng,$p['lat'],$p['lng'])) { $isPublic = false; break; }
            }
            $pts[] = ['lat'=>(float)$s->lat,'lng'=>(float)$s->lng,'public'=>$isPublic,'source'=>'stop'];
        }

        // B
        $pts[] = ['lat'=>(float)$this->to_lat,'lng'=>(float)$this->to_lng,'public'=>true,'source'=>'B'];

        // Дополнительно: личные точки зрителя (или водительские, created_by_user_id = null) — как маркеры 'via'
        foreach ($this->rideRequests()->where('status','accepted')->get(['user_id','created_by_user_id','meta']) as $rr) {
            $owner = $viewerId && ($rr->created_by_user_id === $viewerId);
            $publicForAll = is_null($rr->created_by_user_id); // создал водитель/диспетчер
            if (!$owner && !$publicForAll) continue;

            $m = (array)$rr->meta;
            foreach (['pickup','drop'] as $k) {
                if (!empty($m[$k]['lat']) && !empty($m[$k]['lng'])) {
                    $pts[] = [
                        'lat'=>(float)$m[$k]['lat'],'lng'=>(float)$m[$k]['lng'],
                        'public'=>true,'source'=>'via'
                    ];
                }
            }
        }

        // Уберём подряд идущие дубликаты
        $out = [];
        foreach ($pts as $p) {
            $last = end($out) ?: null;
            if ($last && abs($last['lat']-$p['lat'])<1e-7 && abs($last['lng']-$p['lng'])<1e-7 && $last['source']!=='via') {
                // сохраняем более «публичный» маркер
                $out[count($out)-1]['public'] = $out[count($out)-1]['public'] || $p['public'];
            } else {
                $out[] = $p;
            }
        }
        return collect($out);
    }

}



//
//namespace App\Models;
//
//use Illuminate\Database\Eloquent\Model;
//use Illuminate\Database\Eloquent\Relations\BelongsToMany;
//use Illuminate\Support\Collection;
//
//class Trip extends Model
//{
//    protected $fillable = [
//        'user_id', 'vehicle_id',
//        'from_lat', 'from_lng', 'from_addr',
//        'to_lat', 'to_lng', 'to_addr',
//        'departure_at', 'seats_total', 'seats_taken',
//        'price_amd', 'pay_methods', 'status', 'description',
//        'type_ab_fixed', 'type_pax_to_pax', 'type_pax_to_b', 'type_a_to_pax',
//        'start_free_km', 'start_amd_per_km', 'start_max_km',
//        'end_free_km', 'end_amd_per_km', 'end_max_km',
//        'driver_state', 'driver_started_at', 'driver_finished_at',
//        'company_id', 'assigned_driver_id',
//        'eta_sec',
//    ];
//
//    protected $casts = [
//        'pay_methods' => 'array',
//        'departure_at' => 'datetime',
//        'type_ab_fixed' => 'bool',
//        'type_pax_to_pax' => 'bool',
//        'type_pax_to_b' => 'bool',
//        'type_a_to_pax' => 'bool',
//        'from_lat' => 'float', 'from_lng' => 'float',
//        'to_lat' => 'float', 'to_lng' => 'float',
//        'start_free_km' => 'float', 'start_max_km' => 'float',
//        'end_free_km' => 'float', 'end_max_km' => 'float',
//        'eta_sec' => 'int',
//    ];
//
//    protected $appends = ['amenity_ids'];
//
//    /* relations */
//    public function user()
//    {
//        return $this->belongsTo(User::class);
//    }
//
//    public function driver()
//    {
//        return $this->belongsTo(User::class, 'user_id');
//    }
//
//    public function vehicle()
//    {
//        return $this->belongsTo(Vehicle::class);
//    }
//
//    public function company()
//    {
//        return $this->belongsTo(Company::class);
//    }
//
//    public function assignedDriver()
//    {
//        return $this->belongsTo(User::class, 'assigned_driver_id');
//    }
//
//    public function amenities(): BelongsToMany
//    {
//        return $this->belongsToMany(Amenity::class)->withPivot(['selected_at', 'notes'])->withTimestamps();
//    }
//
//    public function stops()
//    {
//        return $this->hasMany(TripStop::class, 'trip_id')->orderBy('position');
//    }
//
//    public function rideRequests()
//    {
//        return $this->hasMany(RideRequest::class, 'trip_id');
//    }
//
//    public function ratings()
//    {
//        return $this->hasMany(Rating::class);
//    }
//
//    /* helpers */
//    public function scopeWithAllAmenities($q, array $amenityIds)
//    {
//        foreach ($amenityIds as $id) {
//            $q->whereHas('amenities', fn($qq) => $qq->where('amenities.id', $id));
//        }
//        return $q;
//    }
//
//    public function getAmenityIdsAttribute(): array
//    {
//        if ($this->relationLoaded('amenities')) return $this->amenities->pluck('id')->all();
//        return $this->amenities()->pluck('amenities.id')->all();
//    }
//
//    public function typeKey(): string
//    {
//        if ($this->type_ab_fixed) return 'AB';
//        if ($this->type_pax_to_pax) return 'PAX_PAX';
//        if ($this->type_pax_to_b) return 'PAX_B';
//        if ($this->type_a_to_pax) return 'A_PAX';
//        return 'UNKNOWN';
//    }
//
//    public function tariffStart(): array
//    {
//        return [
//            'free_km' => $this->start_free_km, 'amd_per_km' => $this->start_amd_per_km, 'max_km' => $this->start_max_km
//        ];
//    }
//
//    public function tariffEnd(): array
//    {
//        return [
//            'free_km' => $this->end_free_km, 'amd_per_km' => $this->end_amd_per_km, 'max_km' => $this->end_max_km
//        ];
//    }
//
//    /**
//     * Точки маршрута с флагом видимости маркера.
//     * Маршрут проходит через приватные pickup/drop принятых заявок,
//     * но чужие маркеры скрываются (видит только владелец).
//     */
//    public function routePointsFor(?User $viewer = null): Collection
//    {
//        $viewerId = $viewer?->id;
//
//        $pts = [];
//        $push = static function (&$arr, $lat, $lng, bool $public, string $src, ?int $userId = null): void {
//            if (!is_numeric($lat) || !is_numeric($lng)) return;
//            $arr[] = [
//                'lat' => round((float)$lat, 6),
//                'lng' => round((float)$lng, 6),
//                'public' => $public,   // показывать ли маркер
//                'source' => $src,      // A|B|stop|via
//                'user_id' => $userId,
//            ];
//        };
//
//        $push($pts, $this->from_lat, $this->from_lng, true, 'A');
//
//        foreach ($this->stops()->get(['lat', 'lng']) as $s) {
//            $push($pts, $s->lat, $s->lng, true, 'stop');
//        }
//
//        foreach ($this->rideRequests()->where('status', 'accepted')->get(['user_id', 'meta']) as $rr) {
//            $m = (array)$rr->meta;
//            foreach (['pickup', 'drop'] as $k) {
//                if (!empty($m[$k]['lat']) && !empty($m[$k]['lng'])) {
//                    $owner = $viewerId === (int)$rr->user_id;
//                    $push($pts, $m[$k]['lat'], $m[$k]['lng'], $owner, 'via', (int)$rr->user_id);
//                }
//            }
//        }
//
//        $push($pts, $this->to_lat, $this->to_lng, true, 'B');
//
//        // порядок вдоль A→B (по расстоянию от A)
//        $A_lat = (float)$this->from_lat;
//        $A_lng = (float)$this->from_lng;
//        usort($pts, static function ($p, $q) use ($A_lat, $A_lng) {
//            $dp = ($p['lat'] - $A_lat) ** 2 + ($p['lng'] - $A_lng) ** 2;
//            $dq = ($q['lat'] - $A_lat) ** 2 + ($q['lng'] - $A_lng) ** 2;
//            return $dp <=> $dq;
//        });
//
//        // убираем подряд идущие дубликаты
//        $out = [];
//        $prev = null;
//        foreach ($pts as $p) {
//            if ($prev && abs($prev['lat'] - $p['lat']) < 1e-6 && abs($prev['lng'] - $p['lng']) < 1e-6) continue;
//            $out[] = $p;
//            $prev = $p;
//        }
//        return collect($out);
//    }
//
//}
