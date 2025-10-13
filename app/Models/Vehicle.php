<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;


class Vehicle extends Model
{
    protected $fillable = ['user_id','brand','model','seats','color','plate','photo_path','status','company_id'];
    public function user(){ return $this->belongsTo(User::class); }
    public function trips(){ return $this->hasMany(Trip::class); }
    public function company()
    {
        return $this->belongsTo(\App\Models\Company::class);
    }
}
