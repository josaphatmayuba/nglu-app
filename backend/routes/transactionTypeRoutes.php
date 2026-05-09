<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TransactionTypeController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('permission:create-transactionType')->post('/', [TransactionTypeController::class, 'createTransactionType']);

Route::middleware('permission:readAll-transactionType')->get('/', [TransactionTypeController::class, 'getAllTransactionType']);

Route::middleware('permission:readSingle-transactionType')->get('/{id}', [TransactionTypeController::class, 'getSingleTransactionType']);

Route::middleware('permission:update-transactionType')->put('/{id}', [TransactionTypeController::class, 'updateTransactionType']);

Route::middleware('permission:delete-transactionType')->patch('/{id}', [TransactionTypeController::class, 'deleteTransactionType']);