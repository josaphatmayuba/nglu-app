import {
  Body, Controller, Get, Param, ParseIntPipe,
  Post, Query, UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { DiscussionService } from "./discussion.service";

@ApiTags("discussions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("discussions")
export class DiscussionController {
  constructor(private readonly svc: DiscussionService) {}

  // Obtenir (ou créer) la discussion pour une entité
  @Get(":entityType/:entityId")
  @ApiOperation({ summary: "Discussion d'une entité (crée si inexistante)" })
  getOrCreate(
    @Param("entityType") entityType: string,
    @Param("entityId", ParseIntPipe) entityId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.svc.getOrCreateDiscussion(entityType, entityId, userId);
  }

  // Messages paginés
  @Get(":discussionId/messages")
  @ApiOperation({ summary: "Messages d'une discussion (50 derniers)" })
  getMessages(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
    @Query("beforeId") beforeId?: string,
  ) {
    return this.svc.getMessages(discussionId, userId, 50, beforeId ? parseInt(beforeId) : undefined);
  }

  // Envoyer un message (fallback REST si WebSocket indisponible)
  @Post(":discussionId/messages")
  @ApiOperation({ summary: "Envoyer un message" })
  sendMessage(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
    @Body() body: { content: string; mentions?: number[]; attachmentUrl?: string; attachmentName?: string },
  ) {
    return this.svc.sendMessage(
      discussionId, userId, body.content,
      body.mentions, body.attachmentUrl, body.attachmentName,
    );
  }

  // Marquer tout lu
  @Post(":discussionId/read")
  @ApiOperation({ summary: "Marquer tous les messages comme lus" })
  markAllRead(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.svc.markAllRead(discussionId, userId);
  }

  // Participants
  @Get(":discussionId/participants")
  getParticipants(@Param("discussionId", ParseIntPipe) discussionId: number) {
    return this.svc.getParticipants(discussionId);
  }

  @Post(":discussionId/participants")
  addParticipant(
    @Param("discussionId", ParseIntPipe) discussionId: number,
    @Body() body: { userId: number },
  ) {
    return this.svc.addParticipant(discussionId, body.userId);
  }

  // Unread badge par entité
  @Get("unread/:entityType/:entityId")
  @ApiOperation({ summary: "Nombre de messages non lus pour une entité" })
  getUnread(
    @Param("entityType") entityType: string,
    @Param("entityId", ParseIntPipe) entityId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.svc.getUnreadCount(entityType, entityId, userId);
  }
}
