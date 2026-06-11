# Plan d'exécution — Cœur comptable moderne (cible directe)

> Date : 2026-06-10 · Skill : ERP/SIFA Architect · Branche : `develop`
> **Décision** : aucune donnée comptable en prod → on construit **directement le modèle moderne pur** (pas de pont transitoire). On remplace proprement la table plate.

---

## 1. Pourquoi la cible directe (pas le POC pont)

- ❌ Pas de données live à préserver → le strangler/vue de compat n'a **aucun intérêt**.
- ✅ Coût « réécriture des services » payé **une seule fois**, dès maintenant.
- ✅ Zéro dette à reprendre, produit **vendable/auditable** d'emblée.
- ✅ Fenêtre idéale : c'est **maintenant ou jamais** (chaque jour de prod rend la migration plus chère).

---

## 2. Modèle de données cible

### Tables (les 4 piliers du standard moderne)

```sql
-- HEADER : 1 écriture = 1 événement économique
journal_entries(
  id, organization_id,
  date, reference, particulars,
  source_module,            -- 'sale','purchase','rent','payroll','livestock'...
  related_id,               -- ex: invoiceId / leaseId (lien métier)
  status,                   -- draft | posted | reversed
  reversal_of_id, reversed_by_id, reason,
  currency_id, exchange_rate,
  period_id,                -- → accounting_periods
  total_debit DECIMAL(18,2), total_credit DECIMAL(18,2),
  created_by, created_at, updated_at
)

-- LIGNES : 1 compte + 1 sens + dimensions
journal_entry_lines(
  id, entry_id,
  account_id,
  side ENUM('DEBIT','CREDIT'),
  amount DECIMAL(18,2),
  -- dimensions analytiques (traçabilité par axe)
  organization_id, site_id, department_id, project_id, activity_id,
  description
)

-- RÈGLES : génération métier → écriture (comptes paramétrables, plus de "debitId: 9" en dur)
transaction_type_rules(
  id, organization_id,
  type,                     -- 'sale','purchase'...
  role,                     -- 'receivable','revenue','vat_output','cost_of_sales'...
  account_id, side,
  formula                   -- optionnel: base de calcul du montant
)

-- PÉRIODES : clôture / verrouillage d'exercice
accounting_periods(
  id, organization_id, name, start_date, end_date,
  status                    -- open | closed
)
```

### Décisions de modèle
1. **1 compte + 1 sens par ligne** (pas debitId+creditId). → traçabilité par `entry_id`, analytique native.
2. **`DECIMAL(18,2)`** partout (jamais `double`).
3. **Dimensions** : `department` existe déjà ; créer `sites`, `projects`, `activities` (ou colonnes nullable au départ, FK plus tard).
4. **Comptes paramétrables** via `transaction_type_rules` (cœur SaaS multi-org).
5. **Plan de comptes enrichi** : `account` actuel = `id, name, type` → ajouter `code`, `normal_side` (DEBIT/CREDIT), `parent_id` (hiérarchie), `is_active`.

### Sort de la table `transaction` plate
- Pas de données → **on ne la migre pas**. Deux options :
  - (a) la **déprécier** (garder le code legacy le temps de recâbler), puis drop quand plus aucun service ne l'utilise.
  - (b) la remplacer directement.
- Recommandé : **(a)** — garder `transaction` jusqu'à ce que les ~8 services écrivains + lecteurs soient recâblés, puis migration de suppression.

---

## 3. Surface de changement (l'audit l'a mesurée)

**Services qui ÉCRIVENT des écritures** (à router vers `LedgerService`) :
`sale-invoices`, `purchase-invoices`, `property-management`, `farmos`, `hr`, `customers`, `suppliers`, `product-vats`.

**Services qui LISENT la table** (rapports/soldes — à recâbler vers `journal_entry_lines`) :
`accounts`, `dashboard`, `transactions`, `transaction-types`, `customers`, `suppliers`, `payment-methods`, `product-vats`.

→ ~8 écrivains + ~8 lecteurs. Pattern d'écriture **identique partout** (N inserts `debitId/creditId`) → transposition mécanique.

---

## 4. Service pivot `LedgerService`

