import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { TenantPortalService } from "./tenant-portal.service";

@ApiTags("tenant-portal")
@Controller("tenant-portal")
export class TenantPortalPublicController {
  constructor(private readonly tenantPortalService: TenantPortalService) {}

  @ApiOperation({ summary: "Get tenant portal data by token (no auth, token opaque in URL)" })
  @Get()
  getByToken(@Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.getPublicTenantPortal(token);
  }

  @ApiOperation({ summary: "Get the proof file URL of one of the tenant's own payments" })
  @Get("payments/:id/proof")
  paymentProof(@Param("id", ParseIntPipe) id: number, @Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.getPublicPaymentProof(token, id);
  }

  @ApiOperation({ summary: "Download the tenant's own lease: scanned paper contract from object storage" })
  @Get("contracts/:id/scan")
  async contractScan(
    @Param("id", ParseIntPipe) id: number,
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const file = await this.tenantPortalService.getPublicContractScan(token, id);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Download the tenant's own lease: printable HTML of the e-signed contract" })
  @Get("contracts/:id/print")
  async contractPrint(
    @Param("id", ParseIntPipe) id: number,
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const html = await this.tenantPortalService.getPublicContractPrintable(token, id);
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    });
    return html;
  }

  @ApiOperation({ summary: "Submit a personal data change request (pending manager approval)" })
  @Post("change-request")
  submitChangeRequest(@Query("token") token: string, @Body() body: Record<string, unknown>) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.submitChangeRequest(token, body);
  }
}
