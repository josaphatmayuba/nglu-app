<?php

namespace Database\Seeders;

use Illuminate\Support\Carbon;
use Illuminate\Database\Seeder;
use App\Models\Shift;

class ShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $shift = new Shift();
        $shift->name = 'Demo Shift';
        $shift->startTime = Carbon::createFromFormat('H:i:s', '09:00:00')->format('H:i:s');
        $shift->endTime = Carbon::createFromFormat('H:i:s', '15:00:00')->format('H:i:s');
        $shift->workHour = 8;
        $shift->save();

        // Add more shifts
        $shifts = [
            ['name' => 'Morning Shift', 'startTime' => '06:00:00', 'endTime' => '14:00:00', 'workHour' => 8],
            ['name' => 'Day Shift',     'startTime' => '09:00:00', 'endTime' => '17:00:00', 'workHour' => 8],
            ['name' => 'Evening Shift', 'startTime' => '14:00:00', 'endTime' => '22:00:00', 'workHour' => 8],
            ['name' => 'Night Shift',   'startTime' => '22:00:00', 'endTime' => '06:00:00', 'workHour' => 8],
            ['name' => 'Half Day',      'startTime' => '10:00:00', 'endTime' => '14:00:00', 'workHour' => 4],
        ];

        foreach ($shifts as $s) {
            // Use firstOrCreate to avoid duplicates by name
            \App\Models\Shift::firstOrCreate(
                ['name' => $s['name']],
                [
                    'startTime' => Carbon::createFromFormat('H:i:s', $s['startTime'])->format('H:i:s'),
                    'endTime'   => Carbon::createFromFormat('H:i:s', $s['endTime'])->format('H:i:s'),
                    'workHour'  => $s['workHour'],
                ]
            );
        }
    }
}
