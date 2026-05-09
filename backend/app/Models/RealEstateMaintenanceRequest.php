<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealEstateMaintenanceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'unit_id',
        'title',
        'priority',
        'status',
        'scheduled_date',
        'estimated_cost',
        'description',
    ];

    public function property()
    {
        return $this->belongsTo(RealEstateProperty::class, 'property_id');
    }

    public function unit()
    {
        return $this->belongsTo(RealEstateUnit::class, 'unit_id');
    }
}
