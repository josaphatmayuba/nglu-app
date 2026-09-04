import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsBase64, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { InternalSecretGuard } from "./internal-secret.guard";
import { WhatsappService } from "./whatsapp.service";

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  jid!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;
}

class SendImageDto {
  @IsString()
  @IsNotEmpty()
  jid!: string;

  // Image envoyee en base64 dans le JSON : le plus simple a appeler depuis
  // backend2 en HTTP interne (pas de multipart a gerer des deux cotes).
  @IsBase64()
  @IsNotEmpty()
  imageBase64!: string;

  @IsString()
  @IsOptional()
  caption?: string;
}

// Service interne uniquement (appele par backend2 en HTTP direct), protege
// par un secret partage (voir InternalSecretGuard) — pas de whitelist
// middleware necessaire ici, ce service ne passe pas par /api.
@UseGuards(InternalSecretGuard)
@Controller()
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get("status")
  getStatus() {
    return { status: this.whatsapp.getStatus() };
  }

  @Get("qr")
  async getQr() {
    const qr = await this.whatsapp.getQrDataUrl();
    return { qr };
  }

  @Get("groups")
  listGroups() {
    return this.whatsapp.listGroups();
  }

  @Post("send")
  send(@Body() body: SendMessageDto) {
    return this.whatsapp.sendMessage(body.jid, body.text);
  }

  @Post("send-image")
  sendImage(@Body() body: SendImageDto) {
    const buffer = Buffer.from(body.imageBase64, "base64");
    return this.whatsapp.sendImage(body.jid, buffer, body.caption);
  }
}
