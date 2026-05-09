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
import { CreateProductCategoryDto, UpdateProductCategoryDto } from "./dto/product-category.dto";
import { ProductCategoriesService } from "./product-categories.service";

@ApiTags("product-category")
@Controller("product-category")
export class ProductCategoriesController {
  constructor(private readonly productCategoriesService: ProductCategoriesService) {}

  @ApiOperation({ summary: "Get all categories with sub-categories (public)" })
  @Get("public")
  findPublic() {
    return this.productCategoriesService.findPublic();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List product categories" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.productCategoriesService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one product category" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productCategoriesService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create product category / create-many / delete-many" })
  @Post()
  create(@Body() body: CreateProductCategoryDto, @Query() query: Record<string, string>) {
    if (query["query"] === "createmany") {
      return this.productCategoriesService.createMany([body]);
    }
    if (query["query"] === "deletemany") {
      const ids = (query["ids"] ?? "").split(",").map(Number).filter(Boolean);
      return this.productCategoriesService.deleteMany(ids);
    }
    return this.productCategoriesService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product category" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductCategoryDto) {
    return this.productCategoriesService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete product category (update status)" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductCategoryDto) {
    return this.productCategoriesService.updateStatus(id, body.status ?? "false");
  }
}
