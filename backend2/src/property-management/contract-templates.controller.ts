import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { ContractTemplatesService } from "./contract-templates.service";
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
} from "./dto/contract-template.dto";

type AuthedRequest = Request & { user?: { sub?: number } };

@ApiTags("property-management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("property-management/contract-templates")
export class ContractTemplatesController {
  constructor(private readonly templates: ContractTemplatesService) {}

  @ApiOperation({ summary: "List contract templates" })
  @Permissions("readAll-contractTemplate")
  @Get()
  list(@CurrentOrg() orgId: number) {
    return this.templates.list(orgId);
  }

  @ApiOperation({ summary: "Get a contract template by id" })
  @Permissions("readSingle-contractTemplate", "readAll-contractTemplate")
  @Get(":id")
  getOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.templates.getById(id, orgId);
  }

  @ApiOperation({ summary: "Create a new contract template" })
  @Permissions("create-contractTemplate")
  @Post()
  create(@Body() body: CreateContractTemplateDto, @CurrentOrg() orgId: number, @Req() req: AuthedRequest) {
    return this.templates.create(body, orgId, req.user?.sub);
  }

  @ApiOperation({ summary: "Update a contract template (creates a new version if body changes)" })
  @Permissions("update-contractTemplate")
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateContractTemplateDto,
    @CurrentOrg() orgId: number,
    @Req() req: AuthedRequest,
  ) {
    return this.templates.update(id, body, orgId, req.user?.sub);
  }

  @ApiOperation({ summary: "Mark a template as the active one for its type" })
  @Permissions("update-contractTemplate")
  @Patch(":id/activate")
  setActive(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Req() req: AuthedRequest) {
    return this.templates.setActive(id, orgId, req.user?.sub);
  }

  @ApiOperation({ summary: "Duplicate an existing template" })
  @Permissions("create-contractTemplate")
  @Post(":id/duplicate")
  duplicate(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Req() req: AuthedRequest) {
    return this.templates.duplicate(id, orgId, req.user?.sub);
  }

  @ApiOperation({ summary: "Delete a contract template (cannot delete the active one)" })
  @Permissions("delete-contractTemplate")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.templates.remove(id, orgId);
  }
}
