import { Inject, Injectable } from "@nestjs/common";
import type mysql from "mysql2/promise";
import { MYSQL_POOL } from "../database/database.constants";

@Injectable()
export class HealthService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: mysql.Pool) {}

  root() {
    return {
      service: "nglu-backend2",
      framework: "NestJS",
      orm: "Drizzle",
      status: "ok",
    };
  }

  health() {
    return {
      service: "backend2",
      status: "ok",
    };
  }

  async database() {
    await this.pool.query("SELECT 1 AS ok");

    return {
      database: "connected",
    };
  }
}
