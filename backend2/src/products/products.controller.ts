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
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
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
  findAll(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.productsService.findAll(query, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one product with relations" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.productsService.findOne(id, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create product / create-many / delete-many" })
  @Post()
  create(@Body() body: CreateProductDto, @Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    if (query["query"] === "createmany") {
      return this.productsService.createMany([body], orgId);
    }
    if (query["query"] === "deletemany") {
      const ids = (query["ids"] ?? "").split(",").map(Number).filter(Boolean);
      return this.productsService.deleteMany(ids, orgId);
    }
    return this.productsService.create(body, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductDto, @CurrentOrg() orgId: number) {
    return this.productsService.update(id, body, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete product (update status)" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductDto, @CurrentOrg() orgId: number) {
    return this.productsService.updateStatus(id, body.status ?? "false", orgId);
  }
}
