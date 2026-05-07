<?php

namespace App\Http\Controllers;

use DateTime;
use Exception;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use App\Models\{Users, Education, SalaryHistory, DesignationHistory};
use Firebase\JWT\JWT;
use Illuminate\Http\{Request, JsonResponse};
use Illuminate\Support\Facades\{DB, Hash, Cookie};

class UsersController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        try {
            $user = Users::where('username', $request->input('username'))->with('role:id,name')->first();

            if (!$user) {
                return response()->json(['error' => 'username or password is incorrect'], 401);
            }

            $pass = Hash::check($request->input('password'), $user->password);

            if (!$pass) {
                return response()->json(['error' => 'username or password is incorrect'], 401);
            }

            $token = [
                "sub" => $user->id,
                "roleId" => $user['role']['id'],
                "role" => $user['role']['name'],
                "exp" => time() + (60 * 60 * 6)
            ];

            $refreshToken = [
                "sub" => $user->id,
                "role" => $user['role']['name'],
                "exp" => time() + 86400 * 30
            ];

            $refreshJwt = JWT::encode($refreshToken, env('REFRESH_SECRET'), 'HS384');
            $jwt = JWT::encode($token, env('JWT_SECRET'), 'HS256');

            $cookie = Cookie::make('refreshToken', $refreshJwt, 60 * 24 * 30)->withPath('/')->withHttpOnly()->withSameSite('None')->withSecure();

            $userWithoutPassword = $user->toArray();

            $userWithoutPassword['role'] = $user['role']['name'];
            $userWithoutPassword['token'] = $jwt;

