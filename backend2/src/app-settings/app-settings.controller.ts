import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
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
  @Put()
  update(@Body() body: UpdateAppSettingDto) {
    return this.appSettingsService.update(body);
  }
}
