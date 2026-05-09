import { Inject, Injectable } from "@nestjs/common";
import { desc, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { permissions } from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class PermissionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      const rows = await this.db.select().from(permissions).orderBy(desc(permissions.id));
      return rows;
    }

    const page = Number(query["page"] ?? 1);
    const count = Number(query["count"] ?? 10);
    const skip = (page - 1) * count;

    const rows = await this.db
      .select()
      .from(permissions)
      .orderBy(desc(permissions.id))
      .limit(count)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(permissions);

    return { getAllPermission: rows, totalPermission: Number(total) };
  }
}
