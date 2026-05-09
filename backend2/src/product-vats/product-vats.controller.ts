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
import { CreateProductVatDto, UpdateProductVatDto } from "./dto/product-vat.dto";
import { ProductVatsService } from "./product-vats.service";

@ApiTags("product-vat")
@Controller("product-vat")
export class ProductVatsController {
  constructor(private readonly productVatsService: ProductVatsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get VAT statement totals" })
  @Get("statement")
  getStatement() {
    return this.productVatsService.getStatement();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List product VATs" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.productVatsService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create product VAT / create-many / delete-many" })
  @Post()
  create(@Body() body: CreateProductVatDto, @Query() query: Record<string, string>) {
    if (query["query"] === "createmany") {
      return this.productVatsService.createMany([body]);
    }
    if (query["query"] === "deletemany") {
      const ids = (query["ids"] ?? "").split(",").map(Number).filter(Boolean);
      return this.productVatsService.deleteMany(ids);
    }
    return this.productVatsService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product VAT" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductVatDto) {
    return this.productVatsService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete product VAT (update status)" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateProductVatDto) {
    return this.productVatsService.updateStatus(id, body.status ?? "false");
  }
}
