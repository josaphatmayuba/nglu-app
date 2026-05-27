import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateRolePermissionDto } from "./dto/role-permission.dto";
import { RolePermissionsService } from "./role-permissions.service";

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("role-permission")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("role-permission")
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  @ApiOperation({ summary: "Assign permissions to role (syncs: adds missing, removes unlisted)" })
  @ApiQuery({ name: "query", required: false, enum: ["deletemany"] })
  @Permissions("update-rolePermission")
  @Post()
  @HttpCode(201)
  create(@Body() body: unknown, @Query("query") query?: string) {
    if (query === "deletemany") {
      return this.rolePermissionsService.deleteMany(body as number[]);
    }
    return this.rolePermissionsService.upsert(body as CreateRolePermissionDto);
  }

  @ApiOperation({ summary: "Get permissions by roleId" })
  @ApiQuery({ name: "roleId", required: true, type: Number })
  @Permissions("readAll-rolePermission")
  @Get()
  findByRoleId(@Query("roleId", ParseIntPipe) roleId: number) {
    return this.rolePermissionsService.findByRoleId(roleId);
  }

  @ApiOperation({ summary: "Get permissions by roleId (frontend alias)" })
  @ApiQuery({ name: "roleId", required: true, type: Number })
  @Get("permission")
  findPermissionByRoleId(@Query("roleId", ParseIntPipe) roleId: number) {
    return this.rolePermissionsService.findByRoleId(roleId);
  }

  @ApiOperation({ summary: "Delete a single role permission" })
  @Permissions("delete-rolePermission")
  @Delete(":id")
  @HttpCode(200)
  removeOne(@Param("id", ParseIntPipe) id: number) {
    return this.rolePermissionsService.removeOne(id);
  }
}
