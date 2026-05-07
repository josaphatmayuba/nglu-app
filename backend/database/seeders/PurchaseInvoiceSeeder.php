<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PurchaseInvoiceSeeder extends Seeder
{
  public function run(): void
  {
    // Required foreign data
    $supplierIds = DB::table('supplier')->pluck('id')->toArray();
    $productIds  = DB::table('product')->pluck('id')->toArray();

    if (empty($supplierIds)) {
      $this->command->warn('No suppliers found. Please run SupplierSeeder first.');
      return;
    }
    if (empty($productIds)) {
      $this->command->warn('No products found. Please run ProductSeeder first.');
      return;
    }

    // Fixed subAccount IDs to match controller
    $purchaseAccountId   = 3;  // Purchase
    $accountsPayableId   = 5;  // Accounts Payable
    $taxAccountId        = 15; // Tax
    $cashAccountId       = 1;  // Cash (default payment method)

    // Always seed at least 6 months; allow override via .env
    $monthsToSeed = max(6, (int) env('PURCHASE_SEED_MONTHS', 12));
    $minPerMonth  = 5;
    $maxPerMonth  = 12;

    for ($m = 0; $m < $monthsToSeed; $m++) {
      $monthStart = Carbon::now()->subMonthsNoOverflow($m)->startOfMonth();
      $monthEnd   = Carbon::now()->subMonthsNoOverflow($m)->endOfMonth();
      $invoiceCount = rand($minPerMonth, $maxPerMonth);

      for ($k = 1; $k <= $invoiceCount; $k++) {
        DB::beginTransaction();
        try {
          $invoiceId   = (string) Str::uuid();
          // Random date within the month
          $invoiceDate = $monthStart->copy()->addDays(rand(0, $monthEnd->diffInDays($monthStart)))->startOfDay();

          // Pick 2-8 unique products
          $numberOfProducts = rand(2, 8);
          $selectedProducts = array_rand(array_flip($productIds), $numberOfProducts);
          if (!is_array($selectedProducts)) {
            $selectedProducts = [$selectedProducts];
          }

          $invoiceProducts = [];
          $totalPurchasePrice = 0.0; // without tax
          $totalTax = 0.0;

          foreach ($selectedProducts as $productId) {
            $quantity  = rand(1, 20);
            $unitPrice = rand(100, 5000);
            $taxPct    = 5; // 5%

            $lineAmount = $unitPrice * $quantity;               // without tax
            $taxAmount  = ($lineAmount * $taxPct) / 100;        // tax only

            $totalPurchasePrice += $lineAmount;
            $totalTax           += $taxAmount;

            $invoiceProducts[] = [
              'invoiceId'                 => $invoiceId,
              'productId'                 => $productId,
              'productQuantity'           => $quantity,
              'productUnitPurchasePrice'  => round($unitPrice, 2),
              'productFinalAmount'        => round($lineAmount, 2), // without tax
              'tax'                       => $taxPct,
              'taxAmount'                 => round($taxAmount, 2),
              'created_at'                => $invoiceDate,
              'updated_at'                => $invoiceDate,
            ];
          }

          // Totals
          $grandTotal = $totalPurchasePrice + $totalTax;

          // Payment distribution (30% full, 40% partial, 30% unpaid)
          $paymentType = rand(1, 10);
          if ($paymentType <= 3) {
            $paidAmount = round($grandTotal, 2);
            $dueAmount  = 0.0;
          } elseif ($paymentType <= 7) {
            $paidAmount = round($grandTotal * rand(25, 75) / 100, 2);
            $dueAmount  = round($grandTotal - $paidAmount, 2);
          } else {
            $paidAmount = 0.0;
            $dueAmount  = round($grandTotal, 2);
          }

          // Safety: never negative
          $paidAmount = max(0, $paidAmount);
          $dueAmount  = max(0, $dueAmount);

          $supplierId = $supplierIds[array_rand($supplierIds)];

          // Create purchase invoice (totalAmount = without tax)
          DB::table('purchaseInvoice')->insert([
            'id'             => $invoiceId,
            'date'           => $invoiceDate,
            'totalAmount'    => round($totalPurchasePrice, 2),
            'totalTax'       => round($totalTax, 2),
            'paidAmount'     => round($paidAmount, 2),
            'dueAmount'      => round($dueAmount, 2),
            'supplierId'     => $supplierId,
            'note'           => rand(0, 1) ? "Purchase invoice note" : null,
            'supplierMemoNo' => 'SUP-' . strtoupper(substr($invoiceId, 0, 8)),
            'invoiceMemoNo'  => 'INV-' . strtoupper(substr($invoiceId, 0, 8)),
            'created_at'     => $invoiceDate,
            'updated_at'     => $invoiceDate,
          ]);

          // Insert invoice products (pivot)
          DB::table('purchaseInvoiceProduct')->insert($invoiceProducts);

          // Transactions (match controller)
          DB::table('transaction')->insert([
            'date'        => $invoiceDate,
            'debitId'     => $purchaseAccountId,
            'creditId'    => $accountsPayableId,
            'particulars' => "Total purchase price without tax on Purchase Invoice #{$invoiceId}",
            'amount'      => round($totalPurchasePrice, 2),
            'type'        => 'purchase',
            'relatedId'   => $invoiceId,
            'status'      => 'true',
            'created_at'  => $invoiceDate,
            'updated_at'  => $invoiceDate,
          ]);

          if ($totalTax > 0) {
            DB::table('transaction')->insert([
              'date'        => $invoiceDate,
              'debitId'     => $taxAccountId,
              'creditId'    => $accountsPayableId,
              'particulars' => "Total purchase tax on Purchase Invoice #{$invoiceId}",
              'amount'      => round($totalTax, 2),
              'type'        => 'purchase',
              'relatedId'   => $invoiceId,
              'status'      => 'true',
              'created_at'  => $invoiceDate,
              'updated_at'  => $invoiceDate,
            ]);
          }

          if ($paidAmount > 0) {
            DB::table('transaction')->insert([
              'date'        => $invoiceDate,
              'debitId'     => $accountsPayableId,
              'creditId'    => $cashAccountId,
              'particulars' => "Paid on Purchase Invoice #{$invoiceId}",
              'amount'      => round($paidAmount, 2),
              'type'        => 'purchase',
              'relatedId'   => $invoiceId,
              'status'      => 'true',
              'created_at'  => $invoiceDate,
              'updated_at'  => $invoiceDate,
            ]);
          }

          // OPTIONAL: seed a purchase return (~25%)
          if (rand(1, 100) <= 25) {
            $returnId   = (string) Str::uuid();
            $returnDate = (clone $invoiceDate)->addDays(rand(1, 60));
            if ($returnDate->gt(Carbon::now())) {
              $returnDate = Carbon::now()->startOfDay();
            }

            $returnLines = collect($invoiceProducts)->shuffle()->take(rand(1, min(3, count($invoiceProducts))));

            $returnPurchase = 0.0; // without tax
            $returnTax      = 0.0;

            foreach ($returnLines as $line) {
              $maxQty   = (int) $line['productQuantity'];
              $retQty   = max(1, rand(1, $maxQty));
              $unit     = (float) $line['productUnitPurchasePrice'];
              $taxPct   = (float) $line['tax'];

              $lineBase = $unit * $retQty;
              $lineTax  = ($lineBase * $taxPct) / 100;

              $returnPurchase += $lineBase;
              $returnTax      += $lineTax;
            }

            $instantPercent      = [0, 50, 100][array_rand([0, 50, 100])];
            $instantReturnAmount = round(($returnPurchase + $returnTax) * ($instantPercent / 100), 2);

            DB::table('returnPurchaseInvoice')->insert([
              'id'                  => $returnId,
              'date'                => $returnDate,
              'totalAmount'         => round($returnPurchase, 2),
              'instantReturnAmount' => $instantReturnAmount,
              'tax'                 => round($returnTax, 2),
              'note'                => 'Auto generated return',
              'purchaseInvoiceId'   => $invoiceId,
              'invoiceMemoNo'       => 'RINV-' . strtoupper(substr($returnId, 0, 8)),
              'status'              => 'true',
              'created_at'          => $returnDate,
              'updated_at'          => $returnDate,
            ]);

            if ($returnPurchase > 0) {
              DB::table('transaction')->insert([
                'date'        => $returnDate,
                'debitId'     => $accountsPayableId,
                'creditId'    => $purchaseAccountId,
                'particulars' => "Purchase return (goods) for Invoice #{$invoiceId}",
                'amount'      => round($returnPurchase, 2),
                'type'        => 'purchase_return',
                'relatedId'   => $invoiceId,
                'status'      => 'true',
                'created_at'  => $returnDate,
                'updated_at'  => $returnDate,
              ]);
            }

            if ($returnTax > 0) {
              DB::table('transaction')->insert([
                'date'        => $returnDate,
                'debitId'     => $accountsPayableId,
                'creditId'    => $taxAccountId,
                'particulars' => "Purchase return (tax) for Invoice #{$invoiceId}",
                'amount'      => round($returnTax, 2),
                'type'        => 'purchase_return',
                'relatedId'   => $invoiceId,
                'status'      => 'true',
                'created_at'  => $returnDate,
                'updated_at'  => $returnDate,
              ]);
            }

            if ($instantReturnAmount > 0) {
              DB::table('transaction')->insert([
                'date'        => $returnDate,
                'debitId'     => $cashAccountId,
                'creditId'    => $accountsPayableId,
                'particulars' => "Instant paid on Purchase Return for Invoice #{$invoiceId}",
                'amount'      => $instantReturnAmount,
                'type'        => 'purchase_return',
                'relatedId'   => $invoiceId,
                'status'      => 'true',
                'created_at'  => $returnDate,
                'updated_at'  => $returnDate,
              ]);
            }
          }

          DB::commit();
        } catch (\Throwable $e) {
          DB::rollBack();
          $this->command->warn("Failed to seed one invoice: {$e->getMessage()}");
        }
      }
    }
  }
}