            $user->refreshToken = $refreshJwt;
            $user->isLogin = 'true';
            $user->save();
            unset($userWithoutPassword['password']);
            $converted = arrayKeysToCamelCase($userWithoutPassword);
            return response()->json($converted, 200)->withCookie($cookie);

        } catch (Exception $error) {
            return response()->json([
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $user = Users::findOrFail($request->id);
            $user->isLogin = 'false';
            $user->save();
            $cookie = Cookie::forget('refreshToken');

            return response()->json(['message' => 'Logout successfully'], 200)->withCookie($cookie);
        } catch (Exception $error) {
            return response()->json([
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function register(Request $request): JsonResponse
    {
        DB::beginTransaction();
        try {
            $request->validate([
                'username' => 'required|string|unique:users',
                'email' => 'nullable|email|unique:users',
                'password' => 'required|string',
            ]);

           
            $userData = $request->all();

            $joinDate = new DateTime($request->input('joinDate'));
            $leaveDate = $request->input('leaveDate') ? new DateTime($request->input('leaveDate')) : null;

            $hash = Hash::make($request->input('password'));

            $createUser = Users::create([
                'firstName' => $request->input('firstName'),
                'lastName' => $request->input('lastName'),
                'username' => $request->input('username'),
                'password' => $hash,
                'roleId' => $request->input('roleId'),
                'email' => $request->input('email') ?? null,
                'street' => $request->input('street') ?? null,
                'city' => $request->input('city') ?? null,
                'state' => $request->input('state') ?? null,
                'zipCode' => $request->input('zipCode') ?? null,
                'country' => $request->input('country') ?? null,
                'joinDate' => $joinDate->format('Y-m-d H:i:s') ?? null,
                'leaveDate' => $leaveDate?->format('Y-m-d H:i:s') ?? null,
                'employeeId' => $request->input('employeeId') ?? null,
                'phone' => $request->input('phone') ?? null,
                'bloodGroup' => $request->input('bloodGroup') ?? null,
                'image' => $request->input('image') ?? null,
                'designationId' => $request->input('designationId') ?? null,
                'employmentStatusId' => $request->input('employmentStatusId') ?? null,
                'departmentId' => $request->input('departmentId') ?? null,
                'shiftId' => $request->input('shiftId') ?? null,
            ]);

            if (isset($userData['designationId'])) {
                $this->createDesignationHistory($createUser->id, $userData);
            }
            if (isset($userData['salaryStartDate'])) {
                $this->createSalaryHistory($createUser->id, $userData);
            }
            if (isset($userData['education'])) {
                $this->createEducation($createUser->id, $userData);
            }

            unset($createUser['password']);
            $converted = arrayKeysToCamelCase($createUser->toArray());
            DB::commit();
            return response()->json($converted, 201);
        } catch (Exception $error) {
            DB::rollBack();
            return response()->json([
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    private function createDesignationHistory($userId, $userData): JsonResponse
    {
        try {
            $designationStartDate = Carbon::parse($userData['designationStartDate']);
            $designationEndDate = isset($userData['designationEndDate']) ? Carbon::parse($userData['designationEndDate']) : null;

            DesignationHistory::create([
                'userId' => $userId,
                'designationId' => $userData['designationId'],
                'startDate' => $designationStartDate->format('Y-m-d H:i:s'),
                'endDate' => optional($designationEndDate)->format('Y-m-d H:i:s'),
                'comment' => $userData['comment'] ?? null,
            ]);
            DB::commit();
            return response()->json(['message' => 'Designation created successfully']);
        } catch (Exception $error) {
            DB::rollback();
            return response()->json(['error' => $error->getMessage()], 400);
        }
    }

    private function createSalaryHistory($userId, $userData): JsonResponse
    {
        try {
            $salaryStartDate = Carbon::parse($userData['salaryStartDate']);
            $salaryEndDate = isset($userData['salaryEndDate']) ? Carbon::parse($userData['salaryEndDate']) : null;
            SalaryHistory::create([
                'userId' => $userId,
                'salary' => $userData['salary'],
                'startDate' => $salaryStartDate->format('Y-m-d H:i:s'),
                'endDate' => optional($salaryEndDate)->format('Y-m-d H:i:s'),
                'comment' => $userData['salaryComment'] ?? null,
            ]);
            DB::commit();
            return response()->json(['message' => 'SalaryHistory created successfully']);
        } catch (Exception $error) {
            DB::rollback();
            return response()->json(['error' => $error->getMessage()], 400);
        }
    }

    private function createEducation($userId, $userData): JsonResponse
    {
        try {
            $educationData = collect($userData['education'])->map(function ($education) use ($userId) {
                $startDate = new DateTime($education['studyStartDate']);
                $endDate = isset($education['studyEndDate']) ? new DateTime($education['studyEndDate']) : null;

                return [
                    'userId' => $userId,
                    'degree' => $education['degree'],
                    'institution' => $education['institution'],
                    'fieldOfStudy' => $education['fieldOfStudy'],
                    'result' => $education['result'],
                    'studyStartDate' => $startDate->format('Y-m-d H:i:s'),
                    'studyEndDate' => optional($endDate)->format('Y-m-d H:i:s'),
                ];
            });

            Education::insert($educationData->toArray());
            DB::commit();
            return response()->json(['message' => 'Education created successfully']);
        } catch (Exception $error) {
            DB::rollback();
            return response()->json(['error' => $error->getMessage()], 400);
        }
    }

    // get all the user controller method
    public function getAllUser(Request $request): JsonResponse
    {
        if ($request->query('query') === 'all') {
            try {
                $allUser = Users::orderBy('id', "desc")
                    ->where('status', 'true')
                    ->with('saleInvoice')
                    ->get();

                $filteredUsers = $allUser->map(function ($u) {
                    return $u->makeHidden('password')->toArray();
                });

                $converted = arrayKeysToCamelCase($filteredUsers->toArray());

                //unset isLogin
                $converted = array_map(function ($user) {
                    unset($user['isLogin']);
                    return $user;
                }, $converted);
                $finalResult = [
                    'getAllUser' => $converted,
                    'totalUser' => count($converted)
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $error) {
                return response()->json([
                    'error' => $error->getMessage(),
                ], 500);
            }
        } elseif ($request->query('query') === 'search') {
            try {
                $pagination = getPagination($request->query());
                $key = trim($request->query('key'));

                $allUser = Users::where(function ($query) use ($key) {
                    return $query->orWhere('id', 'LIKE', '%' . $key . '%')
                        ->orWhere('username', 'LIKE', '%' . $key . '%')
                        ->orWhere('firstName', 'LIKE', '%' . $key . '%')
                        ->orWhere('lastName', 'LIKE', '%' . $key . '%');
                })
                    ->where('status', 'true')
                    ->with('saleInvoice')
                    ->orderBy('id', "desc")
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $allUserCount = Users::where(function ($query) use ($key) {
                    return $query->where('id', 'LIKE', '%' . $key . '%')
                        ->orWhere('username', 'LIKE', '%' . $key . '%')
                        ->orWhere('firstName', 'LIKE', '%' . $key . '%')
                        ->orWhere('lastName', 'LIKE', '%' . $key . '%');
                })
                    ->where('status', 'true')
                    ->count();

                $filteredUsers = $allUser->map(function ($u) {
                    return $u->makeHidden('password')->toArray();
                });

                $converted = arrayKeysToCamelCase($filteredUsers->toArray());

                //unset isLogin
                $converted = array_map(function ($user) {
                    unset($user['isLogin']);
                    return $user;
                }, $converted);
                $finalResult = [
                    'getAllUser' => $converted,
                    'totalUser' => $allUserCount,
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $error) {
                return response()->json([
                    'error' => $error->getMessage(),
                ], 500);
            }
        } elseif ($request->query()) {
            try {
                $pagination = getPagination($request->query());

                $allUser = Users::with('role:id,name')
                    ->when($request->query('status'), function ($query) use ($request) {
                        return $query->whereIn('status', explode(',', $request->query('status')));
                    })
                    ->when($request->query('roleId'), function ($query) use ($request) {
                        return $query->whereIn('roleId', explode(',', $request->query('roleId')));
                    })
                    ->orderBy('id', "desc")
                    ->skip($pagination['skip'])
                    ->take($pagination['limit'])
                    ->get();

                $totalUser = Users::when($request->query('status'), function ($query) use ($request) {
                    return $query->whereIn('status', explode(',', $request->query('status')));
                })->count();

                $converted = arrayKeysToCamelCase($allUser->toArray());

                $finalResult = [
                    'getAllUser' => $converted,
                    'totalUser' => $totalUser,
                ];

                return response()->json($finalResult, 200);
            } catch (Exception $error) {
                return response()->json([
                    'error' => $error->getMessage(),
                ], 500);
            }
        } else {
            return response()->json(['error' => 'Invalid query!'], 400);
        }
    }

    // get a single user controller method
    public function getSingleUser(Request $request): JsonResponse
    {
        try {
            $data = $request->attributes->get("data");

            if ($data['sub'] !== (int) $request['id'] && $data['role'] !== 'super-admin' && $data['role'] !== 'admin') {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $singleUser = Users::where('id', $request['id'])
                ->with('saleInvoice', 'employmentStatus', 'shift', 'education', 'awardHistory.award', 'salaryHistory', 'designationHistory.designation', 'quote', 'role', 'department')
                ->first();

            if (!$singleUser) {
                return response()->json(['error' => 'User not found!'], 404);
            }

            $userWithoutPassword = $singleUser->toArray();
            unset($userWithoutPassword['password']);
            unset($userWithoutPassword['isLogin']);

            $converted = arrayKeysToCamelCase($userWithoutPassword);
            return response()->json($converted, 200);
        } catch (Exception $error) {
            return response()->json([
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function updateSingleUser(Request $request, $id): JsonResponse
    {
        try {
            $updateData = $request->all();

            // ✅ Fix: Only format dates if they are provided
            if ($request->has('joinDate') && $request->input('joinDate') !== null) {
                $updateData['joinDate'] = (new DateTime($request->input('joinDate')))->format('Y-m-d H:i:s');
            }
            if ($request->has('leaveDate') && $request->input('leaveDate') !== null) {
                $updateData['leaveDate'] = (new DateTime($request->input('leaveDate')))->format('Y-m-d H:i:s');
            }

            if ($request->input('password')) {
                $updateData['password'] = Hash::make($request->input('password'));
            } else {
                unset($updateData['password']);
            }

            $user = Users::findOrFail((int) $id);

            if (!$user) {
                return response()->json(['error' => 'User not found!'], 404);
            }

            $user->update($updateData);

            $userWithoutPassword = $user->toArray();
            unset($userWithoutPassword['password']);
            unset($userWithoutPassword['isLogin']);

            $converted = arrayKeysToCamelCase($userWithoutPassword);
            return response()->json($converted, 200);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'User not found!'], 404);
        } catch (Exception $error) {
            return response()->json([
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function deleteUser(Request $request, $id): JsonResponse
    {
        try {
            //update the status
            $user = Users::findOrFail($id);

            if (!$user) {
                return response()->json(['error' => 'User not found!'], 404);
            }

            $user->status = $request->input('status');
            $user->save();

            return response()->json(['message' => 'User deleted successfully'], 200);
        } catch (Exception $error) {
            return response()->json([
                'error' => $error->getMessage(),
            ], 500);
        }
    }
}