<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // отправка сообщений
        RateLimiter::for('chat-send', function (Request $request) {
            $key = optional($request->user())->id ?? $request->ip();
            return Limit::perMinute(60)->by($key);
        });

        // (опционально) long-poll sync, чтобы не спамили
//        RateLimiter::for('chat-sync', function (Request $request) {
//            $key = optional($request->user())->id ?? $request->ip();
//            return Limit::perMinute(180)->by($key);
//        });
        RateLimiter::for('chat-sync', function (Request $request) {
            $conv = (int) $request->route('conversation');              // важно!
            $key  = ($request->user()->id ?? $request->ip()) . "|c:$conv";
            return Limit::perMinute(1200)->by($key); // щедрый лимит для long-poll
        });
        RateLimiter::for('api', function (Request $request) {
            return [Limit::perMinute(60)->by(optional($request->user())->id ?: $request->ip())];
        });

    }
}
