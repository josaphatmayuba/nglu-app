import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { manufacturers } from "../database/schema";
import type { Database } from "../database/types";
import { CreateManufacturerDto, UpdateManufacturerDto } from "./dto/manufacturer.dto";

@Injectable()
export class ManufacturersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.status, "true"))
      .orderBy(desc(manufacturers.id));
  }

  async findOne(id: number) {
    const rows = await this.db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Manufacturer not found.");
    }

    return rows[0];
  }

  async create(input: CreateManufacturerDto) {
    await this.ensureNameAvailable(input.name);

    const [result] = await this.db.insert(manufacturers).values({
      name: input.name,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async update(id: number, input: UpdateManufacturerDto) {
    await this.ensureExists(id);

    if (input.name) {
      await this.ensureNameAvailable(input.name, id);
    }

    await this.db
      .update(manufacturers)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(manufacturers.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureExists(id);

    await this.db
      .update(manufacturers)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(manufacturers.id, id));

    return { message: "Manufacturer status updated." };
  }

  private async ensureNameAvailable(name: string, currentId?: number) {
    const rows = await this.db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(eq(manufacturers.name, name))
      .limit(1);

    if (rows.length && rows[0].id !== currentId) {
      throw new BadRequestException("Manufacturer name already exists.");
    }
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(eq(manufacturers.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Manufacturer not found.");
    }
  }
}
