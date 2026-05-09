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
        $transactionType = new TransactionType();
        $transactionType->name = 'Rent Payment';
        $transactionType->debit_account_id = 1; // Assume Cash/Bank
        $transactionType->credit_account_id = 2; // Assume Rental Income
        $transactionType->description = 'Payment for rent';
        $transactionType->save();

        $transactionType = new TransactionType();
        $transactionType->name = 'Security Deposit';
        $transactionType->debit_account_id = 1; // Cash
        $transactionType->credit_account_id = 3; // Deposit Liability
        $transactionType->description = 'Security deposit payment';
        $transactionType->save();
    }
}