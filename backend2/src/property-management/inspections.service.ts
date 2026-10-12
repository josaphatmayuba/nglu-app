import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  realEstateInspectionItems,
  realEstateInspectionPhotos,
  realEstateInspections,
  realEstateLeases,
  realEstateUnits,
} from "../database/schema";
import type { Database } from "../database/types";
import { buildInspectionComparison } from "./inspection-compare";
import type { CreateInspectionDto, SignInspectionDto, UpdateInspectionDto } from "./dto/property-management.dto";
import { ObjectStorageService } from "./object-storage.service";

type Scope = "all" | number[];

const ROOM_ELEMENTS: Array<{ room: (n: number) => string; elements: string[]; repeat?: "bedrooms" | "bathrooms" }> = [
  { room: () => "Entrée", elements: ["Porte et serrure", "Sol", "Murs", "Plafond", "Éclairage et prises"] },
  { room: () => "Séjour", elements: ["Sol", "Murs", "Plafond", "Fenêtres", "Porte", "Éclairage et prises"] },
  { room: () => "Cuisine", elements: ["Sol", "Murs", "Plafond", "Évier et robinetterie", "Plan de travail", "Placards", "Prises"] },
  { room: (n) => `Chambre ${n}`, elements: ["Sol", "Murs", "Plafond", "Fenêtres", "Porte", "Placards", "Éclairage et prises"], repeat: "bedrooms" },
  { room: (n) => `Salle d'eau ${n}`, elements: ["Sol", "Murs", "Douche / baignoire", "Lavabo", "Robinetterie", "Fenêtre ou ventilation"], repeat: "bathrooms" },
  { room: () => "WC", elements: ["Cuvette et chasse", "Sol", "Murs", "Porte"] },
  { room: () => "Extérieur", elements: ["Clôture / portail", "Cour ou balcon", "Boîte aux lettres"] },
];

// Modele de pieces par defaut, construit depuis le nombre de chambres / salles d'eau du lot.
export function buildDefaultInspectionItems(bedrooms: number, bathrooms: number) {
  const out: Array<{ room: string; element: string }> = [];
  for (const def of ROOM_ELEMENTS) {
    const count = def.repeat === "bedrooms" ? bedrooms : def.repeat === "bathrooms" ? bathrooms : 1;
    for (let n = 1; n <= count; n++) {
      const room = def.repeat && count === 1 ? def.room(n).replace(/ 1$/, "") : def.room(n);
      for (const element of def.elements) out.push({ room, element });
    }
  }
  return out;
}

