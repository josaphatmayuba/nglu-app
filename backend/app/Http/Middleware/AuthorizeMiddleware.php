<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use App\Models\Role;
use App\Models\RolePermission;
use Closure;
use Exception;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Foundation\Auth\User;
use Illuminate\Http\Request;
use PhpParser\Builder\Use_;
use Symfony\Component\HttpFoundation\Response;

class AuthorizeMiddleware
{
    public function handle(Request $request, Closure $next, $permissions)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'message' => 'Token not provided',
            ], Response::HTTP_UNAUTHORIZED);
        }
        try {

            $secret = env('JWT_SECRET');
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $decoded_array = (array)$decoded;
            if($decoded_array['role'] === 'customer'){
                $customer = Customer::find($decoded_array['sub']);
                if($customer->isLogin == 'false'){
                    return response()->json([
                        'error' => 'Unauthorized',
                    ], Response::HTTP_UNAUTHORIZED);
                }
            }
            if($decoded_array['role'] === 'admin'){
                $user = User::find($decoded_array['sub']);
                if($user->isLogin == 'false'){
                    return response()->json([
                        'error' => 'Unauthorized',
                    ], Response::HTTP_UNAUTHORIZED);
                }
            }
            $roleId = $decoded_array['roleId'];
            $role = Role::with('rolePermission')->find($roleId);
            $rolePermission = $role->rolePermission;
            $user_permissions = [];
            foreach ($rolePermission as $permission) {
                $user_permissions[] = $permission->permission->name;
            }
            if (strlen($permissions) && !in_array($permissions, $user_permissions)) {
                return response()->json([
                    'error' => 'Unauthorized',
                ], Response::HTTP_UNAUTHORIZED);
            }
            $request->attributes->set('data', $decoded_array);
            return $next($request);

        } catch (BeforeValidException $e) {
            return response()->json([
                'error' => 'Invalid token',
            ], Response::HTTP_FORBIDDEN);
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Token expired',
            ], Response::HTTP_UNAUTHORIZED);
        }
    }
}
