import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

// P4 multi-tenant : reserve une route au proprietaire de la plateforme.
// S appuie sur request.user.isSuperOwner, calcule en DB par JwtAuthGuard (jamais
// depuis le token) — donc fiable. A utiliser APRES JwtAuthGuard.
//   @UseGuards(JwtAuthGuard, SuperOwnerGuard)
@Injectable()
export class SuperOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { sub?: number; isSuperOwner?: boolean } }>();
    const user = request.user;
    if (!user?.sub) {
      throw new UnauthorizedException("Authentification requise.");
    }
    if (!user.isSuperOwner) {
      throw new ForbiddenException("Reserve au proprietaire de la plateforme.");
    }
    return true;
  }
}
