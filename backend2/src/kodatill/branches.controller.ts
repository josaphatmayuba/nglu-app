import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { BranchesService } from "./branches.service";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branches.dto";

@ApiTags("kodatill-branches")
@ApiBearerAuth()
@Controller("kodatill/branches")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @ApiOperation({ summary: "Liste les succursales actives (defaut en premier)" })
  @ApiOkResponse({ description: "Succursales" })
  @Permissions("kodatill_view")
  @Get()
  list(@CurrentOrg() orgId: number) {
    return this.branches.list(orgId);
  }

  @ApiOperation({ summary: "Cree une succursale" })
  @ApiCreatedResponse({ description: "Succursale creee" })
  @Permissions("kodatill_settings_manage")
  @Post()
  create(@Body() body: CreateBranchDto, @CurrentOrg() orgId: number) {
    return this.branches.create(body, orgId);
  }

  @ApiOperation({ summary: "Modifie une succursale" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBranchDto, @CurrentOrg() orgId: number) {
    return this.branches.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une succursale (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.branches.remove(id, orgId);
  }
}
