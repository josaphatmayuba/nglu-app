<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionType extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'debit_account_id', 'credit_account_id', 'description', 'is_active'];

    public function debitAccount()
    {
        return $this->belongsTo(SubAccount::class, 'debit_account_id');
    }

    public function creditAccount()
    {
        return $this->belongsTo(SubAccount::class, 'credit_account_id');
    }
}
