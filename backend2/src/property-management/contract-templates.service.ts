import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { realEstateContractTemplates } from "../database/schema";
import type { Database } from "../database/types";
import {
  CONTRACT_TEMPLATE_TYPES,
  type ContractTemplateType,
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
} from "./dto/contract-template.dto";

@Injectable()
export class ContractTemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(orgId: number) {
    return this.db
      .select()
      .from(realEstateContractTemplates)
      .where(and(eq(realEstateContractTemplates.organizationId, orgId), eq(realEstateContractTemplates.isDeleted, 0)))
      .orderBy(asc(realEstateContractTemplates.type), desc(realEstateContractTemplates.isActive), desc(realEstateContractTemplates.id));
  }

  async getById(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateContractTemplates)
      .where(and(eq(realEstateContractTemplates.id, id), eq(realEstateContractTemplates.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Modèle de contrat introuvable.");
    return rows[0];
  }

  async getActiveByType(type: ContractTemplateType, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateContractTemplates)
      .where(
        and(
          eq(realEstateContractTemplates.organizationId, orgId),
          eq(realEstateContractTemplates.type, type),
          eq(realEstateContractTemplates.isActive, true),
        ),
      )
      .orderBy(desc(realEstateContractTemplates.id))
      .limit(1);

    return rows[0] ?? null;
  }

  async create(dto: CreateContractTemplateDto, orgId: number, userId?: number) {
    this.assertType(dto.type);

    const [result] = await this.db.insert(realEstateContractTemplates).values({
      organizationId: orgId,
      name: dto.name,
      type: dto.type,
      body: dto.body,
      description: dto.description ?? null,
      isActive: dto.isActive ?? false,
      version: 1,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const id = Number(result.insertId);

    if (dto.isActive) {
      await this.setActive(id, orgId, userId);
    }

    return this.getById(id, orgId);
  }

  async update(id: number, dto: UpdateContractTemplateDto, orgId: number, userId?: number) {
    const current = await this.getById(id, orgId);

    if (dto.type) this.assertType(dto.type);

    const bodyChanged = dto.body !== undefined && dto.body !== current.body;

    await this.db
      .update(realEstateContractTemplates)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(bodyChanged ? { version: current.version + 1 } : {}),
        updatedBy: userId ?? current.updatedBy ?? null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateContractTemplates.id, id), eq(realEstateContractTemplates.organizationId, orgId)));

    if (dto.isActive === true) {
      await this.setActive(id, orgId, userId);
    } else if (dto.isActive === false) {
      await this.db
        .update(realEstateContractTemplates)
        .set({ isActive: false, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateContractTemplates.id, id), eq(realEstateContractTemplates.organizationId, orgId)));
    }

    return this.getById(id, orgId);
  }

  async setActive(id: number, orgId: number, userId?: number) {
    const template = await this.getById(id, orgId);

    await this.db
      .update(realEstateContractTemplates)
      .set({ isActive: false, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(realEstateContractTemplates.organizationId, orgId),
          eq(realEstateContractTemplates.type, template.type),
          ne(realEstateContractTemplates.id, id),
        ),
      );

    await this.db
      .update(realEstateContractTemplates)
      .set({
        isActive: true,
        updatedBy: userId ?? template.updatedBy ?? null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateContractTemplates.id, id), eq(realEstateContractTemplates.organizationId, orgId)));

    return this.getById(id, orgId);
  }

  async duplicate(id: number, orgId: number, userId?: number) {
    const source = await this.getById(id, orgId);

    const [result] = await this.db.insert(realEstateContractTemplates).values({
      organizationId: orgId,
      name: `${source.name} (copie)`,
      type: source.type,
      body: source.body,
      description: source.description ?? null,
      isActive: false,
      version: 1,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.getById(Number(result.insertId), orgId);
  }

  async remove(id: number, orgId: number) {
    const template = await this.getById(id, orgId);

    if (template.isActive) {
      throw new BadRequestException(
        "Impossible de supprimer un modèle actif. Activez un autre modèle de ce type d'abord.",
      );
    }

    await this.db
      .update(realEstateContractTemplates)
      .set({ isDeleted: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContractTemplates.id, id), eq(realEstateContractTemplates.organizationId, orgId)));
    return { message: "Modèle supprimé." };
  }

  /**
   * Replace [PLACEHOLDER] tokens in a template body with provided values.
   * - Case-insensitive on the placeholder name (Lookup is normalized to upper)
   * - Whitespace inside brackets is tolerated
   * - Unknown placeholders are kept verbatim so the gestionnaire sees what's missing
   */
  static applyVariables(body: string, vars: Record<string, string | null | undefined>): string {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(vars)) {
      normalized[key.toUpperCase().trim()] = value == null || value === "" ? "" : String(value);
    }

    return body.replace(/\[\s*([^\[\]]+?)\s*\]/g, (match, raw: string) => {
      const key = raw.toUpperCase().trim();
      if (key in normalized) {
        const value = normalized[key];
        return value || match;
      }
      return match;
    });
  }

  private assertType(type: string) {
    if (!CONTRACT_TEMPLATE_TYPES.includes(type as ContractTemplateType)) {
      throw new BadRequestException(
        `Type de modèle invalide. Valeurs acceptées: ${CONTRACT_TEMPLATE_TYPES.join(", ")}.`,
      );
    }
  }
}
