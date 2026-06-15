import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Put, Query, Res, UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import {
  CreateJournalEventDto, UpdateJournalEventDto, QueryJournalEventsDto,
  CreateJournalTaskDto, UpdateJournalTaskDto, QueryJournalTasksDto,
  CreateAttachmentDto, UpdateJournalSettingsDto,
} from "./dto/journal.dto";
import { JournalEntrepriseService } from "./journal-entreprise.service";

@ApiTags("journal-entreprise")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("journal-entreprise")
export class JournalEntrepriseController {
  constructor(private readonly svc: JournalEntrepriseService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────
  @Get("dashboard")
  @ApiOperation({ summary: "Tableau de bord Journal" })
  getDashboard(@CurrentUserId() userId: number) {
    return this.svc.getDashboard(userId);
  }

  // ── Événements ─────────────────────────────────────────────────────────────
  @Get("events")
  @ApiOperation({ summary: "Liste des événements" })
  findEvents(@Query() query: QueryJournalEventsDto) {
    return this.svc.findEvents(query);
  }

  @Get("events/calendar")
  @ApiOperation({ summary: "Événements du mois (vue calendrier)" })
  getCalendar(@Query("year") year: string, @Query("month") month: string) {
    return this.svc.getCalendar(parseInt(year, 10), parseInt(month, 10));
  }

  @Get("events/:id")
  @ApiOperation({ summary: "Détail d'un événement" })
  findEvent(@Param("id", ParseIntPipe) id: number) {
    return this.svc.findEvent(id);
  }

  @Post("events")
  @ApiOperation({ summary: "Créer un événement" })
  createEvent(@Body() dto: CreateJournalEventDto, @CurrentUserId() userId: number) {
    return this.svc.createEvent(dto, userId);
  }

  @Put("events/:id")
  @ApiOperation({ summary: "Modifier un événement" })
  updateEvent(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateJournalEventDto, @CurrentUserId() userId: number) {
    return this.svc.updateEvent(id, dto, userId);
  }

  @Delete("events/:id")
  @ApiOperation({ summary: "Supprimer un événement (soft delete)" })
  deleteEvent(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.deleteEvent(id, userId);
  }

  @Patch("events/:id/pin")
  @ApiOperation({ summary: "Épingler un événement" })
  pinEvent(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.pinEvent(id, true, userId);
  }

  @Patch("events/:id/unpin")
  @ApiOperation({ summary: "Désépingler un événement" })
  unpinEvent(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.pinEvent(id, false, userId);
  }

  // ── Pièces jointes ─────────────────────────────────────────────────────────
  @Get("events/:id/attachments")
  @ApiOperation({ summary: "Pièces jointes d'un événement" })
  getAttachments(@Param("id", ParseIntPipe) id: number) {
    return this.svc.getAttachments(id);
  }

  @Post("events/:id/attachments")
  @ApiOperation({ summary: "Ajouter une pièce jointe" })
  addAttachment(@Param("id", ParseIntPipe) id: number, @Body() dto: CreateAttachmentDto, @CurrentUserId() userId: number) {
    return this.svc.addAttachment(id, dto, userId);
  }

  @Delete("attachments/:id")
  @ApiOperation({ summary: "Supprimer une pièce jointe" })
  deleteAttachment(@Param("id", ParseIntPipe) id: number) {
    return this.svc.deleteAttachment(id);
  }

  // ── Tâches ─────────────────────────────────────────────────────────────────
  @Get("tasks")
  @ApiOperation({ summary: "Liste des tâches" })
  findTasks(@Query() query: QueryJournalTasksDto) {
    return this.svc.findTasks(query);
  }

  @Get("tasks/:id")
  @ApiOperation({ summary: "Détail d'une tâche" })
  findTask(@Param("id", ParseIntPipe) id: number) {
    return this.svc.findTask(id);
  }

  @Post("tasks")
  @ApiOperation({ summary: "Créer une tâche" })
  createTask(@Body() dto: CreateJournalTaskDto, @CurrentUserId() userId: number) {
    return this.svc.createTask(dto, userId);
  }

  @Put("tasks/:id")
  @ApiOperation({ summary: "Modifier une tâche" })
  updateTask(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateJournalTaskDto, @CurrentUserId() userId: number) {
    return this.svc.updateTask(id, dto, userId);
  }

  @Patch("tasks/:id/toggle")
  @ApiOperation({ summary: "Cocher / décocher une tâche" })
  toggleTask(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.toggleTask(id, userId);
  }

  @Delete("tasks/:id")
  @ApiOperation({ summary: "Supprimer une tâche (soft delete)" })
  deleteTask(@Param("id", ParseIntPipe) id: number, @CurrentUserId() userId: number) {
    return this.svc.deleteTask(id, userId);
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  @Get("export/csv")
  @ApiOperation({ summary: "Exporter les événements en CSV" })
  async exportCsv(@Query() query: QueryJournalEventsDto, @Res() res: Response) {
    const csv = await this.svc.exportEvents(query, "csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="journal-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  }

  @Get("export/json")
  @ApiOperation({ summary: "Exporter les événements en JSON" })
  async exportJson(@Query() query: QueryJournalEventsDto) {
    return this.svc.exportEvents(query, "json");
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  @Get("audit")
  @ApiOperation({ summary: "Journal d'audit" })
  getAuditLog(@Query("q") q: string, @Query("limit") limit: string, @Query("offset") offset: string) {
    return this.svc.getAuditLog({ q, limit: limit ? parseInt(limit, 10) : 30, offset: offset ? parseInt(offset, 10) : 0 });
  }

  // ── Paramètres ─────────────────────────────────────────────────────────────
  @Get("settings")
  @ApiOperation({ summary: "Paramètres du journal" })
  getSettings() {
    return this.svc.getSettings();
  }

  @Put("settings")
  @ApiOperation({ summary: "Mettre à jour les paramètres" })
  updateSettings(@Body() dto: UpdateJournalSettingsDto) {
    return this.svc.updateSettings(dto);
  }
}
