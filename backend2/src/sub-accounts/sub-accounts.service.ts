import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { subAccounts } from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class SubAccountsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(org: number) {
    return this.db
      .select({
        id: subAccounts.id,
        name: subAccounts.name,
        accountId: subAccounts.accountId,
        status: subAccounts.status,
        createdAt: subAccounts.createdAt,
        updatedAt: subAccounts.updatedAt,
      })
      .from(subAccounts)
      .where(and(eq(subAccounts.status, "true"), eq(subAccounts.organizationId, org)))
      .orderBy(asc(subAccounts.name));
  }
}
