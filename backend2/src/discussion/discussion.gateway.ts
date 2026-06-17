import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { DiscussionService } from "./discussion.service";

@WebSocketGateway({ namespace: "/discussion", cors: { origin: "*" } })
export class DiscussionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly svc: DiscussionService) {}

  handleConnection(client: Socket) {
    // Le client rejoindra les rooms via joinDiscussion
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => client.leave(room));
  }

  // Rejoindre une room de discussion
  @SubscribeMessage("joinDiscussion")
  async handleJoin(
    @MessageBody() data: { discussionId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `discussion:${data.discussionId}`;
    client.join(room);
    await this.svc.markAllRead(data.discussionId, data.userId);
    client.emit("joined", { discussionId: data.discussionId });
  }

  // Quitter une room
  @SubscribeMessage("leaveDiscussion")
  handleLeave(
    @MessageBody() data: { discussionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`discussion:${data.discussionId}`);
  }

  // Envoyer un message via WebSocket
  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: {
      discussionId: number;
      userId: number;
      content: string;
      mentions?: number[];
      attachmentUrl?: string;
      attachmentName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const msg = await this.svc.sendMessage(
      data.discussionId,
      data.userId,
      data.content,
      data.mentions,
      data.attachmentUrl,
      data.attachmentName,
    );

    // Diffuser à tous dans la room (incluant expéditeur)
    this.server.to(`discussion:${data.discussionId}`).emit("newMessage", msg);

    // Notifier les participants hors room (badge unread)
    const participants = await this.svc.getParticipants(data.discussionId);
    for (const p of participants) {
      if (p.user_id !== data.userId) {
        this.server.emit(`notification:${p.user_id}`, {
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

  // Indicateur "en train d'écrire"
  @SubscribeMessage("typing")
  handleTyping(
    @MessageBody() data: { discussionId: number; userId: number; firstName: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`discussion:${data.discussionId}`).emit("userTyping", {
      userId: data.userId,
      firstName: data.firstName,
    });
  }
}
