import { BadRequestException, Body, Controller, Get, Header, Ip, Param, ParseIntPipe, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { BatiproService } from "./batipro.service";
import { SubmitSubcontractorDocumentDto } from "./dto/batipro.dto";

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
