import * as dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = ["production", "prod"].includes(nodeEnv.toLowerCase());
const weakSecretValues = new Set([
  "",
  "changeme",
  "changeme_in_prod",
  "jwt_secret_key",
  "refresh_secret_key",
  "hahahhoho",
  "VIRVVIER",
  "password",
]);

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function isPlaceholder(value: string) {
  return value.trim().toLowerCase().startsWith("change_me");
}

function isWeakSecret(value: string) {
  const normalized = value.trim();
  return weakSecretValues.has(normalized) || isPlaceholder(normalized) || normalized.length < 32;
}

function isWeakProdValue(value: string) {
  const normalized = value.trim();
  return weakSecretValues.has(normalized) || isPlaceholder(normalized);
}

function requiredSecret(name: string, fallback: string, fallbackLabel = "the configured fallback secret") {
  const configured = envValue(name);
  const usesStrongFallback = isProd && (!configured || isWeakSecret(configured)) && !isWeakSecret(fallback);
  const value = usesStrongFallback ? fallback : configured || fallback;

  if (isProd && isWeakSecret(value)) {
    throw new Error(`${name} must be set to a strong value in production.`);
  }
  if (usesStrongFallback) {
    console.warn(`[config] ${name} is not set to a strong value; using ${fallbackLabel}.`);
  }
  return value;
}

function requiredProdValue(name: string, fallback: string) {
  const value = envValue(name) || fallback;
  if (isProd && isWeakProdValue(value)) {
    throw new Error(`${name} must be set in production.`);
  }
  return value;
}

function optionalProdSecret(name: string, fallback = "") {
  const value = envValue(name) || fallback;
  if (isProd && value && isWeakProdValue(value)) {
    throw new Error(`${name} must be set to a real value in production or left empty.`);
  }
  return value;
}

function isPublicStalwartAdminUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase() === "mail.ongdngolu.org" && url.port === "8088";
  } catch {
    return false;
  }
}

function stalwartJmapUrl(adminUser: string, adminPass: string) {
  const value = envValue("STALWART_JMAP_URL") || (isProd ? "" : "http://127.0.0.1:8088/jmap");

  if (isProd && value && isPublicStalwartAdminUrl(value)) {
    throw new Error("STALWART_JMAP_URL must not use public mail.ongdngolu.org:8088 in production.");
  }

  if (isProd && (adminUser || adminPass) && !value) {
    throw new Error("STALWART_JMAP_URL must be set to an internal-only endpoint when Stalwart admin credentials are configured.");
  }

  return value;
}

