# Plan de migration — ancienne base PostgreSQL/Prisma → nglu-app (Drizzle/MySQL)

Source : `Téléchargements/db-backup-postgres (1) (3).sql` (pg_dump 16, UTF-8, format INSERT).
Cible : `nglu_dev_mysql` (dev d'abord), schéma `backend2/src/database/schema.ts`.

## Règles transverses
- `status=false` (ancien) → **NON migré** (ni ligne, ni écriture comptable associée).
- Montants : ancien `double precision` → cible `decimal` (jamais de float pour l'argent).
- `creator_id` (uuid texte) → résolu via **table de correspondance** vers `users.id` (bigint). Non rapproché → user technique « Migration ».
- Devise : ancien `devise.id` (1=CDF, 2=USD) → mapper vers `currency.id` cible (à confirmer sur dev).
- Conserver une table de correspondance `legacy_id → new_id` par table migrée (pour recâbler les FK).

## Mapping des devises
| Ancien `devise` | code | → cible `currency` |
|---|---|---|
| 1 Franc-Congolais | CDF | currency où currencyCode='CDF' |
| 2 Dollars-Américain | USD | currency où currencyCode='USD' |

---

## DOMAINE 1 — COMPTABILITÉ (historique migré)

### account (7 → corriger les types)
Ancien `account.type` est buggé (Revenue/Depense typés `Owner's Equity`). Corriger au passage :
| id | name | ancien type | → type cible correct |
|---|---|---|---|
| 1 | Actif | Asset | Asset |
| 2 | Passif | Liability | Liability |
| 3 | Capital | Owner's Equity | Equity |
| 4 | Retrait | Owner's Equity | Equity |
| 5 | Revenue | Owner's Equity | **Revenue** |
| 6 | Depense | Owner's Equity | **Expense** |
| 7 | Locatif | RealEstate | **Revenue** (revenu locatif) |

→ table cible `account` (id, name, type). **⚠ confirmer le mapping vers le plan comptable existant sur dev** (ne pas créer de doublons de comptes racine).

### subAccount (85, exclure id=32 status=false) → `subAccount`
Direct : id, name, accountId, status. C'est le plan comptable détaillé.

### transactionType (79, exclure status=false) → `transaction_types`
| ancien | → cible |
|---|---|
| name | name |
| debit_id (subAccount) | debit_account_id |
| credit_id (subAccount) | credit_account_id |
| details/activity | description |
| status=false | exclu |

### transaction (1178, exclure ~79 status=false) → `journal_entries` + `journal_entry_lines`
Chaque transaction active = 1 `journal_entries` + 2 `journal_entry_lines` (déjà équilibrée) :
- journal_entries : date, particulars, currencyId (depuis device_id), sourceModule='legacy_migration', relatedId=ancien transaction.id, status='posted', totalDebit=totalCredit=amount.
- ligne 1 : accountId=debit_id, side='debit', amount.
- ligne 2 : accountId=credit_id, side='credit', amount.
- contract_id / rent_payment_id : recâbler vers les nouveaux ids immobilier (voir domaine 2).

**Note** : il y a AUSSI une table plate `transaction` cible (dual-write strangler). Décider : on alimente le ledger moderne uniquement (recommandé) ou les deux.

---

## DOMAINE 2 — IMMOBILIER

⚠ Décalage de modèle : l'ancien `realestate → contract → rent_payment` (sans unité) ;
le cible `property → unit → lease → rent_payment`. Il faut **créer une unité par défaut** par bien.

### realestate (19) → `real_estate_properties`
| ancien | → cible |
|---|---|
| address/city/country | address/city/country |
| realestate_type_id | property_type (mapper via realestate_type.name) |
| purchase_price | market_value |
| code | code |
| note | description |
| status=false | isActive=0 ou exclu |

Puis **créer 1 `real_estate_units` par bien** (le modèle cible exige une unité pour le bail).

### customer (19) → `customer` + `tenant_details`
- `customer` : firstName, lastName, phone, email, address, status. password requis → générer un placeholder.
- `tenant_details` : tous les champs riches (birth_date, sex, nationality, monthly_pay, occupant_number, etc.). ⚠ beaucoup de NOT NULL côté cible alors que l'ancien est nullable → fournir des valeurs par défaut.

### contract (24) → `real_estate_leases`
| ancien | → cible |
|---|---|
| customer_id | tenant_id (recâblé) |
| realestate_id | property_id (recâblé) + unit_id (unité par défaut) |
| rent_amount | rent_amount |
| start_date/end_date | start_date/end_date |
| devise_id | currency_id |
| contract_type_id | billing_cycle (via contract_type.day) |
| lessor_* / sign_city | terms (concat) ou champs dédiés |

### rent_payment (374) → `real_estate_rent_payments`
⚠ **Ne migrer que les payés** : ancien `payment_status='completed'` ET montant payé>0.
Les échéances non payées (`uncompleted`) = planification, pas un paiement réel → à exclure (ou régénérer côté app).
| ancien | → cible |
|---|---|
| contract_id | lease_id (recâblé) |
| payment / due_payment | amount |
| payment_date | payment_date |
| devise_id | currency_id |

---

## DOMAINE 3 — VENTES / STOCK / ACHATS

| Ancien | → Cible | Note |
|---|---|---|
| product (25) | `product` | sale_price→productSalePrice, purchase_price→productPurchasePrice, quantity→productQuantity, category→productSubCategory (mapping) |
| product_category (5) | `productCategory` | direct |
| supplier (4) | `supplier` | direct |
| saleInvoice (11) | `saleInvoice` | ⚠ id cible = varchar ; user_id (uuid)→userId (recâblé) |
| saleInvoiceProduct (11) | `saleInvoiceProduct` | invoiceId varchar |
| purchaseInvoice (1) | `purchaseInvoice` | |
| purchaseInvoiceProduct (1) | `purchaseInvoiceProduct` | |
| Devis (38) | `quote` | à confirmer le mapping de champs |
| invoiceProductStock (10) | `stock_movements` ? | à confirmer |
| return* (0) | — | vides, rien à migrer |

---

## DOMAINE 4 — UTILISATEURS / RÔLES

- **NE PAS fusionner** les 32 users. Construire `legacy_user_uuid → users.id` :
  - rapprochement par email si possible ;
  - sinon créer des users désactivés ou pointer vers user « Migration ».
- role (22) / permission (117) / rolePermission (336) : l'app actuelle a déjà son RBAC → **ne pas écraser**. Au mieux, mapping informatif.

---

## Ordre d'exécution (dépendances FK)
1. Devises (mapping, pas d'insert si déjà présentes)
2. Users (table de correspondance)
3. Compta : account → subAccount → transaction_types → journal_entries/lines
4. Immobilier : properties → units → customers/tenant_details → leases → rent_payments
5. Commercial : categories → products → suppliers → invoices → invoice products
6. Vérifications (totaux débits=crédits, comptages, soldes)

## DÉCISIONS PRISES (13 juin 2026)
- Plan comptable : **vérifier dev d'abord**, puis mapper/fusionner (pas de doublons de comptes racine).
- Écritures : **ledger moderne UNIQUEMENT** (`journal_entries` + `journal_entry_lines`). Pas de dual-write table plate `transaction`.
- Loyers : **TOUT migrer** (paiements payés + échéances `uncompleted`). ⚠ veiller à ne pas créer de doublon avec la planification auto de l'app (désactiver la regénération ou marquer migrés).
- Ordre d'implémentation : **Compta en premier**, puis immobilier, puis commercial.

## Points encore à valider sur dev (avant insert)
- [ ] Mapping devises : ids réels de `currency` sur dev
- [ ] Plan comptable existant sur dev : comptes racine + subAccounts déjà présents ?
- [ ] Module Devis/stock : cibles `quote`/`stock_movements` (phase commercial, plus tard)
