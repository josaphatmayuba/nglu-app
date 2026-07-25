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
  // Organisation de chaque utilisateur connecte : necessaire pour ne renvoyer
  // la liste de presence qu'aux collegues de la meme organisation.
  private userOrg = new Map<number, number>();
  private ultraRate = new Map<string, { startedAt: number; frames: number }>();
  // Les paquets audio Ultra arrivent plusieurs fois par seconde. Une fois
  // l'appel valide, garder ses participants en memoire evite une requete SQL
  // pour chaque paquet.
  private ultraCalls = new Map<number, {
    callerId: number;
    calleeId: number;
    expiresAt: number;
  }>();
  // Deconnexion pendant un appel actif : delai de grace avant de raccrocher,
  // pour laisser le temps a une reconnexion Socket.IO (reconnectionAttempts:
  // Infinity cote client) de rejoindre l'appel via call:rejoin. Sans ce delai,
  // toute micro-coupure reseau raccrochait l'appel alors que le socket se
  // reconnectait tout seul quelques secondes plus tard.
  private disconnectGrace = new Map<number, NodeJS.Timeout>();
  private static readonly DISCONNECT_GRACE_MS = 12000;

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
      client.join(`org:${auth.organizationId}`);
    } catch {
      client.emit("unauthorized", { message: "Authentification requise." });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    this.ultraRate.delete(client.id);
    for (const [userId, socketIds] of this.userSockets) {
      if (!socketIds.delete(client.id)) continue;
      if (socketIds.size === 0) {
        this.userSockets.delete(userId);
        // Dernier socket de cet utilisateur : il passe hors ligne pour de bon
        // (pas juste la fermeture d'un onglet parmi plusieurs).
        const orgId = this.userOrg.get(userId);
        this.userOrg.delete(userId);
        if (orgId) this.server.to(`org:${orgId}`).emit("presence:update", { userId, online: false });
      }
      break;
    }

    // Deconnexion pendant un appel (fermeture d'onglet, coupure reseau) :
    // delai de grace avant de raccrocher, pour laisser une reconnexion
    // Socket.IO rejoindre l'appel (cf call:rejoin). Si personne ne rejoint a
    // temps, on previent l'autre participant au lieu de le laisser bloque.
    const callId = Number(client.data.activeCallId);
    const userId = Number(client.data.userId);
    if (Number.isInteger(callId) && callId > 0 && Number.isInteger(userId) && userId > 0) {
      this.scheduleDisconnectGrace(callId, userId);
    }
  }

  /** Programme la cloture differee d'un appel apres deconnexion. */
  private scheduleDisconnectGrace(callId: number, userId: number) {
    const existing = this.disconnectGrace.get(callId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.disconnectGrace.delete(callId);
      this.terminateCall(callId, userId, "timeout").catch(() => { /* appel deja termine */ });
    }, ChatGateway.DISCONNECT_GRACE_MS);
    this.disconnectGrace.set(callId, timer);
  }

  @SubscribeMessage("register")
  async handleRegister(@ConnectedSocket() client: Socket) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(client.id);
    this.userSockets.set(userId, sockets);
    this.userOrg.set(userId, Number(client.data.organizationId));

    const channels = await this.svc.getChannels(userId);
    for (const channel of channels) {
      const discussion = await this.svc.getOrCreateChannelDiscussion(channel.id, userId);
      client.join(`disc:${discussion.id}`);
    }
    client.emit("registered", { userId });

    // Premiere connexion de cet utilisateur (pas juste un 2e onglet) : prevenir
    // ses collegues de la meme organisation qu'il vient de passer en ligne.
    if (this.userSockets.get(userId)?.size === 1) {
      client.to(`org:${client.data.organizationId}`).emit("presence:update", { userId, online: true });
    }
    const orgId = Number(client.data.organizationId);
    const onlineUserIds = [...this.userOrg.entries()]
      .filter(([, org]) => org === orgId)
      .map(([id]) => id);
    client.emit("presence:list", { userIds: onlineUserIds });
  }

  @SubscribeMessage("joinRoom")
  async handleJoin(@MessageBody() data: { discussionId: number }, @ConnectedSocket() client: Socket) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    await this.svc.assertDiscussionAccess(data.discussionId, userId);
    client.join(`disc:${data.discussionId}`);
    client.emit("joined", { discussionId: data.discussionId });
  }

  @SubscribeMessage("leaveRoom")
  async handleLeave(@MessageBody() data: { discussionId: number }, @ConnectedSocket() client: Socket) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    client.leave(`disc:${data.discussionId}`);
  }

  @SubscribeMessage("sendMessage")
  async handleMessage(
    @MessageBody() data: { discussionId: number; content: string; mentions?: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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
  async handleTyping(
    @MessageBody() data: { discussionId: number; firstName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const call = await this.safeParticipant(client, data.callId, userId);
    if (!call) return;

    // Seul l'appele peut accepter.
    if (call.callee_id !== userId) return;

    await this.calls.markActive(call.id);
    client.data.activeCallId = call.id;
    this.ultraCalls.set(call.id, {
      callerId: call.caller_id,
      calleeId: call.callee_id,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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

  /**
   * Confirme que les DEUX participants ont un encodeur Codec2 pret : signal
   * pour que chacun coupe son flux RTP WebRTC sortant. Sans cet accuse
   * bilateral, le premier cote a couper son RTP laisse l'autre sans audio
   * pendant que son propre transport Ultra demarre encore.
   */
  @SubscribeMessage("call:ultra:go")
  async handleUltraGo(
    @MessageBody() data: { callId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const call = await this.safeParticipant(client, data?.callId, userId);
    if (!call || call.state !== "active") return;

    const peerId = call.caller_id === userId ? call.callee_id : call.caller_id;
    this.emitToUser(peerId, "call:ultra:go", { callId: call.id });
  }

  /** Relaye les paquets Codec2 sans les decoder cote serveur. */
  @SubscribeMessage("call:ultra:frame")
  async handleUltraFrame(
    @MessageBody() data: { callId: number; packet: unknown },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const callId = Number(data?.callId);
    const call = this.ultraCalls.get(callId);
    if (!call || call.expiresAt <= Date.now()) {
      this.ultraCalls.delete(callId);
      return;
    }
    if (Number(client.data.activeCallId) !== callId
      || (call.callerId !== userId && call.calleeId !== userId)) return;

    const packet = this.asBinary(data?.packet);
    if (!packet || !this.isValidUltraPacket(packet) || !this.acceptUltraRate(client.id, packet[2])) return;

    const peerId = call.callerId === userId ? call.calleeId : call.callerId;
    this.emitToUser(peerId, "call:ultra:frame", { callId, packet });
  }

  /** Demande aux deux clients de quitter le mode Ultra ensemble. */
  @SubscribeMessage("call:ultra:stop")
  async handleUltraStop(
    @MessageBody() data: { callId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const call = await this.safeParticipant(client, data?.callId, userId);
    if (!call) return;

    const peerId = call.caller_id === userId ? call.callee_id : call.caller_id;
    this.emitToUser(peerId, "call:ultra:stop", { callId: call.id });
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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const call = await this.calls.getCall(Number(data.callId));
    if (!call || (call.caller_id !== userId && call.callee_id !== userId)) return;
    await this.calls.touch(call.id);
  }

  /**
   * Rattache un appel actif au nouveau socket apres une reconnexion.
   * Annule le delai de grace declenche par handleDisconnect : sans cet appel,
   * l'appel serait raccroche ~12 s apres la coupure meme si le client revient
   * a temps (cf scheduleDisconnectGrace).
   */
  @SubscribeMessage("call:rejoin")
  async handleCallRejoin(
    @MessageBody() data: { callId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
    const call = await this.safeParticipant(client, data?.callId, userId);
    if (!call || call.state !== "active") return;

    const pending = this.disconnectGrace.get(call.id);
    if (pending) {
      clearTimeout(pending);
      this.disconnectGrace.delete(call.id);
    }
    client.data.activeCallId = call.id;
    await this.calls.touch(call.id);
    client.emit("call:rejoined", { callId: call.id });
  }

  /** Raccrochage explicite, ou echec de connexion signale par le client. */
  @SubscribeMessage("call:end")
  async handleCallEnd(
    @MessageBody() data: { callId: number; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = await this.authenticatedUserId(client);
    if (!userId) return;
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

    const pendingGrace = this.disconnectGrace.get(callId);
    if (pendingGrace) {
      clearTimeout(pendingGrace);
      this.disconnectGrace.delete(callId);
    }

    await this.calls.endCall(callId, reason);
    this.ultraCalls.delete(callId);

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
      const socket = this.getSocket(socketId);
      if (socket && Number(socket.data.activeCallId) === callId) {
        socket.data.activeCallId = undefined;
      }
    }
  }

  private getSocket(socketId: string): Socket | undefined {
    const namespaceSockets = this.server.sockets;
    if (namespaceSockets instanceof Map) return namespaceSockets.get(socketId);
    return namespaceSockets?.sockets?.get(socketId);
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
