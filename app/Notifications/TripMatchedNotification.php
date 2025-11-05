<?php
// app/Notifications/TripMatchedNotification.php
namespace App\Notifications;

use App\Models\Trip;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TripMatchedNotification extends Notification
{
    use Queueable;

    public function __construct(public Trip $trip){}

    public function via($notifiable){ return ['database']; }

    public function toDatabase($notifiable): array {
        return [
            'type'  => 'match',
            'title' => 'Գտնվեց համապատասխան ուղևորություն',
            'body'  => sprintf('%s → %s · %s', $this->trip->from_addr, $this->trip->to_addr, $this->trip->departure_at?->toDateTimeString()),
            'link'  => route('trips.show', $this->trip->id),
        ];
    }
}
