import { scopeAllowsUser, type UserScopeContext } from "./scope-guard";
import type { DataUpdateScope } from "./data-update-event";

function user(permissions: string[], opts: Partial<UserScopeContext> = {}): UserScopeContext {
  return { userId: 1, roleId: 1, permissions: new Set(permissions), ...opts };
}

function scope(opts: Partial<DataUpdateScope> = {}): DataUpdateScope {
  return { module: "propertyManagement", ...opts };
}

describe("scopeAllowsUser", () => {
  it("allows user who has at least one required permission", () => {
    expect(
      scopeAllowsUser(scope(), ["readAll-propertyManagement", "create-propertyManagement"], user(["readAll-propertyManagement"])),
    ).toBe(true);
  });

  it("denies user with no required permissions", () => {
    expect(
      scopeAllowsUser(scope(), ["readAll-propertyManagement"], user(["readAll-dashboard"])),
    ).toBe(false);
  });

  it("denies user with empty permissions set", () => {
    expect(scopeAllowsUser(scope(), ["readAll-propertyManagement"], user([]))).toBe(false);
  });

  it("allows when requiredPermissions list contains a permission the user has", () => {
    expect(
      scopeAllowsUser(scope(), ["write-x", "read-x"], user(["read-x"])),
    ).toBe(true);
  });

  it("allows user with permission on a per_property scope (V1: permission-only)", () => {
    expect(
      scopeAllowsUser(
        scope({ propertyId: 5 }),
        ["readAll-propertyManagement"],
        user(["readAll-propertyManagement"]),
      ),
    ).toBe(true);
  });

  it("denies user without permission even on per_property scope", () => {
    expect(
      scopeAllowsUser(scope({ propertyId: 5 }), ["readAll-propertyManagement"], user(["other"])),
    ).toBe(false);
  });

  it("allows global scope (no propertyId) with correct permission", () => {
    expect(
      scopeAllowsUser(scope(), ["read-x"], user(["read-x"])),
    ).toBe(true);
  });

  it("works with a large permissions set", () => {
    const perms = Array.from({ length: 50 }, (_, i) => `perm-${i}`);
    expect(
      scopeAllowsUser(scope(), ["perm-25"], user(perms)),
    ).toBe(true);
  });
});
