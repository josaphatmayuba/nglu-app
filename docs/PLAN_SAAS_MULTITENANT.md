# Plan technique — SaaS multi-tenant (inscription client self-service)

> Statut : **conception** (juin 2026). Aucune ligne de prod écrite. À exécuter **par phases, dev d'abord puis PR develop→master**. Modèle de travail = **fort** (auth + isolation données).

## 1. Modèle cible (rappel)

Plateforme façon Google Workspace : **josaphat = propriétaire de la plateforme**. Des **clients externes s'inscrivent eux-mêmes** (self-service), chacun crée **son organisation** (ou s'inscrit en solo = org à 1 user), obtient un **espace isolé** avec accès à toutes les apps (FarmOS, Comptabilité, Domus, BâtiPro, RH).

- **Même URL pour tous** (`/farmos/`, `/comptabilite/`…). La séparation est **au backend** par `organization_id` — comme Gmail (même URL, données filtrées par le token). PAS d'instance/URL par client.
- Statut d'inscription par défaut : `trial`.
- Le **super-owner** (josaphat) a un rôle au-dessus des tenants : support / monitoring / suspendre. Les users clients restent **enfermés dans leur org**.

## 2. Fondation déjà en place (vérifié dans le code, 22 juin)

| Élément | État | Référence |
|---|---|---|
| Table `organizations` (id, name, slug **unique**, status='active', timestamps) | ✅ existe | `schema.ts:56` |
| `users.organizationId` (default 1, notNull) | ✅ existe | `schema.ts:27` |
| JWT porte `organizationId` | ✅ (`organizationId ?? 1`) | `auth.service.ts:72,80` |
| Guard **dérive l'org depuis la DB** à chaque requête + détecte token périmé | ✅ `assertCurrentAuthContext` lit `users.organizationId`, rejette si mismatch (`AUTH_CONTEXT_STALE`) | `jwt-auth.guard.ts:62-92` |
| Validation JTI session (anti-token forgé) | ✅ | `jwt-auth.guard.ts:40-55` |
| Décorateur `@CurrentOrg()` (`?? 1`) | ✅ | `current-org.decorator.ts` |
| ~20 services filtrent déjà par `organizationId` | ✅ | `*.service.ts` |

**Le socle d'auth est solide.** Le guard ne fait JAMAIS confiance au `organizationId` du token : il le recalcule en DB. Donc un token falsifié ne change pas d'org.

## 3. Ce qui manque (les 3 trous)

1. **Aucune 2e org réelle** — tout vit sur org #1 (`.default(1)` + `?? 1` partout). Le `?? 1` est un **fallback muet dangereux** une fois multi-tenant.
2. **Tables compta sans `organizationId`** → fuite inter-org : `account`, `subAccount` (hérite via `accountId`), `transaction_types`. Confirmé `schema.ts:65,74,82`. C'est le **gros morceau**.
3. **Pas d'inscription self-service** : `auth.controller.ts` n'a que `login`/`refresh`/`mfa`/`reset` — **aucun `register`/`signup`**. Pas de provisioning de tenant.
4. **Pas de rôle super-owner** ni de bascule d'org pour le support.

## 4. Ordre d'exécution (IMPORTANT)

> **L'isolation backend (P1+P2) DOIT précéder l'inscription (P3).** Sinon `signup` crée des orgs qui partagent les données compta → fuite immédiate. On sécurise d'abord, on ouvre la porte ensuite.

```
P0 (fait) audit isolation → P1 super-owner + X-Active-Org → P2 isolation compta
        → P3 inscription self-service → P4 console super-owner
```

---

## PHASE 1 — Rôle super-owner + en-tête X-Active-Org

**But :** permettre au propriétaire de basculer dans l'org d'un client (support), sans casser l'enfermement des clients. Supprimer le `?? 1` muet.

1. **Rôle système `super_owner`** : seeder `roles.seeder.ts` (flag `isSystem`), attribué au compte propriétaire uniquement.
2. **Guard** (`jwt-auth.guard.ts`) : dans `assertCurrentAuthContext`, calculer `isSuperOwner` (depuis le rôle DB, jamais le token). Si super-owner ET en-tête `X-Active-Org` présent → org active = celle de l'en-tête (avec audit). Sinon → org du user en DB (comportement actuel).
3. **Centraliser** : remplacer le `?? 1` du décorateur et du token par l'org réelle. Un user sans org = erreur explicite, pas fallback 1.
4. **Audit** : toute bascule super-owner → `audit_log` (déjà table infra).

**Test de sortie :** un user client avec `X-Active-Org: 2` (org pas la sienne) → **ignoré** (reste sur son org). Un super-owner avec `X-Active-Org: 2` → voit l'org 2, tracé.

**Risque :** faible (additif). Pas de migration destructive.

---

## PHASE 2 — Isolation comptable (le cœur)

**But :** chaque org a SON plan comptable + ses écritures, invisibles des autres.

### 2a. Migrations Drizzle (1 statement / `--> statement-breakpoint`)

Ajouter `organization_id bigint NOT NULL DEFAULT 1` sur :
- `account`, `transaction_types` (colonne directe)
- `subAccount` : hérite via `accountId` → soit colonne dénormalisée `organization_id`, soit filtrage par jointure sur `account.organization_id`. **Décision : colonne dénormalisée** (évite les jointures fragiles, plus simple à filtrer). Backfill depuis le parent.
- Backfill : toutes les lignes existantes → org #1.
- Autres tables identifiées P0 à isoler : `supplier`, `appSetting`, `emailConfig`, `discount`, `announcement`, catalogues RH (`department`, `designations`, `awards`, `shifts`, `employmentStatus`). (Peuvent être un lot séparé 2c.)

