import { Module } from "@nestjs/common";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../config/env";
import { DRIZZLE, MYSQL_POOL } from "./database.constants";
import * as schema from "./schema";

@Module({
  providers: [
    {
      provide: MYSQL_POOL,
      useFactory: () =>
        mysql.createPool({
          host: env.db.host,
          port: env.db.port,
          database: env.db.database,
          user: env.db.user,
          password: env.db.password,
          charset: "utf8mb4",
          flags: ["+SET_NAMES"],
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        }),
    },
    {
      provide: DRIZZLE,
      inject: [MYSQL_POOL],
      useFactory: (pool: mysql.Pool) => drizzle(pool, { schema, mode: "default" }),
    },
  ],
  exports: [MYSQL_POOL, DRIZZLE],
})
export class DatabaseModule {}
