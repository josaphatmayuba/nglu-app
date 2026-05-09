<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('real_estate_properties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable()->unique();
            $table->string('property_type')->default('building');
            $table->string('status')->default('available');
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->unsignedInteger('floors')->default(1);
            $table->unsignedInteger('parking_spaces')->default(0);
            $table->decimal('market_value', 15, 2)->default(0);
            $table->decimal('default_rent', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('real_estate_units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->string('name');
            $table->string('unit_type')->default('apartment');
            $table->string('status')->default('vacant');
            $table->string('floor')->nullable();
            $table->unsignedInteger('bedrooms')->default(0);
            $table->unsignedInteger('bathrooms')->default(0);
            $table->decimal('area', 12, 2)->default(0);
            $table->decimal('monthly_rent', 15, 2)->default(0);
            $table->decimal('security_deposit', 15, 2)->default(0);
            $table->text('amenities')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('property_id')->references('id')->on('real_estate_properties')->cascadeOnDelete();
        });

        Schema::create('real_estate_leases', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('unit_id');
            $table->unsignedBigInteger('tenant_id');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('next_invoice_date')->nullable();
            $table->string('billing_cycle')->default('monthly');
            $table->decimal('rent_amount', 15, 2);
            $table->decimal('security_deposit', 15, 2)->default(0);
            $table->decimal('move_in_meter_reading', 12, 2)->nullable();
            $table->text('move_in_notes')->nullable();
            $table->text('terms')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();

            $table->foreign('property_id')->references('id')->on('real_estate_properties')->cascadeOnDelete();
            $table->foreign('unit_id')->references('id')->on('real_estate_units')->cascadeOnDelete();
            $table->foreign('tenant_id')->references('id')->on('customer');
        });

        Schema::create('real_estate_rent_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lease_id');
            $table->unsignedBigInteger('transaction_id')->nullable();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('method')->default('cash');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('lease_id')->references('id')->on('real_estate_leases')->cascadeOnDelete();
            $table->foreign('transaction_id')->references('id')->on('transaction')->nullOnDelete();
        });

        Schema::create('real_estate_maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('unit_id')->nullable();
            $table->string('title');
            $table->string('priority')->default('medium');
            $table->string('status')->default('open');
            $table->date('scheduled_date')->nullable();
            $table->decimal('estimated_cost', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('property_id')->references('id')->on('real_estate_properties')->cascadeOnDelete();
            $table->foreign('unit_id')->references('id')->on('real_estate_units')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('real_estate_maintenance_requests');
        Schema::dropIfExists('real_estate_rent_payments');
        Schema::dropIfExists('real_estate_leases');
        Schema::dropIfExists('real_estate_units');
        Schema::dropIfExists('real_estate_properties');
    }
};
