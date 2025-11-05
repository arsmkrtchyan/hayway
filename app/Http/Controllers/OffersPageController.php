<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Api\OrdersController;
use App\Http\Controllers\Api\OffersController;
use App\Http\Controllers\Api\OrderMatchController;
use App\Http\Controllers\Admin\AmenityController;
use App\Models\Trip;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OffersPageController extends Controller
{
    public function __construct(
        private OrdersController $ordersController,
        private OffersController $offersController,
        private OrderMatchController $orderMatchController,
        private AmenityController $amenityController
    ) {}

    /**
     * Display the offers page with initial data
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Get initial data for the offers page
        $data = [
            'user' => $user,
            'initialData' => [
                'trips' => $this->getTrips($request),
                'orders' => $this->getUserOrders(),
                'offers' => $this->getUserOffers(),
                'amenities' => $this->getAmenities(),
            ]
        ];

        return Inertia::render('Pages/offer', $data);
    }

    /**
     * Get trips for the explore page
     */
    private function getTrips(Request $request)
    {
        try {
            // Use the existing trip endpoint logic
            $trips = Trip::query()
                ->with(['user', 'company', 'amenities'])
                ->where('status', 'published')
                ->when($request->filled('from'), function($q) use ($request) {
                    $q->where('from_addr', 'like', '%' . $request->get('from') . '%');
                })
                ->when($request->filled('to'), function($q) use ($request) {
                    $q->where('to_addr', 'like', '%' . $request->get('to') . '%');
                })
                ->when($request->filled('seats'), function($q) use ($request) {
                    $seats = (int) $request->get('seats');
                    $q->whereRaw('(seats_total - COALESCE(seats_taken, 0)) >= ?', [$seats]);
                })
                ->when($request->filled('date_from'), function($q) use ($request) {
                    $q->whereDate('departure_at', '>=', $request->get('date_from'));
                })
                ->orderBy('departure_at')
                ->limit(50)
                ->get();

            return $trips->map(function($trip) {
                return [
                    'id' => $trip->id,
                    'user_id' => $trip->user_id,
                    'vehicle_id' => $trip->vehicle_id,
                    'from_lat' => $trip->from_lat,
                    'from_lng' => $trip->from_lng,
                    'from_addr' => $trip->from_addr,
                    'to_lat' => $trip->to_lat,
                    'to_lng' => $trip->to_lng,
                    'to_addr' => $trip->to_addr,
                    'departure_at' => $trip->departure_at,
                    'seats_total' => $trip->seats_total,
                    'seats_taken' => $trip->seats_taken,
                    'price_amd' => $trip->price_amd,
                    'pay_methods' => $trip->pay_methods,
                    'status' => $trip->status,
                    'company_id' => $trip->company_id,
                    'assigned_driver_id' => $trip->assigned_driver_id,
                    'driver_state' => $trip->driver_state,
                    'eta_sec' => $trip->eta_sec,
                    'amenities' => $trip->amenities->map(function($amenity) {
                        return [
                            'id' => $amenity->id,
                            'name' => $amenity->name,
                            'icon' => $amenity->icon ?? '⭐',
                        ];
                    }),
                    'driver' => $trip->user ? [
                        'id' => $trip->user->id,
                        'name' => $trip->user->name,
                        'rating' => 4.5, // You can add rating logic here
                    ] : null,
                    'company' => $trip->company ? [
                        'id' => $trip->company->id,
                        'name' => $trip->company->name,
                        'rating' => 4.5, // You can add rating logic here
                    ] : null,
                ];
            });
        } catch (\Exception $e) {
            \Log::error('Error fetching trips: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get user's orders
     */
    private function getUserOrders()
    {
        try {
            $request = new Request();
            $response = $this->ordersController->my($request);
            return $response->getData(true)['data'] ?? [];
        } catch (\Exception $e) {
            \Log::error('Error fetching user orders: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get user's offers
     */
    private function getUserOffers()
    {
        try {
            $request = new Request();
            $response = $this->offersController->my($request);
            return $response->getData(true)['data'] ?? [];
        } catch (\Exception $e) {
            \Log::error('Error fetching user offers: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get amenities
     */
    private function getAmenities()
    {
        try {
            $request = new Request();
            $response = $this->amenityController->index($request);
            return $response->getData(true)['data'] ?? [];
        } catch (\Exception $e) {
            \Log::error('Error fetching amenities: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Handle AJAX requests from the frontend
     */
    public function api(Request $request)
    {
        try {
            $route = $request->route();
            $action = $route->getActionMethod();
            
            // Handle matching orders route
            // if ($request->route()->named('offers.matching-orders')) {
            //     $tripId = $request->route('tripId');
            //     $response = $this->orderMatchController->index($request, \App\Models\Trip::findOrFail($tripId));
            //     return $response;
            // }
            if ($request->route()->named('offers.matching-orders')) {
    $tripId = $request->route('tripId');
    return app()->call([$this->orderMatchController, 'index'], [
        'trip' => \App\Models\Trip::findOrFail($tripId),
    ]);
}
            // Get the action from the URL path
            $path = $request->path();
            $pathParts = explode('/', $path);
            $action = end($pathParts);
            
            switch ($action) {
                case 'trips':
                    return response()->json([
                        'ok' => true,
                        'data' => $this->getTrips($request)
                    ]);

                case 'orders':
                    if ($request->isMethod('POST')) {
                        // Create order
                        $response = $this->ordersController->store($request);
                        return $response;
                    } else {
                        // Get orders
                        $response = $this->ordersController->my($request);
                        return $response;
                    }

                case 'offers':
                    if ($request->isMethod('POST')) {
                        // Create offer
                        $response = $this->offersController->store($request);
                        return $response;
                    } else {
                        // Get offers
                        $response = $this->offersController->my($request);
                        return $response;
                    }

                case 'amenities':
                    $response = $this->amenityController->index($request);
                    return $response;

                default:
                    return response()->json(['ok' => false, 'error' => 'Unknown action'], 404);
            }
        } catch (\Exception $e) {
            \Log::error("API Error in OffersPageController: " . $e->getMessage());
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle offer actions (accept, reject, withdraw)
     */
    public function offerAction(Request $request, $offerId, $action)
    {
        try {
            $offer = \App\Models\DriverOffer::findOrFail($offerId);
            
            switch ($action) {
                case 'accept':
                    $response = $this->offersController->accept($offer);
                    return $response;

                case 'reject':
                    $response = $this->offersController->reject($offer);
                    return $response;

                case 'withdraw':
                    $response = $this->offersController->withdraw($offer);
                    return $response;

                default:
                    return response()->json(['ok' => false, 'error' => 'Unknown action'], 404);
            }
        } catch (\Exception $e) {
            \Log::error("Offer action error: " . $e->getMessage());
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
