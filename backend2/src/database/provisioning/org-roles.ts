import { and, eq, sql } from "drizzle-orm";
import { rolePermissions, roles } from "../schema";
import type { Database } from "../types";

// Organisation modele : ses roles + permissions servent de jeu par defaut copie
// a la creation de chaque nouvelle organisation (Phase 0 multi-tenant).
export const TEMPLATE_ORG_ID = 1;

// Copie le jeu de roles (status=true) + leurs permissions de l org modele vers
// une nouvelle org. Idempotent par org cible : ne copie un role que s il n y
// existe pas deja (par nom). Renvoie l id du role « admin » de la nouvelle org
// (ou null si absent du modele). A appeler dans la meme transaction que la
// creation de l org.
export async function cloneRolesForOrg(
  tx: Database,
  toOrgId: number,
  fromOrgId: number = TEMPLATE_ORG_ID,
): Promise<number | null> {
  const templateRoles = await tx
    .select({ id: roles.id, name: roles.name, isSystem: roles.isSystem })
    .from(roles)
    .where(and(eq(roles.organizationId, fromOrgId), eq(roles.status, "true")));

  const existing = await tx
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.organizationId, toOrgId));
  const existingByName = new Map(existing.map((r) => [r.name, r.id]));

  let adminRoleId: number | null = existingByName.get("admin") ?? null;

  for (const tpl of templateRoles) {
    let newRoleId = existingByName.get(tpl.name) ?? null;

    if (newRoleId === null) {
      const [res] = await tx.insert(roles).values({
        organizationId: toOrgId,
        name: tpl.name,
        status: "true",
        isSystem: tpl.isSystem,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any);
      newRoleId = Number((res as any).insertId);

      const tplPerms = await tx
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, tpl.id));
      if (tplPerms.length) {
        await tx.insert(rolePermissions).values(
          tplPerms.map((p) => ({
            organizationId: toOrgId,
            roleId: newRoleId as number,
            permissionId: p.permissionId,
            createdAt: sql`CURRENT_TIMESTAMP`,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })),
        );
      }
    }

    if (tpl.name === "admin") adminRoleId = newRoleId;
  }

  return adminRoleId;
}
