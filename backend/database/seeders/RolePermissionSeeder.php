<?php

namespace Database\Seeders;

use App\Models\Permission;
use \App\Models\RolePermission;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //get all permissions
        $permissions = Permission::all();

        //create rolePermission for role id 1
        for ($i = 1; $i <= count($permissions); $i++) {
            $roleId = 1;
            $permissionId = $i;

            // Assuming you have a model for rolePermission with proper relationships
            $rolePermission = new RolePermission();
            $rolePermission->role()->associate($roleId);
            $rolePermission->permission()->associate($permissionId);
            $rolePermission->save();
        }
        //create rolePermission for role id 3
        $customer = [17, 18, 37, 38, 63, 107, 108, 111, 113, 114, 132, 182, 183, 187, 201, 202, 203, 204, 205, 212, 256, 258, 259, 267, 64];

        for ($i = 0; $i < count($customer); $i++) {
            $roleId = 3;
            $permissionId = $customer[$i];

            // Assuming you have a model for rolePermission with proper relationships
            $rolePermission = new RolePermission();
            $rolePermission->role()->associate($roleId);
            $rolePermission->permission()->associate($permissionId);
            $rolePermission->save();
        }

        $manager = [17, 18, 37, 38, 63, 107, 108, 111, 113, 114, 132, 182, 183, 187, 201, 202, 203, 204, 205, 212, 256, 258, 259, 267];

        for ($i = 0; $i < count($manager); $i++) {
            $roleId = 4;
            $permissionId = $manager[$i];

            // Assuming you have a model for rolePermission with proper relationships
            $rolePermission = new RolePermission();
            $rolePermission->role()->associate($roleId);
            $rolePermission->permission()->associate($permissionId);
            $rolePermission->save();
        }
    }
}
