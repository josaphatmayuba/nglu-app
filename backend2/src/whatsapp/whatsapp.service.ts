import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as path from "path";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import * as QRCode from "qrcode";

// SCRUM: bot WhatsApp maison (Baileys, gratuit, session non-officielle) pour
// relayer des annonces vers des groupes WhatsApp. Session persistee sur disque
// (volume Docker) pour survivre aux redemarrages du conteneur sans rescan QR.
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.cwd(), "storage", "whatsapp-auth");

export type WhatsappStatus = "disconnected" | "connecting" | "qr_pending" | "connected";

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private socket: WASocket | null = null;
  private status: WhatsappStatus = "disconnected";
  private lastQr: string | null = null;

  async onModuleInit() {
    if (process.env.WHATSAPP_ENABLED !== "true") {
      this.logger.log("WhatsApp desactive (WHATSAPP_ENABLED != true) — pas de connexion.");
      return;
    }
    await this.connect();
  }

  private async connect() {
    this.status = "connecting";
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        this.lastQr = qr;
        this.status = "qr_pending";
        this.logger.log("QR WhatsApp genere — recuperer via GET /whatsapp/qr pour scanner.");
      }

      if (connection === "open") {
        this.status = "connected";
        this.lastQr = null;
        this.logger.log("WhatsApp connecte.");
      }

      if (connection === "close") {
        this.status = "disconnected";
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.logger.warn(`WhatsApp deconnecte (code ${statusCode}). Reconnexion: ${shouldReconnect}`);
        if (shouldReconnect) {
          void this.connect();
        }
      }
    });
  }

  getStatus(): WhatsappStatus {
    return this.status;
  }

  async getQrDataUrl(): Promise<string | null> {
    if (!this.lastQr) return null;
    return QRCode.toDataURL(this.lastQr);
  }

  /**
   * Envoie un message texte vers un groupe ou un contact WhatsApp.
   * @param jid Identifiant WhatsApp du destinataire (ex. "1203xxxxx@g.us" pour un groupe, "24399xxxx@s.whatsapp.net" pour un contact)
   */
  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.socket || this.status !== "connected") {
      throw new Error("Session WhatsApp non connectee.");
    }
    await this.socket.sendMessage(jid, { text });
  }

  /**
   * Envoie une image (avec legende optionnelle) vers un groupe ou un contact WhatsApp.
   * @param jid Identifiant WhatsApp du destinataire (ex. "1203xxxxx@g.us" pour un groupe, "24399xxxx@s.whatsapp.net" pour un contact)
   * @param imageBuffer Contenu binaire de l'image (JPEG/PNG/WebP)
   * @param caption Legende optionnelle affichee sous l'image
   */
  async sendImage(jid: string, imageBuffer: Buffer, caption?: string): Promise<void> {
    if (!this.socket || this.status !== "connected") {
      throw new Error("Session WhatsApp non connectee.");
    }
    await this.socket.sendMessage(jid, { image: imageBuffer, caption });
  }

  /** Liste les groupes dont le bot est membre (pour recuperer les JIDs a configurer). */
  async listGroups(): Promise<Array<{ jid: string; name: string }>> {
    if (!this.socket || this.status !== "connected") {
      throw new Error("Session WhatsApp non connectee.");
    }
    const groups = await this.socket.groupFetchAllParticipating();
    return Object.values(groups).map((g) => ({ jid: g.id, name: g.subject }));
  }
}
