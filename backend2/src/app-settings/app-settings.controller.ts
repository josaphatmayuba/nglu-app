import { Body, Controller, Get, HttpCode, Post, Put, Req, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppSettingsService } from "./app-settings.service";
import { UpdateAppSettingDto } from "./dto/update-app-setting.dto";

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
  @UseInterceptors(AnyFilesInterceptor())
  @Put()
  update(@Body() body: UpdateAppSettingDto, @UploadedFiles() files: any[], @Req() req: Request) {
    return this.appSettingsService.update(body, files, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Update app settings (Laravel-compatible form method)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  @Post()
  @HttpCode(200)
  updateFromForm(@Body() body: UpdateAppSettingDto, @UploadedFiles() files: any[], @Req() req: Request) {
    return this.appSettingsService.update(body, files, this.publicApiBase(req));
  }

  private publicApiBase(req: Request) {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    const host = req.headers.host;
    if (proto && host) return `${proto}://${host}/api`;
    return `${req.protocol}://${host}`;
  }
}
