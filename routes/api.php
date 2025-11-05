<?php
// api.php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Api\{TripApiController,MeApiController,RideRequestApiController};
use App\Http\Controllers\Api\Driver\VehicleApiController;
use App\Http\Controllers\Api\Driver\TripApiController as DriverTripApiController;
use App\Http\Controllers\Api\Driver\RideRequestApiController as DriverReqApiController;
use App\Http\Controllers\Admin\AmenityController;
use App\Http\Controllers\Api\TripController as ApiTripController;
use App\Http\Controllers\Api\Driver\TripAmenitiesApiController;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful as Stateful;
use App\Http\Controllers\Api\Company\{
    CompanyApiController,
    MemberApiController,
    FleetApiController,
    TripApiController as CompanyTripApiController,
    RequestApiController as CompanyRequestApiController,
};
use App\Http\Controllers\Api\Clientv2\{
    TripApiController as C2TripApiController,
    BookingApiController as C2BookingApiController,
    RequestsApiController as C2RequestsApiController,
    CompletedApiController as C2CompletedApiController
};
use App\Http\Controllers\Api\Driverv2\{
    DashboardApiController,
    VehicleApiController as D2VehicleApiController,
    TripApiController as D2TripApiController,
    CompanyJobsApiController,
    NotificationsApiController,
    RideRequestsApiController,
    TripStopsApiController,
    TripAmenitiesApiController as D2TripAmenitiesApiController,
    TripRatingApiController,
    TripShowApiController as D2TripShowApiController,

};
use App\Http\Controllers\Api\QR\ClientQrController;
use App\Http\Controllers\Api\QR\DriverQrController;


use App\Http\Controllers\Api\CompaniesV2\{
    CompanyApiController as Com2CompanyApiController,
    FleetApiController as Com2FleetApiController,
    TripApiController as Com2TripApiController,
    RequestApiController as Com2RequestApiController,
    DashboardApiController as Com2DashboardApiController,
    MembersController as Com2MembersApiController,
};
use App\Http\Controllers\Api\OrdersController;
use App\Http\Controllers\Api\OrderMatchController;
use App\Http\Controllers\Api\OffersController;
use App\Http\Controllers\Api\NotificationsController as ApiNoti;


Route::middleware([Stateful::class, 'auth:sanctum'])->prefix('orderoffer')->group(function () {
   // Rider Orders
   Route::post('/orders', [OrdersController::class,'store']);         // создать заказ
   Route::get('/orders/my', [OrdersController::class,'my']);          // мои заказы
   Route::get('/orders/{order}', [OrdersController::class,'show']);   // просмотр
   Route::post('/orders/{order}/cancel', [OrdersController::class,'cancel']); // отмена

   // Подбор заказов под конкретный трип (радиус/коридор)
   Route::get('/trips/{trip}/orders/match', [OrderMatchController::class,'index']);

   // Driver Offers
   Route::post('/offers', [OffersController::class,'store']);                // создать оффер
   Route::get('/offers/my', [OffersController::class,'my']);                 // мои офферы (водитель)
   Route::post('/offers/{offer}/accept', [OffersController::class,'accept']); // принять (обычно клиент)
   Route::post('/offers/{offer}/reject', [OffersController::class,'reject']); // отклонить
   Route::post('/offers/{offer}/withdraw', [OffersController::class,'withdraw']); // отозвать (водитель)
});

Route::middleware([Stateful::class, 'auth:sanctum'])->prefix('notifications')->group(function () {
    Route::get ('/state', [ApiNoti::class,'state']);
    Route::post('/read',  [ApiNoti::class,'read']);
    Route::get ('/stream',[ApiNoti::class,'stream']); // SSE
});

