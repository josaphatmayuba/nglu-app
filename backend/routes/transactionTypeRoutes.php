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

Route::middleware('permission:create-transaction')->post('/', [TransactionTypeController::class, 'createTransactionType']);

Route::middleware('permission:readAll-transaction')->get('/', [TransactionTypeController::class, 'getAllTransactionType']);

Route::middleware('permission:readSingle-transaction')->get('/{id}', [TransactionTypeController::class, 'getSingleTransactionType']);

Route::middleware('permission:update-transaction')->put('/{id}', [TransactionTypeController::class, 'updateTransactionType']);

Route::middleware('permission:delete-transaction')->patch('/{id}', [TransactionTypeController::class, 'deleteTransactionType']);