import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { ChatService } from "./chat.service";
import { CallService } from "./call.service";
import { TurnCredentialsService } from "./turn-credentials.service";
import { ObjectStorageService } from "../property-management/object-storage.service";

@ApiTags("chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(
    private readonly svc: ChatService,
    private readonly calls: CallService,
    private readonly turn: TurnCredentialsService,
    private readonly storage: ObjectStorageService,
  ) {}

  // ── Channels ────────────────────────────────────────────────────────────────
  @Get("channels")
  @ApiOperation({ summary: "Mes channels (rejoints + defaults)" })
  getChannels(@CurrentUserId() userId: number) {
    return this.svc.getChannels(userId);
  }

  @Get("channels/all")
  getAllChannels() { return this.svc.getAllChannels(); }

  @Post("channels")
  @ApiOperation({ summary: "Créer un channel" })
  createChannel(
    @CurrentUserId() userId: number,
    @Body() body: { slug: string; name: string; description?: string; icon?: string; color?: string; isDefault?: boolean },
  ) {
    return this.svc.createChannel({ ...body, createdBy: userId });
  }

  @Post("channels/:id/join")
  joinChannel(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.joinChannel(id, userId);
  }

  @Get("channels/:id/members")
  getMembers(@Param("id", ParseIntPipe) id: number) {
    return this.svc.getChannelMembers(id);
  }

  @Get("channels/:id/discussion")
  @ApiOperation({ summary: "Discussion principale du channel" })
  getChannelDiscussion(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.getOrCreateChannelDiscussion(id, userId);
  }

  // ── Sujets (événements + tickets avec discussion) ───────────────────────────
  @Get("topics")
  @ApiOperation({ summary: "Sujets de discussion (events + tickets)" })
  getTopics(@CurrentUserId() userId: number, @Query("type") type?: string, @Query("q") q?: string) {
    return this.svc.getTopics(userId, { q, type });
  }

  // ── Messages ────────────────────────────────────────────────────────────────
  @Get("messages/:discussionId")
  getMessages(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
    @Query("beforeId") beforeId?: string,
  ) {
    return this.svc.getMessages(discussionId, userId, 60, beforeId ? parseInt(beforeId) : undefined);
  }

  @Post("messages/:discussionId")
  sendMessage(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
    @Body() body: { content: string; mentions?: number[] },
  ) {
    return this.svc.sendMessage(discussionId, userId, body.content, body.mentions);
  }

  // ── Utilisateurs (@mention) ─────────────────────────────────────────────────
  @Get("users")
  getUsers() { return this.svc.getUsers(); }

  // ── Appels audio ────────────────────────────────────────────────────────────
  @Get("ice-servers")
  @ApiOperation({ summary: "Serveurs ICE (STUN/TURN) pour établir un appel WebRTC" })
  getIceServers(@CurrentUserId() userId: number) {
    // Credentials TURN éphémères : à rafraîchir avant expiration côté client.
    return {
      iceServers: this.turn.getIceServers(userId),
      ttlSeconds: this.turn.getTtlSeconds(),
    };
  }

  @Get("calls/:discussionId")
  @ApiOperation({ summary: "Historique des appels d'une discussion" })
  async getCallHistory(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
  ) {
    await this.svc.assertDiscussionAccess(discussionId, userId);
    return this.calls.getCallHistory(discussionId);
  }

  // ── Messages vocaux ─────────────────────────────────────────────────────────
  // Complément de l'appel temps réel : sur réseau très faible, un vocal finit
  // toujours par passer là où une connexion WebRTC ne s'établit pas.

  @Post("voice/:discussionId")
  @ApiOperation({ summary: "Envoyer un message vocal" })
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async sendVoiceMessage(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
    @UploadedFile() file: any,
    @Body() body: { durationSec?: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException("Aucun fichier audio reçu.");

    // Le type MIME réel est vérifié par signature binaire dans putAudio().
    const stored = await this.storage.putAudio(file, `chat/voice/${discussionId}`);
    const durationSec = Math.max(0, Math.min(600, parseInt(body?.durationSec ?? "0", 10) || 0));

    return this.svc.createVoiceMessage(discussionId, userId, {
      objectKey: stored.objectKey,
      name: file.originalname || "message vocal",
      durationSec,
    });
  }

  @Get("voice/:messageId/file")
  @ApiOperation({ summary: "Lire un message vocal" })
  async getVoiceFile(
    @Param("messageId", ParseIntPipe) messageId: number,
    @CurrentUserId() userId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const objectKey = await this.svc.getVoiceObjectKey(messageId, userId);
    const file = await this.storage.getObject(objectKey);

    res.set({
      "Content-Type": file.contentType || "audio/webm",
      // Cache long : un vocal est immuable, inutile de le retélécharger
      // — décisif sur les forfaits data limités.
      "Cache-Control": "private, max-age=31536000, immutable",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body as any);
  }
}
