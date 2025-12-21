<?php
// web.php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\RoleRegisterController;
use App\Http\Controllers\Admin\ApprovalController;
use App\Http\Controllers\Driver\CompanyJobController;
use App\Http\Controllers\Driver\{DashboardController as DriverDashboardController, VehicleController, TripController, RideRequestController};
//use App\Http\Controllers\Company\{DashboardController as CompanyDashboardController, MemberController as CompanyMemberController, FleetController as CompanyFleetController, TripController as CompanyTripController, RequestController as CompanyRequestController ,CompanyController};
//use App\Http\Controllers\Company\TripController as CTrip;
//use App\Http\Controllers\Company\TripAmenitiesController as CAmen;
//use App\Http\Controllers\Company\TripStopsController as CStops;
//use App\Http\Controllers\Company\RequestController as CReq;
use App\Http\Controllers\Company\CompanyController;
use App\Http\Controllers\Company\MemberController as CompanyMemberController;
use App\Http\Controllers\Company\FleetController  as CompanyFleetController;
use App\Http\Controllers\Company\TripController   as CTrip;
use App\Http\Controllers\Company\TripAmenitiesController as CAmen;
use App\Http\Controllers\Company\TripStopsController     as CStops;
use App\Http\Controllers\Company\RequestController       as CReq;
use App\Http\Controllers\Company\OwnerDashboardController;
use App\Http\Controllers\Company\TripStopsController as CTripStops;
use App\Http\Controllers\OffersPageController ;

use App\Models\Trip;



use App\Http\Controllers\AmenityCatalogController;
use  App\Http\Controllers\Driver\TripAmenitiesController as DriverTripAmenitiesController;
use App\Http\Controllers\Client\BookingController;
use App\Http\Controllers\Client\ExploreController;
use App\Http\Controllers\Driver\TripStopsController;
use App\Http\Controllers\Client\RequestsController;
use App\Http\Controllers\Chat\{ChatApiController,ChatPageController};
use App\Http\Controllers\Client\ProjectReviewController;
use App\Http\Controllers\Driver\TripShowController as DriverTripShowController;
use App\Http\Controllers\Driver\TripRatingController as DriverTripRatingController;
use  App\Http\Controllers\Driver\NotificationsController as DriverNotificationsController;
use App\Http\Controllers\Driver\TariffQuoteController;
use App\Http\Controllers\Chat\ChatV2Controller;
use Illuminate\Http\Request;

use App\Http\Controllers\Driver\TripDetailController;
use App\Http\Controllers\Driver\RatingController;

use App\Http\Controllers\Api\OrderMatchController;
use App\Http\Controllers\Api\OrdersController;
use App\Http\Controllers\Api\OffersController;
use App\Http\Controllers\Client\RideRequestController as ClientRideRequestController;
use App\Http\Controllers\Client\TripStopRequestsController as ClientTripStopRequestsController;
use App\Http\Controllers\Driver\TripStopRequestsController as DriverTripStopRequestsController;
use App\Http\Controllers\Driver\TripSimController;






Route::middleware('auth')->prefix('api')->group(function () {
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

    // Amenities
//    Route::get('/amenities', [\App\Http\Controllers\Admin\AmenityController::class, 'index']);
});
Route::name('driver.')
    ->prefix('driver')
    ->middleware('auth')
    ->group(function () {
        Route::post('trip/{trip}/simulate/{rideRequest}', [TripSimController::class, 'preview'])
            ->whereNumber('trip')
            ->whereNumber('rideRequest')
            ->name('trip.simulate');
    });



