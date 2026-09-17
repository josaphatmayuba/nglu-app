import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
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
}
