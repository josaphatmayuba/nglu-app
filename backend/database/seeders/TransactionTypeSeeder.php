<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TransactionType;

class TransactionTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        TransactionType::updateOrCreate(
            ['name' => 'Rent Payment'],
            [
                'debit_account_id' => 1, // Cash
                'credit_account_id' => 2, // Bank
                'description' => 'Payment for rent',
                'is_active' => true,
            ]
        );

        TransactionType::updateOrCreate(
            ['name' => 'Security Deposit'],
            [
                'debit_account_id' => 1, // Cash
                'credit_account_id' => 3, // Inventory / configured default
                'description' => 'Security deposit payment',
                'is_active' => true,
            ]
        );
    }
}
