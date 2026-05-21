import * as dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8001),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "jwt_secret_key",
  refreshSecret: process.env.REFRESH_SECRET || "refresh_secret_key",
  // Public-facing URL used to build signing links, email links, etc.
  // MUST be set explicitly per environment in docker-compose / .env.
  appUrl: process.env.APP_URL || "http://localhost:3000",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@nglu.app",
  },
  redis: {
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || "",
    userUpdatesChannel: process.env.REDIS_CHANNEL_USER_UPDATES || "user-updates",
    dataUpdatesChannel: process.env.REDIS_CHANNEL_DATA_UPDATES || "data-updates",
  },
  db: {
    host: process.env.DB_HOST || "mysql",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE || "nglu_db",
    user: process.env.DB_USERNAME || "nglu_user",
    password: process.env.DB_PASSWORD || "password",
  },
};
