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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ColorDto,
  EducationDto,
  EmploymentStatusDto,
  GenericStatusDto,
  NameStatusDto,
  PageSizeDto,
  ProductAttributeValueDto,
  TermsAndConditionDto,
} from "./dto/front-modules.dto";
import { FrontModulesService } from "./front-modules.service";

const PUBLIC_FRONT_RESOURCES = new Set(["product-color"]);

function PublicListGuard(path: string): MethodDecorator {
  return PUBLIC_FRONT_RESOURCES.has(path) ? () => undefined : UseGuards(JwtAuthGuard);
}

function crudController(path: string, tag: string, dto: any) {
  @ApiTags(tag)
  @ApiBearerAuth()
  @Controller(path)
  class ResourceController {
    constructor(public readonly service: FrontModulesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    list(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
      return this.service.list(path, query, orgId);
    }

    @Get("public")
    @PublicListGuard(path)
    publicList(@Query() query: Record<string, string>) {
      // Route publique reservee aux referentiels globaux non org-scoped
      // (product-color) : orgId=0 est inutilise pour ces tables.
      return this.service.list(path, { ...query, query: "all" }, 0);
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
      return this.service.findOne(path, id, orgId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() body: typeof dto | Array<typeof dto>, @Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
      return this.service.create(path, body as any, orgId, query);
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard)
    update(@Param("id", ParseIntPipe) id: number, @Body() body: typeof dto, @CurrentOrg() orgId: number) {
      return this.service.update(path, id, body as any, orgId);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    patch(@Param("id", ParseIntPipe) id: number, @Body() body: GenericStatusDto, @CurrentOrg() orgId: number) {
      return this.service.patchStatus(path, id, orgId, body.status ?? "false");
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
      return this.service.delete(path, id, orgId);
    }
  }

  return ResourceController;
}

export const DepartmentController = crudController("department", "department", NameStatusDto);
export const EmploymentStatusController = crudController("employment-status", "employment-status", EmploymentStatusDto);
export const EducationController = crudController("education", "education", EducationDto);
export const ProductColorController = crudController("product-color", "product-color", ColorDto);
export const ProductAttributeController = crudController("product-attribute", "product-attribute", NameStatusDto);
export const ProductAttributeValueController = crudController("product-attribute-value", "product-attribute-value", ProductAttributeValueDto);
export const TermsAndConditionController = crudController("terms-and-condition", "terms-and-condition", TermsAndConditionDto);
export const PageSizeController = crudController("page-size", "page-size", PageSizeDto);
