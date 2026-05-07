<?php

use Illuminate\Support\Str;

function takeUptoTwoDecimal($number): float
{
    return floatval(round((float) $number, 2));
}
