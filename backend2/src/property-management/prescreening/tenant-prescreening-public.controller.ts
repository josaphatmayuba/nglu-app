import { BadRequestException, Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { TenantPrescreeningService } from "./tenant-prescreening.service";
import { RecordPrescreeningConsentDto, SavePrescreeningDraftDto } from "./dto/tenant-prescreening.dto";

// Pas de guard auth : le token opaque de l'URL fait autorisation (même pattern
// que TenantOnboardingPublicController). Le service vérifie en plus que le
// module est activé pour l'organisation du dossier (404 si désactivé, jamais
// 403, pour ne pas révéler l'existence du module).
@ApiTags("tenant-prescreening")
@Controller("tenant-prescreening")
export class TenantPrescreeningPublicController {
  constructor(private readonly service: TenantPrescreeningService) {}

  @ApiOperation({ summary: "Get tenant prescreening dossier by token" })
  @Get()
  getByToken(@Query("token") token: string) {
    this.assertToken(token);
    return this.service.getByToken(token);
  }

  @ApiOperation({ summary: "Save tenant prescreening draft" })
  @Post("save")
  saveDraft(@Query("token") token: string, @Body() body: SavePrescreeningDraftDto) {
    this.assertToken(token);
    return this.service.saveDraft(token, body);
  }

  @ApiOperation({ summary: "Record applicant consent (credit check, data processing, ...)" })
  @Post("consent")
  recordConsent(@Query("token") token: string, @Body() body: RecordPrescreeningConsentDto, @Req() req: Request) {
    this.assertToken(token);
    const ipAddress = this.resolveIp(req);
    const userAgent = req.headers["user-agent"] ?? null;
    return this.service.recordConsent(token, body, { ipAddress, userAgent: userAgent as string | null });
  }

  @ApiOperation({ summary: "Submit tenant prescreening dossier for admin review" })
  @Post("submit")
  submit(@Query("token") token: string) {
    this.assertToken(token);
    return this.service.submit(token);
  }

  @ApiOperation({ summary: "Get the current consent legal text" })
  @Get("consent-text")
  getConsentText(
    @Query("version") version: string,
    @Query("locale") locale: string,
    @Query("consentType") consentType: string,
  ) {
    if (!version || !locale || !consentType) {
      throw new BadRequestException("version, locale et consentType sont requis.");
    }
    return this.service.getConsentText(null, version, locale, consentType);
  }

  private assertToken(token?: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
  }

  private resolveIp(req: Request): string | null {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
    if (Array.isArray(forwarded) && forwarded.length) return forwarded[0];
    return req.ip ?? null;
  }
}
