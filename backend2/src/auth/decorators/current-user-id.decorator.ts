import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

// Returns the authenticated user's id (req.user.id).
// Falls back to 0 when no user is bound to the request — callers should never
// rely on that value, it just keeps types narrow for the decorator.
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: { id?: number } }>();
  return request.user?.id ?? 0;
});
