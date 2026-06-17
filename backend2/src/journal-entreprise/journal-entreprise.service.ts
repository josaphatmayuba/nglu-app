import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";
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

// Le module journal-entreprise utilise du SQL via le client Drizzle (db.execute(sql`...`)),
// jamais le pool mysql2 directement. Les tables (journal_events, journal_tasks, etc.) ne sont
// pas encore modélisées dans schema.ts : on passe par sql`` paramétré (binding sûr).
@Injectable()
export class JournalEntrepriseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Exécute une requête sql`` et renvoie le tableau de lignes. */
  private async rows<T = any>(query: SQL): Promise<T[]> {
    const res = await this.db.execute(query);
    const data = Array.isArray(res) ? res[0] : res;
    return (data as unknown as T[]) ?? [];
  }

  /** Exécute une requête sql`` et renvoie la 1re ligne (ou undefined). */
  private async row<T = any>(query: SQL): Promise<T | undefined> {
    const r = await this.rows<T>(query);
    return r[0];
  }

  /** INSERT : renvoie l'insertId. */
  private async insert(query: SQL): Promise<number> {
    const res: any = await this.db.execute(query);
    const meta = Array.isArray(res) ? res[0] : res;
    return Number(meta?.insertId ?? 0);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboard(_userId?: number) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const statsRow = await this.row<{ totalEvents: number; pinnedEvents: number; urgentEvents: number }>(sql`
      SELECT
        COUNT(*) AS totalEvents,
        SUM(is_pinned) AS pinnedEvents,
        SUM(importance = 'haute') AS urgentEvents
      FROM journal_events
      WHERE status = 1 AND event_date >= ${firstOfMonth} AND event_date <= ${today}
    `);

    const taskRow = await this.row<{ openTasks: number }>(sql`
      SELECT COUNT(*) AS openTasks FROM journal_tasks WHERE status = 1 AND is_done = 0
    `);

    const recentEvents = await this.rows(sql`
      SELECT * FROM journal_events WHERE status = 1 ORDER BY event_date DESC, created_at DESC LIMIT 5
    `);

    const upcomingTasks = await this.rows(sql`
      SELECT * FROM journal_tasks WHERE status = 1 AND is_done = 0 ORDER BY due_date ASC LIMIT 5
    `);

    return {
      stats: {
        totalEvents: Number(statsRow?.totalEvents) || 0,
        pinnedEvents: Number(statsRow?.pinnedEvents) || 0,
        urgentEvents: Number(statsRow?.urgentEvents) || 0,
        openTasks: Number(taskRow?.openTasks) || 0,
      },
      recentEvents,
      upcomingTasks,
    };
  }

  // ── Événements ─────────────────────────────────────────────────────────────
  async findEvents(query: QueryJournalEventsDto) {
    const conditions: SQL[] = [sql`status = 1`];

    if (query.q) {
      const like = `%${query.q}%`;
      conditions.push(sql`(title LIKE ${like} OR description LIKE ${like} OR tags LIKE ${like})`);
    }
    if (query.sourceModule) conditions.push(sql`source_module = ${query.sourceModule}`);
    if (query.eventType) conditions.push(sql`event_type = ${query.eventType}`);
    if (query.importance) conditions.push(sql`importance = ${query.importance}`);
    if (query.startDate) conditions.push(sql`event_date >= ${query.startDate}`);
    if (query.endDate) conditions.push(sql`event_date <= ${query.endDate}`);
    if (query.isPinned !== undefined) conditions.push(sql`is_pinned = ${query.isPinned ? 1 : 0}`);

    const where = sql.join(conditions, sql` AND `);
    const limit = Math.min(query.limit || 100, 500);
    const offset = query.offset || 0;

    const rows = await this.rows(sql`
      SELECT * FROM journal_events WHERE ${where}
      ORDER BY event_date DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const countRow = await this.row<{ total: number }>(sql`
      SELECT COUNT(*) AS total FROM journal_events WHERE ${where}
    `);

    return { data: rows, total: Number(countRow?.total) };
  }

  async findEvent(id: number) {
    const row = await this.row(sql`SELECT * FROM journal_events WHERE id = ${id} AND status = 1`);
    if (!row) throw new NotFoundException(`Événement ${id} introuvable`);
    return row;
  }

  async createEvent(dto: CreateJournalEventDto, userId?: number) {
    const insertId = await this.insert(sql`
      INSERT INTO journal_events (title, event_type, source_module, importance, event_date, description, location, participants, tags, created_by)
      VALUES (${dto.title}, ${dto.eventType || "note"}, ${dto.sourceModule || "general"}, ${dto.importance || "basse"},
        ${dto.eventDate}, ${dto.description || null}, ${dto.location || null}, ${dto.participants || null}, ${dto.tags || null}, ${userId || null})
    `);
    await this.logAudit(userId, "create", "journal_event", insertId, `Créé: ${dto.title}`);
    return this.findEvent(insertId);
  }

  async updateEvent(id: number, dto: UpdateJournalEventDto, userId?: number) {
    await this.findEvent(id);
    await this.db.execute(sql`
      UPDATE journal_events SET title=${dto.title}, event_type=${dto.eventType || "note"}, source_module=${dto.sourceModule || "general"},
        importance=${dto.importance || "basse"}, event_date=${dto.eventDate}, description=${dto.description || null},
        location=${dto.location || null}, participants=${dto.participants || null}, tags=${dto.tags || null}, updated_at=NOW()
      WHERE id=${id}
    `);
    await this.logAudit(userId, "update", "journal_event", id, `Modifié: ${dto.title}`);
    return this.findEvent(id);
  }

  async deleteEvent(id: number, userId?: number) {
    await this.findEvent(id);
    await this.db.execute(sql`UPDATE journal_events SET status = 0, updated_at = NOW() WHERE id = ${id}`);
    await this.logAudit(userId, "delete", "journal_event", id, `Supprimé`);
    return { deleted: true };
  }

  async pinEvent(id: number, pin: boolean, userId?: number) {
    await this.findEvent(id);
    await this.db.execute(sql`UPDATE journal_events SET is_pinned = ${pin ? 1 : 0}, updated_at = NOW() WHERE id = ${id}`);
    await this.logAudit(userId, pin ? "pin" : "unpin", "journal_event", id, pin ? "Épinglé" : "Désépinglé");
    return this.findEvent(id);
  }

  // ── Calendrier ─────────────────────────────────────────────────────────────
  async getCalendar(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);
    return this.rows(sql`
      SELECT id, title, event_type, source_module, importance, is_pinned, event_date
      FROM journal_events WHERE status = 1 AND event_date >= ${start} AND event_date <= ${end} ORDER BY event_date
    `);
  }

  // ── Tâches ─────────────────────────────────────────────────────────────────
  async findTasks(query: QueryJournalTasksDto) {
    const conditions: SQL[] = [sql`status = 1`];
    if (query.status === "open") conditions.push(sql`is_done = 0`);
    else if (query.status === "done") conditions.push(sql`is_done = 1`);
    if (query.sourceModule) conditions.push(sql`source_module = ${query.sourceModule}`);

    const where = sql.join(conditions, sql` AND `);
    const limit = Math.min(query.limit || 100, 500);
    const offset = query.offset || 0;
    return this.rows(sql`
      SELECT * FROM journal_tasks WHERE ${where} ORDER BY is_done ASC, due_date ASC, created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
  }

  async findTask(id: number) {
    const row = await this.row(sql`SELECT * FROM journal_tasks WHERE id = ${id} AND status = 1`);
    if (!row) throw new NotFoundException(`Tâche ${id} introuvable`);
    return row;
  }

  async createTask(dto: CreateJournalTaskDto, userId?: number) {
    const insertId = await this.insert(sql`
      INSERT INTO journal_tasks (title, notes, due_date, reminder_date, priority, source_module, related_event_id, created_by)
      VALUES (${dto.title}, ${dto.notes || null}, ${dto.dueDate || null}, ${dto.reminderDate || null},
        ${dto.priority || "basse"}, ${dto.sourceModule || "general"}, ${dto.relatedEventId || null}, ${userId || null})
    `);
    await this.logAudit(userId, "create", "journal_task", insertId, `Créé: ${dto.title}`);
    return this.findTask(insertId);
  }

  async updateTask(id: number, dto: UpdateJournalTaskDto, userId?: number) {
    await this.findTask(id);
    await this.db.execute(sql`
      UPDATE journal_tasks SET title=${dto.title}, notes=${dto.notes || null}, due_date=${dto.dueDate || null},
        reminder_date=${dto.reminderDate || null}, priority=${dto.priority || "basse"}, source_module=${dto.sourceModule || "general"}, updated_at=NOW()
      WHERE id=${id}
    `);
    await this.logAudit(userId, "update", "journal_task", id, `Modifié: ${dto.title}`);
    return this.findTask(id);
  }

  async toggleTask(id: number, userId?: number) {
    const task: any = await this.findTask(id);
    const nowDone = !task.is_done;
    await this.db.execute(sql`
      UPDATE journal_tasks SET is_done = ${nowDone ? 1 : 0}, done_at = ${nowDone ? new Date() : null}, updated_at = NOW() WHERE id = ${id}
    `);
    await this.logAudit(userId, "toggle", "journal_task", id, nowDone ? "Coché" : "Décoché");
    return this.findTask(id);
  }

  async deleteTask(id: number, userId?: number) {
    await this.findTask(id);
    await this.db.execute(sql`UPDATE journal_tasks SET status = 0, updated_at = NOW() WHERE id = ${id}`);
    await this.logAudit(userId, "delete", "journal_task", id, "Supprimé");
    return { deleted: true };
  }

  // ── Pièces jointes ─────────────────────────────────────────────────────────
  async getAttachments(eventId: number) {
    await this.findEvent(eventId);
    return this.rows(sql`SELECT * FROM journal_attachments WHERE event_id = ${eventId} ORDER BY created_at DESC`);
  }

  async addAttachment(eventId: number, dto: CreateAttachmentDto, _userId?: number) {
    await this.findEvent(eventId);
    const insertId = await this.insert(sql`
      INSERT INTO journal_attachments (event_id, filename, mime_type, size_bytes, url, uploaded_by)
      VALUES (${eventId}, ${dto.filename}, ${dto.mimeType || null}, ${dto.sizeBytes || null}, ${dto.url || null}, ${_userId || null})
    `);
    return this.row(sql`SELECT * FROM journal_attachments WHERE id = ${insertId}`);
  }

  async deleteAttachment(id: number) {
    await this.db.execute(sql`DELETE FROM journal_attachments WHERE id = ${id}`);
    return { deleted: true };
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async exportEvents(params: QueryJournalEventsDto, format: "csv" | "json") {
    const { data } = await this.findEvents({ ...params, limit: 10000, offset: 0 });
    if (format === "json") return data;
    const headers = ["id", "title", "event_type", "source_module", "importance", "event_date", "location", "participants", "tags", "description", "is_pinned", "created_at"];
    const rows = (data as any[]).map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  async getAuditLog(params: { q?: string; limit?: number; offset?: number }) {
    const conditions: SQL[] = [];
    if (params.q) {
      const like = `%${params.q}%`;
      conditions.push(sql`(user_name LIKE ${like} OR user_email LIKE ${like} OR description LIKE ${like} OR action LIKE ${like})`);
    }
    const where = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const limit = Math.min(params.limit || 30, 200);
    const offset = params.offset || 0;
    const rows = await this.rows(sql`SELECT * FROM journal_audit_log ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
    const countRow = await this.row<{ total: number }>(sql`SELECT COUNT(*) AS total FROM journal_audit_log ${where}`);
    return { data: rows, total: Number(countRow?.total) };
  }

  // ── Paramètres ─────────────────────────────────────────────────────────────
  async getSettings() {
    const row = await this.row(sql`SELECT * FROM journal_settings WHERE id = 1`);
    return row || {};
  }

  async updateSettings(dto: UpdateJournalSettingsDto) {
    const assignments: SQL[] = Object.entries(dto)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
        return sql`${sql.raw(col)} = ${v as any}`;
      });
    if (!assignments.length) return this.getSettings();
    await this.db.execute(sql`
      UPDATE journal_settings SET ${sql.join(assignments, sql`, `)}, updated_at = NOW() WHERE id = 1
    `);
    return this.getSettings();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async logAudit(userId: number | undefined, action: string, entityType: string, entityId: number, description: string) {
    try {
      await this.db.execute(sql`
        INSERT INTO journal_audit_log (user_id, action, entity_type, entity_id, description)
        VALUES (${userId || null}, ${action}, ${entityType}, ${entityId}, ${description})
      `);
    } catch {
      /* audit non bloquant */
    }
  }
}
