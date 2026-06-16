// Seeder élevage FarmOS — données réelles compilées (audit terrain).
//
// Importe dans les tables/modules EXISTANTS (pas de table inventée) :
//   - farmos_animals          ← inventaire animaux (cheptel)
//   - farmos_production_logs   ← production d'œufs
//   - journal_events          ← plan santé / consignes (module Journal Entreprise)
//   - users                   ← personnel d'élevage (comptes CRM, dépt FarmOS)
//
// Idempotent : chaque jeu se vérifie avant insertion (externalId / clé métier).
// Re-jouer le seeder sur une base déjà peuplée = no-op propre.

import * as bcrypt from "bcryptjs";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../seed.db";
import {
  departments,
  designations,
  farmosAnimals,
  farmosProductionLogs,
  roles,
  users,
} from "../schema";

const ORG_ID = 1;

// ── Inventaire animaux (external_id = clé d'idempotence) ───────────────
const ANIMALS = [
  { species: "bovin", type: "adulte", sex: "male", count: 4, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon, un veau", externalId: "ZA-VACHE-MA" },
  { species: "bovin", type: "adulte", sex: "female", count: 18, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon, un veau", externalId: "ZA-VACHE-FA" },
  { species: "bovin", type: "jeune", sex: "male", count: 1, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon, un veau", externalId: "ZA-VACHE-JM" },
  { species: "porc", type: "adulte", sex: "male", count: 1, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon", externalId: "ZA-PORC-MA" },
  { species: "porc", type: "adulte", sex: "female", count: 13, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon", externalId: "ZA-PORC-FA" },
  { species: "porc", type: "jeune", sex: "male", count: 15, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon", externalId: "ZA-PORC-JM" },
  { species: "porc", type: "jeune", sex: "female", count: 32, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon", externalId: "ZA-PORC-JF" },
  { species: "porc", type: "moyen", sex: "male", count: 11, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon", externalId: "ZA-PORCMOY-MA" },
  { species: "porc", type: "moyen", sex: "female", count: 7, lot: "Cheptel Zone A", barn: "Zone A", room: "Kiselele", status: "healthy", lastEvent: "Etat de sante bon", externalId: "ZA-PORCMOY-FA" },
  { species: "caprin", type: "total", sex: null, count: 45, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Etat de sante pas tres bon", externalId: "ZB-CHEVRE-TOTAL" },
  { species: "porc", type: "adulte", sex: "male", count: 1, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Porcs affectes par infection (plaies)", externalId: "ZB-PORC-MA" },
  { species: "porc", type: "adulte", sex: "female", count: 10, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Porcs affectes par infection (plaies)", externalId: "ZB-PORC-FA" },
  { species: "porc", type: "jeune", sex: "male", count: 11, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Porcs affectes par infection (plaies)", externalId: "ZB-PORC-JM" },
  { species: "porc", type: "jeune", sex: "female", count: 15, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Porcs affectes par infection (plaies)", externalId: "ZB-PORC-JF" },
  { species: "porc", type: "moyen", sex: "male", count: 22, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Porcs affectes par infection (plaies)", externalId: "ZB-PORCMOY-MA" },
  { species: "porc", type: "moyen", sex: "female", count: 11, lot: "Cheptel Zone B", barn: "Zone B", room: "Kasangulu", status: "sick", lastEvent: "Porcs affectes par infection (plaies)", externalId: "ZB-PORCMOY-FA" },
  { species: "poule", type: "pondeuse", sex: null, count: 1700, lot: "Poulailler 1", barn: "Batiment 1", room: null, status: "healthy", lastEvent: "1700 poules - batiment 1", externalId: "POULE-BAT1" },
  { species: "poule", type: "pondeuse", sex: "male", count: 7, lot: "Poulailler 2", barn: "Batiment 2", room: null, status: "healthy", lastEvent: "Batiment 2: 7 males", externalId: "POULE-BAT2-M" },
  { species: "poule", type: "pondeuse", sex: "female", count: 13, lot: "Poulailler 2", barn: "Batiment 2", room: null, status: "healthy", lastEvent: "Batiment 2: 13 femelles", externalId: "POULE-BAT2-F" },
];

// ── Production d'œufs ──────────────────────────────────────────────────
const PRODUCTION = [
  { species: "poule", productType: "eggs", logDate: "2026-06-13", period: "week", quantity: "140", unit: "plateaux", notes: "Production de la semaine du 7 au 13 juin 2026: 140 plateaux d'oeufs" },
];

// ── Plan santé / consignes (Journal Entreprise — journal_events) ────────
const HEALTH_GUIDELINES = [
  { element: "Evaluation etat sanitaire", consigne: "Inspecter quotidiennement les animaux: reperer toux, diarrhee, lesions cutanees pour agir avant la contagion" },
  { element: "Historique maladies recentes", consigne: "Analyser les pathologies des mois passes pour identifier les faiblesses recurrentes et adapter le plan de biosecurite" },
  { element: "Registre des traitements veterinaires", consigne: "Noter chaque soin administre (date, numero animal, produit, dose). Document obligatoire pour respecter les delais d'attente avant abattage" },
  { element: "Calendrier de vaccination", consigne: "Planifier et consigner toutes les vaccinations (croupe, charbon). Meilleur bouclier contre les epidemies mortelles" },
  { element: "Programme de deparasitage", consigne: "Suivre un plan strict contre les vers internes et parasites externes (freinent la croissance, surtout porcs)" },
  { element: "Taux de mortalite", consigne: "Calculer le % par stade (porcs, sevrage, chevres). Un pic signale une urgence sanitaire ou une faille d'elevage" },
];

// ── Personnel d'élevage (comptes CRM, dépt FarmOS) ─────────────────────
// Pas d'email fourni → généré au standard prenom.nom@ongdngolu.org.
const STAFF = [
  { firstName: "Nsimba", lastName: "Mukoko", gender: "M", role: "Ouvrier elevage", zone: "Zone A" },
  { firstName: "Mawuba", lastName: null, gender: "M", role: "Ouvrier elevage", zone: "Zone A" },
  { firstName: "Jean", lastName: null, gender: "M", role: "Ouvrier elevage", zone: "Zone A" },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function seedAnimals() {
  let created = 0;
  for (const a of ANIMALS) {
    const [exists] = await db
      .select({ id: farmosAnimals.id })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, ORG_ID), eq(farmosAnimals.externalId, a.externalId)))
      .limit(1);
    if (exists) continue;
    await db.insert(farmosAnimals).values({
      organizationId: ORG_ID,
      externalId: a.externalId,
      species: a.species,
      type: a.type,
      sex: a.sex,
      count: a.count,
      lot: a.lot,
      barn: a.barn,
      room: a.room,
      status: a.status,
      lastEvent: a.lastEvent,
      weightUnit: "kg",
    } as any);
    created++;
  }
  console.log(`  [farmos-animals] ${created} créé(s), ${ANIMALS.length - created} déjà présent(s).`);
}

async function seedProduction() {
  let created = 0;
  for (const p of PRODUCTION) {
    const [exists] = await db
      .select({ id: farmosProductionLogs.id })
      .from(farmosProductionLogs)
      .where(and(
        eq(farmosProductionLogs.organizationId, ORG_ID),
        eq(farmosProductionLogs.species, p.species),
        eq(farmosProductionLogs.productType, p.productType),
        eq(farmosProductionLogs.logDate, p.logDate),
      ))
      .limit(1);
    if (exists) continue;
    await db.insert(farmosProductionLogs).values({
      organizationId: ORG_ID,
      species: p.species,
      productType: p.productType,
      logDate: p.logDate,
      period: p.period,
      quantity: p.quantity,
      unit: p.unit,
      notes: p.notes,
    } as any);
    created++;
  }
  console.log(`  [farmos-production] ${created} créé(s), ${PRODUCTION.length - created} déjà présent(s).`);
}

async function seedHealthGuidelines() {
  // Stockées comme événements 'note' du Journal Entreprise (source_module=farmos).
  // Idempotence par titre exact.
  let created = 0;
  for (const g of HEALTH_GUIDELINES) {
    const title = `Consigne santé élevage — ${g.element}`;
    const [row]: any = await db.execute(
      sql`SELECT id FROM journal_events WHERE title = ${title} AND status = 1 LIMIT 1`,
    );
    if (Array.isArray(row) && row.length) continue;
    await db.execute(sql`
      INSERT INTO journal_events (title, event_type, source_module, importance, event_date, description, created_by, status)
      VALUES (${title}, 'note', 'farmos', 'haute', CURDATE(), ${g.consigne}, NULL, 1)
    `);
    created++;
  }
  console.log(`  [journal-events santé] ${created} consigne(s) créée(s), ${HEALTH_GUIDELINES.length - created} déjà présente(s).`);
}

async function seedStaff() {
  // Département + désignation + rôle (find-or-create), comme createFarmosStaff.
  let [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(or(sql`LOWER(${departments.name}) = 'farmos'`, sql`LOWER(${departments.name}) = 'ferme'`))
    .limit(1);
  if (!dept) {
    const [r] = await db.insert(departments).values({ name: "FarmOS" } as any).$returningId();
    dept = { id: Number(r.id) };
  }

  let [desig] = await db
    .select({ id: designations.id })
    .from(designations)
    .where(sql`LOWER(${designations.name}) = 'ouvrier elevage'`)
    .limit(1);
  if (!desig) {
    const [r] = await db.insert(designations).values({ name: "Ouvrier elevage" } as any).$returningId();
    desig = { id: Number(r.id) };
  }

  const roleRows = await db.select({ id: roles.id, name: roles.name }).from(roles);
  const pick = (n: string) => roleRows.find((r) => (r.name || "").toLowerCase() === n)?.id;
  const roleId = pick("salesman") || pick("manager") || roleRows.find((r) => (r.name || "").toLowerCase() !== "super-admin")?.id;
  if (!roleId) {
    console.log("  [farmos-staff] aucun rôle CRM disponible, personnel ignoré.");
    return;
  }

  let created = 0;
  for (const s of STAFF) {
    const local = s.lastName ? `${slugify(s.firstName)}.${slugify(s.lastName)}` : slugify(s.firstName);
    const email = `${local}@ongdngolu.org`;
    const username = local;
    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);
    if (exists) continue;
    await db.insert(users).values({
      organizationId: ORG_ID,
      firstName: s.firstName,
      lastName: s.lastName,
      email,
      username,
      gender: s.gender,
      password: await bcrypt.hash(`Farm${Math.random().toString(36).slice(2, 10)}!`, 10),
      roleId,
      designationId: desig.id,
      departmentId: dept.id,
      status: "true",
    } as any);
    created++;
  }
  console.log(`  [farmos-staff] ${created} compte(s) créé(s), ${STAFF.length - created} déjà présent(s).`);
}

export async function seedFarmosElevage() {
  await seedAnimals();
  await seedProduction();
  await seedHealthGuidelines();
  await seedStaff();
}
