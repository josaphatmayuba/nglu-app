import * as dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8001),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  db: {
    host: process.env.DB_HOST || "mysql",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE || "nglu_db",
    user: process.env.DB_USERNAME || "nglu_user",
    password: process.env.DB_PASSWORD || "password",
  },
};
