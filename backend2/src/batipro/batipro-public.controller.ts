import { BadRequestException, Body, Controller, Get, Header, Ip, Param, ParseIntPipe, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { BatiproShareService } from "./batipro-share.service";
import { BatiproStatementService } from "./batipro-statement.service";
import { BatiproService } from "./batipro.service";
import { EngineerPhaseUpdateDto, ReceiveBatiproDocumentDto, SubmitSubcontractorDocumentDto } from "./dto/batipro.dto";

// Dates YYYY-MM-DD seulement ; le reste est ignore.
const isoDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// Portail sous-traitant : soumission entrante SANS compte. L'autorisation vient
// du token opaque dans l'URL (jamais un JWT). Sans guard, mais throttle + le
// token ne donne acces qu'a SON chantier (verifie cote service). Calque sur
// property-management/contracts-public + property-management-public.
@Throttle({ default: { ttl: 60000, limit: 60 } })
@ApiTags("batipro-public")
@Controller("batipro/public/submit")
export class BatiproPublicController {
  constructor(private readonly batipro: BatiproService) {}

  @ApiOperation({ summary: "Contexte d'un lien sous-traitant (public — token opaque)" })
  @ApiParam({ name: "token", type: String })
  @Get(":token")
  context(@Param("token") token: string) {
    return this.batipro.getSubcontractorLinkContext(token);
  }

  @ApiOperation({ summary: "Soumettre un document (public — token opaque)" })
  @ApiParam({ name: "token", type: String })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post(":token")
  submit(@Param("token") token: string, @Body() body: SubmitSubcontractorDocumentDto) {
    return this.batipro.submitSubcontractorDocument(token, body);
  }

  @ApiOperation({ summary: "Attacher un fichier (PDF/image) a une soumission (public — token opaque)" })
  @ApiParam({ name: "token", type: String })
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
    },
  }))
  @Post(":token/file/:documentId")
  attachFile(
    @Param("token") token: string,
    @Param("documentId", ParseIntPipe) documentId: number,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier.");
    return this.batipro.attachSubcontractorFile(token, documentId, file);
  }
}

// Acces client public par token (devis sortant). Voir le devis (HTML) + accepter.
// Sans guard : l'autorisation = le token opaque dans l'URL. Throttle + audit IP/UA.
@Throttle({ default: { ttl: 60000, limit: 60 } })
@ApiTags("batipro-public")
@Controller("batipro/public/documents")
export class BatiproPublicDocumentsController {
  constructor(private readonly batipro: BatiproService) {}

  @ApiOperation({ summary: "Voir un devis client (public — token opaque, rend le HTML)" })
  @ApiParam({ name: "token", type: String })
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  // Surcharge le CSP global (frame-ancestors 'none' pose par Helmet) : cette page
  // est concue pour etre chargee dans l'iframe de ClientDocument.jsx, meme origine.
  @Header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self'")
  @Get(":token")
  view(@Param("token") token: string) {
    return this.batipro.publicDocumentHtml(token);
  }

  @ApiOperation({ summary: "Accepter un devis (public — token opaque)" })
  @ApiParam({ name: "token", type: String })
  @Post(":token/accept")
  accept(@Param("token") token: string, @Ip() ip: string, @Req() req: Request) {
    return this.batipro.acceptDocument(token, { ip, ua: req.headers["user-agent"] });
  }
}

// Suivi financier public d'un chantier pour le proprietaire (lecture seule).
// Autorisation = jeton opaque (hache en base). Aucune route d'ecriture.
@Throttle({ default: { ttl: 60000, limit: 60 } })
@ApiTags("batipro-public")
@Controller("batipro/public/tracking")
export class BatiproPublicTrackingController {
  constructor(private readonly share: BatiproShareService, private readonly stmt: BatiproStatementService) {}

  private send(res: Response, file: { body: any; contentType: string; contentLength?: number }) {
    res.set({
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": file.contentType === "application/octet-stream" ? "attachment" : "inline",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Suivi financier du chantier (public — token opaque)" })
  @ApiParam({ name: "token", type: String })
  @Header("Cache-Control", "no-store")
  @Get(":token")
  tracking(@Param("token") token: string) {
    return this.share.getPublicTracking(token);
  }

  @ApiOperation({ summary: "Releve complet du chantier (public — token proprietaire)" })
  @ApiParam({ name: "token", type: String })
  @Header("Cache-Control", "no-store")
  @Get(":token/statement")
  statement(@Param("token") token: string, @Query("from") from?: string, @Query("to") to?: string, @Query("category") category?: string) {
    return this.stmt.getOwnerStatement(token, { from: isoDay(from), to: isoDay(to), category: category || null });
  }

  @ApiOperation({ summary: "Photo du chantier ou d'une facture de CE chantier (stream verifie)" })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Get(":token/photos/:photoId")
  async photo(@Param("token") token: string, @Param("photoId", ParseIntPipe) photoId: number, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.share.getPublicPhoto(token, photoId));
  }