```ts
// backend2/src/ledger/ledger.service.ts
type Line = {
  accountId: number; side: 'DEBIT'|'CREDIT'; amount: number;
  description?: string;
  siteId?: number; departmentId?: number; projectId?: number; activityId?: number;
};

async post(input: {
  date?: Date; reference?: string; particulars: string;
  sourceModule: string; relatedId?: string;
  organizationId: number; currencyId?: number; createdBy?: number;
  lines: Line[];
}) {
  // équilibre exact (centimes entiers pour éviter le flottant)
  const cents = (n: number) => Math.round(n * 100);
  const debit  = input.lines.filter(l => l.side==='DEBIT').reduce((s,l)=>s+cents(l.amount),0);
  const credit = input.lines.filter(l => l.side==='CREDIT').reduce((s,l)=>s+cents(l.amount),0);
  if (debit !== credit)
    throw new BadRequestException(`Écriture déséquilibrée: débit ${debit/100} ≠ crédit ${credit/100}`);
  if (input.lines.length < 2)
    throw new BadRequestException('Une écriture exige au moins 2 lignes');

  return this.db.transaction(async (tx) => {
    const period = await this.resolveOpenPeriod(tx, input.organizationId, input.date);
    const [entry] = await tx.insert(journalEntries).values({
      organizationId: input.organizationId,
      date: input.date ?? sql`CURRENT_TIMESTAMP`,
      reference: input.reference, particulars: input.particulars,
      sourceModule: input.sourceModule, relatedId: input.relatedId,
      status: 'posted', currencyId: input.currencyId, periodId: period?.id,
      totalDebit: debit/100, totalCredit: credit/100, createdBy: input.createdBy,
    }).$returningId();

    await tx.insert(journalEntryLines).values(
      input.lines.map(l => ({
        entryId: entry.id, accountId: l.accountId, side: l.side, amount: l.amount,
        organizationId: input.organizationId,
        siteId: l.siteId, departmentId: l.departmentId,
        projectId: l.projectId, activityId: l.activityId,
        description: l.description,
      }))
    );
    return entry.id;
  });
}

// contre-passation : inverse le sens de chaque ligne, lie l'origine, aucun DELETE
async reverse(entryId: number, reason: string, userId: number) { /* cf. POC, adapté side */ }

// génération par règles : un type métier → lignes depuis transaction_type_rules
async postByRules(type: string, amounts: Record<string, number>, ctx) { /* ... */ }
```

---

## 5. Exemple de bout en bout (vente)

`sale-invoices` ne code plus de comptes — il appelle `postByRules` ou `post` :
```ts
await this.ledger.post({
  reference: `SALE-${invoiceId}`, particulars: `Sale invoice ${invoiceId}`,
  sourceModule: 'sale', relatedId: invoiceId, organizationId: orgId, createdBy: userId,
  lines: [
    { accountId: 4,  side: 'DEBIT',  amount: ttc,  description: 'Account receivable' },
    { accountId: 8,  side: 'CREDIT', amount: net,  description: 'Revenue' },
    { accountId: 16, side: 'CREDIT', amount: vat,  description: 'VAT output' },
    { accountId: 9,  side: 'DEBIT',  amount: cost, description: 'Cost of sales' },
    { accountId: 3,  side: 'CREDIT', amount: cost, description: 'Inventory' },
  ],
});
// Σdébit = ttc + cost = Σcrédit = net + vat + cost  ✅
```

---

## 5 bis. Robustesse façon « bancaire » — idempotence & réconciliation

Les banques (core banking : Temenos, Finacle, Mambu) utilisent la **même fondation** que ce plan (journal + lignes + équilibre + immuabilité). On emprunte 3 garde-fous éprouvés — l'idempotence dès maintenant, la réconciliation pour le P3 mobile money/banque API.

### A. Idempotence — éviter les doubles écritures
Si un service rejoue une opération (retry réseau, double clic, message dupliqué), l'écriture ne doit être créée **qu'une fois**.

```sql
ALTER TABLE `journal_entries`
  ADD COLUMN `idempotency_key` varchar(128),   -- ex: 'sale:1042', 'payment:7781'
  ADD CONSTRAINT `uq_idem` UNIQUE (`organization_id`, `idempotency_key`);
```
```ts
// LedgerService.post()
if (input.idempotencyKey) {
  const existing = await tx.select().from(journalEntries)
    .where(and(eq(journalEntries.organizationId, input.organizationId),
               eq(journalEntries.idempotencyKey, input.idempotencyKey)));
  if (existing.length) return existing[0].id;   // déjà comptabilisé → on renvoie l'existant
}
```
→ Clé construite côté métier : `` `sale:${invoiceId}` ``, `` `rent:${leaseId}:${period}` ``. **Une facture = au plus une écriture**, même en cas de rejeu.

