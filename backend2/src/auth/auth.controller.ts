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
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
