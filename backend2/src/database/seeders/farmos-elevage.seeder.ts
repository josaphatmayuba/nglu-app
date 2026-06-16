// Seeder élevage FarmOS — données réelles compilées (audit terrain).
//
// Structure zones/bâtiments :
//   Zone Kiselele  → Batiment Bovins Kiselele, Batiment Porcs Kiselele
//   Zone Kasangulu → Batiment Caprins Kasangulu, Batiment Porcs Kasangulu,
//                    Poulailler 1, Poulailler 2
//
// Importe dans les tables/modules EXISTANTS (pas de table inventée) :
//   - farmos_buildings        ← bâtiments par zone
//   - farmos_animals          ← inventaire animaux (cheptel)
//   - farmos_production_logs  ← production d'œufs
//   - journal_events          ← plan santé / consignes (module Journal Entreprise)
//   - users                   ← personnel d'élevage (comptes CRM, dépt FarmOS)
//
// Idempotent : chaque jeu se vérifie avant insertion (externalId / clé métier).

import * as bcrypt from "bcryptjs";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../seed.db";
import {
  departments,
  designations,
  farmosAnimals,
  farmosBuildings,
  farmosProductionLogs,
  roles,
  users,
} from "../schema";

const ORG_ID = 1;

// ── Bâtiments ──────────────────────────────────────────────────────────
const BUILDINGS = [
  { name: "Batiment Bovins Kiselele",   species: "bovin",  type: "enclos",     capacity: 30,   zone: "Zone Kiselele",  notes: "Bovins (vaches, veau) — Zone Kiselele" },
  { name: "Batiment Porcs Kiselele",    species: "porc",   type: "porcherie",  capacity: 80,   zone: "Zone Kiselele",  notes: "Porcs adultes, jeunes et moyens — Zone Kiselele" },
  { name: "Batiment Caprins Kasangulu", species: "caprin", type: "enclos",     capacity: 50,   zone: "Zone Kasangulu", notes: "Chevres — Zone Kasangulu" },
  { name: "Batiment Porcs Kasangulu",   species: "porc",   type: "porcherie",  capacity: 80,   zone: "Zone Kasangulu", notes: "Porcs affectes par infection — Zone Kasangulu" },
  { name: "Poulailler 1",               species: "poule",  type: "poulailler", capacity: 1700, zone: "Zone Kasangulu", notes: "Poulailler principal — Zone Kasangulu" },
  { name: "Poulailler 2",               species: "poule",  type: "poulailler", capacity: 20,   zone: "Zone Kasangulu", notes: "Poulailler secondaire — Zone Kasangulu" },
];

