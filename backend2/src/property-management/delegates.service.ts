// Domus — DELEGUES (mandataires charges du suivi de loyer).
//
// Un delegue suit un portefeuille pour le compte du proprietaire sans etre le
// bailleur legal : il recoit les memes annonces (bail cree, fin de bail, loyer
// en retard) et, a terme, confirmera les encaissements depuis son portail.
//
// Deux natures cohabitent derriere le meme modele : un contact externe joint
// uniquement par SMS (userId null) et un employe interne ayant deja un compte
// nglu (userId renseigne). C'est le telephone qui porte la notification dans
// les deux cas, jamais le login.
//
// Deux portees d'affectation cohabitent aussi : 'owner' suit tout le
// portefeuille d'un proprietaire (biens acquis plus tard compris, sans
// reaffectation) et 'property' un bien precis. Le ciblage de ces portees vit
// dans OwnerNotificationsService.resolveDelegatesForProperty.
//
// Suppression = soft delete (is_active = 0), conformement a la regle projet :
// l'historique d'envois dans sms_logs reste lisible.
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  realEstateDelegateAssignments,
  realEstateDelegates,
  realEstateOwners,
  realEstateProperties,
} from "../database/schema";
import type { Database } from "../database/types";
import type {
  CreateDelegateAssignmentDto,
  CreateDelegateDto,
  UpdateDelegateAssignmentDto,
  UpdateDelegateDto,
} from "./dto/property-management.dto";

@Injectable()
export class DelegatesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(orgId: number) {
    const rows = await this.db
      .select({
        id: realEstateDelegates.id,
        displayName: realEstateDelegates.displayName,
        phone: realEstateDelegates.phone,
        phone2: realEstateDelegates.phone2,
        email: realEstateDelegates.email,
        userId: realEstateDelegates.userId,
        notes: realEstateDelegates.notes,
        createdAt: realEstateDelegates.createdAt,
        updatedAt: realEstateDelegates.updatedAt,
      })
      .from(realEstateDelegates)
      .where(and(eq(realEstateDelegates.organizationId, orgId), eq(realEstateDelegates.isActive, 1)))
      .orderBy(realEstateDelegates.displayName);

    if (!rows.length) return [];

    // Le nombre d'affectations evite a la liste un appel par ligne cote UI.
    const counts = await this.db
      .select({
        delegateId: realEstateDelegateAssignments.delegateId,
        total: sql<number>`COUNT(*)`,
      })
      .from(realEstateDelegateAssignments)
      .where(and(
        eq(realEstateDelegateAssignments.organizationId, orgId),
        eq(realEstateDelegateAssignments.isActive, 1),
      ))
      .groupBy(realEstateDelegateAssignments.delegateId);

