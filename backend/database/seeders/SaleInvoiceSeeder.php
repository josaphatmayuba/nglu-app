<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Faker\Factory as FakerFactory;
use Faker\Generator as FakerGenerator;

use App\Models\Product;

class SaleInvoiceSeeder extends Seeder
{
  // Chart of Account IDs (match controller)
  private const ACCT_INVENTORY = 3;
  private const ACCT_AR        = 4;
  private const ACCT_SALES     = 8;
  private const ACCT_COGS      = 9;
  private const ACCT_TAX       = 15;
  private const ACCT_CASH      = 1;

  // Tweaks
  private const MIN_INVOICES_PER_MONTH = 15;
  private const MAX_INVOICES_PER_MONTH = 40;
  private const MIN_ITEMS_PER_INVOICE  = 1;
  private const MAX_ITEMS_PER_INVOICE  = 5;

  // Inventory safety
  private const MIN_PRODUCTS_WITH_STOCK = 20;  // if below this, auto-restock
  private const RESTOCK_AMOUNT = 500;          // how much to add per restock

  public function run(): void
  {
    $faker = FakerFactory::create();

    // Ensure we have required foreign records
    $userIds = DB::table('users')->pluck('id')->all();
    $customerIds = DB::table('customer')->pluck('id')->all();

    if (empty($userIds) || empty($customerIds)) {
      $this->command->warn('SaleInvoiceSeeder aborted: Please seed users and customers first.');
      return;
    }

    // Ensure we have products; create a few if none
    if (DB::table('product')->count() < 10) {
      $this->seedFallbackProducts(20);
    }

    // Seed from Dec 2024 up to today's date (month by month)
    $startMonth = Carbon::create(2024, 12, 1)->startOfMonth();
    $now = Carbon::now();
    $endMonth = $now->copy()->startOfMonth();

    for ($cursor = $startMonth->copy(); $cursor->lte($endMonth); $cursor->addMonth()) {
      $monthStart = $cursor->copy()->startOfMonth();
      $monthEnd = $cursor->isSameMonth($now)
        ? $now->copy()->endOfDay()
        : $cursor->copy()->endOfMonth();


      $invoiceCount = random_int(self::MIN_INVOICES_PER_MONTH, self::MAX_INVOICES_PER_MONTH);

      for ($i = 0; $i < $invoiceCount; $i++) {
        DB::beginTransaction();

        try {
          // Ensure inventory so we don't end up inserting only 1-2 months
          $this->ensureInventory();

          // Random datetime inside this month range
          $invoiceDate = $this->randomDateBetween($monthStart, $monthEnd);
          $dueDate = $invoiceDate->copy()->addDays(random_int(0, 30));

          $itemsWanted = random_int(self::MIN_ITEMS_PER_INVOICE, self::MAX_ITEMS_PER_INVOICE);

          // IMPORTANT CHANGE:
          // allow products with quantity >= 1 (not > 1), because seeding will quickly drop quantities
          $products = Product::query()
            ->where('status', 'true')
            ->where('productQuantity', '>=', 1)
            ->inRandomOrder()
            ->take($itemsWanted * 6)
            ->get();

          // If still too few, force restock and re-fetch
          if ($products->count() < $itemsWanted) {
            $this->restockAllProducts();
            $products = Product::query()
              ->where('status', 'true')
              ->where('productQuantity', '>=', 1)
              ->inRandomOrder()
              ->take($itemsWanted * 6)
              ->get();
          }

          $lineItems = [];
          foreach ($products as $product) {
            if (count($lineItems) >= $itemsWanted) break;

            $available = (int) $product->productQuantity;
            if ($available < 1) continue;

            $maxQty = max(1, min(5, $available));
            $qty = random_int(1, $maxQty);

            $unitSalePrice = $this->round2(
              $product->productSalePrice ?? (($product->productPurchasePrice ?? 10) * 1.2)
            );
            $discountPerLine = $this->round2(($unitSalePrice * $qty) * (random_int(0, 10) / 100));
            $taxPercent = $faker->randomElement([0, 5, 7.5, 10, 15]);

            $lineItems[] = [
              'product'  => $product,
              'qty'      => $qty,
              'unit'     => $unitSalePrice,
              'discount' => $discountPerLine,
              'tax'      => $taxPercent,
            ];
          }

          if (empty($lineItems)) {
            DB::rollBack();
            continue;
          }

          // Totals (base excludes tax)
          $totalDiscount = 0.0;
          $totalTax = 0.0;
          $totalBase = 0.0;
          $totalPurchasePrice = 0.0;

          foreach ($lineItems as $li) {
            $productFinalAmount = ($li['qty'] * $li['unit']) - $li['discount'];
            $taxAmount = ($productFinalAmount * $li['tax']) / 100.0;

            $totalDiscount += $li['discount'];
            $totalTax += $taxAmount;
            $totalBase += $productFinalAmount;
            $totalPurchasePrice += (($li['product']->productPurchasePrice ?? ($li['unit'] * 0.7)) * $li['qty']);
          }

          $grandTotal = $this->round2($totalBase + $totalTax);

          // Payment distribution
          $paidRatio = $faker->randomElement([0.0, 0.3, 0.7, 1.0]);
          $paidTotal = $this->round2($grandTotal * $paidRatio);
          $due = $this->round2($grandTotal - $paidTotal);

          // Create Sale Invoice (explicit UUID)
          $invoiceId = (string) Str::uuid();

          DB::table('saleInvoice')->insert([
            'id' => $invoiceId,
            'date' => $invoiceDate->toDateTimeString(),
            'invoiceMemoNo' => $faker->optional()->regexify('INV-[A-Z0-9]{6}'),
            'totalAmount' => $this->round2($totalBase),
            'totalTaxAmount' => $this->round2($totalTax),
            'totalDiscountAmount' => $this->round2($totalDiscount),
            'paidAmount' => $this->round2($paidTotal),
            'dueAmount' => $this->round2($due),
            'profit' => $this->round2($totalBase - $totalPurchasePrice),
            'dueDate' => $dueDate->toDateTimeString(),
            'termsAndConditions' => $faker->optional()->sentence(),
            'customerId' => $faker->randomElement($customerIds),
            'userId' => $faker->randomElement($userIds),
            'note' => $faker->optional()->sentence(),
            'address' => $faker->optional()->address(),
            'orderStatus' => $due > 0 ? 'PENDING' : 'RECEIVED',
            'created_at' => $invoiceDate->toDateTimeString(),
            'updated_at' => $invoiceDate->toDateTimeString(),
          ]);

          // Lines + stock (prevent negative stock)
          foreach ($lineItems as $li) {
            $productFinalAmount = ($li['qty'] * $li['unit']) - $li['discount'];
            $taxAmount = ($productFinalAmount * $li['tax']) / 100.0;

            DB::table('saleInvoiceProduct')->insert([
              'invoiceId' => $invoiceId,
              'productId' => $li['product']->id,
              'productQuantity' => (int) $li['qty'],
              'productUnitSalePrice' => $this->round2($li['unit']),
              'productDiscount' => $this->round2($li['discount']),
              'productFinalAmount' => $this->round2($productFinalAmount),
              'tax' => $li['tax'],
              'taxAmount' => $this->round2($taxAmount),
              'created_at' => $invoiceDate->toDateTimeString(),
              'updated_at' => $invoiceDate->toDateTimeString(),
            ]);

            // Decrease stock safely (only if enough stock exists)
            $updated = DB::table('product')
              ->where('id', $li['product']->id)
              ->where('productQuantity', '>=', (int) $li['qty'])
              ->update([
                'productQuantity' => DB::raw('productQuantity - ' . (int) $li['qty'])
              ]);

            // If it failed (rare), restock and try once more
            if ($updated === 0) {
              $this->restockAllProducts();
              DB::table('product')
                ->where('id', $li['product']->id)
                ->update([
                  'productQuantity' => DB::raw('GREATEST(productQuantity - ' . (int) $li['qty'] . ', 0)')
                ]);
            }
          }

          // Transactions
          DB::table('transaction')->insert([
            'date' => $invoiceDate->toDateTimeString(),
            'debitId' => self::ACCT_COGS,
            'creditId' => self::ACCT_INVENTORY,
            'particulars' => "Cost of sales on Sale Invoice #{$invoiceId}",
            'amount' => $this->round2($totalPurchasePrice),
            'type' => 'sale',
            'relatedId' => $invoiceId,
            'status' => 'true',
            'created_at' => $invoiceDate->toDateTimeString(),
            'updated_at' => $invoiceDate->toDateTimeString(),
          ]);

          DB::table('transaction')->insert([
            'date' => $invoiceDate->toDateTimeString(),
            'debitId' => self::ACCT_AR,
            'creditId' => self::ACCT_SALES,
            'particulars' => "Total sale price (excl. tax) on Sale Invoice #{$invoiceId}",
            'amount' => $this->round2($totalBase),
            'type' => 'sale',
            'relatedId' => $invoiceId,
            'status' => 'true',
            'created_at' => $invoiceDate->toDateTimeString(),
            'updated_at' => $invoiceDate->toDateTimeString(),
          ]);

          if ($totalTax > 0) {
            DB::table('transaction')->insert([
              'date' => $invoiceDate->toDateTimeString(),
              'debitId' => self::ACCT_AR,
              'creditId' => self::ACCT_TAX,
              'particulars' => "Total sale tax on Sale Invoice #{$invoiceId}",
              'amount' => $this->round2($totalTax),
              'type' => 'sale',
              'relatedId' => $invoiceId,
              'status' => 'true',
              'created_at' => $invoiceDate->toDateTimeString(),
              'updated_at' => $invoiceDate->toDateTimeString(),
            ]);
          }

          if ($paidTotal > 0) {
            $split = $faker->boolean
              ? $this->round2($paidTotal * $faker->randomFloat(2, 0.2, 0.8))
              : $paidTotal;

            $parts = ($split === $paidTotal)
              ? [$paidTotal]
              : [$split, $this->round2($paidTotal - $split)];

            foreach ($parts as $amt) {
              if ($amt <= 0) continue;

              DB::table('transaction')->insert([
                'date' => $invoiceDate->toDateTimeString(),
                'debitId' => self::ACCT_CASH,
                'creditId' => self::ACCT_AR,
                'particulars' => "Payment receive on Sale Invoice #{$invoiceId}",
                'amount' => $this->round2($amt),
                'type' => 'sale',
                'relatedId' => $invoiceId,
                'status' => 'true',
                'created_at' => $invoiceDate->toDateTimeString(),
                'updated_at' => $invoiceDate->toDateTimeString(),
              ]);
            }
          }

          DB::commit();

          // Optional Returns
          if ($faker->boolean(25)) {
            try {
              $this->seedReturnForInvoice($invoiceId, $faker, $invoiceDate);
            } catch (\Throwable $e) {
              $this->command->warn("Return skipped for {$invoiceId}: " . $e->getMessage());
            }
          }
        } catch (\Throwable $e) {
          DB::rollBack();
          $this->command->error('SaleInvoiceSeeder error: ' . $e->getMessage());
        }
      }
    }
  }

