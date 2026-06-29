import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { MfaService } from "./mfa.service";
import { PasswordResetService } from "./password-reset.service";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches } from "class-validator";

class MfaLoginDto {
  @IsString() @IsNotEmpty() mfaToken: string;
  @IsString() @IsNotEmpty() code: string;
  useRecovery?: boolean;
}

class GoogleLoginDto {
  @IsString() @IsNotEmpty() credential: string;
}

class MfaVerifyDto {
  @IsString() @IsNotEmpty() code: string;
}

class MfaDisableDto {
  @IsString() @IsNotEmpty() password: string;
  @IsString() @IsNotEmpty() code: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() @IsNotEmpty() token: string;
  @IsString() @IsNotEmpty()
  @MinLength(12, { message: "Le mot de passe doit contenir au moins 12 caractères." })
  @MaxLength(64, { message: "Le mot de passe ne peut pas dépasser 64 caractères." })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, { message: "Le mot de passe doit contenir au moins une lettre et un chiffre." })
  newPassword: string;
}

// SCRUM-121: shared cookie options so login / mfa / refresh stay in sync.
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "none" as const,
  secure: true,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @ApiOperation({ summary: "Login" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "username or password is incorrect" })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    const loginResult = await this.authService.login(body, ctx);
    if ("requireMfa" in loginResult) {
      return loginResult;
    }

    const { refreshToken, user, role, token } = loginResult;

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);

    return { ...user, role, token };
  }

  @ApiOperation({ summary: "Login with Google identity token" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Google account is invalid or not linked to an Avelomi user" })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post("google/login")
  @HttpCode(200)
  async googleLogin(@Body() body: GoogleLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    const loginResult = await this.authService.loginWithGoogle(body.credential, ctx);
    if ("requireMfa" in loginResult) {
      return loginResult;
    }

    const { refreshToken, user, role, token } = loginResult;
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
    return { ...user, role, token };
  }

  @ApiOperation({ summary: "Inscription self-service (cree une organisation + son 1er admin)" })
  @ApiOkResponse({ description: "Organisation creee, utilisateur connecte" })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post("register")
  @HttpCode(201)
  async register(@Body() body: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    const result = await this.authService.register(body, ctx);
    res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTS);
    const { refreshToken: _omit, ...safe } = result;
    return safe;
  }

  @ApiOperation({ summary: "Logout" })
  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { message: "Logout successfully" } } })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = (req as unknown as { user: { sub: number } }).user.sub;
    const ctx = {
      userId,
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    res.clearCookie("refreshToken", { path: "/" });
    return this.authService.logout(userId, ctx);
  }

  @ApiOperation({ summary: "Refresh access token using httpOnly cookie (rotates the refresh token)" })
  @ApiCookieAuth("refreshToken")
  @ApiOkResponse({ schema: { example: { token: "new.access.token" } } })
  @Get("refresh-token")
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined = (req.cookies as Record<string, string>)["refreshToken"];
    if (!token) throw new UnauthorizedException("No refresh token");
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    // SCRUM-121: rotation — the service returns a fresh refresh token we re-set as the cookie.
    const { refreshToken, ...rest } = await this.authService.refreshAccessToken(token, ctx);
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
    return rest;
  }

  @ApiOperation({ summary: "List the current user's active sessions/devices" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  async listSessions(@Req() req: Request) {
    const userId = (req as unknown as { user: { sub: number } }).user.sub;
    const currentFamily = this.authService.familyFromRefreshToken(
      (req.cookies as Record<string, string>)["refreshToken"],
    );
    return this.authService.listSessions(userId, currentFamily);
  }

  @ApiOperation({ summary: "Revoke one of the current user's sessions/devices" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:id")
  @HttpCode(200)
  async revokeSession(@Param("id") id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = (req as unknown as { user: { sub: number } }).user.sub;
    const ctx = {
      userId,
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    const result = await this.authService.revokeSession(userId, id, ctx);
    // If the user revoked their own current session, clear the cookie too.
    const currentFamily = this.authService.familyFromRefreshToken(
      (req.cookies as Record<string, string>)["refreshToken"],
    );
    if (currentFamily === id) res.clearCookie("refreshToken", { path: "/" });
    return result;
  }

  @ApiOperation({ summary: "Request password reset email (always 200)" })
  @ApiOkResponse({ schema: { example: { message: "Si cet email existe, un lien a été envoyé." } } })
  @Throttle({ default: { ttl: 3600000, limit: 3 } })
  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    await this.passwordResetService.forgotPassword(body.email, ctx);
    return { message: "Si cet email existe, un lien a été envoyé." };
  }

  @ApiOperation({ summary: "Reset password using one-time token" })
  @ApiOkResponse({ schema: { example: { message: "Mot de passe réinitialisé." } } })
  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request) {
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    await this.passwordResetService.resetPassword(body.token, body.newPassword, ctx);
    return { message: "Mot de passe réinitialisé. Veuillez vous reconnecter." };
  }

  // ── MFA endpoints ─────────────────────────────────────────

  @ApiOperation({ summary: "Start MFA setup: returns QR code and recovery codes" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("mfa/setup")
  @HttpCode(200)
  async mfaSetup(@Req() req: Request) {
    const userId = (req as unknown as { user: { sub: number } }).user.sub;
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    return this.mfaService.setupMfa(userId, ctx);
  }

  @ApiOperation({ summary: "Verify TOTP code to activate MFA" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("mfa/verify")
  @HttpCode(200)
  async mfaVerify(@Body() body: MfaVerifyDto, @Req() req: Request) {
    const userId = (req as unknown as { user: { sub: number } }).user.sub;
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    return this.mfaService.verifyAndEnable(userId, body.code, ctx);
  }

  @ApiOperation({ summary: "Disable MFA (requires password + TOTP or recovery code)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("mfa/disable")
  @HttpCode(200)
  async mfaDisable(@Body() body: MfaDisableDto, @Req() req: Request) {
    const userId = (req as unknown as { user: { sub: number } }).user.sub;
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    return this.mfaService.disableMfa(userId, body.password, body.code, ctx);
  }

  @ApiOperation({ summary: "Complete login with MFA code or recovery code" })
  @ApiOkResponse({ type: AuthResponseDto })
  @Post("mfa/login")
  @HttpCode(200)
  async mfaLogin(@Body() body: MfaLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };

    const { sub } = this.authService.verifyMfaToken(body.mfaToken);
    if (body.useRecovery) {
      await this.mfaService.verifyRecoveryCode(sub, body.code, ctx);
    } else {
      await this.mfaService.verifyTotpCode(sub, body.code, ctx);
    }

    const { refreshToken, user, role, token } = await this.authService.completeMfaLogin(body.mfaToken, ctx);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);

    return { ...user, role, token };
  }
}
