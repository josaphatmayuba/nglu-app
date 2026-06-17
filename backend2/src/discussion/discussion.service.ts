import { Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";

// Module discussion : SQL via le client Drizzle (db.execute(sql`...`)), pas le pool mysql2 direct.
@Injectable()
export class DiscussionService {
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

  // ── Obtenir ou créer la discussion pour une entité ─────────────────────────
  async getOrCreateDiscussion(entityType: string, entityId: number, userId: number) {
    const existing = await this.row(sql`
      SELECT id, title, created_by, created_at FROM journal_discussions
      WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND status = 1 LIMIT 1
    `);

    if (existing) {
      await this.ensureParticipant((existing as any).id, userId);
      return existing;
    }

    const discussionId = await this.insert(sql`
      INSERT INTO journal_discussions (entity_type, entity_id, created_by) VALUES (${entityType}, ${entityId}, ${userId})
    `);
    await this.ensureParticipant(discussionId, userId);
    return { id: discussionId, entity_type: entityType, entity_id: entityId, created_by: userId };
  }

  // ── Messages ────────────────────────────────────────────────────────────────
  async getMessages(discussionId: number, userId: number, limit = 50, beforeId?: number) {
    await this.ensureParticipant(discussionId, userId);

    const cursor = beforeId ? sql`AND m.id < ${beforeId}` : sql``;
    const rows = await this.rows(sql`
      SELECT m.id, m.discussion_id, m.sender_id, m.content, m.mentions,
             m.attachment_url, m.attachment_name, m.created_at,
             u.firstName, u.lastName,
             EXISTS(SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ${userId}) AS is_read
      FROM journal_messages m
      LEFT JOIN user u ON u.id = m.sender_id
      WHERE m.discussion_id = ${discussionId} AND m.status = 1 ${cursor}
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `);
    return (rows as any[]).reverse();
  }

  async sendMessage(
    discussionId: number,
    userId: number,
    content: string,
    mentions: number[] = [],
    attachmentUrl?: string,
    attachmentName?: string,
  ) {
    await this.ensureParticipant(discussionId, userId);

    const messageId = await this.insert(sql`
      INSERT INTO journal_messages (discussion_id, sender_id, content, mentions, attachment_url, attachment_name)
      VALUES (${discussionId}, ${userId}, ${content}, ${JSON.stringify(mentions)}, ${attachmentUrl ?? null}, ${attachmentName ?? null})
    `);

    // Marquer comme lu par l'expéditeur
    await this.markRead(messageId, userId);

    // Ajouter les mentionnés comme participants
    for (const uid of mentions) {
      await this.ensureParticipant(discussionId, uid);
    }

    return this.row(sql`
      SELECT m.id, m.discussion_id, m.sender_id, m.content, m.mentions,
             m.attachment_url, m.attachment_name, m.created_at,
             u.firstName, u.lastName
      FROM journal_messages m
      LEFT JOIN user u ON u.id = m.sender_id
      WHERE m.id = ${messageId}
    `);
  }

  async markRead(messageId: number, userId: number) {
    await this.db.execute(sql`
      INSERT IGNORE INTO journal_message_reads (message_id, user_id) VALUES (${messageId}, ${userId})
    `);
  }

  async markAllRead(discussionId: number, userId: number) {
    await this.db.execute(sql`
      INSERT IGNORE INTO journal_message_reads (message_id, user_id)
      SELECT id, ${userId} FROM journal_messages WHERE discussion_id = ${discussionId} AND status = 1
    `);
  }

  // ── Participants ────────────────────────────────────────────────────────────
  async getParticipants(discussionId: number) {
    return this.rows(sql`
      SELECT p.user_id, p.joined_at, u.firstName, u.lastName, u.email
      FROM journal_discussion_participants p
      LEFT JOIN user u ON u.id = p.user_id
      WHERE p.discussion_id = ${discussionId}
    `);
  }

  async addParticipant(discussionId: number, userId: number) {
    await this.ensureParticipant(discussionId, userId);
    return { discussionId, userId };
  }

  // ── Unread count ────────────────────────────────────────────────────────────
  async getUnreadCount(entityType: string, entityId: number, userId: number) {
    const disc = await this.row<{ id: number }>(sql`
      SELECT id FROM journal_discussions WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND status = 1 LIMIT 1
    `);
    if (!disc) return { unread: 0 };

    const row = await this.row<{ unread: number }>(sql`
      SELECT COUNT(*) AS unread
      FROM journal_messages m
      WHERE m.discussion_id = ${disc.id} AND m.status = 1
        AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ${userId})
    `);
    return { discussionId: disc.id, unread: Number(row?.unread) };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private async ensureParticipant(discussionId: number, userId: number) {
    await this.db.execute(sql`
      INSERT IGNORE INTO journal_discussion_participants (discussion_id, user_id) VALUES (${discussionId}, ${userId})
    `);
  }
}
