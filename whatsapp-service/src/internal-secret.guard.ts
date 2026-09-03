import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

// Service prive appele uniquement par backend2 en HTTP interne (pas de notion
// d'utilisateur/JWT ici) : un simple secret partage suffit.
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.WHATSAPP_SERVICE_SECRET;
    if (!expected) {
      throw new UnauthorizedException("WHATSAPP_SERVICE_SECRET non configure.");
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers["x-internal-secret"];
    if (provided !== expected) {
      throw new UnauthorizedException("Secret interne invalide.");
    }
    return true;
  }
}