// ── Inventaire animaux ─────────────────────────────────────────────────
// barn  = nom du bâtiment (doit correspondre à BUILDINGS[].name)
// room  = zone géographique
const ANIMALS = [
  // Zone Kiselele — Bovins
  { species: "bovin",  type: "adulte",   sex: "male",   count: 4,    lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele",   room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon, un veau",             externalId: "ZK-VACHE-MA" },
  { species: "bovin",  type: "adulte",   sex: "female", count: 18,   lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele",   room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-VACHE-FA" },
  { species: "bovin",  type: "jeune",    sex: "male",   count: 1,    lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele",   room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon, veau",                 externalId: "ZK-VACHE-JM" },
  // Zone Kiselele — Porcs
  { species: "porc",   type: "adulte",   sex: "male",   count: 1,    lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-MA" },
  { species: "porc",   type: "adulte",   sex: "female", count: 13,   lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-FA" },
  { species: "porc",   type: "jeune",    sex: "male",   count: 15,   lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-JM" },
  { species: "porc",   type: "jeune",    sex: "female", count: 32,   lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-JF" },
  { species: "porc",   type: "moyen",    sex: "male",   count: 11,   lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORCMOY-MA" },
  { species: "porc",   type: "moyen",    sex: "female", count: 7,    lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORCMOY-FA" },
  // Zone Kasangulu — Caprins
  { species: "caprin", type: "total",    sex: null,     count: 45,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Caprins Kasangulu", room: "Zone Kasangulu", status: "sick",    lastEvent: "Etat de sante pas tres bon",              externalId: "ZKA-CHEVRE-TOTAL" },
  // Zone Kasangulu — Porcs
  { species: "porc",   type: "adulte",   sex: "male",   count: 1,    lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-MA" },
  { species: "porc",   type: "adulte",   sex: "female", count: 10,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-FA" },
  { species: "porc",   type: "jeune",    sex: "male",   count: 11,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-JM" },
  { species: "porc",   type: "jeune",    sex: "female", count: 15,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-JF" },
  { species: "porc",   type: "moyen",    sex: "male",   count: 22,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORCMOY-MA" },
  { species: "porc",   type: "moyen",    sex: "female", count: 11,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORCMOY-FA" },
  // Zone Kasangulu — Poulaillers
  { species: "poule",  type: "pondeuse", sex: "female", count: 1700, lot: "Poulailler 1",           barn: "Poulailler 1",               room: "Zone Kasangulu", status: "healthy", lastEvent: "1700 poules pondeuses - Poulailler 1",    externalId: "ZKA-POULE-BAT1" },
  { species: "poule",  type: "pondeuse", sex: "male",   count: 7,    lot: "Poulailler 2",           barn: "Poulailler 2",               room: "Zone Kasangulu", status: "healthy", lastEvent: "Poulailler 2: 7 males",                   externalId: "ZKA-POULE-BAT2-M" },
  { species: "poule",  type: "pondeuse", sex: "female", count: 13,   lot: "Poulailler 2",           barn: "Poulailler 2",               room: "Zone Kasangulu", status: "healthy", lastEvent: "Poulailler 2: 13 femelles",               externalId: "ZKA-POULE-BAT2-F" },
];

// ── Production d'œufs ──────────────────────────────────────────────────
const PRODUCTION = [
  { species: "poule", productType: "eggs", logDate: "2026-06-13", period: "week", quantity: "140", unit: "plateaux", notes: "Production semaine du 7 au 13 juin 2026 — Poulailler 1, Zone Kasangulu" },
];

// ── Plan santé / consignes (Journal Entreprise) ────────────────────────
const HEALTH_GUIDELINES = [
  { element: "Evaluation etat sanitaire",          consigne: "Inspecter quotidiennement les animaux: reperer toux, diarrhee, lesions cutanees pour agir avant la contagion" },
  { element: "Historique maladies recentes",        consigne: "Analyser les pathologies des mois passes pour identifier les faiblesses recurrentes et adapter le plan de biosecurite" },
  { element: "Registre des traitements veterinaires", consigne: "Noter chaque soin administre (date, numero animal, produit, dose). Document obligatoire pour respecter les delais d'attente avant abattage" },
  { element: "Calendrier de vaccination",           consigne: "Planifier et consigner toutes les vaccinations (croupe, charbon). Meilleur bouclier contre les epidemies mortelles" },
  { element: "Programme de deparasitage",           consigne: "Suivre un plan strict contre les vers internes et parasites externes (freinent la croissance, surtout porcs)" },
  { element: "Taux de mortalite",                   consigne: "Calculer le % par stade (porcs, sevrage, chevres). Un pic signale une urgence sanitaire ou une faille d'elevage" },
];

// ── Personnel d'élevage ────────────────────────────────────────────────
const STAFF = [
  { firstName: "Nsimba", lastName: "Mukoko", gender: "M" },
  { firstName: "Mawuba", lastName: null,     gender: "M" },
  { firstName: "Jean",   lastName: null,     gender: "M" },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const LEGACY_BUILDING_NAMES = ["Zone A", "Zone B", "Kasangulu", "Etable 1", "Étable 1", "Batiment 1", "Batiment 2"];

async function cleanOldBuildings() {
  let removed = 0;
  for (const name of LEGACY_BUILDING_NAMES) {
    const [row] = await db
      .select({ id: farmosBuildings.id })
      .from(farmosBuildings)
      .where(and(eq(farmosBuildings.organizationId, ORG_ID), eq(farmosBuildings.name, name)))
      .limit(1);
    if (!row) continue;
    await db.execute(sql`UPDATE farmos_buildings SET is_active = 0 WHERE id = ${row.id}`);
    removed++;
  }
  if (removed) console.log(`  [farmos-buildings] ${removed} ancien(s) bâtiment(s) désactivé(s).`);
}

async function seedBuildings() {
  let created = 0;
  for (const b of BUILDINGS) {
    const [exists] = await db
      .select({ id: farmosBuildings.id })
      .from(farmosBuildings)
      .where(and(eq(farmosBuildings.organizationId, ORG_ID), eq(farmosBuildings.name, b.name)))
      .limit(1);
    if (exists) continue;
    await db.insert(farmosBuildings).values({
      organizationId: ORG_ID,
      name: b.name,
      species: b.species,
      type: b.type,
      capacity: b.capacity,
      notes: b.notes,
    } as any);
    created++;
  }
  console.log(`  [farmos-buildings] ${created} créé(s), ${BUILDINGS.length - created} déjà présent(s).`);
}

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
  let created = 0;
  for (const g of HEALTH_GUIDELINES) {
    const title = `Consigne sante elevage — ${g.element}`;
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
  console.log(`  [journal-events sante] ${created} consigne(s) créée(s), ${HEALTH_GUIDELINES.length - created} déjà présente(s).`);
}

async function seedStaff() {
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
    console.log("  [farmos-staff] aucun role CRM disponible, personnel ignore.");
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
  await cleanOldBuildings();
  await seedBuildings();
  await seedAnimals();
  await seedProduction();
  await seedHealthGuidelines();
  await seedStaff();
}
