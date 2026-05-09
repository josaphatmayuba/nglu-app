<?php

namespace App\Http\Controllers;

use App\Models\TransactionType;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionTypeController extends Controller
{
    //get all transaction types
    public function getAllTransactionType(Request $request): JsonResponse
    {
        try {
            $transactionTypes = TransactionType::with('debitAccount', 'creditAccount')->where('is_active', true)->get();
            $converted = arrayKeysToCamelCase($transactionTypes->toArray());
            return response()->json($converted, 200);
        } catch (Exception $error) {
            return response()->json(['error' => 'An error occurred during fetching transaction types. Please try again later.'], 500);
        }
    }

    //create transaction type
    public function createTransactionType(Request $request): JsonResponse
    {
        try {
            $createdTransactionType = TransactionType::create([
                'name' => $request->input('name'),
                'debit_account_id' => $request->input('debitAccountId'),
                'credit_account_id' => $request->input('creditAccountId'),
                'description' => $request->input('description'),
                'is_active' => $request->input('isActive', true),
            ]);
            $createdTransactionType->load('debitAccount', 'creditAccount');
            $converted = arrayKeysToCamelCase($createdTransactionType->toArray());
            return response()->json($converted, 201);
        } catch (Exception $error) {
            return response()->json(['error' => 'An error occurred during create transaction type. Please try again later.'], 500);
        }
    }

    //get single transaction type
    public function getSingleTransactionType($id): JsonResponse
    {
        try {
            $transactionType = TransactionType::with('debitAccount', 'creditAccount')->findOrFail($id);
            $converted = arrayKeysToCamelCase($transactionType->toArray());
            return response()->json($converted, 200);
        } catch (Exception $error) {
            return response()->json(['error' => 'Transaction type not found.'], 404);
        }
    }

    //update transaction type
    public function updateTransactionType(Request $request, $id): JsonResponse
    {
        try {
            $transactionType = TransactionType::findOrFail($id);
            $transactionType->update([
                'name' => $request->input('name', $transactionType->name),
                'debit_account_id' => $request->input('debitAccountId', $transactionType->debit_account_id),
                'credit_account_id' => $request->input('creditAccountId', $transactionType->credit_account_id),
                'description' => $request->input('description', $transactionType->description),
                'is_active' => $request->input('isActive', $transactionType->is_active),
            ]);
            $transactionType->load('debitAccount', 'creditAccount');
            $converted = arrayKeysToCamelCase($transactionType->toArray());
            return response()->json($converted, 200);
        } catch (Exception $error) {
            return response()->json(['error' => 'An error occurred during update transaction type. Please try again later.'], 500);
        }
    }

    //delete transaction type
    public function deleteTransactionType($id): JsonResponse
    {
        try {
            $transactionType = TransactionType::findOrFail($id);
            $transactionType->delete();
            return response()->json(['message' => 'Transaction type deleted successfully.'], 200);
        } catch (Exception $error) {
            return response()->json(['error' => 'An error occurred during delete transaction type. Please try again later.'], 500);
        }
    }
}