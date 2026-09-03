import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperOwnerGuard } from "../auth/guards/super-owner.guard";
import { WhatsappService } from "./whatsapp.service";

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  jid!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}

// Reserve au super_owner : la session bot est partagee pour toute la plateforme,
// pas un reglage par organisation.
@ApiTags("whatsapp")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperOwnerGuard)
@Controller("whatsapp")
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get("status")
  @ApiOperation({ summary: "Statut de la session bot WhatsApp" })
  getStatus() {
    return { status: this.whatsapp.getStatus() };
  }

  @Get("qr")
  @ApiOperation({ summary: "QR code a scanner pour connecter le bot (data URL image)" })
  async getQr() {
    const qr = await this.whatsapp.getQrDataUrl();
    return { qr };
  }

  @Get("groups")
  @ApiOperation({ summary: "Liste des groupes WhatsApp dont le bot est membre" })
  listGroups() {
    return this.whatsapp.listGroups();
  }

  @Post("send")
  @ApiOperation({ summary: "Envoie un message texte vers un groupe/contact WhatsApp (test manuel)" })
  send(@Body() body: SendMessageDto) {
    return this.whatsapp.sendMessage(body.jid, body.text);
  }
}
