import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  CreateJournalEventDto,
  UpdateJournalEventDto,
  QueryJournalEventsDto,
  CreateJournalTaskDto,
  UpdateJournalTaskDto,
  QueryJournalTasksDto,
  CreateAttachmentDto,
  UpdateJournalSettingsDto,
} from "./dto/journal.dto";

@Injectable()
export class JournalEntrepriseService {
  constructor(private readonly db: DatabaseService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboard(userId?: number) {
    const conn = this.db.getConnection();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const [[statsRow]] = await conn.execute(
      `SELECT
        COUNT(*) AS totalEvents,
        SUM(is_pinned) AS pinnedEvents,
        SUM(importance = 'haute') AS urgentEvents
       FROM journal_events
       WHERE status = 1 AND event_date >= ? AND event_date <= ?`,
      [firstOfMonth, today],
    );

    const [[taskRow]] = await conn.execute(
      `SELECT COUNT(*) AS openTasks FROM journal_tasks WHERE status = 1 AND is_done = 0`,
    );

    const [recentEvents] = await conn.execute(
      `SELECT * FROM journal_events WHERE status = 1 ORDER BY event_date DESC, created_at DESC LIMIT 5`,
    );

    const [upcomingTasks] = await conn.execute(
      `SELECT * FROM journal_tasks WHERE status = 1 AND is_done = 0 ORDER BY due_date ASC LIMIT 5`,
    );

    return {
      stats: {
        totalEvents: Number((statsRow as any).totalEvents) || 0,
        pinnedEvents: Number((statsRow as any).pinnedEvents) || 0,
        urgentEvents: Number((statsRow as any).urgentEvents) || 0,
        openTasks: Number((taskRow as any).openTasks) || 0,
      },
      recentEvents,
      upcomingTasks,
    };
  }

  // ── Événements ─────────────────────────────────────────────────────────────
  async findEvents(query: QueryJournalEventsDto) {
    const conn = this.db.getConnection();
    const conditions: string[] = ["status = 1"];
    const params: unknown[] = [];

    if (query.q) {
      conditions.push("(title LIKE ? OR description LIKE ? OR tags LIKE ?)");
      const like = `%${query.q}%`;
      params.push(like, like, like);
    }
    if (query.sourceModule) { conditions.push("source_module = ?"); params.push(query.sourceModule); }
    if (query.eventType) { conditions.push("event_type = ?"); params.push(query.eventType); }
    if (query.importance) { conditions.push("importance = ?"); params.push(query.importance); }
    if (query.startDate) { conditions.push("event_date >= ?"); params.push(query.startDate); }
    if (query.endDate) { conditions.push("event_date <= ?"); params.push(query.endDate); }
    if (query.isPinned !== undefined) { conditions.push("is_pinned = ?"); params.push(query.isPinned ? 1 : 0); }

    const where = conditions.join(" AND ");
    const limit = Math.min(query.limit || 100, 500);
    const offset = query.offset || 0;

    const [rows] = await conn.execute(
      `SELECT * FROM journal_events WHERE ${where} ORDER BY event_date DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[countRow]] = await conn.execute(
      `SELECT COUNT(*) AS total FROM journal_events WHERE ${where}`,
      params,
    );

    return { data: rows, total: Number((countRow as any).total) };
  }

  async findEvent(id: number) {
    const conn = this.db.getConnection();
    const [[row]] = await conn.execute(`SELECT * FROM journal_events WHERE id = ? AND status = 1`, [id]);
    if (!row) throw new NotFoundException(`Événement ${id} introuvable`);
    return row;
  }

  async createEvent(dto: CreateJournalEventDto, userId?: number) {
    const conn = this.db.getConnection();
    const [result] = await conn.execute(
      `INSERT INTO journal_events (title, event_type, source_module, importance, event_date, description, location, participants, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dto.title, dto.eventType || "note", dto.sourceModule || "general", dto.importance || "basse",
       dto.eventDate, dto.description || null, dto.location || null, dto.participants || null, dto.tags || null, userId || null],
    );
    await this.logAudit(conn, userId, "create", "journal_event", (result as any).insertId, `Créé: ${dto.title}`);
    return this.findEvent((result as any).insertId);
  }

  async updateEvent(id: number, dto: UpdateJournalEventDto, userId?: number) {
    await this.findEvent(id);
    const conn = this.db.getConnection();
    await conn.execute(
      `UPDATE journal_events SET title=?, event_type=?, source_module=?, importance=?, event_date=?,
       description=?, location=?, participants=?, tags=?, updated_at=NOW() WHERE id=?`,
      [dto.title, dto.eventType || "note", dto.sourceModule || "general", dto.importance || "basse",
       dto.eventDate, dto.description || null, dto.location || null, dto.participants || null, dto.tags || null, id],
    );
    await this.logAudit(conn, userId, "update", "journal_event", id, `Modifié: ${dto.title}`);
    return this.findEvent(id);
  }

  async deleteEvent(id: number, userId?: number) {
    await this.findEvent(id);
    const conn = this.db.getConnection();
    await conn.execute(`UPDATE journal_events SET status = 0, updated_at = NOW() WHERE id = ?`, [id]);
    await this.logAudit(conn, userId, "delete", "journal_event", id, `Supprimé`);
    return { deleted: true };
  }

  async pinEvent(id: number, pin: boolean, userId?: number) {
    await this.findEvent(id);
    const conn = this.db.getConnection();
    await conn.execute(`UPDATE journal_events SET is_pinned = ?, updated_at = NOW() WHERE id = ?`, [pin ? 1 : 0, id]);
    await this.logAudit(conn, userId, pin ? "pin" : "unpin", "journal_event", id, pin ? "Épinglé" : "Désépinglé");
    return this.findEvent(id);
  }

  // ── Calendrier ─────────────────────────────────────────────────────────────
  async getCalendar(year: number, month: number) {
    const conn = this.db.getConnection();
    const start = `${year}-${String(month).padStart(2,"0")}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);
    const [rows] = await conn.execute(
      `SELECT id, title, event_type, source_module, importance, is_pinned, event_date
       FROM journal_events WHERE status = 1 AND event_date >= ? AND event_date <= ? ORDER BY event_date`,
      [start, end],
    );
    return rows;
  }

  // ── Tâches ─────────────────────────────────────────────────────────────────
  async findTasks(query: QueryJournalTasksDto) {
    const conn = this.db.getConnection();
    const conditions: string[] = ["status = 1"];
    const params: unknown[] = [];

    if (query.status === "open") { conditions.push("is_done = 0"); }
    else if (query.status === "done") { conditions.push("is_done = 1"); }
    if (query.sourceModule) { conditions.push("source_module = ?"); params.push(query.sourceModule); }

    const where = conditions.join(" AND ");
    const [rows] = await conn.execute(
      `SELECT * FROM journal_tasks WHERE ${where} ORDER BY is_done ASC, due_date ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, Math.min(query.limit || 100, 500), query.offset || 0],
    );
    return rows;
  }

  async findTask(id: number) {
    const conn = this.db.getConnection();
    const [[row]] = await conn.execute(`SELECT * FROM journal_tasks WHERE id = ? AND status = 1`, [id]);
    if (!row) throw new NotFoundException(`Tâche ${id} introuvable`);
    return row;
  }

  async createTask(dto: CreateJournalTaskDto, userId?: number) {
    const conn = this.db.getConnection();
    const [result] = await conn.execute(
      `INSERT INTO journal_tasks (title, notes, due_date, reminder_date, priority, source_module, related_event_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dto.title, dto.notes || null, dto.dueDate || null, dto.reminderDate || null,
       dto.priority || "basse", dto.sourceModule || "general", dto.relatedEventId || null, userId || null],
    );
    await this.logAudit(conn, userId, "create", "journal_task", (result as any).insertId, `Créé: ${dto.title}`);
    return this.findTask((result as any).insertId);
  }

  async updateTask(id: number, dto: UpdateJournalTaskDto, userId?: number) {
    await this.findTask(id);
    const conn = this.db.getConnection();
    await conn.execute(
      `UPDATE journal_tasks SET title=?, notes=?, due_date=?, reminder_date=?, priority=?, source_module=?, updated_at=NOW() WHERE id=?`,
      [dto.title, dto.notes || null, dto.dueDate || null, dto.reminderDate || null,
       dto.priority || "basse", dto.sourceModule || "general", id],
    );
    await this.logAudit(conn, userId, "update", "journal_task", id, `Modifié: ${dto.title}`);
    return this.findTask(id);
  }

  async toggleTask(id: number, userId?: number) {
    const task = await this.findTask(id);
    const conn = this.db.getConnection();
    const nowDone = !(task as any).is_done;
    await conn.execute(
      `UPDATE journal_tasks SET is_done = ?, done_at = ?, updated_at = NOW() WHERE id = ?`,
      [nowDone ? 1 : 0, nowDone ? new Date() : null, id],
    );
    await this.logAudit(conn, userId, "toggle", "journal_task", id, nowDone ? "Coché" : "Décoché");
    return this.findTask(id);
  }

  async deleteTask(id: number, userId?: number) {
    await this.findTask(id);
    const conn = this.db.getConnection();
    await conn.execute(`UPDATE journal_tasks SET status = 0, updated_at = NOW() WHERE id = ?`, [id]);
    await this.logAudit(conn, userId, "delete", "journal_task", id, "Supprimé");
    return { deleted: true };
  }

  // ── Pièces jointes ─────────────────────────────────────────────────────────
  async getAttachments(eventId: number) {
    await this.findEvent(eventId);
    const conn = this.db.getConnection();
    const [rows] = await conn.execute(`SELECT * FROM journal_attachments WHERE event_id = ? ORDER BY created_at DESC`, [eventId]);
    return rows;
  }

  async addAttachment(eventId: number, dto: CreateAttachmentDto, userId?: number) {
    await this.findEvent(eventId);
    const conn = this.db.getConnection();
    const [result] = await conn.execute(
      `INSERT INTO journal_attachments (event_id, filename, mime_type, size_bytes, url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [eventId, dto.filename, dto.mimeType || null, dto.sizeBytes || null, dto.url || null, userId || null],
    );
    const [[row]] = await conn.execute(`SELECT * FROM journal_attachments WHERE id = ?`, [(result as any).insertId]);
    return row;
  }

  async deleteAttachment(id: number) {
    const conn = this.db.getConnection();
    await conn.execute(`DELETE FROM journal_attachments WHERE id = ?`, [id]);
    return { deleted: true };
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async exportEvents(params: QueryJournalEventsDto, format: "csv" | "json") {
    const { data } = await this.findEvents({ ...params, limit: 10000, offset: 0 });
    if (format === "json") return data;
    const headers = ["id","title","event_type","source_module","importance","event_date","location","participants","tags","description","is_pinned","created_at"];
    const rows = (data as any[]).map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g,'""')}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  async getAuditLog(params: { q?: string; limit?: number; offset?: number }) {
    const conn = this.db.getConnection();
    const conditions: string[] = [];
    const p: unknown[] = [];
    if (params.q) {
      conditions.push("(user_name LIKE ? OR user_email LIKE ? OR description LIKE ? OR action LIKE ?)");
      const like = `%${params.q}%`;
      p.push(like, like, like, like);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(params.limit || 30, 200);
    const offset = params.offset || 0;
    const [rows] = await conn.execute(`SELECT * FROM journal_audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...p, limit, offset]);
    const [[countRow]] = await conn.execute(`SELECT COUNT(*) AS total FROM journal_audit_log ${where}`, p);
    return { data: rows, total: Number((countRow as any).total) };
  }

  // ── Paramètres ─────────────────────────────────────────────────────────────
  async getSettings() {
    const conn = this.db.getConnection();
    const [[row]] = await conn.execute(`SELECT * FROM journal_settings WHERE id = 1`);
    return row || {};
  }

  async updateSettings(dto: UpdateJournalSettingsDto) {
    const conn = this.db.getConnection();
    const fields = Object.entries(dto)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => {
        const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
        return `${col} = ?`;
      });
    if (!fields.length) return this.getSettings();
    const values = Object.values(dto).filter((v) => v !== undefined);
    await conn.execute(`UPDATE journal_settings SET ${fields.join(", ")}, updated_at = NOW() WHERE id = 1`, values);
    return this.getSettings();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async logAudit(conn: any, userId: number | undefined, action: string, entityType: string, entityId: number, description: string) {
    try {
      await conn.execute(
        `INSERT INTO journal_audit_log (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)`,
        [userId || null, action, entityType, entityId, description],
      );
    } catch { /* audit non bloquant */ }
  }
}
