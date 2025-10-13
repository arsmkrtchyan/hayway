<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\User; use Illuminate\Support\Facades\Hash;


class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'admin_status' => 'approved',
                'email_verified_at' => now(),
            ]
        );
        User::factory()->create([
            'name' => 'Taxi',
            'password' => Hash::make('12341234'),
            'role' => 'driver',
            'admin_status' => 'approved',
            'email_verified_at' => now(),
            'number'=> 1111,
            'email' => 'taxi@taxi.com',
        ],
        );
        User::factory()->create([
            'name' => 'Client',
            'password' => Hash::make('12341234'),
            'role' => 'driver',
            'admin_status' => 'approved',
            'email_verified_at' => now(),
            'number'=> 1111,
            'email' => 'client@client.com',
        ],
        );
    }
}
