<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Customer;
use App\Models\PurchaseInvoice;
use App\Models\ReturnPurchaseInvoice;
use App\Models\ReturnSaleInvoice;
use App\Models\SaleInvoice;
use App\Models\SaleInvoiceProduct;
use App\Models\SubAccount;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DashboardController extends Controller
{
    public function getDashboardData(Request $request): JsonResponse
    {
        try {
            // 2.1 Validate + Date range resolve
            Validator::make($request->all(), [
                'startDate' => 'nullable|date_format:Y-m-d',
                'endDate' => 'nullable|date_format:Y-m-d|after_or_equal:startDate',
            ])->validate();

            $start = $request->query('startDate')
                ? Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay()
                : now()->startOfMonth();
            $end = $request->query('endDate')
                ? Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay()
                : now()->endOfMonth();

            // 2.2 Sales/Purchase aggregates
            $salesAgg = SaleInvoice::whereBetween('date', [$start, $end])
                ->selectRaw('COALESCE(SUM(totalAmount),0) as total, COALESCE(SUM(paidAmount),0) as paid, COALESCE(SUM(dueAmount),0) as due')
                ->first();

            $purchaseAgg = PurchaseInvoice::whereBetween('date', [$start, $end])
                ->selectRaw('COALESCE(SUM(totalAmount),0) as total, COALESCE(SUM(paidAmount),0) as paid, COALESCE(SUM(dueAmount),0) as due')
                ->first();

            $salesReturn = ReturnSaleInvoice::whereBetween('date', [$start, $end])
                ->sum('totalAmount') ?? 0;

            $purchaseReturn = ReturnPurchaseInvoice::whereBetween('date', [$start, $end])
                ->sum('totalAmount') ?? 0;

            // 2.3 Monthly Sales vs Purchases (Fixed: Added Year to grouping and ordered properly)
            $monthlySales = SaleInvoice::whereBetween('date', [$start, $end])
                ->selectRaw("DATE_FORMAT(date, '%b %y') as month, COALESCE(SUM(totalAmount),0) as sales")
                ->groupBy('month')
                ->orderByRaw("MIN(date)")
                ->get();

            $monthlyPurchases = PurchaseInvoice::whereBetween('date', [$start, $end])
                ->selectRaw("DATE_FORMAT(date, '%b %y') as month, COALESCE(SUM(totalAmount),0) as purchases")
                ->groupBy('month')
                ->orderByRaw("MIN(date)")
                ->get();

            $monthly = $monthlySales->map(function ($row) use ($monthlyPurchases) {
                $p = $monthlyPurchases->firstWhere('month', $row->month);
                return [
                    'month' => $row->month, // Example output: "Jan 26"
                    'sales' => (int) round($row->sales),
                    'purchases' => (int) round($p->purchases ?? 0),
                ];
            })->values();

            // 2.4 Accounts
            $accounts = SubAccount::withSum(
                ['credit as credit_amount' => fn($q) => $q->whereBetween('date', [$start, $end])],
                'amount'
            )
                ->withSum(
                    ['debit as debit_amount' => fn($q) => $q->whereBetween('date', [$start, $end])],
                    'amount'
                )
                ->get()
                ->map(fn($sa) => [
                    'account' => $sa->name,
                    'amount' => (int) round(abs(($sa->credit_amount ?? 0) - ($sa->debit_amount ?? 0))),
                ])
                ->filter(fn($i) => $i['amount'] > 0)
                ->sortByDesc('amount')
                ->values();

            // 2.5 Top Orders (Fixed: Added null safe operator for missing customers)
            $topCustomers = SaleInvoice::whereBetween('date', [$start, $end])
                ->whereNotNull('customerId')
                ->selectRaw('customerId, SUM(totalAmount) as total_sales, SUM(totalTaxAmount) as total_tax')
                ->groupBy('customerId')
                ->orderByDesc('total_sales')
                ->with([
                    'customer' => function ($q) {
                        $q->select('id', 'firstName', 'lastName', 'phone', 'email', 'username');
                    }
                ])
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    $customer = $item->customer;
                    // Null safety added here
                    $name = trim(($customer?->firstName ?? '') . ' ' . ($customer?->lastName ?? ''));
                    if (empty($name)) {
                        $name = $customer?->phone ?? $customer?->email ?? 'Unknown Customer';
                    }

                    return [
                        'customer' => $name,
                        'username' => $customer?->username ?? 'Unknown',
                        'total_sales' => (int) round($item->total_sales),
                        'phone' => $customer?->phone ?? 'N/A',
                    ];
                });

            // 2.6 Recent Orders (Fixed: Added null safe operator for missing products)
            $topProducts = SaleInvoiceProduct::whereHas('saleInvoice', function ($q) use ($start, $end) {
                $q->whereBetween('date', [$start, $end]);
            })
                ->selectRaw('productId, SUM(productQuantity) as total_quantity, SUM(productFinalAmount) as total_sales')
                ->groupBy('productId')
                ->orderByDesc('total_sales')
                ->with([
                    'product' => function ($query) {
                        $query->select('id', 'name');
                    }
                ])
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'product' => $item->product?->name ?? 'Unknown Product', // Null safety
                        'quantity' => (int) $item->total_quantity,
                        'amount' => (int) round($item->total_sales),
                    ];
                });

            // 2.7 KPI Trend + Change% (Fixed: Creates continuous 7 days array filling gaps with 0)
            $makeTrend = function ($model, $col) use ($end) {
                $trendStart = (clone $end)->subDays(6)->startOfDay();
                $trendEnd = (clone $end)->endOfDay();

                $dbRows = $model::whereBetween('date', [$trendStart, $trendEnd])
                    ->selectRaw('DATE(date) as d, COALESCE(SUM(' . $col . '),0) as v')
                    ->groupBy('d')
                    ->pluck('v', 'd')
                    ->toArray();

                $trendArray = [];
                for ($i = 6; $i >= 0; $i--) {
                    $dateStr = (clone $end)->subDays($i)->format('Y-m-d');
                    $trendArray[] = (int) round($dbRows[$dateStr] ?? 0);
                }

                return $trendArray;
            };

            $pct = function ($trend) {
                if (count($trend) < 2)
                    return 0;

                $prev = $trend[count($trend) - 2];
                $curr = $trend[count($trend) - 1];

                if ($prev == 0) {
                    return $curr > 0 ? 100 : 0;
                }
                return round((($curr - $prev) / $prev) * 100, 1);
            };

            $saleAmountTrend = $makeTrend(SaleInvoice::class, 'totalAmount');
            $saleDueTrend = $makeTrend(SaleInvoice::class, 'dueAmount');
            $purAmountTrend = $makeTrend(PurchaseInvoice::class, 'totalAmount');
            $purDueTrend = $makeTrend(PurchaseInvoice::class, 'dueAmount');

            $kpis = [
                'totalSaleAmount' => [
                    'value' => (int) round($salesAgg->total),
                    'trend' => $saleAmountTrend,
                    'change' => $pct($saleAmountTrend),
                ],
                'totalSaleDue' => [
                    'value' => (int) round($salesAgg->due),
                    'trend' => $saleDueTrend,
                    'change' => $pct($saleDueTrend),
                ],
                'totalPurchaseAmount' => [
                    'value' => (int) round($purchaseAgg->total),
                    'trend' => $purAmountTrend,
                    'change' => $pct($purAmountTrend),
                ],
                'totalPurchaseDue' => [
                    'value' => (int) round($purchaseAgg->due),
                    'trend' => $purDueTrend,
                    'change' => $pct($purDueTrend),
                ],
            ];

            // 2.8 Final Payload
            $payload = [
                'kpis' => $kpis,
                'sales' => [
                    'totalSale' => (int) round($salesAgg->total),
                    'breakdown' => [
                        ['label' => 'Paid', 'value' => (int) round($salesAgg->paid), 'color' => '#3b82f6'],
                        ['label' => 'Due', 'value' => (int) round($salesAgg->due), 'color' => '#f59e0b'],
                        ['label' => 'Return', 'value' => (int) round($salesReturn), 'color' => '#ef4444'],
                    ],
                ],
                'purchases' => [
                    'totalPurchase' => (int) round($purchaseAgg->total),
                    'breakdown' => [
                        ['label' => 'Paid', 'value' => (int) round($purchaseAgg->paid), 'color' => '#10b981'],
                        ['label' => 'Due', 'value' => (int) round($purchaseAgg->due), 'color' => '#f59e0b'],
                        ['label' => 'Return', 'value' => (int) round($purchaseReturn), 'color' => '#ef4444'],
                    ],
                ],
                'monthly' => $monthly,
                'accounts' => $accounts,
                'topCustomers' => $topCustomers,
                'topProduct' => $topProducts,
            ];

            return response()->json($payload, 200);

        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}