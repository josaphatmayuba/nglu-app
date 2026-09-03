import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateQrCodeDto, UpdateQrCodeDto } from "./dto/qr-codes.dto";
import { QrCodesService } from "./qr-codes.service";

@ApiTags("kodatill-qr-codes")
@ApiBearerAuth()
@Controller("kodatill/qr-codes")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QrCodesController {
  constructor(private readonly qrCodes: QrCodesService) {}

  @ApiOperation({ summary: "Liste les QR codes actifs, filtrable par succursale" })
  @ApiOkResponse({ description: "QR codes" })
  @Permissions("kodatill_view")
  @Get()
  list(@Query("branchId") branchId: string | undefined, @CurrentOrg() orgId: number) {
    const parsed = branchId !== undefined ? Number(branchId) : undefined;
    return this.qrCodes.list(orgId, parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined);
  }

  @ApiOperation({ summary: "Cree un QR code (genere un jeton public opaque)" })
  @ApiCreatedResponse({ description: "QR code cree" })
  @Permissions("kodatill_settings_manage")
  @Post()
  create(@Body() body: CreateQrCodeDto, @CurrentOrg() orgId: number) {
    return this.qrCodes.create(body, orgId);
  }

  @ApiOperation({ summary: "Modifie label/type/slug d'un QR code (le jeton public ne change pas)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateQrCodeDto, @CurrentOrg() orgId: number) {
    return this.qrCodes.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Regenere le jeton public (invalide l'ancien QR imprime)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Post(":id/regenerate")
  regenerate(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.qrCodes.regenerate(id, orgId);
  }

  @ApiOperation({ summary: "Desactive un QR code (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.qrCodes.remove(id, orgId);
  }

  @ApiOperation({ summary: "Genere l'image PNG du QR code (encode l'URL publique de scan)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get(":id/image")
  async image(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Res() res: Response) {
    const png = await this.qrCodes.generateImage(id, orgId);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="qr-${id}.png"`);
    res.send(png);
  }
}