Route::middleware(['auth','verified'])->group(function () {
    // 4 вида заявок клиента: AB | A→PAX | PAX→B | PAX→PAX
    Route::post('/trips/{trip}/request', [ClientRideRequestController::class, 'store'])
        ->name('client.request.store');

    // заявка «добавить остановку в маршрут»
    Route::post('/trips/{trip}/stop-request', [ClientTripStopRequestsController::class, 'store'])
        ->name('client.trip_stop.request.store');

    // Հարթակի ընդհանուր կարծիքներ (ոչ առանձին երթուղիների համար)
    Route::post('/project-reviews', [ProjectReviewController::class, 'store'])
        ->name('project-reviews.store');
});
Route::middleware(['auth','verified','approved','can:driver'])
    ->prefix('driver')->name('driver.')->group(function () {
        // список/принятие/отклонение заявок на новую остановку + авто-перерасчёт кратчайшего пути
        Route::get('/trips/{trip}/stop-requests', [DriverTripStopRequestsController::class,'index'])
            ->name('trip_stop_requests.index');
        Route::post('/stop-requests/{tsr}/accept', [DriverTripStopRequestsController::class,'accept'])
            ->name('trip_stop_requests.accept');
        Route::post('/stop-requests/{tsr}/decline', [DriverTripStopRequestsController::class,'decline'])
            ->name('trip_stop_requests.decline');
    });


Route::middleware(['auth'])->group(function () {
    Route::patch('/driver/trip/{trip}/stops', [TripStopsController::class,'update'])
        ->name('driver.trip.stops.update');
});


Route::middleware('auth')->group(function () {
    Route::get('/client/checkin/{rideRequest}', fn($rideRequest)=> Inertia::render('Client/ShowCheckinQR', [
        'rideRequestId' => (int)$rideRequest,
    ]))->name('client.checkin.page');

    Route::get('/driver/checkin-scan', fn()=> Inertia::render('Driver/ScanCheckin'))
        ->name('driver.checkin.scan.page');
});





//
//Route::pattern('company', '[0-9]+');
Route::get('/', fn() => redirect()->route('client.trips.index'));
Route::get('/bus-seat-designer', fn() => Inertia::render('BusSeatDesigner'))->name('demo.bus_seat_designer');
Route::get('/dashboard', fn() => Inertia::render('Dashboard'))
    ->middleware(['auth', 'verified'])->name('dashboard');


// Страница "ожидает одобрения админом"
Route::get('/pending', fn() => Inertia::render('Pending'))
    ->middleware(['auth', 'verified'])->name('pending');


// Регистрация по ролям
Route::get('/register/choice', [RoleRegisterController::class, 'choice'])->name('register.choice');
Route::get('/register/client', [RoleRegisterController::class, 'clientForm'])->name('register.client');
Route::post('/register/client', [RoleRegisterController::class, 'storeClient']);


Route::get('/register/driver', [RoleRegisterController::class, 'driverForm'])->name('register.driver');
Route::post('/register/driver', [RoleRegisterController::class, 'storeDriver']);


Route::get('/register/company', [RoleRegisterController::class, 'companyForm'])->name('register.company');
Route::post('/register/company', [RoleRegisterController::class, 'storeCompany']);