### 2b. Services (15 fichiers, ~36 requêtes — aucun ne filtre par org aujourd'hui)

Gros patch : `accounts.service.ts` (8 req), `suppliers.service.ts` (7), `property-management.service.ts` (6), `transaction-types.service.ts` (3), + sub-accounts/ledger/transactions/dashboard/farmos/purchase-invoices/payment-methods.
- Chaque `select/insert/update` filtre/renseigne `organizationId` (depuis `@CurrentOrg()`).
- **Point le plus délicat : les JOINTURES** (`subAccount→account`, `ledger→account`) doivent filtrer sur l'org du parent, sinon fuite silencieuse malgré la colonne. Revue ligne par ligne.

### 2c. Seeders compta par org

`accounts.seeder.ts`, `sub-accounts.seeder.ts`, `transaction-types.seeder.ts` → rejouables **pour une org donnée** (plan comptable canonique à la création d'une entreprise). Réutilisés par le provisioning P3.

**Test de sortie (critique) :** créer une écriture dans l'org #2 → **invisible** dans le ledger / le compte de résultat de l'org #1, et vice-versa.

**Risque :** élevé (touche la compta + migrations). Backfill org #1 obligatoire. Dev d'abord, validation réelle, puis PR prod.

---

## PHASE 3 — Inscription self-service (l'outil demandé)

**But :** un client s'inscrit seul → son tenant est provisionné → il entre dans son espace.

### 3a. Backend — `POST /auth/register` (public)

- **Public** : hors `JwtAuthGuard`, **+ entrée dans `middleware/src/whitelist.js`** (sinon 403).
- DTO : `RegisterDto` (firstName, lastName, email, password, accountType `org|solo`, orgName?, slug, sector?, phone?, acceptedTerms).
- Validation : email unique (`users`), force mdp (≥8 + chiffre), **slug unique** (`organizations.slug` est déjà `.unique()`).
- **Transaction atomique** (Drizzle `db.transaction`) :
  1. `INSERT organizations` (name, slug, status=`trial`).
  2. `INSERT users` (rôle `org_admin`, `organizationId` = nouvelle org, mdp hashé bcrypt comme login).
  3. **Seed par org** : appeler les seeders compta 2c + settings/devise par défaut pour cette org.
  4. `INSERT audit_log` (« Organisation créée — inscription autonome »).
- Émettre le JWT (org = nouvelle) + cookie refresh (réutiliser `issueAccessToken` + rotation existante) → client connecté direct.
- Solo : `accountType='solo'` → org quand même créée, `name = nom de la personne`.
- Réponse : `{ slug, redirectTo }`.

### 3b. Frontend — page publique `/signup`

- Câbler le **mockup validé** (`signup-onboarding-mockup.html`) sur l'API : wizard 3 étapes, force mdp, slug live, CGU, écran succès, entrée espace.
- **Hors `/crm`** (route publique). Respecter le routing : `/` marketing, `/crm` CRM.
- **Mobile** : prévoir l'équivalent Capacitor (la PWA React empaquetée le couvre nativement — juste vérifier le responsive).

**Test de sortie :** inscription end-to-end → nouvelle org en DB (status trial) + 1er admin + plan comptable seedé + login auto. Une 2e inscription avec un slug pris → rejet.

**Risque :** moyen. Crée de la donnée mais additif. Dépend de P2 (sinon fuite).

---

## PHASE 4 — Console super-owner

API gardée `manage_organizations` : liste / créer / suspendre (soft, `status=false`) / bascule (via `X-Active-Org` de P1). UI = mockup `saas-platform-mockup.html` (console plateforme : KPIs, table orgs, suspend, accès support tracé, plans/facturation). Sélecteur d'org actif côté front qui pilote toutes les apps (web + mobile Capacitor).

---

## 5. Garde-fous (règles projet)

- Suppression = **soft delete** (`status=false`), jamais DELETE physique.
- Migrations = `backend2/drizzle/*.sql`, **1 statement / `--> statement-breakpoint`** ; corriger le fichier si ça plante, pas contourner ; ordre piloté par `_journal.json`.
- **Tables/colonnes hors journal** → ajouter à la main sur **dev ET prod** (cibler `nglu_dev_mysql` pour dev, DB prod distante 35.169.124.49 pour prod).
- Toute nouvelle route `/api` → **whitelist middleware** (dev ET prod, hors CI → scp+rebuild manuel… ou via pipeline selon ce qui est en place).
- Bump version + CHANGELOG à chaque changement. Commit `Co-Authored-By: Claude Opus 4.8`.
- **Demander avant** : migration destructive, changement prod, reset DB.
- Déploiement = pipelines (push develop→dev, PR develop→master→prod). Pas de SSH manuel.

## 6. Décisions encore à trancher

1. **subAccount** : colonne dénormalisée (proposé) vs filtrage par jointure. → impacte 2a/2b.
2. **Facturation/plans** : le mockup a déjà MRR/plans/cycles. v1 = juste `trial` + suspend, ou on câble la facturation dès P4 ? (reco : trial + suspend d'abord, facturation = lot ultérieur.)
3. **Domaine** : `nglu.cloud/<slug>` (path) vs sous-domaine `<slug>.nglu.cloud` ? Le mockup montre `app.nglu.cloud/<slug>`. Path = plus simple (pas de wildcard DNS/TLS). → reco path.
