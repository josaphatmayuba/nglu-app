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
  farmosLandFeatures,
  farmosProductionLogs,
  farmosZones,
  roles,
  users,
} from "../schema";

const ORG_ID = 1;

// ── Zones géographiques ────────────────────────────────────────────────
const ZONES = [
  { name: "Zone Kiselele",  description: "Site principal — bovins et porcs" },
  { name: "Zone Kasangulu", description: "Site secondaire — caprins, porcs malades, poulaillers" },
];

// ── Bâtiments ──────────────────────────────────────────────────────────
const BUILDINGS = [
  { name: "Batiment Bovins Kiselele",   species: "cow",     type: "enclos",     capacity: 30,   zone: "Zone Kiselele",  notes: "Bovins (vaches, veau) — Zone Kiselele",          posX: 8,  posY: 12 },
  { name: "Batiment Porcs Kiselele",    species: "pig",     type: "porcherie",  capacity: 80,   zone: "Zone Kiselele",  notes: "Porcs adultes, jeunes et moyens — Zone Kiselele", posX: 55, posY: 12 },
  { name: "Batiment Caprins Kasangulu", species: "goat",    type: "enclos",     capacity: 50,   zone: "Zone Kasangulu", notes: "Chevres — Zone Kasangulu",                        posX: 8,  posY: 12 },
  { name: "Batiment Porcs Kasangulu",   species: "pig",     type: "porcherie",  capacity: 80,   zone: "Zone Kasangulu", notes: "Porcs affectes par infection — Zone Kasangulu",   posX: 55, posY: 12 },
  { name: "Poulailler 1",               species: "chicken", type: "poulailler", capacity: 1700, zone: "Zone Kasangulu", notes: "Poulailler principal — Zone Kasangulu",            posX: 8,  posY: 55 },
  { name: "Poulailler 2",               species: "chicken", type: "poulailler", capacity: 20,   zone: "Zone Kasangulu", notes: "Poulailler secondaire — Zone Kasangulu",          posX: 40, posY: 55 },
];

// ── Décor du terrain (par zone) ────────────────────────────────────────
// pos/width/height en % du terrain. Idempotent par (zone, type, label).
const LAND_FEATURES = [
  { zone: "Zone Kiselele",  type: "water", label: "Point d'eau", posX: 78, posY: 70, width: 16, height: 16 },
  { zone: "Zone Kiselele",  type: "field", label: "Champ",       posX: 6,  posY: 64, width: 30, height: 26 },
  { zone: "Zone Kasangulu", type: "water", label: "Point d'eau", posX: 78, posY: 70, width: 16, height: 16 },
  { zone: "Zone Kasangulu", type: "field", label: "Champ maïs",  posX: 70, posY: 38, width: 26, height: 24 },
];

