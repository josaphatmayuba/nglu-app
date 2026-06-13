import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

// Returns the authenticated user's role id (req.user.roleId).
// Falls back to 0 when no role is bound to the request — callers should treat
// 0 as "no privileged role" (e.g. cannot view reversed ledger entries).
export const CurrentRoleId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: { roleId?: number } }>();
  return request.user?.roleId ?? 0;
});
