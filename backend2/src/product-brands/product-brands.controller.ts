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
import { CreateProductBrandDto, UpdateProductBrandDto } from "./dto/product-brand.dto";
import { ProductBrandsService } from "./product-brands.service";

@ApiTags("product-brand")
@Controller("product-brand")
export class ProductBrandsController {
  constructor(private readonly productBrandsService: ProductBrandsService) {}

  @ApiOperation({ summary: "Get all active brands (public)" })
  @Get("public")
  findPublic() {
    return this.productBrandsService.findPublic();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List product brands" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.productBrandsService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one product brand" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productBrandsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create product brand" })
  @Post()
  create(@Body() body: CreateProductBrandDto) {
    return this.productBrandsService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product brand" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductBrandDto) {
    return this.productBrandsService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete product brand (update status)" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductBrandDto) {
    return this.productBrandsService.updateStatus(id, body.status ?? "false");
  }
}