### B. Immuabilité stricte (déjà prévue, renforcée)
- Statut `posted` → ligne et header **jamais modifiés** (UPDATE interdit hors `status`/champs de reversal).
- Toute correction = **contre-passation** (écriture inverse liée), jamais d'édition.
- Optionnel (P3) : append-only / event log si exigence d'audit régulateur.

### C. Réconciliation avec un relevé externe (P3 — mobile money / banque API)
Quand l'argent transite par un **système externe** (M-Pesa, Airtel Money, banque), on ne fait pas que comptabiliser : on **rapproche** l'écriture interne avec le mouvement réel constaté sur le relevé.

```sql
bank_statements(id, org_id, source, external_ref, date, amount, raw_json)
reconciliations(id, org_id, journal_entry_id, bank_statement_id, status)  -- matched|unmatched|manual
```
→ Concepts empruntés aux banques **utiles seulement si tu touches au mobile money/banque API** (P3) :
- **available vs booked** : solde disponible (moins les holds/paiements en attente) ≠ solde comptable.
- **hold/réservation** : montant engagé non encore réglé (cousin de l'engagement budgétaire).
- **nostro/vostro / settlement interbancaire** : **hors périmètre** — c'est le métier d'une banque, pas d'un ERP mono-organisation.

### Tableau — ce qu'on emprunte (et ce qu'on laisse)
| Concept bancaire | Pour ERP/SIFA | Quand |
|---|---|---|
| Idempotence (clé unique) | ✅ adopter | **Phase 0** |
| Immuabilité + contre-passation | ✅ adopter | Phase 0/1 |
| Réconciliation relevé externe | ✅ si paiements externes | P3 |
| available/booked + holds | 🟡 si mobile money | P3 |
| Précision décimale étendue (4–6) | 🟡 selon taux de change | P2 |
| Settlement interbancaire (nostro/vostro, RTGS/SWIFT) | ❌ hors périmètre | — |

---

## 6. Séquence d'implémentation

| Phase | Contenu | Livrable |
|------|---------|----------|
| **0** | Schéma Drizzle + migrations `journal_entries` (avec `idempotency_key` unique), `journal_entry_lines`, `transaction_type_rules`, `accounting_periods` + enrichir `account` (code, normal_side, parent_id) | migrations 010x (dev) |
| **1** | `LedgerService` + module `ledger` + endpoints (`POST /ledger`, `GET /ledger/:id`, `POST /ledger/:id/reverse`, grand-livre) + whitelist middleware | API ledger |
| **2** | Router les 8 services écrivains vers `LedgerService` (un par un, supprimer les `debitId/creditId` en dur) | services migrés |
| **3** | Seeder `transaction_type_rules` par type métier (sale/purchase/rent/payroll...) | config comptes |
| **4** | Recâbler les 8 lecteurs (rapports/soldes/dashboard) vers `journal_entry_lines` (grand livre, balance) | rapports modernes |
| **5** | Déprécier puis supprimer la table `transaction` plate quand plus aucun usage | migration drop |
| **6** | Périodes comptables + clôture ; comptabilité analytique par dimension | clôture + analytique |

---

## 7. Garde-fous (règles projet)

- Migrations Drizzle : **1 statement / `--> statement-breakpoint`** (sinon crash-loop au boot).
- Tester sur **`nglu_dev_mysql`** d'abord ; jamais prod tant que non validé.
- Chaque nouvelle route `/api/ledger/*` → entrée dans `middleware/src/whitelist.js` (sinon 403).
- Multi-org : `organization_id` sur header ET lignes (Règle 6).
- Audit : `created_by` + statut immuable + contre-passation tracée (Règle 7).
- Bump version + CHANGELOG à chaque phase.

---

## 8. Décisions restant à confirmer

1. Dimensions dès la phase 0 (colonnes nullable) ou plus tard ? → recommandé **colonnes dès maintenant**, FK plus tard.
2. `sites` / `projects` / `activities` : nouvelles tables ou réutiliser l'existant (`department` existe déjà, projets HR existent) ?
3. Plan de comptes : on enrichit `account` ou on crée un vrai `chart_of_accounts` normalisé (OHADA/IFRS) ?
4. On démarre par quel module pilote ? → recommandé **`sale-invoices`** (le mieux compris).
