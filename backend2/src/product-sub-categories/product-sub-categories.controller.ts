import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CreateProductSubCategoryDto,
  UpdateProductSubCategoryDto,
} from "./dto/product-sub-category.dto";
import { ProductSubCategoriesService } from "./product-sub-categories.service";

@ApiTags("product-sub-category")
@Controller("product-sub-category")
export class ProductSubCategoriesController {
  constructor(
    private readonly productSubCategoriesService: ProductSubCategoriesService,
  ) {}

  @ApiOperation({ summary: "Get all active sub-categories with category name (public)" })
  @Get("public")
  findPublic() {
    return this.productSubCategoriesService.findPublic();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List product sub-categories" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.productSubCategoriesService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one product sub-category" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productSubCategoriesService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create product sub-category" })
  @Post()
  create(@Body() body: CreateProductSubCategoryDto) {
    return this.productSubCategoriesService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product sub-category" })
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateProductSubCategoryDto,
  ) {
    return this.productSubCategoriesService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete product sub-category (update status)" })
  @Patch(":id")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateProductSubCategoryDto,
  ) {
    return this.productSubCategoriesService.updateStatus(id, body.status ?? "false");
  }
}