Route::middleware(['auth','verified'])->group(function () {
    // Селектор компаний (твоя SelectCompany.jsx)
    Route::get('/companies', [CompanyController::class, 'index'])->name('companies.index');
    Route::get('/company/dashboard', [\App\Http\Controllers\Company\DashboardController::class, 'ownerEntry'])
        ->name('company.dashboard');

    // Дашборд конкретной компании
    Route::get('/companies/{company}/dashboard', [\App\Http\Controllers\Company\DashboardController::class, 'show'])
        ->whereNumber('company')
        ->name('company.dashboard.show');
    // Вся внутренняя панель компании
    Route::prefix('/companies/{company}')
        ->whereNumber('company')
        ->name('company.')
        ->group(function () {

            // Главная вкладка (Company/Dashboard или что рендеришь в show)
            Route::get('/', [\App\Http\Controllers\Company\DashboardController::class, 'ownerEntry'])->name('show');

            // --- Fleet ---
            Route::get   ('/fleet',            [CompanyFleetController::class, 'index'])->name('fleet.index');
            Route::post  ('/fleet',            [CompanyFleetController::class, 'store'])->name('fleet.store');
            Route::delete('/fleet/{vehicle}',  [CompanyFleetController::class, 'destroy'])->name('fleet.destroy');

            // --- Members ---
//            Route::get   ('/members',          [CompanyMemberController::class, 'index'])->name('members.index');
//            // фронт вызывает route('company.members.store'): мапим на storeNew
//            Route::post  ('/members',          [CompanyMemberController::class, 'storeNew'])->name('members.store');
//            Route::patch ('/members/{user}/role', [CompanyMemberController::class, 'updateRole'])->name('members.updateRole');
//            Route::delete('/members/{user}',   [CompanyMemberController::class, 'destroy'])->name('members.destroy');
            Route::get   ('/members',                    [CompanyMemberController::class, 'index'])->name('members.index');
            Route::post  ('/members/new',                [CompanyMemberController::class, 'storeNew'])->name('members.storeNew');
            Route::post  ('/members/attach',             [CompanyMemberController::class, 'attachExisting'])->name('members.attach');
            Route::put   ('/members/{member}/role',      [CompanyMemberController::class, 'updateRole'])->name('members.updateRole');
            Route::put   ('/members/{member}/suspend',   [CompanyMemberController::class, 'suspend'])->name('members.suspend');
            Route::put   ('/members/{member}/activate',  [CompanyMemberController::class, 'activate'])->name('members.activate');
            Route::delete('/members/{member}',           [CompanyMemberController::class, 'destroy'])->name('members.destroy');


//            Route::get('/trips/search', [CTrip::class, 'search'])->name('trips.search');
//
//            // --- Trips ---
//            Route::get('/trips/make', [CTrip::class, 'tripmake'])->name('trips.make');
//            Route::get('/trips',                [CTrip::class, 'index'])->name('trips.index');
//            Route::get('/trips/{trip}',         [CTrip::class, 'show'])->name('trips.show');   // <-- NEW
//            Route::post('/trips',               [CTrip::class, 'store'])->name('trips.store');
//            Route::post('/trips/{trip}/publish',[CTrip::class, 'publish'])->name('trips.publish');
//            Route::post('/trips/{trip}/archive',[CTrip::class, 'archive'])->name('trips.archive');
//            Route::post('/trips/{trip}/unarchive',[CTrip::class, 'unarchive'])->name('trips.unarchive');
//            Route::patch('/trips/{trip}/stops', [CTripStops::class,'replace'])
//                ->name('trips.stops.replace');
            Route::get('trips', [CTrip::class,'index'])->name('trips.index');
            Route::get('trips/make', [CTrip::class,'tripmake'])->name('trips.make');

            Route::post('trips', [CTrip::class,'store'])->name('trips.store');
            Route::post('trips/publish', [CTrip::class,'storeAndPublish'])->name('trips.store_publish');

            Route::get('trips/{trip}', [CTrip::class,'show'])->name('trips.show');
            Route::patch('trips/{trip}', [CTrip::class,'update'])->name('trips.update');

            Route::put('trips/{trip}/stops', [CTrip::class,'replaceStops'])->name('trips.stops.replace');
            Route::put('trips/{trip}/amenities', [CTrip::class,'updateAmenities'])->name('trips.amenities.update');

            Route::post('trips/{trip}/publish', [CTrip::class,'publish'])->name('trips.publish');
            Route::post('trips/{trip}/archive', [CTrip::class,'archive'])->name('trips.archive');
            Route::post('trips/{trip}/unarchive', [CTrip::class,'unarchive'])->name('trips.unarchive');

            Route::post('trips/{trip}/start', [CTrip::class,'start'])->name('trips.start');
            Route::post('trips/{trip}/finish', [CTrip::class,'finish'])->name('trips.finish');
            Route::get('trips-search', [CTrip::class,'search'])->name('trips.search');







            // Доп. сущности рейса (если нужно из UI)
//            Route::get   ('/trips/{trip}/amenities',  [CAmen::class, 'show'])->name('trips.amenities.show');
//            Route::post  ('/trips/{trip}/amenities',  [CAmen::class, 'update'])->name('trips.amenities.update');

            // --- Requests queue ---
            Route::get   ('/requests',                   [CReq::class, 'index'])->name('requests.index');
            Route::post  ('/requests/{request}/accept',  [CReq::class, 'accept'])->name('requests.accept');
            Route::post  ('/requests/{request}/decline', [CReq::class, 'decline'])->name('requests.decline');
//            Route::post  ('/requests/{request}/transfer',[CReq::class, 'transfer'])->name('requests.transfer');

 Route::post('/requests/{requestModel}/transfer', [CReq::class, 'transfer'])
                 ->whereNumber('requestModel')
                 ->name('requests.transfer');
// поиск рейсов для переноса (published, не завершены)


        });
});