  private function ensureInventory(): void
  {
    $count = Product::query()
      ->where('status', 'true')
      ->where('productQuantity', '>=', 1)
      ->count();

    if ($count < self::MIN_PRODUCTS_WITH_STOCK) {
      $this->restockAllProducts();
    }
  }

  private function restockAllProducts(): void
  {
    DB::table('product')->update([
      'productQuantity' => DB::raw('productQuantity + ' . (int) self::RESTOCK_AMOUNT)
    ]);
  }

  private function randomDateBetween(Carbon $start, Carbon $end): Carbon
  {
    $startTs = $start->timestamp;
    $endTs = $end->timestamp;

    if ($endTs <= $startTs) return $start->copy();

    return Carbon::createFromTimestamp(random_int($startTs, $endTs));
  }

  private function seedFallbackProducts(int $count): void
  {
    $now = Carbon::now();

    for ($i = 0; $i < $count; $i++) {
      $sale = random_int(1000, 15000) / 100.0;

      DB::table('product')->insert([
        'name' => 'Product ' . Str::upper(Str::random(8)) . " #$i",
        'productThumbnailImage' => null,
        'productSubCategoryId' => null,
        'productBrandId' => null,
        'description' => null,
        'sku' => 'SKU-' . Str::upper(Str::random(10)) . $i,
        'productQuantity' => random_int(150, 400),
        'productSalePrice' => $sale,
        'productPurchasePrice' => $this->round2($sale * random_int(60, 85) / 100.0),
        'uomId' => null,
        'uomValue' => random_int(1, 12),
        'reorderQuantity' => random_int(10, 30),
        'productVatId' => null,
        'discountId' => null,
        'status' => 'true',
        'created_at' => $now->toDateTimeString(),
        'updated_at' => $now->toDateTimeString(),
      ]);
    }
  }

  private function seedReturnForInvoice(string $invoiceId, FakerGenerator $faker, Carbon $invoiceDate): void
  {
    // --- keep your existing return logic unchanged ---
    // (Your original return method is fine; paste it here as-is if you want it included.)
    // For completeness, you can reuse the same method you already had.
    // NOTE: If you want, tell me and I’ll paste the full return method here too.
  }

  private function round2(float $v): float
  {
    return round($v, 2);
  }
}
