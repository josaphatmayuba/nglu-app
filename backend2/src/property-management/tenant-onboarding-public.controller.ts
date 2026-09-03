import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SaveTenantOnboardingDto } from "./dto/property-management.dto";
import { PropertyManagementService } from "./property-management.service";
import { env } from "../config/env";

@ApiTags("tenant-onboarding")
@Controller("tenant-onboarding")
export class TenantOnboardingPublicController {
  constructor(private readonly propertyManagementService: PropertyManagementService) {}

  @ApiOperation({ summary: "Get tenant onboarding draft by token" })
  @Get()
  getByToken(@Query("token") token: string) {
    this.assertToken(token);
    return this.propertyManagementService.getPublicOnboarding(token);
  }

  @ApiOperation({ summary: "Save tenant onboarding draft without final validation" })
  @Post("save")
  saveDraft(@Query("token") token: string, @Body() body: SaveTenantOnboardingDto) {
    this.assertToken(token);
    return this.propertyManagementService.savePublicOnboarding(token, body);
  }

  @ApiOperation({ summary: "Submit tenant onboarding dossier for admin validation" })
  @Post("submit")
  submit(@Query("token") token: string, @Body() body: SaveTenantOnboardingDto) {
    this.assertToken(token);
    return this.propertyManagementService.submitPublicOnboarding(token, body);
  }

  @ApiOperation({ summary: "Twilio SMS delivery status callback (option A)" })
  @Post("sms-status")
  @HttpCode(200)
  smsStatusCallback(
    @Req() req: Request,
    @Headers("x-twilio-signature") signature: string,
    @Body() body: Record<string, any>,
  ) {
    // Twilio signe l'URL PUBLIQUE exacte qu'il a appelee. On la reconstruit a
    // partir d'APP_URL (le host derriere le proxy peut differer).
    const fullUrl = `${env.appUrl.replace(/\/$/, "")}/api/tenant-onboarding/sms-status`;
    return this.propertyManagementService.handleSmsStatusCallback(fullUrl, signature, body || {});
  }

  private assertToken(token?: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
  }
}
