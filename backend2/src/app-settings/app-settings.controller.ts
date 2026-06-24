import { Body, Controller, Get, HttpCode, Post, Put, Req, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppSettingsService } from "./app-settings.service";
import { UpdateAppSettingDto } from "./dto/update-app-setting.dto";

const APP_SETTING_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

@ApiTags("setting")
@Controller("setting")
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @ApiOperation({ summary: "Get app settings (public)" })
  @ApiOkResponse({ description: "App setting with currency" })
  @Get()
  findOne() {
    return this.appSettingsService.findOne();
  }

  @ApiOperation({ summary: "Update app settings" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: APP_SETTING_UPLOAD_LIMIT_BYTES, files: 1 } }))
  @Put()
  update(
    @Body() body: UpdateAppSettingDto,
    @UploadedFiles() files: any[],
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.appSettingsService.update(body, files, this.publicApiBase(req), orgId);
  }

  @ApiOperation({ summary: "Update app settings (Laravel-compatible form method)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: APP_SETTING_UPLOAD_LIMIT_BYTES, files: 1 } }))
  @Post()
  @HttpCode(200)
  updateFromForm(
    @Body() body: UpdateAppSettingDto,
    @UploadedFiles() files: any[],
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.appSettingsService.update(body, files, this.publicApiBase(req), orgId);
  }

  private publicApiBase(req: Request) {
    // Prefer X-Forwarded-Host (set by nginx → the real public domain)
    // over the Host header, which the proxy rewrites to "backend2:8001"
    // when changeOrigin: true is enabled in the middleware.
    const pickFirst = (v?: string | string[]) =>
      Array.isArray(v) ? v[0] : v;
    const proto = pickFirst(req.headers["x-forwarded-proto"]);
    const host =
      pickFirst(req.headers["x-forwarded-host"]) ?? req.headers.host;
    if (proto && host) return `${proto}://${host}/api`;
    return `${req.protocol}://${host}`;
  }
}
