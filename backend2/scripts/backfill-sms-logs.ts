/**
 * Backfill sms_logs à partir de l'historique Twilio (Messages API).
 *
 * Contexte : la table `sms_logs` (backend2/src/database/schema.ts) n'existe que
 * depuis récemment. Tous les SMS envoyés AVANT sa création (bienvenue de bail,
 * rappels de retard, lien de signature de contrat) ne sont pas journalisés chez
 * nous, mais Twilio garde son propre historique. Ce script relit cet historique
 * et réinjecte les lignes manquantes dans `sms_logs`, en tentant de rattacher
 * chaque SMS à un locataire (customers.phone / tenant_details.phone2).
 *
 * À LANCER MANUELLEMENT sur le serveur (dev, ou prod si explicitement demandé)
 * où les variables d'environnement suivantes sont déjà configurées :
 *   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 *   - TWILIO_FROM ou TWILIO_MESSAGING_SERVICE_SID (au moins un des deux)
 *   - DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
 * (mêmes variables que le backend2 NestJS en production/dev — voir .env)
 *
 * Commande (depuis backend2/) :
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-sms-logs.ts
 *
 * Options :
 *   --apply               Écrit réellement en base (par défaut : dry-run, rapport seul).
 *                          Équivalent : variable d'env APPLY=true
 *   --include-unmatched    Insère aussi les SMS non rattachés à un locataire
 *                          (relatedType/relatedId = null). Sans ce flag, ils sont
 *                          comptés dans le rapport mais jamais insérés.
 *   --from=YYYY-MM-DD      Filtre Twilio DateSent>= (optionnel)
 *   --to=YYYY-MM-DD        Filtre Twilio DateSent<= (optionnel)
 *
 * Le script est ré-exécutable sans risque : chaque insertion vérifie au préalable
 * qu'aucune ligne `sms_logs` n'a déjà ce `providerMessageId` (SID Twilio).
 *
 * Il ne modifie que la table `sms_logs` (lecture seule sur customers / tenant_details
 * / real_estate_leases pour le rattachement).
 */

import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import * as schema from "../src/database/schema";
import { customers, realEstateLeases, smsLogs, tenantDetails } from "../src/database/schema";

// ---------------------------------------------------------------------------
// CLI args / env
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const APPLY = args.includes("--apply") || process.env.APPLY === "true";
const INCLUDE_UNMATCHED = args.includes("--include-unmatched");
const FROM_ARG = args.find((a) => a.startsWith("--from="))?.split("=")[1];
const TO_ARG = args.find((a) => a.startsWith("--to="))?.split("=")[1];

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM || "";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";

// ---------------------------------------------------------------------------
// DB connection (pattern identique à src/database/seed.db.ts — hors contexte Nest)
// ---------------------------------------------------------------------------

const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_DATABASE || "nglu_db",
  user: process.env.DB_USERNAME || "nglu_user",
  password: process.env.DB_PASSWORD || "password",
  charset: "utf8mb4",
  waitForConnections: true,
});
const db = drizzle(pool, { schema, mode: "default" });

// ---------------------------------------------------------------------------
// Twilio Messages API (REST brut — même approche que CompatService.sendSms,
// pas de dépendance npm "twilio" ajoutée)
// ---------------------------------------------------------------------------

interface TwilioMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  status: string;
  date_sent: string | null;
  date_created: string | null;
  error_message: string | null;
}

interface TwilioMessagesPage {
  messages: TwilioMessage[];
  next_page_uri: string | null;
}

async function fetchTwilioMessagesPage(url: string): Promise<TwilioMessagesPage> {
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio API error ${res.status}: ${text}`);
  }
  const data: any = await res.json();
  return {
    messages: Array.isArray(data.messages) ? data.messages : [],
    next_page_uri: data.next_page_uri ?? null,
  };
}

async function fetchAllOutboundMessages(): Promise<TwilioMessage[]> {
  const base = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.set("PageSize", "1000");
  if (FROM_ARG) params.set("DateSent>=", FROM_ARG);
  if (TO_ARG) params.set("DateSent<=", TO_ARG);
  // Filtrer par expéditeur si on connaît notre numéro Twilio ("From"). Le
  // filtrage par MessagingServiceSid n'est pas supporté en query param par
  // l'API Messages list ; dans ce cas on filtre après coup en mémoire.
  if (TWILIO_FROM) params.set("From", TWILIO_FROM);

  let nextUrl: string | null = `${base}?${params.toString()}`;
  const all: TwilioMessage[] = [];

  while (nextUrl) {
    const page = await fetchTwilioMessagesPage(nextUrl);
    all.push(...page.messages);
    nextUrl = page.next_page_uri
      ? `https://api.twilio.com${page.next_page_uri}`
      : null;
  }

  // Si on n'a filtré que via MessagingServiceSid (pas de TWILIO_FROM), on ne
  // peut pas le savoir depuis la ressource Message elle-même de façon fiable ;
  // on garde tous les messages sortants (From = notre compte) car un compte
  // Twilio de ce projet n'envoie que des SMS locataires.
  return all;
}

