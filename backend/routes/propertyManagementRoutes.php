<?php

use App\Http\Controllers\PropertyManagementController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:readAll-propertyManagement')->get('/dashboard', [PropertyManagementController::class, 'dashboard']);
Route::middleware('permission:readAll-propertyManagement')->get('/tenants', [PropertyManagementController::class, 'getTenants']);

Route::middleware('permission:readAll-propertyManagement')->get('/properties', [PropertyManagementController::class, 'getProperties']);
Route::middleware('permission:create-propertyManagement')->post('/properties', [PropertyManagementController::class, 'createProperty']);
Route::middleware('permission:update-propertyManagement')->put('/properties/{id}', [PropertyManagementController::class, 'updateProperty']);
Route::middleware('permission:delete-propertyManagement')->delete('/properties/{id}', [PropertyManagementController::class, 'deleteProperty']);

Route::middleware('permission:readAll-propertyManagement')->get('/units', [PropertyManagementController::class, 'getUnits']);
Route::middleware('permission:create-propertyManagement')->post('/units', [PropertyManagementController::class, 'createUnit']);
Route::middleware('permission:update-propertyManagement')->put('/units/{id}', [PropertyManagementController::class, 'updateUnit']);
Route::middleware('permission:delete-propertyManagement')->delete('/units/{id}', [PropertyManagementController::class, 'deleteUnit']);

Route::middleware('permission:readAll-propertyManagement')->get('/leases', [PropertyManagementController::class, 'getLeases']);
Route::middleware('permission:create-propertyManagement')->post('/leases', [PropertyManagementController::class, 'createLease']);
Route::middleware('permission:update-propertyManagement')->put('/leases/{id}', [PropertyManagementController::class, 'updateLease']);
Route::middleware('permission:delete-propertyManagement')->delete('/leases/{id}', [PropertyManagementController::class, 'deleteLease']);

Route::middleware('permission:readAll-propertyManagement')->get('/payments', [PropertyManagementController::class, 'getPayments']);
Route::middleware('permission:create-propertyManagement')->post('/payments', [PropertyManagementController::class, 'createPayment']);

Route::middleware('permission:readAll-propertyManagement')->get('/maintenance', [PropertyManagementController::class, 'getMaintenance']);
Route::middleware('permission:create-propertyManagement')->post('/maintenance', [PropertyManagementController::class, 'createMaintenance']);
Route::middleware('permission:update-propertyManagement')->put('/maintenance/{id}', [PropertyManagementController::class, 'updateMaintenance']);
Route::middleware('permission:delete-propertyManagement')->delete('/maintenance/{id}', [PropertyManagementController::class, 'deleteMaintenance']);
