<?php

namespace App\Http\Controllers;

use App\Models\PurchaseInvoice;
use App\Models\Transaction;
use Carbon\Carbon;
use DateTime;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentPurchaseInvoiceController extends Controller
{
    //create paymentPurchaseInvoice controller method
    public function createPaymentPurchaseInvoice(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $date = Carbon::parse($request->input('date'));
            $amount = 0.0;

            $purchaseInvoice = PurchaseInvoice::where('id', $request->input('purchaseInvoiceNo'))
                ->first();

            if (!$purchaseInvoice) {
                return response()->json(['error' => 'No invoice found!'], 404);
            }

            // due amount calculation
            // transaction of the total amount
            $totalAmount = Transaction::where('type', 'purchase')
                ->where('relatedId', $request->input('purchaseInvoiceNo'))
                ->where(function ($query) {
                    $query->where('creditId', 5);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();


            // transaction of the paidAmount
            $totalPaidAmount = Transaction::where('type', 'purchase')
                ->where('relatedId', $request->input('purchaseInvoiceNo'))
                ->where(function ($query) {
                    $query->orWhere('debitId', 5);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();

            // transaction of the total amount
            $totalAmountOfReturn = Transaction::where('type', 'purchase_return')
                ->where('relatedId', $request->input('purchaseInvoiceNo'))
                ->where(function ($query) {
                    $query->where('debitId', 5);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();

            // transaction of the total instant return
            $totalInstantReturnAmount = Transaction::where('type', 'purchase_return')
                ->where('relatedId', $request->input('purchaseInvoiceNo'))
                ->where(function ($query) {
                    $query->where('creditId', 5);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();

            // calculate grand total due amount and fixed 2 decimal
            $rawDueAmount = (($totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount')) - $totalPaidAmount->sum('amount')) + $totalInstantReturnAmount->sum('amount');
            $totalDueAmount = takeUptoTwoDecimal($rawDueAmount);

            foreach ($request->paidAmount as $amountData) {
                // fixed 2 decimal
                $amount += takeUptoTwoDecimal((float) $amountData['amount']);
            }

            // validation with due
            if ($totalDueAmount < takeUptoTwoDecimal($amount)) {
                return response()->json(['error' => 'Amount cannot be greater than due!'], 400);
            }

            // pay on purchase transaction create
            foreach ($request->paidAmount as $amountData) {
                $currentAmount = takeUptoTwoDecimal((float) $amountData['amount']);

                if ($currentAmount > 0) {
                    Transaction::create([
                        'date' => new DateTime($date),
                        'debitId' => 5,
                        'creditId' => $amountData['paymentType'] ? $amountData['paymentType'] : 1,
                        'amount' => $currentAmount, // fixed 2 decimal applied
                        'particulars' => "Due pay of Purchase Invoice #{$request->input('purchaseInvoiceNo')}",
                        'type' => 'purchase',
                        'relatedId' => $request->input('purchaseInvoiceNo'),
                    ]);
                }
            }

            DB::commit();
            // ✅ Fix: Return success message so frontend modal closes automatically
            return response()->json(['message' => 'success'], 201);
        } catch (Exception $err) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during create paymentPurchase. Please try again later.', 'details' => $err->getMessage()], 500);
        }
    }

    // get all the paymentPurchaseInvoice controller method
    public function getAllPaymentPurchaseInvoice(Request $request): JsonResponse
    {
        if ($request->query('query') === 'all') {
            try {
                $allPaymentPurchaseInvoice = Transaction::where('type', 'purchase')
                    ->orderBy('id', 'desc')
                    ->get();

                $converted = arrayKeysToCamelCase($allPaymentPurchaseInvoice->toArray());
                return response()->json($converted, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting  paymentPurchase. Please try again later.'], 500);
            }
        } else if ($request->query('query') === 'info') {
            try {
                $aggregations = Transaction::where('type', 'purchase')
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                $finalResult = [
                    '_count' => [
                        'id' => $aggregations->id,
                    ],
                    '_sum' => [
                        'amount' => $aggregations->amount,
                    ],
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting  paymentPurchase. Please try again later.'], 500);
            }
        } else if ($request->query()) {
            try {
                $pagination = getPagination($request->query());
                $allPaymentPurchaseInvoice = Transaction::when($request->query('date'), function ($query) use ($request) {
                    return $query->whereIn('date', explode(',', $request->query('date')));
                })
                    ->when($request->query('amount'), function ($query) use ($request) {
                        return $query->whereIn('amount', explode(',', $request->query('amount')));
                    })
                    ->when($request->query('type'), function ($query) use ($request) {
                        return $query->whereIn('type', explode(',', $request->query('type')));
                    })
                    ->when($request->query('filterStatus'), function ($query) use ($request) {
                        return $query->whereIn('status', explode(',', $request->query('filterStatus')));
                    })
                    ->orderBy('id', 'desc')
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $totalPaymentPurchaseInvoiceCount = Transaction::when($request->query('date'), function ($query) use ($request) {
                    return $query->whereIn('date', explode(',', $request->query('date')));
                })
                    ->when($request->query('amount'), function ($query) use ($request) {
                        return $query->whereIn('amount', explode(',', $request->query('amount')));
                    })
                    ->when($request->query('type'), function ($query) use ($request) {
                        return $query->whereIn('type', explode(',', $request->query('type')));
                    })
                    ->when($request->query('filterStatus'), function ($query) use ($request) {
                        return $query->whereIn('status', explode(',', $request->query('filterStatus')));
                    })
                    ->count();

                $aggregations = Transaction::where('type', 'purchase')
                    ->selectRaw('COUNT(id) as count, SUM(amount) as amount')
                    ->first();

                $converted = arrayKeysToCamelCase($allPaymentPurchaseInvoice->toArray());
                $finalResult = [
                    'getAllPaymentPurchaseInvoice' => $converted,
                    'totalPaymentPurchaseInvoice' => $aggregations->count,
                    'totalAmount' => $aggregations->amount,
                    'totalPaymentPurchaseInvoiceCount' => [
                        '_contact' => [
                            'id' => $totalPaymentPurchaseInvoiceCount,
                        ],
                    ],
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting  paymentPurchase. Please try again later.'], 500);
            }
        } else {
            return response()->json(['error' => 'Invalid Query!'], 400);
        }
    }
}