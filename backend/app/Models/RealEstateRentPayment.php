<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealEstateRentPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'lease_id',
        'transaction_id',
        'payment_date',
        'amount',
        'method',
        'reference',
        'notes',
    ];

    public function lease()
    {
        return $this->belongsTo(RealEstateLease::class, 'lease_id');
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class, 'transaction_id');
    }
}
