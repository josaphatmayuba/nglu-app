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
import { CallService, type CallEndReason } from "./call.service";

const socketCorsOrigins = [
  ...String(env.corsOrigin).split(",").map((origin) => origin.trim()).filter(Boolean),
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

const ULTRA_PROTOCOL_VERSION = 1;
const ULTRA_MODE_700C = 8;
const ULTRA_FRAME_BYTES = 4;
const ULTRA_PACKET_HEADER_BYTES = 8;
const ULTRA_MAX_FRAMES_PER_PACKET = 5;
const ULTRA_MAX_PACKET_BYTES = ULTRA_PACKET_HEADER_BYTES + ULTRA_FRAME_BYTES * ULTRA_MAX_FRAMES_PER_PACKET;
const ULTRA_MAX_FRAMES_PER_SECOND = 75;

@WebSocketGateway({ namespace: "/chat", cors: { origin: socketCorsOrigins, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  // Un utilisateur peut avoir plusieurs sockets simultanes (onglets, mobile +
  // desktop). Indispensable pour les appels : une Map mono-socket enverrait la
  // sonnerie sur le mauvais appareil apres l'ouverture d'un second onglet.
  private userSockets = new Map<number, Set<string>>();
  private ultraRate = new Map<string, { startedAt: number; frames: number }>();

  constructor(
    private readonly svc: ChatService,
    private readonly wsAuth: WsAuthService,
    private readonly calls: CallService,
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

  async handleDisconnect(client: Socket) {
    this.ultraRate.delete(client.id);
    for (const [userId, socketIds] of this.userSockets) {
      if (!socketIds.delete(client.id)) continue;
      if (socketIds.size === 0) this.userSockets.delete(userId);
      break;
    }

    // Deconnexion pendant un appel (fermeture d'onglet, coupure reseau) :
    // on previent l'autre participant au lieu de le laisser sonner dans le vide.
    const callId = Number(client.data.activeCallId);
    if (Number.isInteger(callId) && callId > 0) {
      await this.terminateCall(callId, Number(client.data.userId), "timeout");
    }
  }

  @SubscribeMessage("register")
  async handleRegister(@ConnectedSocket() client: Socket) {
    const userId = this.authenticatedUserId(client);
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(client.id);
    this.userSockets.set(userId, sockets);

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
      this.emitToUser(mentionedUserId, "notification", {
        type: "mention",
        discussionId: data.discussionId,
        from: `${msg.firstName} ${msg.lastName}`,
        preview: data.content.slice(0, 80),
      });
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

  // ── Appels audio (signalisation WebRTC) ─────────────────────────────────────
  //
  // Le serveur ne transporte jamais le flux audio : il ne fait que relayer les
  // messages de negociation (SDP + candidats ICE) entre les deux participants.
  // Le media circule ensuite en P2P direct, ou via le relais TURN quand le NAT
  // l'impose — cas frequent sur les reseaux mobiles d'Afrique centrale.

  /** L'appelant sonne chez l'appele. */
  @SubscribeMessage("call:invite")
  async handleCallInvite(
    @MessageBody() data: { discussionId: number; calleeId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    try {
      await this.svc.assertDiscussionAccess(data.discussionId, userId);
    } catch {
      client.emit("call:failed", { reason: "forbidden", message: "Discussion inaccessible." });
      return;
    }

    const calleeId = Number(data.calleeId);
    if (!Number.isInteger(calleeId) || calleeId <= 0 || calleeId === userId) {
      client.emit("call:failed", { reason: "invalid", message: "Destinataire invalide." });
      return;
    }

    try {
      if (!(await this.svc.getUserByIdInSameOrg(userId, calleeId))) {
        client.emit("call:failed", { reason: "invalid", message: "Destinataire invalide." });
        return;
      }
    } catch {
      client.emit("call:failed", { reason: "invalid", message: "Destinataire invalide." });
      return;
    }

    // L'appele doit avoir acces a la discussion : empeche de faire sonner
    // n'importe quel utilisateur en forgeant un calleeId.
    try {
      await this.svc.assertDiscussionAccess(data.discussionId, calleeId);
    } catch {
      client.emit("call:failed", { reason: "invalid", message: "Destinataire invalide." });
      return;
    }

    // Nettoyage prealable : sans lui, un appel fantome (client disparu sans
    // raccrocher) marquerait l'appele "occupe" de facon permanente.
    await this.calls.expireStaleCalls();

    if (await this.calls.findActiveCallFor(calleeId)) {
      client.emit("call:failed", { reason: "busy", message: "Destinataire déjà en appel." });
      return;
    }
    if (await this.calls.findActiveCallFor(userId)) {
      client.emit("call:failed", { reason: "busy", message: "Vous êtes déjà en appel." });
      return;
    }

    // Appele hors ligne : on tranche tout de suite plutot que de laisser
    // l'appelant attendre une sonnerie qui n'arrivera jamais.
    const calleeSockets = this.userSockets.get(calleeId);
    if (!calleeSockets || calleeSockets.size === 0) {
      const callId = await this.calls.createCall(data.discussionId, userId, calleeId);
      await this.calls.endCall(callId, "unavailable");
      client.emit("call:failed", { callId, reason: "unavailable", message: "Destinataire hors ligne." });
      return;
    }

    const callId = await this.calls.createCall(data.discussionId, userId, calleeId);
    client.data.activeCallId = callId;

    const caller = await this.svc.getUserByIdInSameOrg(userId, userId);
    const callerName = caller ? `${caller.firstName ?? ""} ${caller.lastName ?? ""}`.trim() : "Appel";

    this.emitToUser(calleeId, "call:incoming", {
      callId,
      discussionId: data.discussionId,
      callerId: userId,
      callerName,
    });
    client.emit("call:ringing", { callId, discussionId: data.discussionId, calleeId });
  }

  /** L'appele decroche : on autorise l'echange SDP. */
  @SubscribeMessage("call:accept")
  async handleCallAccept(
    @MessageBody() data: { callId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data.callId, userId);
    if (!call) return;

    // Seul l'appele peut accepter.
    if (call.callee_id !== userId) return;

    await this.calls.markActive(call.id);
    client.data.activeCallId = call.id;

    // L'appelant cree l'offre SDP une fois l'acceptation connue : cela evite
    // de negocier une connexion pour un appel qui sera refuse.
    this.emitToUser(call.caller_id, "call:accepted", { callId: call.id, calleeId: userId });
    client.emit("call:accepted", { callId: call.id, calleeId: userId });
  }

  /** Refus explicite de l'appele. */
  @SubscribeMessage("call:reject")
  async handleCallReject(
    @MessageBody() data: { callId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data.callId, userId);
    if (!call || call.callee_id !== userId) return;
    await this.terminateCall(call.id, userId, "rejected");
  }

  /**
   * Relais des messages de negociation WebRTC : offre SDP, reponse SDP et
   * candidats ICE. Le contenu n'est pas interprete par le serveur, seulement
   * transmis a l'autre participant apres verification d'appartenance.
   */
  @SubscribeMessage("call:signal")
  async handleCallSignal(
    @MessageBody() data: { callId: number; signal: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data.callId, userId);
    if (!call) return;

    const peerId = call.caller_id === userId ? call.callee_id : call.caller_id;
    this.emitToUser(peerId, "call:signal", {
      callId: call.id,
      fromUserId: userId,
      signal: data.signal,
    });
  }

  /** Annonce la disponibilite du transport Codec2 a l'autre participant. */
  @SubscribeMessage("call:ultra:ready")
  async handleUltraReady(
    @MessageBody() data: { callId: number; mode: number; bytesPerFrame: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data?.callId, userId);
    if (!call || call.state !== "active") return;
    if (Number(data?.mode) !== ULTRA_MODE_700C || Number(data?.bytesPerFrame) !== ULTRA_FRAME_BYTES) return;

    const peerId = call.caller_id === userId ? call.callee_id : call.caller_id;
    this.emitToUser(peerId, "call:ultra:ready", {
      callId: call.id,
      mode: ULTRA_MODE_700C,
      bytesPerFrame: ULTRA_FRAME_BYTES,
    });
  }

  /** Relaye les paquets Codec2 sans les decoder cote serveur. */
  @SubscribeMessage("call:ultra:frame")
  async handleUltraFrame(
    @MessageBody() data: { callId: number; packet: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data?.callId, userId);
    if (!call || call.state !== "active") return;

    const packet = this.asBinary(data?.packet);
    if (!packet || !this.isValidUltraPacket(packet) || !this.acceptUltraRate(client.id, packet[2])) return;

    const peerId = call.caller_id === userId ? call.callee_id : call.caller_id;
    this.emitToUser(peerId, "call:ultra:frame", { callId: call.id, packet });
  }

  /**
   * Le client rapporte le mode de connexion reellement negocie.
   * Mesure le taux de recours au relais TURN sur le terrain.
   */
  @SubscribeMessage("call:connected")
  async handleCallConnected(
    @MessageBody() data: { callId: number; connectionType: "p2p" | "relay" },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data.callId, userId);
    if (!call) return;

    const type = data.connectionType === "relay" ? "relay" : "p2p";
    await this.calls.markActive(call.id);
    await this.calls.setConnectionType(call.id, type);
  }

  /**
   * Preuve de vie pendant l'appel. Sur reseau instable, un client peut
   * disparaitre sans emettre "call:end" ; l'absence de heartbeat permet a
   * expireStaleCalls() de cloturer l'appel cote serveur.
   */
  @SubscribeMessage("call:heartbeat")
  async handleCallHeartbeat(
    @MessageBody() data: { callId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.calls.getCall(Number(data.callId));
    if (!call || (call.caller_id !== userId && call.callee_id !== userId)) return;
    await this.calls.touch(call.id);
  }

  /** Raccrochage explicite, ou echec de connexion signale par le client. */
  @SubscribeMessage("call:end")
  async handleCallEnd(
    @MessageBody() data: { callId: number; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.authenticatedUserId(client);
    const call = await this.safeParticipant(client, data.callId, userId);
    if (!call) return;

    // Une sonnerie sans reponse est "missed", pas "hangup" : la distinction est
    // visible dans l'historique du fil de discussion.
    const reason: CallEndReason =
      data.reason === "failed"
        ? "failed"
        : call.state === "ringing" && call.caller_id === userId
          ? "missed"
          : "hangup";

    await this.terminateCall(call.id, userId, reason);
  }

  /**
   * Cloture un appel et notifie les deux participants.
   * Idempotent : un double raccrochage (les deux cotes en meme temps) est sans effet.
   */
  private async terminateCall(callId: number, actorUserId: number, reason: CallEndReason) {
    const call = await this.calls.getCall(callId);
    if (!call || call.state === "ended") return;

    await this.calls.endCall(callId, reason);

    for (const participantId of [call.caller_id, call.callee_id]) {
      this.emitToUser(participantId, "call:ended", {
        callId,
        reason,
        endedBy: actorUserId,
        discussionId: call.discussion_id,
      });
      this.clearActiveCall(participantId, callId);
    }
  }

  /** Verifie l'appartenance a l'appel sans faire tomber la connexion socket. */
  private async safeParticipant(client: Socket, rawCallId: unknown, userId: number) {
    const callId = Number(rawCallId);
    if (!Number.isInteger(callId) || callId <= 0) return undefined;

    const call = await this.calls.getCall(callId);
    if (!call || (call.caller_id !== userId && call.callee_id !== userId)) {
      client.emit("call:failed", { callId, reason: "forbidden", message: "Appel inaccessible." });
      return undefined;
    }
    return call;
  }

  /** Emet vers tous les sockets d'un utilisateur (multi-onglets, multi-appareils). */
  private emitToUser(userId: number, event: string, payload: unknown) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return;
    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  /** Retire la reference a l'appel termine sur les sockets de l'utilisateur. */
  private clearActiveCall(userId: number, callId: number) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return;
    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket && Number(socket.data.activeCallId) === callId) {
        socket.data.activeCallId = undefined;
      }
    }
  }

  private asBinary(value: unknown): Buffer | undefined {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (value instanceof ArrayBuffer) return Buffer.from(value);
    return undefined;
  }

  private isValidUltraPacket(packet: Buffer) {
    if (packet.length < ULTRA_PACKET_HEADER_BYTES || packet.length > ULTRA_MAX_PACKET_BYTES) return false;
    const count = packet[2];
    const bytesPerFrame = packet[3];
    return packet[0] === ULTRA_PROTOCOL_VERSION
      && packet[1] === ULTRA_MODE_700C
      && count >= 1
      && count <= ULTRA_MAX_FRAMES_PER_PACKET
      && bytesPerFrame === ULTRA_FRAME_BYTES
      && packet.length === ULTRA_PACKET_HEADER_BYTES + count * bytesPerFrame;
  }

  private acceptUltraRate(socketId: string, frameCount: number) {
    const now = Date.now();
    const current = this.ultraRate.get(socketId);
    const state = !current || now - current.startedAt >= 1000
      ? { startedAt: now, frames: 0 }
      : current;
    if (state.frames + frameCount > ULTRA_MAX_FRAMES_PER_SECOND) return false;
    state.frames += frameCount;
    this.ultraRate.set(socketId, state);
    return true;
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