Route::middleware(['auth:sanctum','throttle:60,1'])->group(function () {
   Route::post('/client/ride-requests/{rideRequest}/checkin-ticket', [ClientQrController::class, 'create'])
       ->name('api.client.checkin.create');

   Route::post('/driver/checkin-verify', [DriverQrController::class, 'verify'])
       ->name('api.driver.checkin.verify');
});
Route::middleware(['auth:sanctum','verified'])->prefix('companiesv2/')->group(function () {
    // список + фильтры
    Route::get('/{company}/members', [Com2MembersApiController::class, 'index']);

    // создать нового пользователя и привязать
    Route::post('/{company}/members/new', [Com2MembersApiController::class, 'storeNew']);

    // прикрепить существующего пользователя
    Route::post('/{company}/members/attach', [Com2MembersApiController::class, 'attachExisting']);

    // изменить роль
    Route::put('/{company}/members/{member}/role', [Com2MembersApiController::class, 'updateRole']);

    // статус
    Route::put('/{company}/members/{member}/suspend', [Com2MembersApiController::class, 'suspend']);
    Route::put('/{company}/members/{member}/activate', [Com2MembersApiController::class, 'activate']);

    // удалить из компании
    Route::delete('/{company}/members/{member}', [Com2MembersApiController::class, 'destroy']);
});


Route::middleware(['auth:sanctum', Stateful::class])->post('/client/ride-requests/{rideRequest}/checkin-ticket', [ClientQrController::class,'create']);
Route::middleware(['auth:sanctum', Stateful::class])->post('/driver/checkin-verify', [DriverQrController::class,'verify']);

Route::middleware('auth:sanctum')->prefix('companiesv2')->group(function () {

    // Company (без create/list)
    Route::get   ('/companies/{company}',         [Com2CompanyApiController::class,'show']);
    Route::put   ('/companies/{company}',         [Com2CompanyApiController::class,'update']);   // без email
    Route::delete('/companies/{company}',         [Com2CompanyApiController::class,'destroy']);  // status=deleted

    // Dashboard (KPI, графики) — JSON
    Route::get('/companies/{company}/dashboard',  [Com2DashboardApiController::class,'show']);

    // Fleet
    Route::get   ('/companies/{company}/fleet',                 [Com2FleetApiController::class,'index']);
    Route::post  ('/companies/{company}/fleet',                 [Com2FleetApiController::class,'store']);   // user_id = owner
    Route::delete('/companies/{company}/fleet/{vehicle}',       [Com2FleetApiController::class,'destroy']);

    // Trips
//    Route::get   ('/companies/{company}/trips',                 [Com2TripApiController::class,'index']);
//    Route::get   ('/companies/{company}/trips/{trip}',          [Com2TripApiController::class,'show']);
//    Route::post  ('/companies/{company}/trips',                 [Com2TripApiController::class,'store']);
//    Route::post  ('/companies/{company}/trips/{trip}/publish',  [Com2TripApiController::class,'publish']);
//    Route::post  ('/companies/{company}/trips/{trip}/archive',  [Com2TripApiController::class,'archive']);
//    Route::post  ('/companies/{company}/trips/{trip}/unarchive',[Com2TripApiController::class,'unarchive']);
//    Route::patch ('/companies/{company}/trips/{trip}/stops',    [Com2TripApiController::class,'replaceStops']);
//    Route::get   ('/companies/{company}/trips/{trip}/amenities',[Com2TripApiController::class,'amenitiesShow']);
//    Route::post  ('/companies/{company}/trips/{trip}/amenities',[Com2TripApiController::class,'amenitiesUpdate']);
//    Route::get   ('/companies/{company}/trips/search',          [Com2TripApiController::class,'search']);

    Route::get('{company}/trips',                [Com2TripApiController::class,'index']);
    Route::post('{company}/trips',               [Com2TripApiController::class,'store']);
    Route::post('{company}/trips/store-publish', [Com2TripApiController::class,'storePublished']);
    Route::get('{company}/trips/{trip}',         [Com2TripApiController::class,'show']);
    Route::patch('{company}/trips/{trip}',       [Com2TripApiController::class,'update']);

    Route::post('{company}/trips/{trip}/publish',   [Com2TripApiController::class,'publish']);
    Route::post('{company}/trips/{trip}/archive',   [Com2TripApiController::class,'archive']);
    Route::post('{company}/trips/{trip}/unarchive', [Com2TripApiController::class,'unarchive']);

    Route::post('{company}/trips/{trip}/start',  [Com2TripApiController::class,'start']);
    Route::post('{company}/trips/{trip}/finish', [Com2TripApiController::class,'finish']);

    Route::post('{company}/trips/{trip}/stops/replace', [Com2TripApiController::class,'replaceStops']);

    Route::get('{company}/trips/{trip}/amenities',    [Com2TripApiController::class,'amenitiesShow']);
    Route::post('{company}/trips/{trip}/amenities',   [Com2TripApiController::class,'amenitiesUpdate']);

    Route::get('{company}/trips-search', [Com2TripApiController::class,'search']);
    // Requests
    Route::get   ('/companies/{company}/requests',                       [Com2RequestApiController::class,'index']);   // pending
    Route::post  ('/companies/{company}/requests/{request}/accept',      [Com2RequestApiController::class,'accept']);
    Route::post  ('/companies/{company}/requests/{request}/decline',     [Com2RequestApiController::class,'decline']);
    Route::post  ('/companies/{company}/requests/{request}/transfer',    [Com2RequestApiController::class,'transfer']);
});





