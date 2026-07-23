import { createHmac } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { env } from "../config/env";

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

/**
 * Genere les serveurs ICE remis au client pour etablir un appel WebRTC.
 *
 * Les credentials TURN sont ephemeres (mecanisme "TURN REST API" supporte par
 * coturn via `use-auth-secret`) :
 *   username   = <timestamp_expiration>:<userId>
 *   credential = base64(HMAC-SHA1(username, TURN_SECRET))
 *
 * Le secret partage ne quitte jamais le backend. Un credential intercepte
 * n'est exploitable que jusqu'a son expiration (1h par defaut).
 */
@Injectable()
export class TurnCredentialsService {
  private readonly logger = new Logger(TurnCredentialsService.name);
  private warnedMissingConfig = false;

  getIceServers(userId: number): IceServer[] {
    // STUN publics : suffisent pour decouvrir l'adresse publique quand le NAT
    // est cooperatif. Gratuits et sans etat, on les garde en premier choix.
    const servers: IceServer[] = [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];

    const { secret, host } = env.turn;
    if (!secret || !host) {
      // Sans TURN, les appels fonctionnent en P2P direct uniquement : acceptable
      // en dev local, mais une part importante des reseaux mobiles echouera.
      if (!this.warnedMissingConfig) {
        this.warnedMissingConfig = true;
        this.logger.warn(
          "TURN non configure (TURN_SECRET / TURN_HOST absents) — appels en P2P direct seulement, " +
            "taux d'echec eleve sur reseaux mobiles.",
        );
      }
      return servers;
    }

    const expiry = Math.floor(Date.now() / 1000) + env.turn.credentialTtlSeconds;
    const username = `${expiry}:${userId}`;
    const credential = createHmac("sha1", secret).update(username).digest("base64");

    // Trois transports, du plus performant au plus permissif :
    //  - UDP  : chemin normal, latence minimale
    //  - TCP  : passe les reseaux qui filtrent l'UDP (hotels, entreprises)
    //  - TLS  : passe les inspections de trafic les plus strictes
    servers.push({
      urls: [
        `turn:${host}:${env.turn.port}?transport=udp`,
        `turn:${host}:${env.turn.port}?transport=tcp`,
        `turns:${host}:${env.turn.tlsPort}?transport=tcp`,
      ],
      username,
      credential,
    });

    return servers;
  }

  /** Duree de validite restante, utile au client pour rafraichir avant expiration. */
  getTtlSeconds(): number {
    return env.turn.credentialTtlSeconds;
  }
}
