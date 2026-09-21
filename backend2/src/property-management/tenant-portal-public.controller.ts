import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
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

  @ApiOperation({ summary: "Submit a personal data change request (pending manager approval)" })
  @Post("change-request")
  submitChangeRequest(@Query("token") token: string, @Body() body: Record<string, unknown>) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.submitChangeRequest(token, body);
  }
}
