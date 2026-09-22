// Route publique du portail proprietaire (/domus/proprietaire?token=...).
// Lecture seule : contrairement au portail locataire, aucune route d'ecriture
// n'est exposee — le proprietaire consulte, il ne modifie rien.
import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
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
}
