import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

// Portee bien Domus (RBAC par bien, Phase 2) injectee par DomusPropertyGuard.
// "all"   = role transverse / aucune affectation restrictive -> voit tous les biens.
// number[] = liste des property_id affectes a l utilisateur
//            (real_estate_property_assignments).
export type DomusPropertyScope = "all" | number[];

// Renvoie la portee bien de l utilisateur courant. A n utiliser que sur des
// routes protegees par JwtAuthGuard + DomusPropertyGuard. Fail-open : si absent,
// "all" (pas de filtre) pour ne pas casser l existant tant que les affectations
// ne sont pas posees.
export const CurrentDomusProperty = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DomusPropertyScope => {
    const request = ctx.switchToHttp().getRequest<Request & { domusPropertyScope?: DomusPropertyScope }>();
    return request.domusPropertyScope ?? "all";
  },
);
