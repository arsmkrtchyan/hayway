<?php
//
//namespace App\Models;
//
//use Illuminate\Database\Eloquent\Model;
//use Illuminate\Database\Eloquent\Relations\BelongsTo;
//
//class TripStop extends Model
//{
//    protected $fillable = ['trip_id','position','name','addr','lat','lng'];
//
//    protected $casts = [
//        'lat' => 'float',
//        'lng' => 'float',
//        'position' => 'int',
//    ];
//
//    public function trip(): BelongsTo
//    {
//        return $this->belongsTo(Trip::class);
//    }
//}


namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TripStop extends Model
{
    protected $fillable = [
        'trip_id','position','name','addr','lat','lng',
        'free_km','amd_per_km','max_km',
    ];
//    protected $casts = [
//        'lat'=>'float','lng'=>'float',
//        'free_km'=>'float','max_km'=>'float', 'position' => 'int',
//    ];
    protected $casts = [
        'lat'=>'float','lng'=>'float',
        'free_km'=>'float','max_km'=>'float',
        'amd_per_km'=>'int',
        'position'=>'int',
    ];


    public function trip(){ return $this->belongsTo(Trip::class); }
}
