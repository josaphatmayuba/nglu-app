// Demo data seeder for the property management module.
//
// Goal: make dev.ongdngolu.org "feel alive" — populate properties, units,
// tenants (customer + tenant_details), leases, rent payments, maintenance
// requests and a couple of signed/pending contracts. Data mirrors the
// design mockup (Résidence Tombalbaye, Villa Lemba Salongo, etc.) so the
// UI looks coherent.
//
// Idempotent: if `real_estate_properties` already has any row, this seeder
// is a no-op. Re-running it on a populated DB will skip cleanly.

import * as bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "../seed.db";
import {
  currencies,
  customers,
  realEstateContracts,
  realEstateLeases,
  realEstateMaintenanceRequests,
  realEstateProperties,
  realEstateRentPayments,
  realEstateUnits,
  roles,
  tenantDetails,
} from "../schema";

// ── Helpers ──────────────────────────────────────────────────────────
const isoToday = () => new Date();
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthsAgo = (n: number) => {
  const d = isoToday();
  d.setMonth(d.getMonth() - n);
  return d;
};
const monthsFromNow = (n: number) => monthsAgo(-n);
const daysAgo = (n: number) => {
  const d = isoToday();
  d.setDate(d.getDate() - n);
  return d;
};

export async function seedDemoRealEstate() {
  const existing = await db
    .select({ id: realEstateProperties.id })
    .from(realEstateProperties)
    .limit(1);
  if (existing.length) {
    console.log("  [demo-real-estate] properties already present, skipping.");
    return;
  }

  // ── Resolve referenced rows ─────────────────────────────────────────
  // Currency (CDF — FRANC CONGOLAIS, seedé par currencies.seeder.ts).
  // Falls back to the first available currency if not found (defensive).
  const [cdf] = await db
    .select({ id: currencies.id })
    .from(currencies)
    .where(eq(currencies.currencyName, "FRANC CONGOLAIS"))
    .limit(1);
  let currencyId = cdf?.id;
  if (!currencyId) {
    const [first] = await db.select({ id: currencies.id }).from(currencies).limit(1);
    currencyId = first?.id ?? 1;
    console.warn(`  [demo-real-estate] FRANC CONGOLAIS not found, falling back to currency id=${currencyId}`);
  }

  // Tenant role (Locataire). Falls back to 3 (customer).
  const [tenantRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, "Locataire"))
    .limit(1);
  const tenantRoleId = tenantRole?.id ?? 3;

  // ── 1. Properties ────────────────────────────────────────────────────
  const PROPERTIES = [
    { name: "Résidence Tombalbaye",  code: "PROP-2024-001", propertyType: "building",   status: "available",   address: "15 Av. Tombalbaye",     city: "Kinshasa", country: "RDC", floors: 4, parkingSpaces: 6,  marketValue: "480000000", defaultRent: "850000",  description: "Résidence moderne au cœur de Gombe." },
    { name: "Villa Lemba Salongo",   code: "PROP-2024-002", propertyType: "villa",      status: "available",   address: "42 Av. Bandundu",       city: "Kinshasa", country: "RDC", floors: 2, parkingSpaces: 2,  marketValue: "650000000", defaultRent: "1200000", description: "Villa familiale avec jardin." },
    { name: "Résidence Limete Plaza", code: "PROP-2024-003", propertyType: "building",   status: "available",   address: "8 Bd Lumumba",          city: "Kinshasa", country: "RDC", floors: 6, parkingSpaces: 12, marketValue: "720000000", defaultRent: "620000",  description: "Immeuble standing à Limete." },
    { name: "Tour Wagenia",          code: "PROP-2024-004", propertyType: "building",   status: "available",   address: "25 Av. Wagenia",        city: "Kinshasa", country: "RDC", floors: 8, parkingSpaces: 20, marketValue: "1500000000", defaultRent: "2400000", description: "Tour de bureaux Plateau Gombe." },
    { name: "Villa Bandalungwa Sud", code: "PROP-2024-005", propertyType: "villa",      status: "maintenance", address: "17 Av. de la Paix",     city: "Kinshasa", country: "RDC", floors: 2, parkingSpaces: 1,  marketValue: "420000000", defaultRent: "950000",  description: "Villa en cours de rénovation." },
    { name: "Galerie Présidentielle", code: "PROP-2024-006", propertyType: "commercial", status: "available",   address: "3 Bd du 30 juin",        city: "Kinshasa", country: "RDC", floors: 1, parkingSpaces: 8,  marketValue: "950000000", defaultRent: "1800000", description: "Galerie commerciale prestige." },
    { name: "Villa Ngaliema",        code: "PROP-2024-007", propertyType: "villa",      status: "available",   address: "5 Av. Lukoki",          city: "Kinshasa", country: "RDC", floors: 1, parkingSpaces: 2,  marketValue: "380000000", defaultRent: "950000",  description: "Villa résidentielle calme." },
  ];

  const insertedProps = await Promise.all(
    PROPERTIES.map(async (p) => {
      const res = await db.insert(realEstateProperties).values({
        ...p,
        currencyId,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
      return { name: p.name, id: Number((res as unknown as { insertId: number }).insertId) };
    }),
  );
  const propByName = Object.fromEntries(insertedProps.map((p) => [p.name, p.id]));
  console.log(`  [demo-real-estate] ${insertedProps.length} properties inserted.`);

  // ── 2. Units ─────────────────────────────────────────────────────────
  // 1 unit per property to start, plus a couple of extra vacants on
  // Tombalbaye and Limete for the "vacant" cards in the mockup.
  const UNITS = [
    { propertyName: "Résidence Tombalbaye",   name: "A-203", unitType: "apartment", status: "occupied",  floor: "2",   bedrooms: 3, bathrooms: 2, area: "120", monthlyRent: "850000",  securityDeposit: "1700000" },
    { propertyName: "Résidence Tombalbaye",   name: "A-101", unitType: "apartment", status: "vacant",    floor: "1",   bedrooms: 2, bathrooms: 1, area: "85",  monthlyRent: "620000",  securityDeposit: "1240000" },
    { propertyName: "Villa Lemba Salongo",    name: "M-12",  unitType: "house",     status: "occupied",  floor: "RDC", bedrooms: 4, bathrooms: 3, area: "240", monthlyRent: "1200000", securityDeposit: "2400000" },
    { propertyName: "Résidence Limete Plaza", name: "B-105", unitType: "apartment", status: "vacant",    floor: "1",   bedrooms: 2, bathrooms: 1, area: "85",  monthlyRent: "620000",  securityDeposit: "1240000" },
    { propertyName: "Résidence Limete Plaza", name: "B-301", unitType: "apartment", status: "occupied",  floor: "3",   bedrooms: 2, bathrooms: 1, area: "90",  monthlyRent: "720000",  securityDeposit: "1440000" },
    { propertyName: "Tour Wagenia",           name: "ET-04", unitType: "office",    status: "occupied",  floor: "4",   bedrooms: 0, bathrooms: 2, area: "180", monthlyRent: "2400000", securityDeposit: "4800000" },
    { propertyName: "Villa Bandalungwa Sud",  name: "M-07",  unitType: "house",     status: "maintenance", floor: "RDC", bedrooms: 3, bathrooms: 2, area: "160", monthlyRent: "950000",  securityDeposit: "1900000" },
    { propertyName: "Galerie Présidentielle", name: "RDC-01", unitType: "shop",     status: "occupied",  floor: "RDC", bedrooms: 0, bathrooms: 1, area: "45",  monthlyRent: "1800000", securityDeposit: "3600000" },
    { propertyName: "Villa Ngaliema",         name: "M-04",  unitType: "house",     status: "occupied",  floor: "RDC", bedrooms: 3, bathrooms: 2, area: "150", monthlyRent: "950000",  securityDeposit: "1900000" },
  ];

  const insertedUnits = await Promise.all(
    UNITS.map(async (u) => {
      const propertyId = propByName[u.propertyName];
      const res = await db.insert(realEstateUnits).values({
        propertyId,
        name: u.name,
        unitType: u.unitType,
        status: u.status,
        floor: u.floor,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        area: u.area,
        monthlyRent: u.monthlyRent,
        securityDeposit: u.securityDeposit,
        currencyId,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
      return {
        unitKey: `${u.propertyName}|${u.name}`,
        id: Number((res as unknown as { insertId: number }).insertId),
        propertyId,
      };
    }),
  );
  const unitByKey = Object.fromEntries(insertedUnits.map((u) => [u.unitKey, u]));
  console.log(`  [demo-real-estate] ${insertedUnits.length} units inserted.`);

  // ── 3. Customers (tenants) + tenant_details ──────────────────────────
  // Standard password "demo1234" for all demo tenants — never use these
  // credentials in production.
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const TENANTS = [
    {
      firstName: "Marie", lastName: "Kabongo", email: "marie.kabongo@email.cd", phone: "+243 999 123 456",
      address: "15 Av. Tombalbaye, Kinshasa",
      details: {
        birthDate: "1988-04-12", sex: "F", nationality: "Congolaise", maritalStatus: "marié",
        originProvince: "Kasaï Central", contactedPerson: "Joseph Kabongo", contactedPersonPhoneNumber: "+243 998 111 222",
        professionalStatus: "Salariée", mainActivity: "Direction marketing", entityName: "Vodacom RDC",
        entityAddress: "Bd du 30 juin, Gombe", hiringDate: "2019-03-15", contractType: "CDI",
        monthlyPay: "2800000", otherMonthlyIncome: "0",
        oldAddress: "12 Av. Kasai, Limete", oldLessor: "Mr Mbuyi", movingReason: "Rapprochement travail",
        occupantNumber: 3, childNumber: 1,
      },
    },
    {
      firstName: "Paul", lastName: "Lumumba", email: "paul.l@gmail.com", phone: "+243 815 678 901",
      address: "42 Av. Bandundu, Kinshasa",
      details: {
        birthDate: "1982-11-30", sex: "M", nationality: "Congolaise", maritalStatus: "marié",
        originProvince: "Sankuru", contactedPerson: "Pauline Lumumba", contactedPersonPhoneNumber: "+243 815 999 888",
        professionalStatus: "Indépendant", mainActivity: "Import-export véhicules", entityName: "Lumumba Trading",
        entityAddress: "Av. Kasa-Vubu, Kinshasa", hiringDate: "2010-01-01", contractType: "Auto-entrepreneur",
        monthlyPay: "3500000", otherMonthlyIncome: "500000",
        oldAddress: "8 Av. Wagenia, Gombe", oldLessor: "Immo Plus", movingReason: "Famille plus grande",
        occupantNumber: 5, childNumber: 3,
      },
    },
    {
      firstName: "Christine", lastName: "Tshisekedi", email: "c.tshisekedi@email.com", phone: "+243 818 345 678",
      address: "3 Bd du 30 juin, Kinshasa",
      details: {
        birthDate: "1990-07-22", sex: "F", nationality: "Congolaise", maritalStatus: "célibataire",
        originProvince: "Kasaï Oriental", contactedPerson: "André Tshisekedi", contactedPersonPhoneNumber: "+243 818 555 444",
        professionalStatus: "Commerçante", mainActivity: "Boutique cosmétiques", entityName: "Galerie Christine",
        entityAddress: "3 Bd du 30 juin, Gombe", hiringDate: "2020-06-01", contractType: "Auto-entrepreneur",
        monthlyPay: "4200000", otherMonthlyIncome: "300000",
        oldAddress: "20 Av. Université, Lemba", oldLessor: "Mme Mukendi", movingReason: "Local commercial central",
        occupantNumber: 1, childNumber: 0,
      },
    },
    {
      firstName: "Jean", lastName: "Bemba", email: "jean.bemba@yahoo.fr", phone: "+243 812 456 789",
      address: "8 Bd Lumumba, Kinshasa",
      details: {
        birthDate: "1985-02-18", sex: "M", nationality: "Congolaise", maritalStatus: "marié",
        originProvince: "Équateur", contactedPerson: "Sarah Bemba", contactedPersonPhoneNumber: "+243 812 777 666",
        professionalStatus: "Salarié", mainActivity: "Comptable", entityName: "Rawbank",
        entityAddress: "3771 Av. de la Justice, Gombe", hiringDate: "2015-09-10", contractType: "CDI",
        monthlyPay: "2100000", otherMonthlyIncome: "0",
        oldAddress: "5 Av. Kabambare, Kintambo", oldLessor: "Mr Kasongo", movingReason: "Proximité écoles",
        occupantNumber: 4, childNumber: 2,
      },
    },
    {
      firstName: "Antoine", lastName: "Kalala", email: "antoine.k@email.com", phone: "+243 999 567 890",
      address: "5 Av. Lukoki, Kinshasa",
      details: {
        birthDate: "1978-08-05", sex: "M", nationality: "Congolaise", maritalStatus: "conjoint de fait",
        originProvince: "Haut-Katanga", contactedPerson: "Diane Kalala", contactedPersonPhoneNumber: "+243 999 333 222",
        professionalStatus: "Salarié", mainActivity: "Ingénieur télécoms", entityName: "Orange RDC",
        entityAddress: "Bd du 30 juin, Gombe", hiringDate: "2012-04-01", contractType: "CDI",
        monthlyPay: "3200000", otherMonthlyIncome: "200000",
        oldAddress: "10 Av. Mbinza, Mont-Ngafula", oldLessor: "Mme Lukusa", movingReason: "Quartier plus calme",
        occupantNumber: 4, childNumber: 2,
      },
    },
    {
      // Pro / entreprise — tenant_details rempli mais marqué entity
      firstName: "Sysconnect", lastName: "SARL", email: "contact@sysconnect.cd", phone: "+243 821 234 567",
      address: "25 Av. Wagenia, Kinshasa",
      details: {
        birthDate: "2018-01-15", sex: "M", nationality: "Congolaise", maritalStatus: "célibataire",
        originProvince: "Kinshasa", contactedPerson: "Directeur SI", contactedPersonPhoneNumber: "+243 821 999 000",
        professionalStatus: "Société", mainActivity: "Intégration informatique", entityName: "Sysconnect SARL",
        entityAddress: "RCCM CD/KIN/RCCM/18-B-1234", hiringDate: "2018-01-15", contractType: "Société",
        monthlyPay: "0", otherMonthlyIncome: "0",
        oldAddress: "N/A", oldLessor: "N/A", movingReason: "Première location",
        occupantNumber: 15, childNumber: 0,
      },
    },
  ];

  const insertedTenants: { id: number; key: string }[] = [];
  for (const t of TENANTS) {
    const res = await db.insert(customers).values({
      firstName: t.firstName,
      lastName: t.lastName,
      username: `${t.firstName}.${t.lastName}`.toLowerCase().replace(/\s+/g, ""),
      email: t.email,
      phone: t.phone,
      address: t.address,
      password: passwordHash,
      roleId: tenantRoleId,
      status: "true",
      isLogin: "false",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const customerId = Number((res as unknown as { insertId: number }).insertId);
    insertedTenants.push({ id: customerId, key: `${t.firstName} ${t.lastName}` });

    await db.insert(tenantDetails).values({
      customerId,
      ...t.details,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
  }
  const tenantByName = Object.fromEntries(insertedTenants.map((t) => [t.key, t.id]));
  console.log(`  [demo-real-estate] ${insertedTenants.length} tenants (customer + details) inserted.`);

  // ── 4. Leases ────────────────────────────────────────────────────────
  // Mix of statuses to populate the Baux panel views:
  //  - signed contracts (Marie, Christine)
  //  - active without contract (Paul, Jean) — to trigger the red banner
  //  - pending signature (Sysconnect)
  //  - to renew soon (Antoine)
  const today = isoToday();
  const LEASES: Array<{
    reference: string;
    propertyName: string;
    unitName: string;
    tenantKey: string;
    startMonthsAgo: number;
    endMonthsFromStart: number; // total months duration
    rentAmount: string;
    overdueDays?: number; // for cards that should look "en retard"
    contract?: "signed" | "pending" | "none";
  }> = [
    { reference: "BAIL-2024-018", propertyName: "Résidence Tombalbaye",  unitName: "A-203",  tenantKey: "Marie Kabongo",       startMonthsAgo: 26, endMonthsFromStart: 36, rentAmount: "850000",  contract: "signed" },
    { reference: "BAIL-2023-014", propertyName: "Villa Lemba Salongo",   unitName: "M-12",   tenantKey: "Paul Lumumba",        startMonthsAgo: 28, endMonthsFromStart: 36, rentAmount: "1200000", contract: "none", overdueDays: 12 },
    { reference: "BAIL-2022-009", propertyName: "Tour Wagenia",          unitName: "ET-04",  tenantKey: "Sysconnect SARL",     startMonthsAgo: 47, endMonthsFromStart: 48, rentAmount: "2400000", contract: "pending" },
    { reference: "BAIL-2025-007", propertyName: "Galerie Présidentielle", unitName: "RDC-01", tenantKey: "Christine Tshisekedi", startMonthsAgo: 12, endMonthsFromStart: 36, rentAmount: "1800000", contract: "signed" },
    { reference: "BAIL-2024-022", propertyName: "Résidence Limete Plaza", unitName: "B-301",  tenantKey: "Jean Bemba",          startMonthsAgo: 13, endMonthsFromStart: 36, rentAmount: "720000",  contract: "none" },
    { reference: "BAIL-2023-011", propertyName: "Villa Ngaliema",        unitName: "M-04",   tenantKey: "Antoine Kalala",      startMonthsAgo: 35, endMonthsFromStart: 36, rentAmount: "950000",  contract: "pending" },
  ];

  const insertedLeases: { id: number; reference: string; tenantId: number; unitId: number; rentAmount: string }[] = [];
  for (const lease of LEASES) {
    const unit = unitByKey[`${lease.propertyName}|${lease.unitName}`];
    const tenantId = tenantByName[lease.tenantKey];
    if (!unit || !tenantId) {
      console.warn(`  [demo-real-estate] skipped lease ${lease.reference}: missing unit or tenant.`);
      continue;
    }
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - lease.startMonthsAgo);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + lease.endMonthsFromStart);
    // nextInvoiceDate: 1st of next month, OR past-due if overdueDays set
    const nextInvoice = lease.overdueDays
      ? daysAgo(lease.overdueDays)
      : monthsFromNow(0);
    nextInvoice.setDate(5); // 5th of the relevant month

    const res = await db.insert(realEstateLeases).values({
      reference: lease.reference,
      propertyId: unit.propertyId,
      unitId: unit.id,
      tenantId,
      startDate: isoDate(startDate),
      endDate: isoDate(endDate),
      nextInvoiceDate: isoDate(nextInvoice),
      billingCycle: "monthly",
      rentAmount: lease.rentAmount,
      currencyId,
      securityDeposit: String(Number(lease.rentAmount) * 2),
      status: "active",
      terms: "Bail standard 36 mois. Indexation BCC annuelle.",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const leaseId = Number((res as unknown as { insertId: number }).insertId);
    insertedLeases.push({ id: leaseId, reference: lease.reference, tenantId, unitId: unit.id, rentAmount: lease.rentAmount });

    // Contract (if applicable)
    if (lease.contract === "signed") {
      await db.insert(realEstateContracts).values({
        leaseId,
        status: "signed",
        contractContent: `Contrat de bail ${lease.reference} — Locataire ${lease.tenantKey}.`,
        signedAt: sql`CURRENT_TIMESTAMP`,
        tenantName: lease.tenantKey,
        sentAt: sql`CURRENT_TIMESTAMP`,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    } else if (lease.contract === "pending") {
      await db.insert(realEstateContracts).values({
        leaseId,
        status: "sent",
        contractContent: `Contrat de bail ${lease.reference} en attente de signature.`,
        signerToken: `demo-${leaseId}-${Date.now()}`,
        tenantName: lease.tenantKey,
        sentAt: sql`CURRENT_TIMESTAMP`,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }
    // contract === "none" → no row, triggers the "Générer" red banner
  }
  console.log(`  [demo-real-estate] ${insertedLeases.length} leases inserted (+ contracts).`);

  // ── 5. Rent payments ────────────────────────────────────────────────
  // For each lease except the overdue/no-contract ones, insert 1-2
  // payments in past months so the recent payments table and KPIs show
  // some encaissement history.
  const PAYMENT_METHODS = ["bank", "cheque", "mobile_money", "cash"];
  let paymentCount = 0;
  for (const lease of insertedLeases) {
    const isOverdue = lease.reference === "BAIL-2023-014"; // Paul Lumumba
    const months = isOverdue ? [2, 3] : [0, 1, 2]; // current + last 2 vs last 2-3
    for (const monthOffset of months) {
      const payDate = monthsAgo(monthOffset);
      payDate.setDate(5);
      await db.insert(realEstateRentPayments).values({
        leaseId: lease.id,
        currencyId,
        paymentDate: isoDate(payDate),
        amount: lease.rentAmount,
        method: PAYMENT_METHODS[paymentCount % PAYMENT_METHODS.length],
        reference: `QUIT-2026-${String(140 + paymentCount).padStart(4, "0")}`,
        notes: "Paiement loyer mensuel.",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
      paymentCount++;
    }
  }
  console.log(`  [demo-real-estate] ${paymentCount} rent payments inserted.`);

  // ── 6. Maintenance requests ─────────────────────────────────────────
  const MAINTENANCE = [
    {
      propertyName: "Villa Bandalungwa Sud", unitName: "M-07",
      title: "Fuite d'eau plafond — chambre principale",
      description: "Locataire signale une fuite importante depuis hier soir. Eau s'accumule au plafond.",
      priority: "urgent", status: "in_progress", estimatedCost: "180000", daysAgo: 2,
    },
    {
      propertyName: "Villa Bandalungwa Sud", unitName: "M-07",
      title: "Panne électrique — coupures fréquentes",
      description: "Coupures électriques toutes les 30 min depuis 3 jours. Disjoncteur saute.",
      priority: "urgent", status: "open", estimatedCost: "85000", daysAgo: 1,
    },
    {
      propertyName: "Résidence Limete Plaza", unitName: "B-301",
      title: "Réfection peinture salon — humidité",
      description: "Traces d'humidité visibles sur le mur sud du salon.",
      priority: "medium", status: "in_progress", estimatedCost: "120000", daysAgo: 3,
    },
    {
      propertyName: "Tour Wagenia", unitName: "ET-04",
      title: "Changement serrure porte d'entrée",
      description: "Nouvelle occupation, demande de changement de serrure pour sécurité.",
      priority: "low", status: "open", estimatedCost: "45000", daysAgo: 5,
    },
    {
      propertyName: "Résidence Tombalbaye", unitName: "A-203",
      title: "Remplacement climatiseur salon",
      description: "Clim Samsung 18000 BTU installée. Locataire satisfaite.",
      priority: "medium", status: "done", estimatedCost: "380000", daysAgo: 8,
    },
  ];

  let maintenanceCount = 0;
  for (const m of MAINTENANCE) {
    const unit = unitByKey[`${m.propertyName}|${m.unitName}`];
    if (!unit) continue;
    await db.insert(realEstateMaintenanceRequests).values({
      propertyId: unit.propertyId,
      unitId: unit.id,
      title: m.title,
      priority: m.priority,
      status: m.status,
      scheduledDate: isoDate(daysAgo(m.daysAgo)),
      estimatedCost: m.estimatedCost,
      description: m.description,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    maintenanceCount++;
  }
  console.log(`  [demo-real-estate] ${maintenanceCount} maintenance requests inserted.`);

  console.log(`  [demo-real-estate] ✔ Demo data ready.`);
}