const jwtSecret = requiredSecret("JWT_SECRET", "jwt_secret_key");
const stalwartAdminUser = optionalProdSecret("STALWART_ADMIN_USER", isProd ? "" : process.env.SMTP_USER || "");
const stalwartAdminPass = optionalProdSecret("STALWART_ADMIN_PASS", isProd ? "" : process.env.SMTP_PASS || "");

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 8001),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  jwtSecret,
  refreshSecret: requiredSecret("REFRESH_SECRET", jwtSecret, "JWT_SECRET for backward compatibility"),
  google: {
    clientId:
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      process.env.VITE_APP_GOOGLE_CLIENT_ID ||
      "",
  },
  // Public-facing URL used to build signing links, email links, etc.
  // MUST be set explicitly per environment in docker-compose / .env.
  appUrl: process.env.APP_URL || "http://localhost:3000",
  smtp: {
    host: process.env.SMTP_HOST || "mail.ongdngolu.org",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@ongdngolu.org",
    tlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
  },
  imap: {
    host: process.env.IMAP_HOST || process.env.SMTP_HOST || "mail.ongdngolu.org",
    port: Number(process.env.IMAP_PORT || 993),
    user: process.env.IMAP_USER || process.env.SMTP_USER || "",
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || "",
    mailbox: process.env.IMAP_MAILBOX || "INBOX",
    tlsRejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED !== "false",
  },
  stalwart: {
    jmapUrl: stalwartJmapUrl(stalwartAdminUser, stalwartAdminPass),
    adminUser: stalwartAdminUser,
    adminPass: stalwartAdminPass,
    domain: process.env.STALWART_DOMAIN || "ongdngolu.org",
  },
  redis: {
    enabled: process.env.REDIS_ENABLED !== "false",
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || "",
    userUpdatesChannel: process.env.REDIS_CHANNEL_USER_UPDATES || "permissions-updates",
    dataUpdatesChannel: process.env.REDIS_CHANNEL_DATA_UPDATES || "data-updates",
  },
  // Appels audio du chat : credentials TURN ephemeres (HMAC du secret partage
  // avec coturn). Le secret ne quitte jamais le backend ; seuls des couples
  // username/credential a duree de vie limitee sont envoyes aux clients.
  turn: {
    secret: process.env.TURN_SECRET || "",
    // Hote public du serveur TURN, vu depuis les clients (ex: turn.ngolu.app).
    host: process.env.TURN_HOST || "",
    port: Number(process.env.TURN_PORT || 3478),
    tlsPort: Number(process.env.TURN_TLS_PORT || 5349),
    realm: process.env.TURN_REALM || "nglu.chat",
    // Duree de validite des credentials remis au client (secondes).
    credentialTtlSeconds: Number(process.env.TURN_CREDENTIAL_TTL || 3600),
  },
  objectStorage: {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT || "http://minio:9000",
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER || "nglu_minio",
    secretAccessKey:
      process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ||
      process.env.MINIO_ROOT_PASSWORD ||
      (isProd ? "" : "nglu_minio_password_change_me"),
    bucket: process.env.OBJECT_STORAGE_BUCKET || "nglu-files",
    region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
  },
  db: {
    host: process.env.DB_HOST || "mysql",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_DATABASE || "nglu_db",
    user: process.env.DB_USERNAME || "nglu_user",
    password: requiredProdValue("DB_PASSWORD", "password"),
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_HR_MODEL || "claude-sonnet-4-6",
    maxTokens: Number(process.env.ANTHROPIC_HR_MAX_TOKENS || 1024),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    from: process.env.TWILIO_FROM || "",
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
  },
  smsGateway: {
    login: process.env.SMS_GATEWAY_LOGIN || "",
    password: process.env.SMS_GATEWAY_PASSWORD || "",
    baseUrl: process.env.SMS_GATEWAY_BASE_URL || "https://api.sms-gate.app/3rdparty/v1",
  },
  rentReminders: {
    enabled: process.env.RENT_REMINDERS_ENABLED === "true",
    overdueDays: Number(process.env.RENT_REMINDER_OVERDUE_DAYS || 15),
    // Preavis de fin de bail : le locataire et le proprietaire sont prevenus
    // ce nombre de jours avant end_date, pour decider du renouvellement.
    expiryNoticeDays: Number(process.env.LEASE_EXPIRY_NOTICE_DAYS || 90),
    // Daily run time, server timezone. Default 09:00.
    cron: process.env.RENT_REMINDER_CRON || "0 9 * * *",
  },
  vaccineSync: {
    // Desactive par defaut : aucun appel reseau sortant tant que non active.
    enabled: process.env.VACCINE_SYNC_ENABLED === "true",
    // Mensuel : le 1er de chaque mois a 03:00, fuseau serveur.
    cron: process.env.VACCINE_SYNC_CRON || "0 3 1 * *",
    // URL de la source pilote ACIA (CSV des biologiques veterinaires licencies au Canada).
    aciaCsvUrl:
      process.env.VACCINE_SYNC_ACIA_URL ||
      "https://apps.inspection.canada.ca/webapps/veterinary-biologics-product-list/Home/GetAllCSV",
  },
  reproWatchlistAlert: {
    // Desactive par defaut : aucun appel reseau sortant (WhatsApp) tant que non active.
    enabled: process.env.REPRO_WATCHLIST_ALERT_ENABLED === "true",
    // Quotidien a 07:00, fuseau serveur.
    cron: process.env.REPRO_WATCHLIST_ALERT_CRON || "0 7 * * *",
    // Seuil de jours non productifs a partir duquel une truie apparait dans l'alerte.
    thresholdDays: Number.parseInt(process.env.REPRO_WATCHLIST_ALERT_THRESHOLD_DAYS || "30", 10),
    // Jid WhatsApp du regisseur/groupe destinataire (meme pattern que WHATSAPP_DOMUS_MAINTENANCE_GROUP_JID).
    recipientJid: process.env.REPRO_WATCHLIST_ALERT_JID || "",
  },
};
