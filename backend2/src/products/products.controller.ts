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
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

@ApiTags("product")
@Controller("product")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: "Get all active products with relations (public)" })
  @Get("public")
  findPublic() {
    return this.productsService.findPublic();
  }

  @ApiOperation({ summary: "Get one active product with relations (public)" })
  @Get("public/:id")
  findPublicOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findPublicOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List products" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.productsService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one product with relations" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create product / create-many / delete-many" })
  @Post()
  create(@Body() body: CreateProductDto, @Query() query: Record<string, string>) {
    if (query["query"] === "createmany") {
      return this.productsService.createMany([body]);
    }
    if (query["query"] === "deletemany") {
      const ids = (query["ids"] ?? "").split(",").map(Number).filter(Boolean);
      return this.productsService.deleteMany(ids);
    }
    return this.productsService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete product (update status)" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductDto) {
    return this.productsService.updateStatus(id, body.status ?? "false");
  }
}
