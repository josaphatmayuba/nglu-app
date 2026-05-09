import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import * as schema from "./schema";

// Pool-based connection — no top-level await needed
const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_DATABASE || "nglu_db",
  user: process.env.DB_USERNAME || "nglu_user",
  password: process.env.DB_PASSWORD || "password",
  waitForConnections: true,
});

export const connection = pool;
export const db = drizzle(pool, { schema, mode: "default" });
