import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CreateDiscountDto,
  DiscountQueryDto,
  UpdateDiscountDto,
  UpdateDiscountStatusDto,
} from "./dto/discount.dto";
import { DiscountsService } from "./discounts.service";

@ApiTags("discount")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("discount")
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @ApiOperation({ summary: "Create a discount" })
  @ApiCreatedResponse({ description: "Created discount" })
  @Post()
  create(@Body() body: CreateDiscountDto) {
    return this.discountsService.create(body);
  }

  @ApiOperation({ summary: "List discounts" })
  @ApiOkResponse({ description: "Discount result" })
  @Get()
  findAll(@Query() query: DiscountQueryDto) {
    return this.discountsService.findAll(query);
  }

  @ApiOperation({ summary: "Get one discount" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.discountsService.findOne(id);
  }

  @ApiOperation({ summary: "Update one discount" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDiscountDto) {
    return this.discountsService.update(id, body);
  }

  @ApiOperation({ summary: "Update discount status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDiscountStatusDto) {
    return this.discountsService.updateStatus(id, body.status);
  }
}
