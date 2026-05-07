<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class customerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Customer::firstOrCreate(
            ['email' => 'dev@omega.ac'],
            [
                'roleId' => 3,
                'username' => 'Doe',
                'password' => Hash::make('1111'),
                'phone' => '1234567890',
                'address' => '123 Main St',
            ]
        );

        Customer::firstOrCreate(
            ['email' => 'walkin@omega.ac'],
            [
                'roleId' => 3,
                'username' => 'Walk-In',
                'password' => Hash::make('1111'),
                'phone' => '1234567890',
                'address' => '123 Main St',
            ]
        );
    }

}