Route::middleware(['auth:sanctum'])->prefix('driverv2')->group(function () {
    // summary
    Route::get('/dashboard', [DashboardApiController::class,'index']);

    // vehicle
    Route::get('/vehicle',  [D2VehicleApiController::class,'show']);
    Route::post('/vehicle', [D2VehicleApiController::class,'upsert']);  // multipart/form-data OK
    Route::patch('/vehicle',[D2VehicleApiController::class,'upsert']);
    Route::get('/trip-show/{trip}', [D2TripShowApiController::class, 'show'])->whereNumber('trip');

    // my trips
//    Route::get('/trips',                [D2TripApiController::class,'index']);
//    Route::post('/trips',               [D2TripApiController::class,'store']);           // draft
//    Route::post('/trips/publish',       [D2TripApiController::class,'storePublished']);  // create+publish
//    Route::get('/trips/{trip}',         [D2TripApiController::class,'show'])->whereNumber('trip');
//    Route::patch('/trips/{trip}',       [D2TripApiController::class,'update'])->whereNumber('trip');
//    Route::post('/trips/{trip}/publish',[D2TripApiController::class,'publish'])->whereNumber('trip');
//    Route::post('/trips/{trip}/archive',[D2TripApiController::class,'archive'])->whereNumber('trip');
//    Route::post('/trips/{trip}/start',  [D2TripApiController::class,'start'])->whereNumber('trip');
//    Route::post('/trips/{trip}/finish', [D2TripApiController::class,'finish'])->whereNumber('trip');
    Route::get('trips',        [D2TripApiController::class,'index']);
    Route::post('trips',       [D2TripApiController::class,'store']);                 // draft
    Route::post('trips/publish',[D2TripApiController::class,'storePublished']);       // create + publish
    Route::get('trips/{trip}', [D2TripApiController::class,'show']);
    Route::patch('trips/{trip}', [D2TripApiController::class,'update']);
    Route::put('trips/{trip}/stops', [D2TripApiController::class,'replaceStops']);    // replace all stops
    Route::put('trips/{trip}/amenities', [D2TripApiController::class,'updateAmenities']);

    Route::post('trips/{trip}/publish', [D2TripApiController::class,'publish']);
    Route::post('trips/{trip}/archive', [D2TripApiController::class,'archive']);
    Route::post('trips/{trip}/start',   [D2TripApiController::class,'start']);
    Route::post('trips/{trip}/finish',  [D2TripApiController::class,'finish']);



    // amenities for a trip
    Route::get('/trips/{trip}/amenities',  [D2TripAmenitiesApiController::class,'show'])->whereNumber('trip');
    Route::put('/trips/{trip}/amenities',  [D2TripAmenitiesApiController::class,'update'])->whereNumber('trip');

    // stops
    Route::put('/trips/{trip}/stops', [TripStopsApiController::class,'replace'])->whereNumber('trip');

    // requests on my trips (owner or assigned)
    Route::post('/requests/{requestModel}/accept', [RideRequestsApiController::class,'accept'])
        ->whereNumber('requestModel');
    Route::post('/requests/{requestModel}/reject', [RideRequestsApiController::class,'reject'])
        ->whereNumber('requestModel');
    Route::post('/requests/{requestModel}/open-chat', [RideRequestsApiController::class,'openChat'])
        ->whereNumber('requestModel');


    Route::post('/trips/{trip}/requests/fake', [RideRequestsApiController::class,'fake'])->whereNumber('trip');

//    Route::post('/requests/{request}/open-chat', [RideRequestsApiController::class,'openChat'])->whereNumber('request');

    // company jobs assigned to me
    Route::get('/company/jobs',                 [CompanyJobsApiController::class,'index']);
    Route::post('/company/trips/{trip}/start',  [CompanyJobsApiController::class,'start'])->whereNumber('trip');
    Route::post('/company/trips/{trip}/finish', [CompanyJobsApiController::class,'finish'])->whereNumber('trip');

    // notifications
    Route::get('/notifications/pending', [NotificationsApiController::class,'pendingState']);

    // ratings set by driver to passenger
    Route::post('/trips/{trip}/rate-user', [TripRatingApiController::class,'rateUser'])->whereNumber('trip');
});




