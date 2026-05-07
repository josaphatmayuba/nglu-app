<?php

namespace App\Http\Controllers;

use App\Models\{Product, Transaction, PurchaseInvoiceProduct, PurchaseInvoice, ReturnPurchaseInvoice};
use Carbon\Carbon;
use DateTime;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\DB;

class PurchaseInvoiceController extends Controller
{
    //create purchaseInvoice controller method
    public function createSinglePurchaseInvoice(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $validate = Validator($request->all(), [
                'date' => 'required|date',
                'purchaseInvoiceProduct' => 'required|array|min:1',
                'purchaseInvoiceProduct.*.productId' => 'required|integer',
                'purchaseInvoiceProduct.*.productQuantity' => 'required|integer',
                'purchaseInvoiceProduct.*.productUnitPurchasePrice' => 'required|numeric',
                'purchaseInvoiceProduct.*.tax' => 'required|numeric',
                'supplierId' => 'required|integer|exists:supplier,id',
                'note' => 'nullable|string',
            ]);
            if ($validate->fails()) {
                return response()->json(['error' => $validate->errors()->first()], 400);
            }

            $totalTax = 0.0;
            $totalPurchasePrice = 0.0;
            foreach ($request->purchaseInvoiceProduct as $item) {
                $productUnitPurchasePrice = takeUptoTwoDecimal((float) $item['productUnitPurchasePrice'] * (int) $item['productQuantity']);
                $taxAmount = takeUptoTwoDecimal(($productUnitPurchasePrice * (float) $item['tax']) / 100);

                $totalTax += $taxAmount;
                $totalPurchasePrice += $productUnitPurchasePrice;
            }

            $totalPaidAmount = 0.0;
            foreach ($request->paidAmount as $amountData) {
                $totalPaidAmount += takeUptoTwoDecimal((float) $amountData['amount']);
            }

            $totalInvoiceAmount = takeUptoTwoDecimal($totalPurchasePrice + $totalTax);

            if (takeUptoTwoDecimal($totalPaidAmount) > $totalInvoiceAmount) {
                return response()->json(['error' => 'Paid Amount cannot be bigger than purchase Price!'], 400);
            }

            $date = Carbon::parse($request->input('date'));
            $createdInvoice = PurchaseInvoice::create([
                'date' => $date,
                'invoiceMemoNo' => $request->input('invoiceMemoNo') ? $request->input('invoiceMemoNo') : null,
                'totalAmount' => takeUptoTwoDecimal($totalPurchasePrice),
                'totalTax' => takeUptoTwoDecimal($totalTax),
                'paidAmount' => $totalPaidAmount ? takeUptoTwoDecimal($totalPaidAmount) : 0,
                'dueAmount' => takeUptoTwoDecimal($totalInvoiceAmount - $totalPaidAmount),
                'supplierId' => $request->input('supplierId'),
                'note' => $request->input('note'),
                'supplierMemoNo' => $request->input('supplierMemoNo'),
            ]);

            if ($createdInvoice) {
                foreach ($request->purchaseInvoiceProduct as $item) {
                    $productFinalAmount = takeUptoTwoDecimal((int) $item['productQuantity'] * (float) $item['productUnitPurchasePrice']);
                    $taxAmount = takeUptoTwoDecimal(($productFinalAmount * (float) $item['tax']) / 100);

                    PurchaseInvoiceProduct::create([
                        'invoiceId' => $createdInvoice->id,
                        'productId' => $item['productId'],
                        'productQuantity' => $item['productQuantity'],
                        'productUnitPurchasePrice' => takeUptoTwoDecimal((float) $item['productUnitPurchasePrice']),
                        'productFinalAmount' => $productFinalAmount,
                        'tax' => $item['tax'],
                        'taxAmount' => $taxAmount,
                    ]);
                }
            }

            // transaction for purchase account payable for total amount without tax
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 3,
                'creditId' => 5,
                'amount' => takeUptoTwoDecimal($totalPurchasePrice),
                'particulars' => "Total purchase price without tax on Purchase Invoice #$createdInvoice->id",
                'type' => 'purchase',
                'relatedId' => $createdInvoice->id,
            ]);

            // transaction for purchase account payable for tax amount
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 15,
                'creditId' => 5,
                'amount' => takeUptoTwoDecimal($totalTax),
                'particulars' => "Total purchase tax on Purchase Invoice #$createdInvoice->id",
                'type' => 'purchase',
                'relatedId' => $createdInvoice->id,
            ]);

            // pay on purchase transaction create
            foreach ($request->paidAmount as $amountData) {
                if ((float) $amountData['amount'] > 0) {
                    Transaction::create([
                        'date' => new DateTime($date),
                        'debitId' => 5,
                        'creditId' => $amountData['paymentType'] ? $amountData['paymentType'] : 1,
                        'amount' => takeUptoTwoDecimal((float) $amountData['amount']),
                        'particulars' => "Paid on Purchase Invoice #$createdInvoice->id",
                        'type' => 'purchase',
                        'relatedId' => $createdInvoice->id,
                    ]);
                }
            }

            // iterate through all products of this purchase invoice and add product quantity, update product purchase price to database
            foreach ($request->purchaseInvoiceProduct as $item) {
                $productId = (int) $item['productId'];
                $productQuantity = (int) $item['productQuantity'];
                $productSalePrice = (float) $item['productUnitSalePrice'];

                // single product purchase price avg calculation
                $productData = Product::where('id', $item['productId'])->first();
                $inventoryQuantity = (int) $productData->productQuantity;
                $inventoryPurchasePrice = (float) $productData->productPurchasePrice;
                $requestSingleQuantity = (int) $item['productQuantity'];
                $requestSinglePrice = (float) $item['productUnitPurchasePrice'];

                $newSinglePurchasePrice = 0;
                $totalQuantity = $inventoryQuantity + $requestSingleQuantity;
                if ($totalQuantity > 0) {
                    $newSinglePurchasePrice = (($inventoryQuantity * $inventoryPurchasePrice) + ($requestSingleQuantity * $requestSinglePrice)) / $totalQuantity;
                }

                Product::where('id', $productId)->update([
                    'productQuantity' => $inventoryQuantity + $productQuantity,
                    'productPurchasePrice' => takeUptoTwoDecimal($newSinglePurchasePrice),
                    'productSalePrice' => takeUptoTwoDecimal($productSalePrice),
                ]);
            }

            $converted = arrayKeysToCamelCase($createdInvoice->toArray());
            DB::commit();
            return response()->json(['createdInvoice' => $converted], 201);
        } catch (Exception $err) {
            DB::rollBack();
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }

    // get all the purchaseInvoice controller method
    public function getAllPurchaseInvoice(Request $request): JsonResponse
    {
        if ($request->query('query') === 'info') {
            try {
                $aggregation = PurchaseInvoice::selectRaw('COUNT(id) as id')->first();

                // transaction of the total amount
                $totalAmount = Transaction::where('type', 'purchase')
                    ->where('creditId', 5)
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // transaction of the paidAmount
                $totalPaidAmount = Transaction::where('type', 'purchase')
                    ->where('debitId', 5)
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // transaction of the total amount of return
                $totalAmountOfReturn = Transaction::where('type', 'purchase_return')
                    ->where('debitId', 5)
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // transaction of the total instant return
                $totalInstantReturnAmount = Transaction::where('type', 'purchase_return')
                    ->where('creditId', 5)
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // Extract values carefully to avoid null arithmetic conflict
                $sumTotalAmount = (float) ($totalAmount->amount ?? 0);
                $sumTotalPaidAmount = (float) ($totalPaidAmount->amount ?? 0);
                $sumTotalReturnAmount = (float) ($totalAmountOfReturn->amount ?? 0);
                $sumInstantReturnAmount = (float) ($totalInstantReturnAmount->amount ?? 0);

                // calculation of due amount
                $totalDueAmount = $sumTotalAmount - $sumTotalReturnAmount - $sumTotalPaidAmount + $sumInstantReturnAmount;

                $result = [
                    '_count' => [
                        'id' => $aggregation->id,
                    ],
                    '_sum' => [
                        'totalAmount' => takeUptoTwoDecimal($sumTotalAmount),
                        'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                        'paidAmount' => takeUptoTwoDecimal($sumTotalPaidAmount),
                        'totalReturnAmount' => takeUptoTwoDecimal($sumTotalReturnAmount),
                        'instantReturnPaidAmount' => takeUptoTwoDecimal($sumInstantReturnAmount),
                    ],
                ];

                return response()->json($result, 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } elseif ($request->query('query') === 'search') {
            // ... (Search logic remains the same) ...
            try {
                $pagination = getPagination($request->query());

                $allPurchase = PurchaseInvoice::where('id', $request->query('key'))
                    ->orWhere('supplierMemoNo', 'LIKE', '%' . $request->query('key') . '%')
                    ->with('purchaseInvoiceProduct')
                    ->orderBy('created_at', 'desc')
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $total = PurchaseInvoice::where('id', $request->query('key'))
                    ->orWhere('supplierMemoNo', 'LIKE', '%' . $request->query('key') . '%')
                    ->count();

                $converted = arrayKeysToCamelCase($allPurchase->toArray());
                $finalResult = [
                    'getAllPurchaseInvoice' => $converted,
                    'totalPurchaseInvoice' => $total,
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } elseif ($request->query('query') === 'report') {
            try {
                $purchaseInvoices = PurchaseInvoice::with('purchaseInvoiceProduct', 'purchaseInvoiceProduct.product:id,name', 'supplier:id,name')
                    ->orderBy('created_at', 'desc')
                    ->when($request->query('supplierId'), function ($query) use ($request) {
                        return $query->where('supplierId', $request->query('supplierId'));
                    })
                    ->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                        return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                    })
                    ->get();

                $purchaseInvoiceIds = $purchaseInvoices->pluck('id')->toArray();

                // ... (Fetch transactions logic remains the same) ...
                $totalAmountQuery = Transaction::where('type', 'purchase')->whereIn('relatedId', $purchaseInvoiceIds)->where('creditId', 5)->get();
                $totalPaidAmountQuery = Transaction::where('type', 'purchase')->whereIn('relatedId', $purchaseInvoiceIds)->where('debitId', 5)->get();
                $totalAmountOfReturnQuery = Transaction::where('type', 'purchase_return')->whereIn('relatedId', $purchaseInvoiceIds)->where('debitId', 5)->get();
                $totalInstantReturnAmountQuery = Transaction::where('type', 'purchase_return')->whereIn('relatedId', $purchaseInvoiceIds)->where('creditId', 5)->get();

                // calculate grand total due amount
                $grandTotalDueAmount = $totalAmountQuery->sum('amount') - $totalAmountOfReturnQuery->sum('amount') - $totalPaidAmountQuery->sum('amount') + $totalInstantReturnAmountQuery->sum('amount');

                $allPurchaseInvoice = $purchaseInvoices->map(function ($item) use ($totalAmountQuery, $totalPaidAmountQuery, $totalAmountOfReturnQuery, $totalInstantReturnAmountQuery) {
                    $itemTotalAmount = $totalAmountQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);
                    $itemTotalPaid = $totalPaidAmountQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);
                    $itemTotalReturnAmount = $totalAmountOfReturnQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);
                    $itemInstantPaidReturnAmount = $totalInstantReturnAmountQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);

                    $itemTotalDueAmount = $itemTotalAmount - $itemTotalReturnAmount - $itemTotalPaid + $itemInstantPaidReturnAmount;

                    // FIX: Applied takeUptoTwoDecimal here to avoid float conflicts in report API
                    $item->paidAmount = takeUptoTwoDecimal($itemTotalPaid);
                    $item->instantPaidReturnAmount = takeUptoTwoDecimal($itemInstantPaidReturnAmount);
                    $item->dueAmount = takeUptoTwoDecimal($itemTotalDueAmount);
                    $item->returnAmount = takeUptoTwoDecimal($itemTotalReturnAmount);

                    return $item;
                });

                $aggregations = [
                    '_count' => [
                        'id' => $purchaseInvoices->count(),
                    ],
                    '_sum' => [
                        'totalAmount' => takeUptoTwoDecimal($totalAmountQuery->sum('amount')),
                        'paidAmount' => takeUptoTwoDecimal($totalPaidAmountQuery->sum('amount')),
                        'dueAmount' => takeUptoTwoDecimal($grandTotalDueAmount),
                        'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturnQuery->sum('amount')),
                        'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmountQuery->sum('amount')),
                    ],
                ];

                $converted = arrayKeysToCamelCase(collect($allPurchaseInvoice)->toArray());
                return response()->json([
                    'aggregations' => $aggregations,
                    'getAllPurchaseInvoice' => $converted,
                    'totalPurchaseInvoice' => $purchaseInvoices->count(),
                ], 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } elseif ($request->query()) {
            // ... Default block fixes apply similarly ...
            try {
                $pagination = getPagination($request->query());

                $purchaseInvoices = PurchaseInvoice::with('purchaseInvoiceProduct', 'purchaseInvoiceProduct.product:id,name', 'supplier:id,name')
                    ->orderBy('created_at', 'desc')
                    ->when($request->query('supplierId'), function ($query) use ($request) {
                        return $query->whereIn('supplierId', explode(',', $request->query('supplierId')));
                    })
                    ->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                        return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                    })
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $purchaseInvoiceIds = $purchaseInvoices->pluck('id')->toArray();

                $totalAmountQuery = Transaction::where('type', 'purchase')->whereIn('relatedId', $purchaseInvoiceIds)->where('creditId', 5)->get();
                $totalPaidAmountQuery = Transaction::where('type', 'purchase')->whereIn('relatedId', $purchaseInvoiceIds)->where('debitId', 5)->get();
                $totalAmountOfReturnQuery = Transaction::where('type', 'purchase_return')->whereIn('relatedId', $purchaseInvoiceIds)->where('debitId', 5)->get();
                $totalInstantReturnAmountQuery = Transaction::where('type', 'purchase_return')->whereIn('relatedId', $purchaseInvoiceIds)->where('creditId', 5)->get();

                $grandTotalDueAmount = $totalAmountQuery->sum('amount') - $totalAmountOfReturnQuery->sum('amount') - $totalPaidAmountQuery->sum('amount') + $totalInstantReturnAmountQuery->sum('amount');

                $allPurchaseInvoice = $purchaseInvoices->map(function ($item) use ($totalAmountQuery, $totalPaidAmountQuery, $totalAmountOfReturnQuery, $totalInstantReturnAmountQuery) {
                    $itemTotalAmount = $totalAmountQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);
                    $itemTotalPaid = $totalPaidAmountQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);
                    $itemTotalReturnAmount = $totalAmountOfReturnQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);
                    $itemInstantPaidReturnAmount = $totalInstantReturnAmountQuery->filter(fn($trans) => $trans->relatedId === $item->id)->reduce(fn($acc, $current) => $acc + $current->amount, 0);

                    $itemTotalDueAmount = $itemTotalAmount - $itemTotalReturnAmount - $itemTotalPaid + $itemInstantPaidReturnAmount;

                    $item->paidAmount = takeUptoTwoDecimal($itemTotalPaid);
                    $item->instantPaidReturnAmount = takeUptoTwoDecimal($itemInstantPaidReturnAmount);
                    $item->dueAmount = takeUptoTwoDecimal($itemTotalDueAmount);
                    $item->returnAmount = takeUptoTwoDecimal($itemTotalReturnAmount);

                    return $item;
                });

                $counted = PurchaseInvoice::when($request->query('supplierId'), function ($query) use ($request) {
                    return $query->whereIn('supplierId', explode(',', $request->query('supplierId')));
                })->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                    return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())
                        ->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                })->count();

                $aggregations = [
                    '_count' => [
                        'id' => $counted,
                    ],
                    '_sum' => [
                        'totalAmount' => takeUptoTwoDecimal($totalAmountQuery->sum('amount')),
                        'paidAmount' => takeUptoTwoDecimal($totalPaidAmountQuery->sum('amount')),
                        'dueAmount' => takeUptoTwoDecimal($grandTotalDueAmount),
                        'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturnQuery->sum('amount')),
                        'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmountQuery->sum('amount')),
                    ],
                ];

                $converted = arrayKeysToCamelCase($allPurchaseInvoice->toArray());
                return response()->json([
                    'aggregations' => $aggregations,
                    'getAllPurchaseInvoice' => $converted,
                    'totalPurchaseInvoice' => $counted,
                ], 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else {
            return response()->json(['error' => 'invalid query!'], 400);
        }
    }

    // get a single purchaseInvoice controller method
    public function getSinglePurchaseInvoice(Request $request, $id): JsonResponse
    {
        try {
            $singlePurchaseInvoice = PurchaseInvoice::where('id', $id)->with('purchaseInvoiceProduct.product', 'supplier')->first();

            if (!$singlePurchaseInvoice) {
                return response()->json(['error' => 'This invoice not Found'], 400);
            }

            // ... (Transactions fetch queries remains identical) ...
            $totalAmount = Transaction::where('type', 'purchase')->where('relatedId', $id)->where('creditId', 5)->with('debit:id,name', 'credit:id,name')->orderBy('id', 'desc')->get();
            $totalPaidAmount = Transaction::where('type', 'purchase')->where('relatedId', $id)->where('debitId', 5)->with('debit:id,name', 'credit:id,name')->orderBy('id', 'desc')->get();
            $totalAmountOfReturn = Transaction::where('type', 'purchase_return')->where('relatedId', $id)->where('debitId', 5)->with('debit:id,name', 'credit:id,name')->orderBy('id', 'desc')->get();
            $totalInstantReturnAmount = Transaction::where('type', 'purchase_return')->where('relatedId', $id)->where('creditId', 5)->with('debit:id,name', 'credit:id,name')->orderBy('id', 'desc')->get();

            // FIX: calculate grand total due amount and pass to takeUptoTwoDecimal before condition checking
            $rawDueAmount = $totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount') - $totalPaidAmount->sum('amount') + $totalInstantReturnAmount->sum('amount');
            $totalDueAmount = takeUptoTwoDecimal($rawDueAmount);

            $returnPurchaseInvoice = ReturnPurchaseInvoice::where('purchaseInvoiceId', $id)->with('returnPurchaseInvoiceProduct', 'returnPurchaseInvoiceProduct.product')->orderBy('id', 'desc')->get();

            $status = 'UNPAID';
            if ($totalDueAmount <= 0.0) {
                $status = 'PAID';
            }

            $transactions = Transaction::where('relatedId', $id)
                ->where(function ($query) {
                    $query->orWhere('type', 'purchase')->orWhere('type', 'purchase_return');
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();

            $convertedSingleInvoice = arrayKeysToCamelCase($singlePurchaseInvoice->toArray());
            $convertedReturnInvoice = arrayKeysToCamelCase($returnPurchaseInvoice->toArray());
            $convertedTransactions = arrayKeysToCamelCase($transactions->toArray());

            $finalResult = [
                'status' => $status,
                'totalAmount' => takeUptoTwoDecimal($totalAmount->sum('amount')),
                'totalPaidAmount' => takeUptoTwoDecimal($totalPaidAmount->sum('amount')),
                'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->sum('amount')),
                'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->sum('amount')),
                'dueAmount' => $totalDueAmount,
                'singlePurchaseInvoice' => $convertedSingleInvoice,
                'returnPurchaseInvoice' => $convertedReturnInvoice,
                'transactions' => $convertedTransactions,
            ];

            return response()->json($finalResult, 200);
        } catch (Exception $err) {
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }
}