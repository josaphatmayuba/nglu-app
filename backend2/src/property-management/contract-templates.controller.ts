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
  list() {
    return this.templates.list();
  }

  @ApiOperation({ summary: "Get a contract template by id" })
  @Permissions("readSingle-contractTemplate", "readAll-contractTemplate")
  @Get(":id")
  getOne(@Param("id", ParseIntPipe) id: number) {
    return this.templates.getById(id);
  }

  @ApiOperation({ summary: "Create a new contract template" })
  @Permissions("create-contractTemplate")
  @Post()
  create(@Body() body: CreateContractTemplateDto, @Req() req: AuthedRequest) {
    return this.templates.create(body, req.user?.sub);
  }

  @ApiOperation({ summary: "Update a contract template (creates a new version if body changes)" })
  @Permissions("update-contractTemplate")
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateContractTemplateDto,
    @Req() req: AuthedRequest,
  ) {
    return this.templates.update(id, body, req.user?.sub);
  }

  @ApiOperation({ summary: "Mark a template as the active one for its type" })
  @Permissions("update-contractTemplate")
  @Patch(":id/activate")
  setActive(@Param("id", ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.templates.setActive(id, req.user?.sub);
  }

  @ApiOperation({ summary: "Duplicate an existing template" })
  @Permissions("create-contractTemplate")
  @Post(":id/duplicate")
  duplicate(@Param("id", ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.templates.duplicate(id, req.user?.sub);
  }

  @ApiOperation({ summary: "Delete a contract template (cannot delete the active one)" })
  @Permissions("delete-contractTemplate")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.templates.remove(id);
  }
}
