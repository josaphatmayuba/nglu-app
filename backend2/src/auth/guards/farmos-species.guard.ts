import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { farmosSpeciesAssignments } from "../../database/schema";
import type { Database } from "../../database/types";
import type { FarmosSpeciesScope } from "../decorators/farmos-species-scope.decorator";

// Peuple request.farmosSpeciesScope pour les routes FarmOS (RBAC par espece,
// Phase 2). A placer APRES JwtAuthGuard (il lit request.user).
//
// Regle :
//  - role transverse (departmentScope === "all") -> "all" (voit toutes especes)
//  - sinon : especes affectees dans farmos_species_assignments (is_active=1)
//  - aucune affectation -> "all" (FAIL-OPEN volontaire : tant que les
//    affectations ne sont pas posees, on ne cloisonne pas, pour ne pas
//    masquer des donnees existantes). Le passage en fail-closed sera un choix
//    explicite une fois les gestionnaires affectes.
@Injectable()
export class FarmosSpeciesGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { sub?: number; organizationId?: number; departmentScope?: number | string | null }
      | undefined;

    let scope: FarmosSpeciesScope = "all";

    if (user?.sub && user.departmentScope !== "all") {
      const rows = await this.db
        .select({ species: farmosSpeciesAssignments.species })
        .from(farmosSpeciesAssignments)
        .where(
          and(
            eq(farmosSpeciesAssignments.userId, user.sub),
            eq(farmosSpeciesAssignments.isActive, 1),
          ),
        );

      // Affectations presentes -> on cloisonne ; aucune -> fail-open ("all").
      if (rows.length) {
        scope = rows.map((r) => r.species);
      }
    }

    request.farmosSpeciesScope = scope;
    return true;
  }
}
