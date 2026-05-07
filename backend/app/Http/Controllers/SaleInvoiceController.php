<?php

namespace App\Http\Controllers;

use DateTime;
use Exception;
use Carbon\Carbon;
use App\Models\Product;
use App\Models\SaleInvoice;
use App\Models\Transaction;
use Illuminate\Http\Request;
use App\Models\ReturnSaleInvoice;
use Illuminate\Http\JsonResponse;
use App\Models\SaleInvoiceProduct;
use Illuminate\Support\Facades\DB;

use function Laravel\Prompts\error;

class SaleInvoiceController extends Controller
{
    // create a single SaleInvoice controller method
    public function createSingleSaleInvoice(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {

            $validate = validator($request->all(), [
                'date' => 'required|date',
                'saleInvoiceProduct' => 'required|array|min:1',
                'saleInvoiceProduct.*.productId' => 'required|integer|distinct|exists:product,id',
                'saleInvoiceProduct.*.productQuantity' => 'required|integer|min:1',
                'saleInvoiceProduct.*.productUnitSalePrice' => 'required|numeric|min:0',
                'customerId' => 'required|integer|exists:customer,id',
                'userId' => 'required|integer|exists:users,id',
            ]);

            if ($validate->fails()) {
                return response()->json(['error' => $validate->errors()->first()], 400);
            }

            // Get all the product
            $allProducts = collect($request->input('saleInvoiceProduct'))->map(function ($item) {
                return Product::where('id', (int) $item['productId'])
                    ->first();
            });

            $totalDiscount = 0; // its discount amount
            $totalTax = 0; //its only total vat amount
            $totalSalePriceWithDiscount = 0;  //its total amount included discount but excluded vat

            foreach ($request->saleInvoiceProduct as $item) {
                $itemDiscount = takeUptoTwoDecimal((float) $item['productDiscount']);

                $productFinalAmount = takeUptoTwoDecimal(((int) $item['productQuantity'] * (float) $item['productUnitSalePrice']) - $itemDiscount);

                $totalDiscount = $totalDiscount + $itemDiscount;

                $taxAmount = takeUptoTwoDecimal(($productFinalAmount * (float) $item['tax']) / 100);

                $totalTax = $totalTax + $taxAmount;
                $totalSalePriceWithDiscount += $productFinalAmount;
            }
            // Check if any product is out of stock
            $requestedProducts = collect($request->input('saleInvoiceProduct'));
            $filteredProducts = $requestedProducts->filter(function ($item) use ($allProducts) {
                $product = $allProducts->firstWhere('id', $item['productId']);
                if ($product) {
                    return $item['productQuantity'] <= $product->productQuantity;
                }
                return false;
            });
            if ($filteredProducts->count() !== $requestedProducts->count()) {
                return response()->json(['error' => 'products are out of stock'], 400);
            }

            // calculate total purchase price
            $totalPurchasePrice = 0;
            foreach ($request->saleInvoiceProduct as $item) {
                $product = $allProducts->firstWhere('id', $item['productId']);
                $totalPurchasePrice += (float) $product->productPurchasePrice * (float) $item['productQuantity'];
            }

            $totalPaidAmount = 0;
            foreach ($request->paidAmount as $amountData) {
                $totalPaidAmount += $amountData['amount'];
            }

            if (round((float) $totalPaidAmount, 2) > round(((float) $totalSalePriceWithDiscount + (float) $totalTax), 2)) {
                return response()->json(['error' => 'Paid amount cannot be greater than total amount!'], 400);
            }


            // Due amount
            $due = $totalSalePriceWithDiscount + $totalTax - (float) $totalPaidAmount;


            // Convert all incoming date to a specific format
            $date = Carbon::parse($request->input('date'));
            $dueDate = $request->input('dueDate') ? Carbon::parse($request->input('dueDate')) : null;

            // Create sale invoice
            $createdInvoice = SaleInvoice::create([
                'date' => $date,
                'invoiceMemoNo' => $request->input('invoiceMemoNo') ? $request->input('invoiceMemoNo') : null,
                'totalAmount' => takeUptoTwoDecimal($totalSalePriceWithDiscount),
                'totalTaxAmount' => $totalTax ? takeUptoTwoDecimal($totalTax) : 0,
                'totalDiscountAmount' => $totalDiscount ? takeUptoTwoDecimal($totalDiscount) : 0,
                'paidAmount' => $totalPaidAmount ? takeUptoTwoDecimal((float) $totalPaidAmount) : 0,
                'profit' => takeUptoTwoDecimal($totalSalePriceWithDiscount - $totalPurchasePrice),
                'dueAmount' => $due ? takeUptoTwoDecimal($due) : 0,
                'note' => $request->input('note') ?? null,
                'address' => $request->input('address'),
                'dueDate' => $dueDate,
                'termsAndConditions' => $request->input('termsAndConditions') ?? null,
                'orderStatus' => takeUptoTwoDecimal($due) > 0 ? 'PENDING' : 'RECEIVED',
                'customerId' => $request->input('customerId'),
                'userId' => $request->input('userId'),
            ]);


            foreach ($request->saleInvoiceProduct as $item) {
                $productFinalAmount = ((int) $item['productQuantity'] * (float) $item['productUnitSalePrice']) - (float) $item['productDiscount'];

                $taxAmount = ($productFinalAmount * (float) $item['tax']) / 100;

                SaleInvoiceProduct::create([
                    'invoiceId' => $createdInvoice->id,
                    'productId' => (int) $item['productId'],
                    'productQuantity' => (int) $item['productQuantity'],
                    'productUnitSalePrice' => takeUptoTwoDecimal((float) $item['productUnitSalePrice']),
                    'productDiscount' => takeUptoTwoDecimal((float) $item['productDiscount']),
                    'productFinalAmount' => takeUptoTwoDecimal($productFinalAmount),
                    'tax' => $item['tax'],
                    'taxAmount' => takeUptoTwoDecimal($taxAmount),
                ]);
            }

            // cost of sales will be created as journal entry
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 9,
                'creditId' => 3,
                'amount' => takeUptoTwoDecimal((float) $totalPurchasePrice),
                'particulars' => "Cost of sales on Sale Invoice #$createdInvoice->id",
                'type' => 'sale',
                'relatedId' => $createdInvoice->id,
            ]);

