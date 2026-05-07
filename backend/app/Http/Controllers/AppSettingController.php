<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AppSettingController extends Controller
{
    //get single app setting
    public function getSingleAppSetting(): JsonResponse
    {
        try {
            $getSingleAppSetting = AppSetting::with('currency')->where('id', 1)->first();

            $currentAppUrl = url('/');
            $getSingleAppSetting->logo = $getSingleAppSetting->logo ? "$currentAppUrl/files/$getSingleAppSetting->logo" : null;

            $converted = arrayKeysToCamelCase($getSingleAppSetting->toArray());
            return response()->json($converted, 200);
        } catch (Exception $error) {
            return response()->json(['error' => 'An error occurred during getting app setting. Please try again later.'], 500);
        }
    }

    //update app setting
    public function updateAppSetting(Request $request): JsonResponse
    {
        try {
            //if logo is not empty then update the logo file. if is empty then update other fields but not replace the logo file.
            if ($request->hasFile('images')) {
                $file_paths = $request->file_paths;
                $appSetting = AppSetting::where('id', 1)->first();
                $appSetting->update([
                    'companyName' => $request->companyName ?? $appSetting->companyName,
                    'dashboardType' => $request->dashboardType ?? $appSetting->dashboardType,
                    'tagLine' => $request->tagLine ?? $appSetting->tagLine,
                    'address' => $request->address ?? $appSetting->address,
                    'phone' => $request->phone ?? $appSetting->phone,
                    'email' => $request->email ?? $appSetting->email,
                    'website' => $request->website ?? $appSetting->website,
                    'footer' => $request->footer ?? $appSetting->footer,
                    'currencyId' => (int) $request->input('currencyId') ? (int) $request->input('currencyId') : $appSetting->currencyId,
                    'logo' => $file_paths[0] ?? $appSetting->logo,
                    'isPos' => $request->has('isPos') ? $request->input('isPos') : $appSetting->isPos,
                    'isDiscount' => $request->has('isDiscount') ? $request->input('isDiscount') : $appSetting->isDiscount,  // New field
                    'isTax' => $request->has('isTax') ? $request->input('isTax') : $appSetting->isTax,                    // New field
                ]);
                $converted = arrayKeysToCamelCase($appSetting->toArray());
                return response()->json($converted, 200);
            }

            $appSetting = AppSetting::where('id', 1)->first();
            $logoPath = $request->clearLogo == 'true' ? null : $appSetting->logo;
            $appSetting->update([
                'companyName' => $request->companyName ?? $appSetting->companyName,
                'dashboardType' => $request->dashboardType ?? $appSetting->dashboardType,
                'tagLine' => $request->tagLine ?? $appSetting->tagLine,
                'address' => $request->address ?? $appSetting->address,
                'phone' => $request->phone ?? $appSetting->phone,
                'email' => $request->email ?? $appSetting->email,
                'website' => $request->website ?? $appSetting->website,
                'footer' => $request->footer ?? $appSetting->footer,
                'currencyId' => (int) $request->input('currencyId') ? (int) $request->input('currencyId') : $appSetting->currencyId,
                'isPos' => $request->has('isPos') ? $request->input('isPos') : $appSetting->isPos,
                'isDiscount' => $request->has('isDiscount') ? $request->input('isDiscount') : $appSetting->isDiscount,  // New field
                'isTax' => $request->has('isTax') ? $request->input('isTax') : $appSetting->isTax,                    // New field
                'logo' => $logoPath
            ]);
            $converted = arrayKeysToCamelCase($appSetting->toArray());
            return response()->json($converted, 200);
        } catch (Exception $error) {
            return response()->json(['error' => 'An error occurred during updating app setting. Please try again later.'], 500);
        }
    }
}