// ── Inventaire animaux ─────────────────────────────────────────────────
// barn  = nom du bâtiment (doit correspondre à BUILDINGS[].name)
// room  = zone géographique
const ANIMALS = [
  // Zone Kiselele — Bovins
  { species: "cow",     type: "adulte",   sex: "male",   count: 4,    lot: "Cheptel Zone Kiselele",  barn: "Batiment Bovins Kiselele",   room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon, un veau",             externalId: "ZK-VACHE-MA" },
  { species: "cow",     type: "adulte",   sex: "female", count: 18,   lot: "Cheptel Zone Kiselele",  barn: "Batiment Bovins Kiselele",   room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-VACHE-FA" },
  { species: "cow",     type: "jeune",    sex: "male",   count: 1,    lot: "Cheptel Zone Kiselele",  barn: "Batiment Bovins Kiselele",   room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon, veau",                 externalId: "ZK-VACHE-JM" },
  // Zone Kiselele — Porcs
  { species: "pig",     type: "adulte",   sex: "male",   count: 1,    lot: "Cheptel Zone Kiselele",  barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-MA" },
  { species: "pig",     type: "adulte",   sex: "female", count: 13,   lot: "Cheptel Zone Kiselele",  barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-FA" },
  { species: "pig",     type: "jeune",    sex: "male",   count: 15,   lot: "Cheptel Zone Kiselele",  barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-JM" },
  { species: "pig",     type: "jeune",    sex: "female", count: 32,   lot: "Cheptel Zone Kiselele",  barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORC-JF" },
  { species: "pig",     type: "moyen",    sex: "male",   count: 11,   lot: "Cheptel Zone Kiselele",  barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORCMOY-MA" },
  { species: "pig",     type: "moyen",    sex: "female", count: 7,    lot: "Cheptel Zone Kiselele",  barn: "Batiment Porcs Kiselele",    room: "Zone Kiselele",  status: "healthy", lastEvent: "Etat de sante bon",                       externalId: "ZK-PORCMOY-FA" },
  // Zone Kasangulu — Caprins
  { species: "goat",    type: "total",    sex: null,     count: 45,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Caprins Kasangulu", room: "Zone Kasangulu", status: "sick",    lastEvent: "Etat de sante pas tres bon",              externalId: "ZKA-CHEVRE-TOTAL" },
  // Zone Kasangulu — Porcs
  { species: "pig",     type: "adulte",   sex: "male",   count: 1,    lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-MA" },
  { species: "pig",     type: "adulte",   sex: "female", count: 10,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-FA" },
  { species: "pig",     type: "jeune",    sex: "male",   count: 11,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-JM" },
  { species: "pig",     type: "jeune",    sex: "female", count: 15,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORC-JF" },
  { species: "pig",     type: "moyen",    sex: "male",   count: 22,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORCMOY-MA" },
  { species: "pig",     type: "moyen",    sex: "female", count: 11,   lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu",   room: "Zone Kasangulu", status: "sick",    lastEvent: "Porcs affectes par infection (plaies)",  externalId: "ZKA-PORCMOY-FA" },
  // Zone Kasangulu — Poulaillers
  { species: "chicken", type: "pondeuse", sex: "female", count: 1700, lot: "Poulailler 1",           barn: "Poulailler 1",               room: "Zone Kasangulu", status: "healthy", lastEvent: "1700 poules pondeuses - Poulailler 1",    externalId: "ZKA-POULE-BAT1" },
  { species: "chicken", type: "pondeuse", sex: "male",   count: 7,    lot: "Poulailler 2",           barn: "Poulailler 2",               room: "Zone Kasangulu", status: "healthy", lastEvent: "Poulailler 2: 7 males",                   externalId: "ZKA-POULE-BAT2-M" },
  { species: "chicken", type: "pondeuse", sex: "female", count: 13,   lot: "Poulailler 2",           barn: "Poulailler 2",               room: "Zone Kasangulu", status: "healthy", lastEvent: "Poulailler 2: 13 femelles",               externalId: "ZKA-POULE-BAT2-F" },
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

async function seedZones(): Promise<Map<string, number>> {
  const zoneMap = new Map<string, number>();
  for (const z of ZONES) {
    const [exists] = await db
      .select({ id: farmosZones.id })
      .from(farmosZones)
      .where(and(eq(farmosZones.organizationId, ORG_ID), eq(farmosZones.name, z.name)))
      .limit(1);
    if (exists) {
      zoneMap.set(z.name, exists.id);
    } else {
      const [r] = await db.insert(farmosZones).values({
        organizationId: ORG_ID,
        name: z.name,
        description: z.description,
      } as any).$returningId();
      zoneMap.set(z.name, Number(r.id));
    }
  }
  console.log(`  [farmos-zones] ${ZONES.length} zone(s) prête(s).`);
  return zoneMap;
}

async function seedBuildings(zoneMap: Map<string, number>) {
  let created = 0, updated = 0;
  for (const b of BUILDINGS) {
    const zoneId = zoneMap.get(b.zone) ?? null;
    const [exists] = await db
      .select({ id: farmosBuildings.id, zoneId: farmosBuildings.zoneId })
      .from(farmosBuildings)
      .where(and(eq(farmosBuildings.organizationId, ORG_ID), eq(farmosBuildings.name, b.name)))
      .limit(1);
    if (exists) {
      if (!exists.zoneId && zoneId) {
        await db.execute(sql`UPDATE farmos_buildings SET zone_id = ${zoneId} WHERE id = ${exists.id}`);
        updated++;
      }
      // Backfill position par défaut si pas encore placé manuellement
      await db.execute(sql`UPDATE farmos_buildings SET pos_x = ${b.posX}, pos_y = ${b.posY} WHERE id = ${exists.id} AND pos_x IS NULL`);
      continue;
    }
    await db.insert(farmosBuildings).values({
      organizationId: ORG_ID,
      zoneId,
      name: b.name,
      species: b.species,
      type: b.type,
      capacity: b.capacity,
      notes: b.notes,
      posX: String(b.posX),
      posY: String(b.posY),
    } as any);
    created++;
  }
  console.log(`  [farmos-buildings] ${created} créé(s), ${updated} zone_id mis à jour.`);
}

async function seedLandFeatures(zoneMap: Map<string, number>) {
  let created = 0;
  for (const f of LAND_FEATURES) {
    const zoneId = zoneMap.get(f.zone) ?? null;
    const [exists] = await db
      .select({ id: farmosLandFeatures.id })
      .from(farmosLandFeatures)
      .where(and(eq(farmosLandFeatures.organizationId, ORG_ID), eq(farmosLandFeatures.type, f.type), eq(farmosLandFeatures.label, f.label)))
      .limit(1);
    if (exists) continue;
    await db.insert(farmosLandFeatures).values({
      organizationId: ORG_ID,
      zoneId,
      type: f.type,
      label: f.label,
      posX: String(f.posX),
      posY: String(f.posY),
      width: String(f.width),
      height: String(f.height),
    } as any);
    created++;
  }
  console.log(`  [farmos-land-features] ${created} élément(s) de terrain créé(s).`);
}

async function seedAnimals() {
  // Charger la map bâtiment→{id, zone_id} pour lier building_id et zone_id
  const bldgRows = await db
    .select({ id: farmosBuildings.id, name: farmosBuildings.name, zoneId: farmosBuildings.zoneId })
    .from(farmosBuildings)
    .where(eq(farmosBuildings.organizationId, ORG_ID));
  const bldgMap = new Map(bldgRows.map((r) => [r.name, r]));

  let created = 0, updated = 0;
  for (const a of ANIMALS) {
    const bldg = bldgMap.get(a.barn);
    const buildingId = bldg?.id ?? null;
    const zoneId = bldg?.zoneId ?? null;
    const [exists] = await db
      .select({ id: farmosAnimals.id, buildingId: farmosAnimals.buildingId })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, ORG_ID), eq(farmosAnimals.externalId, a.externalId)))
      .limit(1);
    if (exists) {
      if (!exists.buildingId && buildingId) {
        await db.execute(sql`UPDATE farmos_animals SET building_id = ${buildingId}, zone_id = ${zoneId} WHERE id = ${exists.id}`);
        updated++;
      }
      continue;
    }
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
      buildingId,
      zoneId,
      status: a.status,
      lastEvent: a.lastEvent,
      weightUnit: "kg",
    } as any);
    created++;
  }
  console.log(`  [farmos-animals] ${created} créé(s), ${updated} building_id/zone_id mis à jour.`);
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

async function fixSpeciesIds() {
  const MAP: Record<string, string> = { bovin: "cow", porc: "pig", poule: "chicken", caprin: "goat" };
  for (const [old, neo] of Object.entries(MAP)) {
    await db.execute(sql`UPDATE farmos_animals SET species = ${neo} WHERE species = ${old} AND organization_id = ${ORG_ID}`);
    await db.execute(sql`UPDATE farmos_buildings SET species = ${neo} WHERE species = ${old} AND organization_id = ${ORG_ID}`);
  }
  console.log(`  [farmos-species] IDs espèces normalisés (bovin→cow, porc→pig, poule→chicken, caprin→goat).`);
}

export async function seedFarmosElevage() {
  await fixSpeciesIds();
  await cleanOldBuildings();
  const zoneMap = await seedZones();
  await seedBuildings(zoneMap);
  await seedLandFeatures(zoneMap);
  await seedAnimals();
  await seedProduction();
  await seedHealthGuidelines();
  await seedStaff();
}
