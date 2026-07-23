import { Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";

// Module appels : meme approche que chat.service.ts — SQL via le client Drizzle
// (db.execute(sql`...`)), pas de pool mysql2 direct.

/** Etats possibles d'un appel. Transitions : ringing -> active -> ended. */
export type CallState = "ringing" | "active" | "ended";

/** Raison de fin, pour l'historique affiche dans le fil de discussion. */
export type CallEndReason =
  | "hangup" // raccrochage normal par l'un des deux
  | "rejected" // l'appele a refuse
  | "missed" // sonnerie sans reponse
  | "unavailable" // l'appele n'etait pas connecte
  | "busy" // l'appele etait deja en appel
  | "failed" // la connexion WebRTC n'a pas pu s'etablir
  | "timeout"; // perte reseau : plus de heartbeat

export interface CallRow {
  id: number;
  discussion_id: number;
  caller_id: number;
  callee_id: number;
  state: CallState;
  connection_type: string | null;
  started_at: Date | null;
}

@Injectable()
export class CallService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async rows<T = any>(query: SQL): Promise<T[]> {
    const res = await this.db.execute(query);
    const data = Array.isArray(res) ? res[0] : res;
    return (data as unknown as T[]) ?? [];
  }

  private async row<T = any>(query: SQL): Promise<T | undefined> {
    return (await this.rows<T>(query))[0];
  }

  /** Cree un appel a l'etat "ringing". Retourne son id. */
  async createCall(discussionId: number, callerId: number, calleeId: number): Promise<number> {
    const res: any = await this.db.execute(sql`
      INSERT INTO chat_calls (discussion_id, caller_id, callee_id, call_type, state)
      VALUES (${discussionId}, ${callerId}, ${calleeId}, 'audio', 'ringing')
    `);
    const meta = Array.isArray(res) ? res[0] : res;
    return Number(meta?.insertId ?? 0);
  }

  async getCall(callId: number): Promise<CallRow | undefined> {
    return this.row<CallRow>(sql`
      SELECT id, discussion_id, caller_id, callee_id, state, connection_type, started_at
      FROM chat_calls WHERE id = ${callId} AND status = 1 LIMIT 1
    `);
  }

  /**
   * Verifie qu'un utilisateur est bien l'un des deux participants.
   * Garde-fou central : toute la signalisation passe par la, ce qui empeche
   * un tiers d'injecter des SDP/ICE dans un appel qui ne le concerne pas.
   */
  async assertParticipant(callId: number, userId: number): Promise<CallRow> {
    const call = await this.getCall(callId);
    if (!call || (call.caller_id !== userId && call.callee_id !== userId)) {
      throw new Error("Call access denied.");
    }
    return call;
  }

  /** Retourne l'appel en cours d'un utilisateur, s'il y en a un (test "occupe"). */
  async findActiveCallFor(userId: number): Promise<CallRow | undefined> {
    return this.row<CallRow>(sql`
      SELECT id, discussion_id, caller_id, callee_id, state, connection_type, started_at
      FROM chat_calls
      WHERE status = 1 AND state IN ('ringing','active')
        AND (caller_id = ${userId} OR callee_id = ${userId})
      ORDER BY id DESC LIMIT 1
    `);
  }

  /** Passe l'appel a "active" et demarre le chrono. */
  async markActive(callId: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE chat_calls
      SET state = 'active', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ${callId} AND status = 1 AND state = 'ringing'
    `);
  }

  /**
   * Enregistre le mode de connexion negocie (p2p ou relay).
   * Cette donnee mesure le taux de recours au relais TURN en conditions reelles :
   * c'est l'indicateur qui dira si l'infra TURN est correctement dimensionnee.
   */
  async setConnectionType(callId: number, connectionType: "p2p" | "relay"): Promise<void> {
    await this.db.execute(sql`
      UPDATE chat_calls SET connection_type = ${connectionType}
      WHERE id = ${callId} AND status = 1
    `);
  }

  /** Cloture l'appel et calcule sa duree. Idempotent : ne re-cloture pas. */
  async endCall(callId: number, reason: CallEndReason): Promise<void> {
    await this.db.execute(sql`
      UPDATE chat_calls
      SET state = 'ended',
          ended_at = CURRENT_TIMESTAMP,
          end_reason = ${reason},
          duration_seconds = CASE
            WHEN started_at IS NULL THEN 0
            ELSE TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP)
          END
      WHERE id = ${callId} AND status = 1 AND state <> 'ended'
    `);
  }

  /**
   * Cloture les appels fantomes : sur reseau instable, un client peut
   * disparaitre sans emettre "call:end" (coupure 3G, app tuee). Sans ce
   * nettoyage, l'utilisateur resterait marque "occupe" indefiniment et ne
   * pourrait plus recevoir d'appel.
   */
  async expireStaleCalls(ringingTimeoutSec = 60, activeTimeoutSec = 120): Promise<number> {
    const res: any = await this.db.execute(sql`
      UPDATE chat_calls
      SET state = 'ended',
          ended_at = CURRENT_TIMESTAMP,
          end_reason = 'timeout',
          duration_seconds = CASE
            WHEN started_at IS NULL THEN 0
            ELSE TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP)
          END
      WHERE status = 1
        AND (
          (state = 'ringing' AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${ringingTimeoutSec} SECOND))
          OR (state = 'active' AND updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${activeTimeoutSec} SECOND))
        )
    `);
    const meta = Array.isArray(res) ? res[0] : res;
    return Number(meta?.affectedRows ?? 0);
  }

  /** Rafraichit updated_at : preuve de vie envoyee par les clients en appel. */
  async touch(callId: number): Promise<void> {
    await this.db.execute(sql`
      UPDATE chat_calls SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${callId} AND status = 1 AND state IN ('ringing','active')
    `);
  }

  /** Historique des appels d'une discussion, pour affichage dans le fil. */
  async getCallHistory(discussionId: number, limit = 50) {
    return this.rows(sql`
      SELECT c.id, c.caller_id, c.callee_id, c.state, c.connection_type,
             c.started_at, c.ended_at, c.duration_seconds, c.end_reason, c.created_at,
             caller.firstName AS caller_first_name, caller.lastName AS caller_last_name,
             callee.firstName AS callee_first_name, callee.lastName AS callee_last_name
      FROM chat_calls c
      LEFT JOIN user caller ON caller.id = c.caller_id
      LEFT JOIN user callee ON callee.id = c.callee_id
      WHERE c.discussion_id = ${discussionId} AND c.status = 1
      ORDER BY c.id DESC
      LIMIT ${limit}
    `);
  }
}
