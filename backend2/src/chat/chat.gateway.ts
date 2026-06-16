import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

@WebSocketGateway({ namespace: "/chat", cors: { origin: "*" } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<number, string>(); // userId → socketId

  constructor(private readonly svc: ChatService) {}

  handleConnection(client: Socket) {}
  handleDisconnect(client: Socket) {
    for (const [uid, sid] of this.userSockets) {
      if (sid === client.id) { this.userSockets.delete(uid); break; }
    }
  }

  // Enregistrer l'utilisateur et rejoindre ses channels
  @SubscribeMessage("register")
  async handleRegister(@MessageBody() data: { userId: number }, @ConnectedSocket() client: Socket) {
    this.userSockets.set(data.userId, client.id);
    const channels = await this.svc.getChannels(data.userId);
    for (const ch of channels) {
      const disc = await this.svc.getOrCreateChannelDiscussion(ch.id, data.userId);
      client.join(`disc:${disc.id}`);
    }
    client.emit("registered", { userId: data.userId });
  }

  // Rejoindre une room de discussion spécifique
  @SubscribeMessage("joinRoom")
  handleJoin(@MessageBody() data: { discussionId: number }, @ConnectedSocket() client: Socket) {
    client.join(`disc:${data.discussionId}`);
    client.emit("joined", { discussionId: data.discussionId });
  }

  @SubscribeMessage("leaveRoom")
  handleLeave(@MessageBody() data: { discussionId: number }, @ConnectedSocket() client: Socket) {
    client.leave(`disc:${data.discussionId}`);
  }

  // Envoyer un message
  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: { discussionId: number; userId: number; content: string; mentions?: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const msg = await this.svc.sendMessage(data.discussionId, data.userId, data.content, data.mentions ?? []);

    // Diffuser dans la room
    this.server.to(`disc:${data.discussionId}`).emit("newMessage", { ...msg, discussionId: data.discussionId });

    // Notification aux mentionnés hors room
    for (const uid of (data.mentions ?? [])) {
      const sid = this.userSockets.get(uid);
      if (sid) {
        this.server.to(sid).emit("notification", {
          type: "mention",
          discussionId: data.discussionId,
          from: `${msg.firstName} ${msg.lastName}`,
          preview: data.content.slice(0, 80),
        });
      }
    }

    return msg;
  }

  // Indicateur de frappe
  @SubscribeMessage("typing")
  handleTyping(
    @MessageBody() data: { discussionId: number; userId: number; firstName: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`disc:${data.discussionId}`).emit("userTyping", {
      userId: data.userId,
      firstName: data.firstName,
      discussionId: data.discussionId,
    });
  }
}