// ---------------------------------------------------------------------------
// Rattachement locataire par numéro de téléphone
// ---------------------------------------------------------------------------

/** Garde uniquement les chiffres, puis les 9-10 derniers digits pour comparer
 * un numéro E.164 Twilio (+243...) à un numéro stocké dans un format variable. */
function normalizePhoneTail(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length < 8) return null;
  return digitsOnly.slice(-9);
}

interface TenantCandidate {
  tenantId: number; // customers.id
  organizationId: number | null; // depuis le bail le plus pertinent, si trouvé
  phoneTails: Set<string>;
}

async function loadTenantCandidates(): Promise<TenantCandidate[]> {
  const rows = await db
    .select({
      customerId: customers.id,
      phone: customers.phone,
      phone2: tenantDetails.phone2,
    })
    .from(customers)
    .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id));

  const leases = await db
    .select({ tenantId: realEstateLeases.tenantId, organizationId: realEstateLeases.organizationId })
    .from(realEstateLeases);
  const orgByTenant = new Map<number, number>();
  for (const l of leases) {
    if (!orgByTenant.has(l.tenantId)) orgByTenant.set(l.tenantId, l.organizationId);
  }

  const candidates: TenantCandidate[] = [];
  for (const row of rows) {
    const tails = new Set<string>();
    const t1 = normalizePhoneTail(row.phone);
    const t2 = normalizePhoneTail(row.phone2);
    if (t1) tails.add(t1);
    if (t2) tails.add(t2);
    if (tails.size === 0) continue;
    candidates.push({
      tenantId: row.customerId,
      organizationId: orgByTenant.get(row.customerId) ?? null,
      phoneTails: tails,
    });
  }
  return candidates;
}