Route::prefix('clientv2')->group(function () {
    // public
    Route::get('/trips', [C2TripApiController::class,'index']);
    Route::get('/trips/{trip}', [C2TripApiController::class,'show'])->whereNumber('trip');
    Route::get('/amenities', [C2TripApiController::class,'amenityFilters']);

    // auth
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/trips/{trip}/requests', [C2BookingApiController::class,'store'])->whereNumber('trip');

        Route::get('/my/requests',  [C2RequestsApiController::class,'index']);
        Route::delete('/my/requests/{id}', [C2RequestsApiController::class,'destroy'])->whereNumber('id');
        Route::get('/my/requests/{id}',  [C2BookingApiController::class,'show'])->whereNumber('id');

        Route::get('/completed', [C2CompletedApiController::class,'index']);
        Route::post('/trips/{trip}/rate', [C2CompletedApiController::class,'rate'])->whereNumber('trip');
    });
});



























Route::get('/ping', fn() => response()->json(['ok'=>true,'ts'=>now()->toIso8601String()]));

Route::middleware(['auth:sanctum','verified'])->group(function () {
    // список/сводка компаний пользователя
    Route::get('/company', [CompanyApiController::class,'index']);
    Route::get('/company/{company}', [CompanyApiController::class,'show'])->whereNumber('company');

    // состав
    Route::get('/company/{company}/members', [MemberApiController::class,'index'])->whereNumber('company');
    Route::post('/company/{company}/members', [MemberApiController::class,'store'])->whereNumber('company');
    Route::patch('/company/{company}/members/{user}', [MemberApiController::class,'update'])->whereNumber(['company','user']);
    Route::delete('/company/{company}/members/{user}', [MemberApiController::class,'destroy'])->whereNumber(['company','user']);

    // флот
    Route::get('/company/{company}/fleet', [FleetApiController::class,'index'])->whereNumber('company');
    Route::post('/company/{company}/fleet', [FleetApiController::class,'store'])->whereNumber('company');
    Route::delete('/company/{company}/fleet/{vehicle}', [FleetApiController::class,'destroy'])->whereNumber(['company','vehicle']);

    // рейсы
    Route::get('/company/{company}/trips', [CompanyTripApiController::class,'index'])->whereNumber('company');
    Route::post('/company/{company}/trips', [CompanyTripApiController::class,'store'])->whereNumber('company');
    Route::post('/company/{company}/trips/{trip}/publish', [CompanyTripApiController::class,'publish'])->whereNumber(['company','trip']);
    Route::post('/company/{company}/trips/{trip}/archive', [CompanyTripApiController::class,'archive'])->whereNumber(['company','trip']);
    Route::post('/company/{company}/trips/{trip}/unarchive', [CompanyTripApiController::class,'unarchive'])->whereNumber(['company','trip']);

    // заявки на рейсы компании
    Route::get('/company/{company}/requests', [CompanyRequestApiController::class,'index'])->whereNumber('company');
    Route::post('/company/{company}/requests/{request}/accept', [CompanyRequestApiController::class,'accept'])->whereNumber(['company','request']);
    Route::post('/company/{company}/requests/{request}/reject', [CompanyRequestApiController::class,'reject'])->whereNumber(['company','request']);
});






