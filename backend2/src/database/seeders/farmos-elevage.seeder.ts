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
  farmosFarms,
  farmosLandFeatures,
  farmosProductionLogs,
  farmosZones,
  roles,
  users,
} from "../schema";

const ORG_ID = 1;

// ── Fermes (exploitations) ─────────────────────────────────────────────
// Niveau au-dessus des zones. Valeurs issues de l'audit terrain (maquette).
const FARMS = [
  { name: "Ferme Kasangulu",   location: "Kongo Central", hectares: 12, status: "active",      description: "Elevage porcs, vaches, chevres, habitation et champ mais." },
  { name: "Ferme Mont-Ngafula", location: "Kinshasa",     hectares: 7,  status: "ok",          description: "Stockage, habitation, cultures maraicheres et petit elevage." },
  { name: "Ferme Ngolu Nord",  location: "Zone agricole", hectares: 17, status: "maintenance", description: "Grande zone de culture, etables et batiments en maintenance." },
];

// ── Zones géographiques ────────────────────────────────────────────────
// farm = nom de la ferme (doit correspondre à FARMS[].name)
const ZONES = [
  { name: "Zone Kiselele",  farm: "Ferme Kasangulu", description: "Site principal — bovins et porcs" },
  { name: "Zone Kasangulu", farm: "Ferme Kasangulu", description: "Site secondaire — caprins, porcs malades, poulaillers" },
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
  { species: "cow", type: "adulte", sex: "M", dateOfBirth: "2025-12-16", name: "Ferdinand", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-MA-01" },
  { species: "cow", type: "adulte", sex: "M", dateOfBirth: "2025-12-16", name: "Taurus", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-MA-02" },
  { species: "cow", type: "adulte", sex: "M", dateOfBirth: "2025-12-16", name: "Romeo", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-MA-03" },
  { species: "cow", type: "adulte", sex: "M", dateOfBirth: "2025-12-16", name: "Bouvier", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-MA-04" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Bella", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-01" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Daisy", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-02" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Marguerite", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-03" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Etoile", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-04" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Princesse", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-05" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Fleur", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-06" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Caramel", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-07" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Noiraude", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-08" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Blanchette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-09" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Lola", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-10" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Mimosa", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-11" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Pivoine", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-12" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Reinette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-13" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Sultane", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-14" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Venus", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-15" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Aurore", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-16" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Gazelle", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-17" },
  { species: "cow", type: "adulte", sex: "F", dateOfBirth: "2025-12-16", name: "Joconde", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-FA-18" },
  { species: "cow", type: "jeune", sex: "M", dateOfBirth: "2026-06-02", name: "Veau Eclair", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Bovins Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "200", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Etat de sante bon", externalId: "ZA-VACHE-JM-01" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Rosie", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-01" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Pinky", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-02" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Babette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-03" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Truffe", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-04" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Saucisse", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-05" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Coquine", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-06" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Praline", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-07" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Boudine", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-08" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Rilette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-09" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Margot", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-10" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Choupette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-11" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Berthe", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-12" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Gertrude", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-AD-13" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-04", name: "Henriette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-01" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-06", name: "Josette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-02" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-08", name: "Lucette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-03" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-10", name: "Ninon", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-04" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-12", name: "Odette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-05" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-14", name: "Paulette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-06" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-16", name: "Quiche", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-07" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-02", name: "Roberte", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-08" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-04", name: "Suzon", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-09" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-06", name: "Toinette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-10" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-08", name: "Ursule", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-11" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-10", name: "Violette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-12" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-12", name: "Wanda", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-13" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-14", name: "Yvette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-14" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-16", name: "Zoe", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-15" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-02", name: "Adele", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-16" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-04", name: "Brigitte", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-17" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-06", name: "Colette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-18" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-08", name: "Denise", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-19" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-10", name: "Eugenie", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-20" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-12", name: "Fanny", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-21" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-14", name: "Ginette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-22" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-16", name: "Huguette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-23" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-02", name: "Irene", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-24" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-04", name: "Jeanne", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-25" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-06", name: "Karine", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-26" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-08", name: "Louise", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-27" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-10", name: "Manon", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-28" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-12", name: "Nadine", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-29" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-14", name: "Ophelie", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-30" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-16", name: "Pierrette", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-31" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-02", name: "Rachel", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-JE-32" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Sylvie", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-01" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Therese", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-02" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Valerie", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-03" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Yolande", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-04" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Anais", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-05" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Beatrice", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-06" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Celine", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "250", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Truie", externalId: "ZA-TRUIE-MO-07" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Hercule", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "300", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Verrat reproducteur", externalId: "ZA-VERRAT-01" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Atlas", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "300", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Verrat reproducteur", externalId: "ZA-VERRAT-02" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Goliath", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "300", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Verrat reproducteur", externalId: "ZA-VERRAT-03" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Tonnerre", count: 1, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "300", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Verrat reproducteur", externalId: "ZA-VERRAT-04" },
  { species: "pig", type: "Engraissement", sex: "M", dateOfBirth: "2026-03-16", name: "Lot porcs males moyens ZA", count: 8, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "1200", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Porcs males moyens (lot)", externalId: "ZA-PORC-LOT-MOY-M" },
  { species: "pig", type: "Porcelet", sex: "M", dateOfBirth: "2026-06-04", name: "Lot porcs males jeunes ZA", count: 15, lot: "Cheptel Zone Kiselele", barn: "Batiment Porcs Kiselele", room: "Zone Kiselele", status: "healthy", estimatedValue: "900", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Porcs males jeunes (lot)", externalId: "ZA-PORC-LOT-JE-M" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Diane", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-01" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Estelle", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-02" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Fabienne", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-03" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Gisele", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-04" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Helene", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-05" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Inge", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-06" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Jade", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-07" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Katia", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-08" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Lea", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-09" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2025-12-16", name: "Maud", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-AD-10" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-06", name: "Nora", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-01" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-08", name: "Oceane", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-02" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-10", name: "Paule", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-03" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-12", name: "Rosine", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-04" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-14", name: "Sara", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-05" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-16", name: "Tess", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-06" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-02", name: "Ulla", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-07" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-04", name: "Vera", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-08" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-06", name: "Wilma", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-09" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-08", name: "Xena", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-10" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-10", name: "Ysoline", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-11" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-12", name: "Zita", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-12" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-14", name: "Amelie", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-13" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-16", name: "Blanche", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-14" },
  { species: "pig", type: "Cochette", sex: "F", dateOfBirth: "2026-06-02", name: "Cerise", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-JE-15" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Dora", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-01" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Eliane", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-02" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Fauvette", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-03" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Gaby", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-04" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Hilda", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-05" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Iris", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-06" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Juliette", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-07" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Kenza", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-08" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Lila", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-09" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Mona", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-10" },
  { species: "pig", type: "Truie", sex: "F", dateOfBirth: "2026-03-16", name: "Nelly", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "250", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Truie - infection (plaies)", externalId: "ZB-TRUIE-MO-11" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Caesar", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "300", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Verrat reproducteur", externalId: "ZB-VERRAT-01" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Brutus", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "300", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Verrat reproducteur", externalId: "ZB-VERRAT-02" },
  { species: "pig", type: "Verrat", sex: "M", dateOfBirth: "2025-12-16", name: "Zeus", count: 1, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "300", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Verrat reproducteur", externalId: "ZB-VERRAT-03" },
  { species: "pig", type: "Engraissement", sex: "M", dateOfBirth: "2026-03-16", name: "Lot porcs males moyens ZB", count: 20, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "3000", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Porcs males moyens (lot)", externalId: "ZB-PORC-LOT-MOY-M" },
  { species: "pig", type: "Porcelet", sex: "M", dateOfBirth: "2026-06-04", name: "Lot porcs males jeunes ZB", count: 11, lot: "Cheptel Zone Kasangulu", barn: "Batiment Porcs Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "660", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Porcs males jeunes (lot)", externalId: "ZB-PORC-LOT-JE-M" },
  { species: "goat", type: "total", sex: null, dateOfBirth: null, name: "Lot caprins ZB", count: 45, lot: "Cheptel Zone Kasangulu", barn: "Batiment Caprins Kasangulu", room: "Zone Kasangulu", status: "sick", estimatedValue: "3600", withdrawalUntil: "2026-07-07", withdrawalKind: "sale", lastEvent: "Etat de sante pas tres bon", externalId: "ZB-CHEVRE-TOTAL" },
  { species: "chicken", type: "pondeuse", sex: null, dateOfBirth: null, name: "Lot pondeuses Bat 1", count: 1700, lot: "Poulailler 1", barn: "Poulailler 1", room: "Zone Kasangulu", status: "healthy", estimatedValue: "13600", withdrawalUntil: null, withdrawalKind: null, lastEvent: "1700 poules - batiment 1", externalId: "POULE-BAT1" },
  { species: "chicken", type: "pondeuse", sex: "M", dateOfBirth: null, name: "Lot coqs Bat 2", count: 7, lot: "Poulailler 2", barn: "Poulailler 2", room: "Zone Kasangulu", status: "healthy", estimatedValue: "56", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Batiment 2: 7 males", externalId: "POULE-BAT2-M" },
  { species: "chicken", type: "pondeuse", sex: "F", dateOfBirth: null, name: "Lot poules Bat 2", count: 13, lot: "Poulailler 2", barn: "Poulailler 2", room: "Zone Kasangulu", status: "healthy", estimatedValue: "104", withdrawalUntil: null, withdrawalKind: null, lastEvent: "Batiment 2: 13 femelles", externalId: "POULE-BAT2-F" },
];

// ── Production d'œufs ──────────────────────────────────────────────────
const PRODUCTION = [
  { species: "chicken", productType: "eggs", logDate: "2026-06-13", period: "week", quantity: "140", unit: "plateaux", notes: "Production semaine du 7 au 13 juin 2026 — Poulailler 1, Zone Kasangulu" },
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

async function seedFarms(): Promise<Map<string, number>> {
  const farmMap = new Map<string, number>();
  for (const f of FARMS) {
    const [exists] = await db
      .select({ id: farmosFarms.id })
      .from(farmosFarms)
      .where(and(eq(farmosFarms.organizationId, ORG_ID), eq(farmosFarms.name, f.name)))
      .limit(1);
    if (exists) {
      farmMap.set(f.name, exists.id);
    } else {
      const [r] = await db.insert(farmosFarms).values({
        organizationId: ORG_ID,
        name: f.name,
        location: f.location,
        hectares: String(f.hectares),
        status: f.status,
        description: f.description,
      } as any).$returningId();
      farmMap.set(f.name, Number(r.id));
    }
  }
  console.log(`  [farmos-farms] ${FARMS.length} ferme(s) prête(s).`);
  return farmMap;
}

async function seedZones(farmMap: Map<string, number>): Promise<Map<string, number>> {
  const zoneMap = new Map<string, number>();
  for (const z of ZONES) {
    const farmId = farmMap.get(z.farm) ?? null;
    const [exists] = await db
      .select({ id: farmosZones.id, farmId: farmosZones.farmId })
      .from(farmosZones)
      .where(and(eq(farmosZones.organizationId, ORG_ID), eq(farmosZones.name, z.name)))
      .limit(1);
    if (exists) {
      zoneMap.set(z.name, exists.id);
      if (!exists.farmId && farmId) {
        await db.execute(sql`UPDATE farmos_zones SET farm_id = ${farmId} WHERE id = ${exists.id}`);
      }
    } else {
      const [r] = await db.insert(farmosZones).values({
        organizationId: ORG_ID,
        farmId,
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

// Anciennes lignes agrégées (1 ligne = N têtes), remplacées par l'inventaire
// individualisé (vaches/truies/verrats un-à-un + lots par âge). Soft-delete
// pour éviter les doublons de comptage.
async function deactivateLegacyAggregatedAnimals() {
  const r: any = await db.execute(sql`
    UPDATE farmos_animals SET is_active = 0
    WHERE organization_id = ${ORG_ID}
      AND is_active = 1
      AND (external_id LIKE 'ZK-%' OR external_id LIKE 'ZKA-%')
  `);
  const n = r?.[0]?.affectedRows ?? r?.affectedRows ?? 0;
  if (n) console.log(`  [farmos-animals] ${n} ancienne(s) ligne(s) agrégée(s) désactivée(s).`);
}

async function seedAnimals() {
  await deactivateLegacyAggregatedAnimals();
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
      name: (a as any).name ?? null,
      species: a.species,
      type: a.type,
      sex: a.sex,
      dateOfBirth: (a as any).dateOfBirth ?? null,
      count: a.count,
      lot: a.lot,
      barn: a.barn,
      room: a.room,
      buildingId,
      zoneId,
      status: a.status,
      estimatedValue: (a as any).estimatedValue ?? null,
      withdrawalUntil: (a as any).withdrawalUntil ?? null,
      withdrawalKind: (a as any).withdrawalKind ?? null,
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
  const farmMap = await seedFarms();
  const zoneMap = await seedZones(farmMap);
  await seedBuildings(zoneMap);
  await seedLandFeatures(zoneMap);
  await seedAnimals();
  await seedProduction();
  await seedHealthGuidelines();
  await seedStaff();
}
