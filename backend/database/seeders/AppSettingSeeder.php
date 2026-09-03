<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use \App\Models\AppSetting;

class AppSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $setting = new AppSetting();
        $setting->companyName = 'Avelomi';
        $setting->dashboardType = 'inventory';
        $setting->tagLine = 'Manage your Inventory, Sales, Purchases etc';
        $setting->address = '';
        $setting->phone = '';
        $setting->email = 'contact@avelomi.com';
        $setting->website = 'https://avelomi.com';
        $setting->footer = 'Avelomi';
        $setting->logo = 'avelomi-logo.png';
        $setting->currencyId = 3;
        $setting->isDiscount = 'false';  // New field
        $setting->isTax = 'false';       // New field

        $setting->save();
    }
}
