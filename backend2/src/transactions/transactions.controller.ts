import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
  UpdateTransactionStatusDto,
} from "./dto/transaction.dto";
import { TransactionsService } from "./transactions.service";

@ApiTags("transaction")
@Controller("transaction")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: "Create an accounting transaction" })
  @ApiCreatedResponse({ description: "Created transaction" })
  @Permissions("create-transaction")
  @Post()
  create(@Body() body: CreateTransactionDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.create(body, orgId);
  }

  @ApiOperation({ summary: "Rattrapage : reposte au grand livre les transactions actives non comptabilisees (idempotent)" })
  @ApiOkResponse({ description: "Resume du backfill (total/posted/skipped/errors)" })
  @Permissions("create-transaction")
  @Post("backfill-ledger")
  backfillLedger(@CurrentOrg() orgId: number) {
    return this.transactionsService.backfillLedger(orgId);
  }

  @ApiOperation({ summary: "List, search, or aggregate transactions" })
  @ApiOkResponse({ description: "Transaction result" })
  @Permissions("readAll-transaction")
  @Get()
  findAll(@Query() query: TransactionQueryDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.findAll(query, orgId);
  }

  @ApiOperation({ summary: "Get one transaction" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("readSingle-transaction", "readAll-transaction")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.transactionsService.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Update a transaction" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-transaction")
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTransactionDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Update transaction status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("delete-transaction")
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTransactionStatusDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.updateStatus(id, body.status, orgId);
  }

  // ─────────────── Justificatifs (recus/factures) ───────────────

  @ApiOperation({ summary: "Liste les justificatifs d'une transaction" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("readSingle-transaction", "readAll-transaction")
  @Get(":id/attachments")
  listAttachments(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.transactionsService.listAttachments(id, orgId);
  }

  @ApiOperation({ summary: "Attache un justificatif (recu/facture) a une transaction" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-transaction")
  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.mimetype);
      cb(ok ? null : new BadRequestException("Type non autorise (jpg/png/webp/pdf)."), ok);
    },
  }))
  addAttachment(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: any, @CurrentOrg() orgId: number) {
    return this.transactionsService.addAttachment(id, file, orgId);
  }

  @ApiOperation({ summary: "Streame le fichier d'un justificatif (verifie contre l'org courante)" })
  @ApiParam({ name: "attachmentId", example: 1, type: Number })
  @Permissions("readSingle-transaction", "readAll-transaction")
  @Get("attachments/:attachmentId/file")
  async attachmentFile(
    @Param("attachmentId", ParseIntPipe) attachmentId: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.transactionsService.attachmentFile(attachmentId, orgId);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Supprime (soft) un justificatif" })
  @ApiParam({ name: "attachmentId", example: 1, type: Number })
  @Permissions("update-transaction")
  @Delete("attachments/:attachmentId")
  removeAttachment(@Param("attachmentId", ParseIntPipe) attachmentId: number, @CurrentOrg() orgId: number) {
    return this.transactionsService.removeAttachment(attachmentId, orgId);
  }
}
