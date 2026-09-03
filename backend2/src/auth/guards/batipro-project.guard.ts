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
//
// DURCISSEMENT Phase 4 (accès client externe) : le fail-open ci-dessus est
// dangereux pour un CLIENT (accès externe). On restreint donc UNIQUEMENT les
// users portant un rôle "client BatiPro" : sans affectation ils voient `[]`
// (rien), jamais "all". Les rôles INTERNES gardent strictement le comportement
// historique (rétrocompat totale). Le rôle est détecté par son nom (jamais
// depuis le token, qui est réputé non fiable) — cf. jwt-auth.guard.
const BATIPRO_CLIENT_ROLES = new Set(["client_batipro", "Client BatiPro", "Client BâtiPro"]);

@Injectable()
export class BatiproProjectGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { sub?: number; organizationId?: number; departmentScope?: number | string | null; role?: string | null }
      | undefined;

    // Rôle client externe = jamais fail-open. Sinon comportement interne inchangé.
    const isClient = BATIPRO_CLIENT_ROLES.has(user?.role ?? "");

    let scope: BatiproProjectScope = isClient ? [] : "all";

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
      // Pas d'affectation : interne -> reste "all" (fail-open historique),
      // client -> reste [] (aucun accès). Aucune régression pour l'existant.
    }

    request.batiproProjectScope = scope;
    return true;
  }
}
