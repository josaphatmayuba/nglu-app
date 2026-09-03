import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktBranches } from "../database/schema";
import type { Database } from "../database/types";
import { CreateBranchDto, UpdateBranchDto } from "./dto/branches.dto";

@Injectable()
export class BranchesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(orgId: number) {
    return this.db
      .select()
      .from(ktBranches)
      .where(and(eq(ktBranches.organizationId, orgId), eq(ktBranches.status, "true")))
      .orderBy(desc(ktBranches.isDefault), asc(ktBranches.name));
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktBranches)
      .where(and(eq(ktBranches.id, id), eq(ktBranches.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Succursale introuvable.");
    return rows[0];
  }

  /** Une seule succursale par-defaut par organisation : les autres sont desactivees. */
  private async clearOtherDefaults(orgId: number, excludeId?: number) {
    const conditions = [eq(ktBranches.organizationId, orgId), eq(ktBranches.isDefault, 1)];
    if (excludeId !== undefined) conditions.push(ne(ktBranches.id, excludeId));
    await this.db.update(ktBranches).set({ isDefault: 0 }).where(and(...conditions));
  }

  async create(input: CreateBranchDto, orgId: number) {
    if (input.isDefault) {
      await this.clearOtherDefaults(orgId);
    }

    const [result] = await this.db.insert(ktBranches).values({
      organizationId: orgId,
      name: input.name,
      address: input.address,
      phone: input.phone,
      timezone: input.timezone ?? "Africa/Kinshasa",
      isDefault: input.isDefault ? 1 : 0,
    });
    return this.findOne(Number(result.insertId), orgId);
  }

  async update(id: number, input: UpdateBranchDto, orgId: number) {
    await this.findOne(id, orgId);

    if (input.isDefault) {
      await this.clearOtherDefaults(orgId, id);
    }

    await this.db
      .update(ktBranches)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault ? 1 : 0 } : {}),
      })
      .where(and(eq(ktBranches.id, id), eq(ktBranches.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  async remove(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(ktBranches)
      .set({ status: "false" })
      .where(and(eq(ktBranches.id, id), eq(ktBranches.organizationId, orgId)));
    return { message: "Succursale desactivee." };
  }
}
