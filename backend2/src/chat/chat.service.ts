import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";

// Module chat : SQL via le client Drizzle (db.execute(sql`...`)), pas le pool mysql2 direct.

// Anti-XSS stocke : les messages sont du texte simple. On retire toute balise HTML
// avant persistance (defense en profondeur, en plus de l'echappement cote front).
const MAX_MESSAGE_LENGTH = 5000;
function sanitizeMessageContent(content: string): string {
  return String(content ?? "")
    .replace(/<[^>]*>/g, "") // supprime toute balise <...>
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

@Injectable()
export class ChatService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async rows<T = any>(query: SQL): Promise<T[]> {
    const res = await this.db.execute(query);
    const data = Array.isArray(res) ? res[0] : res;
    return (data as unknown as T[]) ?? [];
  }
  private async row<T = any>(query: SQL): Promise<T | undefined> {
    return (await this.rows<T>(query))[0];
  }
  private async insert(query: SQL): Promise<number> {
    const res: any = await this.db.execute(query);
    const meta = Array.isArray(res) ? res[0] : res;
    return Number(meta?.insertId ?? 0);
  }

  // ── Channels ────────────────────────────────────────────────────────────────
  async getChannels(userId: number) {
    return this.rows(sql`
      SELECT c.id, c.slug, c.name, c.description, c.icon, c.color, c.is_default,
             m.role, m.joined_at,
             (SELECT COUNT(*) FROM journal_messages jm
              JOIN journal_discussions jd ON jd.id = jm.discussion_id
              WHERE jd.channel_id = c.id AND jd.discussion_type = 'channel' AND jm.status = 1
                AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = jm.id AND r.user_id = ${userId})) AS unread
      FROM chat_channels c
      LEFT JOIN chat_channel_members m ON m.channel_id = c.id AND m.user_id = ${userId}
      WHERE c.status = 1 AND (c.is_default = 1 OR m.user_id IS NOT NULL)
      ORDER BY c.is_default DESC, c.name
    `);
  }

  async getAllChannels() {
    return this.rows(sql`
      SELECT id, slug, name, description, icon, color, is_default, created_at
      FROM chat_channels WHERE status = 1 ORDER BY name
    `);
  }

  async createChannel(data: {
    slug: string; name: string; description?: string;
    icon?: string; color?: string; isDefault?: boolean; createdBy: number;
  }) {
    const insertId = await this.insert(sql`
      INSERT INTO chat_channels (slug, name, description, icon, color, is_default, created_by)
      VALUES (${data.slug}, ${data.name}, ${data.description ?? null}, ${data.icon ?? null},
        ${data.color ?? "#6366f1"}, ${data.isDefault ? 1 : 0}, ${data.createdBy})
    `);
    await this.joinChannel(insertId, data.createdBy, "admin");
    return { id: insertId, ...data };
  }

  async joinChannel(channelId: number, userId: number, role = "member") {
    await this.db.execute(sql`
      INSERT IGNORE INTO chat_channel_members (channel_id, user_id, role) VALUES (${channelId}, ${userId}, ${role})
    `);
  }

  async getChannelMembers(channelId: number) {
    return this.rows(sql`
      SELECT m.user_id, m.role, m.joined_at, u.firstName, u.lastName, u.email
      FROM chat_channel_members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.channel_id = ${channelId}
    `);
  }

  // ── Discussion d'un channel ─────────────────────────────────────────────────
  async getOrCreateChannelDiscussion(channelId: number, userId: number) {
    await this.assertChannelAccess(channelId, userId);

    const disc = await this.row(sql`
      SELECT id FROM journal_discussions WHERE channel_id = ${channelId} AND discussion_type = 'channel' AND status = 1 LIMIT 1
    `);
    if (disc) return disc;

    const ch = await this.row<{ name: string }>(sql`SELECT name FROM chat_channels WHERE id = ${channelId}`);
    const insertId = await this.insert(sql`
      INSERT INTO journal_discussions (entity_type, entity_id, channel_id, discussion_type, title, created_by)
      VALUES ('channel', ${channelId}, ${channelId}, 'channel', ${ch?.name ?? "Canal"}, ${userId})
    `);
    return { id: insertId };
  }

  // ── Discussions directes (tête-à-tête) ──────────────────────────────────────
  // Un tête-à-tête est une discussion sans channel, de type 'direct', dont
  // entity_id porte la paire d'utilisateurs triée (min-max) : c'est ce qui rend
  // la recherche « la conversation entre A et B » déterministe, quel que soit
  // celui des deux qui l'ouvre en premier.

  private directKey(a: number, b: number) {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    return `${lo}-${hi}`;
  }

  /** Ouvre (ou crée) la discussion 1-à-1 entre l'appelant et `otherUserId`. */
  async getOrCreateDirectDiscussion(userId: number, otherUserId: number) {
    if (otherUserId === userId) {
      throw new ForbiddenException("Impossible d'ouvrir une discussion avec soi-même.");
    }
    const other = await this.getUserByIdInSameOrg(userId, otherUserId);
    if (!other) throw new ForbiddenException("Utilisateur introuvable.");

    const key = this.directKey(userId, otherUserId);
    const existing = await this.row<{ id: number }>(sql`
      SELECT id FROM journal_discussions
      WHERE discussion_type = 'direct' AND entity_type = 'direct' AND entity_key = ${key} AND status = 1
      LIMIT 1
    `);

    const title = `${other.firstName ?? ""} ${other.lastName ?? ""}`.trim() || `Utilisateur ${otherUserId}`;
    if (existing) {
      // Les participants sont réinsérés en IGNORE : une discussion créée avant
      // l'ajout d'un des deux comptes resterait sinon inaccessible.
      await this.addDirectParticipants(existing.id, userId, otherUserId);
      return { id: existing.id, title, otherUserId };
    }

    const insertId = await this.insert(sql`
      INSERT INTO journal_discussions (entity_type, entity_id, entity_key, discussion_type, title, created_by)
      VALUES ('direct', ${Math.min(userId, otherUserId)}, ${key}, 'direct', ${title}, ${userId})
    `);
    await this.addDirectParticipants(insertId, userId, otherUserId);
    return { id: insertId, title, otherUserId };
  }

  private async addDirectParticipants(discussionId: number, a: number, b: number) {
    await this.db.execute(sql`
      INSERT IGNORE INTO journal_discussion_participants (discussion_id, user_id)
      VALUES (${discussionId}, ${a}), (${discussionId}, ${b})
    `);
  }

  /**
   * Liste des personnes joignables, avec la conversation directe existante si
   * elle existe : l'onglet « Personnes » affiche ainsi dernier message et
   * non-lus sans un aller-retour par utilisateur.
   */
  async getDirectConversations(userId: number) {
    return this.rows(sql`
      SELECT u.id AS user_id, u.firstName, u.lastName, u.email,
             d.id AS discussion_id,
             (SELECT COUNT(*) FROM journal_messages m
              WHERE m.discussion_id = d.id AND m.status = 1 AND m.sender_id <> ${userId}
                AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ${userId})) AS unread,
             (SELECT m2.content FROM journal_messages m2 WHERE m2.discussion_id = d.id AND m2.status = 1
              ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
             (SELECT m2.created_at FROM journal_messages m2 WHERE m2.discussion_id = d.id AND m2.status = 1
              ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at
      FROM users u
      JOIN users me ON me.id = ${userId} AND me.status = 'true'
      LEFT JOIN journal_discussions d
        ON d.discussion_type = 'direct' AND d.status = 1
       AND d.entity_key = CONCAT(LEAST(u.id, ${userId}), '-', GREATEST(u.id, ${userId}))
      WHERE u.status = 'true' AND u.organization_id = me.organization_id AND u.id <> ${userId}
      ORDER BY last_message_at IS NULL, last_message_at DESC, u.firstName
      LIMIT 200
    `);
  }

  // ── Sujets liés (events + tickets) ─────────────────────────────────────────
  async getTopics(userId: number, filters: { q?: string; type?: string } = {}) {
    let typeCond: SQL = sql``;
    if (filters.type === "event") typeCond = sql` AND d.entity_type = 'journal_event'`;
    else if (filters.type === "ticket") typeCond = sql` AND d.entity_type = 'crm_ticket'`;

    return this.rows(sql`
      SELECT d.id, d.entity_type, d.entity_id, d.title, d.created_at,
             (SELECT COUNT(*) FROM journal_messages m WHERE m.discussion_id = d.id AND m.status = 1
                AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ${userId})) AS unread,
             (SELECT m2.content FROM journal_messages m2 WHERE m2.discussion_id = d.id AND m2.status = 1
              ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
             (SELECT m2.created_at FROM journal_messages m2 WHERE m2.discussion_id = d.id AND m2.status = 1
              ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at,
             je.title AS event_title, je.event_type, je.importance
      FROM journal_discussions d
      LEFT JOIN journal_discussion_participants p ON p.discussion_id = d.id AND p.user_id = ${userId}
      LEFT JOIN journal_events je ON je.id = d.entity_id AND d.entity_type = 'journal_event'
      WHERE d.status = 1 AND d.discussion_type = 'entity'${typeCond} AND (p.user_id IS NOT NULL OR d.created_by = ${userId})
      ORDER BY COALESCE(last_message_at, d.created_at) DESC
      LIMIT 100
    `);
  }

  // ── Messages d'une discussion (channel ou sujet) ────────────────────────────
  async getMessages(discussionId: number, userId: number, limit = 60, beforeId?: number) {
    await this.assertDiscussionAccess(discussionId, userId);

    const cursor = beforeId ? sql`AND m.id < ${beforeId}` : sql``;
    const rows = await this.rows(sql`
      SELECT m.id, m.sender_id, m.content, m.mentions, m.attachment_url,
             m.attachment_name, m.attachment_type, m.attachment_duration_sec, m.created_at,
             u.firstName, u.lastName,
             EXISTS(SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ${userId}) AS is_read
      FROM journal_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.discussion_id = ${discussionId} AND m.status = 1 ${cursor}
      ORDER BY m.created_at DESC LIMIT ${limit}
    `);

    // Marquer comme lus
    if (rows.length > 0) {
      await this.db.execute(sql`
        INSERT IGNORE INTO journal_message_reads (message_id, user_id)
        SELECT id, ${userId} FROM journal_messages WHERE discussion_id = ${discussionId} AND status = 1
      `);
    }
    return (rows as any[]).reverse();
  }

  async sendMessage(discussionId: number, userId: number, content: string, mentions: number[] = []) {
    await this.assertDiscussionAccess(discussionId, userId);

    const safeContent = sanitizeMessageContent(content);
    const messageId = await this.insert(sql`
      INSERT INTO journal_messages (discussion_id, sender_id, content, mentions)
      VALUES (${discussionId}, ${userId}, ${safeContent}, ${JSON.stringify(mentions)})
    `);

    await this.db.execute(sql`
      INSERT IGNORE INTO journal_message_reads (message_id, user_id) VALUES (${messageId}, ${userId})
    `);

    // Ajouter mentions comme participants
    for (const uid of mentions) {
      await this.db.execute(sql`
        INSERT IGNORE INTO journal_discussion_participants (discussion_id, user_id)
        SELECT ${discussionId}, u.id
        FROM users u
        JOIN users me ON me.id = ${userId} AND me.status = 'true'
        WHERE u.id = ${uid} AND u.status = 'true' AND u.organization_id = me.organization_id
      `);
    }

    return this.row(sql`
      SELECT m.id, m.discussion_id, m.sender_id, m.content, m.mentions,
             m.created_at, u.firstName, u.lastName
      FROM journal_messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = ${messageId}
    `);
  }

  // ── Utilisateurs disponibles (pour @mention) ────────────────────────────────
  async getUsers(userId: number) {
    return this.rows(sql`
      SELECT u.id, u.firstName, u.lastName, u.email
      FROM users u
      JOIN users me ON me.id = ${userId} AND me.status = 'true'
      WHERE u.status = 'true' AND u.organization_id = me.organization_id
      ORDER BY u.firstName
      LIMIT 200
    `);
  }

  /**
   * Enregistre un message vocal deja televerse dans le stockage objet.
   * Le contenu textuel reste vide : l'UI affiche un lecteur audio.
   */
  async createVoiceMessage(
    discussionId: number,
    userId: number,
    attachment: { objectKey: string; name: string; durationSec: number },
  ) {
    await this.assertDiscussionAccess(discussionId, userId);

    const messageId = await this.insert(sql`
      INSERT INTO journal_messages
        (discussion_id, sender_id, content, mentions, attachment_url, attachment_name,
         attachment_type, attachment_duration_sec)
      VALUES (${discussionId}, ${userId}, '', '[]', ${attachment.objectKey}, ${attachment.name},
         'voice', ${attachment.durationSec})
    `);

    await this.db.execute(sql`
      INSERT IGNORE INTO journal_message_reads (message_id, user_id) VALUES (${messageId}, ${userId})
    `);

    return this.row(sql`
      SELECT m.id, m.sender_id, m.content, m.mentions, m.attachment_url,
             m.attachment_name, m.attachment_type, m.attachment_duration_sec, m.created_at,
             u.firstName, u.lastName
      FROM journal_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.id = ${messageId}
    `);
  }

  /** Cle de stockage d'un vocal, apres controle d'acces a la discussion. */
  async getVoiceObjectKey(messageId: number, userId: number) {
    const row = await this.row<{ attachment_url: string; discussion_id: number; attachment_type: string }>(sql`
      SELECT attachment_url, discussion_id, attachment_type
      FROM journal_messages WHERE id = ${messageId} AND status = 1 LIMIT 1
    `);
    if (!row || row.attachment_type !== "voice" || !row.attachment_url) {
      throw new ForbiddenException("Message vocal introuvable.");
    }
    await this.assertDiscussionAccess(row.discussion_id, userId);
    return row.attachment_url;
  }

  /** Identite d'un utilisateur — utilise pour afficher le nom de l'appelant. */
  async getUserByIdInSameOrg(userId: number, otherUserId: number) {
    return this.row<{ id: number; firstName: string | null; lastName: string | null }>(sql`
      SELECT u.id, u.firstName, u.lastName
      FROM users u
      JOIN users me ON me.id = ${userId} AND me.status = 'true'
      WHERE u.id = ${otherUserId} AND u.status = 'true' AND u.organization_id = me.organization_id
      LIMIT 1
    `);
  }

  private async assertChannelAccess(channelId: number, userId: number) {
    const row = await this.row(sql`
      SELECT c.id
      FROM chat_channels c
      LEFT JOIN chat_channel_members m ON m.channel_id = c.id AND m.user_id = ${userId}
      WHERE c.id = ${channelId}
        AND c.status = 1
        AND (c.is_default = 1 OR m.user_id IS NOT NULL)
      LIMIT 1
    `);
    if (!row) throw new ForbiddenException("Channel access denied.");
  }

  async assertDiscussionAccess(discussionId: number, userId: number) {
    const row = await this.row(sql`
      SELECT d.id
      FROM journal_discussions d
      JOIN users me ON me.id = ${userId} AND me.status = 'true'
      LEFT JOIN chat_channels c ON c.id = d.channel_id
      LEFT JOIN chat_channel_members cm ON cm.channel_id = c.id AND cm.user_id = ${userId}
      LEFT JOIN journal_discussion_participants p ON p.discussion_id = d.id AND p.user_id = ${userId}
      WHERE d.id = ${discussionId}
        AND d.status = 1
        AND (
          d.created_by = ${userId}
          OR p.user_id IS NOT NULL
          OR c.is_default = 1
          OR cm.user_id IS NOT NULL
        )
        AND (
          d.discussion_type <> 'direct'
          OR NOT EXISTS (
            SELECT 1
            FROM journal_discussion_participants dp
            JOIN users du ON du.id = dp.user_id
            WHERE dp.discussion_id = d.id AND du.organization_id <> me.organization_id
          )
        )
      LIMIT 1
    `);
    if (!row) throw new ForbiddenException("Discussion access denied.");
  }
}
