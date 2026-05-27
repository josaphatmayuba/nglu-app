# SCRUM-15 Security Validation — Keep security server-side

**Date:** 2026-05-27  
**Ticket:** SCRUM-15 (RISK-4)  
**Status:** ✅ Guards Added  

## Changes Made

### Property Management Controller
Added `@Permissions()` decorators to all sensitive operations:

| Route | Method | Permission | Status |
|-------|--------|-----------|--------|
| /properties | POST | create-propertyManagement | ✅ Added |
| /properties/:id | PUT/PATCH | update-propertyManagement | ✅ Added |
| /properties/:id | DELETE | delete-propertyManagement | ✅ Existing |
| /units | POST | create-propertyManagement | ✅ Added |
| /units/:id | PUT/PATCH | update-propertyManagement | ✅ Added |
| /units/:id | DELETE | delete-propertyManagement | ✅ Existing |
| /leases | POST | create-propertyManagement | ✅ Added |
| /leases/:id | PUT/PATCH | update-propertyManagement | ✅ Added |
| /leases/:id | DELETE | delete-propertyManagement | ✅ Added |
| /payments | POST | create-propertyManagement | ✅ Added |
| /contracts/:id | DELETE | delete-propertyManagement | ✅ Added |

## Security Principle

**PermissionsGuard behavior:**
- If `@Permissions()` is NOT present → no extra check (BUG)
- If `@Permissions()` IS present → user must have at least one permission (FIXED)

**Files modified:**
- `backend2/src/property-management/property-management.controller.ts`

## Validation Steps

### Step 1: Build verification
```bash
cd backend2
npm run build
# Should complete without errors
```

### Step 2: Unit test verification
```bash
npm test -- property-management.controller.spec.ts
```

### Step 3: Manual integration test
1. Login with demo account: `demo` / `5555`
2. Note the JWT token
3. Test a sensitive route with permission:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     -X POST https://dev.ongdngolu.org/api/property-management/properties \
     -H "Content-Type: application/json" \
     -d '{"name":"Test"}'
   # Expected: 201 Created or 400 Bad Request (validation)
   ```

4. Test with a role WITHOUT permission:
   - Create a test role without `create-propertyManagement`
   - Login with that role
   - Try POST /properties
   - Expected: 403 Forbidden

### Step 4: Verify PermissionsGuard
- PermissionsGuard (line 42): ✅ Only checks if `@Permissions()` exists
- Line 55: ✅ Verifies at least one permission is granted
- Super-admin bypass (line 53): ✅ Works as designed

## Risk Assessment

### Pre-fix risks:
- ❌ N/A permissions on POST/PUT/DELETE operations
- ❌ Any authenticated user could create/update/delete properties, units, leases, payments, contracts
- Severity: **CRITICAL**

### Post-fix status:
- ✅ All sensitive operations now require explicit permissions
- ✅ Backend always validates server-side
- ✅ React/frontend permission hiding is just UX (not security)

## Implementation Notes

- **Frontend permissions:** Still work as UX helper (hide buttons for unpermitted users)
- **Backend enforcement:** Now required for all sensitive operations
- **No breaking changes:** Existing super-admin role (is_system=1) bypasses all checks
- **Cache:** PermissionsGuard caches roles for 30s to reduce DB load

## Next Steps

1. Deploy to dev environment
2. Test in browser with demo account
3. Commit to develop branch
4. Update CHANGELOG
5. Move Jira ticket to Done
