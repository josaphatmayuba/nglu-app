import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { batiproProjectAssignments } from "../../database/schema";
import type { Database } from "../../database/types";
import type { BatiproProjectScope } from "../decorators/batipro-project-scope.decorator";

// Peuple request.batiproProjectScope pour les routes BatiPro (RBAC par chantier,
// Phase 2). A placer APRES JwtAuthGuard (il lit request.user).
//
// Regle (identique au RBAC par espece FarmOS / par bien Domus) :
//  - role transverse (departmentScope === "all") -> "all" (voit tous les chantiers)
//  - sinon : chantiers affectes dans batipro_project_assignments (is_active=1)
//  - aucune affectation -> "all" (FAIL-OPEN : tant qu aucun chantier n est
//    affecte, on ne cloisonne pas, pour ne pas masquer des donnees existantes).
@Injectable()
export class BatiproProjectGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { sub?: number; organizationId?: number; departmentScope?: number | string | null }
      | undefined;

    let scope: BatiproProjectScope = "all";

    if (user?.sub && user.departmentScope !== "all") {
      const rows = await this.db
        .select({ projectId: batiproProjectAssignments.projectId })
        .from(batiproProjectAssignments)
        .where(
          and(
            eq(batiproProjectAssignments.userId, user.sub),
            eq(batiproProjectAssignments.isActive, 1),
          ),
        );

      if (rows.length) {
        scope = rows.map((r) => r.projectId);
      }
    }

    request.batiproProjectScope = scope;
    return true;
  }
}
