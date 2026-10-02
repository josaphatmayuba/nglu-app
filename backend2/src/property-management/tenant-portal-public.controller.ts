import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { TenantPortalService } from "./tenant-portal.service";

@ApiTags("tenant-portal")
@Controller("tenant-portal")
export class TenantPortalPublicController {
  constructor(private readonly tenantPortalService: TenantPortalService) {}

  @ApiOperation({ summary: "Get tenant portal data by token (no auth, token opaque in URL)" })
  @Get()
  getByToken(@Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.getPublicTenantPortal(token);
  }

  @ApiOperation({ summary: "Get the proof file URL of one of the tenant's own payments" })
  @Get("payments/:id/proof")
  paymentProof(@Param("id", ParseIntPipe) id: number, @Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.getPublicPaymentProof(token, id);
  }

  @ApiOperation({ summary: "Get a minimal summary of one of the tenant's own payments (month/amount/status), for the dedicated QR-per-receipt page" })
  @Get("payments/:id/summary")
  paymentSummary(@Param("id", ParseIntPipe) id: number, @Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.getPublicPaymentSummary(token, id);
  }

  @ApiOperation({ summary: "Download the tenant's own lease: scanned paper contract from object storage" })
  @Get("contracts/:id/scan")
  async contractScan(
    @Param("id", ParseIntPipe) id: number,
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const file = await this.tenantPortalService.getPublicContractScan(token, id);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Download the tenant's own lease: printable HTML of the e-signed contract" })
  @Get("contracts/:id/print")
  async contractPrint(
    @Param("id", ParseIntPipe) id: number,
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const html = await this.tenantPortalService.getPublicContractPrintable(token, id);
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    });
    return html;
  }

  @ApiOperation({ summary: "Submit a personal data change request (pending manager approval)" })
  @Post("change-request")
  submitChangeRequest(@Query("token") token: string, @Body() body: Record<string, unknown>) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.tenantPortalService.submitChangeRequest(token, body);
  }

  // Throttle dedie : route d'ecriture publique sans mot de passe, meme garde
  // que DelegatePortalPublicController (20 req/min) pour limiter l'abus d'un
  // token devine ou partage.
  @ApiOperation({ summary: "Upload a payment proof (image/PDF) for one of the tenant's own payments" })
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor("proof", {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      // Controle definitif fait par saveValidatedUploadFile (signature reelle
      // du fichier) ; ce filtre n'ecarte que tot les types manifestement
      // non voulus, meme pattern que DelegatePortalPublicController.
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
    },
  }))
  @Post("payments/:id/proof")
  uploadPaymentProof(
    @Param("id", ParseIntPipe) id: number,
    @Query("token") token: string,
    @UploadedFile() proof: any,
    @Req() req: Request,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    if (!proof) throw new BadRequestException("Fichier requis.");
    return this.tenantPortalService.submitPaymentProof(token, id, proof, this.publicApiBase(req));
  }

  // Meme logique que DelegatePortalPublicController.publicApiBase : construit
  // l'URL publique de /uploads a partir des en-tetes proxy (nginx/middleware)
  // pour que le lien renvoye au navigateur soit resolvable depuis l'exterieur.
  private publicApiBase(req: Request): string {
    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
    const proto = pickFirst(req.headers["x-forwarded-proto"]);
    const host = pickFirst(req.headers["x-forwarded-host"]) ?? req.headers.host;
    if (proto && host) return `${proto}://${host}/api`;
    return `${req.protocol}://${req.headers.host}`;
  }
}
