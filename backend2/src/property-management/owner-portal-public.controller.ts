// Route publique du portail proprietaire (/domus/proprietaire?token=...).
// Lecture seule : contrairement au portail locataire, aucune route d'ecriture
// n'est exposee — le proprietaire consulte, il ne modifie rien.
import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { OwnerPortalService } from "./owner-portal.service";

@ApiTags("owner-portal")
@Controller("owner-portal")
export class OwnerPortalPublicController {
  constructor(private readonly ownerPortalService: OwnerPortalService) {}

  @ApiOperation({ summary: "Get owner portal data by token (no auth, token opaque in URL)" })
  @Get()
  getByToken(@Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.ownerPortalService.getPublicOwnerPortal(token);
  }

  @ApiOperation({ summary: "Stream the proof file of one payment on the owner's own properties (verified, no public URL)" })
  @Get("payments/:id/proof")
  async paymentProof(
    @Param("id", ParseIntPipe) id: number,
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const file = await this.ownerPortalService.getPublicOwnerPaymentProof(token, id);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }
}
