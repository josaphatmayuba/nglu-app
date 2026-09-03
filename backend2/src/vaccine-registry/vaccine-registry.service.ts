import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, like } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  vxAntigens,
  vxConditions,
  vxManufacturers,
  vxPathogens,
  vxProtocolStepConditions,
  vxProtocolSteps,
  vxProtocols,
  vxRegions,
  vxRegistrations,
  vxSpecies,
  vxVaccineAntigens,
  vxVaccineSpecies,
  vxVaccines,
  vxWithdrawalPeriods,
} from "../database/schema";
import type { Database } from "../database/types";

/** Contexte d'un animal pour evaluer les protocoles conditionnels. */
export interface AnimalContext {
  ageDays?: number;
  riskZone?: string; // 'high' | 'low'
  productionType?: string; // 'layer' | 'breeder' | 'broiler'
  pregnant?: boolean;
  regionId?: number;
}

@Injectable()
export class VaccineRegistryService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ─── Referentiels (lecture) ────────────────────────────────────────────────
  listSpecies() {
    return this.db.select().from(vxSpecies).orderBy(vxSpecies.commonNameFr);
  }
  listPathogens() {
    return this.db.select().from(vxPathogens).orderBy(vxPathogens.name);
  }
  listRegions() {
    return this.db.select().from(vxRegions).orderBy(vxRegions.name);
  }

  /** Catalogue vaccins (filtrable par espece via la table de liaison). */
  async listVaccines(filters?: { speciesId?: number; q?: string }) {
    const rows = await this.db
      .select({
        id: vxVaccines.id,
        productName: vxVaccines.productName,
        nature: vxVaccines.vaccineNature,
        manufacturer: vxManufacturers.name,
      })
      .from(vxVaccines)
      .leftJoin(vxManufacturers, eq(vxManufacturers.id, vxVaccines.manufacturerId))
      .where(filters?.q ? like(vxVaccines.productName, `%${filters.q}%`) : undefined)
      .orderBy(vxVaccines.productName);
    if (!filters?.speciesId) return rows;
    const links = await this.db
      .select({ vaccineId: vxVaccineSpecies.vaccineId })
      .from(vxVaccineSpecies)
      .where(eq(vxVaccineSpecies.speciesId, filters.speciesId));
    const allowed = new Set(links.map((l) => l.vaccineId));
    return rows.filter((r) => allowed.has(r.id));
  }

  /** Fiche complete d'un vaccin : composition, especes, homologations, delais. */
  async getVaccine(id: number) {
    const [vaccine] = await this.db.select().from(vxVaccines).where(eq(vxVaccines.id, id)).limit(1);
    if (!vaccine) throw new NotFoundException("Vaccin introuvable.");

    const antigens = await this.db
      .select({
        strain: vxAntigens.strainName,
        form: vxAntigens.antigenForm,
        pathogen: vxPathogens.name,
        titer: vxVaccineAntigens.titerOrPotency,
      })
      .from(vxVaccineAntigens)
      .innerJoin(vxAntigens, eq(vxAntigens.id, vxVaccineAntigens.antigenId))
      .leftJoin(vxPathogens, eq(vxPathogens.id, vxAntigens.pathogenId))
      .where(eq(vxVaccineAntigens.vaccineId, id));

    const species = await this.db
      .select({ id: vxSpecies.id, name: vxSpecies.commonNameFr, category: vxSpecies.animalCategory })
      .from(vxVaccineSpecies)
      .innerJoin(vxSpecies, eq(vxSpecies.id, vxVaccineSpecies.speciesId))
      .where(eq(vxVaccineSpecies.vaccineId, id));

    const registrations = await this.db
      .select({
        id: vxRegistrations.id,
        region: vxRegions.name,
        regulatoryBody: vxRegions.regulatoryBody,
        number: vxRegistrations.registrationNumber,
        status: vxRegistrations.status,
        sourceUrl: vxRegistrations.sourceDocumentUrl,
      })
      .from(vxRegistrations)
      .leftJoin(vxRegions, eq(vxRegions.id, vxRegistrations.regionId))
      .where(eq(vxRegistrations.vaccineId, id));

    // Delais de retrait par homologation.
    const withdrawals = registrations.length
      ? await this.db
          .select()
          .from(vxWithdrawalPeriods)
          .where(
            eq(
              vxWithdrawalPeriods.registrationId,
              registrations[0].id, // simplifie : delais de la 1ere homologation
            ),
          )
      : [];

    return { vaccine, antigens, species, registrations, withdrawals };
  }

  /**
   * Protocole applicable pour un vaccin + espece, filtre selon le contexte animal.
   * Coeur du moteur de regles : une etape n'est retenue que si TOUTES ses conditions
   * obligatoires sont satisfaites (groupes logic_group = OU au sein du groupe).
   */
  async resolveProtocol(vaccineId: number, speciesId: number, ctx: AnimalContext) {
    const [protocol] = await this.db
      .select()
      .from(vxProtocols)
      .where(and(eq(vxProtocols.vaccineId, vaccineId), eq(vxProtocols.speciesId, speciesId)))
      .limit(1);
    if (!protocol) return { protocol: null, steps: [] };

    const steps = await this.db
      .select()
      .from(vxProtocolSteps)
      .where(eq(vxProtocolSteps.protocolId, protocol.id))
      .orderBy(vxProtocolSteps.stepOrder);

    const applicable: any[] = [];
    for (const step of steps) {
      const conds = await this.db
        .select({
          type: vxConditions.conditionType,
          operator: vxConditions.operator,
          value: vxConditions.expectedValue,
          mandatory: vxProtocolStepConditions.isMandatory,
          group: vxProtocolStepConditions.logicGroup,
        })
        .from(vxProtocolStepConditions)
        .innerJoin(vxConditions, eq(vxConditions.id, vxProtocolStepConditions.conditionId))
        .where(eq(vxProtocolStepConditions.protocolStepId, step.id));

      if (this.evaluateConditions(conds, ctx)) applicable.push({ ...step, conditions: conds });
    }
    return { protocol, steps: applicable };
  }

  /** Vrai si l'ensemble des conditions est satisfait (AND des groupes, OR dans un groupe). */
  private evaluateConditions(conds: any[], ctx: AnimalContext): boolean {
    if (!conds.length) return true;
    // Groupes : meme logic_group = OU ; groupes differents (ou null) = ET.
    const groups = new Map<string, any[]>();
    for (const c of conds) {
      const key = c.group != null ? `g${c.group}` : `solo${conds.indexOf(c)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    for (const group of groups.values()) {
      const anyTrue = group.some((c) => this.evalOne(c, ctx));
      if (!anyTrue) return false; // un groupe entier faux → etape non applicable
    }
    return true;
  }

  private evalOne(c: any, ctx: AnimalContext): boolean {
    const map: Record<string, any> = {
      risk_zone: ctx.riskZone,
      age: ctx.ageDays,
      pregnancy: ctx.pregnant,
      production_type: ctx.productionType,
    };
    const actual = map[c.type];
    const expected = c.value;
    switch (c.operator) {
      case "=":
        return String(actual) === String(expected);
      case ">":
        return Number(actual) > Number(expected);
      case "<":
        return Number(actual) < Number(expected);
      case "IN":
        return String(expected).split(",").map((s) => s.trim()).includes(String(actual));
      case "BETWEEN": {
        const [lo, hi] = String(expected).split(",").map(Number);
        return Number(actual) >= lo && Number(actual) <= hi;
      }
      default:
        return false;
    }
  }
}
