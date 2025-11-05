<?php
//
//namespace App\Notifications;
//
//use App\Models\RiderOrder;
//use App\Models\Trip;
//use Illuminate\Bus\Queueable;
//use Illuminate\Notifications\Notification;
//use Illuminate\Notifications\Messages\MailMessage;
//
//class NewTripForOrder extends Notification
//{
//    use Queueable;
//
//    public function __construct(public RiderOrder $order, public Trip $trip) {}
//
//    public function via($notifiable) { return ['mail']; }
//
//    public function toMail($notifiable)
//    {
//        $addon = (int)($this->trip->getAttribute('addon_from_amd') ?? 0) + (int)($this->trip->getAttribute('addon_to_amd') ?? 0);
//        $line = $this->trip->type_ab_fixed ? ($addon>0 ? "Доплата ≈ {$addon} AMD" : "Без доплаты") : "Подходит по городу";
//        $url  = route('trip.show', ['trip'=>$this->trip->id]);
//
//        return (new MailMessage)
//            ->subject('Найден подходящий рейс')
//            ->line($line)
//            ->action('Открыть рейс', $url);
//    }
//}
// App/Notifications/NewTripForOrder.php


namespace App\Notifications;

use App\Models\RiderOrder;
use App\Models\Trip;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class NewTripForOrder extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public RiderOrder $order, public Trip $trip) {}

    public function via($notifiable): array
    {
        return ['database','mail'];
    }

    public function toDatabase($notifiable): array
    {
        $addon = (int)($this->trip->getAttribute('addon_from_amd') ?? 0)
            + (int)($this->trip->getAttribute('addon_to_amd') ?? 0);

        return [
            'type'  => 'order_match',
            'title' => 'Կա համապատասխան ուղևորություն',
            'body'  => $addon>0 ? "Հավելավճար ≈ {$addon} AMD" : "Առանց հավելավճարի",
            'link'  => route('trip.show',['trip'=>$this->trip->id]),
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        $addon = (int)($this->trip->getAttribute('addon_from_amd') ?? 0)
            + (int)($this->trip->getAttribute('addon_to_amd') ?? 0);
        $line = $this->trip->type_ab_fixed ? ($addon>0 ? "Доплата ≈ {$addon} AMD" : "Без доплаты") : "Подходит по городу";
        $url  = route('trip.show', ['trip'=>$this->trip->id]);

        return (new MailMessage)
            ->subject('Найден подходящий рейс')
            ->line($line)
            ->action('Открыть рейс', $url);
    }
}
