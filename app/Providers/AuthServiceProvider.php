<?php

namespace App\Providers;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Company;
use App\Policies\CompanyPolicy;
use App\Models\User;
class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    protected $policies = [
        Company::class => CompanyPolicy::class,
        // добавляй тут и другие модели/полиси по мере необходимости
       \App\Models\Conversation::class => \App\Policies\ConversationPolicy::class

    ];

    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Gate::define('admin', fn($user) => $user->role === 'admin');

        Gate::define('driver', fn($user) => $user->role === 'driver');
//        $this->registerPolicies();

        // Если ты где-то делаешь Gate::authorize('company'),
        // определим такой Gate (по желанию).
        Gate::define('company', function (User $user) {
            return $user->role === 'company'
                || $user->ownedCompanies()->exists()
                || $user->companies()->exists();
        });
        $this->registerPolicies();
    }
}
