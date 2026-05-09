import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsService } from "./permissions.service";

@ApiTags("permission")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("permission")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @ApiOperation({ summary: "Get all permissions (query=all or paginated)" })
  @ApiQuery({ name: "query", required: false, enum: ["all"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.permissionsService.findAll(query);
  }
}
