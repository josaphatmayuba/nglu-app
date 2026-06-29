import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { MfaService } from "./mfa.service";
import { PasswordResetService } from "./password-reset.service";
import { PermissionsGuard } from "./guards/permissions.guard";
import { WsAuthService } from "./ws-auth.service";

@Global()
@Module({
  imports: [DatabaseModule, JwtModule.register({}), AuditModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard, PasswordResetService, MfaService, WsAuthService],
  exports: [JwtModule, JwtAuthGuard, PermissionsGuard, WsAuthService],
})
export class AuthModule {}
