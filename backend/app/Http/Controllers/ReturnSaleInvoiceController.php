<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ReturnSaleInvoice;
use App\Models\ReturnSaleInvoiceProduct;
use App\Models\SaleInvoice;
use App\Models\SaleInvoiceProduct;
use App\Models\Transaction;
use Carbon\Carbon;
use DateTime;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReturnSaleInvoiceController extends Controller
{
    //create returnSaleInvoice controller method
    public function createSingleReturnSaleInvoice(Request $request): JsonResponse
    {
        DB::beginTransaction(); // Added Database Transaction for safety
        try {
            // Changed 'integer' to 'string' for saleInvoiceId
            $validate = Validator($request->all(), [
                'saleInvoiceId' => 'required|string',
                'date' => 'required|date',
                'returnSaleInvoiceProduct' => 'required|array|min:1',
                'returnSaleInvoiceProduct.*.saleInvoiceProductId' => 'required|integer',
                'returnSaleInvoiceProduct.*.productQuantity' => 'required|numeric|min:1',
                'instantReturnAmount' => 'nullable|array',
                'note' => 'nullable|string',
            ]);

            if ($validate->fails()) {
                return response()->json(['error' => $validate->errors()->first()], 400);
            }

            // get sale invoice details
            $saleInvoice = SaleInvoice::where('id', $request->input('saleInvoiceId'))
                ->with('saleInvoiceProduct', 'customer')
                ->first();

            if (!$saleInvoice) {
                return response()->json(['error' => 'No Sale Invoice Found!'], 404);
            }

            $returnSaleInvoice = ReturnSaleInvoice::where('saleInvoiceId', $request->input('saleInvoiceId'))->with('returnSaleInvoiceProduct')->get();

            if ($returnSaleInvoice) {
                foreach ($request->returnSaleInvoiceProduct as $itemFromInput) {
                    $returnQuantity = 0;
                    foreach ($returnSaleInvoice as $single) {
                        foreach ($single->returnSaleInvoiceProduct as $returnedProduct) {
                            if ($returnedProduct->saleInvoiceProductId === $itemFromInput['saleInvoiceProductId']) {
                                $returnQuantity = $returnQuantity + $returnedProduct->productQuantity;
                            }
                        }
                    }

                    $saleInvoiceProduct = SaleInvoiceProduct::where('id', $itemFromInput['saleInvoiceProductId'])
                        ->where('invoiceId', $request->input('saleInvoiceId'))
                        ->value('productQuantity');

                    if (($saleInvoiceProduct - $returnQuantity) < $itemFromInput['productQuantity']) {
                        return response()->json(['error' => 'insufficient quantity for return!'], 400);
                    }

                    if ($itemFromInput['productQuantity'] == 0) { // Changed === to == to avoid strict type conflict
                        return response()->json(['error' => 'return quantity cannot be zero!'], 400);
                    }
                }
            }

            $returnableProductAmountWithDiscount = $saleInvoice->saleInvoiceProduct->map(function ($item) use ($request) {
                foreach ($request->returnSaleInvoiceProduct as $item2) {
                    if ($item->id === $item2['saleInvoiceProductId']) {
                        return takeUptoTwoDecimal(($item->productFinalAmount / $item->productQuantity) * $item2['productQuantity']);
                    }
                }
                return 0;
            });

            if ($returnableProductAmountWithDiscount->sum() == 0) {
                return response()->json(['error' => 'No product Found to refund!'], 404);
            }

            $returnableProductTax = $saleInvoice->saleInvoiceProduct->map(function ($item) use ($request) {
                foreach ($request->returnSaleInvoiceProduct as $item2) {
                    if ($item->id === $item2['saleInvoiceProductId']) {
                        return takeUptoTwoDecimal(($item->taxAmount / $item->productQuantity) * $item2['productQuantity']);
                    }
                }
                return 0;
            });

            $returnableProductPurchasePrice = $saleInvoice->saleInvoiceProduct->map(function ($item) use ($request) {
                foreach ($request->returnSaleInvoiceProduct as $item2) {
                    if ($item->id === $item2['saleInvoiceProductId']) {
                        $purchasePrice = Product::where('id', $item->productId)->value('productPurchasePrice');
                        return takeUptoTwoDecimal((float) $purchasePrice * (int) $item2['productQuantity']);
                    }
                }
                return 0;
            });

            //calculate the how many products are returned
            $totalReturnItem = 0;
            foreach ($request->returnSaleInvoiceProduct as $item) {
                $totalReturnItem += (int) $item['productQuantity'];
            }

            //now calculate the total return amount
            $totalReturnAmount = takeUptoTwoDecimal((float) $returnableProductAmountWithDiscount->sum());
            $totalReturnTax = takeUptoTwoDecimal((float) $returnableProductTax->sum());
            $totalReturnPurchasePrice = takeUptoTwoDecimal((float) $returnableProductPurchasePrice->sum());

            $totalInstantReturnAmount = 0.0;
            if ($request->has('instantReturnAmount')) {
                foreach ($request->instantReturnAmount as $amountData) {
                    $totalInstantReturnAmount += takeUptoTwoDecimal((float) $amountData['amount']);
                }
            }

            //input amount can not be greater than total return amount
            $maxReturnableLimit = takeUptoTwoDecimal($totalReturnAmount + $totalReturnTax);
            if ($totalInstantReturnAmount > $maxReturnableLimit) {
                DB::rollBack();
                return response()->json(['error' => 'Instant return amount cannot be greater than total return amount including tax!'], 400);
            }

            // convert all incoming date to a specific format.
            $date = Carbon::parse($request->input('date'))->toDateString();

            // create returnSaleInvoice method
            $createdReturnSaleInvoice = ReturnSaleInvoice::create([
                'date' => new DateTime($date),
                'totalAmount' => $totalReturnAmount,
                'instantReturnAmount' => $totalInstantReturnAmount,
                'tax' => $totalReturnTax,
                'saleInvoiceId' => $request->input('saleInvoiceId'),
                'invoiceMemoNo' => $request->input('invoiceMemoNo') ? $request->input('invoiceMemoNo') : null,
                'note' => $request->input('note'),
            ]);

            if ($createdReturnSaleInvoice) {
                foreach ($request->returnSaleInvoiceProduct as $itemFromInput) {
                    foreach ($saleInvoice->saleInvoiceProduct as $itemFromDB) {
                        if ($itemFromDB->id === $itemFromInput['saleInvoiceProductId']) {

                            $productFinalAmount = takeUptoTwoDecimal(($itemFromDB->productFinalAmount / $itemFromDB->productQuantity) * $itemFromInput['productQuantity']);
                            $taxAmount = takeUptoTwoDecimal(($itemFromDB->taxAmount / $itemFromDB->productQuantity) * $itemFromInput['productQuantity']);

                            ReturnSaleInvoiceProduct::create([
                                'invoiceId' => $createdReturnSaleInvoice->id,
                                'saleInvoiceProductId' => $itemFromDB->id,
                                'productId' => (int) $itemFromDB->productId,
                                'productQuantity' => (int) $itemFromInput['productQuantity'],
                                'productUnitSalePrice' => takeUptoTwoDecimal((float) $itemFromDB->productUnitSalePrice),
                                'productFinalAmount' => $productFinalAmount,
                                'tax' => takeUptoTwoDecimal((float) $itemFromDB->tax),
                                'taxAmount' => $taxAmount,
                            ]);
                        }
                    }
                }
            }

            // goods received on return sale transaction create
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 3,
                'creditId' => 9,
                'amount' => $totalReturnPurchasePrice, // Already rounded
                'particulars' => "Cost of sales reduce on Sale return Invoice #$createdReturnSaleInvoice->id of sale Invoice #{$request->input('saleInvoiceId')}",
                'type' => 'sale_return',
                'relatedId' => $request->input('saleInvoiceId'),
            ]);


            // transaction for account receivable of sales return
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 8,
                'creditId' => 4,
                'amount' => $totalReturnAmount, // Already rounded
                'particulars' => "Account Receivable on Sale return Invoice #$createdReturnSaleInvoice->id of sale Invoice #{$request->input('saleInvoiceId')}",
                'type' => 'sale_return',
                'relatedId' => $request->input('saleInvoiceId'),
            ]);

            // transaction for account receivable of vat return
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 15,
                'creditId' => 4,
                'amount' => $totalReturnTax, // Already rounded
                'particulars' => "Account Receivable on Sale return Invoice for tax #$createdReturnSaleInvoice->id of sale Invoice #{$request->input('saleInvoiceId')}",
                'type' => 'sale_return',
                'relatedId' => $request->input('saleInvoiceId'),
            ]);

            // if instant given any amount for return
            if ($request->has('instantReturnAmount')) {
                foreach ($request->instantReturnAmount as $amountData) {
                    if ((float) $amountData['amount'] > 0) {
                        Transaction::create([
                            'date' => new DateTime($date),
                            'debitId' => 4,
                            'creditId' => $amountData['paymentType'] ? $amountData['paymentType'] : 1,
                            'amount' => takeUptoTwoDecimal((float) $amountData['amount']),
                            'particulars' => "return amount on Sale return Invoice #$createdReturnSaleInvoice->id of sale Invoice #{$request->input('saleInvoiceId')}",
                            'type' => 'sale_return',
                            'relatedId' => $request->input('saleInvoiceId'),
                        ]);
                    }
                }
            }

            // iterate through all products of this return sale invoice and increase the product quantity
            foreach ($request->returnSaleInvoiceProduct as $itemFromInput) {
                foreach ($saleInvoice->saleInvoiceProduct as $itemFromDB) {
                    if ($itemFromDB->id === $itemFromInput['saleInvoiceProductId']) {
                        // ✅ Safe Increment
                        Product::where('id', $itemFromDB->productId)
                            ->increment('productQuantity', (int) $itemFromInput['productQuantity']);
                    }
                }
            }

            // decrease sale invoice profit by return sale invoice's calculated profit
            $returnSaleInvoiceProfit = takeUptoTwoDecimal($totalReturnAmount - $totalReturnPurchasePrice);

            // ✅ Safe Decrement
            SaleInvoice::where('id', $request->input('saleInvoiceId'))
                ->decrement('profit', $returnSaleInvoiceProfit);


            $converted = arrayKeysToCamelCase($createdReturnSaleInvoice->toArray());
            DB::commit(); // ✅ Commit the transaction
            return response()->json($converted, 201);
        } catch (Exception $err) {
            DB::rollBack(); // ✅ Rollback if anything fails
            return response()->json(['error' => 'An error occurred during create ReturnSaleInvoice.', 'details' => $err->getMessage()], 500);
        }
    }

    // get all returnSaleInvoice controller method
    public function getAllReturnSaleInvoice(Request $request): JsonResponse
    {
        if ($request->query('query') === 'info') {
            try {
                $aggregations = ReturnSaleInvoice::selectRaw('COUNT(id) as countedId, SUM(totalAmount) as totalAmount')->first();

                $result = [
                    '_count' => [
                        'id' => $aggregations->countedId ?? 0
                    ],
                    '_sum' => [
                        // ✅ Precision mapping
                        'totalAmount' => takeUptoTwoDecimal((float) ($aggregations->totalAmount ?? 0)),
                    ],
                ];

                return response()->json($result, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting ReturnSaleInvoice. Please try again later.'], 500);
            }
        } else if ($request->query('query') === 'all') {
            try {
                $allReturnSaleInvoice = ReturnSaleInvoice::with('saleInvoice.customer:id,username,email,phone,address')
                    ->orderBy('created_at', 'desc')
                    ->get();

                $converted = arrayKeysToCamelCase($allReturnSaleInvoice->toArray());
                return response()->json($converted, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting ReturnSaleInvoice. Please try again later.'], 500);
            }
        } else if ($request->query('query') === 'group') {
            try {
                $allReturnSaleInvoice = ReturnSaleInvoice::selectRaw('date as date, SUM(totalAmount) as totalAmount, COUNT(id) as idCount')
                    ->groupBy('date')
                    ->orderBy('date', 'desc')
                    ->get();

                $converted = arrayKeysToCamelCase($allReturnSaleInvoice->toArray());
                $finalResult = collect($converted)->map(function ($item) {
                    return [
                        '_sum' => [
                            // ✅ Precision mapping
                            'totalAmount' => takeUptoTwoDecimal((float) ($item['totalAmount'] ?? 0)),
                        ],
                        '_count' => [
                            'id' => $item['idCount'],
                        ],
                        'date' => $item['date'],
                    ];
                });

                return response()->json($finalResult, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting ReturnSaleInvoice. Please try again later.'], 500);
            }
        } else if ($request->query()) {
            try {
                $pagination = getPagination($request->query());

                $aggregation = ReturnSaleInvoice::where('status', $request->query('status'))
                    ->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                        return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())
                            ->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                    })
                    ->selectRaw('COUNT(id) as idCount, SUM(totalAmount) as totalAmount')
                    ->first();

                $allReturnSaleInvoice = ReturnSaleInvoice::where('status', $request->query('status'))
                    ->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                        return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())
                            ->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                    })
                    ->with('saleInvoice.customer:id,username,email,phone,address')
                    ->orderBy('created_at', 'desc')
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $aggregations = [
                    '_count' => [
                        'id' => $aggregation->idCount ?? 0,
                    ],
                    '_sum' => [
                        // ✅ Precision mapping
                        'totalAmount' => takeUptoTwoDecimal((float) ($aggregation->totalAmount ?? 0)),
                    ],
                ];

                $converted = arrayKeysToCamelCase($allReturnSaleInvoice->toArray());
                $finalResult = [
                    'aggregations' => $aggregations,
                    'allSaleInvoice' => $converted,
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $err) {
                return response()->json(['error' => 'An error occurred during getting ReturnSaleInvoice. Please try again later.'], 500);
            }
        } else {
            return response()->json(['error' => 'Invalid query parameter'], 400);
        }
    }

    // get a single returnSaleInvoice controller method
    public function getSingleReturnSaleInvoice(Request $request, $id): JsonResponse
    {
        try {
            $singleProduct = ReturnSaleInvoice::where('id', $id)
                ->with('returnSaleInvoiceProduct', 'returnSaleInvoiceProduct.product', 'saleInvoice.customer:id,username,email,phone,address')
                ->first();

            if (!$singleProduct) {
                return response()->json(['error' => 'Return Sale Invoice Not Found'], 404);
            }

            $converted = arrayKeysToCamelCase($singleProduct->toArray());
            return response()->json($converted, 200);
        } catch (Exception $err) {
            return response()->json(['error' => 'An error occurred during getting ReturnSaleInvoice. Please try again later.'], 500);
        }
    }

    // delete a single returnSaleInvoice controller method
    // on delete purchase invoice, decrease product quantity, customer due amount decrease, transaction create
    public function deleteSingleReturnSaleInvoice(Request $request, $id): JsonResponse
    {
        DB::beginTransaction(); // ✅ Added Database Transaction for safety
        try {
            // get returnSaleInvoice details
            $returnSaleInvoice = ReturnSaleInvoice::where('id', $id) // Removed (int) cast incase UUID is used
                ->with('returnSaleInvoiceProduct')
                ->first();

            if (!$returnSaleInvoice) {
                return response()->json(['error' => 'Return Sale Invoice Not Found'], 404);
            }

            // product quantity decrease
            foreach ($returnSaleInvoice->returnSaleInvoiceProduct as $item) {
                // ✅ Safe Decrement
                Product::where('id', (int) $item['productId'])
                    ->decrement('productQuantity', (int) $item['productQuantity']);
            }

            ReturnSaleInvoice::where('id', $id)->update([
                'status' => $request->input('status') ?? 'DELETED',
            ]);

            // ✅ Delete associated transactions to fix accounting mismatches
            Transaction::where('type', 'sale_return')
                ->where('relatedId', $returnSaleInvoice->saleInvoiceId)
                ->where('particulars', 'LIKE', "%return Invoice #$id%")
                ->delete();

            DB::commit(); // ✅ Commit the transaction
            return response()->json(['message' => 'Return Sale Invoice deleted successfully'], 200);
        } catch (Exception $err) {
            DB::rollBack(); // ✅ Rollback if anything fails
            return response()->json(['error' => 'An error occurred during delete ReturnSaleInvoice. Please try again later.'], 500);
        }
    }
}