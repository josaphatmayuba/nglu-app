import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { permissions } from "../schema";

const ENDPOINTS = [
  // purchase
  { name: "paymentPurchaseInvoice", type: "purchase" },
  { name: "purchaseInvoice", type: "purchase" },
  { name: "returnPurchaseInvoice", type: "purchase" },
  { name: "supplier", type: "purchase" },
  { name: "purchaseReorderInvoice", type: "purchase" },

  // sales
  { name: "paymentSaleInvoice", type: "sales" },
  { name: "returnSaleInvoice", type: "sales" },
  { name: "saleInvoice", type: "sales" },
  { name: "quote", type: "sales" },
  { name: "paymentMethod", type: "sales" },
  { name: "manualPayment", type: "sales" },
  { name: "termsAndCondition", type: "sales" },
  { name: "customer", type: "sales" },

  // user
  { name: "rolePermission", type: "user" },
  { name: "permission", type: "user" },
  { name: "user", type: "user" },
  { name: "role", type: "user" },
  { name: "designation", type: "user" },
  { name: "shift", type: "user" },
  { name: "award", type: "user" },
  { name: "awardHistory", type: "user" },
  { name: "department", type: "user" },
  { name: "designationHistory", type: "user" },
  { name: "education", type: "user" },
  { name: "salaryHistory", type: "user" },
  { name: "employmentStatus", type: "user" },
  { name: "announcement", type: "user" },

  // inventory
  { name: "product", type: "inventory" },
  { name: "productCategory", type: "inventory" },
  { name: "productSubCategory", type: "inventory" },
  { name: "productBrand", type: "inventory" },
  { name: "productAttribute", type: "inventory" },
  { name: "productAttributeValue", type: "inventory" },
  { name: "productProductAttributeValue", type: "inventory" },
  { name: "manufacturer", type: "inventory" },
  { name: "attribute", type: "inventory" },
  { name: "color", type: "inventory" },
  { name: "meta", type: "inventory" },
  { name: "uom", type: "inventory" },
  { name: "wightUnit", type: "inventory" },
  { name: "dimensionUnit", type: "inventory" },
  { name: "warehouse", type: "inventory" },
  { name: "transfer", type: "inventory" },
  { name: "reorderQuantity", type: "inventory" },
  { name: "pageSize", type: "inventory" },

  // account
  { name: "transaction", type: "account" },
  { name: "transactionType", type: "account" },
  { name: "propertyManagement", type: "account" },
  { name: "contractTemplate", type: "account" },
  { name: "account", type: "account" },
  { name: "adjust", type: "account" },

  // communication
  { name: "email", type: "email" },
  { name: "emailConfig", type: "email" },

  // settings
  { name: "setting", type: "settings" },
  { name: "discount", type: "settings" },
  { name: "currency", type: "settings" },
  { name: "vat", type: "settings" },

  // reporting
  { name: "productReports", type: "reporting" },

  // dashboard
  { name: "dashboard", type: "dashboard" },
];

const PERMISSION_TYPES = ["create", "readAll", "readSingle", "update", "delete"];

export async function seedPermissions() {
  const existing = await db.select({ id: permissions.id }).from(permissions).limit(1);
  if (existing.length) {
    console.log("  [permissions] already seeded, skipping.");
    return;
  }

  const rows = ENDPOINTS.flatMap((endpoint) =>
    PERMISSION_TYPES.map((pType) => ({
      name: `${pType}-${endpoint.name}`,
      type: endpoint.type,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );

  // Insert in chunks of 50 to avoid query size limits
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(permissions).values(rows.slice(i, i + CHUNK));
  }
  console.log(`  [permissions] ✔ ${rows.length} records inserted (${ENDPOINTS.length} endpoints × 5 types).`);
}