Route::post('/login',  [AuthApiController::class, 'login'])->middleware('throttle:10,1');
Route::post('/logout', [AuthApiController::class, 'logout'])->middleware('auth:sanctum');
Route::post('/logout-all', [AuthApiController::class, 'logoutAll'])->middleware('auth:sanctum');
Route::post('/register/client',  [AuthApiController::class, 'registerClient'])->middleware('throttle:8,1');
Route::post('/register/driver',  [AuthApiController::class, 'registerDriver'])->middleware('throttle:8,1');
Route::post('/register/company', [AuthApiController::class, 'registerCompany'])->middleware('throttle:8,1');



Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',                [MeApiController::class,'show']);
    Route::post('/auth/logout',      [AuthApiController::class,'logout']);
    Route::post('/auth/logout-all',  [AuthApiController::class,'logoutAll']);

    // Trips
    Route::get('/trips',             [TripApiController::class,'index']);
    Route::get('/trips/{trip}',      [TripApiController::class,'show'])->whereNumber('trip');

    // Requests (booking)
    Route::post('/trips/{trip}/requests', [RideRequestApiController::class,'store'])->whereNumber('trip');
    Route::get('/my/requests',            [RideRequestApiController::class,'index']);
    Route::delete('/my/requests/{id}',    [RideRequestApiController::class,'destroy'])->whereNumber('id');
});

Route::middleware('auth:sanctum')->prefix('driver')->group(function () {

    // VEHICLE
    Route::get('/vehicle',            [VehicleApiController::class, 'show']);
    Route::post('/vehicle',           [VehicleApiController::class, 'upsert']);   // multipart/form-data поддерживается
    Route::patch('/vehicle',          [VehicleApiController::class, 'upsert']);   // то же, что post

    // TRIPS (мои)
    Route::get('/trips',              [DriverTripApiController::class, 'index']);
    Route::post('/trips',             [DriverTripApiController::class, 'store']); // create draft|published
    Route::get('/trips/{trip}',       [DriverTripApiController::class, 'show'])->whereNumber('trip');
    Route::patch('/trips/{trip}',     [DriverTripApiController::class, 'update'])->whereNumber('trip');
    Route::post('/trips/{trip}/publish', [DriverTripApiController::class, 'publish'])->whereNumber('trip');
    Route::post('/trips/{trip}/archive', [DriverTripApiController::class, 'archive'])->whereNumber('trip');


    Route::get('trips/{trip}/amenities', [TripAmenitiesApiController::class,'show']);
    Route::put('trips/{trip}/amenities', [TripAmenitiesApiController::class,'update']);
    // REQUESTS по моим рейсам
    Route::get('/requests',                   [DriverReqApiController::class, 'index']); // все мои
    Route::get('/trips/{trip}/requests',      [DriverReqApiController::class, 'byTrip'])->whereNumber('trip');
    Route::post('/requests/{id}/accept',      [DriverReqApiController::class, 'accept'])->whereNumber('id');
    Route::post('/requests/{id}/reject',      [DriverReqApiController::class, 'reject'])->whereNumber('id');

    // демо (по желанию)
    Route::post('/trips/{trip}/requests/fake',[DriverReqApiController::class, 'fake'])->whereNumber('trip');
});
Route::get('/amenities', [AmenityController::class, 'index']);


    // общий список удобств для UI (поддерживает ?only_active=1)


    // trip amenities

    // admin (Policy AmenityPolicy пропускает только админов)
    Route::prefix('admin')->group(function () {
        Route::get('/amenities', [AmenityController::class, 'index']);
        Route::post('/amenities', [AmenityController::class, 'store']);
        Route::patch('/amenities/{amenity}', [AmenityController::class, 'update']);
        Route::delete('/amenities/{amenity}', [AmenityController::class, 'destroy']);
        Route::post('/amenities/{amenity}/toggle', [AmenityController::class, 'toggle']);
    });

Route::get('/trips', [ApiTripController::class, 'index']);

// пример защищённого API
Route::middleware('auth:sanctum')->get('/me', fn(\Illuminate\Http\Request $r) => $r->user());
