import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateManufacturerDto, UpdateManufacturerDto } from "./dto/manufacturer.dto";
import { ManufacturersService } from "./manufacturers.service";

@ApiTags("manufacturer")
@Controller("manufacturer")
export class ManufacturersController {
  constructor(private readonly manufacturersService: ManufacturersService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get all active manufacturers" })
  @Get()
  findAll() {
    return this.manufacturersService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one manufacturer" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.manufacturersService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create manufacturer" })
  @Post()
  create(@Body() body: CreateManufacturerDto) {
    return this.manufacturersService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update manufacturer" })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateManufacturerDto) {
    return this.manufacturersService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update manufacturer status" })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateManufacturerDto) {
    return this.manufacturersService.updateStatus(id, body.status ?? "false");
  }
}
