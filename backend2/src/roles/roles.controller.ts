import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

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
  findAll(@Query() query: Record<string, string>) {
    return this.rolesService.findAll(query);
  }

  @ApiOperation({ summary: "Get single role by ID" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @ApiOperation({ summary: "Create role (or query=createmany / query=deletemany)" })
  @ApiQuery({ name: "query", required: false, enum: ["createmany", "deletemany"] })
  @Post()
  @HttpCode(201)
  create(@Body() body: unknown, @Query("query") query?: string) {
    if (query === "deletemany") return this.rolesService.deleteMany(body as number[]);
    if (query === "createmany") return this.rolesService.createMany(body as CreateRoleDto[]);
    return this.rolesService.create(body as CreateRoleDto);
  }

  @ApiOperation({ summary: "Update role" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateRoleDto) {
    return this.rolesService.update(id, body);
  }

  @ApiOperation({ summary: "Soft delete role (update status)" })
  @Delete(":id")
  @HttpCode(200)
  remove(@Param("id", ParseIntPipe) id: number, @Body("status") status: string) {
    return this.rolesService.remove(id, status);
  }
}
