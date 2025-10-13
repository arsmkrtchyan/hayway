<?php

namespace App\Http\Controllers;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;   // ← ЭТО НУЖНО
use Illuminate\Foundation\Validation\ValidatesRequests;
abstract class Controller
{
    use AuthorizesRequests, ValidatesRequests;
}