    const byDelegate = new Map(counts.map((c) => [Number(c.delegateId), Number(c.total)]));
    return rows.map((row) => ({ ...row, assignmentsCount: byDelegate.get(Number(row.id)) ?? 0 }));
  }

  async findOne(id: number, orgId: number) {
    const [row] = await this.db
      .select({
        id: realEstateDelegates.id,
        displayName: realEstateDelegates.displayName,
        phone: realEstateDelegates.phone,
        phone2: realEstateDelegates.phone2,
        email: realEstateDelegates.email,
        userId: realEstateDelegates.userId,
        notes: realEstateDelegates.notes,
        createdAt: realEstateDelegates.createdAt,
        updatedAt: realEstateDelegates.updatedAt,
      })
      .from(realEstateDelegates)
      .where(and(
        eq(realEstateDelegates.id, id),
        eq(realEstateDelegates.organizationId, orgId),
        eq(realEstateDelegates.isActive, 1),
      ))
      .limit(1);
    if (!row) throw new NotFoundException("Delegue introuvable.");
    return { ...row, assignments: await this.assignments(id, orgId) };
  }

  async create(input: CreateDelegateDto, orgId: number) {
    const [result] = await this.db.insert(realEstateDelegates).values({
      organizationId: orgId,
      displayName: input.displayName,
      phone: input.phone ?? null,
      phone2: input.phone2 ?? null,
      email: input.email ?? null,
      userId: input.userId ?? null,
      notes: input.notes ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findOne(Number(result.insertId), orgId);
  }

  async update(id: number, input: UpdateDelegateDto, orgId: number) {
    await this.ensureActive(id, orgId);
    await this.db
      .update(realEstateDelegates)
      .set({
        ...this.pick(input, ["displayName", "phone", "phone2", "email", "userId", "notes"]),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateDelegates.id, id), eq(realEstateDelegates.organizationId, orgId)));
    return this.findOne(id, orgId);
  }

  /** Soft delete : le delegue et ses affectations cessent de notifier. */
  async remove(id: number, orgId: number) {
    await this.ensureActive(id, orgId);
    await this.db
      .update(realEstateDelegates)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateDelegates.id, id), eq(realEstateDelegates.organizationId, orgId)));
    await this.db
      .update(realEstateDelegateAssignments)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(realEstateDelegateAssignments.delegateId, id),
        eq(realEstateDelegateAssignments.organizationId, orgId),
      ));
    return { message: "Delegue supprime." };
  }

  /**
   * Affectations d'un delegue, enrichies du libelle du perimetre suivi pour
   * que l'UI affiche "Immeuble Gombe" plutot qu'un identifiant nu.
   */
  async assignments(delegateId: number, orgId: number) {
    const rows = await this.db
      .select({
        id: realEstateDelegateAssignments.id,
        delegateId: realEstateDelegateAssignments.delegateId,
        scopeType: realEstateDelegateAssignments.scopeType,
        scopeId: realEstateDelegateAssignments.scopeId,
        notifyLease: realEstateDelegateAssignments.notifyLease,
        notifyOverdue: realEstateDelegateAssignments.notifyOverdue,
        notifyPayment: realEstateDelegateAssignments.notifyPayment,
      })
      .from(realEstateDelegateAssignments)
      .where(and(
        eq(realEstateDelegateAssignments.delegateId, delegateId),
        eq(realEstateDelegateAssignments.organizationId, orgId),
        eq(realEstateDelegateAssignments.isActive, 1),
      ))
      .orderBy(realEstateDelegateAssignments.id);

    if (!rows.length) return [];

    const hasOwnerScope = rows.some((r) => r.scopeType === "owner");
    const hasPropertyScope = rows.some((r) => r.scopeType === "property");

    const ownerNames = new Map<number, string>();
    if (hasOwnerScope) {
      const owners = await this.db
        .select({ id: realEstateOwners.id, displayName: realEstateOwners.displayName })
        .from(realEstateOwners)
        .where(eq(realEstateOwners.organizationId, orgId));
      for (const o of owners) ownerNames.set(Number(o.id), o.displayName);
    }
    const propertyNames = new Map<number, string>();
    if (hasPropertyScope) {
      const props = await this.db
        .select({ id: realEstateProperties.id, name: realEstateProperties.name })
        .from(realEstateProperties)
        .where(eq(realEstateProperties.organizationId, orgId));
      for (const p of props) propertyNames.set(Number(p.id), p.name);
    }

    return rows.map((row) => ({
      ...row,
      notifyLease: Number(row.notifyLease) === 1,
      notifyOverdue: Number(row.notifyOverdue) === 1,
      notifyPayment: Number(row.notifyPayment) === 1,
      scopeLabel:
        row.scopeType === "owner"
          ? ownerNames.get(Number(row.scopeId)) ?? ""
          : propertyNames.get(Number(row.scopeId)) ?? "",
    }));
  }

  async addAssignment(delegateId: number, input: CreateDelegateAssignmentDto, orgId: number) {
    await this.ensureActive(delegateId, orgId);
    await this.ensureScopeExists(input.scopeType, input.scopeId, orgId);

    // Reaffecter un perimetre deja suivi reactive la ligne existante au lieu
    // d'en empiler une seconde : le delegue recevrait sinon deux SMS.
    const [existing] = await this.db
      .select({ id: realEstateDelegateAssignments.id })
      .from(realEstateDelegateAssignments)
      .where(and(
        eq(realEstateDelegateAssignments.organizationId, orgId),
        eq(realEstateDelegateAssignments.delegateId, delegateId),
        eq(realEstateDelegateAssignments.scopeType, input.scopeType),
        eq(realEstateDelegateAssignments.scopeId, input.scopeId),
      ))
      .limit(1);

    const flags = {
      notifyLease: input.notifyLease === false ? 0 : 1,
      notifyOverdue: input.notifyOverdue === false ? 0 : 1,
      notifyPayment: input.notifyPayment === true ? 1 : 0,
    };

    if (existing) {
      await this.db
        .update(realEstateDelegateAssignments)
        .set({ ...flags, isActive: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateDelegateAssignments.id, Number(existing.id)));
    } else {
      await this.db.insert(realEstateDelegateAssignments).values({
        organizationId: orgId,
        delegateId,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        ...flags,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }
    return this.assignments(delegateId, orgId);
  }

  /** Seuls les abonnements changent : le perimetre se retire et se re-cree. */
  async updateAssignment(
    delegateId: number,
    assignmentId: number,
    input: UpdateDelegateAssignmentDto,
    orgId: number,
  ) {
    await this.ensureActive(delegateId, orgId);
    const patch: Record<string, unknown> = {};
    if (input.notifyLease !== undefined) patch.notifyLease = input.notifyLease ? 1 : 0;
    if (input.notifyOverdue !== undefined) patch.notifyOverdue = input.notifyOverdue ? 1 : 0;
    if (input.notifyPayment !== undefined) patch.notifyPayment = input.notifyPayment ? 1 : 0;

    await this.db
      .update(realEstateDelegateAssignments)
      .set({ ...patch, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(realEstateDelegateAssignments.id, assignmentId),
        eq(realEstateDelegateAssignments.delegateId, delegateId),
        eq(realEstateDelegateAssignments.organizationId, orgId),
        eq(realEstateDelegateAssignments.isActive, 1),
      ));
    return this.assignments(delegateId, orgId);
  }

  async removeAssignment(delegateId: number, assignmentId: number, orgId: number) {
    await this.ensureActive(delegateId, orgId);
    await this.db
      .update(realEstateDelegateAssignments)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(
        eq(realEstateDelegateAssignments.id, assignmentId),
        eq(realEstateDelegateAssignments.delegateId, delegateId),
        eq(realEstateDelegateAssignments.organizationId, orgId),
      ));
    return { message: "Affectation retiree." };
  }

  private async ensureActive(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateDelegates.id })
      .from(realEstateDelegates)
      .where(and(
        eq(realEstateDelegates.id, id),
        eq(realEstateDelegates.organizationId, orgId),
        eq(realEstateDelegates.isActive, 1),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Delegue introuvable.");
  }

  /** Un perimetre inexistant enverrait des notifications dans le vide. */
  private async ensureScopeExists(scopeType: string, scopeId: number, orgId: number) {
    if (scopeType === "owner") {
      const rows = await this.db
        .select({ id: realEstateOwners.id })
        .from(realEstateOwners)
        .where(and(
          eq(realEstateOwners.id, scopeId),
          eq(realEstateOwners.organizationId, orgId),
          eq(realEstateOwners.isActive, 1),
        ))
        .limit(1);
      if (!rows.length) throw new NotFoundException("Proprietaire introuvable.");
      return;
    }
    const rows = await this.db
      .select({ id: realEstateProperties.id })
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.id, scopeId),
        eq(realEstateProperties.organizationId, orgId),
        eq(realEstateProperties.isActive, 1),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Bien introuvable.");
  }

  private pick(input: object, keys: string[]) {
    const source = input as Record<string, unknown>;
    return keys.reduce<Record<string, unknown>>((result, key) => {
      if (source[key] !== undefined) result[key] = source[key];
      return result;
    }, {});
  }
}
