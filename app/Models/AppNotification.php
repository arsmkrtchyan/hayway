<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppNotification extends Model {
    protected $table = 'app_notifications';
    protected $fillable = ['user_id','type','title','body','link','unread'];
    protected $casts = ['unread'=>'bool'];
}
