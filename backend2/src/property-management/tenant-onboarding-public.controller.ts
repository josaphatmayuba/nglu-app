import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SaveTenantOnboardingDto } from "./dto/property-management.dto";
import { PropertyManagementService } from "./property-management.service";

@ApiTags("tenant-onboarding")
@Controller("tenant-onboarding")
export class TenantOnboardingPublicController {
  constructor(private readonly propertyManagementService: PropertyManagementService) {}

  @ApiOperation({ summary: "Get tenant onboarding draft by token" })
  @Get()
  getByToken(@Query("token") token: string) {
    return this.propertyManagementService.getPublicOnboarding(token);
  }

  @ApiOperation({ summary: "Save tenant onboarding draft without final validation" })
  @Post("save")
  saveDraft(@Query("token") token: string, @Body() body: SaveTenantOnboardingDto) {
    return this.propertyManagementService.savePublicOnboarding(token, body);
  }

  @ApiOperation({ summary: "Submit tenant onboarding dossier for admin validation" })
  @Post("submit")
  submit(@Query("token") token: string, @Body() body: SaveTenantOnboardingDto) {
    return this.propertyManagementService.submitPublicOnboarding(token, body);
  }
}