@Injectable()
export class InspectionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  // ── Garde-fous : organisation + portee propriete du bail ──────────────────

  private async findLease(leaseId: number, orgId: number, scope: Scope) {
    const [lease] = await this.db
      .select()
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);
    if (!lease) throw new NotFoundException("Bail introuvable.");
    this.ensureScope(lease.propertyId, scope);
    return lease;
  }

  private ensureScope(propertyId: number, scope: Scope) {
    if (scope !== "all" && !scope.includes(propertyId)) throw new NotFoundException("Bail introuvable.");
  }

  private async findInspection(id: number, orgId: number, scope: Scope) {
    const [row] = await this.db
      .select()
      .from(realEstateInspections)
      .where(and(
        eq(realEstateInspections.id, id),
        eq(realEstateInspections.organizationId, orgId),
        eq(realEstateInspections.isDeleted, 0),
      ))
      .limit(1);
    if (!row) throw new NotFoundException("Etat des lieux introuvable.");
    this.ensureScope(row.propertyId, scope);
    return row;
  }

  private async findDraft(id: number, orgId: number, scope: Scope) {
    const row = await this.findInspection(id, orgId, scope);
    if (row.status === "signed") throw new ConflictException("Etat des lieux signe : modification impossible.");
    return row;
  }

  private summary(row: typeof realEstateInspections.$inferSelect) {
    const { landlordSignatureData, tenantSignatureData, tenantSignerIp, tenantSignerUa, ...rest } = row;
    return {
      ...rest,
      landlordSigned: !!landlordSignatureData,
      tenantSigned: !!tenantSignatureData,
    };
  }

  // ── Lecture ───────────────────────────────────────────────────────────────

  async listForLease(leaseId: number, orgId: number, scope: Scope) {
    await this.findLease(leaseId, orgId, scope);
    const rows = await this.db
      .select()
      .from(realEstateInspections)
      .where(and(
        eq(realEstateInspections.leaseId, leaseId),
        eq(realEstateInspections.organizationId, orgId),
        eq(realEstateInspections.isDeleted, 0),
      ))
      .orderBy(desc(realEstateInspections.id));
    return rows.map((r) => this.summary(r));
  }

  async getInspection(id: number, orgId: number, scope: Scope) {
    const row = await this.findInspection(id, orgId, scope);
    const { tenantSignerIp, tenantSignerUa, ...rest } = row;
    const items = await this.loadItems(id, orgId);
    const photos = await this.loadPhotos([id], orgId);
    return {
      ...rest,
      landlordSigned: !!row.landlordSignatureData,
      tenantSigned: !!row.tenantSignatureData,
      items,
      photos,
    };
  }

  private loadItems(inspectionId: number, orgId: number) {
    return this.db
      .select()
      .from(realEstateInspectionItems)
      .where(and(
        eq(realEstateInspectionItems.inspectionId, inspectionId),
        eq(realEstateInspectionItems.organizationId, orgId),
        eq(realEstateInspectionItems.isDeleted, 0),
      ))
      .orderBy(asc(realEstateInspectionItems.sortOrder), asc(realEstateInspectionItems.id));
  }

  private async loadPhotos(inspectionIds: number[], orgId: number) {
    if (!inspectionIds.length) return [];
    return this.db
      .select({
        id: realEstateInspectionPhotos.id,
        inspectionId: realEstateInspectionPhotos.inspectionId,
        itemId: realEstateInspectionPhotos.itemId,
        originalName: realEstateInspectionPhotos.originalName,
        mimeType: realEstateInspectionPhotos.mimeType,
        sizeBytes: realEstateInspectionPhotos.sizeBytes,
        createdAt: realEstateInspectionPhotos.createdAt,
      })
      .from(realEstateInspectionPhotos)
      .where(and(
        inArray(realEstateInspectionPhotos.inspectionId, inspectionIds),
        eq(realEstateInspectionPhotos.organizationId, orgId),
        eq(realEstateInspectionPhotos.isActive, 1),
      ))
      .orderBy(asc(realEstateInspectionPhotos.id));
  }

  // ── Creation ──────────────────────────────────────────────────────────────

  async create(leaseId: number, dto: CreateInspectionDto, orgId: number, scope: Scope, userId?: number) {
    const lease = await this.findLease(leaseId, orgId, scope);

    const [existing] = await this.db
      .select({ id: realEstateInspections.id })
      .from(realEstateInspections)
      .where(and(
        eq(realEstateInspections.leaseId, leaseId),
        eq(realEstateInspections.organizationId, orgId),
        eq(realEstateInspections.type, dto.type),
        eq(realEstateInspections.isDeleted, 0),
      ))
      .limit(1);
    if (existing) throw new ConflictException("Un etat des lieux de ce type existe deja pour ce bail.");

    let entry: typeof realEstateInspections.$inferSelect | null = null;
    if (dto.type === "exit") {
      const [row] = await this.db
        .select()
        .from(realEstateInspections)
        .where(and(
          eq(realEstateInspections.leaseId, leaseId),
          eq(realEstateInspections.organizationId, orgId),
          eq(realEstateInspections.type, "entry"),
          eq(realEstateInspections.status, "signed"),
          eq(realEstateInspections.isDeleted, 0),
        ))
        .orderBy(desc(realEstateInspections.id))
        .limit(1);
      entry = row ?? null;
    }

    const [result] = await this.db.insert(realEstateInspections).values({
      organizationId: orgId,
      leaseId,
      propertyId: lease.propertyId,
      unitId: lease.unitId ?? null,
      type: dto.type,
      status: "draft",
      inspectionDate: dto.inspectionDate as any,
      generalNotes: dto.type === "entry" ? (lease.moveInNotes ?? null) : null,
      entryInspectionId: entry?.id ?? null,
      createdBy: userId ?? null,
    });
    const inspectionId = Number(result.insertId);

    let rows: Array<{ room: string; element: string; entryItemId: number | null }>;
    if (entry) {
      const entryItems = await this.loadItems(entry.id, orgId);
      rows = entryItems.map((i) => ({ room: i.room, element: i.element, entryItemId: i.id }));
    } else {
      const [unit] = lease.unitId
        ? await this.db
            .select({ bedrooms: realEstateUnits.bedrooms, bathrooms: realEstateUnits.bathrooms })
            .from(realEstateUnits)
            .where(and(eq(realEstateUnits.id, lease.unitId), eq(realEstateUnits.organizationId, orgId)))
            .limit(1)
        : [];
      rows = buildDefaultInspectionItems(Number(unit?.bedrooms || 0), Number(unit?.bathrooms || 0))
        .map((r) => ({ ...r, entryItemId: null }));
    }
    if (rows.length) {
      await this.db.insert(realEstateInspectionItems).values(rows.map((r, idx) => ({
        organizationId: orgId,
        inspectionId,
        room: r.room,
        element: r.element,
        // Sortie : "na" = non evalue (la colonne est NOT NULL).
        condition: dto.type === "exit" ? "na" : "good",
        entryItemId: r.entryItemId,
        sortOrder: idx,
      })));
    }
    return this.getInspection(inspectionId, orgId, scope);
  }

  // ── Mise a jour (brouillon) ───────────────────────────────────────────────

  async update(id: number, dto: UpdateInspectionDto, orgId: number, scope: Scope) {
    await this.findDraft(id, orgId, scope);

    const set: Record<string, unknown> = {};
    if (dto.inspectionDate !== undefined) set.inspectionDate = dto.inspectionDate;
    if (dto.generalNotes !== undefined) set.generalNotes = dto.generalNotes;
    if (dto.meters !== undefined) set.meters = dto.meters;
    if (dto.keysHanded !== undefined) set.keysHanded = dto.keysHanded;
    if (Object.keys(set).length) {
      set.updatedAt = sql`CURRENT_TIMESTAMP`;
      await this.db
        .update(realEstateInspections)
        .set(set)
        .where(and(eq(realEstateInspections.id, id), eq(realEstateInspections.organizationId, orgId)));
    }

    if (dto.items?.length) {
      const existing = await this.db
        .select({ id: realEstateInspectionItems.id })
        .from(realEstateInspectionItems)
        .where(and(
          eq(realEstateInspectionItems.inspectionId, id),
          eq(realEstateInspectionItems.organizationId, orgId),
        ));
      const ownIds = new Set(existing.map((e) => e.id));
      for (const item of dto.items) {
        if (item.id != null) {
          if (!ownIds.has(item.id)) throw new BadRequestException("Element etranger a cet etat des lieux.");
          const patch: Record<string, unknown> = { updatedAt: sql`CURRENT_TIMESTAMP` };
          if (item.isDeleted) patch.isDeleted = 1;
          else {
            patch.room = item.room;
            patch.element = item.element;
            if (item.condition !== undefined) patch.condition = item.condition;
            if (item.remarks !== undefined) patch.remarks = item.remarks;
            if (item.sortOrder !== undefined) patch.sortOrder = item.sortOrder;
          }
          await this.db
            .update(realEstateInspectionItems)
            .set(patch)
            .where(and(
              eq(realEstateInspectionItems.id, item.id),
              eq(realEstateInspectionItems.inspectionId, id),
              eq(realEstateInspectionItems.organizationId, orgId),
            ));
        } else if (!item.isDeleted) {
          await this.db.insert(realEstateInspectionItems).values({
            organizationId: orgId,
            inspectionId: id,
            room: item.room,
            element: item.element,
            condition: item.condition ?? "good",
            remarks: item.remarks ?? null,
            sortOrder: item.sortOrder ?? 9999,
          });
        }
      }
    }
    return this.getInspection(id, orgId, scope);
  }

  // ── Photos ────────────────────────────────────────────────────────────────

  async uploadPhoto(id: number, file: any, itemIdRaw: unknown, orgId: number, scope: Scope) {
    await this.findDraft(id, orgId, scope);
    if (!file) throw new BadRequestException("Photo requise.");
    let itemId: number | null = null;
    if (itemIdRaw !== undefined && itemIdRaw !== null && itemIdRaw !== "") {
      itemId = Number(itemIdRaw);
      if (!Number.isInteger(itemId) || itemId <= 0) throw new BadRequestException("itemId invalide.");
      const [item] = await this.db
        .select({ id: realEstateInspectionItems.id })
        .from(realEstateInspectionItems)
        .where(and(
          eq(realEstateInspectionItems.id, itemId),
          eq(realEstateInspectionItems.inspectionId, id),
          eq(realEstateInspectionItems.organizationId, orgId),
          eq(realEstateInspectionItems.isDeleted, 0),
        ))
        .limit(1);
      if (!item) throw new BadRequestException("Element introuvable pour cet etat des lieux.");
    }
    const stored = await this.objectStorage.putImage(file, `inspections/${id}`);
    const [result] = await this.db.insert(realEstateInspectionPhotos).values({
      organizationId: orgId,
      inspectionId: id,
      itemId,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      originalName: file?.originalname ? String(file.originalname).slice(0, 255) : null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      isActive: 1,
    });
    return {
      id: Number(result.insertId),
      inspectionId: id,
      itemId,
      originalName: file?.originalname ?? null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    };
  }

  private async findPhoto(photoId: number, orgId: number, scope: Scope) {
    const [photo] = await this.db
      .select()
      .from(realEstateInspectionPhotos)
      .where(and(
        eq(realEstateInspectionPhotos.id, photoId),
        eq(realEstateInspectionPhotos.organizationId, orgId),
        eq(realEstateInspectionPhotos.isActive, 1),
      ))
      .limit(1);
    if (!photo) throw new NotFoundException("Photo introuvable.");
    const inspection = await this.findInspection(photo.inspectionId, orgId, scope);
    return { photo, inspection };
  }

  async photoFile(photoId: number, orgId: number, scope: Scope) {
    const { photo } = await this.findPhoto(photoId, orgId, scope);
    const object = await this.objectStorage.getObject(photo.objectKey);
    return { ...object, originalName: photo.originalName || `inspection-photo-${photo.id}`, mimeType: photo.mimeType };
  }

  async deletePhoto(photoId: number, orgId: number, scope: Scope) {
    const { photo, inspection } = await this.findPhoto(photoId, orgId, scope);
    if (inspection.status === "signed") throw new ConflictException("Etat des lieux signe : modification impossible.");
    // Soft delete : l'objet reste en stockage, is_active = 0.
    await this.db
      .update(realEstateInspectionPhotos)
      .set({ isActive: 0 })
      .where(and(eq(realEstateInspectionPhotos.id, photo.id), eq(realEstateInspectionPhotos.organizationId, orgId)));
    return { message: "Photo supprimee." };
  }

  // ── Signature ─────────────────────────────────────────────────────────────

  async sign(id: number, dto: SignInspectionDto, orgId: number, scope: Scope, ip: string, ua: string) {
    const row = await this.findDraft(id, orgId, scope);
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dto.signatureData)) {
      throw new BadRequestException("Signature invalide (PNG attendu).");
    }
    const signerName = dto.signerName.trim();
    if (!signerName) throw new BadRequestException("Nom du signataire requis.");

    const set: Record<string, unknown> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    if (dto.role === "landlord") {
      set.landlordSignatureData = dto.signatureData;
      set.landlordSignerName = signerName;
      set.landlordSignedAt = sql`CURRENT_TIMESTAMP`;
    } else {
      set.tenantSignatureData = dto.signatureData;
      set.tenantSignerName = signerName;
      set.tenantSignedAt = sql`CURRENT_TIMESTAMP`;
      set.tenantSignerIp = (ip || "").slice(0, 64);
      set.tenantSignerUa = (ua || "").slice(0, 512);
    }
    const landlordOk = dto.role === "landlord" || !!row.landlordSignatureData;
    const tenantOk = dto.role === "tenant" || !!row.tenantSignatureData;
    if (landlordOk && tenantOk) set.status = "signed";

    await this.db
      .update(realEstateInspections)
      .set(set)
      .where(and(eq(realEstateInspections.id, id), eq(realEstateInspections.organizationId, orgId)));
    return this.getInspection(id, orgId, scope);
  }

  // ── Suppression logique (brouillon) ───────────────────────────────────────

  async remove(id: number, orgId: number, scope: Scope) {
    await this.findDraft(id, orgId, scope);
    await this.db
      .update(realEstateInspections)
      .set({ isDeleted: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateInspections.id, id), eq(realEstateInspections.organizationId, orgId)));
    return { message: "Etat des lieux supprime." };
  }

  // ── Comparaison entree / sortie ───────────────────────────────────────────

  async comparison(leaseId: number, orgId: number, scope: Scope) {
    await this.findLease(leaseId, orgId, scope);
    const rows = await this.db
      .select()
      .from(realEstateInspections)
      .where(and(
        eq(realEstateInspections.leaseId, leaseId),
        eq(realEstateInspections.organizationId, orgId),
        eq(realEstateInspections.isDeleted, 0),
      ))
      .orderBy(desc(realEstateInspections.id));
    const entry = rows.find((r) => r.type === "entry");
    const exit = rows.find((r) => r.type === "exit");
    if (!entry || !exit) throw new NotFoundException("Les etats des lieux d'entree et de sortie sont requis pour comparer.");

    const [entryItems, exitItems, photos] = await Promise.all([
      this.loadItems(entry.id, orgId),
      this.loadItems(exit.id, orgId),
      this.loadPhotos([entry.id, exit.id], orgId),
    ]);
    const cmp = buildInspectionComparison({
      entryItems, exitItems,
      entryMeters: entry.meters as any, exitMeters: exit.meters as any,
      entryKeys: entry.keysHanded as any, exitKeys: exit.keysHanded as any,
    });
    const photosOf = (inspectionId: number, itemId: number | null) =>
      itemId == null ? [] : photos.filter((p) => p.inspectionId === inspectionId && p.itemId === itemId);
    return {
      entry: this.summary(entry),
      exit: this.summary(exit),
      ...cmp,
      items: cmp.items.map((i) => ({
        ...i,
        entryPhotos: photosOf(entry.id, i.entryItemId),
        exitPhotos: photosOf(exit.id, i.exitItemId),
      })),
    };
  }
}
