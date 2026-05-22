import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: "Get dashboard data (KPIs, sales, purchases, chart, top customers & products)" })
  @Get()
  getDashboardData(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getDashboardData(query);
  }

  @ApiOperation({ summary: "SCRUM-142: dashboard KPIs + alerts (leases, maintenance, stock) + sidenav badge — single startup call replacing 6 individual requests" })
  @Get("startup")
  getStartupData(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getStartupData(query);
  }

  @ApiOperation({ summary: "SCRUM-142: recent sales + cart orders by status (PENDING/RECEIVED/DELIVERED) — single call replacing 4 individual requests" })
  @Get("recent-activity")
  getRecentActivity(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getRecentActivity(query);
  }
}
