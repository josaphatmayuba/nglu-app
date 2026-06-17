// Migration Cockpit — description statique des domaines de la migration legacy
// PostgreSQL/Prisma -> Drizzle/MySQL.
//
// Chaque domaine référence :
//  - les tables SOURCE (export CSV legacy, telles que dans manifest.json) ;
//  - les tables de CORRESPONDANCE (legacy_*_map) qui matérialisent l'avancement
//    idempotent de la migration (cf. drizzle/0135_legacy_compta.sql) ;
//  - le script Python qui exécute le RUN (approche hybride : l'app lit/valide,
//    Python écrit).
//
// Lecture seule : ce module ne déclenche aucune écriture. Le RUN reste manuel.

export interface MigrationDomain {
  /** Identifiant URL-safe du domaine. */
  key: string;
  /** Libellé affiché. */
  label: string;
  /** Statut connu de la migration : compta est faite + vérifiée. */
  status: "done" | "pending";
  /** Script Python qui exécute le RUN (chemin relatif au repo). */
  script: string;
  /** Tables source (clés du manifest.json de l'export). */
  sourceTables: string[];
  /**
   * Tables de correspondance legacy_*_map qui tracent l'avancement.
   * Vide tant que le domaine n'a pas encore de table de map.
   */
  mapTables: string[];
}

export const MIGRATION_DOMAINS: MigrationDomain[] = [
  {
    key: "compta",
    label: "Comptabilité",
    status: "done",
    script: "scripts/migration/gen_compta_sql.py",
    sourceTables: ["account", "subAccount", "transaction", "transactionType", "devise"],
    mapTables: ["legacy_account_map", "legacy_subaccount_map"],
  },
  {
    key: "immobilier",
    label: "Immobilier / Locatif",
    status: "pending",
    script: "scripts/migration/gen_immo_sql.py",
    sourceTables: ["realestate", "realestate_type", "rent_payment", "contract", "contract_type", "customer"],
    mapTables: [],
  },
  {
    key: "commercial",
    label: "Commercial / Ventes",
    status: "pending",
    script: "scripts/migration/gen_comm_sql.py",
    sourceTables: [
      "product",
      "product_category",
      "saleInvoice",
      "saleInvoiceProduct",
      "purchaseInvoice",
      "purchaseInvoiceProduct",
      "supplier",
      "Devis",
      "invoiceProductStock",
    ],
    mapTables: [],
  },
  {
    key: "users",
    label: "Utilisateurs / RBAC",
    status: "pending",
    script: "scripts/migration/gen_users_devis_sql.py",
    sourceTables: ["user", "role", "permission", "rolePermission", "session"],
    mapTables: [],
  },
];

export function findDomain(key: string): MigrationDomain | undefined {
  return MIGRATION_DOMAINS.find((d) => d.key === key);
}
