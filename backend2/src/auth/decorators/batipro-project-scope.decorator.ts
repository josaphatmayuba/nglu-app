import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

// Portee chantier BatiPro (RBAC par chantier, Phase 2) injectee par
// BatiproProjectGuard.
// "all"    = role transverse / aucune affectation restrictive -> voit tous les chantiers.
// number[] = liste des project_id affectes a l utilisateur
//            (batipro_project_assignments).
export type BatiproProjectScope = "all" | number[];

// Renvoie la portee chantier de l utilisateur courant. A n utiliser que sur des
// routes protegees par JwtAuthGuard + BatiproProjectGuard. Fail-open : si absent,
// "all" (pas de filtre) pour ne pas casser l existant tant que les affectations
// ne sont pas posees.
export const CurrentBatiproProject = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BatiproProjectScope => {
    const request = ctx.switchToHttp().getRequest<Request & { batiproProjectScope?: BatiproProjectScope }>();
    return request.batiproProjectScope ?? "all";
  },
);
