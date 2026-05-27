import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: { organizationId?: number } }>();
  return request.user?.organizationId ?? 1;
});
