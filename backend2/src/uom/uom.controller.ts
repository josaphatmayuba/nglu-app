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
import { CreateUomDto, UpdateUomDto } from "./dto/uom.dto";
import { UomService } from "./uom.service";

@ApiTags("uom")
@Controller("uom")
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List UOMs" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.uomService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one UOM" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.uomService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create UOM" })
  @Post()
  create(@Body() body: CreateUomDto) {
    return this.uomService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update UOM" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUomDto) {
    return this.uomService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete UOM (update status)" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUomDto) {
    return this.uomService.updateStatus(id, body.status ?? "false");
  }
}
