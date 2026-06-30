import { createParamDecorator, ExecutionContext, InternalServerErrorException } from "@nestjs/common";
import type { Request } from "express";

export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: { organizationId?: number } }>();
  const orgId = request.user?.organizationId;
  // Fail closed : @CurrentOrg ne doit etre utilise que sur des routes protegees par
  // JwtAuthGuard, qui peuple request.user.organizationId depuis la DB. Si l org est
  // absente, on refuse plutot que de retomber silencieusement sur l organisation 1
  // (la plus sensible) — ce qui masquerait une route mal protegee.
  if (!orgId || !Number.isInteger(orgId) || orgId <= 0) {
    throw new InternalServerErrorException("Contexte d'organisation manquant.");
  }
  return orgId;
});
