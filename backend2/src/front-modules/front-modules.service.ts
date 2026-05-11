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
};

@Injectable()
export class FrontModulesService {
  private readonly configs: Record<string, TableConfig> = {
    department: { table: departments, listKey: "getAllDepartment", totalKey: "totalDepartment", searchable: ["name"] },
    "employment-status": {
      table: employmentStatuses,
      listKey: "getAllEmploymentStatus",
      totalKey: "totalEmploymentStatus",
      searchable: ["name", "colourValue", "description"],
    },
    education: { table: educations, listKey: "getAllEducation", totalKey: "totalEducation", searchable: ["degree", "institution", "fieldOfStudy"] },
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

  async list(resource: string, query: Record<string, string>) {
    const cfg = this.config(resource);
    const table = cfg.table;

    if (query["query"] === "all") {
      return this.db.select().from(table).where(eq(table.status, "true")).orderBy(desc(table.id));
    }

    if (query["query"] === "info") {
      const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(table).where(eq(table.status, "true"));
      return { _count: { id: Number(count) } };
    }

    const where = this.whereClause(cfg, query);
    const { skip, limit } = this.pagination(query);

    const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(limit).offset(skip);
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(table).where(where);

    return { [cfg.listKey]: rows, [cfg.totalKey]: Number(count) };
  }

  async findOne(resource: string, id: number) {
    const cfg = this.config(resource);
    const table = cfg.table;

    if (resource === "department") {
      const rows = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
      if (!rows.length) throw new NotFoundException("Department not found.");
      const staff = await this.db.select().from(users).where(eq(users.departmentId, id)).orderBy(desc(users.id));
      return { ...rows[0], user: staff.map(this.safeUser) };
    }

    const rows = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException(`${resource} not found.`);
    return rows[0];
  }

  async create(resource: string, body: Record<string, any>, query: Record<string, string> = {}) {
    const cfg = this.config(resource);
    if (query["query"] === "createmany" && Array.isArray(body)) {
      const created = [];
      for (const item of body) created.push(await this.createOne(cfg.table, this.prepareValues(resource, item)));
      return created;
    }

    return this.createOne(cfg.table, this.prepareValues(resource, body));
  }

  async update(resource: string, id: number, body: Record<string, any>) {
    const cfg = this.config(resource);
    await this.ensureExists(cfg.table, id, resource);
    const values = this.prepareValues(resource, body, true);
    await this.db.update(cfg.table).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(cfg.table.id, id));
    return this.findOne(resource, id);
  }

  async patchStatus(resource: string, id: number, status = "false") {
    const cfg = this.config(resource);
    await this.ensureExists(cfg.table, id, resource);
    await this.db.update(cfg.table).set({ status, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(cfg.table.id, id));
    return { message: `${resource} status updated successfully` };
  }

  async delete(resource: string, id: number) {
    const cfg = this.config(resource);
    await this.ensureExists(cfg.table, id, resource);
    await this.db.delete(cfg.table).where(eq(cfg.table.id, id));
    return { message: `${resource} deleted successfully` };
  }

  private async createOne(table: any, values: Record<string, any>) {
    const [result] = await this.db.insert(table).values({
      ...values,
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

  private async ensureExists(table: any, id: number, resource: string) {
    const rows = await this.db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
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