  @ApiOperation({ summary: "Fichier joint d'une facture fournisseur de CE chantier (stream verifie)" })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Get(":token/invoices/:documentId/attachment")
  async invoiceAttachment(@Param("token") token: string, @Param("documentId", ParseIntPipe) documentId: number, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.share.getPublicInvoiceAttachment(token, documentId));
  }
}

function sendStream(res: Response, file: { body: any; contentType: string; contentLength?: number }) {
  res.set({
    "Content-Type": file.contentType,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": file.contentType === "application/octet-stream" ? "attachment" : "inline",
    ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
  });
  return new StreamableFile(file.body);
}

// Lien ingenieur / responsable de chantier (sans compte). Autorisation = jeton
// opaque de type "engineer" (un jeton proprietaire est refuse ici, et inversement).
// Ecritures limitees : avancement de phase, photo de chantier, reception de BC.
@Throttle({ default: { ttl: 60000, limit: 60 } })
@ApiTags("batipro-public")
@Controller("batipro/public/site")
export class BatiproPublicSiteController {
  constructor(private readonly share: BatiproShareService, private readonly stmt: BatiproStatementService) {}

  @ApiOperation({ summary: "Vue chantier pour l'ingenieur (public — token opaque)" })
  @ApiParam({ name: "token", type: String })
  @Header("Cache-Control", "no-store")
  @Get(":token")
  site(@Param("token") token: string) {
    return this.share.getEngineerSite(token);
  }

  @ApiOperation({ summary: "Releve des sorties du chantier, sans fonds ni solde (public — token ingenieur)" })
  @ApiParam({ name: "token", type: String })
  @Header("Cache-Control", "no-store")
  @Get(":token/statement")
  statement(@Param("token") token: string, @Query("from") from?: string, @Query("to") to?: string, @Query("category") category?: string) {
    return this.stmt.getEngineerStatement(token, { from: isoDay(from), to: isoDay(to), category: category || null });
  }

  @ApiOperation({ summary: "Mettre a jour avancement/statut d'une phase (public — token opaque)" })
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Put(":token/phases/:phaseId")
  updatePhase(@Param("token") token: string, @Param("phaseId", ParseIntPipe) phaseId: number, @Body() body: EngineerPhaseUpdateDto) {
    return this.share.updatePhaseFromLink(token, phaseId, body);
  }

  @ApiOperation({ summary: "Ajouter une photo de chantier (public — token opaque)" })
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP."), false);
    },
  }))
  @Post(":token/photos")
  uploadPhoto(@Param("token") token: string, @UploadedFile() file: any, @Body("caption") caption?: string) {
    if (!file) throw new BadRequestException("Aucun fichier.");
    return this.share.uploadPhotoFromLink(token, file, typeof caption === "string" ? caption : undefined);
  }

  @ApiOperation({ summary: "Receptionner un bon de commande (public — token opaque)" })
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post(":token/orders/:documentId/receive")
  receive(@Param("token") token: string, @Param("documentId", ParseIntPipe) documentId: number, @Body() body: ReceiveBatiproDocumentDto) {
    return this.share.receiveFromLink(token, documentId, body);
  }

  @ApiOperation({ summary: "Photo du chantier (stream verifie)" })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Get(":token/photos/:photoId")
  async photo(@Param("token") token: string, @Param("photoId", ParseIntPipe) photoId: number, @Res({ passthrough: true }) res: Response) {
    return sendStream(res, await this.share.getPublicPhoto(token, photoId, "engineer"));
  }

  @ApiOperation({ summary: "Fichier joint d'une facture fournisseur (stream verifie)" })
  @Throttle({ default: { ttl: 60000, limit: 300 } })
  @Get(":token/invoices/:documentId/attachment")
  async invoiceAttachment(@Param("token") token: string, @Param("documentId", ParseIntPipe) documentId: number, @Res({ passthrough: true }) res: Response) {
    return sendStream(res, await this.share.getPublicInvoiceAttachment(token, documentId, "engineer"));
  }
}

// Resolution d'un code court (SMS) : renvoie seulement le type de page a ouvrir.
// Le code sert ensuite de jeton aux routes tracking/site (memes controles).
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("batipro-public")
@Controller("batipro/public/short")
export class BatiproPublicShortController {
  constructor(private readonly share: BatiproShareService) {}

  @ApiOperation({ summary: "Type de lien derriere un code court (public)" })
  @ApiParam({ name: "code", type: String })
  @Header("Cache-Control", "no-store")
  @Get(":code")
  kind(@Param("code") code: string) {
    return this.share.getShortCodeKind(code);
  }
}
