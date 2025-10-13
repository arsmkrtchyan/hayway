<?php
// app/Http/Controllers/Api/Company/TripApiController.php
namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, Trip};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class TripApiController extends Controller
{
    use _CompanyGuard;

    public function index(Request $r, Company $company)
    {
        $this->assertCanView($r, $company);

        $q = $company->trips()
            ->with(['vehicle:id,brand,model,plate','assignedDriver:id,name'])
            ->withCount([
                'rideRequests as pending_requests_count'=>fn($q)=>$q->where('status','pending'),
                'rideRequests as accepted_requests_count'=>fn($q)=>$q->where('status','accepted'),
            ]);

        if ($r->filled('status')) $q->where('status', $r->string('status'));
        if ($r->filled('from_addr')) $q->where('from_addr','like','%'.$r->string('from_addr').'%');
        if ($r->filled('to_addr')) $q->where('to_addr','like','%'.$r->string('to_addr').'%');

        $items = $q->latest()->paginate($r->integer('per_page',20));

        return response()->json([
            'data'=>$items->getCollection()->map(fn(Trip $t)=>[
                'id'=>$t->id,
                'from_addr'=>$t->from_addr,'to_addr'=>$t->to_addr,
                'from_lat'=>(float)$t->from_lat,'from_lng'=>(float)$t->from_lng,
                'to_lat'=>(float)$t->to_lat,'to_lng'=>(float)$t->to_lng,
                'departure_at'=>optional($t->departure_at)->toIso8601String(),
                'price_amd'=>(int)$t->price_amd,
                'seats_total'=>(int)$t->seats_total,'seats_taken'=>(int)$t->seats_taken,
                'status'=>$t->status,
                'pay_methods'=>$t->pay_methods ?? [],
                'vehicle'=>$t->vehicle?[
                    'id'=>$t->vehicle->id,'brand'=>$t->vehicle->brand,'model'=>$t->vehicle->model,'plate'=>$t->vehicle->plate
                ]:null,
                'assigned_driver'=>$t->assignedDriver?['id'=>$t->assignedDriver->id,'name'=>$t->assignedDriver->name]:null,
                'pending_requests_count'=>(int)$t->pending_requests_count,
                'accepted_requests_count'=>(int)$t->accepted_requests_count,
            ]),
            'meta'=>[
                'current_page'=>$items->currentPage(),'last_page'=>$items->lastPage(),
                'per_page'=>$items->perPage(),'total'=>$items->total(),
            ],
            'links'=>[
                'first'=>$items->url(1),'last'=>$items->url($items->lastPage()),
                'prev'=>$items->previousPageUrl(),'next'=>$items->nextPageUrl(),
            ],
        ]);
    }

    public function store(Request $r, Company $company)
    {
        $this->assertCanManage($r, $company);

        $data = $r->validate([
            'vehicle_id'          => 'required|exists:vehicles,id',
            'assigned_driver_id'  => 'required|exists:users,id',
            'from_addr'           => 'required|string|max:255',
            'to_addr'             => 'required|string|max:255',
            'from_lat'            => 'required|numeric',
            'from_lng'            => 'required|numeric',
            'to_lat'              => 'required|numeric',
            'to_lng'              => 'required|numeric',
            'price_amd'           => 'required|integer|min:0',
            'seats_total'         => 'required|integer|min:1|max:8',
            'departure_at'        => 'required|date',
            'pay_methods'         => 'required|array|min:1',
            'pay_methods.*'       => 'in:cash,card',
        ]);

        // принадлежность ТС и водителя компании
        abort_unless($company->vehicles()->where('id',$data['vehicle_id'])->exists(), 422, 'vehicle_not_in_company');
        abort_unless($company->users()->where('users.id',$data['assigned_driver_id'])->exists(), 422, 'driver_not_in_company');

        $trip = Trip::create([
            ...$data,
            'company_id'=>$company->id,
            'user_id'=>$r->user()->id,   // кто создал
            'status'=>'draft',
        ]);

        return response()->json(['status'=>'ok','trip'=>['id'=>$trip->id,'status'=>$trip->status]], 201);
    }

    public function publish(Request $r, Company $company, Trip $trip)
    {
        $this->assertCanManage($r, $company);
        abort_unless($trip->company_id === $company->id, 404);

        if ($trip->status !== 'draft') return response()->json(['message'=>'only_draft_can_be_published'], 409);

        $left = max(0, (int)$trip->seats_total - (int)$trip->seats_taken);
        if ($left <= 0) return response()->json(['message'=>'no_free_seats'], 409);

        $trip->status = 'published';
        if (Schema::hasColumn($trip->getTable(),'published_at')) $trip->published_at = now();
        $trip->save();

        return response()->json(['status'=>'ok']);
    }

    public function archive(Request $r, Company $company, Trip $trip)
    {
        $this->assertCanManage($r, $company);
        abort_unless($trip->company_id === $company->id, 404);

        if ($trip->status === 'archived') return response()->json(['message'=>'already_archived'], 409);

        $trip->status = 'archived';
        $trip->save();

        return response()->json(['status'=>'ok']);
    }

    public function unarchive(Request $r, Company $company, Trip $trip)
    {
        $this->assertCanManage($r, $company);
        abort_unless($trip->company_id === $company->id, 404);

        $trip->status = 'draft';
        $trip->save();

        return response()->json(['status'=>'ok']);
    }
}
