<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderSeeder extends Seeder
{
  public function run(): void
  {
    $products = DB::table('product')
      ->select('id', 'productQuantity', 'reorderQuantity')
      ->whereColumn('productQuantity', '<=', 'reorderQuantity')
      ->get();

    foreach ($products as $p) {
      $reorderAmount = max(1, ($p->reorderQuantity - $p->productQuantity));

      DB::table('purchaseReorderInvoice')->insert([
        'reorderInvoiceId' => 'REORD-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6)),
        'productId' => $p->id,
        'productQuantity' => $reorderAmount,
        'status' => 'true',
        'created_at' => now(),
        'updated_at' => now(),
      ]);
    }
  }
}
