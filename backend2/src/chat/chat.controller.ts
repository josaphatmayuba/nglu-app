import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { ChatService } from "./chat.service";

@ApiTags("chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly svc: ChatService) {}

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
}
