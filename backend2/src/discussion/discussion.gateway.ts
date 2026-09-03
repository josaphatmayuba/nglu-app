import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { WsAuthService } from "../auth/ws-auth.service";
import { env } from "../config/env";
import { DiscussionService } from "./discussion.service";

const socketCorsOrigins = [
  ...String(env.corsOrigin).split(",").map((origin) => origin.trim()).filter(Boolean),
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

@WebSocketGateway({ namespace: "/discussion", cors: { origin: socketCorsOrigins, credentials: true } })
export class DiscussionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly svc: DiscussionService,
    private readonly wsAuth: WsAuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const auth = await this.wsAuth.authenticate(client);
      client.data.userId = auth.userId;
      client.data.organizationId = auth.organizationId;
      client.data.roleId = auth.roleId;
    } catch {
      client.emit("unauthorized", { message: "Authentification requise." });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => client.leave(room));
  }

  @SubscribeMessage("joinDiscussion")
  async handleJoin(
    @MessageBody() data: { discussionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    await this.svc.markAllRead(data.discussionId, userId);
    client.join(`discussion:${data.discussionId}`);
    client.emit("joined", { discussionId: data.discussionId });
  }

  @SubscribeMessage("leaveDiscussion")
  async handleLeave(
    @MessageBody() data: { discussionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    client.leave(`discussion:${data.discussionId}`);
  }

  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: {
      discussionId: number;
      content: string;
      mentions?: number[];
      attachmentUrl?: string;
      attachmentName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const msg = await this.svc.sendMessage(
      data.discussionId,
      userId,
      data.content,
      data.mentions,
      data.attachmentUrl,
      data.attachmentName,
    );

    this.server.to(`discussion:${data.discussionId}`).emit("newMessage", msg);

    const participants = await this.svc.getParticipants(data.discussionId, userId);
    for (const participant of participants) {
      if (participant.user_id !== userId) {
        this.server.emit(`notification:${participant.user_id}`, {
          type: "new_message",
          discussionId: data.discussionId,
          preview: data.content.slice(0, 60),
          senderFirstName: msg.firstName,
          senderLastName: msg.lastName,
        });
      }
    }

    return msg;
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @MessageBody() data: { discussionId: number; firstName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    client.to(`discussion:${data.discussionId}`).emit("userTyping", {
      userId,
      firstName: data.firstName,
    });
  }

  private async authenticatedUserId(client: Socket) {
    const userId = Number(client.data.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      try {
        const auth = await this.wsAuth.authenticate(client);
        client.data.userId = auth.userId;
        client.data.organizationId = auth.organizationId;
        client.data.roleId = auth.roleId;
        return auth.userId;
      } catch {
        client.emit("unauthorized", { message: "Authentification requise." });
        client.disconnect(true);
        return undefined;
      }
    }
    return userId;
  }
}
