import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

// Portee espece FarmOS (RBAC par espece, Phase 2) injectee par FarmosSpeciesGuard.
// "all"  = role transverse / aucune affectation restrictive -> voit toutes les especes.
// string[] = liste des especes affectees a l utilisateur (farmos_species_managers).
export type FarmosSpeciesScope = "all" | string[];

// Renvoie la portee espece de l utilisateur courant. A n utiliser que sur des
// routes protegees par JwtAuthGuard + FarmosSpeciesGuard, qui peuplent
// request.farmosSpeciesScope. Fail-open : si absent, on renvoie "all" (pas de
// filtre) pour ne pas casser l existant tant que les affectations ne sont pas
// posees — le cloisonnement strict viendra quand le guard sera generalise.
export const CurrentFarmosSpecies = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FarmosSpeciesScope => {
    const request = ctx.switchToHttp().getRequest<Request & { farmosSpeciesScope?: FarmosSpeciesScope }>();
    return request.farmosSpeciesScope ?? "all";
  },
);
