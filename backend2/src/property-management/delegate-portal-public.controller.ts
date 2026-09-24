// Route publique du portail delegue (/domus/delegue?token=...).
//
// Contrairement au portail proprietaire (strictement en lecture), ce portail
// expose UNE route d ecriture : la reponse du delegue a une relance de loyer.
// Cette ecriture reste volontairement inoffensive pour la comptabilite — elle
// cree une ligne de paiement en statut 'pending' que le gestionnaire doit
// valider — parce que le lien n est protege par aucun mot de passe. Voir le
// bloc de tete de DelegatePortalService.
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { join } from "path";
import { IMAGE_OR_PDF_MIME_TYPES, saveValidatedUploadFile } from "../common/upload-security";
import { DelegatePortalService } from "./delegate-portal.service";

@ApiTags("delegate-portal")
@Controller("delegate-portal")
export class DelegatePortalPublicController {
  constructor(private readonly delegatePortalService: DelegatePortalService) {}

  @ApiOperation({ summary: "Get the rent check to answer, by token (no auth, token opaque in URL)" })
  @Get()
  getByToken(@Query("token") token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    return this.delegatePortalService.getPublicRentCheck(token);
  }

  @ApiOperation({ summary: "Answer a rent check (paid/unpaid). A 'paid' answer creates a PENDING payment only." })
  @UseInterceptors(FileInterceptor("proof", {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      // Le controle definitif est fait par saveValidatedUploadFile, qui verifie
      // la signature reelle du fichier : ce filtre ne fait qu ecarter tot les
      // types manifestement non voulus.
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
    },
  }))
  @Post()
  submit(
    @Query("token") token: string,
    @Body() body: { answer?: string; amount?: string; comment?: string },
    @UploadedFile() proof: any,
    @Req() req: Request,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const proofUrl = this.saveProof(proof, this.publicApiBase(req));
    return this.delegatePortalService.submitRentCheck(token, body, proofUrl);
  }

  // Meme dossier que les preuves de paiement du CRM
  // (PropertyManagementService.uploadDir), pour que le fichier soit servi par
  // la meme route statique /uploads.
  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  /** Meme stockage et memes bornes que les preuves de paiement du CRM. */
  private saveProof(file: any, publicApiBase: string): string | null {
    if (!file?.buffer) return null;
    const { name } = saveValidatedUploadFile(file, this.uploadDir, {
      allowedMimeTypes: IMAGE_OR_PDF_MIME_TYPES,
      prefix: "delegate-proof",
      maxBytes: 5 * 1024 * 1024,
    });
    return `${publicApiBase}/uploads/${name}`;
  }

  private publicApiBase(req: Request): string {
    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
    const proto = pickFirst(req.headers["x-forwarded-proto"]);
    const host = pickFirst(req.headers["x-forwarded-host"]) ?? req.headers.host;
    if (proto && host) return `${proto}://${host}/api`;
    return `${req.protocol}://${req.headers.host}`;
  }
}
