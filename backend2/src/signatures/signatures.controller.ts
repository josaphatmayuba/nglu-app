import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateSignatureRequestDto, SignDto } from "./dto/signatures.dto";
import { SignaturesService } from "./signatures.service";

/** Cote admin : creer un lien et consulter les signatures deposees. */
@ApiTags("signatures")
@ApiBearerAuth()
@Controller("signature-requests")
@UseGuards(JwtAuthGuard)
export class SignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @ApiOperation({ summary: "Cree une demande de signature et son lien public" })
  @Post()
  create(
    @Body() body: CreateSignatureRequestDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.signatures.create(body, orgId, userId);
  }

  @ApiOperation({ summary: "Liste des demandes de signature" })
  @ApiOkResponse({ description: "Demandes" })
  @Get()
  list(@CurrentOrg() orgId: number) {
    return this.signatures.list(orgId);
  }

  @ApiOperation({ summary: "Detail d'une demande, signatures incluses" })
  @ApiParam({ name: "id", type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.signatures.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Desactive une demande (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.signatures.deactivate(id, orgId);
  }
}

/**
 * Page publique ouverte par le lien : aucun JWT, le token porte l'autorisation.
 * Volontairement limite a lire la demande et deposer une signature.
 */
@ApiTags("signatures-public")
@Controller("public/signature")
export class PublicSignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @ApiOperation({ summary: "Contenu a signer, resolu par le token du lien" })
  @Get(":token")
  show(@Param("token") token: string) {
    return this.signatures.findByToken(token);
  }

  @ApiOperation({ summary: "Depose une signature manuscrite" })
  @Post(":token/sign")
  sign(
    @Param("token") token: string,
    @Body() body: SignDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.signatures.sign(token, body, { ip, userAgent });
  }
}
