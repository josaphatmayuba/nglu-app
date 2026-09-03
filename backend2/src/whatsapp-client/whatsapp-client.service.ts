import { Injectable, Logger } from "@nestjs/common";

// SCRUM: client HTTP interne vers le microservice whatsapp-service (Baileys),
// deploye separement de backend2 sur un serveur dedie. Isole car la session
// WhatsApp est longue-duree/fragile : un redemarrage de backend2 (frequent, a
// chaque deploiement de feature) ne doit pas tuer la session, et un souci
// Baileys ne doit pas faire tomber l'API principale.
//
// Reprend la meme API publique que l'ancien WhatsappService injecte
// (getStatus/sendMessage/sendImage) pour que notifyMaintenanceStatus n'ait
// presque rien a changer. Toujours non-bloquant : si le service est
// injoignable ou non configure, on log un warn et on continue silencieusement
// — jamais d'echec de creation/mise a jour d'un ticket de maintenance a cause
// du bot WhatsApp.
export type WhatsappStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "unreachable";

@Injectable()
export class WhatsappClientService {
  private readonly logger = new Logger(WhatsappClientService.name);

  private get baseUrl(): string | undefined {
    return process.env.WHATSAPP_SERVICE_URL;
  }

  private get secret(): string | undefined {
    return process.env.WHATSAPP_SERVICE_SECRET;
  }

  private get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.secret);
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Internal-Secret": this.secret ?? "",
    };
  }

  /** Interroge le statut de la session WhatsApp. "unreachable" si non configure ou si l'appel echoue. */
  async getStatus(): Promise<WhatsappStatus> {
    if (!this.isConfigured) return "unreachable";
    try {
      const res = await fetch(`${this.baseUrl}/status`, { headers: this.headers() });
      if (!res.ok) return "unreachable";
      const body = (await res.json()) as { status?: WhatsappStatus };
      return body.status ?? "unreachable";
    } catch (err) {
      this.logger.warn(`getStatus: whatsapp-service injoignable: ${(err as Error).message}`);
      return "unreachable";
    }
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.isConfigured) return;
    const res = await fetch(`${this.baseUrl}/send`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jid, text }),
    });
    if (!res.ok) {
      throw new Error(`whatsapp-service /send a repondu ${res.status}`);
    }
  }

  async sendImage(jid: string, imageBuffer: Buffer, caption?: string): Promise<void> {
    if (!this.isConfigured) return;
    const res = await fetch(`${this.baseUrl}/send-image`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jid, imageBase64: imageBuffer.toString("base64"), caption }),
    });
    if (!res.ok) {
      throw new Error(`whatsapp-service /send-image a repondu ${res.status}`);
    }
  }
}
