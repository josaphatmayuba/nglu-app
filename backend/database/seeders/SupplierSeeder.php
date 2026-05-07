<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $suppliers = [
            [
                'name' => "Demo Supplier",
                'phone' => "0101010000",
                'address' => "Demo Address",
            ],
            [
                'name' => "Global Electronics Ltd",
                'phone' => "01711111111",
                'address' => "123 Main Street, Dhaka",
                'email' => "info@globalelectronics.com",
            ],
            [
                'name' => "Tech Components Inc",
                'phone' => "01722222222",
                'address' => "456 Industrial Area, Chittagong",
                'email' => "sales@techcomponents.com",
            ],
            [
                'name' => "Prime Wholesale",
                'phone' => "01733333333",
                'address' => "789 Market Road, Sylhet",
                'email' => "contact@primewholesale.com",
            ],
            [
                'name' => "Alpha Traders",
                'phone' => "01744444444",
                'address' => "321 Business District, Rajshahi",
            ],
            [
                'name' => "Metro Supplies Co",
                'phone' => "01755555555",
                'address' => "654 Commercial Zone, Khulna",
                'email' => "orders@metrosupplies.com",
            ],
            [
                'name' => "Elite Distributors",
                'phone' => "01766666666",
                'address' => "987 Trade Center, Dhaka",
                'email' => "sales@elitedistributors.com",
            ],
            [
                'name' => "Quality Parts Ltd",
                'phone' => "01777777777",
                'address' => "147 Factory Road, Gazipur",
            ],
            [
                'name' => "Mega Imports",
                'phone' => "01788888888",
                'address' => "258 Import Zone, Dhaka",
                'email' => "info@megaimports.com",
            ],
            [
                'name' => "Smart Solutions",
                'phone' => "01799999999",
                'address' => "369 Tech Park, Chittagong",
                'email' => "contact@smartsolutions.com",
            ],
        ];

        foreach ($suppliers as $item) {
            $supplier = new Supplier();
            $supplier->name = $item['name'];
            $supplier->phone = $item['phone'];
            $supplier->address = $item['address'];
            $supplier->email = $item['email'] ?? null;
            $supplier->save();
        }
    }
}
