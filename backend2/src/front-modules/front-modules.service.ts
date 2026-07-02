import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  colors,
  departments,
  educations,
  employmentStatuses,
  pageSizes,
  productAttributes,
  productAttributeValues,
  termsAndConditions,
  users,
} from "../database/schema";
import type { Database } from "../database/types";

type TableConfig = {
  table: any;
  listKey: string;
  totalKey: string;
  searchable?: string[];
  // true si la table porte une colonne organization_id : on isole alors les
  // lignes par organisation (lecture/ecriture). Les tables sans org sont des
  // referentiels globaux partages (couleurs, tailles de page, attributs produit).
  orgScoped?: boolean;
};

@Injectable()
export class FrontModulesService {
  private readonly configs: Record<string, TableConfig> = {
    department: { table: departments, listKey: "getAllDepartment", totalKey: "totalDepartment", searchable: ["name"], orgScoped: true },
    "employment-status": {
      table: employmentStatuses,
      listKey: "getAllEmploymentStatus",
      totalKey: "totalEmploymentStatus",
      searchable: ["name", "colourValue", "description"],
      orgScoped: true,
    },
    education: { table: educations, listKey: "getAllEducation", totalKey: "totalEducation", searchable: ["degree", "institution", "fieldOfStudy"], orgScoped: true },
    "product-color": { table: colors, listKey: "getAllProductColor", totalKey: "totalProductColor", searchable: ["name", "colorCode"] },
    "product-attribute": { table: productAttributes, listKey: "getAllProductAttribute", totalKey: "totalProductAttribute", searchable: ["name"] },
    "product-attribute-value": {
      table: productAttributeValues,
      listKey: "getAllProductAttributeValue",
      totalKey: "totalProductAttributeValue",
      searchable: ["name"],
    },
    "terms-and-condition": {
      table: termsAndConditions,
      listKey: "getAllTermsAndCondition",
      totalKey: "totalTermsAndCondition",
      searchable: ["title", "subject"],
    },
    "page-size": { table: pageSizes, listKey: "getAllPageSize", totalKey: "totalPageSizeCount", searchable: ["pageSizeName", "unit"] },
  };

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Filtre organisation applique aux tables org-scoped ; undefined sinon (les
  // referentiels globaux restent partages entre organisations).
  private orgFilter(cfg: TableConfig, orgId: number) {
    return cfg.orgScoped ? eq(cfg.table.organizationId, orgId) : undefined;
  }

  async list(resource: string, query: Record<string, string>, orgId: number) {
    const cfg = this.config(resource);
    const table = cfg.table;
    const orgClause = this.orgFilter(cfg, orgId);

    if (query["query"] === "all") {
      return this.db.select().from(table).where(and(eq(table.status, "true"), orgClause)).orderBy(desc(table.id));
    }

    if (query["query"] === "info") {
      const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(table).where(and(eq(table.status, "true"), orgClause));
      return { _count: { id: Number(count) } };
    }

    const where = and(this.whereClause(cfg, query), orgClause);
    const { skip, limit } = this.pagination(query);

    const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(limit).offset(skip);
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(table).where(where);

    return { [cfg.listKey]: rows, [cfg.totalKey]: Number(count) };
  }

  async findOne(resource: string, id: number, orgId: number) {
    const cfg = this.config(resource);
    const table = cfg.table;
    const orgClause = this.orgFilter(cfg, orgId);

    if (resource === "department") {
      const rows = await this.db.select().from(table).where(and(eq(table.id, id), orgClause)).limit(1);
      if (!rows.length) throw new NotFoundException("Department not found.");
      // Les employes listes sont restreints a l organisation appelante.
      const staff = await this.db
        .select()
        .from(users)
        .where(and(eq(users.departmentId, id), eq(users.organizationId, orgId)))
        .orderBy(desc(users.id));
      return { ...rows[0], user: staff.map(this.safeUser) };
    }

    const rows = await this.db.select().from(table).where(and(eq(table.id, id), orgClause)).limit(1);
    if (!rows.length) throw new NotFoundException(`${resource} not found.`);
    return rows[0];
  }

  async create(resource: string, body: Record<string, any>, orgId: number, query: Record<string, string> = {}) {
    const cfg = this.config(resource);
    if (query["query"] === "createmany" && Array.isArray(body)) {
      const created = [];
      for (const item of body) created.push(await this.createOne(cfg, this.prepareValues(resource, item), orgId));
      return created;
    }

    return this.createOne(cfg, this.prepareValues(resource, body), orgId);
  }

  async update(resource: string, id: number, body: Record<string, any>, orgId: number) {
    const cfg = this.config(resource);
    await this.ensureExists(cfg, id, resource, orgId);
    const values = this.prepareValues(resource, body, true);
    await this.db.update(cfg.table).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(cfg.table.id, id), this.orgFilter(cfg, orgId)));
    return this.findOne(resource, id, orgId);
  }

  async patchStatus(resource: string, id: number, orgId: number, status = "false") {
    const cfg = this.config(resource);
    await this.ensureExists(cfg, id, resource, orgId);
    await this.db.update(cfg.table).set({ status, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(cfg.table.id, id), this.orgFilter(cfg, orgId)));
    return { message: `${resource} status updated successfully` };
  }

  async delete(resource: string, id: number, orgId: number) {
    const cfg = this.config(resource);
    await this.ensureExists(cfg, id, resource, orgId);
    // Soft delete (regle projet) au lieu d un DELETE physique.
    await this.db.update(cfg.table).set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(cfg.table.id, id), this.orgFilter(cfg, orgId)));
    return { message: `${resource} deleted successfully` };
  }

  private async createOne(cfg: TableConfig, values: Record<string, any>, orgId: number) {
    const table = cfg.table;
    const [result] = await this.db.insert(table).values({
      ...values,
      ...(cfg.orgScoped ? { organizationId: orgId } : {}),
      status: values.status ?? "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const rows = await this.db.select().from(table).where(eq(table.id, Number(result.insertId))).limit(1);
    return rows[0];
  }

  private prepareValues(resource: string, body: Record<string, any>, partial = false) {
    const value = (key: string, fallback?: any) => (body[key] !== undefined && body[key] !== "" ? body[key] : fallback);

    if (resource === "education") {
      return this.clean({
        userId: value("userId"),
        degree: value("degree"),
        institution: value("institution"),
        fieldOfStudy: value("fieldOfStudy"),
        result: value("result"),
        studyStartDate: value("studyStartDate") ? new Date(value("studyStartDate")) : partial ? undefined : new Date(),
        studyEndDate: value("studyEndDate") ? new Date(value("studyEndDate")) : null,
        status: value("status"),
      });
    }

    if (resource === "employment-status") {
      return this.clean({
        name: value("name"),
        colourValue: value("colourValue", partial ? undefined : "#1677ff"),
        description: value("description"),
        status: value("status"),
      });
    }

    if (resource === "product-color") {
      return this.clean({ name: value("name"), colorCode: value("colorCode"), status: value("status") });
    }

    if (resource === "product-attribute-value") {
      return this.clean({ name: value("name"), productAttributeId: value("productAttributeId"), status: value("status") });
    }

    if (resource === "terms-and-condition") {
      return this.clean({ title: value("title"), subject: value("subject"), status: value("status") });
    }

    if (resource === "page-size") {
      return this.clean({
        pageSizeName: value("pageSizeName"),
        width: value("width"),
        height: value("height"),
        unit: value("unit", "inches"),
        status: value("status"),
      });
    }

    return this.clean({ name: value("name"), status: value("status") });
  }

  private clean(values: Record<string, any>) {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  }

  private whereClause(cfg: TableConfig, query: Record<string, string>) {
    const table = cfg.table;
    const status = query["status"] ? query["status"].split(",") : undefined;
    const statusClause = status?.length ? or(...status.map((item) => eq(table.status, item))) : undefined;

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const searchable = cfg.searchable ?? [];
      const searchClause = searchable.length ? or(...searchable.map((field) => like(table[field], key))) : undefined;
      return and(statusClause, searchClause);
    }

    return statusClause ?? undefined;
  }

  private async ensureExists(cfg: TableConfig, id: number, resource: string, orgId: number) {
    const rows = await this.db.select({ id: cfg.table.id }).from(cfg.table).where(and(eq(cfg.table.id, id), this.orgFilter(cfg, orgId))).limit(1);
    if (!rows.length) throw new NotFoundException(`${resource} not found.`);
  }

  private config(resource: string) {
    const cfg = this.configs[resource];
    if (!cfg) throw new BadRequestException(`Unsupported resource: ${resource}`);
    return cfg;
  }

  private safeUser(u: typeof users.$inferSelect) {
    const { password: _, refreshToken: __, isLogin: ___, ...safe } = u;
    return safe;
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const count = Number(q["count"] ?? 10);
    return { skip: (page - 1) * count, limit: count };
  }
}
