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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateRolePermissionDto } from "./dto/role-permission.dto";
import { RolePermissionsService } from "./role-permissions.service";

@ApiTags("role-permission")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("role-permission")
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  @ApiOperation({ summary: "Assign permissions to role (syncs: adds missing, removes unlisted)" })
  @ApiQuery({ name: "query", required: false, enum: ["deletemany"] })
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
  @Delete(":id")
  @HttpCode(200)
  removeOne(@Param("id", ParseIntPipe) id: number) {
    return this.rolePermissionsService.removeOne(id);
  }
}
