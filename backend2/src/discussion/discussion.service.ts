import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class DiscussionService {
  constructor(private readonly db: DatabaseService) {}

  private get conn() {
    return this.db.getConnection();
  }

  // ── Obtenir ou créer la discussion pour une entité ─────────────────────────
  async getOrCreateDiscussion(entityType: string, entityId: number, userId: number) {
    const [[existing]] = await this.conn.execute(
      `SELECT id, title, created_by, created_at FROM journal_discussions
       WHERE entity_type = ? AND entity_id = ? AND status = 1 LIMIT 1`,
      [entityType, entityId],
    ) as any;

    if (existing) {
      await this.ensureParticipant(existing.id, userId);
      return existing;
    }

    const [result] = await this.conn.execute(
      `INSERT INTO journal_discussions (entity_type, entity_id, created_by) VALUES (?, ?, ?)`,
      [entityType, entityId, userId],
    ) as any;

    const discussionId = result.insertId;
    await this.ensureParticipant(discussionId, userId);
    return { id: discussionId, entity_type: entityType, entity_id: entityId, created_by: userId };
  }

  // ── Messages ────────────────────────────────────────────────────────────────
  async getMessages(discussionId: number, userId: number, limit = 50, beforeId?: number) {
    await this.ensureParticipant(discussionId, userId);

    const args: any[] = [discussionId];
    let cursor = "";
    if (beforeId) {
      cursor = "AND m.id < ?";
      args.push(beforeId);
    }
    args.push(limit);

    const [rows] = await this.conn.execute(
      `SELECT m.id, m.discussion_id, m.sender_id, m.content, m.mentions,
              m.attachment_url, m.attachment_name, m.created_at,
              u.firstName, u.lastName,
              EXISTS(SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ?) AS is_read
       FROM journal_messages m
       LEFT JOIN user u ON u.id = m.sender_id
       WHERE m.discussion_id = ? AND m.status = 1 ${cursor}
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [userId, ...args],
    ) as any;

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

    const [result] = await this.conn.execute(
      `INSERT INTO journal_messages (discussion_id, sender_id, content, mentions, attachment_url, attachment_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [discussionId, userId, content, JSON.stringify(mentions), attachmentUrl ?? null, attachmentName ?? null],
    ) as any;

    const messageId = result.insertId;

    // Marquer comme lu par l'expéditeur
    await this.markRead(messageId, userId);

    // Ajouter les mentionnés comme participants
    for (const uid of mentions) {
      await this.ensureParticipant(discussionId, uid);
    }

    const [[msg]] = await this.conn.execute(
      `SELECT m.id, m.discussion_id, m.sender_id, m.content, m.mentions,
              m.attachment_url, m.attachment_name, m.created_at,
              u.firstName, u.lastName
       FROM journal_messages m
       LEFT JOIN user u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [messageId],
    ) as any;

    return msg;
  }

  async markRead(messageId: number, userId: number) {
    await this.conn.execute(
      `INSERT IGNORE INTO journal_message_reads (message_id, user_id) VALUES (?, ?)`,
      [messageId, userId],
    );
  }

  async markAllRead(discussionId: number, userId: number) {
    await this.conn.execute(
      `INSERT IGNORE INTO journal_message_reads (message_id, user_id)
       SELECT id, ? FROM journal_messages WHERE discussion_id = ? AND status = 1`,
      [userId, discussionId],
    );
  }

  // ── Participants ────────────────────────────────────────────────────────────
  async getParticipants(discussionId: number) {
    const [rows] = await this.conn.execute(
      `SELECT p.user_id, p.joined_at, u.firstName, u.lastName, u.email
       FROM journal_discussion_participants p
       LEFT JOIN user u ON u.id = p.user_id
       WHERE p.discussion_id = ?`,
      [discussionId],
    ) as any;
    return rows;
  }

  async addParticipant(discussionId: number, userId: number) {
    await this.ensureParticipant(discussionId, userId);
    return { discussionId, userId };
  }

  // ── Unread count ────────────────────────────────────────────────────────────
  async getUnreadCount(entityType: string, entityId: number, userId: number) {
    const [[disc]] = await this.conn.execute(
      `SELECT id FROM journal_discussions WHERE entity_type = ? AND entity_id = ? AND status = 1 LIMIT 1`,
      [entityType, entityId],
    ) as any;

    if (!disc) return { unread: 0 };

    const [[row]] = await this.conn.execute(
      `SELECT COUNT(*) AS unread
       FROM journal_messages m
       WHERE m.discussion_id = ? AND m.status = 1
         AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ?)`,
      [disc.id, userId],
    ) as any;

    return { discussionId: disc.id, unread: Number(row.unread) };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private async ensureParticipant(discussionId: number, userId: number) {
    await this.conn.execute(
      `INSERT IGNORE INTO journal_discussion_participants (discussion_id, user_id) VALUES (?, ?)`,
      [discussionId, userId],
    );
  }
}
