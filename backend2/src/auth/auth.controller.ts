import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
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
import { PasswordResetService } from "./password-reset.service";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches } from "class-validator";

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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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
    const { refreshToken, user, role, token } = await this.authService.login(body, ctx);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { ...user, role, token };
  }

  @ApiOperation({ summary: "Logout" })
  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { message: "Logout successfully" } } })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@Body("id") id: number, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ctx = {
      userId: id,
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    res.clearCookie("refreshToken", { path: "/" });
    return this.authService.logout(id, ctx);
  }

  @ApiOperation({ summary: "Refresh access token using httpOnly cookie" })
  @ApiCookieAuth("refreshToken")
  @ApiOkResponse({ schema: { example: { token: "new.access.token" } } })
  @Get("refresh-token")
  refreshToken(@Req() req: Request) {
    const token: string | undefined = (req.cookies as Record<string, string>)["refreshToken"];
    if (!token) throw new Error("No refresh token");
    const ctx = {
      ip: (req as unknown as { ip: string }).ip,
      userAgent: (req.headers as Record<string, string>)["user-agent"],
    };
    return this.authService.refreshAccessToken(token, ctx);
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
}
