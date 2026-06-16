import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class ChatService {
  constructor(private readonly db: DatabaseService) {}

  private get conn() { return this.db.getConnection(); }

  // ── Channels ────────────────────────────────────────────────────────────────
  async getChannels(userId: number) {
    const [rows] = await this.conn.execute(
      `SELECT c.id, c.slug, c.name, c.description, c.icon, c.color, c.is_default,
              m.role, m.joined_at,
              (SELECT COUNT(*) FROM journal_messages jm
               JOIN journal_discussions jd ON jd.id = jm.discussion_id
               WHERE jd.channel_id = c.id AND jd.discussion_type = 'channel' AND jm.status = 1
                 AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = jm.id AND r.user_id = ?)) AS unread
       FROM chat_channels c
       LEFT JOIN chat_channel_members m ON m.channel_id = c.id AND m.user_id = ?
       WHERE c.status = 1 AND (c.is_default = 1 OR m.user_id IS NOT NULL)
       ORDER BY c.is_default DESC, c.name`,
      [userId, userId],
    ) as any;
    return rows;
  }

  async getAllChannels() {
    const [rows] = await this.conn.execute(
      `SELECT id, slug, name, description, icon, color, is_default, created_at
       FROM chat_channels WHERE status = 1 ORDER BY name`,
    ) as any;
    return rows;
  }

  async createChannel(data: {
    slug: string; name: string; description?: string;
    icon?: string; color?: string; isDefault?: boolean; createdBy: number;
  }) {
    const [res] = await this.conn.execute(
      `INSERT INTO chat_channels (slug, name, description, icon, color, is_default, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.slug, data.name, data.description ?? null, data.icon ?? null,
       data.color ?? '#6366f1', data.isDefault ? 1 : 0, data.createdBy],
    ) as any;
    await this.joinChannel(res.insertId, data.createdBy, 'admin');
    return { id: res.insertId, ...data };
  }

  async joinChannel(channelId: number, userId: number, role = 'member') {
    await this.conn.execute(
      `INSERT IGNORE INTO chat_channel_members (channel_id, user_id, role) VALUES (?, ?, ?)`,
      [channelId, userId, role],
    );
  }

  async getChannelMembers(channelId: number) {
    const [rows] = await this.conn.execute(
      `SELECT m.user_id, m.role, m.joined_at, u.firstName, u.lastName, u.email
       FROM chat_channel_members m
       LEFT JOIN user u ON u.id = m.user_id
       WHERE m.channel_id = ?`,
      [channelId],
    ) as any;
    return rows;
  }

  // ── Discussion d'un channel ─────────────────────────────────────────────────
  async getOrCreateChannelDiscussion(channelId: number, userId: number) {
    const [[disc]] = await this.conn.execute(
      `SELECT id FROM journal_discussions WHERE channel_id = ? AND discussion_type = 'channel' AND status = 1 LIMIT 1`,
      [channelId],
    ) as any;
    if (disc) return disc;

    const [[ch]] = await this.conn.execute(
      `SELECT name FROM chat_channels WHERE id = ?`, [channelId],
    ) as any;

    const [res] = await this.conn.execute(
      `INSERT INTO journal_discussions (entity_type, entity_id, channel_id, discussion_type, title, created_by)
       VALUES ('channel', ?, ?, 'channel', ?, ?)`,
      [channelId, channelId, ch?.name ?? 'Canal', userId],
    ) as any;
    return { id: res.insertId };
  }

  // ── Sujets liés (events + tickets) ─────────────────────────────────────────
  async getTopics(userId: number, filters: { q?: string; type?: string } = {}) {
    let where = "d.status = 1 AND d.discussion_type = 'entity'";
    const args: any[] = [userId];

    if (filters.type === 'event') where += " AND d.entity_type = 'journal_event'";
    else if (filters.type === 'ticket') where += " AND d.entity_type = 'crm_ticket'";

    const [rows] = await this.conn.execute(
      `SELECT d.id, d.entity_type, d.entity_id, d.title, d.created_at,
              (SELECT COUNT(*) FROM journal_messages m WHERE m.discussion_id = d.id AND m.status = 1
                 AND NOT EXISTS (SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ?)) AS unread,
              (SELECT m2.content FROM journal_messages m2 WHERE m2.discussion_id = d.id AND m2.status = 1
               ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
              (SELECT m2.created_at FROM journal_messages m2 WHERE m2.discussion_id = d.id AND m2.status = 1
               ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at,
              je.title AS event_title, je.event_type, je.importance
       FROM journal_discussions d
       LEFT JOIN journal_discussion_participants p ON p.discussion_id = d.id AND p.user_id = ?
       LEFT JOIN journal_events je ON je.id = d.entity_id AND d.entity_type = 'journal_event'
       WHERE ${where} AND (p.user_id IS NOT NULL OR d.created_by = ?)
       ORDER BY COALESCE(last_message_at, d.created_at) DESC
       LIMIT 100`,
      [userId, userId, userId],
    ) as any;
    return rows;
  }

  // ── Messages d'une discussion (channel ou sujet) ────────────────────────────
  async getMessages(discussionId: number, userId: number, limit = 60, beforeId?: number) {
    const args: any[] = [userId, discussionId];
    let cursor = "";
    if (beforeId) { cursor = "AND m.id < ?"; args.push(beforeId); }
    args.push(limit);

    const [rows] = await this.conn.execute(
      `SELECT m.id, m.sender_id, m.content, m.mentions, m.attachment_url,
              m.attachment_name, m.created_at,
              u.firstName, u.lastName,
              EXISTS(SELECT 1 FROM journal_message_reads r WHERE r.message_id = m.id AND r.user_id = ?) AS is_read
       FROM journal_messages m
       LEFT JOIN user u ON u.id = m.sender_id
       WHERE m.discussion_id = ? AND m.status = 1 ${cursor}
       ORDER BY m.created_at DESC LIMIT ?`,
      args,
    ) as any;

    // Marquer comme lus
    if ((rows as any[]).length > 0) {
      await this.conn.execute(
        `INSERT IGNORE INTO journal_message_reads (message_id, user_id)
         SELECT id, ? FROM journal_messages WHERE discussion_id = ? AND status = 1`,
        [userId, discussionId],
      );
    }

    return (rows as any[]).reverse();
  }

  async sendMessage(discussionId: number, userId: number, content: string, mentions: number[] = []) {
    const [res] = await this.conn.execute(
      `INSERT INTO journal_messages (discussion_id, sender_id, content, mentions) VALUES (?, ?, ?, ?)`,
      [discussionId, userId, content, JSON.stringify(mentions)],
    ) as any;

    await this.conn.execute(
      `INSERT IGNORE INTO journal_message_reads (message_id, user_id) VALUES (?, ?)`,
      [res.insertId, userId],
    );

    // Ajouter mentions comme participants
    for (const uid of mentions) {
      await this.conn.execute(
        `INSERT IGNORE INTO journal_discussion_participants (discussion_id, user_id) VALUES (?, ?)`,
        [discussionId, uid],
      );
    }

    const [[msg]] = await this.conn.execute(
      `SELECT m.id, m.discussion_id, m.sender_id, m.content, m.mentions,
              m.created_at, u.firstName, u.lastName
       FROM journal_messages m LEFT JOIN user u ON u.id = m.sender_id WHERE m.id = ?`,
      [res.insertId],
    ) as any;
    return msg;
  }

  // ── Utilisateurs disponibles (pour @mention) ────────────────────────────────
  async getUsers() {
    const [rows] = await this.conn.execute(
      `SELECT id, firstName, lastName, email FROM user WHERE status = 1 ORDER BY firstName LIMIT 200`,
    ) as any;
    return rows;
  }
}
