import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || "mysql",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE || "nglu_db",
    user: process.env.DB_USERNAME || "nglu_user",
    password: process.env.DB_PASSWORD || "password",
  },
} satisfies Config;
