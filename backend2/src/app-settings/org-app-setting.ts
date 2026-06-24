import { and, desc, eq, sql } from "drizzle-orm";
import { appSettings } from "../database/schema";
import type { Database } from "../database/types";

// Multi-tenant : resout la ligne appSetting de l'organisation courante, avec
// FALLBACK sur l'org #1 si l'org n'a pas (encore) sa propre ligne. Garantit que
// la resolution devise/societe/prefixes ne renvoie jamais null pour une org
// existante (retrocompatible : tout l'historique vit sur org #1).
//
// On selectionne les colonnes demandees ; `orderBy` place la ligne de l'org en
// tete (organization_id = orgId d'abord), la ligne org #1 ensuite => `limit(1)`
// prend la ligne de l'org si elle existe, sinon celle d'org #1.

const ORG_OR_FALLBACK = (orgId: number) =>
  sql`(${appSettings.organizationId} = ${orgId} OR ${appSettings.organizationId} = 1)`;

/**
 * Lit la ligne appSetting de l'org (fallback org #1). `columns` = projection
 * Drizzle (ex: { currencyId: appSettings.currencyId }). Renvoie la 1re ligne ou
 * undefined si aucune des deux n'existe.
 */
export async function readOrgAppSetting<T extends Record<string, unknown>>(
  db: Database,
  orgId: number,
  columns: T,
): Promise<{ [K in keyof T]: unknown } | undefined> {
  const rows = await db
    .select(columns as any)
    .from(appSettings)
    .where(ORG_OR_FALLBACK(orgId))
    // org courante en premier (1 quand match), puis org #1
    .orderBy(desc(sql`(${appSettings.organizationId} = ${orgId})`), eq(appSettings.organizationId, 1))
    .limit(1);
  return rows[0] as any;
}
