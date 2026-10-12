import { and, eq, or, sql } from "drizzle-orm";
import { realEstateLeaseCotenants, realEstateLeases } from "../database/schema";

/**
 * Condition "ce client a acces a ce bail" : locataire principal du bail OU
 * colocataire ACTIF (soft delete is_active=0 = acces perdu). Toujours scopee
 * a l'organisation. Un bail a 1 locataire se comporte comme avant.
 * A utiliser dans une requete dont la table principale/jointe est realEstateLeases.
 */
export function leaseAccessibleBy(customerId: number, orgId: number) {
  return and(
    eq(realEstateLeases.organizationId, orgId),
    or(
      eq(realEstateLeases.tenantId, customerId),
      sql`EXISTS (SELECT 1 FROM ${realEstateLeaseCotenants} WHERE ${realEstateLeaseCotenants.leaseId} = ${realEstateLeases.id} AND ${realEstateLeaseCotenants.customerId} = ${customerId} AND ${realEstateLeaseCotenants.organizationId} = ${orgId} AND ${realEstateLeaseCotenants.isActive} = 1)`,
    ),
  )!;
}
