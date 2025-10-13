<?php
// app/Http/Controllers/Api/Company/RequestApiController.php
namespace App\Http\Controllers\Api\Company;

use App\Http\Controllers\Controller;
use App\Models\{Company, RideRequest};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequestApiController extends Controller
{
    use _CompanyGuard;

    public function index(Request $r, Company $company)
    {
        $this->assertCanView($r, $company);

        $status = $r->string('status','pending'); // по умолчанию pending
        $q = RideRequest::query()
            ->whereHas('trip', fn($qq)=>$qq->where('company_id',$company->id))
            ->with(['trip:id,from_addr,to_addr,price_amd,departure_at,company_id','user:id,name,email'])
            ->orderByDesc('id');

        if ($status) $q->where('status', $status);

        $items = $q->paginate($r->integer('per_page', 20));

        return response()->json([
            'data'=>$items->getCollection()->map(fn($x)=>[
                'id'=>$x->id,
                'status'=>$x->status,
                'seats'=>(int)$x->seats,
                'payment'=>$x->payment,
                'user'=>$x->user?['id'=>$x->user->id,'name'=>$x->user->name,'email'=>$x->user->email]:null,
                'trip'=>[
                    'id'=>$x->trip->id,
                    'from_addr'=>$x->trip->from_addr,'to_addr'=>$x->trip->to_addr,
                    'price_amd'=>(int)$x->trip->price_amd,
                    'departure_at'=>optional($x->trip->departure_at)->toIso8601String(),
                ],
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

    public function accept(Request $r, Company $company, RideRequest $requestModel)
    {
        $this->assertCanManage($r, $company);
        $trip = $requestModel->trip;
        abort_unless($trip && $trip->company_id === $company->id, 404);

        if ($requestModel->status !== 'pending') {
            return response()->json(['message'=>'only_pending_can_be_accepted'], 409);
        }

        // атомарно
        return DB::transaction(function () use ($requestModel, $trip, $r) {
            $left = $trip->seats_total - $trip->seats_taken;
            if ($left < $requestModel->seats) {
                return response()->json(['message'=>'not_enough_free_seats'], 422);
            }
            $trip->increment('seats_taken', $requestModel->seats);
            $requestModel->update([
                'status'=>'accepted',
                'decided_by_user_id'=>$r->user()->id,
                'decided_at'=>now(),
            ]);
            return response()->json(['status'=>'ok']);
        });
    }

    public function reject(Request $r, Company $company, RideRequest $requestModel)
    {
        $this->assertCanManage($r, $company);
        $trip = $requestModel->trip;
        abort_unless($trip && $trip->company_id === $company->id, 404);

        if ($requestModel->status !== 'pending') {
            return response()->json(['message'=>'only_pending_can_be_rejected'], 409);
        }

        $requestModel->update([
            'status'=>'rejected', // В БД у тебя перечисление: pending|accepted|rejected|cancelled
            'decided_by_user_id'=>$r->user()->id,
            'decided_at'=>now(),
        ]);

        return response()->json(['status'=>'ok']);
    }
}