function findTenantByPhone(to: string, candidates: TenantCandidate[]): TenantCandidate | null {
  const tail = normalizePhoneTail(to);
  if (!tail) return null;
  for (const c of candidates) {
    if (c.phoneTails.has(tail)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Heuristique smsType + mapping status
// ---------------------------------------------------------------------------

function guessSmsType(body: string | null | undefined): string {
  const text = (body || "").toLowerCase();
  if (text.includes("retard") || text.includes("rappel")) return "payment_reminder";
  if (text.includes("signer") || text.includes("contrat")) return "contract_signature";
  if (text.includes("bienvenue")) return "lease_welcome";
  if (text.includes("espace locataire")) return "tenant_portal_welcome";
  return "backfill_unknown";
}

function mapStatus(twilioStatus: string): "sent" | "failed" | "skipped" {
  const s = (twilioStatus || "").toLowerCase();
  if (s === "delivered" || s === "sent") return "sent";
  if (s === "failed" || s === "undelivered") return "failed";
  return "skipped";
}

function parseTwilioDate(value: string | null): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// ---------------------------------------------------------------------------
// Anti-doublon
// ---------------------------------------------------------------------------

async function loadExistingProviderMessageIds(sids: string[]): Promise<Set<string>> {
  if (sids.length === 0) return new Set();
  const existing = new Set<string>();
  const chunkSize = 500;
  for (let i = 0; i < sids.length; i += chunkSize) {
    const chunk = sids.slice(i, i + chunkSize);
    const rows = await db
      .select({ providerMessageId: smsLogs.providerMessageId })
      .from(smsLogs)
      .where(and(inArray(smsLogs.providerMessageId, chunk), sql`${smsLogs.providerMessageId} is not null`));
    for (const r of rows) if (r.providerMessageId) existing.add(r.providerMessageId);
  }
  return existing;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Backfill sms_logs depuis Twilio\n");
  console.log(`Mode: ${APPLY ? "APPLY (écriture réelle)" : "DRY-RUN (aucune écriture)"}`);
  console.log(`Inclure les non-rattachés: ${INCLUDE_UNMATCHED ? "oui" : "non"}`);
  if (FROM_ARG) console.log(`Filtre DateSent>=: ${FROM_ARG}`);
  if (TO_ARG) console.log(`Filtre DateSent<=: ${TO_ARG}`);
  console.log("");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN manquants dans l'environnement. Abandon.");
    process.exit(1);
  }
  if (!TWILIO_FROM && !TWILIO_MESSAGING_SERVICE_SID) {
    console.error("TWILIO_FROM ou TWILIO_MESSAGING_SERVICE_SID requis pour identifier nos SMS sortants. Abandon.");
    process.exit(1);
  }

  console.log("Récupération de l'historique Twilio (pagination complète)...");
  const messages = await fetchAllOutboundMessages();
  console.log(`  ${messages.length} message(s) sortant(s) trouvé(s) côté Twilio.\n`);

  console.log("Chargement des locataires (customers + tenant_details.phone2)...");
  const tenantCandidates = await loadTenantCandidates();
  console.log(`  ${tenantCandidates.length} locataire(s) avec au moins un numéro exploitable.\n`);

  console.log("Vérification des doublons existants (providerMessageId)...");
  const existingSids = await loadExistingProviderMessageIds(messages.map((m) => m.sid));
  console.log(`  ${existingSids.size} SID déjà présent(s) dans sms_logs (seront ignorés).\n`);

  type PreparedRow = {
    sid: string;
    to: string;
    body: string;
    status: "sent" | "failed" | "skipped";
    smsType: string;
    matched: TenantCandidate | null;
    createdAt: Date;
    errorMessage: string | null;
  };

  const prepared: PreparedRow[] = [];
  let skippedDuplicate = 0;

  for (const msg of messages) {
    if (existingSids.has(msg.sid)) {
      skippedDuplicate++;
      continue;
    }
    const matched = findTenantByPhone(msg.to, tenantCandidates);
    prepared.push({
      sid: msg.sid,
      to: msg.to,
      body: msg.body || "",
      status: mapStatus(msg.status),
      smsType: guessSmsType(msg.body),
      matched,
      createdAt: parseTwilioDate(msg.date_sent || msg.date_created),
      errorMessage: msg.error_message || null,
    });
  }

  const matchedRows = prepared.filter((r) => r.matched);
  const unmatchedRows = prepared.filter((r) => !r.matched);
  const toInsert = INCLUDE_UNMATCHED ? prepared : matchedRows;

  console.log("── Rapport ─────────────────────────────");
  console.log(`Total Twilio (sortants):        ${messages.length}`);
  console.log(`Déjà en base (SID dupliqué):     ${skippedDuplicate}`);
  console.log(`Nouveaux à traiter:              ${prepared.length}`);
  console.log(`  Rattachés à un locataire:      ${matchedRows.length}`);
  console.log(`  Non rattachés:                 ${unmatchedRows.length}`);
  console.log(`Lignes qui seront insérées:      ${toInsert.length}${INCLUDE_UNMATCHED ? "" : " (non-rattachés exclus, --include-unmatched pour les inclure)"}`);
  console.log("");

  console.log("Exemples rattachés (max 5):");
  for (const r of matchedRows.slice(0, 5)) {
    console.log(`  [${r.sid}] to=${r.to} tenantId=${r.matched?.tenantId} type=${r.smsType} status=${r.status} date=${r.createdAt.toISOString()}`);
  }
  console.log("\nExemples non rattachés (max 5):");
  for (const r of unmatchedRows.slice(0, 5)) {
    console.log(`  [${r.sid}] to=${r.to} type=${r.smsType} status=${r.status} date=${r.createdAt.toISOString()}`);
  }
  console.log("");

  if (!APPLY) {
    console.log("Dry-run terminé. Aucune écriture en base. Relancer avec --apply pour insérer.");
    await pool.end();
    return;
  }

  console.log(`Insertion de ${toInsert.length} ligne(s) dans sms_logs...`);
  let inserted = 0;
  for (const row of toInsert) {
    const recipient = row.to;
    const organizationId = row.matched?.organizationId ?? 1;
    await db.insert(smsLogs).values({
      organizationId,
      smsType: row.smsType,
      recipient,
      body: row.body,
      status: row.status,
      relatedType: row.matched ? "tenant" : null,
      relatedId: row.matched ? String(row.matched.tenantId) : null,
      providerMessageId: row.sid,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    });
    inserted++;
  }
  console.log(`\nTerminé : ${inserted} ligne(s) insérée(s) dans sms_logs.`);

  await pool.end();
}

main().catch(async (err) => {
  console.error("\nBackfill échoué:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
