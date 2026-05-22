import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("user")
@Controller("user")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Register a new user (public)" })
  @Post("register")
  register(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @ApiOperation({ summary: "Get all users (query=all|search or paginated)" })
  @ApiQuery({ name: "query", required: false, enum: ["all", "search"] })
  @ApiQuery({ name: "key", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "roleId", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "count", required: false, type: Number })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.usersService.findAll(query);
  }

  @ApiOperation({ summary: "Get single user by ID" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: "Update user" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @ApiOperation({ summary: "Soft delete user (update status)" })
  @ApiOkResponse({ schema: { example: { message: "User deleted successfully" } } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  @HttpCode(200)
  remove(@Param("id", ParseIntPipe) id: number, @Body("status") status: string) {
    return this.usersService.remove(id, status);
  }
}