// Admin area
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/admin', [ApprovalController::class, 'index'])->name('admin.index');
    Route::post('/admin/driver/{user}/approve', [ApprovalController::class, 'approveDriver'])->name('admin.driver.approve');
    Route::post('/admin/driver/{user}/reject', [ApprovalController::class, 'rejectDriver'])->name('admin.driver.reject');
    Route::post('/admin/company/{company}/approve', [ApprovalController::class, 'approveCompany'])->name('admin.company.approve');
    Route::post('/admin/company/{company}/reject', [ApprovalController::class, 'rejectCompany'])->name('admin.company.reject');
});
Route::get('/demo2', function () {
    return Inertia::render('Demo2');
})->name('demo2');

// Offers page
// Route::get('/offers', [\App\Http\Controllers\OffersPageController::class, 'index'])
//     ->middleware(['auth', 'verified'])
//     ->name('offers');



Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');
// PROFILE
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Route::middleware(['auth'])->group(function () {
//     Route::get('/driver/pending-requests/state', [DriverNotificationsController::class, 'pendingState'])
//         ->name('driver.pending.state');
// });

// // DRIVER
// Route::middleware(['auth'])->group(function () {
//     Route::get('/driver/pending-requests/state', [DriverNotificationsController::class, 'pendingState'])
//         ->name('driver.pending.state');
// });
Route::middleware(['auth','verified','approved','can:driver'])
    ->prefix('driver')->name('driver.')->group(function () {
        // страница просмотра конкретного рейса
        Route::get('/trip/{trip}', [DriverTripShowController::class,'show'])->name('trip.show');

        // сохранить рейтинг от водителя пассажиру
        Route::post('/trip/{trip}/rate-user', [DriverTripRatingController::class,'rateUser'])->name('trip.rate_user');

        // открыть чат по заявке (создаст при необходимости)
        Route::post('/request/{requestModel}/open-chat', [RideRequestController::class,'openChat'])->name('request.open_chat');
    });


Route::middleware(['auth','verified','approved','can:driver'])
    ->prefix('driver')->name('driver.')->group(function () {
        Route::get('/jobs', [CompanyJobController::class, 'index'])->name('jobs.index');

        // Действия водителя
        Route::post('/jobs/{trip}/start',  [CompanyJobController::class, 'start'])->name('jobs.start');
        Route::post('/jobs/{trip}/finish', [CompanyJobController::class, 'finish'])->name('jobs.finish');

        // Деталь рейса (только принятые заявки)
        Route::get('/trips/{trip}', [TripDetailController::class, 'show'])->name('trips.show');

        // Массовая оценка пассажиров после завершения
        Route::post('/ratings/bulk', [RatingController::class, 'bulkStore'])->name('ratings.bulk');

//        Route::get('/jobs', [CompanyJobController::class,'index'])->name('jobs');
//        Route::post('/jobs/{trip}/start', [CompanyJobController::class,'start'])->name('jobs.start');
//        Route::post('/jobs/{trip}/finish', [CompanyJobController::class,'finish'])->name('jobs.finish');

        Route::get('/car',        [DriverDashboardController::class, 'car'])->name('driver.car');
        Route::get('/make-trip',  [DriverDashboardController::class, 'makeTrip'])->name('driver.make_trip');
        Route::get('/my-trips',   [DriverDashboardController::class, 'myTrips'])->name('driver.my_trips');

        // Vehicle
        Route::post('/vehicle', [VehicleController::class,'store'])->name('vehicle.store');
        Route::put('/vehicle/{vehicle}', [VehicleController::class,'update'])->name('vehicle.update');

        // Trips
        Route::post('/trip', [TripController::class,'store'])->name('trip.store');                         // draft
        Route::post('/trip/store-and-publish', [TripController::class,'storeAndPublish'])->name('trip.store_publish'); // publish now
        Route::put('/trip/{trip}', [TripController::class,'update'])->name('trip.update');
        Route::post('/trip/{trip}/publish', [TripController::class,'publish'])->name('trip.publish');
        Route::post('/trip/{trip}/archive', [TripController::class,'archive'])->name('trip.archive');
        Route::post('/trip/{trip}/start',  [TripController::class,'start'])->name('trip.start');
        Route::post('/trip/{trip}/finish', [TripController::class,'finish'])->name('trip.finish');


        // редактирование остановок уже существующего рейса (bulk replace)
//        Route::patch('/trip/{trip}/stops', [TripStopsController::class, 'replace']);


        Route::post('/trips/{trip}/stops/replace', [TripStopsController::class,'replace'])->name('trips.stops.replace');
        Route::get('/trips/{trip}/tariff-quote', [TariffQuoteController::class,'quote'])->name('trips.tariff.quote');

        // Requests
        Route::post('/request/{requestModel}/accept', [RideRequestController::class,'accept'])->name('request.accept');
        Route::post('/request/{requestModel}/reject', [RideRequestController::class,'reject'])->name('request.reject');
        Route::patch('/trip/{trip}/amenities', [TripController::class, 'updateAmenities'])->name('driver.trip.amenities');
        Route::get ('/trip/{trip}/amenities', [DriverTripAmenitiesController::class, 'show']);
        Route::post('/trip/{trip}/amenities', [DriverTripAmenitiesController::class, 'update']);
        // demo helper
        Route::post('/trip/{trip}/fake-request', [RideRequestController::class,'fake'])->name('trip.fake');
    });
Route::get('/amenities-catalog', AmenityCatalogController::class)->name('amenities.catalog');

//Route::get('/trips', [ExploreController::class, 'index'])->name('client.trips');
Route::get('/trips', [ExploreController::class, 'index'])->name('client.trips.index');








// CLIENT
Route::middleware(['auth','verified'])->group(function () {
    // Route::get('/trip/{trip}', [\App\Http\Controllers\Client\TripShowController::class, 'show'])
    //     ->whereNumber('trip')
    //     ->name('trip.show');

   Route::get('/trip/{trip}', function (Request $request, Trip $trip) {
        // 1) рейс завершён
        $isFinished = $trip->driver_state === 'done'
            || !is_null($trip->driver_finished_at);

        // 2) рейс не опубликован (любой статус, кроме 'published')
        $isNotPublished = $trip->status !== 'published';

        // Если рейс завершён ИЛИ не опубликован — по прямой ссылке не даём открыть
        if ($isFinished || $isNotPublished) {
            return back()->with('warn', 'Այս երթուղին այլևս հասանելի չէ');
        }

        // Иначе вызываем обычный контроллер показа
        return app(\App\Http\Controllers\Client\TripShowController::class)
            ->show($trip, $request);   // <-- ВАЖНО: сначала $trip, потом $request
    })
        ->whereNumber('trip')
        ->name('trip.show');
    Route::post('/trips/{trip}/book', [BookingController::class, 'store'])->name('client.book');
    Route::get('/my/requests', [RequestsController::class, 'index'])->name('client.requests');
    Route::delete('/my/requests/{id}', [\App\Http\Controllers\Client\RequestsController::class, 'destroy'])
        ->whereNumber('id')->name('client.requests.destroy');
    Route::get ('/my/completed-trips', [\App\Http\Controllers\Client\CompletedTripsController::class, 'index'])
        ->name('client.completed');
    Route::post('/my/completed-trips/{trip}/rate', [\App\Http\Controllers\Client\CompletedTripsController::class, 'rate'])
        ->name('client.rate');
});
Route::get('/my/bookings/{request}', [BookingController::class,'show'])
    ->whereNumber('request')->name('client.booking.show');

//CHAT
//Route::middleware(['auth','verified'])->group(function () {
//    Route::get('/chats', [ChatPageController::class,'index'])->name('chats.index');
//    Route::get('/chats/{conversation}', [ChatPageController::class,'show'])->name('chats.show');
//});
//
//// >>> ДОБАВЬ ЭТО: <<<
//Route::middleware(['auth','verified'])
//    ->prefix('chats')
//    ->name('chats.api.')
//    ->group(function () {
//        Route::get('/list', [ChatApiController::class,'list'])->name('list');
//        Route::get('/{conversation}/poll', [ChatApiController::class,'poll'])->name('poll');
//        Route::get('/{conversation}/history', [ChatApiController::class,'history'])->name('history');
//        Route::post('/{conversation}/send', [ChatApiController::class,'send'])->middleware('throttle:chat-send')->name('send');
//        Route::post('/{conversation}/read', [ChatApiController::class,'read'])->name('read');
//        Route::post('/{conversation}/typing', [ChatApiController::class,'typing'])->name('typing');
//Route::post('/{conversation}/heartbeat', [ChatApiController::class,'heartbeat'])->name('heartbeat');
//        Route::post('/upload', [ChatApiController::class,'upload']);
//    });
Route::get('/chat', fn (Request $r) =>
Inertia::render('Chat', ['openConversationId' => $r->integer('open')])
)->middleware(['auth','verified'])->name('chat');
Route::middleware(['auth','verified'])->prefix('chat')->name('chat.')->group(function () {
    Route::get('/contacts',                [ChatV2Controller::class,'contacts'])->name('contacts');

    Route::get('/{conversation}/history',  [ChatV2Controller::class,'history'])->name('history');
    Route::post('/{conversation}/send',    [ChatV2Controller::class,'send'])
        ->middleware('throttle:chat-send')->name('send');

    Route::get('/{conversation}/sync',     [ChatV2Controller::class,'sync'])
        ->middleware('throttle:chat-sync')->name('sync');
//    Route::get('/{conversation}/sync',     [ChatV2Controller::class,'sync'])
//       ->name('sync');
    Route::post('/{conversation}/read',    [ChatV2Controller::class,'read'])->name('read');
    Route::post('/{conversation}/typing',  [ChatV2Controller::class,'typing'])->name('typing');
    Route::post('/{conversation}/heartbeat',[ChatV2Controller::class,'heartbeat'])->name('heartbeat');

    Route::post('/upload',                 [ChatV2Controller::class,'upload'])->name('upload');

    Route::post('/open-by-request/{request}', [ChatV2Controller::class,'openByRequest'])
        ->whereNumber('request')->name('open_by_request');


    Route::post('/{conversation}/request-stop', [ChatV2Controller::class,'requestStop'])
        ->name('request_stop');

    // действия водителя по заявке
    Route::post('/{conversation}/stop-requests/{req}/accept', [ChatV2Controller::class,'acceptStop'])
        ->whereNumber('req')->name('stop_accept');

    Route::post('/{conversation}/stop-requests/{req}/decline', [ChatV2Controller::class,'declineStop'])
        ->whereNumber('req')->name('stop_decline');

});

// routes/web.php (или отдельный driver routes файл)

Route::middleware(['auth', 'verified'])
    ->prefix('driver')
    ->name('driver.')
    ->group(function () {
        Route::get('/pending-requests/state', [DriverNotificationsController::class, 'pendingState'])
            ->name('pending-requests.state');

        Route::post('/pending-requests/seen', [DriverNotificationsController::class, 'markAsSeen'])
            ->name('pending-requests.seen');
    });
require __DIR__.'/auth.php';
