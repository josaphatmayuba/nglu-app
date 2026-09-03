import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CreatePublicOrderDto } from "./dto/public.dto";
import { PublicService } from "./public.service";

// SCRUM-296 (KodaTill Phase 3) : surface publique sans JWT, consultee par le
// client final apres scan d'un QR code de table. Autorisation = orgSlug +
// publicToken resolus cote service (jamais @CurrentOrg, qui depend du JWT).
// Throttle aligne sur le precedent batipro/public (60 req/min) : pas de
// mecanisme de rate-limit dedie plus fin dans ce projet a ce jour — limitation
// acceptee pour cette phase (voir commentaire PublicService).
@Throttle({ default: { ttl: 60000, limit: 60 } })
@ApiTags("kodatill-public")
@Controller("kodatill/public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @ApiOperation({ summary: "Menu public d'une organisation (scan QR, sans compte)" })
  @ApiParam({ name: "orgSlug", type: String })
  @ApiParam({ name: "qrToken", type: String })
  @ApiOkResponse({ description: "Succursale, categories et produits disponibles" })
  @Get("menu/:orgSlug/:qrToken")
  getMenu(
    @Param("orgSlug") orgSlug: string,
    @Param("qrToken") qrToken: string,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.publicService.getMenu(orgSlug, qrToken, userAgent);
  }

  @ApiOperation({ summary: "Cree une commande depuis le canal QR (public, idempotent via clientUuid)" })
  @ApiCreatedResponse({ description: "Commande creee ou existante (idempotence)" })
  @Post("orders")
  createOrder(@Body() body: CreatePublicOrderDto, @Headers("user-agent") userAgent?: string) {
    return this.publicService.createOrder(body, userAgent);
  }

  @ApiOperation({ summary: "Suivi d'une commande publique par sa reference (sans compte)" })
  @ApiParam({ name: "publicRef", type: String })
  @Get("orders/:publicRef")
  getOrder(@Param("publicRef") publicRef: string) {
    return this.publicService.getOrderByPublicRef(publicRef);
  }
}
