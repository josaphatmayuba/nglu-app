<?php

namespace App\Http\Controllers;

use App\Models\RealEstateLease;
use App\Models\RealEstateMaintenanceRequest;
use App\Models\RealEstateProperty;
use App\Models\RealEstateRentPayment;
use App\Models\RealEstateUnit;
use App\Models\Transaction;
use App\Models\TransactionType;
use App\Models\Customer;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PropertyManagementController extends Controller
{
    public function dashboard(): JsonResponse
    {
        try {
            $activeLeases = RealEstateLease::where('status', 'active')->with('payments')->get();
            $monthlyRent = $activeLeases->sum('rent_amount');
            $collected = RealEstateRentPayment::sum('amount');

            $data = [
                'properties' => RealEstateProperty::count(),
                'units' => RealEstateUnit::count(),
                'vacantUnits' => RealEstateUnit::where('status', 'vacant')->count(),
                'occupiedUnits' => RealEstateUnit::where('status', 'occupied')->count(),
                'activeLeases' => $activeLeases->count(),
                'monthlyRent' => $monthlyRent,
                'collectedRent' => $collected,
                'openMaintenance' => RealEstateMaintenanceRequest::whereIn('status', ['open', 'in_progress'])->count(),
            ];

            return response()->json(arrayKeysToCamelCase($data), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during property dashboard fetch.'], 500);
        }
    }

    public function getTenants(): JsonResponse
    {
        try {
            $tenants = Customer::where('status', 'true')
                ->select('id', 'username', 'firstName', 'lastName', 'email', 'phone', 'address')
                ->orderBy('id', 'desc')
                ->get();

            return response()->json(arrayKeysToCamelCase($tenants->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during tenant fetch.'], 500);
        }
    }

    public function getProperties(): JsonResponse
    {
        try {
            $properties = RealEstateProperty::with('units')->orderBy('id', 'desc')->get();
            return response()->json(arrayKeysToCamelCase($properties->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during property fetch.'], 500);
        }
    }

    public function createProperty(Request $request): JsonResponse
    {
        try {
            $property = RealEstateProperty::create($request->all());
            return response()->json(arrayKeysToCamelCase($property->toArray()), 201);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during property create.'], 500);
        }
    }

    public function updateProperty(Request $request, $id): JsonResponse
    {
        try {
            $property = RealEstateProperty::findOrFail($id);
            $property->update($request->all());
            return response()->json(arrayKeysToCamelCase($property->fresh('units')->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during property update.'], 500);
        }
    }

    public function deleteProperty($id): JsonResponse
    {
        try {
            RealEstateProperty::findOrFail($id)->delete();
            return response()->json(['message' => 'Property deleted successfully.'], 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during property delete.'], 500);
        }
    }

    public function getUnits(): JsonResponse
    {
        try {
            $units = RealEstateUnit::with('property')->orderBy('id', 'desc')->get();
            return response()->json(arrayKeysToCamelCase($units->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during unit fetch.'], 500);
        }
    }

    public function createUnit(Request $request): JsonResponse
    {
        try {
            $unit = RealEstateUnit::create($request->all());
            return response()->json(arrayKeysToCamelCase($unit->load('property')->toArray()), 201);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during unit create.'], 500);
        }
    }

    public function updateUnit(Request $request, $id): JsonResponse
    {
        try {
            $unit = RealEstateUnit::findOrFail($id);
            $unit->update($request->all());
            return response()->json(arrayKeysToCamelCase($unit->fresh('property')->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during unit update.'], 500);
        }
    }

    public function deleteUnit($id): JsonResponse
    {
        try {
            RealEstateUnit::findOrFail($id)->delete();
            return response()->json(['message' => 'Unit deleted successfully.'], 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during unit delete.'], 500);
        }
    }

    public function getLeases(): JsonResponse
    {
        try {
            $leases = RealEstateLease::with('property', 'unit', 'tenant', 'payments.transaction')
                ->orderBy('id', 'desc')
                ->get();
            return response()->json(arrayKeysToCamelCase($leases->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during lease fetch.'], 500);
        }
    }

    public function createLease(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $reference = $request->input('reference') ?: 'LEASE-' . now()->format('YmdHis');
            $lease = RealEstateLease::create([
                ...$request->all(),
                'reference' => $reference,
            ]);

            if ($lease->status === 'active') {
                RealEstateUnit::where('id', $lease->unit_id)->update(['status' => 'occupied']);
            }

            DB::commit();
            return response()->json(arrayKeysToCamelCase($lease->load('property', 'unit', 'tenant')->toArray()), 201);
        } catch (Exception) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during lease create.'], 500);
        }
    }

    public function updateLease(Request $request, $id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $lease = RealEstateLease::findOrFail($id);
            $oldUnitId = $lease->unit_id;
            $lease->update($request->all());

            if ($oldUnitId !== $lease->unit_id) {
                RealEstateUnit::where('id', $oldUnitId)->update(['status' => 'vacant']);
            }

            if ($lease->status === 'active') {
                RealEstateUnit::where('id', $lease->unit_id)->update(['status' => 'occupied']);
            } elseif (in_array($lease->status, ['ended', 'cancelled'])) {
                RealEstateUnit::where('id', $lease->unit_id)->update(['status' => 'vacant']);
            }

            DB::commit();
            return response()->json(arrayKeysToCamelCase($lease->fresh('property', 'unit', 'tenant', 'payments')->toArray()), 200);
        } catch (Exception) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during lease update.'], 500);
        }
    }

    public function deleteLease($id): JsonResponse
    {
        DB::beginTransaction();
        try {
            $lease = RealEstateLease::findOrFail($id);
            RealEstateUnit::where('id', $lease->unit_id)->update(['status' => 'vacant']);
            $lease->delete();
            DB::commit();
            return response()->json(['message' => 'Lease deleted successfully.'], 200);
        } catch (Exception) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during lease delete.'], 500);
        }
    }

    public function getPayments(): JsonResponse
    {
        try {
            $payments = RealEstateRentPayment::with('lease.property', 'lease.unit', 'lease.tenant', 'transaction.debit', 'transaction.credit')
                ->orderBy('id', 'desc')
                ->get();
            return response()->json(arrayKeysToCamelCase($payments->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during rent payment fetch.'], 500);
        }
    }

    public function createPayment(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $lease = RealEstateLease::with('property', 'unit', 'tenant')->findOrFail($request->input('leaseId'));
            $transactionType = TransactionType::where('name', 'Rent Payment')->first();

            if (!$transactionType) {
                return response()->json(['error' => 'Rent Payment transaction type is missing.'], 400);
            }

            $paymentDate = Carbon::parse($request->input('paymentDate'))->format('Y-m-d H:i:s');
            $amount = (float) $request->input('amount');
            $particulars = $request->input('notes') ?: 'Payment for rent';

            $transaction = Transaction::create([
                'date' => $paymentDate,
                'debitId' => $request->input('paymentAccountId') ?: $transactionType->debit_account_id,
                'creditId' => $transactionType->credit_account_id,
                'particulars' => $particulars,
                'amount' => takeUptoThreeDecimal($amount),
                'type' => 'rent_payment',
                'relatedId' => $lease->id,
                'status' => 'true',
            ]);

            $payment = RealEstateRentPayment::create([
                'lease_id' => $lease->id,
                'transaction_id' => $transaction->id,
                'payment_date' => Carbon::parse($request->input('paymentDate'))->format('Y-m-d'),
                'amount' => $amount,
                'method' => $request->input('method', 'cash'),
                'reference' => $request->input('reference'),
                'notes' => $particulars,
            ]);

            DB::commit();
            return response()->json(arrayKeysToCamelCase($payment->load('lease.property', 'lease.unit', 'lease.tenant', 'transaction.debit', 'transaction.credit')->toArray()), 201);
        } catch (Exception) {
            DB::rollBack();
            return response()->json(['error' => 'An error occurred during rent payment create.'], 500);
        }
    }

    public function getMaintenance(): JsonResponse
    {
        try {
            $requests = RealEstateMaintenanceRequest::with('property', 'unit')->orderBy('id', 'desc')->get();
            return response()->json(arrayKeysToCamelCase($requests->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during maintenance fetch.'], 500);
        }
    }

    public function createMaintenance(Request $request): JsonResponse
    {
        try {
            $maintenance = RealEstateMaintenanceRequest::create($request->all());
            return response()->json(arrayKeysToCamelCase($maintenance->load('property', 'unit')->toArray()), 201);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during maintenance create.'], 500);
        }
    }

    public function updateMaintenance(Request $request, $id): JsonResponse
    {
        try {
            $maintenance = RealEstateMaintenanceRequest::findOrFail($id);
            $maintenance->update($request->all());
            return response()->json(arrayKeysToCamelCase($maintenance->fresh('property', 'unit')->toArray()), 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during maintenance update.'], 500);
        }
    }

    public function deleteMaintenance($id): JsonResponse
    {
        try {
            RealEstateMaintenanceRequest::findOrFail($id)->delete();
            return response()->json(['message' => 'Maintenance request deleted successfully.'], 200);
        } catch (Exception) {
            return response()->json(['error' => 'An error occurred during maintenance delete.'], 500);
        }
    }
}
