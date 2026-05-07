<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Designation;

class DesignationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $designation = new Designation();
        $designation->name = 'Demo Designation';
        $designation->save();

        $designations = [
            'Chief Executive Officer',
            'Chief Operating Officer',
            'Chief Financial Officer',
            'General Manager',
            'Operations Manager',
            'Sales Manager',
            'HR Manager',
            'Accountant',
            'Sales Executive',
            'Customer Support Representative',
            'Store Supervisor',
            'Inventory Controller',
            'Procurement Officer',
            'Cashier',
            'Intern',
        ];

        foreach ($designations as $name) {
            Designation::firstOrCreate(['name' => $name]);
        }
    }
}
