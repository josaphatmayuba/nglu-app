import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { MessageResponseDto } from "../shared/dto/message-response.dto";
import { CreateTransactionTypeDto } from "./dto/create-transaction-type.dto";
import { TransactionTypeResponseDto } from "./dto/transaction-type-response.dto";
import { UpdateTransactionTypeDto } from "./dto/update-transaction-type.dto";
import { TransactionTypesService } from "./transaction-types.service";

@ApiTags("transaction-type")
@Controller("transaction-type")
export class TransactionTypesController {
  constructor(private readonly transactionTypesService: TransactionTypesService) {}

  @ApiOperation({ summary: "List active transaction types" })
  @ApiOkResponse({ type: TransactionTypeResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.transactionTypesService.findAll();
  }

  @ApiOperation({ summary: "Create a transaction type" })
  @ApiCreatedResponse({ type: TransactionTypeResponseDto })
  @Post()
  create(@Body() body: CreateTransactionTypeDto) {
    return this.transactionTypesService.create(body);
  }

  @ApiOperation({ summary: "Get one transaction type by ID" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @ApiOkResponse({ type: TransactionTypeResponseDto })
  @ApiNotFoundResponse({ description: "Transaction type not found." })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.transactionTypesService.findOne(id);
  }

  @ApiOperation({ summary: "Update a transaction type" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @ApiOkResponse({ type: TransactionTypeResponseDto })
  @ApiNotFoundResponse({ description: "Transaction type not found." })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTransactionTypeDto) {
    return this.transactionTypesService.update(id, body);
  }

  @ApiOperation({ summary: "Delete a transaction type" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({ description: "Transaction type not found." })
  @Patch(":id")
  @Delete(":id")
  @HttpCode(200)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.transactionTypesService.remove(id);
  }
}
