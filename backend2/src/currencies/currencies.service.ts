import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, inArray, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { currencies } from "../database/schema";
import type { Database } from "../database/types";
import { CreateCurrencyDto, CurrencyQueryDto, UpdateCurrencyDto } from "./dto/currency.dto";

@Injectable()
export class CurrenciesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateCurrencyDto) {
    const [result] = await this.db.insert(currencies).values({
      ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
      currencyName: input.currencyName,
      currencySymbol: input.currencySymbol,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async findAll(query: CurrencyQueryDto) {
    if (query.query === "all") {
      if (query.status === "all") {
        return this.db.select().from(currencies).orderBy(desc(currencies.id));
      }
      return this.db
        .select()
        .from(currencies)
        .where(eq(currencies.status, query.status ?? "true"))
        .orderBy(desc(currencies.id));
    }

    if (query.query === "search") {
      return this.search(query);
    }

    return this.paginated(query);
  }

  async findOne(id: number) {
    const rows = await this.db.select().from(currencies).where(eq(currencies.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException("Currency not found.");
    }
    return rows[0];
  }

  async update(id: number, input: UpdateCurrencyDto) {
    await this.ensureCurrencyExists(id);
    await this.db
      .update(currencies)
      .set({
        ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
        ...(input.currencyName !== undefined ? { currencyName: input.currencyName } : {}),
        ...(input.currencySymbol !== undefined ? { currencySymbol: input.currencySymbol } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(currencies.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureCurrencyExists(id);
    await this.db
      .update(currencies)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(currencies.id, id));

    return { message: "Currency deleted successfully." };
  }

  async bulkUpdateStatus(ids: number[], status: string) {
    if (!ids?.length) {
      return { message: "No currencies selected.", updated: 0 };
    }
    await this.db
      .update(currencies)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(inArray(currencies.id, ids));

    return { message: "Currencies updated.", updated: ids.length };
  }

  private async search(query: CurrencyQueryDto) {
    const pagination = this.pagination(query);
    const status = query.status ?? "true";
    const whereName = like(currencies.currencyName, `%${query.key?.trim() || ""}%`);
    const rows = await this.db
      .select()
      .from(currencies)
      .where(sql`${whereName} and ${currencies.status} = ${status}`)
      .orderBy(desc(currencies.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(currencies.id) })
      .from(currencies)
      .where(sql`${whereName} and ${currencies.status} = ${status}`);

    return {
      getAllCurrency: rows,
      totalCurrency: Number(total.total ?? 0),
    };
  }

  private async paginated(query: CurrencyQueryDto) {
    const pagination = this.pagination(query);
    const status = query.status ?? "true";
    const rows = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.status, status))
      .orderBy(desc(currencies.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(currencies.id) })
      .from(currencies)
      .where(eq(currencies.status, status));

    return {
      getAllCurrency: rows,
      totalCurrency: Number(total.total ?? 0),
    };
  }

  private async ensureCurrencyExists(id: number) {
    const rows = await this.db.select({ id: currencies.id }).from(currencies).where(eq(currencies.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException("Currency not found.");
    }
  }

  private pagination(query: CurrencyQueryDto) {
    const limit = Math.max(1, Number(query.limit || 10));
    const page = Math.max(1, Number(query.page || 1));
    return { limit, skip: (page - 1) * limit };
  }
}
