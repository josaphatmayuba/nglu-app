<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['create', 'readAll', 'readSingle', 'update', 'delete'] as $action) {
            DB::table('permission')->updateOrInsert(
                ['name' => $action . '-propertyManagement'],
                [
                    'type' => 'account',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            $permission = DB::table('permission')
                ->where('name', $action . '-propertyManagement')
                ->first();

            if ($permission) {
                DB::table('rolePermission')->updateOrInsert(
                    [
                        'roleId' => 1,
                        'permissionId' => $permission->id,
                    ],
                    [
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('permission')
            ->whereIn('name', [
                'create-propertyManagement',
                'readAll-propertyManagement',
                'readSingle-propertyManagement',
                'update-propertyManagement',
                'delete-propertyManagement',
            ])
            ->pluck('id');

        DB::table('rolePermission')->whereIn('permissionId', $permissionIds)->delete();
        DB::table('permission')->whereIn('id', $permissionIds)->delete();
    }
};
