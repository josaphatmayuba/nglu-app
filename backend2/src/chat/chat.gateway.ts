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
import { ChatService } from "./chat.service";

const socketCorsOrigins = [
  ...String(env.corsOrigin).split(",").map((origin) => origin.trim()).filter(Boolean),
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

@WebSocketGateway({ namespace: "/chat", cors: { origin: socketCorsOrigins, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<number, string>();

  constructor(
    private readonly svc: ChatService,
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
    for (const [userId, socketId] of this.userSockets) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage("register")
  async handleRegister(@ConnectedSocket() client: Socket) {
    const userId = this.authenticatedUserId(client);
    this.userSockets.set(userId, client.id);

    const channels = await this.svc.getChannels(userId);
    for (const channel of channels) {
      const discussion = await this.svc.getOrCreateChannelDiscussion(channel.id, userId);
      client.join(`disc:${discussion.id}`);
    }
    client.emit("registered", { userId });
  }

  @SubscribeMessage("joinRoom")
  async handleJoin(@MessageBody() data: { discussionId: number }, @ConnectedSocket() client: Socket) {
    const userId = this.authenticatedUserId(client);
    await this.svc.assertDiscussionAccess(data.discussionId, userId);
    client.join(`disc:${data.discussionId}`);
    client.emit("joined", { discussionId: data.discussionId });
  }

  @SubscribeMessage("leaveRoom")
  handleLeave(@MessageBody() data: { discussionId: number }, @ConnectedSocket() client: Socket) {
    this.authenticatedUserId(client);
    client.leave(`disc:${data.discussionId}`);
  }

  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: { discussionId: number; content: string; mentions?: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const msg = await this.svc.sendMessage(data.discussionId, userId, data.content, data.mentions ?? []);

    this.server.to(`disc:${data.discussionId}`).emit("newMessage", { ...msg, discussionId: data.discussionId });

    for (const mentionedUserId of (data.mentions ?? [])) {
      const socketId = this.userSockets.get(mentionedUserId);
      if (socketId) {
        this.server.to(socketId).emit("notification", {
          type: "mention",
          discussionId: data.discussionId,
          from: `${msg.firstName} ${msg.lastName}`,
          preview: data.content.slice(0, 80),
        });
      }
    }

    return msg;
  }

  @SubscribeMessage("typing")
  handleTyping(
    @MessageBody() data: { discussionId: number; firstName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    client.to(`disc:${data.discussionId}`).emit("userTyping", {
      userId,
      firstName: data.firstName,
      discussionId: data.discussionId,
    });
  }

  private authenticatedUserId(client: Socket) {
    const userId = Number(client.data.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      client.emit("unauthorized", { message: "Authentification requise." });
      client.disconnect(true);
      throw new Error("Unauthenticated socket");
    }
    return userId;
  }
}
