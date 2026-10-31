import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UsersService } from "./users.service";

// Mock Drizzle minimal : chaque select() consomme le resultat suivant de la file.
function makeDb(queue: unknown[][]) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    select: () => {
      const res = queue.shift() ?? [];
      const b: Record<string, unknown> = {};
      for (const k of ["from", "where", "innerJoin", "leftJoin"]) b[k] = () => b;
      b.limit = () => Promise.resolve(res);
      b.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(res).then(ok, ko);
      return b;
    },
    update: () => ({
      set: (data: Record<string, unknown>) => {
        updates.push(data);
        return { where: () => Promise.resolve() };
      },
    }),
  };
  return { db, updates };
}

function makeService(queue: unknown[][]) {
  const { db, updates } = makeDb(queue);
  const service = new UsersService(
    db as never,
    { publishPermissionsUpdated: jest.fn() } as never,
    { log: jest.fn() } as never,
    {} as never,
  );
  jest.spyOn(service, "findOne").mockResolvedValue({} as never);
  return { service, updates };
}

const ORG = 7;
const target = [{ id: 10, roleId: 3 }];
const plainRole = [{ name: "salesman", isSystem: 0, organizationId: ORG }];

describe("UsersService — droits sur les utilisateurs", () => {
  it("refuse de modifier un autre utilisateur sans update-user", async () => {
    const { service } = makeService([target, plainRole, []]);
    await expect(service.update(10, { firstName: "X" }, ORG, {}, { sub: 99, roleId: 5 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("son propre profil : les champs sensibles (roleId, status) sont ignores", async () => {
    const { service, updates } = makeService([target, plainRole, []]);
    await service.update(10, { firstName: "Jo", roleId: 1, status: "true" }, ORG, {}, { sub: 10, roleId: 3 });
    expect(updates[0]).toMatchObject({ firstName: "Jo" });
    expect(updates[0]).not.toHaveProperty("roleId");
    expect(updates[0]).not.toHaveProperty("status");
  });

  it("refuse un role d une autre organisation", async () => {
    const admin = [{ name: "admin", isSystem: 0, organizationId: ORG }];
    const { service } = makeService([target, admin, [{ name: "update-user" }], []]);
    await expect(service.update(10, { roleId: 1 }, ORG, {}, { sub: 2, roleId: 4 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuse d attribuer super_owner sans etre super_owner", async () => {
    const admin = [{ name: "admin", isSystem: 0, organizationId: ORG }];
    const { service } = makeService([target, admin, [{ name: "update-user" }], [{ id: 50, name: "super_owner" }]]);
    await expect(service.update(10, { roleId: 50 }, ORG, {}, { sub: 2, roleId: 4 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("accepte un role de la meme organisation", async () => {
    const admin = [{ name: "admin", isSystem: 0, organizationId: ORG }];
    const { service, updates } = makeService([target, admin, [{ name: "update-user" }], [{ id: 8, name: "manager" }]]);
    await service.update(10, { roleId: 8 }, ORG, {}, { sub: 2, roleId: 4 });
    expect(updates[0]).toMatchObject({ roleId: 8 });
  });
});
