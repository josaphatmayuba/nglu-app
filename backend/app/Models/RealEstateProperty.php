<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealEstateProperty extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'property_type',
        'status',
        'address',
        'city',
        'country',
        'floors',
        'parking_spaces',
        'market_value',
        'default_rent',
        'description',
    ];

    public function units()
    {
        return $this->hasMany(RealEstateUnit::class, 'property_id');
    }

    public function leases()
    {
        return $this->hasMany(RealEstateLease::class, 'property_id');
    }

    public function maintenanceRequests()
    {
        return $this->hasMany(RealEstateMaintenanceRequest::class, 'property_id');
    }
}
