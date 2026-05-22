import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuditService } from "./audit.service";

@ApiTags("audit-log")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("audit-log")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({ summary: "List audit logs (paginated, filterable by action and startDate)" })
  @Get()
  getLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: string,
    @Query("startDate") startDate?: string,
  ) {
    return this.auditService.getLogs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      startDate,
    });
  }
}
