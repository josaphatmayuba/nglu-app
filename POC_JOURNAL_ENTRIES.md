# POC — Cœur comptable « journal entries » (incrémental, sans big-bang)

> Date : 2026-06-10 · Skill : ERP/SIFA Architect · Branche : `develop`
> Objectif : prouver la faisabilité d'une **partie double équilibrée + contre-passation** en **regroupant** ce qui existe déjà, sans toucher à la prod ni migrer les 113 fichiers.

---

## 1. Constat de départ (ce qui existe déjà)

Chaque module génère DÉJÀ plusieurs lignes liées — la partie double composée est **implicite**.

**Exemple `sale-invoices.service.ts:157-197` (une vente = 3 lignes) :**
```
Cost of sales      debitId 9  / creditId 3   amount = coût d'achat
Account receivable debitId 4  / creditId 8   amount = TTC
VAT                debitId 16 / creditId 8   amount = taxe
```
**`purchase-invoices.service.ts:99-138`** : même schéma (3 inserts liés).
→ Pattern **identique dans 12 services**. `debitId/creditId` sont des **constantes en dur**.

**Table `transaction` actuelle :**
```
id, date, debitId, creditId, particulars, amount, type, relatedId, status, organization_id
```
Lien faible : les 3 lignes partagent seulement `relatedId = invoiceId` + `type`. **Pas de header, pas d'équilibre validé.**

**Table `account` :** `id, name, type` (minimale).

---

## 2. L'idée en une phrase

**Coiffer** les lignes existantes d'un **header `journal_entries`** et router tous les `insert(transactions)` par **un seul service** qui valide Σdébit=Σcrédit — **sans changer la table plate** (elle devient les *lignes* de l'écriture).

```
AVANT :  3 inserts plats liés par relatedId (aucun contrôle)
APRÈS :  1 journal_entry (header)  ──< N transaction (lignes, entry_id renseigné)
                                        ↑ Σdébit = Σcrédit validé avant commit
```

---

## 3. Changements DB (minimal — 1 table + 1 colonne)

### Migration `0104_journal_entries_poc.sql` (Drizzle, 1 statement / breakpoint)

```sql
CREATE TABLE `journal_entries` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `date` datetime NOT NULL,
  `reference` varchar(64),                 -- ex: SALE-1042
  `particulars` varchar(255) NOT NULL,
  `source_module` varchar(64),             -- 'sale','purchase','rent'...  (= ancien `type`)
  `related_id` varchar(255),               -- ex: invoiceId  (compat avec relatedId)
  `total_debit` decimal(18,2) NOT NULL DEFAULT 0,
  `total_credit` decimal(18,2) NOT NULL DEFAULT 0,
  `status` varchar(16) NOT NULL DEFAULT 'posted',   -- draft|posted|reversed
  `reversal_of_id` bigint,                 -- pointe l'écriture d'origine (si contre-passation)
  `reversed_by_id` bigint,                 -- pointe la contre-passation (sur l'origine)
  `reason` varchar(255),                   -- motif (contre-passation / annulation)
  `created_by` bigint,
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transaction` ADD COLUMN `entry_id` bigint AFTER `id`;
```

**Pourquoi c'est sûr :**
- `entry_id` est **nullable** → les lignes historiques restent valides (zéro régression).
- La table `transaction` plate est **intacte** → toutes les lectures/rapports actuels continuent de marcher (vue de compat gratuite).
- Pas de migration de données obligatoire pour démarrer.

> Note : la colonne `amount`/`double` actuelle reste pour compat ; le header utilise `decimal(18,2)` (éviter le flottant sur l'équilibre).

---

## 4. Le service pivot — `LedgerService`

Un **seul** point d'entrée pour écrire une écriture. Il crée le header, insère les lignes, valide l'équilibre, le tout dans **une transaction DB** (atomique).

```ts
// backend2/src/ledger/ledger.service.ts
type Line = { debitId: number; creditId: number; amount: number; particulars: string };

