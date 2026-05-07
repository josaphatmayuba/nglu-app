<?php

namespace Database\Seeders;

//use Illuminate\Database\Console\Seeds\WithoutModelEvents;

use App\Models\CourierMedium;
use App\Models\CustomerPermissions;
use Faker\Provider\ar_EG\Payment;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (env('APP_SEEDER') === true) {
            $this->call([
                RoleSeeder::class,
                // awardSeeder::class,
                ShiftSeeder::class,
                EmploymentSeeder::class,
                DesignationSeeder::class,
                DepartmentSeeder::class,
                UsersSeeder::class,
                PermissionSeeder::class,
                RolePermissionSeeder::class,
                CurrencySeeder::class,
                AppSettingSeeder::class,
                AccountSeeder::class,
                SubAccountSeeder::class,
                ProductCategorySeeder::class,
                ProductSubCategorySeeder::class,
                UoMSeeder::class,
                customerSeeder::class,
                ProductBrandSeeder::class,
                ProductVatSeeder::class,
                ColorsSeeder::class,
                SupplierSeeder::class,

                PageSizeSeeder::class,
                ProductAttributeSeeder::class,
                ProductAttributeValueSeeder::class,
                DiscountSeeder::class,
                PaymentMethodSeeder::class,
                ProductSeeder::class,
                ProductColorSeeder::class,
                PurchaseInvoiceSeeder::class,
                PurchaseOrderSeeder::class,
                SaleInvoiceSeeder::class,
            ]);
        } else {
            $this->call([
                RoleSeeder::class,
                // awardSeeder::class,
                ShiftSeeder::class,
                EmploymentSeeder::class,
                DesignationSeeder::class,
                DepartmentSeeder::class,
                UsersSeeder::class,
                PermissionSeeder::class,
                RolePermissionSeeder::class,
                CurrencySeeder::class,
                AppSettingSeeder::class,
                AccountSeeder::class,
                SubAccountSeeder::class,
                // ProductCategorySeeder::class,
                // ProductSubCategorySeeder::class,
                // UoMSeeder::class,
                customerSeeder::class,
                // ProductBrandSeeder::class,
                // ProductVatSeeder::class,
                ColorsSeeder::class,
                // ProductColorSeeder::class,
                SupplierSeeder::class,
                PageSizeSeeder::class,
                // ProductAttributeSeeder::class,
                // ProductAttributeValueSeeder::class,
                DiscountSeeder::class,
                PaymentMethodSeeder::class,
            ]);
        }
    }
}
