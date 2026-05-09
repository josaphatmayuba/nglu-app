<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealEstateLease extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'property_id',
        'unit_id',
        'tenant_id',
        'start_date',
        'end_date',
        'next_invoice_date',
        'billing_cycle',
        'rent_amount',
        'security_deposit',
        'move_in_meter_reading',
        'move_in_notes',
        'terms',
        'status',
    ];

    public function property()
    {
        return $this->belongsTo(RealEstateProperty::class, 'property_id');
    }

    public function unit()
    {
        return $this->belongsTo(RealEstateUnit::class, 'unit_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Customer::class, 'tenant_id');
    }

    public function payments()
    {
        return $this->hasMany(RealEstateRentPayment::class, 'lease_id');
    }
}
