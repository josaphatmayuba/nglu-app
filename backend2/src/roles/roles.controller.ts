import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import type { AuditContext } from "../audit/audit.service";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

function auditCtx(req: Request): AuditContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user as { sub?: number } | undefined;
  return { userId: user?.sub, ip: req.ip, userAgent: req.headers["user-agent"] };
}

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("role")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("role")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: "Get all roles (query=all|search or paginated)" })
  @ApiQuery({ name: "query", required: false, enum: ["all", "search"] })
  @ApiQuery({ name: "key", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @Get()
  findAll(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.rolesService.findAll(query, orgId);
  }

  @ApiOperation({ summary: "Get single role by ID" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.rolesService.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Create role (or query=createmany / query=deletemany)" })
  @ApiQuery({ name: "query", required: false, enum: ["createmany", "deletemany"] })
  @Post()
  @HttpCode(201)
  create(@Body() body: unknown, @Query("query") query: string | undefined, @Req() req: Request, @CurrentOrg() orgId: number) {
    if (query === "deletemany") return this.rolesService.deleteMany(body as number[], orgId, auditCtx(req));
    if (query === "createmany") return this.rolesService.createMany(body as CreateRoleDto[], orgId);
    return this.rolesService.create(body as CreateRoleDto, orgId, auditCtx(req));
  }

  @ApiOperation({ summary: "Update role" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateRoleDto, @Req() req: Request, @CurrentOrg() orgId: number) {
    return this.rolesService.update(id, body, orgId, auditCtx(req));
  }

  @ApiOperation({ summary: "Soft delete role (update status)" })
  @Patch(":id")
  @HttpCode(200)
  remove(@Param("id", ParseIntPipe) id: number, @Body("status") status: string, @Req() req: Request, @CurrentOrg() orgId: number) {
    return this.rolesService.remove(id, status, orgId, auditCtx(req));
  }
}
