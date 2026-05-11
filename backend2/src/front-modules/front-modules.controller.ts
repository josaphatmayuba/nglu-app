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

function crudController(path: string, tag: string, dto: any) {
  @ApiTags(tag)
  @ApiBearerAuth()
  @Controller(path)
  class ResourceController {
    constructor(public readonly service: FrontModulesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    list(@Query() query: Record<string, string>) {
      return this.service.list(path, query);
    }

    @Get("public")
    publicList(@Query() query: Record<string, string>) {
      return this.service.list(path, { ...query, query: "all" });
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    findOne(@Param("id", ParseIntPipe) id: number) {
      return this.service.findOne(path, id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() body: typeof dto | Array<typeof dto>, @Query() query: Record<string, string>) {
      return this.service.create(path, body as any, query);
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard)
    update(@Param("id", ParseIntPipe) id: number, @Body() body: typeof dto) {
      return this.service.update(path, id, body as any);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    patch(@Param("id", ParseIntPipe) id: number, @Body() body: GenericStatusDto) {
      return this.service.patchStatus(path, id, body.status ?? "false");
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    delete(@Param("id", ParseIntPipe) id: number) {
      return this.service.delete(path, id);
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
