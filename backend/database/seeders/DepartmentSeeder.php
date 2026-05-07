<?php

namespace Database\Seeders;

//use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $department = new Department();
        $department->name = 'Demo Department';
        $department->save();

        $departments = [
            'Executive',
            'Operations',
            'Sales',
            'Human Resources',
            'Finance',
            'Accounting',
            'Customer Support',
            'Procurement',
            'Inventory',
            'IT',
            'Marketing',
            'Logistics',
            'Administration',
        ];

        foreach ($departments as $name) {
            Department::firstOrCreate(['name' => $name]);
        }
    }
}
