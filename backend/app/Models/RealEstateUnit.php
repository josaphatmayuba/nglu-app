<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealEstateUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'name',
        'unit_type',
        'status',
        'floor',
        'bedrooms',
        'bathrooms',
        'area',
        'monthly_rent',
        'security_deposit',
        'amenities',
        'description',
    ];

    public function property()
    {
        return $this->belongsTo(RealEstateProperty::class, 'property_id');
    }

    public function leases()
    {
        return $this->hasMany(RealEstateLease::class, 'unit_id');
    }
}