            // transaction for account receivable of sales
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 4,
                'creditId' => 8,
                'amount' => takeUptoTwoDecimal($totalSalePriceWithDiscount),
                'particulars' => "total sale price with discount on Sale Invoice #$createdInvoice->id",
                'type' => 'sale',
                'relatedId' => $createdInvoice->id,
            ]);

            // transaction for account receivable of vat
            Transaction::create([
                'date' => new DateTime($date),
                'debitId' => 4,
                'creditId' => 15,
                'amount' => takeUptoTwoDecimal($totalTax),
                'particulars' => "Tax on Sale Invoice #$createdInvoice->id",
                'type' => 'sale',
                'relatedId' => $createdInvoice->id,
            ]);

            // new transactions will be created as journal entry for paid amount
            foreach ($request->paidAmount as $amountData) {
                if ($amountData['amount'] > 0) {
                    Transaction::create([
                        'date' => new DateTime($date),
                        'debitId' => $amountData['paymentType'] ? $amountData['paymentType'] : 1,
                        'creditId' => 4,
                        'amount' => takeUptoTwoDecimal($amountData['amount']),
                        'particulars' => "Payment receive on Sale Invoice #$createdInvoice->id",
                        'type' => 'sale',
                        'relatedId' => $createdInvoice->id,
                    ]);
                }
            }

            // iterate through all products of this sale invoice and decrease product quantity
            foreach ($request->input('saleInvoiceProduct') as $item) {
                $productId = (int) $item['productId'];
                $productQuantity = (int) $item['productQuantity'];

                Product::where('id', $productId)->update([
                    'productQuantity' => DB::raw("productQuantity - $productQuantity"),
                ]);
            }

            $converted = arrayKeysToCamelCase($createdInvoice->toArray());
            DB::commit();

            return response()->json(['createdInvoice' => $converted], 201);
        } catch (Exception $err) {
            echo $err;
            DB::rollBack();
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }

    // get all the saleInvoice controller method
    public function getAllSaleInvoice(Request $request): JsonResponse
    {
        if ($request->query('query') === 'info') {
            try {
                $aggregation = SaleInvoice::selectRaw('COUNT(id) as id, SUM(profit) as profit')
                    ->where('isHold', 'false')
                    ->first();

                // transaction of the total amount
                $totalAmount = Transaction::where('type', 'sale')
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // transaction of the paidAmount
                $totalPaidAmount = Transaction::where('type', 'sale')
                    ->where(function ($query) {
                        $query->orWhere('creditId', 4);
                    })
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // transaction of the total amount
                $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                    ->where(function ($query) {
                        $query->where('creditId', 4);
                    })
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // transaction of the total instant return
                $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->selectRaw('COUNT(id) as id, SUM(amount) as amount')
                    ->first();

                // calculation of due amount
                $totalDueAmount = (($totalAmount->amount - $totalAmountOfReturn->amount) - $totalPaidAmount->amount) + $totalInstantReturnAmount->amount;

                $result = [
                    '_count' => [
                        'id' => $aggregation->id
                    ],
                    '_sum' => [
                        'totalAmount' => takeUptoTwoDecimal($totalAmount->amount),
                        'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                        'paidAmount' => takeUptoTwoDecimal($totalPaidAmount->amount),
                        'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->amount),
                        'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->amount),
                        'profit' => takeUptoTwoDecimal($aggregation->profit),
                    ],
                ];

                return response()->json($result, 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else if ($request->query('query') === 'search') {
            try {
                $pagination = getPagination($request->query());

                $allSaleInvoice = SaleInvoice::where('id', $request->query('key'))
                    ->with('saleInvoiceProduct', 'user:id,firstName,lastName,username', 'customer:id,username')
                    ->orderBy('created_at', 'desc')
                    ->where('isHold', 'false')
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $total = SaleInvoice::where('id', $request->query('key'))
                    ->count();

                $saleInvoicesIds = $allSaleInvoice->pluck('id')->toArray();
                // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
                // transaction of the total amount
                $totalAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // transaction of the paidAmount
                $totalPaidAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->orWhere('creditId', 4);
                    })
                    ->get();

                // transaction of the total amount
                $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('creditId', 4);
                    })
                    ->get();

                // transaction of the total instant return
                $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // calculate grand total due amount
                $totalDueAmount = (($totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount')) - $totalPaidAmount->sum('amount')) + $totalInstantReturnAmount->sum('amount');


                $allSaleInvoice = $allSaleInvoice->map(function ($item) use ($totalAmount, $totalPaidAmount, $totalAmountOfReturn, $totalInstantReturnAmount) {

                    $totalAmount = $totalAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalPaid = $totalPaidAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalReturnAmount = $totalAmountOfReturn->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $instantPaidReturnAmount = $totalInstantReturnAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalDueAmount = (($totalAmount - $totalReturnAmount) - $totalPaid) + $instantPaidReturnAmount;

                    $item->totalAmount = takeUptoTwoDecimal($totalAmount);
                    $item->paidAmount = takeUptoTwoDecimal($totalPaid);
                    $item->instantPaidReturnAmount = takeUptoTwoDecimal($instantPaidReturnAmount);
                    $item->dueAmount = takeUptoTwoDecimal($totalDueAmount);
                    $item->returnAmount = takeUptoTwoDecimal($totalReturnAmount);
                    return $item;
                });

                $converted = arrayKeysToCamelCase($allSaleInvoice->toArray());
                $totaluomValue = $allSaleInvoice->sum('totaluomValue');
                $totalUnitQuantity = $allSaleInvoice->map(function ($item) {
                    return $item->saleInvoiceProduct->sum('productQuantity');
                })->sum();

                return response()->json([
                    'aggregations' => [
                        '_count' => [
                            'id' => $total,
                        ],
                        '_sum' => [
                            'totalAmount' => takeUptoTwoDecimal($totalAmount->sum('amount')),
                            'paidAmount' => takeUptoTwoDecimal($totalPaidAmount->sum('amount')),
                            'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                            'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->sum('amount')),
                            'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->sum('amount')),
                            'profit' => takeUptoTwoDecimal($allSaleInvoice->sum('profit')),
                            'totaluomValue' => $totaluomValue,
                            'totalUnitQuantity' => $totalUnitQuantity,
                        ],
                    ],
                    'getAllSaleInvoice' => $converted,
                    'totalSaleInvoice' => $total,
                ], 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else if ($request->query('query') === 'search-order') {
            try {
                $allOrder = SaleInvoice::where(function ($query) use ($request) {
                    if ($request->has('status')) {
                        $status = $request->query('status');
                        $query->where('orderStatus', 'LIKE', "%$status%");
                    }
                })
                    ->with('saleInvoiceProduct')
                    ->orderBy('created_at', 'desc')
                    ->where('isHold', 'false')
                    ->get();

                $converted = arrayKeysToCamelCase($allOrder->toArray());
                return response()->json($converted, 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else if ($request->query('query') === 'report') {
            try {
                $allOrder = SaleInvoice::with('saleInvoiceProduct', 'user:id,firstName,lastName,username', 'customer:id,username', 'saleInvoiceProduct.product:id,name')
                    ->where('isHold', 'false')
                    ->orderBy('created_at', 'desc')
                    ->when($request->query('salePersonId'), function ($query) use ($request) {
                        return $query->where('userId', $request->query('salePersonId'));
                    })
                    ->when($request->query('customerId'), function ($query) use ($request) {
                        return $query->where('customerId', $request->query('customerId'));
                    })
                    ->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                        return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())
                            ->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                    })
                    ->get();

                $saleInvoicesIds = $allOrder->pluck('id')->toArray();
                // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
                $totalAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // transaction of the paidAmount
                $totalPaidAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->orWhere('creditId', 4);
                    })
                    ->get();

                // transaction of the total amount
                $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('creditId', 4);
                    })
                    ->get();

                // transaction of the total instant return
                $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // calculate grand total due amount
                $totalDueAmount = (($totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount')) - $totalPaidAmount->sum('amount')) + $totalInstantReturnAmount->sum('amount');

                // calculate paid amount and due amount of individual sale invoice from transactions and returnSaleInvoice and attach it to saleInvoices
                $allSaleInvoice = $allOrder->map(function ($item) use ($totalAmount, $totalPaidAmount, $totalAmountOfReturn, $totalInstantReturnAmount) {

                    $totalAmount = $totalAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalPaid = $totalPaidAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalReturnAmount = $totalAmountOfReturn->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $instantPaidReturnAmount = $totalInstantReturnAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalDueAmount = (($totalAmount - $totalReturnAmount) - $totalPaid) + $instantPaidReturnAmount;

                    $item->totalAmount = takeUptoTwoDecimal($totalAmount);
                    $item->paidAmount = takeUptoTwoDecimal($totalPaid);
                    $item->instantPaidReturnAmount = takeUptoTwoDecimal($instantPaidReturnAmount);
                    $item->dueAmount = takeUptoTwoDecimal($totalDueAmount);
                    $item->returnAmount = takeUptoTwoDecimal($totalReturnAmount);
                    return $item;
                });

                $converted = arrayKeysToCamelCase($allSaleInvoice->toArray());
                $totaluomValue = $allSaleInvoice->sum('totaluomValue');
                $totalUnitQuantity = $allSaleInvoice->map(function ($item) {
                    return $item->saleInvoiceProduct->sum('productQuantity');
                })->sum();


                $counted = $allOrder->count();
                return response()->json([
                    'aggregations' => [
                        '_count' => [
                            'id' => $counted,
                        ],
                        '_sum' => [
                            'totalAmount' => takeUptoTwoDecimal($totalAmount->sum('amount')),
                            'paidAmount' => takeUptoTwoDecimal($totalPaidAmount->sum('amount')),
                            'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                            'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->sum('amount')),
                            'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->sum('amount')),
                            'profit' => takeUptoTwoDecimal($allSaleInvoice->sum('profit')),
                            'totaluomValue' => $totaluomValue,
                            'totalUnitQuantity' => $totalUnitQuantity,
                        ],
                    ],
                    'getAllSaleInvoice' => $converted,
                    'totalSaleInvoice' => $counted,
                ], 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else if ($request->query()) {
            try {
                $pagination = getPagination($request->query());

                $allOrder = SaleInvoice::with('saleInvoiceProduct', 'user:id,firstName,lastName,username', 'customer:id,username')
                    ->where('isHold', 'false')
                    ->orderBy('created_at', 'desc')
                    ->when($request->query('salePersonId'), function ($query) use ($request) {
                        return $query->whereIn('userId', explode(',', $request->query('salePersonId')));
                    })
                    ->when($request->query('orderStatus'), function ($query) use ($request) {
                        return $query->whereIn('orderStatus', explode(',', $request->query('orderStatus')));
                    })
                    ->when($request->query('customerId'), function ($query) use ($request) {
                        return $query->whereIn('customerId', explode(',', $request->query('customerId')));
                    })
                    ->when($request->query('startDate') && $request->query('endDate'), function ($query) use ($request) {
                        return $query->where('date', '>=', Carbon::createFromFormat('Y-m-d', $request->query('startDate'))->startOfDay())
                            ->where('date', '<=', Carbon::createFromFormat('Y-m-d', $request->query('endDate'))->endOfDay());
                    })
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $saleInvoicesIds = $allOrder->pluck('id')->toArray();
                // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
                $totalAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // transaction of the paidAmount
                $totalPaidAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->orWhere('creditId', 4);
                    })
                    ->get();

                // transaction of the total amount
                $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('creditId', 4);
                    })
                    ->get();

                // transaction of the total instant return
                $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // calculate grand total due amount
                $totalDueAmount = (($totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount')) - $totalPaidAmount->sum('amount')) + $totalInstantReturnAmount->sum('amount');

                // calculate paid amount and due amount of individual sale invoice from transactions and returnSaleInvoice and attach it to saleInvoices
                $allSaleInvoice = $allOrder->map(function ($item) use ($totalAmount, $totalPaidAmount, $totalAmountOfReturn, $totalInstantReturnAmount) {

                    $totalAmount = $totalAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalPaid = $totalPaidAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalReturnAmount = $totalAmountOfReturn->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $instantPaidReturnAmount = $totalInstantReturnAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalDueAmount = (($totalAmount - $totalReturnAmount) - $totalPaid) + $instantPaidReturnAmount;


                    $item->totalAmount = takeUptoTwoDecimal($totalAmount);
                    $item->paidAmount = takeUptoTwoDecimal($totalPaid);
                    $item->instantPaidReturnAmount = takeUptoTwoDecimal($instantPaidReturnAmount);
                    $item->dueAmount = takeUptoTwoDecimal($totalDueAmount);
                    $item->returnAmount = takeUptoTwoDecimal($totalReturnAmount);
                    return $item;
                });

                $converted = arrayKeysToCamelCase($allSaleInvoice->toArray());
                $totaluomValue = $allSaleInvoice->sum('totaluomValue');
                $totalUnitQuantity = $allSaleInvoice->map(function ($item) {
                    return $item->saleInvoiceProduct->sum('productQuantity');
                })->sum();

                // get total count of sale invoice
                $counted = SaleInvoice::where('isHold', 'false')
                    ->count();


                // $counted = $allOrder->count();
                return response()->json([
                    'aggregations' => [
                        '_count' => [
                            'id' => $counted,
                        ],
                        '_sum' => [
                            'totalAmount' => takeUptoTwoDecimal($totalAmount->sum('amount')),
                            'paidAmount' => takeUptoTwoDecimal($totalPaidAmount->sum('amount')),
                            'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                            'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->sum('amount')),
                            'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->sum('amount')),
                            'profit' => takeUptoTwoDecimal($allSaleInvoice->sum('profit')),
                            'totaluomValue' => $totaluomValue,
                            'totalUnitQuantity' => $totalUnitQuantity,
                        ],
                    ],
                    'getAllSaleInvoice' => $converted,
                    'totalSaleInvoice' => $counted,
                ], 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else {
            return response()->json(['error' => 'invalid query!'], 400);
        }
    }

    // get a single saleInvoice controller method
    public function getSingleSaleInvoice($id): JsonResponse
    {
        try {
            // get single Sale invoice information with products
            $singleSaleInvoice = SaleInvoice::where('id', $id)
                ->with([
                    'saleInvoiceProduct',
                    'saleInvoiceProduct' => function ($query) {
                        $query->with('product')->orderBy('id', 'desc');
                    },
                    'customer:id,username,address,phone,email',
                    'user:id,firstName,lastName,username'
                ])
                ->where('isHold', 'false')
                ->first();

            if (!$singleSaleInvoice) {
                return response()->json(['error' => 'This invoice not Found'], 400);
            }


            // transaction of the total amount
            $totalAmount = Transaction::where('type', 'sale')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->where('debitId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // transaction of the paidAmount
            $totalPaidAmount = Transaction::where('type', 'sale')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->orWhere('creditId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // transaction of the total amount
            $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->where('creditId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // transaction of the total instant return
            $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->where('debitId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // calculation of due amount
            $totalDueAmount = (($totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount')) - $totalPaidAmount->sum('amount')) + $totalInstantReturnAmount->sum('amount');

            // get all transactions related to this sale invoice
            $transactions = Transaction::where('relatedId', $id)
                ->where(function ($query) {
                    $query->orWhere('type', 'sale')
                        ->orWhere('type', 'sale_return');
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();

            // get totalReturnAmount of saleInvoice
            $returnSaleInvoice = ReturnSaleInvoice::where('saleInvoiceId', $id)
                ->with('returnSaleInvoiceProduct', 'returnSaleInvoiceProduct.product')
                ->orderBy('id', 'desc')
                ->get();

            $status = 'UNPAID';
            if ($totalDueAmount <= 0.0) {
                $status = "PAID";
            }

            // calculate total uomValue
            $totaluomValue = $singleSaleInvoice->saleInvoiceProduct->reduce(function ($acc, $item) {
                return $acc + (int) $item->product->uomValue * $item->productQuantity;
            }, 0);


            $convertedSingleSaleInvoice = arrayKeysToCamelCase($singleSaleInvoice->toArray());
            $convertedReturnSaleInvoice = arrayKeysToCamelCase($returnSaleInvoice->toArray());
            $convertedTransactions = arrayKeysToCamelCase($transactions->toArray());

            $finalResult = [
                'status' => $status,
                'totalAmount' => takeUptoTwoDecimal($totalAmount->sum('amount')),
                'totalPaidAmount' => takeUptoTwoDecimal($totalPaidAmount->sum('amount')),
                'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->sum('amount')),
                'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->sum('amount')),
                'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                'totaluomValue' => $totaluomValue,
                'singleSaleInvoice' => $convertedSingleSaleInvoice,
                'returnSaleInvoice' => $convertedReturnSaleInvoice,
                'transactions' => $convertedTransactions,
            ];

            return response()->json($finalResult, 200);
        } catch (Exception $err) {
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }

    // update saleInvoice controller method
    public function updateSaleStatus(Request $request): JsonResponse
    {
        try {

            $saleInvoice = SaleInvoice::where('id', $request->input('invoiceId'))->first();

            if (!$saleInvoice) {
                return response()->json(['error' => 'SaleInvoice not Found!'], 404);
            }

            $saleInvoice->update([
                'orderStatus' => $request->input('orderStatus'),
            ]);

            return response()->json(['message' => 'Sale Invoice updated successfully!'], 200);
        } catch (Exception $err) {
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }

    // get all the saleInvoice controller method
    public function getAllSaleInvoiceByCustomer(Request $request): JsonResponse
    {

        $data = $request->attributes->get('data');

        if ($data['role'] != 'customer' || !$data['sub']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }


        if ($request->query()) {
            try {

                $customerId = $data['sub'];
                $pagination = getPagination($request->query());

                $allOrder = SaleInvoice::with('saleInvoiceProduct.product', 'customer:id,username')
                    ->where('customerId', $customerId)
                    ->where('isHold', 'false')
                    ->orderBy('created_at', 'desc')
                    ->when($request->query('orderStatus'), function ($query) use ($request) {
                        return $query->whereIn('orderStatus', explode(',', $request->query('orderStatus')));
                    })
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $totalOrder = SaleInvoice::with('saleInvoiceProduct', 'customer:id,username')
                    ->where('customerId', $customerId)
                    ->where('isHold', 'false')
                    ->orderBy('created_at', 'desc')
                    ->when($request->query('orderStatus'), function ($query) use ($request) {
                        return $query->whereIn('orderStatus', explode(',', $request->query('orderStatus')));
                    })
                    ->count();

                $saleInvoicesIds = $allOrder->pluck('id')->toArray();
                // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
                $totalAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4)
                            ->where('creditId', 8);
                    })
                    ->get();

                // transaction of the paidAmount
                $totalPaidAmount = Transaction::where('type', 'sale')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->orWhere('creditId', 4);
                    })
                    ->get();

                // transaction of the total amount
                $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('creditId', 4);
                    })
                    ->get();

                // transaction of the total instant return
                $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                    ->whereIn('relatedId', $saleInvoicesIds)
                    ->where(function ($query) {
                        $query->where('debitId', 4);
                    })
                    ->get();

                // calculate paid amount and due amount of individual sale invoice from transactions and returnSaleInvoice and attach it to saleInvoices
                $allSaleInvoice = $allOrder->map(function ($item) use ($totalAmount, $totalPaidAmount, $totalAmountOfReturn, $totalInstantReturnAmount) {

                    $totalAmount = $totalAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalPaid = $totalPaidAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalReturnAmount = $totalAmountOfReturn->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->creditId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $instantPaidReturnAmount = $totalInstantReturnAmount->filter(function ($trans) use ($item) {
                        return ($trans->relatedId === $item->id && $trans->type === 'sale_return' && $trans->debitId === 4);
                    })->reduce(function ($acc, $current) {
                        return $acc + $current->amount;
                    }, 0);

                    $totalDueAmount = (($totalAmount - $totalReturnAmount) - $totalPaid) + $instantPaidReturnAmount;


                    $item->paidAmount = takeUptoTwoDecimal($totalPaid);
                    $item->instantPaidReturnAmount = takeUptoTwoDecimal($instantPaidReturnAmount);
                    $item->dueAmount = takeUptoTwoDecimal($totalDueAmount);
                    $item->returnAmount = takeUptoTwoDecimal($totalReturnAmount);
                    return $item;
                });

                $converted = arrayKeysToCamelCase($allSaleInvoice->toArray());

                return response()->json([
                    'getAllSaleInvoice' => $converted,
                    'totalSaleInvoice' => $totalOrder,
                ], 200);
            } catch (Exception $err) {
                return response()->json(['error' => $err->getMessage()], 500);
            }
        } else {
            return response()->json(['error' => 'invalid query!'], 400);
        }
    }
    // get a single saleInvoice controller method
    public function getSingleSaleInvoiceForCustomer(Request $request, $id): JsonResponse
    {
        try {

            $data = $request->attributes->get('data');

            if ($data['role'] != 'customer' || !$data['sub']) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            // get single Sale invoice information with products
            $singleSaleInvoice = SaleInvoice::where('id', $id)
                ->where('customerId', $data['sub'])
                ->with([
                    'saleInvoiceProduct',
                    'saleInvoiceProduct' => function ($query) {
                        $query->with('product')->orderBy('id', 'desc');
                    },
                    'customer:id,username,address,phone,email',
                    'user:id,firstName,lastName,username'
                ])
                ->where('isHold', 'false')
                ->first();

            if (!$singleSaleInvoice) {
                return response()->json(['error' => 'This invoice not Found'], 400);
            }


            // transaction of the total amount
            $totalAmount = Transaction::where('type', 'sale')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->where('debitId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // transaction of the paidAmount
            $totalPaidAmount = Transaction::where('type', 'sale')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->orWhere('creditId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // transaction of the total amount
            $totalAmountOfReturn = Transaction::where('type', 'sale_return')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->where('creditId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // transaction of the total instant return
            $totalInstantReturnAmount = Transaction::where('type', 'sale_return')
                ->where('relatedId', $id)
                ->where(function ($query) {
                    $query->where('debitId', 4);
                })
                ->with('debit:id,name', 'credit:id,name')
                ->get();

            // calculation of due amount
            $totalDueAmount = (($totalAmount->sum('amount') - $totalAmountOfReturn->sum('amount')) - $totalPaidAmount->sum('amount')) + $totalInstantReturnAmount->sum('amount');

            // get all transactions related to this sale invoice
            $transactions = Transaction::where('relatedId', $id)
                ->where(function ($query) {
                    $query->orWhere('type', 'sale')
                        ->orWhere('type', 'sale_return');
                })
                ->with('debit:id,name', 'credit:id,name')
                ->orderBy('id', 'desc')
                ->get();

            // get totalReturnAmount of saleInvoice
            $returnSaleInvoice = ReturnSaleInvoice::where('saleInvoiceId', $id)
                ->with('returnSaleInvoiceProduct', 'returnSaleInvoiceProduct.product')
                ->orderBy('id', 'desc')
                ->get();

            $status = 'UNPAID';
            if ($totalDueAmount <= 0.0) {
                $status = "PAID";
            }

            // calculate total uomValue
            $totaluomValue = $singleSaleInvoice->saleInvoiceProduct->reduce(function ($acc, $item) {
                return $acc + (int) $item->product->uomValue * $item->productQuantity;
            }, 0);


            $convertedSingleSaleInvoice = arrayKeysToCamelCase($singleSaleInvoice->toArray());
            $convertedReturnSaleInvoice = arrayKeysToCamelCase($returnSaleInvoice->toArray());
            $convertedTransactions = arrayKeysToCamelCase($transactions->toArray());

            $finalResult = [
                'status' => $status,
                'totalAmount' => takeUptoTwoDecimal($totalAmount->sum('amount')),
                'totalPaidAmount' => takeUptoTwoDecimal($totalPaidAmount->sum('amount')),
                'totalReturnAmount' => takeUptoTwoDecimal($totalAmountOfReturn->sum('amount')),
                'instantPaidReturnAmount' => takeUptoTwoDecimal($totalInstantReturnAmount->sum('amount')),
                'dueAmount' => takeUptoTwoDecimal($totalDueAmount),
                'totaluomValue' => $totaluomValue,
                'singleSaleInvoice' => $convertedSingleSaleInvoice,
                'returnSaleInvoice' => $convertedReturnSaleInvoice,
                'transactions' => $convertedTransactions,
            ];

            return response()->json($finalResult, 200);
        } catch (Exception $err) {
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }
}
