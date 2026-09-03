import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { realEstatePropertyAssignments } from "../../database/schema";
import type { Database } from "../../database/types";
import type { DomusPropertyScope } from "../decorators/domus-property-scope.decorator";

// Peuple request.domusPropertyScope pour les routes Domus (RBAC par bien,
// Phase 2). A placer APRES JwtAuthGuard (il lit request.user).
//
// Regle (identique au RBAC par espece FarmOS) :
//  - role transverse (departmentScope === "all") -> "all" (voit tous les biens)
//  - sinon : biens affectes dans real_estate_property_assignments (is_active=1)
//  - aucune affectation -> "all" (FAIL-OPEN : tant qu aucun bien n est affecte,
//    on ne cloisonne pas, pour ne pas masquer des donnees existantes).
@Injectable()
export class DomusPropertyGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { sub?: number; organizationId?: number; departmentScope?: number | string | null }
      | undefined;

    let scope: DomusPropertyScope = "all";

    if (user?.sub && user.departmentScope !== "all") {
      const rows = await this.db
        .select({ propertyId: realEstatePropertyAssignments.propertyId })
        .from(realEstatePropertyAssignments)
        .where(
          and(
            eq(realEstatePropertyAssignments.userId, user.sub),
            eq(realEstatePropertyAssignments.isActive, 1),
          ),
        );

      if (rows.length) {
        scope = rows.map((r) => r.propertyId);
      }
    }

    request.domusPropertyScope = scope;
    return true;
  }
}