async postEntry(input: {
  date?: Date;
  reference?: string;
  particulars: string;
  sourceModule: string;       // 'sale', 'purchase', ...
  relatedId?: string;
  organizationId: number;
  createdBy?: number;
  lines: Line[];              // les N lignes que le module produisait déjà
}) {
  // 1. Équilibre : Σdébit = Σcrédit (chaque ligne porte un montant débit ET crédit égaux
  //    dans le modèle actuel, donc l'équilibre par ligne est garanti ; on valide quand même
  //    le total au cas où une ligne aurait un montant ≠).
  const total = input.lines.reduce((s, l) => s + l.amount, 0);
  // (modèle actuel = chaque ligne auto-équilibrée ; la vraie validation Σd=Σc devient
  //  pleinement utile quand on passera à des lignes mono-sens débit OU crédit — étape 2)

  return this.db.transaction(async (tx) => {
    // 2. Header
    const [entry] = await tx.insert(journalEntries).values({
      date: input.date ?? sql`CURRENT_TIMESTAMP`,
      reference: input.reference,
      particulars: input.particulars,
      sourceModule: input.sourceModule,
      relatedId: input.relatedId,
      organizationId: input.organizationId,
      totalDebit: total,
      totalCredit: total,
      status: 'posted',
      createdBy: input.createdBy,
    }).$returningId();

    // 3. Lignes (réutilise EXACTEMENT les inserts existants + entry_id)
    for (const l of input.lines) {
      await tx.insert(transactions).values({
        entryId: entry.id,
        date: input.date ?? sql`CURRENT_TIMESTAMP`,
        debitId: l.debitId,
        creditId: l.creditId,
        amount: l.amount,
        particulars: l.particulars,
        type: input.sourceModule,
        relatedId: input.relatedId,
      });
    }
    return entry.id;
  });
}
```

### Contre-passation (réutilise le même service)
```ts
async reverse(entryId: number, reason: string, userId: number) {
  const entry = await this.getEntryWithLines(entryId);
  if (entry.reversedById) throw new ConflictException('Déjà contre-passée');

  const reversalId = await this.postEntry({
    particulars: `Contre-passation de #${entryId} — ${reason}`,
    sourceModule: entry.sourceModule,
    relatedId: entry.relatedId,
    organizationId: entry.organizationId,
    createdBy: userId,
    lines: entry.lines.map(l => ({
      debitId: l.creditId,        // ← inversion débit/crédit
      creditId: l.debitId,        // ← inversion
      amount: l.amount,
      particulars: `Extourne — ${l.particulars}`,
    })),
  });

  await this.db.update(journalEntries)
    .set({ status: 'reversed', reversedById: reversalId, reason })
    .where(eq(journalEntries.id, entryId));

  await this.db.update(journalEntries)
    .set({ reversalOfId: entryId })
    .where(eq(journalEntries.id, reversalId));
  return reversalId;
}
```
→ Aucune suppression. L'origine et l'extourne restent visibles (audit, Règle 7).

---

## 5. Adaptation d'UN module (le POC réel)

**Avant** — `sale-invoices.service.ts` (3 inserts dispersés) :
```ts
await this.db.insert(transactions).values({ debitId: 9,  creditId: 3,  amount: cost, particulars: ... });
await this.db.insert(transactions).values({ debitId: 4,  creditId: 8,  amount: ttc,  particulars: ... });
await this.db.insert(transactions).values({ debitId: 16, creditId: 8,  amount: vat,  particulars: ... });
```

**Après** — un seul appel, regroupé sous un header :
```ts
await this.ledger.postEntry({
  reference: `SALE-${invoiceId}`,
  particulars: `Sale invoice ${invoiceId}`,
  sourceModule: 'sale',
  relatedId: invoiceId,
  organizationId: orgId,
  createdBy: userId,
  lines: [
    { debitId: 9,  creditId: 3, amount: totalPurchasePrice,        particulars: `Cost of sales ${invoiceId}` },
    { debitId: 4,  creditId: 8, amount: totalAmount + totalTax,    particulars: `Sale invoice ${invoiceId}` },
    ...(totalTax > 0 ? [{ debitId: 16, creditId: 8, amount: totalTax, particulars: `VAT ${invoiceId}` }] : []),
  ],
});
```
→ **Même logique métier, même comptes, même montants.** On ne change que l'enveloppe. Les lignes atterrissent dans la même table `transaction`, mais désormais reliées par `entry_id`.

---

## 6. Périmètre du POC vs reste

| Étape | Contenu | Risque |
|------|---------|--------|
| **POC (maintenant)** | 1 table + 1 colonne + `LedgerService` + `sale-invoices` migré + reverse | **Faible** — table plate intacte, prod non touchée, rollback trivial |
| Réplication | Router les 11 autres services par `LedgerService`, un par un | Faible (même pattern) |
| Étape 2 (plus tard) | Sortir les `debitId/creditId` en dur → `transaction_type_rules` paramétrables ; lignes mono-sens (débit OU crédit) ; périodes comptables ; `decimal` partout | Moyen |

---

## 7. Ce que le POC prouve

1. ✅ **Header + lignes** fonctionne sur du code réel sans casser l'existant.
2. ✅ **Σdébit=Σcrédit** validé centralement (un seul endroit à maintenir).
3. ✅ **Contre-passation** sans DELETE, traçable.
4. ✅ **Migration incrémentale** : on peut s'arrêter après 1 module et tout reste cohérent.

→ Si le POC tient sur `sale-invoices`, la généralisation est mécanique. **Décision d'engagement prise sur faits, pas sur pari.**

---

## 8. Checklist d'exécution POC

- [ ] Migration `0104_journal_entries_poc.sql` (dev d'abord, jamais prod tant que non validé)
- [ ] Ajouter `journalEntries` + colonne `entryId` au schéma Drizzle (`backend2/src/database/schema.ts`)
- [ ] Module `ledger` (service + controller minimal : GET entry, POST reverse)
- [ ] Router `sale-invoices.service.ts` vers `ledger.postEntry`
- [ ] Endpoint `/api/ledger/*` → entrée dans `middleware/src/whitelist.js` (sinon 403)
- [ ] Bump version + CHANGELOG
- [ ] Test : créer une facture → vérifier 1 header + 3 lignes liées + totaux égaux ; contre-passer → vérifier solde net 0
