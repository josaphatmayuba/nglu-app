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
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { DelegatePortalService } from "./delegate-portal.service";

@Throttle({ default: { ttl: 60000, limit: 20 } })
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
      // Le controle definitif (signature reelle du fichier) est fait par
      // ObjectStorageService.putDocument, APRES verification du token dans le
      // service : ce filtre ne fait qu ecarter tot les types manifestement non
      // voulus, il n'ecrit jamais sur disque.
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
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    // Le fichier n'est plus ecrit avant verification : il est transmis tel
    // quel au service, qui ne l'enverra sur MinIO qu'APRES avoir resolu et
    // valide le token (sinon un token invalide permettrait deja de deposer
    // des fichiers).
    return this.delegatePortalService.submitRentCheck(token, body, proof);
  }
}
