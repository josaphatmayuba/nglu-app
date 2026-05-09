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
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("auth")
@Controller("user")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: "Login" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "username or password is incorrect" })
  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, user, role, token } = await this.authService.login(body);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { ...user, role, token };
  }

  @ApiOperation({ summary: "Logout" })
  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { message: "Logout successfully" } } })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@Body("id") id: number, @Res({ passthrough: true }) res: Response) {
    res.clearCookie("refreshToken", { path: "/" });
    return this.authService.logout(id);
  }

  @ApiOperation({ summary: "Refresh access token using httpOnly cookie" })
  @ApiCookieAuth("refreshToken")
  @ApiOkResponse({ schema: { example: { token: "new.access.token" } } })
  @Get("refresh-token")
  refreshToken(@Req() req: Request) {
    const token: string | undefined = (req.cookies as Record<string, string>)["refreshToken"];
    if (!token) throw new Error("No refresh token");
    return this.authService.refreshAccessToken(token);
  }
}
