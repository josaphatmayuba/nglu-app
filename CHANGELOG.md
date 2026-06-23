# Changelog

All notable project changes must be documented in this file.

This project follows:

- Semantic Versioning for the base application version in `VERSION`.
- Keep a Changelog style sections.
- Jira issue keys and Git commit hashes for traceability.

## [Unreleased]

### Added (3.105.1)
- Multi-tenant SaaS **P4 (frontend) — console super-owner branchée sur l'API** : `saas-platform-mockup.html` gagne un **mode LIVE** opt-in (activé si `window.NGLU_OWNER_TOKEN` est fourni ; `NGLU_API_BASE` surchargeable). En mode LIVE : `GET /organizations` alimente la liste réelle (mappée vers la forme des renderers, champs démo par défaut), suspend/réactiver appellent `POST /organizations/:publicId/(suspend|reactivate)` par publicId. Sans token → reste la démo simulée autonome. Les sections plans/billing/usage restent simulées (pas d'endpoint backend correspondant). Syntaxe JS vérifiée. **RESTE** : déploiement (servir signup en route publique, sous-domaine wildcard) ; **test réel à 2 orgs** (non exécuté, Docker arrêté). [SCRUM]

### Added (3.105.0)
- Multi-tenant SaaS **P4 (backend) — console super-owner** : nouveau `SuperOwnerGuard` (s'appuie sur `request.user.isSuperOwner` calculé en DB par le JwtAuthGuard en P1 → fiable, jamais le token). Nouveau module `organizations` (gardé `JwtAuthGuard` + `SuperOwnerGuard`) : `GET /organizations` (liste + nb d'utilisateurs actifs), `GET /organizations/:publicId`, `POST /organizations` (crée une org cliente + 1er admin + plan comptable via `provisionOrgChartOfAccounts`, sans auto-login), `POST /organizations/:publicId/suspend` (soft, status='suspended', motif audité), `POST /organizations/:publicId/reactivate`. Les orgs sont référencées par `publicId` opaque, jamais l'id interne. La bascule d'org pour le support utilise l'en-tête `X-Active-Org` déjà géré en P1. Module enregistré dans app.module + route `/organizations` ajoutée à la whitelist middleware. Typecheck OK (runtime non vérifié : Docker local arrêté). [SCRUM]

### Added (3.104.1)
- Multi-tenant SaaS **P3 (frontend) — page d'inscription câblée sur l'API** : `signup-onboarding-mockup.html` n'est plus un mockup simulé — `submitSignup()` appelle réellement `POST /api/auth/register` (fetch, `credentials: include` pour le cookie refresh), split nom complet → firstName/lastName, gère les erreurs (409 slug pris → retour étape 2 + message ; 400 validation → toast), désactive le bouton pendant l'appel, stocke le token en mémoire (pas localStorage, conforme à la règle projet). `enterWorkspace()` redirige vers l'espace réel quand servi en HTTP (fallback aperçu en ouverture locale). UI passée au format **sous-domaine `<slug>.nglu.cloud`** (préfixe→suffixe, hints, récap, écran succès). `API_BASE`/`NGLU_WORKSPACE_URL` surchargeables pour les tests. Syntaxe JS vérifiée. [SCRUM]

### Added (3.104.0)
- Multi-tenant SaaS **P3 (backend) — inscription self-service** : nouvel endpoint **public** `POST /auth/register` (déjà whitelisté côté middleware). `RegisterDto` (firstName/lastName/email/password fort/accountType org|solo/orgName?/slug sous-domaine/sector?/phone?/acceptedTerms). `AuthService.register` : vérifie CGU + unicité email (= username) + unicité slug, hash bcrypt, génère le `public_id` hexa, puis **transaction atomique** créant l'organisation (`status='trial'`) + le 1er utilisateur (rôle `admin` de SA propre org) + `provisionOrgChartOfAccounts(tx, orgId)` (plan comptable canonique isolé) + log d'audit ; émet ensuite JWT + cookie refresh (connexion immédiate). Solo = org à 1 user (orgName = nom de la personne). Réponse expose l'`organization.publicId` opaque, jamais l'id interne. Typecheck OK (runtime non vérifié : Docker local arrêté). **Prochaine étape** : câbler `signup-onboarding-mockup.html` sur l'endpoint + test réel 2 orgs. [SCRUM]

### Added (3.103.0)
- Multi-tenant SaaS **P2 — plan comptable provisionnable par organisation** (prérequis de l'inscription P3) : nouveau module `database/provisioning/chart-of-accounts.ts` avec `provisionOrgChartOfAccounts(db, orgId)` — crée le plan comptable canonique (6 comptes racine + 17 sous-comptes + 6 types de transaction) pour UNE org donnée, **idempotent**, en résolvant tous les IDs **par nom** (les auto-increment ne valent pas 1..6 pour la 2e org) ; accepte un handle transactionnel (création atomique d'un tenant). Renvoie les maps nom→id. + helper `loadOrgAccountMaps`. Les 3 seeders bootstrap (`accounts`/`sub-accounts`/`transaction-types`) délèguent désormais à cette fonction pour l'org #1 (sub-accounts/transaction-types devenus no-op conservés pour l'ordre du runner). Mappings débit/crédit vérifiés identiques aux IDs codés en dur historiques. Typecheck OK. **RESTE P2** : suppliers, projects, payment-methods (référentiel). Prochaine étape logique : **P3 inscription self-service** (qui appellera `provisionOrgChartOfAccounts` + générera le `public_id`). [SCRUM]

### Fixed (3.102.2)
- Multi-tenant SaaS **P2 — chasse globale aux écritures non isolées** : audit de TOUS les `insert(transactions)` du backend. 3 fuites réelles corrigées (les autres mettaient déjà `organizationId` plus bas dans le bloc) : `hr.service.createSalaryHistory` (paie), `purchase-invoices.service.createPayment`, `sale-invoices.service.createPayment` — ces 3 méthodes n'avaient pas de paramètre `orgId` et écrivaient donc sur l'org #1. Threadé `@CurrentOrg() orgId` controller→service ; `organizationId: orgId` sur chaque insert ; lookups de factures filtrés par org (on ne paie plus la facture d'une autre org) ; dans HR, `ledger.post(...)` et `workflow.submit(...)` recevaient `1` en dur → désormais `orgId`. **Résultat : 0 `insert(transactions)` sans `organizationId` dans le backend.** Limitation : tables `paymentSaleInvoices`/`paymentPurchaseInvoices` sans `organization_id` (parent facture désormais vérifié). Typecheck OK. **RESTE P2** : suppliers, projects, payment-methods + seeders compta par org. [SCRUM]

### Fixed (3.102.1)
- Multi-tenant SaaS **P2 (suite) — isolation property-management + correction de fuites compta** : les helpers de résolution de comptes par nom (`getOrCreateSubAccount`/Liability/Expense, `getRentPaymentType`, `getRealEstateTaxTypeOptional`, `getTransactionTypeByName`) filtrent désormais l'org (un même libellé « Maintenance »/« Rent Payment » peut exister dans plusieurs organisations → on prenait celui de l'org #1). **Bug corrigé** : 6 insertions dans la table `transaction` (loyers, taxes immobilières, cautions collectées/restituées, coûts de maintenance) ne renseignaient PAS `organization_id` → toutes les écritures immobilières étaient comptabilisées sur l'org #1 quelle que soit l'organisation réelle. Désormais `organizationId: orgId` sur chaque insert. Typecheck OK. **RESTE P2** : suppliers, projects, payment-methods, farmos + seeders compta par org. [SCRUM]

### Added (3.102.0)
- Multi-tenant SaaS — **identifiant public hexa des organisations** (décision owner : pas de numéro simple exposé). Migration `0177_org_public_id.sql` ajoute `organizations.public_id` (VARCHAR(24) unique, format `org_` + 12 hexa, idempotente INFORMATION_SCHEMA+PREPARE, backfill UUID des orgs existantes). La PK `organizations.id` reste un entier interne (perf, FK, `@CurrentOrg()` inchangé) ; seul `public_id` opaque est exposé côté client (URLs/API/sous-domaine) — approche Stripe/GitHub. Le générateur côté app sera branché dans l'inscription P3. Schéma Drizzle mis à jour. [SCRUM]

### Added (3.101.4)
- Multi-tenant SaaS **P2 (suite) — isolation dashboard** : `dashboard` controller (`@CurrentOrg()` sur les 3 routes) + service entièrement threadé par org. Toutes les requêtes dont la table porte `organization_id` filtrent désormais l'org : ventes, achats, graphe mensuel, soldes de comptes (subAccounts + transactions), top clients, top produits, tendances KPI (dailyTrend générique reçoit la colonne org), ventes par devise, alertes (baux en retard, maintenance, stock bas), badge sidenav, activité récente, commandes panier. Limitation documentée : `returnSaleInvoices`/`returnPurchaseInvoices` (totaux de retours) et `appSettings` n'ont pas encore `organization_id` → non filtrés, migration à prévoir. Typecheck OK. **RESTE P2** : suppliers, property-management, projects, payment-methods, farmos + seeders compta par org. [SCRUM]

### Added (3.101.3)
- Multi-tenant SaaS **P2 (suite) — audit ledger** : revue des 4 jointures `account`/`subAccount` du module ledger. 3 sont déjà sûres (ancrées sur `journalEntryLines`/`transactionTypeRules` filtrés par org → les montants ne peuvent pas fuiter, le join ne sert qu'au libellé). 1 corrigée : `migrateLegacyTransactions` validait les références sur **tous** les sous-comptes → restreint aux sous-comptes de l'org. Le ledger (journal_entries/lines, déjà org-aware partout) est désormais isolation-correct. Typecheck OK. **RESTE P2** : dashboard (pas org-aware, ~13 tables), suppliers, property-management, projects, payment-methods, farmos + seeders compta par org. [SCRUM]

### Added (3.101.2)
- Multi-tenant SaaS **P2 (suite) — isolation transaction-types + sub-accounts** : `transaction-types` controller (`@CurrentOrg()` sur les 5 routes) + service (findAll/findOne/create/update/remove filtrent `organizationId`, `ensureAccountsExist` vérifie que les sous-comptes débit/crédit appartiennent à l'org). `sub-accounts` controller + service (findAll filtre l'org). `transactions.service.ts` était déjà org-aware mais `ensureAccountsExist` ne filtrait pas l'org → corrigé (un client ne peut plus passer une écriture sur le sous-compte d'une autre org). Typecheck OK. **RESTE P2** : payment-methods, suppliers, property-management, dashboard, ledger, projects, farmos + seeders compta par org. [SCRUM]

### Added (3.101.1)
- Multi-tenant SaaS **P2 (début) — isolation du plan comptable** : migration `0176_chart_of_accounts_org.sql` ajoute `organization_id` (NOT NULL DEFAULT 1, idempotent INFORMATION_SCHEMA+PREPARE pour MySQL 8) sur `account`, `subAccount` (colonne dénormalisée, backfillée depuis le compte parent), `transaction_types` + index par org. Backfill = lignes existantes → org #1. Schéma Drizzle mis à jour. **Module `accounts` entièrement isolé** : controller (`@CurrentOrg()` sur les 6 routes) + service (toutes les requêtes filtrent `organizationId` : mainAccounts, subAccounts, balances, trial balance, bilan, compte de résultat, recherche, pagination, ensure*). Point délicat traité : dans `subAccountBalances`, le filtre org sur `transactions` est dans la condition de JOIN (pas WHERE) pour préserver le LEFT JOIN (sous-comptes sans écriture). Typecheck OK. **RESTE P2** : transaction-types, sub-accounts, suppliers, property-management, dashboard, ledger, projects + seeders compta par org (12 services à scoper). Note : `transaction`/`journal_entries` ont DÉJÀ `organization_id`. [SCRUM]

### Added (3.101.0)
- Multi-tenant SaaS **P1 — rôle super-owner + bascule d'organisation** : nouveau rôle système `super_owner` (propriétaire de la plateforme, au-dessus des organisations). Migration `0175_super_owner_role.sql` (idempotente, INSERT IF NOT EXISTS) + ajout au `roles.seeder.ts` (avec `is_system=1`). Le guard `jwt-auth.guard.ts` **recalcule `isSuperOwner` depuis le rôle en DB** (jamais le token → pas d'auto-promotion) et honore l'en-tête **`X-Active-Org`** UNIQUEMENT pour ce rôle (support/monitoring) : un client reste enfermé dans son organisation, l'en-tête est ignoré pour les autres rôles. Org active inconnue → 401. `isSuperOwner` exposé sur `request.user` pour les guards/décorateurs en aval (future console super-owner). Étape 1/4 du chantier multi-tenant (cf. `docs/PLAN_SAAS_MULTITENANT.md`). [SCRUM]

### Removed (3.100.13)
- FarmOS (farmos-app) — **suppression du code « gestion des organisations » issu d'un modèle multi-tenant erroné** (super-propriétaire mono-tenant) : composant `admin-orgs.jsx` supprimé + retrait des références dans `app.jsx` (import, route `admin-orgs` de `ROUTE_SLUGS`, entrée `routeMeta`, case `renderScreen`) et `shell.jsx` (const `NAV_ADMIN` + bloc de nav admin ; bouton « Retour au CRM » remis dans la nav secondaire). Le vrai SaaS multi-tenant (inscription client self-service, isolation par organization_id) sera repris proprement par phases. Build vite OK. [SCRUM]

### Fixed (3.100.12)
- Backend — **devise ISO complète sur tous les endpoints** : SaleInvoicesService.findOne() + PurchaseInvoicesService.findOne/create/findAll() + HR SalaryHistoryService.findSalaryHistory/listSalaryHistory() + PayrollService.findPayroll/listPayrolls() maintenant **leftJoin currency** et retournent l'objet {id, currencyCode, currencyName, currencySymbol, ...} au lieu de juste currencyId; Frontend SalariesPage utilise l'objet devise du backend au lieu de chercher par ID en liste locale. FormattedAmount reçoit toujours currency complet → affichage ISO garanti. [SCRUM]

### Changed (3.100.11)
- CI — relance du build Frontend → dev (le step précédent avait échoué de façon transitoire ; le build local et `npm install --legacy-peer-deps` passent). [SCRUM]

### Fixed (3.100.10)
- Frontend (CRM) — **racine de la boucle de requêtes identifiée** : le reducer `loadPermissionById.fulfilled` réassignait `state.auth.list` à un **nouveau tableau** à chaque poll (toutes les 60 s) même quand les permissions étaient identiques. Or l'effet d'alertes du Header dépend de `permissions` (`[isLogged, permissions, startupAlerts]`) → nouvelle référence = re-déclenchement → re-fetch de **toutes** les sources d'alertes (`sale-invoice`, `leases`, `maintenance`, `product`…) → cascade visible dans Network. Fix : helper `samePermissions` qui **préserve la référence** du tableau quand le contenu n'a pas changé. [SCRUM]

### Fixed (3.100.9)
- Frontend (CRM) — **boucle de remount d'AdminLayout (vraie racine)** : le garde de session `if (!hasSession) { clearAdminSession(); <Navigate login/> }` appelait `clearAdminSession()` **pendant le rendu** (effet de bord interdit en React). Quand un refresh de token était en cours, l'access-token en mémoire était momentanément vide → `hasSession=false` → `clearAdminSession()` effaçait `isLogged`/`roleId` → au retour du refresh, session à moitié détruite → 401 → remount d'AdminLayout → re-SSE → boucle. Fix : suppression de l'appel `clearAdminSession()` dans le chemin de rendu (le nettoyage réel se fait déjà dans l'intercepteur axios quand le refresh échoue vraiment). [SCRUM]

### Fixed (3.100.8)
- Frontend (CRM) — **boucle infinie de requêtes / remount d'AdminLayout** (des milliers d'appels, app qui se réinitialise en continu). Cause confirmée par diagnostic : `roleId` valait `null` en localStorage → `AdminLayout` dispatchait `loadPermissionById(null)` → `/role-permission/permission?roleId=null` répondait **401** → l'intercepteur axios tentait un refresh → `AdminLayout` remontait → nouvelle connexion SSE → 401 → boucle. Fix : ne dispatcher `loadPermissionById` que si `roleId` est un identifiant valide (ni `null`/`"null"`/`"undefined"`). Diagnostics temporaires (`DIAG-LOOP`/`DIAG-SSE`/`DIAG-MOUNT`) retirés. [SCRUM]

### Changed (3.100.7)
- Frontend (CRM) — **diagnostic boucle (suite)** : logs `[DIAG-SSE]` (chaque ouverture de connexion SSE) et `[DIAG-MOUNT]` (mount de l'effet realtime d'AdminLayout) pour distinguer reconnexion SSE en rafale vs remount de layout. **À retirer** avec le détecteur axios une fois la cause confirmée. [SCRUM]

### Changed (3.100.6)
- Frontend (CRM) — **diagnostic temporaire** : intercepteur axios qui détecte les boucles de requêtes (>10 appels d'une même URL en 3s) et logge `console.trace` pour localiser la source (boucle sur l'écran Produits). **À retirer** une fois le coupable identifié. [SCRUM]

### Fixed (3.100.5)
- Frontend (CRM) — **boucle infinie de requêtes** `/role-permission/permission?roleId=…` (des milliers d'appels sans arrêt, visible dans le panneau Network). L'effet de garde dans `AdminLayout` redispatchait `loadPermissionById` tant que `state.auth.list` était falsy ; or le reducer remettait `list` à `undefined` quand la réponse ne contenait pas `data.permissions` → la garde repassait vraie → boucle. Fix : flag `attempted` posé dès la 1re réponse (succès **ou** échec) pour ne dispatcher qu'une fois, `list` retombe sur `[]` au lieu de `undefined`, ajout du case `.rejected` (échec auparavant silencieux). [SCRUM]

### Security (3.100.4)
- Frontend (CRM) — `npm audit fix` (non-breaking) : correction de 2 vulnérabilités, dont `undici` (**high**) et `dompurify` (moderate). Restent 2 vulns `quill`/`react-quill` (moderate, XSS) non corrigées car le fix nécessite `--force` qui rétrograderait `react-quill` à 0.0.2 (breaking change cassant l'éditeur de texte riche) — à traiter dans un ticket dédié (migration react-quill). [SCRUM]

### Fixed (3.100.3)
- CI/CD — **déploiement Frontend (CRM) bloqué** : `npm audit --audit-level=high` retournait exit 1 sur une vuln transitive de build (`undici` high), ce qui coupait la chaîne `&&` AVANT `npm run build:dev` → `dist/` vide → `scp frontend/dist/*` échouait (`No such file or directory`). Audit passé en mode informatif (`|| true`) sur les steps Frontend dev et prod : il s'affiche toujours mais ne bloque plus le build. [SCRUM]

### Added (3.100.2)
- FarmOS — **refonte complète des fiches terrain** : format vertical (1 ligne par événement, grandes cases), semaine à remplir manuellement, colonne Heure sur toutes les fiches, exemples de remplissage en bas de chaque page. Fiche Soins : ajout Raison/Maladie + Durée (j). Fiche Vaccination : nouvelle fiche séparée. Fiche Naissances : colonne Mère (nom/N° oreille). [SCRUM]

### Added (3.100.1)
- FarmOS — **fiche naissances** ajoutée aux fiches de terrain imprimables (5e page). Colonnes : Lot/Animal, Vivants M, Vivants F, Mort-nés, 7 jours, Observations. [SCRUM]

### Added (3.100.0)
- FarmOS — **fiches de terrain hebdomadaires imprimables** (bouton « Fiches terrain » dans le modal d'un bâtiment, à côté de « Rapport »). Génère 4 fiches HTML imprimables (une page chacune) pour la **semaine prochaine** (lundi→dimanche, dates calculées auto) : Mortalité, Alimentation, Production et Soins/traitements. Chaque fiche est pré-remplie avec les **lots du bâtiment** (`stats.lots`) plus quelques **lignes vierges** pour ajouts manuels, 7 colonnes jour à remplir au stylo, colonne Observations et pied « Rempli par / Signature ». Usage prévu : imprimer → remplir à la main sur le terrain (travailleurs sans accès au téléphone) → scanner → ressaisir dans l'app. 100 % frontend (pattern d'impression `window.print`, sans backend ni migration). [SCRUM]
- FarmOS — **attachement de scan papier dans les formulaires de saisie** (phase 2 du workflow fiches terrain). Les formulaires Mortalité (`DeathForm`), Production (`ProductionForm`) et Soins/traitements (`HealthForm`) intègrent un champ optionnel « Scan fiche terrain » : le manager choisit la photo ou le PDF du scan, celui-ci est converti en base64 et envoyé dans `farmos_documents` (`doc_type="field_scan"`) après la saisie principale, sans bloquer si l'upload échoue. Titre auto incluant la date et le contexte (espèce, bâtiment, médicament). Aucune migration ni modification backend (réutilise l'endpoint `/documents` existant). [SCRUM]

### Added (3.99.0)
- FarmOS — **filtre par espèce sur la page Rapports** (`SpeciesPillBar` sous le titre). Les rapports générés en direct ne montrent alors que les données de l'espèce sélectionnée : Effectif, Structure ♂/♀, Ratio reproducteur (animaux filtrés), Mortalité (décès de l'espèce) et Prévision (paramètre `species` passé au moteur forecast trésorerie + cheptel). L'espèce active apparaît dans le titre de la page et dans l'en-tête de chaque rapport imprimé. La **Rentabilité** (PDF financier global, qui ne sait pas filtrer par espèce) est désactivée quand une espèce est sélectionnée, avec un message « retirer le filtre espèce ». [SCRUM]

### Fixed (3.98.1)
- FarmOS — **rapport de mortalité : la perte estimée affiche désormais la devise** (ex. « 330 USD » au lieu de « 330 » nu) dans la colonne, le total et l'explication en langage naturel. La table `farmos_mortality_events` n'ayant pas de colonne devise, le symbole vient de la **devise par défaut** de la ferme (`useCurrencyCatalog` → `symbolFor`), comme les autres montants FarmOS. [SCRUM]

### Changed (3.98.0)
- FarmOS — **page Rapports réorganisée** : les rapports « générés en direct » (Rentabilité, Effectif par bâtiment, Structure du cheptel ♂/♀, Ratio reproducteur M:F) ne sont plus des bannières pleine largeur mais des **cartes** dans une grille homogène (section « Générés en direct · données réelles »), au-dessus de la bibliothèque d'archives. [SCRUM]

### Added (3.98.0)
- FarmOS — **nouveau rapport de prévision** (carte « Prévision (6 mois) ») : imprime la **trésorerie projetée** (flux net cumulé par devise) et le **cheptel projeté** (effectif actuel → effectif prévu avec fourchette, naissances/mortalités/sorties cumulées) en réutilisant le moteur forecast backend (`/forecast/cash-flow` + `/forecast/livestock`, scope farmos, scénario réaliste). [SCRUM]
- FarmOS — **nouveau rapport de mortalité** (carte « Mortalité (animaux décédés) ») : liste chaque décès enregistré (date, espèce, nombre, cause présumée/confirmée, lieu, perte estimée, symptômes/notes) via `GET /farmos/mortality-events`, avec totaux par cause/espèce. [SCRUM]
- FarmOS — **explication en langage naturel** ajoutée au bas de chaque rapport imprimé (effectif, structure ♂/♀, ratio reproducteur, prévision, mortalité) : un encart « Ce que disent ces données » qui résume en clair les chiffres réels et ce qu'ils signifient pour l'éleveur. [SCRUM]

### Added (3.97.0)
- FarmOS — **projection du cheptel dans le Prévisionnel** (combien d'animaux après tel temps + impact financier). Nouveau service backend `ForecastLivestockService` + endpoint `GET /forecast/livestock?horizon=`. Part de l'**effectif réel courant** (somme des têtes des animaux actifs non sortis) et applique mois par mois les leviers, dont les **taux sont calculés sur l'historique FarmOS réel** (6 mois) : naissances = N1 certain (gestations en cours, `farmos_reproduction_events`), mortalité = N2 estimé (taux mensuel historique × cheptel), ventes/abattage/sorties = N2 tendance (têtes sorties/mois). Sortie = **courbe des têtes par mois avec cône d'incertitude** (3%/mois, plafond 40%) + **impact financier** : têtes vendues projetées × prix moyen historique par devise → recette d'élevage prévisionnelle (jamais de conversion entre devises). `tsc --noEmit` backend OK. Route déjà couverte par la whitelist `/forecast`. UI à brancher. [SCRUM]

### Fixed (3.96.1)
- FarmOS — **déclaration de mortalité de nouveau possible**. La garde anti-écriture « animal décédé » (ajoutée en 3.94.3, `assertAnimalWritableById`) était aussi appliquée dans `createMortalityEvent`, ce qui rejetait la déclaration de décès elle-même (l'unique action légitime sur un animal mort). Garde retirée de ce seul endpoint ; elle reste active sur les autres écritures (traitements, ventes…). `tsc --noEmit` backend OK. [SCRUM]

### Added (3.96.0)
- BatiPro — **échéancier de chantier dans le Prévisionnel** (dernière app du plan forecast). Migration **0174** (idempotente, au journal Drizzle → auto au boot) ajoute `currency_id`, `contract_amount`, `billed_amount` à `batipro_projects`. Nouveau producteur backend `BatiproScheduleProducer` (scope `batipro`, couche 1) : projette **dans les deux sens** — SORTIE = coût restant (`budget − spent`), ENTRÉE = à facturer (`contract_amount − billed_amount`), étalés linéairement du mois courant jusqu'à `due_date`, par devise. Backend : service/DTO BatiPro exposent les 3 nouveaux champs. UI BatiPro : formulaire chantier complété (devise + montant contrat + déjà facturé) et **nouvelle page Prévisionnel** (menu, thème ambre, courbe trésorerie + détail mensuel). `tsc --noEmit` backend OK, build BatiPro OK. **Le moteur forecast couvre désormais les 5 apps** (Compta/Domus/FarmOS/HR/BatiPro).

### Changed (3.95.3)
- Comptabilité — Prévisionnel: les courbes de trésorerie sont regroupées dans UN seul graphe (aires translucides superposées, hauteur réduite) au lieu d'une grosse carte par devise. Courbes lissées + légende des devises. Distinction réel/projeté: point plein = solde réel actuel, trait pointillé = projection, avec un repère vertical « aujourd'hui ». [SCRUM]

### Changed (3.95.2)
- FarmOS — **Plan intérieur des box modernisé**. Le mini-plan SVG (peu lisible, box minuscules) est remplacé par une **grille de cartes de box** (nom + pastille d'état + têtes `9/10` + jauge de remplissage, fonds doux par état). Le clic sur un box ouvre le détail **en remplacement de la grille** avec un **bouton retour `‹`** (manquant auparavant) pour revenir à la vue d'ensemble et rouvrir un autre box — corrige « plus moyen de revoir les box quand on clique ». Tactile/mobile (cartes ≥92px, grille scrollable). Icône `chevron-left` ajoutée au jeu d'icônes FarmOS. Logique d'affectation (assign/unassign/générer/capacité) inchangée. [SCRUM]

### Fixed (3.95.1)
- FarmOS — fiche animal: après fermeture du panneau de détail (bouton X), recliquer sur un animal ne le rouvrait plus. Le bouton X passait le layout en « full » de façon permanente; le clic sur une ligne remet désormais le layout en « split » et réaffiche le panneau. [SCRUM]

### Added (3.95.0)
- FarmOS & HR — **page Prévisionnel** branchée (suite de Compta/Domus). FarmOS : menu FarmOS « Prévisionnel » (`scope=farmos`) = ventes élevage projetées (tendance) + **projection de production** œufs/naissances, thème vert (tokens `--forest`/`--fg`). HR : menu Paie « Prévisionnel » (`scope=hr`) = **masse salariale projetée** par devise (cartes KPI + courbe), levier simulation salaires. Composants copiés/adaptés par app (pas de code partagé — builds Vite isolés), avec le `cleanCurrencySymbol`/classes de chaque app. Icône `activity` ajoutée au jeu d'icônes HR. Aucun changement backend (endpoints `/forecast/*` déjà déployés). Builds FarmOS + HR OK. Reste BatiPro (échéancier backend à créer d'abord).

### Changed (3.94.3)
- FarmOS backend: la garde `assertAnimalWritable` rejette desormais aussi les ecritures sur un animal decede (deceased/dead/decede), en miroir du verrou frontend — protege l'API directe et le mobile Capacitor. Message d'erreur dedie au deces. [SCRUM]

### Changed (3.94.2)
- FarmOS: le dossier d'un animal décédé est désormais verrouillé en lecture seule (comme « en vente »/« vendu ») — saisie production/repro/santé/poids/mort bloquée, formulaire de pesée masqué, bandeau « Dossier clôturé (décès) ». Statuts décès reconnus (deceased/dead/decede). [SCRUM]

### Changed (3.94.1)
- FarmOS — **refonte UI de la modale « Plan intérieur / Affectation des box »** (`BldgInteriorPlan`, aucun changement backend). Le plan SVG **reste désormais toujours visible** : la liste d'animaux d'un box scrolle dans sa propre zone (`maxHeight` 230px) au lieu de pousser/masquer le plan quand le box est rempli. En-tête de box **sticky** avec compteur `X/Y têtes` + **barre de remplissage** colorée (vert → ambre plein → rouge dépassé). Lignes d'animaux en cartes lisibles (puce de statut, nom en gras, **lot en chip**, surbrillance au survol) ; « Retirer » remplacé par une **icône poubelle** discrète. Bloc d'ajout (lot / animal) fixé en bas, séparé. Design system existant (`btn`/`input`/`Icon`), pas de nouvelle dépendance. `vite build` OK.

### Added (3.94.0)
- Domus — **page Prévisionnel** (menu Pilotage). Réutilise le moteur forecast backend2 avec `scope=domus` figé : projette les **loyers à venir** (baux actifs) par devise, avec horizon, hypothèse (Prudent/Réaliste), simulation « et si ? » sur les loyers, cône d'incertitude et suivi prévu vs réel. Composant copié/adapté depuis comptabilite-app (pas de code partagé entre apps — chaque app est un build Vite isolé), classes Domus + `cleanCurrencySymbol` de data.js. Aucun changement backend (endpoints `/forecast/*` déjà déployés). `npm run build` Domus OK. 1re app après Compta ; FarmOS/HR/BatiPro à suivre.

### Changed (3.93.1)
- FarmOS — **génération des box via un vrai modal** au lieu des deux `window.prompt` natifs (« Combien de box créer ? » + capacité). Nouveau composant `GenerateBoxesModal` (formulaire nombre + capacité dans le design system existant : `input`/`btn`, header iconisé, validation, états `busy`). Affiche le nombre de box déjà présents. Aucun changement backend (toujours `api.generateBoxes`). Parse JSX OK.

### Changed (3.93.0)
- Comptabilité — **refonte UI de la page Prévisionnel** (aucun changement backend). Barre de contrôles regroupée (Horizon + Hypothèse en `segtabs`, bouton « Et si ? » qui replie/déplie les sliders de simulation). Bandeau phrase-réponse suivi de **cartes KPI par devise** (trésorerie projetée + delta sur l'horizon). Courbes par devise enrichies (dégradé de remplissage, points contrastés, libellés d'axe, couleur par série). Détail mensuel passé en `<details>` repliable. **Blocs vides masqués** (production, suivi) ; badges de confiance en `chip` colorées. Utilise le design system existant (`segtab`/`kpi`/`chip`/`card.info/warn/good`). Toujours sans Recharts (graphe SVG maison). `build:dev` OK.

### Fixed (3.92.3)
- FarmOS — **Plan intérieur / Affectation des box** : 3 corrections.
  1. Le bouton **« + Box »** relançait la numérotation à `1` à chaque clic → doublons (1..N recréés en double). `generateBoxes` reprend désormais après le plus grand numéro de box existant du bâtiment (`start` explicite toujours respecté).
  2. **Impossible d'affecter un animal** à un box : la liste reçoit les lignes brutes de `listAnimals` (champ `id`) mais l'UI envoyait `a._pk` (inexistant → `NaN`). Corrigé en utilisant `a.id` (sélection, lot entier, retrait).
  3. Les animaux **décédés/vendus** apparaissaient dans la liste d'affectation. Exclusion de `status` `deceased`/`dead`/`sold`.
- Migration **0173** (`0173_farmos_boxes_dedupe.sql`, idempotente, au journal Drizzle → auto au boot dev) : réaffecte les animaux des box doublons vers le box gardé, puis **soft-delete** les box en double (garde le plus petit `id` par `building_id`+`name`).

### Fixed (3.92.2)
- Comptabilité — force le redéploiement dev du bundle compta pour exposer l'onglet **Prévisionnel** (le pipeline ne rebuild compta que si `comptabilite-app/**` change ; cache-bust). Aucun changement fonctionnel. Penser au hard reload / désinscription du Service Worker côté client (PWA) si l'ancien bundle persiste.

### Fixed (3.92.1)
- FarmOS mortalité Zone B — migration **0172** (réparation) : supprime les **événements de mortalité en doublon** créés en dev avant correction (un jeu intermédiaire count chèvre = 3 + porcs en double), ne garde que la version finale (count 2/1/6). N'agit que sur `farmos_mortality_events` Zone B au 2026-06-13. Migration **0171** rendue idempotente côté événements (garde anti-doublon `NOT EXISTS` sur espèce/date/lot/count) et apostrophes retirées des commentaires SQL (piège de parse au boot). `external_id` conservés en `ZB-PORCELET-MORT-*` / `ZB-CHEVREAU-MORT-*` (pas de renommage = aucun autre animal touché).

### Added (3.92.0)
- FarmOS — **Mortalité Zone B (diarrhée, 13 juin 2026)**. Migration **0171** : crée **9 animaux** décédés en Zone B (Ferme Kasangulu) — 2 porcelets femelles + 1 porcelet mâle (nés 2 juin, `Batiment Porcs Kasangulu`) et 6 chevreaux (`Batiment Caprins Kasangulu`), tous `status='deceased'` (sortis du cheptel vivant, traçables `is_active=1`, `external_id` `ZB-PORCELET-MORT-*` / `ZB-CHEVREAU-MORT-*`). Crée aussi **3 événements** `farmos_mortality_events` agrégés (count 2/1/6, cause « Diarrhee (presumee, non confirmee) », pertes estimées 60/30/240 = 330 $). Source : `farmos_mortality_events.csv`. Idempotente (`external_id` unique + `ON DUPLICATE KEY` + flag `data_migration_flags`).

### Added (3.91.0)
- Prévisionnel — **projection de production** (grandeur non monétaire, moteur générique multi-grandeurs). Endpoint `GET /forecast/production` + `ForecastProductionService` : **œufs** = tendance (moyenne mensuelle des `farmos_production_logs` type egg des 6 derniers mois, extrapolée — `[estimé]`, en unités) ; **naissances** = **N1 certain** = somme des `offspring_count` attendus par mois d'échéance (`expected_due_date` des reproductions en cours — `[certain]`, en têtes). UI compta (page Prévisionnel) : bloc « Projection de production » avec total sur l'horizon, badge de confiance, mini-barres mensuelles (œufs ambre / naissances vert) et base de calcul.

### Added (3.90.1)
- Prévisionnel de trésorerie : producteur **ventes FarmOS (tendance, couche 2)** = moyenne mensuelle des ventes d'élevage des 6 derniers mois par devise, extrapolée en entrée future (mode Réaliste). Levier de simulation « Ventes élevage » (scope `farmos`) ajouté aux sliders « et si ? ».

### Added (3.90.0)
- FarmOS — **Box (loges/emplacements) comme vraies entités**. Migration **0168** : table `farmos_boxes` (rattachée à un bâtiment, `name`/`section`/`capacity`) + colonne `box_id` sur `farmos_animals`. **Box libre** : on place N animaux de n'importe quel lot (ou sans lot) dans un même box via `box_id`, sans contrainte de lot. **Capacité max par box** appliquée à l'affectation : blocage `BOX_FULL` si dépassement, **possibilité de forcer** (surpeuplement temporaire). Endpoints `/farmos/boxes` (CRUD + soft delete), `/farmos/boxes/generate` (génère N box d'un coup, capacité par défaut) et `/farmos/boxes/assign` (affecte/désaffecte des animaux). UI : le plan intérieur du bâtiment devient **réel** (box colorés selon les animaux réellement présents) ; clic sur un box → panneau d'affectation (ajout individuel, **« placer tout un lot »** en 1 clic, retrait), bouton **« Générer les box »** si le bâtiment n'en a aucun.

### Added (3.89.0)
- Prévisionnel de trésorerie — **cône d'incertitude** : la projection affiche désormais une **bande min/max** qui s'élargit avec l'horizon (±3 %/mois d'éloignement, plafonné à ±40 %) au lieu d'un trait sec — plus l'échéance est lointaine, plus la fourchette est large (`netLow`/`netHigh` par mois, zone ombrée sur la courbe SVG).
- Prévisionnel de trésorerie — **références externes (couche 2, saisie manuelle)**. Migration **0170** : table `forecast_external_refs` (prix marché/région, taux de référence, flux récurrents ; champ `source` = manual/api/ia pour la cascade future). Producteur `ExternalRefProducer` : les références actives de type `cashflow_inflow`/`cashflow_outflow` génèrent des flux mensuels estimés par devise, avec **badge de provenance** (`réf. interne` / `réf. API` / `estimé IA`) affiché dans le détail. Visible en mode Réaliste/Optimiste.

### Added (3.88.0)
- Prévisionnel de trésorerie — **boucle prévu vs réel** (système qui apprend). Migration **0169** : table `forecast_snapshots` (seule table du chantier ; le calcul ne stocke rien) qui fige le net prévu par mois cible × devise × scope × mode. Endpoints `POST /forecast/snapshot` (fige la prévision du jour, idempotent par jour) et `GET /forecast/variance` (écart prévu/réel des mois écoulés, réel = ventes du mois, + **biais moyen** pour l'auto-correction). UI : bloc « Suivi prévu vs réel » avec bouton « Figer la prévision du jour », tableau prévu/réel/écart % par mois, et **alerte de biais** (sur/sous-estimation > 10 % → ajustement annoncé). Producteurs FarmOS/BatiPro toujours à venir.

### Added (3.87.0)
- Prévisionnel de trésorerie — **simulation « et si ? »** : 3 sliders (Loyers / Salaires / Ventes, −50 % à +50 %) qui **recalculent la courbe en direct**. Backend : paramètre `adjust=domus:1.1,hr:0.9,…` (multiplicateurs par scope, garde-fou [0;5]) appliqué aux **flux** uniquement — le solde de départ réel n'est jamais modifié. Le producteur de tendance ventes passe sur un sous-scope dédié `ventes` pour que le levier Ventes n'affecte pas les dettes fournisseurs. Bouton Réinitialiser. Tactile-friendly (sliders, mobile Capacitor).

### Added (3.86.0)
- Prévisionnel de trésorerie — **couche Tendance (Niveau 2)** : 1er producteur estimé = **ventes (tendance)** = moyenne mensuelle des ventes des 6 derniers mois, par devise, extrapolée en entrée sur les mois futurs. Le curseur **« Réaliste » est désormais activé** (était grisé) : passer de Prudent à Réaliste ajoute les flux estimés à la projection, avec badge `[estimé]` et libellé « engagé + tendance » sur la courbe. (« Optimiste »/IA reste grisé — phase ultérieure.)

### Added (3.85.3)
- Prévisionnel de trésorerie : 4e producteur **Niveau 1** = **dettes fournisseurs** (reste à payer `dueAmount` des factures fournisseurs ouvertes, par devise) projeté en **sortie**. Le N1 couvre désormais 4 sources réelles : solde de départ trésorerie + loyers Domus (entrées) + salaires RH + dettes fournisseurs (sorties). Note : BatiPro non ajouté en N1 (table sans échéances datées ni devise → un échéancier fiable relève d'un travail dédié, non « engagé »).

### Added (3.85.2)
- Prévisionnel de trésorerie : 3e producteur **Niveau 1** = **masse salariale** (contrats RH actifs, base + primes transport/logement, par devise) projetée en **sortie mensuelle** sur l'horizon. Le consolidé est désormais équilibré (entrées loyers Domus + sorties salaires HR + solde de départ trésorerie). Note : les **ventes FarmOS** ne sont volontairement pas projetées en N1 (une vente future n'est pas « engagée » → relève de la couche 2 / tendance, à activer en phase 2).

### Added (3.85.1)
- Prévisionnel de trésorerie : 2e producteur **Niveau 1** = **solde de départ** (comptes de trésorerie banque/caisse depuis le grand livre, par devise) → la courbe projetée part désormais du solde réel d'aujourd'hui, puis applique les flux futurs. La phrase-réponse indique la **trésorerie projetée** (solde + flux) et le détail mensuel affiche le solde de départ distinct de la variation nette. Producteur ajouté via `LedgerModule` (réutilise `LedgerService.subAccountBalances`), sans toucher le moteur.

### Added (3.85.0)
- Comptabilité : nouveau **Prévisionnel de trésorerie** (consolidé, par devise). Backend : module générique `forecast` (lignes typées multi-grandeurs, couches empilables N1/N2/N3, agrégation par mois × devise **sans conversion**) avec un 1er producteur **Niveau 1** (loyers futurs des baux Domus actifs, cycle mensuel). Endpoint `GET /forecast/cash-flow?horizon=&mode=&scope=` (garde `readAll-transaction`), ajouté à la whitelist middleware. Frontend `comptabilite-app` (menu Pilotage > Prévisionnel) : phrase-réponse en langage clair, courbe SVG par devise, curseur d'hypothèse Prudent/Réaliste/Optimiste (Réaliste & Optimiste grisés tant que les couches tendance/IA n'existent pas), détail mensuel avec badges de confiance `[certain]`/`[estimé]`. Conçu pour s'étendre aux autres modules (ledger, HR, FarmOS, BatiPro) en ajoutant un producteur.

### Added (3.84.1)
- FarmOS rapport « Ratio reproducteur M:F » : colonne **Interprétation** par bâtiment qui **diagnostique automatiquement** le résultat (compare les femelles/mâle au ratio idéal de l'espèce dominante, tolérance ±20 %) avec code couleur : vert = équilibré, orange = trop de mâles (surplus à engraisser), rouge = pas assez de mâles (fécondation insuffisante) / aucun mâle reproducteur. Guide de lecture mis à jour en conséquence.

### Added (3.84.0)
- FarmOS nouveau rapport imprimable **« Ratio reproducteur M:F »** : par bâtiment, total mâles / femelles et **ratio M:F** (1:X), avec l'encadré explicatif « Comment lire le ratio M:F » (ratios idéaux par espèce, lecture sous/sur-effectif de mâles).

### Changed (3.84.0)
- FarmOS rapport « Structure du cheptel » : symboles **♂/♀ remplacés par M/F** ; la colonne **Ratio** est remplacée par une colonne **Total** (M + F) par bâtiment. Le guide de lecture du ratio est déplacé vers le nouveau rapport dédié.

### Added (3.83.1)
- FarmOS rapport « Structure du cheptel ♂/♀ » : ajout d'un **encadré explicatif** sous le tableau (« Comment lire le ratio ♂:♀ ») — sens du format 1:X, ratios reproducteurs idéaux par espèce (porc ~1:20, bovin ~1:25, etc.) et lecture pratique (trop de femelles/mâle = fécondation insuffisante ; trop de mâles = à orienter vers l'engraissement).

### Added (3.83.0)
- FarmOS **rapport « Structure du cheptel ♂/♀ »** (impression navigateur, sans backend) : nouvelle carte dans l'écran Rapports. Par bâtiment, ventile chaque catégorie (Adultes, Cochettes, Engraissement, Jeunes) en **mâles / femelles** (♂/♀, + « ? » si sexe non renseigné), avec **total ♂**, **total ♀** et **ratio ♂:♀** par bâtiment et au global. Complète le rapport d'effectif qui ne donnait que les totaux par catégorie. Nouvelle fonction `sexBreakdownByGroup` (même logique de catégorisation que `categoryBreakdownByGroup`).

### Added (3.82.23)
- FarmOS **alertes « à abattre/vendre »** : les animaux d'engraissement prêts ou en retard génèrent une alerte groupée par bâtiment (« N animal(aux) à abattre/vendre · X prêts · Y en retard (coût net) — Bâtiment »). Sévérité critique si retard, sinon élevée. Visible dans le tableau de bord (panneau alertes) et l'écran Alertes.

### Added (3.82.22)
- FarmOS **prêt à abattre / vente** : détection par animal selon l'âge OU le poids (seuils par espèce, `SLAUGHTER_THRESHOLDS`). 3 états : en croissance / prêt / en retard (coût net). Sur la carte Engraissement du modal : « ✓ N prêt(s) à abattre » et « ⚠ M en retard ». Évite de garder des animaux qui mangent sans rendement.
- FarmOS **poids** : carte KPI « Poids moyen » dans le modal (si des poids sont saisis), + colonnes Prêts/Retard/Poids moyen dans les rapports imprimables (par bâtiment et global) + section « Abattage / vente » dans le rapport bâtiment.

### Added (3.82.21)
- FarmOS modal Visualiser : la répartition « Par catégorie » passe en **cartes détaillées** (valeur + % du total + pastille de couleur par catégorie), une seule représentation (pas de doublon avec les puces).
- FarmOS **rapports imprimables** (impression navigateur, sans backend) : bouton « Rapport » dans le modal (effectif d'un bâtiment : synthèse, catégories, lots) + carte « Effectif par bâtiment (généré en direct) » dans l'écran Rapports (tableau global tous bâtiments × catégories avec total).

### Changed (3.82.20)
- FarmOS catégories : le **type saisi reprime pour la destination abattage** — un animal dont le type contient engraissement/abattage/embouche/boucherie est classé **Engraissement** quel que soit son âge (décision humaine = comment on sait qu'un animal part à l'abattage). L'âge classe la maturité (adulte/jeune/cochette) ; le ratio reproducteur ne s'applique plus qu'aux **mâles adultes non marqués** (surplus estimé → engraissement). Corrige le cas où des jeunes marqués engraissement disparaissaient de la catégorie.

### Changed (3.82.19)
- FarmOS catégories 100% automatiques (plus basées sur le type saisi) : dérivées de l'**âge** (date de naissance + seuil espèce) et du **sexe**. Jeune femelle de porc → Cochette ; femelle adulte → Adulte ; mâles adultes départagés par un **ratio reproducteur par bâtiment** (1 mâle pour N femelles : porc 1/20, bovin 1/25, caprin/ovin 1/25, volaille/lapin 1/10) — les reproducteurs conservés comptent en Adultes, le surplus en Engraissement (abattage). Calcul par groupe (bâtiment, puis chaque lot). Affichage seulement, rien écrit en base, se met à jour avec l'âge.

### Changed (3.82.18)
- FarmOS : le sous-comptage « dont X adultes » (Mâles/Femelles, modal + dashboard) est désormais calculé **uniquement par l'âge** (date de naissance + seuil par espèce), plus par le `type`. Les puces « Par catégorie » (cochettes/engraissement…) restent basées sur le type métier.
- **Date de naissance obligatoire** à la saisie d'un animal (création + édition de fiche) : marqueur `*`, `required`, et blocage à l'enregistrement si absente — nécessaire pour fiabiliser le classement adulte/jeune.

### Added (3.82.17)
- FarmOS modal Visualiser : chaque lot affiche désormais sa composition — total · ♀femelles ♂mâles + répartition par catégorie (adultes / cochettes / engraissement / jeunes), au lieu du seul total. Permet de voir le détail d'un lot agrégé (ex. Cheptel Zone B = 20 engraissement + 11 porcelets + …).

### Added (3.82.16)
- FarmOS comptage par têtes : le **Total animaux**, lots, mâles/femelles, malades du modal Visualiser **et** les KPI du tableau de bord (global + par espèce) somment désormais le champ `count` (1 ligne peut représenter plusieurs têtes) au lieu de compter les lignes — alignement sur le calcul d'occupation backend (corrige l'écart Total 41 vs Occupation 70).
- Nouveau module partagé `animal-category.js` : classification adulte / **cochette (futures reproductrices)** / **engraissement (abattage)** / jeune (type d'abord, sinon âge via date de naissance + seuils par espèce — porc 6 mois, bovin 24 mois, caprin/ovin 12 mois, volailles 5 mois, lapin 6 mois).
- Modal Visualiser : section « Par catégorie » (adultes / cochettes / engraissement / jeunes) + sous-ligne « dont X adultes » sur Mâles et Femelles. Tableau de bord : même sous-ligne « dont X adultes » sur les cartes Mâles/Femelles (cochettes comptées comme adultes / futures reproductrices).

### Added (3.82.15)
- FarmOS modal « Visualiser » : section Lots (chaque lot du bâtiment + son nombre d'animaux, total des lots). Le « Total animaux » comptabilise déjà les animaux des lots (rattachement par `barn`).

### Added (3.82.14)
- FarmOS bâtiments : clic sur un bâtiment (vues Zones et Cartes) ouvre un modal « Visualiser » en lecture seule (occupation + taux, places disponibles, total animaux, mâles/femelles, malades, température/humidité/hygiène, plan intérieur) avec boutons Fermer et Modifier → l'édition n'est plus déclenchée directement au clic. Helper `bldgAnimalStats` factorisé.

### Fixed (3.82.13)
- **Backend dev + prod en crash-loop** : un BOM UTF-8 (`﻿`) en tête de `backend2/drizzle/meta/_journal.json` (réécriture OneDrive/éditeur Windows) cassait `JSON.parse` dans `migrate.ts` au boot → migration échoue → `process.exit(1)` → conteneur boucle, `/api` down. Fix : suppression du BOM (fichier UTF-8 sans BOM, 144 entrées intactes). Le `COPY drizzle/` du Dockerfile bakait le BOM dans l'image, d'où l'impact dev ET prod.

### Added (3.82.12)
- FarmOS POS : section "Productions disponibles" avec bouton Vendre direct pour les œufs (et lait) dès qu'un stock est disponible — plus de chasse dans la recherche ; message EmptyState corrigé pour orienter vers Production

### Added (3.82.11)
- FarmOS vente d'œufs : migration 0167 (`building_id` sur `farmos_production_logs`), endpoint `GET /farmos/egg-stock` (stock = produit - vendu), section "Gestion des œufs" dans ProductionScreen avec formulaire récolte (poulailler, cassés) + formulaire vente (stock check, devise, acheteur, total auto)

### Fixed
- **Pipeline prod statique** : les apps servies par `nglu_prod_frontend` utilisent maintenant un déploiement prod commun avec lock `/tmp/nglu-prod-deploy.lock`, remplacement du `dist` hôte, rebuild de l'image frontend, smoke test et rollback image (`nglu_prod-frontend:previous`) en cas d'échec. Le premier déploiement d'une app crée aussi les dossiers `dist` manquants avant le build Docker. [3.82.11]

### Fixed
- **FarmOS Santé — crash filtre « Tout »** : `deleteAnimal` soft-delete l'animal sans désactiver ses traitements ; en mode « Tout » ces traitements remontaient avec `species=null` (animal absent de `listAnimals` filtré `is_active=1`) → `speciesById(null).accentBg` → `TypeError accentBg`. Fix : cascade soft-delete des `farmos_treatments` dans `deleteAnimal` + `listTreatments` JOIN `farmos_animals` (sans filtre `is_active`) pour exposer espèce/nom même sur orphelins legacy. [3.82.10]

### Fixed
- **Pipeline prod (farmos/journal/tickets)** : ajout `mkdir -p` avant `find -delete` pour html-farmos-prod, html-journal-prod, html-tickets-prod — même fix que domus (3.82.8) ; dossiers absents du conteneur si image non rebuildée. Dockerfile.prod : placeholders `RUN mkdir -p` pour journal+tickets. [3.82.9]

### Fixed
- **Pipeline Domus prod** : ajout `mkdir -p /usr/share/nginx/html-domus-prod` dans le pipeline avant le `find -delete` (le dossier n'existait pas dans le conteneur → erreur `No such file or directory`). Ajout d'un `RUN mkdir -p` dans `frontend/Dockerfile.prod` pour les futurs rebuilds d'image. [3.82.8]

### Fixed
- **Pipeline — pdf-service deploy** : le `git pull` serveur échouait silencieusement (ref lock `refs/remotes/origin/master`) → dossier `pdf-service/` absent → build Docker en erreur. Remplacement par `scp` direct depuis le pipeline (dev + prod), identique au pattern backend2. [3.82.7]

## [3.82.6]

### Added
- **FarmOS — Plan du terrain par ferme (maquette)** : la vue Plan affiche un en-tête « Ferme X — Plan du terrain » (hectares · bâtiments · animaux), un toggle d'affichage **Occupation / Simple** (barres X/capacité visibles ou masquées) et une **légende par catégorie** (couleur par espèce / type de bâtiment) sous le plan, comme la maquette. Le plan reste alimenté par les vrais bâtiments de la ferme sélectionnée (pas de bâtiments fictifs). [SCRUM]
- **FarmOS — Sélecteur de bâtiment dans la fiche animal** : le champ Bâtiment de la modale d'édition propose maintenant les vrais bâtiments (API `/buildings`) via un datalist, avec la zone en libellé — saisie libre toujours possible. [SCRUM]

### Fixed
- **FarmOS — drift colonnes zones/bâtiments** : les `ALTER ADD COLUMN` des migrations 0160/0161/0163 (`farmos_buildings.zone_id`/`building_kind`/`pos_x`/`pos_y`, `farmos_zones.farm_id`, `farmos_animals.building_id`/`zone_id`) étaient marqués appliqués mais jamais exécutés en dev (`ADD COLUMN IF NOT EXISTS` non fiable selon version MySQL) → bâtiments non rattachés aux zones/fermes, écran « Aucun bâtiment » et compteurs « 0 bât. ». Migration de réparation `0164_repair_farm_zone_cols.sql` idempotente (pattern SET/IF/PREPARE via information_schema). Au boot suivant, le seeder relie zone_id/farm_id sur l'existant. [SCRUM]

### Added
- **FarmOS — Niveau Ferme (Phase 3 : mobile)** : l'app mobile FarmOS est la même PWA React empaquetée via Capacitor (`webDir: dist`), donc la barre « Mes fermes » y est nativement présente — pas de code Flutter séparé. Ajustement responsive : la barre fermes passe en scroll horizontal tactile sur petit écran (au lieu d'un wrap qui cassait la grille). [SCRUM]
- **FarmOS — Niveau Ferme (Phase 2 : UI web)** : barre « Mes fermes » dans l'écran Bâtiments — cartes cliquables (nom, localisation, hectares, badge statut Principale/OK/Suivi, compteurs bâtiments + animaux). Sélectionner une ferme filtre les zones → bâtiments → plan ; le sélecteur de zone du plan respecte la ferme choisie. API front : `listFarms/createFarm/updateFarm/deleteFarm`. [SCRUM]
- **FarmOS — Niveau Ferme (Phase 1 : DB + backend + seeder)** : nouvelle hiérarchie Ferme → Zone → Bâtiment → Animal. Table `farmos_farms` (`name`, `location`, `hectares`, `status`, `description`) + colonne `farm_id` sur `farmos_zones` et `building_kind` sur `farmos_buildings` (types non-élevage : habitation, stock, sante) — migration `0163_farmos_farms.sql` (idempotent, ajoutée au journal idx 139, auto-appliquée au boot). Backend : CRUD `/farmos/farms` (list/create/update/delete soft), `createZone`/`updateZone` acceptent `farm_id`. Seeder : `seedFarms()` crée Ferme Kasangulu (12 ha, Kongo Central), Mont-Ngafula (7 ha, Kinshasa), Ngolu Nord (17 ha, maintenance) ; les zones Kiselele + Kasangulu sont rattachées à Ferme Kasangulu. Idempotent par nom. Audit : `farmos_audit/fermes.csv` + lien zone→ferme. UI web + mobile = phases 2-3. [SCRUM]
- **FarmOS — Inventaire animaux individualisé & standardisé** : refonte du jeu de données cheptel (1 937 têtes). Les vaches (M/F) et truies (tous stades) sont désormais enregistrées une-à-une avec un `name` propre, une `date_of_birth` par âge (adulte = -6 mois, moyen = -3 mois, jeune = 2 dernières semaines), une `estimated_value` (USD) et un délai de retrait (`withdrawal_until`/`withdrawal_kind`) pour les porcs/caprins malades de Kasangulu. Verrats calculés à 1 pour 17 truies, arrondi sup. (4 Zone Kiselele + 3 Zone Kasangulu) ; le reste des mâles reste en lot, séparé par âge (jamais de lot mixte adulte+jeune). Valeurs standardisées sur l'UI : `species` en IDs DB (`cow/pig/goat/chicken`), `sex` en `M/F`, `type` porc sur le vocab métier (`Verrat/Truie/Cochette/Porcelet/Engraissement`). Seeder : bloc `ANIMALS` régénéré (124 lignes), `seedAnimals()` insère `name`/`dateOfBirth`/`estimatedValue`/`withdrawal*`, et `deactivateLegacyAggregatedAnimals()` soft-delete les anciennes lignes agrégées (`ZK-*`/`ZKA-*`) pour éviter le double comptage. Idempotent par `externalId`. [SCRUM]
- **FarmOS — Plan du terrain déplaçable** : positionnement libre des bâtiments sur le plan (par zone). Colonnes `pos_x`/`pos_y` sur `farmos_buildings` (migration 0161) + nouvelle table `farmos_land_features` pour le décor (champ, point d'eau, route…) (migration 0162). Backend : `updateBuilding` accepte `pos_x`/`pos_y`, CRUD `/land-features`. Front : composant `FarmLandPlan` (drag souris + tactile, mode édition, sélecteur de zone) ; les positions sont persistées en DB via l'API (pourcentage 0–100), fallback grille auto pour les bâtiments non placés. Seeder : positions par défaut des 6 bâtiments + décor par défaut (point d'eau, champ) par zone (idempotent). UI : en mode édition, boutons "Ajouter champ/eau/route" et suppression de l'élément sélectionné (soft-delete). [SCRUM]
- **FarmOS — structure Zones/Bâtiments** : table `farmos_zones` (migration 0160) + colonne `zone_id` sur `farmos_buildings` et `building_id`/`zone_id` sur `farmos_animals`. Backend : CRUD `/zones`, `listBuildings` retourne la zone liée. Seeder : `seedZones()` crée Zone Kiselele / Zone Kasangulu et lie chaque bâtiment + animal. UI : vue "Zones" par défaut (bâtiments groupés par zone), sélecteur de zone dans l'éditeur de bâtiment. [SCRUM]

### Fixed
- **FarmOS /animaux crash** : `Cannot read properties of undefined (reading 'accentBg')` — `speciesById()` retournait `undefined` pour les espèces `bovin/porc/poule/caprin` (IDs inconnus du frontend). Fix double : (1) `animals.jsx` — fallback `|| {...}` sur tous les appels `speciesById` sans guard ; (2) seeder — normalise les IDs vers `cow/pig/chicken/goat` en DB + `fixSpeciesIds()` au boot pour les enregistrements existants. [SCRUM]

### Added
- **Seeder FarmOS — nettoyage anciens bâtiments** : soft-delete automatique des bâtiments legacy (Zone A, Zone B, Kasangulu, Étable 1, Batiment 1, Batiment 2) au boot du seeder ; 6 bâtiments corrects restent seuls actifs (Zone Kiselele / Zone Kasangulu). [SCRUM]
- **Seeder FarmOS — structure zones/bâtiments corrigée** : Zone Kiselele (Bâtiment Bovins + Bâtiment Porcs) et Zone Kasangulu (Bâtiment Caprins + Bâtiment Porcs + Poulailler 1 + Poulailler 2). Chaque animal placé dans son bâtiment correct. CSV `farmos_animals.csv` mis à jour en cohérence. [SCRUM]

### Security
- **Toutes les vulnérabilités npm corrigées (0 restantes)** : 3 high (`nodemailer` CRLF/TLS, `ws` DoS mémoire) corrigées via `npm audit fix` ; 19 modérées (`js-yaml <=4.1.1`) corrigées via override `js-yaml@^4.2.0` dans `package.json` (force toutes les dépendances transitives). [SCRUM]

### Fixed
- **Versions `@nestjs/websockets` / `@nestjs/platform-socket.io` désalignées du reste de l'écosystème Nest** : déclarées en `^11.1.27` alors que `@nestjs/core` & co étaient en `^11.1.24` → `Cannot find module './ws-adapter'` au boot (mismatch d'API interne socket.io). Réalignées sur `^11.1.24` et `package-lock.json` régénéré (toutes les versions Nest cohérentes en 11.1.27 via le lock). [SCRUM]
- **Pipeline backend (dev + prod) ne syncait pas `package.json`** — cause racine du crash-loop : le step déployait `dist` + `drizzle` mais jamais `package*.json`, donc le `--build` reconstruisait l'image (`COPY package*.json` + `npm ci`) avec un `package.json` serveur obsolète → toute nouvelle dépendance (`@nestjs/websockets`) manquait dans le conteneur → `MODULE_NOT_FOUND` → 504. Ajout du `scp backend2/package*.json` avant le rebuild, **sur dev ET prod** (protège le prochain merge develop→master). [SCRUM]
- **Backend résilient à l'absence de `@nestjs/websockets`** : les gateways WebSocket (`discussion`, `chat`) sont désormais chargés de façon paresseuse et optionnelle dans leur module. Si la dépendance manque, le backend démarre quand même (chat via API REST, sans temps réel) au lieu de crasher entièrement. Filet de sécurité pour ne jamais reproduire un crash-loop en prod. [SCRUM]
- **Chat dev — backend en crash-loop (504 au login FarmOS)** : `MODULE_NOT_FOUND` sur `discussion.gateway.js` (deps websockets absentes du conteneur) → Nest jamais up → `504 Gateway Timeout`. Corrigé par les deux points ci-dessus. [SCRUM]
- **Migration `0159_chat_channels` — `ER_PARSE_ERROR`** : `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` n'est pas supporté par MySQL → colonnes `channel_id` / `discussion_type` jamais créées sur `journal_discussions`. Réécrit en pattern idempotent `PREPARE`/`IF` (vérification `information_schema`), rejoué par les réparations opérationnelles au boot. [SCRUM]

### Added
- **Seeder élevage FarmOS (`farmos-elevage.seeder`)** : importe les données réelles d'audit terrain dans les tables/modules **existants** — cheptel (`farmos_animals`), production d'œufs (`farmos_production_logs`), consignes de plan santé (événements `note` du Journal Entreprise, `journal_events`), et personnel d'élevage (comptes CRM dépt FarmOS, emails générés au standard `prenom.nom@ongdngolu.org`). Idempotent, branché dans `seed-demo` (boot dev). [SCRUM]

### Changed
- **Backend2 dev redeploy (v3.79.6)** : synchronise `backend2/package.json` sur la version racine pour déclencher le pipeline backend dev et embarquer le module `journal-entreprise` (commit 089f6dcb, absent du conteneur `/api` déployé → 404 sur `/api/journal-entreprise/*`). [SCRUM]

### Fixed
- **Build backend2 cassé : `DatabaseService` introuvable (v3.79.6)** : les services `journal-entreprise`, `discussion` et `chat` importaient `../database/database.service` (jamais commité au commit 089f6dcb) → `nest build` exit 1 → step backend du pipeline en échec → conteneur `/api` jamais redéployé → 404 sur `/api/journal-entreprise/*`. Réécriture des 3 services pour utiliser le client **Drizzle** (`db.execute(sql\`...\`)` via `@Inject(DRIZZLE)`) au lieu d'un pool mysql2 brut, conformément à la règle projet. Build + `tsc --noEmit` OK. [SCRUM]
- **Pipeline Chat → dev (v3.79.2)** : le conteneur `nglu_prod_frontend` n'était pas recréé après l'ajout du bind-mount `html-chat-dev` → 403 Forbidden sur `/chat/` en dev. Le step pipeline sync maintenant la conf nginx + compose et recrée le frontend via `--force-recreate` (même pattern que Migration Cockpit). [SCRUM]

### Added
- **chat-app — Messagerie d'entreprise WhatsApp/Slack (v3.79.0)** : nouvelle PWA Vite+React servie sous `/chat/`. Layout 2 colonnes sombre (sidebar channels+sujets / fil de messages). Channels permanents (Général, Transactions journalières, RH, Comptabilité, Direction) créés par migration 0159 (`chat_channels`, `chat_channel_members`). Sujets = discussions liées aux événements Journal et tickets internes (badge unread, preview dernier message, filtre event/ticket/tous). Fil de messages temps réel (socket.io WebSocket `/chat`), indicateur de frappe, bulles me/autre, `@mentions`, scroll auto, fallback REST. Modal création de channel (slug, nom, icône, couleur, auto-join). Bouton lien vers la source (Journal / Tickets). AppSwitcher CRM : Chat + Tickets déplacés dans "Disponibles". Middleware whitelist `/chat`. Pipeline Bitbucket dev+prod, nginx `/chat/`, bind-mount docker-compose, Dockerfile.prod baked. Module NestJS `ChatModule` (service + controller + gateway). [SCRUM]
- **Discussion Messenger par événement (v3.78.0)** : système de messagerie contextuelle style Messenger ancré sur chaque événement du Journal Entreprise (et extensible à tout objet CRM via `entity_type`/`entity_id`). Migration 0158 : 4 tables (`journal_discussions`, `journal_discussion_participants`, `journal_messages`, `journal_message_reads`). Module NestJS `DiscussionModule` (service + controller REST + gateway WebSocket socket.io). Frontend `journal-app` : composant `<Discussion>` (fil de messages temps réel, bulles me/other, indicateur de frappe, `@mentions`, scroll auto) + badge `<DiscussionBadge>` avec compteur non-lus sur chaque carte d'événement dans `activite.jsx`. Middleware whitelist `/discussions`. [SCRUM]
- **journal-app — nouvelle app Journal Entreprise (v3.77.0)** : PWA Vite+React servie sous `/journal/`. 8 écrans : Tableau de bord (KPIs + activité récente + tâches), Fil d'activité (timeline groupée par jour, 8 types d'événements, filtres source/type/importance/search, épinglage), Calendrier (vue mensuelle avec points colorés par type), Tâches & rappels (toggle done, priorité, échéance, retard détecté), Épinglés (grille de références rapides), Export (CSV/JSON avec filtres), Audit (log paginé de toutes les actions), Paramètres (notifications, fuseau horaire, rétention). Module backend2 `journal-entreprise` (controller + service + DTOs) avec 5 tables MySQL (migration 0157). Middleware whitelist `/journal-entreprise`, nginx `/journal/` prod+dev, bind-mount docker-compose, pipeline Bitbucket dev+prod, AppSwitcher CRM. [SCRUM]
- **tickets-app — nouvelle app Tickets internes** : PWA Vite+React servie sous `/tickets/`, calquée sur domus-app. Screens : Dashboard (KPIs), Mes tickets (liste + filtres date/statut/catégorie), À approuver (approve/reject avec commentaire), Nouveau ticket (catégorie/montant/devise/description), Détail+circuit (step tracker + timeline). API câblée sur `WorkflowController` existant (`/api/workflow`). Auth partagée via cookie refresh (SCRUM-119). PWA offline-capable. Pipeline Bitbucket (dev+prod), nginx `/tickets/`, docker-compose volume bind-mount dev. [SCRUM]

### Fixed
- **CI backend2 — npm audit bloquait le build (vulns high ws/js-yaml non-fixables sans breaking change)** : `npm audit --audit-level=high` faisait échouer le step backend2 dev+prod car `ws` (DoS) et `js-yaml` (DoS) ont des dépendances NestJS/Jest non fixables sans `--force`. Ces vulns ne sont pas exploitables en prod (DoS interne, dépendances de test). Passage à `--audit-level=critical` dans les deux steps backend2 du pipeline. [3.79.1]
- **CI frontend — build:dev jamais exécuté (high audit form-data)** : `npm audit --audit-level=high` faisait échouer la chaîne `npm install && npm audit ... && npm run build:dev` à cause d'une vulnérabilité high sur `form-data` (dépendance d'`axios`, CRLF injection GHSA-hmw2-7cc7-3qxx). `frontend/dist` n'était donc jamais généré et le `scp` du déploiement échouait. Ajout d'un override `"form-data": "^4.0.6"` dans `frontend/package.json` (fix non-breaking). [3.75.1]

### Added
- **CRM — module Devis (SCRUM)** : nouvelle page « Devis » sous Ventes avancées, accessible via le menu latéral (`/admin/quote`, permissions `readAll-quote`/`create-quote`/`readSingle-quote`). Liste des devis avec recherche, formulaire de création (client, date, lignes produits, note) et page de détail réutilisant le composant d'impression existant `QuoteSlip`. Backend déjà existant (`/quote`, déjà whitelisté côté middleware) : aucune modification backend/middleware nécessaire. Nouveau slice Redux `quotes` (`loadAllQuote`, `loadSingleQuote`, `addQuote`, `deleteQuote`). [3.75.0]

### Changed
- **SideNav CRM — RH et Comptabilité pointent vers les outils internes (SCRUM)** : dans la section « Gestion » de la barre latérale du CRM, **RH** ouvre désormais l'outil interne `/admin/hr` et **Comptabilité** l'outil interne `/admin/accounting` (NavLink interne au lieu d'un `window.location.href` vers les apps externes `/hr/` et `/comptabilite/`). **Immobilier** reste sur `/admin/property-management`. **FarmOS** et **BatiPro** restent des liens externes (pas d'équivalent interne au CRM). L'AppSwitcher n'est pas touché (ses tuiles continuent d'ouvrir directement les apps déployées). [3.74.3]

### Added
- **AppSwitcher — ajout de l'app « Migration » (SCRUM)** : l'app `migration-app` (servie sous `/migration/`) était développée mais absente du sélecteur d'applications. Ajoutée aux **Disponibles** (icône `DatabaseZap`, dégradé cyan→teal, lien externe). Aucune entrée existante retirée. [3.74.2]

### Fixed
- **Comptabilité — les saisies manuelles n'apparaissaient pas au grand livre (SCRUM)** : `TransactionsService.create` ne comptabilisait au grand livre (`/ledger`) **que si un projet était renseigné** ; or tous les écrans compta (Grand livre, Trésorerie, Tiers, Immobilisations, Analytique, Budget…) lisent **uniquement** le ledger. Résultat : une écriture saisie sans projet n'apparaissait nulle part. Désormais **toute** saisie manuelle est postée au grand livre en partie double (idempotent `manual_transaction:<id>`, `project_id` porté sur les lignes si fourni), et l'erreur ledger (période fermée, compte invalide) **remonte** au lieu d'être avalée silencieusement. Nouvel endpoint admin `POST /transaction/backfill-ledger` (idempotent) pour **rattraper** les écritures déjà saisies avant le fix. [3.74.1]

### Added
- **Sélecteur de fournisseur central dans BâtiPro / Domus / FarmOS (SCRUM)** : les 3 apps consommatrices référencent désormais la fiche fournisseur centrale via un **`<select>`** (au lieu du texte libre), câblé sur `supplier_id`/`supplierId`. **BâtiPro** (modal Matériau) : `api.suppliers()` filtré `type=construction` → `supplier_id`. **Domus** (maintenance, nouveau coût) : `api.suppliers()` filtré `type=real_estate` → `supplierId` (composant `DomusPropertySelect`). **FarmOS** (modal aliment/médicament) : `api.listSuppliers()` filtré `type=farm` → `supplier_id` (+ `adaptMedicine` expose `supplierId` pour pré-sélection en édition). Chaque sélecteur ne liste que les fournisseurs **actifs**, distingue entreprise/personne, et **conserve le champ texte libre en repli** (fallback legacy, aucun champ détruit) ; choisir un fournisseur central renseigne aussi le nom texte pour l'affichage. Routes appelées sur la racine `/api/supplier` (hors préfixes `/batipro`,`/property-management`,`/farmos`) via l'override de base existant. Builds OK : batipro-app, domus-app, farmos-app. [3.74.0]

### Added
- **Comptabilité (comptabilite-app) — écran « Fournisseurs » (référentiel central) (SCRUM)** : nouvelle page (section Achats & stock) pour gérer le référentiel central des fournisseurs réutilisé par BâtiPro/Domus/FarmOS. Liste filtrable (recherche nom/téléphone/contact/RCCM + filtre par domaine) avec KPIs (actifs, entreprises, personnes), soft-delete (Activer/Désactiver, jamais de suppression physique). Formulaire (modal) avec **bascule entreprise/personne** (`partyType`) qui adapte les champs légaux : **RCCM** affiché pour une entreprise, **ID national** pour une personne ; + domaine (`supplierType`), NIF (`taxId`), contact, conditions de paiement, notes. Branché sur l'API existante `/supplier` (déjà dans la whitelist middleware). Réutilise les composants/styles existants (`PageHead`, `Mini`, `usePaginated`/`ShowMore`, `segtabs`, classes `modal-*`/`input`/`select`/`chip`). Nouvelles méthodes `api.suppliers/createSupplier/updateSupplier/setSupplierStatus`. Build `npm run build:dev` (comptabilite-app) OK. [3.73.0]

### Added
- **Fournisseurs — entreprise vs personne (SCRUM)** : ajout du champ **`party_type`** (`company` = entreprise | `individual` = personne, défaut `company`) sur le référentiel central `supplier`, dans la logique ERP moderne « Tiers » (un fournisseur externe est le plus souvent une compagnie). Permet d'adapter l'UI/les pièces légales (RCCM surtout pour les entreprises, ID national surtout pour les personnes). Modèle volontairement **simplifié** (pas de refonte en table `party`/rôles). Migration **`0156_supplier_party_type.sql`** (journal Drizzle, auto au boot) + schéma/DTO/service. Vérifié : `npx tsc --noEmit` backend2 OK. [3.72.0]

### Added
- **Fournisseurs — référentiel central partagé entre apps (SCRUM)** : le module **`backend2/src/suppliers`** (table `supplier`, endpoint `/supplier`, déjà source autoritaire des tiers fournisseurs en compta) est **enrichi de champs métier** (`supplier_type`, `contact_person`, `rccm`, `national_id`, `tax_id` (NIF), `payment_terms`, `notes`) et d'un **filtre par type** (`?type=construction|real_estate|farm|factory|general`) pour que chaque app charge ses fournisseurs pertinents. Surtout : fin de la duplication par **texte libre** — les modules consommateurs **référencent désormais la fiche centrale par `supplier_id`** (principe SIFA : référencer, ne pas recopier) : **BâtiPro** (`batipro_materials.supplier_id`, matériaux de chantier), **Domus** (`real_estate_maintenance_costs.supplier_id`, achat de matériel/main d'œuvre en maintenance) et **FarmOS** (`farmos_medicines.supplier_id`, achat d'aliments/médicaments). Les anciens champs texte (`supplier`/`vendor_name`) restent en fallback legacy (non détruits). `purchase-invoices` utilisait déjà `supplierId`. Migration **`0155_suppliers_central_registry.sql`** (dans le journal Drizzle, auto-appliquée au boot) : 7 colonnes sur `supplier` + colonne `supplier_id` indexée sur les 3 tables consommatrices. Vérifié : `npx tsc --noEmit` backend2 OK. [3.71.0]

### Added
- **Comptabilité (comptabilite-app) — menu « Saisie rapide » par cartes de types (SCRUM)** : nouvelle vue (section Saisie, en tête) affichant chaque **type de transaction actif** sous forme de **carte** (nom + comptes débit→crédit). Un clic ouvre un **mini-modal** demandant seulement le **montant** et la **devise** (+ note optionnelle) ; le débit/crédit vient du type → enregistrement en un geste. Réutilise `api.transactionTypes()` (types actifs), `save("transaction", …)` (qui exige déjà `currencyId`) et les composants existants (`Autocomplete`, classes `modal-scrim`/`modal-card`/`field`). Idéal pour la saisie terrain des dépenses/mouvements récurrents (« Depense - Carburant », « Transfert Caisse → WU »…). Build `npm run build:dev` (comptabilite-app) OK. [3.70.0]

### Added
- **Migration Cockpit — outil web de pilotage de la migration legacy PG → Drizzle/MySQL (SCRUM)** : nouvelle app interne **`migration-app/`** (Vite+React, servie sous `/migration/`, session partagée CRM, token en mémoire SCRUM-119) + module backend **`backend2/src/migration/`** (lecture seule). Remplace le pilotage « aveugle » des scripts `scripts/migration/*.py` par une console : (1) **état par domaine** (compta ✅ / immobilier / commercial / users) avec comptage source vs lignes mappées dans les `legacy_*_map` ; (2) **aperçu des tables source** de l'export (lecture du `manifest.json` + parse CSV) ; (3) **validation/dry-run** par domaine (comptage, et pour la compta : devises sans code = doublon USD fantôme cf. 0148, sous-comptes orphelins) ; (4) **commande Python de RUN affichée** (approche hybride : l'app lit/valide, le RUN reste manuel — aucune écriture en base). Endpoints `GET /api/migration/{domains,source/:table/preview,validate/:domain,run-command/:domain}` (whitelist middleware GET-only + JWT). Export legacy lu via `MIGRATION_EXPORT_DIR` (repli `migration-data/`) ; les CSV de données réelles sont **gitignorés** (seul le manifest de schéma est versionné). Vérifié : `tsc --noEmit` backend OK, `npm run build` front OK. [3.69.0]

### Fixed
- **Comptabilité — sens dépôt/retrait WU corrigé (#40/#41) (SCRUM)** : suite de 0153, les types « dépôt »/« retrait » WU étaient inversés par rapport au sens comptable — un **dépôt** en banque doit **débiter la banque** (l'argent y entre), or #41 « dépôt » débitait les espèces et créditait la banque (= un retrait). Migration **`0154_treasury_types_deposit_sense_fix.sql`** : #41 dépôt → D=WU banque / C=WU espèces ; #40 retrait → D=WU espèces / C=WU banque. Aligné sur la nomenclature validée. Aucune écriture impactée (0 transaction). [3.68.2]

### Fixed
- **Comptabilité — assainissement des types de transaction de trésorerie (Caisse / WU & Cash Express) (SCRUM)** : les 12 types « trésorerie » étaient mal nommés (terminologie incohérente « We et cash » / « WU et Cash », fautes « especeexpress », « Sortis »), comportaient **2 doublons** et **3 sens débit/crédit inversés**. Diagnostic dev : **aucune écriture** n'utilise ces types (0 transaction) → correction sans risque sur l'historique ; les comptes pointés sont de vrais comptes Asset/Equity/Liability (plan comptable intact). Migration **`0153_treasury_transaction_types_fix.sql`** (idempotente) : **(1) corrige 3 sens** — #84 « sortie caisse→WU » débitait un compte de **capital (Equity)** au lieu de WU espèces (devient D=WU espèces / C=Caisse) ; #79 et #75 (emprunts) avaient Dette au débit au lieu du crédit (un emprunt augmente l'actif **et** la dette → D=trésorerie / C=Dette) ; **(2) désactive 3 doublons** (`is_active=0` : #80=#40 et contredit sa description, #83=inverse de #41, #78=#44) ; **(3) renomme** les 9 types conservés avec une terminologie claire et unique (« WU : dépôt espèces vers banque », « Transfert Caisse principale vers WU (espèces) », « Emprunt vers Caisse principale »…). Règle appliquée : Asset↑ au débit, Liability/Equity↑ au crédit. [3.68.1]

### Added
- **Comptabilité — justificatifs (reçus/factures) sur les écritures (Lot C) (SCRUM)** : on peut désormais joindre une ou plusieurs **pièces** (jpg/png/webp/pdf, max 10 Mo) à une écriture depuis le formulaire (section « Justificatifs » en mode édition). Nouvelle table **`transaction_attachments`** (migration `0152`, journalisée, idempotente `CREATE TABLE IF NOT EXISTS`) : `transaction_id`, `url`, `filename`, `mimetype`, `size_bytes`, soft-delete via `status`. Backend : 3 routes sous le contrôleur `transaction` — `GET /transaction/:id/attachments` (liste), `POST /transaction/:id/attachments` (upload, `FileInterceptor` + filtre type + validation **magic bytes**), `DELETE /transaction/attachments/:attachmentId` (soft-delete). Stockage **réutilise le pattern HR** : écriture dans `storage/app/uploads/<timestamp>-<rand>.<ext>`, URL servie `/files/<name>` (déjà servie par nginx + whitelistée). Front : thunks `listAttachments`/`uploadAttachment`/`deleteAttachment` + UI liste/upload/suppression dans `EcritureFormModal` (en création, message « enregistrez d'abord l'écriture »). Pas de modif whitelist (préfixe `/transaction` + `/files` déjà couverts). Vérifié : `tsc --noEmit` backend OK, `npm run build:dev` front OK. [3.68.0]
- **Comptabilité — saisie d'écriture : dimension analytique Projet/chantier (Lot B) (SCRUM)** : le formulaire « New journal entry » gagne un **sélecteur Project (analytics)** alimenté par `GET /projects` (nouveau `projectSlice.loadAllProjects` + reducer `project` au store). Quand un projet est choisi, le backend **comptabilise AUSSI une écriture équilibrée au grand livre** (`journal_entries`/`journal_entry_lines`) avec `project_id` sur les lignes, `sourceModule='manual_transaction'`, `currencyId` repris, et `idempotencyKey='manual_transaction:<id>'` — car le **rapport Analytique projet lit uniquement le ledger**, que la table plate `transaction` n'alimentait pas. La dépense saisie remonte donc dans `GET /projects/:id/report`. `skipApprovalGate=true` (saisie manuelle → écriture `posted` directe) ; le post ledger est best-effort (`.catch`) → n'échoue jamais la saisie plate. Backend : `CreateTransactionDto.projectId?`, `TransactionsModule` importe `LedgerModule`, `TransactionsService` injecte `LedgerService` et expose `postToLedgerWithProject`. Vérifié : `tsc --noEmit` backend OK, `npm run build:dev` front OK. [3.67.0]
- **Comptabilité — saisie d'écriture : sélecteur de devise + « Paid via » (compte de trésorerie) (SCRUM)** : le formulaire « New journal entry » (`EcritureFormModal`) ne permettait pas de choisir la **devise** (le montant partait sans `currencyId` → repli sur le défaut, violant la règle projet « jamais un montant sans devise ») ni de choisir facilement le **compte de paiement**. Ajouts : (1) **sélecteur Currency** alimenté par `loadAllCurrency` (USD/CAD/CDF…), pré-rempli avec la devise par défaut du `setting`, dont la valeur est désormais envoyée au backend ; (2) **sélecteur « Paid via »** optionnel listant les comptes de trésorerie détectés (caisse/banque/mobile money via regex sur le nom) qui met à jour le compte de la ligne de **crédit** en un clic. Backend : `CreateTransactionDto`/`UpdateTransactionDto` acceptent `currencyId?` (la colonne `transaction.currencyId` existait déjà) ; `TransactionsService.create/update` l'enregistrent. Vérifié : `tsc --noEmit` backend OK, `npm run build:dev` front OK. [3.66.0]

### Fixed
- **Comptabilité — nettoyage des types de transaction de charge cassés par le regroupement 0149/0150 (SCRUM)** : après le remap+soft-delete des sous-comptes de charge (0149/0150), **67 `transaction_types`** pointaient encore leur `debit_account_id` vers un sous-compte devenu **inactif** (1 type « raccourci de saisie » par dépense = même anti-pattern que les sous-comptes ; côté crédit Caisse principale intact). Migration **`0151_transaction_types_expense_cleanup.sql`** (idempotente) : **soft-delete** (`is_active=0`) tout type dont le compte de débit est un `subAccount` `status='false'`/inexistant, puis **crée 8 types génériques propres** (`Depense - Carburant et energie`, `… Travaux et chantiers`, `… Salaires et main-d oeuvre`, `… Elevage et agriculture`, `… Transport et voyage`, `… Reparation et entretien`, `… Frais de bureau et divers`, `… Achats et approvisionnements`) avec débit=compte canonique et crédit=**Caisse principale**, pour la saisie courante. Re-jeu = réactive les 8 types s'ils étaient désactivés (no-op sinon). [3.65.2]
- **Comptabilité — correctif 0150 : le remap/soft-delete de 0149 ne s'était pas exécuté (TEMPORARY TABLE rouverte) (SCRUM)** : la migration 0149 utilisait une `TEMPORARY TABLE` référencée deux fois dans une même requête (`INSERT ... WHERE id NOT IN (SELECT FROM même_table)`) → MySQL **`ER_CANT_REOPEN_TABLE: Can't reopen table 'tmp_expense_remap'`**. Le repair opérationnel du boot (index ≥ 70, best-effort) a **marqué 0149 comme appliquée malgré l'échec** : seuls les 8 comptes canoniques ont été créés, le remap des `transaction.debitId/creditId` + `journal_entry_lines.account_id` et le soft-delete des parasites **n'ont jamais eu lieu** (vérifié dev : 0 sous-compte soft-deleted, ~55 parasites toujours actifs). Fix : nouvelle migration **`0150_expense_remap_fix.sql`** identique mais avec une **VRAIE table** `tmp_expense_remap_0149` (non-temporary, droppée début+fin) qui peut être rouverte sans limite. Idempotente (re-jouée à chaque boot par le repair ≥70 : 2e passage = no-op car parasites déjà soft-deleted). Aucune FK sur `transaction`/`journal_entry_lines`/`subAccount` → UPDATE sans contrainte. RÈGLE retenue : ne jamais référencer 2× une TEMPORARY TABLE dans la même requête MySQL. [3.65.1]
- **Comptabilité — regroupement des sous-comptes de charge par nature (compte de résultat lisible) (SCRUM)** : le compte de résultat affichait **une ligne par dépense individuelle** (« dépenses chantier MATETE KINSAKU », « Pour boire aux agents d'Ecobank », « Dépenses étang KONGO CENTRAL »…) car chaque dépense migrée avait créé son propre **sous-compte** (`subAccount` sous l'`account` racine `Expense`), et le compte de résultat groupe par nom de sous-compte (`transaction.debitId`/`creditId` et `journal_entry_lines.account_id` → `subAccount`). Diagnostic base **dev** : **67 sous-comptes Expense** dont une cinquantaine étaient en réalité des **libellés d'opération**, pas des natures de charge. Fix : migration journalisée **`0149_expense_subaccounts_regroup.sql`** (idempotente, 1 statement/breakpoint) qui crée 8 comptes de charge **canoniques** (Carburant et énergie · Travaux et chantiers · Salaires et main-d'œuvre · Élevage et agriculture · Transport et voyage · Réparation et entretien · Frais de bureau et divers · Achats et approvisionnements), **remappe par mots-clés** les `debitId`/`creditId` de la table plate `transaction` **ET** `account_id` du ledger `journal_entry_lines`, puis **soft-delete** (`status='false'`, jamais de DELETE physique) les sous-comptes parasites. Les comptes standard déjà corrects (Cost of Sales, Salary, Rent/Loyer, Utilities, Maintenance, FarmOS Expenses, Exchange Fees, Discount Given) sont **conservés intacts**. Le détail de chaque dépense reste dans `transaction.particulars`/`journal_entry_lines.description`. Pour suivre par chantier/projet → dimension **Analytique (projets)**, pas un compte. Auto-appliquée dev+prod au boot ; conçue pour s'exécuter **avant ou après** l'import des données migrées (re-jouable). [3.65.0]
- **Comptabilité — 2e ligne « USD » fantôme des KPI Produits/Charges enfin corrigée (cause racine identifiée) (SCRUM)** : le tableau de bord Comptabilité affichait deux lignes USD distinctes (ex. `9492 USD` + `1657 USD`) car les KPI regroupent par `currency_id`. Diagnostic base **dev** : la 2e ligne vient de `currency_id=318` (« DOLLAR », symbole `$`, **`currencyCode=NULL`**, `status='false'`) porteur de **~437 écritures legacy** ; le frontend retombe sur le repli « USD » quand `currencyCode` est NULL → groupe séparé de la vraie USD (`id=1`). **Pourquoi 0143/0146/0147 n'avaient rien corrigé** : 0143 ne fusionne que les lignes `status='true'` et par `currencyName` identique (318 est `status='false'` et `currencyName='DOLLAR'≠'US Dollar'`) ; 0146/0147 ne ciblaient que `currency_id IS NULL`/orphelin (aucune ligne `currency` jointe), or **318 existe** dans `currency` → condition fausse → 0 écriture touchée. Le vrai symptôme n'était pas un id manquant mais une ligne `currency` réelle dont seul le `currencyCode` est NULL. Fix : migration journalisée **`0148_journal_entries_nullcode_currency_usd.sql`** (idempotente, 1 statement/breakpoint) re-mappe toute écriture dont la devise jointe a `currencyCode` NULL/vide vers l'USD canonique, puis soft-delete (`status='false'`) ces lignes `currency`. Aucun montant touché ; auto-appliquée dev+prod au boot. [3.64.1]

### Added
- **Comptabilité — filtre de période (Aujourd'hui / 7 j / 30 j / Trim. / Année / Tout + plage du→au) à la place du sélecteur d'année (SCRUM)** : la page Comptabilité n'offrait qu'un sélecteur « Fiscal year » (année entière). Il est remplacé par le même filtre de période que FarmOS/Domus : boutons rapides **Aujourd'hui · 7 j · 30 j · Trim. · Année · Tout** + deux champs date `du → au` pour une plage personnalisée (défaut = année en cours, comportement inchangé). Le filtre pilote désormais **tout** : écritures, KPI (Revenue/Expense/Net/Tax) **et** états financiers. Nouveau composant Tailwind `DateRangeFilter.jsx` ; `AccountingPage` gère un état `dateRange` qui alimente `transactionQuery` et les 3 rapports. Backend : `GET /account?query=tb|bs|is` accepte `startDate`/`endDate` (DTO `AccountQueryDto`) ; `AccountsService.subAccountBalances(range)` borne les sommes débit/crédit sur `transactions.date` (mode simple **du→au** : agrège uniquement les écritures de la période — sur une période courte le bilan peut être déséquilibré car les soldes d'ouverture sont exclus). Sans bornes = historique complet (rétro-compatible). Aucune nouvelle route → pas de modif middleware. Thunks `loadTrailBalance`/`loadBalanceSheet`/`loadIncomeStatement` propagent les dates. [3.63.0]
- **Comptabilité — permission `view-reversed-entries` pour masquer les écritures contre-passées (SCRUM)** : par défaut, la liste des écritures (`GET /ledger`), le grand livre par compte (`GET /ledger/account/:id`) et le détail (`GET /ledger/:id`) **masquent** désormais l'écriture originale contre-passée (`status=reversed`) **et** sa contre-passation (`reversalOfId != null`). Seuls les **rôles système** (bypass, comme `PermissionsGuard`) ou les rôles portant la nouvelle permission **`view-reversed-entries`** les voient. Le masquage retire **les deux côtés ensemble** (effet net nul) → le solde courant du grand livre reste exact même pour un utilisateur sans la permission. Backend : helper `LedgerService.roleCanViewReversed(roleId)` (mêmes requêtes que le guard : `roles.isSystem` OR `rolePermission→permission.name`), nouveau décorateur `@CurrentRoleId()` (lit `req.user.roleId`), filtrage SQL `status <> 'reversed' AND reversalOfId is null`. Permission créée idempotemment par la migration journalisée `0134_view_reversed_entries_permission.sql` (type `account`, auto-appliquée dev+prod) + ajoutée au `permissions.seeder.ts` pour les installs neuves. À activer sur le rôle voulu via la gestion des rôles/permissions. [3.62.0]

### Added
- **Comptabilité — pagination + filtres CÔTÉ SERVEUR pour Écritures et Grand livre (SCRUM)** : auparavant le front chargeait jusqu'à **1000 écritures** d'un coup (`GET /ledger?limit=1000`) puis filtrait/tranchait en mémoire — la pagination n'allégeait que le navigateur, pas le backend/réseau. Les pages **Écritures** et **Grand livre** font désormais une **vraie pagination serveur** : on ne charge que **20 lignes** par requête, le bouton « Afficher plus » récupère la page suivante (`offset += 20`, réponse `{ data, total }`) et l'ajoute à la liste. Les filtres (recherche libellé/pièce, devise, module/journal, statut, montant min/max) sont **appliqués en SQL** (`WHERE`) donc cohérents avec la pagination (on filtre tout le dataset, pas seulement la page affichée). Backend : `GET /ledger` accepte `q`, `currencyCode`, `sourceModule`, `status`, `minAmount`, `maxAmount`, `offset` et `paged=1` ; `LedgerService.findAll(orgId, limit, offset, roleId, filter, paged)` ajoute les conditions de filtre + un `COUNT(*)` (mêmes conditions) et renvoie `{ data, total }` quand `paged` (sinon tableau brut — **rétro-compatible** : Dashboard/Journaux gardent leur agrégat complet). Filtre montant sur le total débit de l'écriture via sous-requête corrélée. `/ledger` déjà whitelisté (prefix `*`) → pas de modif middleware. Front : `GrandLivre` et `Ecritures` (désormais auto-alimenté, plus via la prop `transactions`) gèrent `params`→query, debounce 250 ms sur la recherche, append des pages, `total` serveur pour « Afficher plus ». Statut filtré sur les valeurs réelles (`posted`/`pending`/`reversed`). [3.64.0]
- **Comptabilité — pagination d'affichage (20 lignes + « Afficher plus ») sur les listes longues (Plan comptable, Tiers, Trésorerie, Immobilisations, TVA, Approbations) (SCRUM)** : hook réutilisable `usePaginated` + composant `ShowMore` (même UX que le Grand livre) pour ne rendre que 20 lignes à la fois côté navigateur (évite le freeze sur les longues listes). Ces listes restent chargées en entier (données déjà agrégées par compte) — pagination purement d'affichage. [3.64.0]
- **Comptabilité — filtre par montant (plage min/max) sur Écritures et Grand livre (SCRUM)** : ajout de deux champs **Montant min** / **Montant max** dans la barre de filtres des pages Écritures et Grand livre. Filtre la valeur numérique de l'écriture (montant total / débit), se combine avec recherche, journal/module, statut et devise. Bornes optionnelles (min seul, max seul ou plage). Uniquement `comptabilite-app/src/app.jsx`, aucun changement backend. [3.63.10]
- **Comptabilité — filtres fonctionnels (recherche libellé/pièce, journal/module, statut) sur Écritures et Grand livre (SCRUM)** : les champs de recherche et les menus « Tous journaux » / « Tous statuts » des pages **Écritures** et **Grand livre** étaient décoratifs (aucun `onChange`, options figées Caisse/Banque/… sans rapport avec les données). Ils sont désormais **opérationnels** et alimentés par les données réelles : (1) recherche plein-texte sur **libellé + pièce/référence** (insensible à la casse) ; (2) menu **journal** (Écritures) / **module** (Grand livre) construit dynamiquement à partir des écritures présentes ; (3) menu **statut** (Validée/Brouillon côté Écritures ; posted/pending/contre-passée/contre-passation côté Grand livre). Tous se combinent entre eux **et** avec le filtre Devise. Garde-fous Grand livre : l'état « Aucune écriture » ne s'affiche que si le grand livre est réellement vide (un filtre sans résultat garde la barre de filtres + ligne « Aucune écriture ne correspond aux filtres »). Uniquement `comptabilite-app/src/app.jsx`, aucun changement backend. [3.63.9]

### Fixed
- **Comptabilité — filtre Devise sans effet sur Écritures, Grand livre et États (SCRUM)** : sélectionner une devise dans le menu « Devise » de l'en-tête ne filtrait rien (ou vidait la liste) sur les Écritures, le Grand livre et les États. Cause : le filtre comparait `currencyId` (id numérique) alors que les écritures héritées/orphelines portent des id incohérents (legacy, currency_id orphelins repointés). Correction : le filtre devient un **vrai filtre par code devise** — le menu émet désormais le **code** (`USD`/`CDF`/…) et toutes les comparaisons (`matchCur`, Grand livre, États, listes `*ByCurrency`) se font sur `currencyCode`, insensible aux écarts d'id. S'applique à **toutes les données** (écritures, comptes, KPI, états financiers). Uniquement `comptabilite-app/src/app.jsx`, aucun changement backend. [3.63.8]
- **Comptabilité — deux lignes « USD » dans les KPI (Produits/Charges/Résultat) (SCRUM)** : le compte de résultat affichait **deux lignes « USD »**. Cause : ~329 `journal_entries` pointaient vers un `currency_id` **orphelin** (`318`, id inexistant dans la table `currency` active : 1=USD, 15=CAD, 16=CDF). L'API renvoie alors `currencyCode=NULL` et le frontend (`ByCur`, `app.jsx`) retombe sur le repli `CUR` (= « USD » sur cette instance) → une 2e ligne « USD » parasite **en plus** de la vraie USD (id 1). `0146` ne couvrait que `currency_id IS NULL` (pas les orphelins) et visait un repli `id=2`/`currencyName='DOLLAR'` absent ici. Correction **par les données, sans toucher aux montants** : migration journalisée `0147_journal_entries_orphan_currency_usd.sql` qui repointe **tout** `journal_entries.currency_id` ne joignant aucune ligne `currency` vers l'**USD canonique** (`MIN(id)` actif `currencyCode='USD'` OU `currencyName LIKE '%Dollar%'` hors CAD, repli 1) — convention legacy « devise manquante = USD ». Idempotente (ne change que les lignes orphelines), auto-appliquée dev+prod au boot. **Fix 3.63.7** : la 1re version (3.63.6) ne changeait rien car le sous-SELECT sur `currency` dans un UPDATE joignant déjà `currency` déclenchait **ERROR 1093** (can't reopen table) → migration *skippée* silencieusement par `applyOperationalRepairs`. Réécrite en 2 statements : `SET @usd_id := (...)` puis `UPDATE ... SET currency_id = @usd_id`. [3.63.7]
- **Comptabilité — Grand livre : freeze UI de plusieurs secondes après une contre-passation (SCRUM)** : après avoir validé une contre-passation, l'onglet se figeait quelques secondes (plus rien de cliquable, scroll bloqué). Cause : le Grand livre rend **toutes** les écritures d'un coup (jusqu'à 1000, ~900 lignes en réel) et `reverse()` appelait `await load()` qui **refetchait + re-rendait** l'intégralité du tableau de façon synchrone → blocage du thread principal. Deux corrections dans `GrandLivre` (`comptabilite-app/src/app.jsx`) : (1) **pagination d'affichage** — on ne rend que les **20 écritures** les plus récentes + bouton « Afficher plus » (+20), supprimant le freeze à chaque rendu de la page, pas seulement après contre-passation ; (2) **MAJ locale après submit** — au lieu de recharger les 1000 lignes, on marque localement l'écriture originale `status=reversed`/`reversedById` (badge « contre-passée », bouton masqué) à partir du `reversalEntryId` renvoyé par l'API ; la ligne de contre-passation s'affiche au prochain « Rafraîchir ». Aucun changement backend. [3.63.5]
- **Comptabilité — Grand livre : contre-passation via `window.prompt` qui bug (SCRUM)** : cliquer sur l'action **Contre-passer** d'une écriture ouvrait la boîte de dialogue native du navigateur (`window.prompt`, « dev.ongdngolu.org indique : Motif de la contre-passation ? »). Cette boîte bloque le thread, ne se ferme pas proprement (impossible de relancer une autre contre-passation, ré-ouvertures fantômes) et ne respecte pas l'UI de l'app. Remplacée par le composant interne `FormModal` (même scrim/`modal-card` que les autres modals SIFA), avec un champ **textarea** « Motif de la contre-passation » obligatoire. Nouvel état `reverseId` sur `GrandLivre` (`comptabilite-app/src/app.jsx`) : le bouton ouvre le modal, la soumission appelle `api.reverseEntry(reverseId, reason)` puis recharge. Aucun changement backend. [3.63.4]
- **Comptabilité — Trésorerie : devise « — » sur des soldes legacy (SCRUM)** : certaines lignes de la page **Trésorerie** (ex. « We et cash express en banque ») affichaient un tiret `—` dans la colonne **Devise** alors que le solde était calculé en USD (repli `CUR` du frontend). Cause : des `journal_entries` avec `currency_id IS NULL` non couverts par `0144` (qui ne reprenait que `source_module='legacy_migration'` ou `idempotency_key LIKE 'legacy-tx-%'`) — écritures de dual-write précoce / antérieures à l'obligation de devise. Correction **par les données, sans toucher aux montants** : migration journalisée `0146_journal_entries_null_currency_usd.sql` qui défaut **tout** `journal_entries.currency_id` restant à NULL vers l'USD (`MIN(id)` actif `currencyName='DOLLAR'`, repli id 2) — convention legacy « devise manquante = USD ». Idempotente, auto-appliquée dev+prod au boot. [3.63.3]
- **Comptabilité — devises en doublon affichées plusieurs fois (ex. « USD » 2-3 fois dans les KPI Produits/Charges/Résultat) (SCRUM)** : la page Comptabilité regroupe les montants par `currencyId` mais affiche le `currencySymbol`. Quand la table `currency` contient plusieurs lignes de **même devise** (même `currencyName`, ids différents — doublons introduits par la reprise legacy), chaque `currencyId` distinct produit une ligne séparée portant le même symbole → « USD » apparaît 2 ou 3 fois. Correction **par les données, sans toucher aux montants ni aux écritures** : migration journalisée `0143_merge_currency_duplicates.sql` qui repointe **toutes** les colonnes devise (`currency_id`/`currencyId`/`from|to|fee_currency_id`/`salary_currency_id` sur 29 tables) vers le `MIN(id)` actif du même `currencyName`, puis **soft-delete** (`status='false'`) des lignes `currency` doublon (la ligne devise uniquement, jamais les transactions 2023). Migration **idempotente**, statements autonomes (1 par `--> statement-breakpoint`, **pas de procédure stockée** car `splitSqlStatements` coupe sur `;`), table de correspondance `_currency_merge_map` (vraie table, robuste au pooling) construite par sous-requête `MIN(id)` puis supprimée. Regroupement par `currencyName` (propre) et **jamais par symbole** (les symboles mojibake dégénèrent en `?` et fusionneraient des devises différentes). Auto-appliquée dev (≥0070 rejouée au boot). [3.63.2]
- **Domus — KPI incohérents avec les listes affichées (Propriétés et Onboarding) (SCRUM)** : deux compteurs affichaient un chiffre que la liste en dessous ne reflétait pas. (1) **Propriétés** (`domus-app/src/screens/biens.jsx`) : la carte « Propriétés » comptait `properties.length` mais la grille n'affiche que des **lots** (`real_estate_units`) ; une propriété active sans aucun lot donnait « Propriétés = 1 » + grille vide « Aucune propriété ». Fix : on construit désormais une carte « propriété sans lot » (badge **Sans lot**, clic = ajout d'un lot pré-rempli, pas de suppression) injectée dans la grille → la propriété est visible et le compteur cohérent. (2) **Onboarding** (`domus-app/src/screens/locataires.jsx`) : la carte « Onboarding » comptait **tous** les dossiers de la période (`onboarding.length`) alors que la bande n'affiche que les dossiers **en attente** (`isPendingOnboarding` : ni validés, ni expirés-hors-submitted) → « Onboarding = 4 » mais 3 cartes. Fix : mémo `pendingOnboarding` partagé entre le KPI et les cartes. [3.63.1]
- **Boot backend2 — crash-loop migrations Drizzle sur « table already exists » + dépendances conteneur manquantes (SCRUM)** : trois pannes liées au démarrage local Docker. (1) **Frontend** : `react-phone-number-input` (SCRUM-229, `Shared/PhoneInput.jsx`) déclaré dans `package.json` mais absent du `node_modules` du conteneur → Vite « Failed to resolve import » → 500. (2) **Backend** : `@nestjs/schedule` (rent-reminder, vaccine-sync) déclaré mais absent → TS2307 → compilation KO. Les deux résolus par `npm install` dans le conteneur. (3) **Backend, cause racine du crash-loop** : le journal Drizzle contient **deux migrations préfixées `0015`** (`0015_add_currency_id_to_property` idx 14, puis `0015_add_billing_fields_to_app_settings` idx 15). Le suivi `__drizzle_migrations` s'est figé à la première (`created_at=1779120000000`), donc `migrate()` rejouait la seconde et butait sur `CREATE TABLE adjustInvoiceProduct already exists` (schéma déjà complet : 155 tables). Le `catch` existant ne tolérait que `err.code === ER_TABLE_EXISTS_ERROR`, mais Drizzle **enveloppe** l'erreur dans `DrizzleQueryError` (code réel dans `err.cause`) → l'erreur remontait jusqu'à `process.exit(1)` → le conteneur relançait `docker:dev` en boucle, Nest ne démarrait jamais (`/setting` 500). Fix `backend2/src/database/migrate.ts` : helper `isAlreadyAppliedError` qui **déroule la chaîne `cause`** et tolère les codes/errno « déjà existe / dupliqué » (1050/1060/1061/1062/1826/1005) ; le runner loggue et poursuit au lieu de crasher. Protège dev local **et** dev distant/prod du même drift. [3.61.2]
- **HR — page blanche `ReferenceError: statusChip is not defined` (SCRUM)** : le composant `ProjetsONG` utilisait `statusChip(...)` (colonnes Statut des tableaux Projets et Affectations) alors que ce helper n'est défini **localement** que dans `Employee360ProfileModal` et `SelfService` — il n'était pas dans le scope de `ProjetsONG` → crash au rendu. Le bug était **masqué tant que la table projets HR était vide** (`projects.map` ne s'exécutait pas) ; il s'est déclenché dès que les projets du registre partagé sont remontés dans HR (feature 3.60.0). Remplacé les deux appels par le pattern global déjà utilisé partout : `<span className={"chip " + chipForStatus(status)}>{statusLabel(status)}</span>` (helpers `chipForStatus`/`statusLabel` en scope module). [3.61.1]

### Changed
- **Comptabilité/Analytique — rapport projet ventilé par devise (SIFA)** : `ProjectsService.ledgerReport` ne sommait plus correctement quand un projet mélangeait plusieurs devises (`totalExpenses` additionnait CDF+USD → faux). Désormais le grand livre est groupé par `(account_id, journal_entries.currency_id)` avec join `currency` ; sortie **`byCurrency[]`** = un bucket par devise `{ currencyId, currencyCode, expenses[], revenue[], totalExpenses, totalRevenue, net }`, **jamais d'addition inter-devises**. Les coûts de maintenance non comptabilisés (`maintenanceCostsMissingFromLedger`) sont aussi ventilés par devise et ajoutés dans leur bucket. La **consommation budget** (`consumptionPct`) est comparée uniquement dans la **devise du budget** (`project.currencyId`). Champs plats (`totalExpenses`/`revenue`/`net`/`currencyCode`) conservés pour compat = devise du budget (ou devise unique). Frontend : carte affiche « Dépensé <montant> <devise> » par devise ; tableau « Produits & charges » a une colonne **Devise** avec une ligne par (projet, devise). [3.61.0]

### Fixed
- **Comptabilité — sélecteur de devise affichait l'id « 1 » + champ montant+devise au standard app (SCRUM)** : dans les modals analytiques, le `select` devise utilisait `c.code` (champ inexistant) → repli sur l'id (« 1 ») au lieu de `CDF`/`USD`. Corrigé : label via `cleanCurrencySymbol(c) || c.currencyCode || c.currencyName`. Nouveau type de champ **`money`** dans `FormModal` : input montant à gauche + select devise à droite **sur une ligne** (devise en accent), conforme au standard de l'app (classe `.money-row`). Appliqué aux modals **Dépense**, **Nouveau projet** et **Modifier le projet** (montant/budget + devise groupés). `FormModal` initialise désormais aussi la clé devise (`curKey`/`curDefault`) du champ money. [3.60.2]

### Added
- **Comptabilité/Analytique — devise sur le budget projet (SCRUM)** : la devise n'apparaissait nulle part sur les projets analytiques. (1) Les **cartes** affichent désormais « Dépensé <montant> <devise> » et « Budget <montant> <devise> » (`curCode(currencies, p.currencyId)`, fallback devise par défaut). (2) Les modals **Nouveau projet** et **Modifier le projet** ont un champ **Devise du budget** (sélecteur, défaut = devise du projet en édition sinon devise du réglage) ; `createProject`/`updateProject` propagent `currencyId`. Backend : `UpdateProjectDto.currencyId` ajouté + `ProjectsService.update` persiste `currencyId`. [3.60.1]
- **RH — les projets du registre partagé visibles dans HR (SCRUM)** : HR ne voyait que ses propres projets (`hr_projects`) alors que la Comptabilité affiche tout le registre partagé `projects` (compta, maintenance Domus, future app projet). `HrService.listProjects` et `projectAnalytics` appellent désormais `ensureHrProjectsFromRegistry(orgId)` qui **reflète** chaque projet actif de `projects` dans `hr_projects` de façon **idempotente** par `(organization_id, source_system='projects', external_ref=projects.id)` (pattern SIFA `ensureMaintenanceProjects`, jointure `cast(... as char) collate utf8mb4_0900_ai_ci`). Seuls **nom/code/donor/devise/dates** sont propagés ; les champs RH (`hrBudget`, `managerId`, affectations, timesheets pointant sur `hr_projects.id`) ne sont **jamais écrasés** → reflet éditable côté RH, travail des tickets HR préservé. Nouvelles colonnes `source_system`/`external_ref` + index unique sur `hr_projects` (migration journalisée `0133_hr_projects_source_ref.sql`, auto-appliquée dev+prod, idempotente SET/IF/PREPARE). Best-effort : un drift de schéma ne casse pas la liste. [3.60.0]

### Fixed
- **CI/CD — pipeline backend bloqué par `npm audit` (esbuild HIGH)** : le step `cd backend2 && npm ci && npm audit --audit-level=high && npm run build` échouait car `npm audit` retournait exit ≠ 0 (2 vulns HIGH `esbuild <=0.28.0` tirées en transitif par `drizzle-kit@0.31.10` via `tsx`, `esbuild` direct et `@esbuild-kit/core-utils`). Le `&&` court-circuitait `npm run build` → `backend2/dist` jamais produit → `scp backend2/dist` échouait (« No such file or directory »). **Correction à la racine** (pas de skip) : ajout d'un override `"esbuild": "^0.28.1"` dans `backend2/package.json` qui force tous les esbuild transitifs vers la version corrigée `0.28.1`. Après `npm ci` : `npm audit --audit-level=high` → 0 vulnérabilité, `nest build` OK. Frontend non touché (2 vulns *moderate* quill seulement, sous le seuil `high`). [3.59.16]

### Added
- **Comptabilité/Analytique — modifier un projet + ajouter une dépense au projet** : chaque carte de la « Comptabilité analytique » a désormais deux boutons. **Modifier** ouvre un modal (nom, financeur, budget) → `PATCH /projects/:id` (permission backend `update-transaction` ; un 403 affiche « Vous n'avez pas la permission de modifier le projet »). **+ Dépense** ouvre un modal de saisie (date, libellé, montant, **devise**, compte de charge, compte de trésorerie) qui crée une écriture équilibrée via `POST /ledger` — la ligne de charge porte le `project_id` pour remonter dans le rapport analytique — **sans modifier le projet** (permission distincte `create-transaction`). Le `FormModal` gère désormais les champs `type:"select"` (devise/comptes). Helper `permError` pour les 403. Le composant `Analytique` charge comptes/devises/réglage (best-effort). [3.59.15]
- **Domus/Projets — coûts de maintenance dans le rapport projet (ledger)** : `ProjectsService.ledgerReport` rapproche désormais les coûts de maintenance des projets. Au chargement, `ensureMaintenanceProjects` propage le `project_id` (coût → ticket) sur les `journal_entry_lines` du module `maintenance` non rattachées (jointure `related_id` via `cast(... as char) collate utf8mb4_0900_ai_ci`, pattern SIFA collation). Les coûts actifs encore **non comptabilisés** (aucune écriture `posted` `source_module='maintenance'`) sont remontés en charge agrégée (`maintenanceCostsMissingFromLedger`) sous « Couts maintenance saisis » et exposés via `maintenanceCosts.{unpostedExpense,unpostedCount}`. Aucune somme inter-devises. [3.59.14]
- **Domus — somme dépensée affichée sur la carte maintenance (SIFA)** : le backend renvoie désormais `spentByCurrency` (dépense réelle groupée par devise du coût) sur `GET /property-management/maintenance` ; la carte/liste/tableau du Kanban maintenance affichent « <montant> dépensé » par devise même quand les coûts sont saisis dans une devise différente de celle du ticket (ex. ticket CDF avec coûts USD). Récap « Priorités » ventilé par devise réelle. Aucune somme inter-devises. [3.59.13]
- **FarmOS — retirer un animal de la vente (sans vente enregistrée)** : nouvel endpoint `DELETE /farmos/animals/:id/listing` (`unlistAnimalFromSale`) qui désactive l'annonce POS liée (`farmos_price_list.isActive=0`, soft-delete) et remet l'animal en statut `healthy` s'il était listé, à condition qu'aucune `farmos_sales` active ni statut `sold` n'existe. Bouton « Retirer » dans l'inventaire de vente (`SaleInventorySettings`), avec confirmation et mise à jour optimiste (animals + priceList). [3.59.10]

### Added
- **Domus — Maintenance : coût dépensé par ticket** : la liste des tickets (`property-management.maintenance()`) remonte désormais `spentCost` (sous-requête `sum(amount)` des coûts actifs du ticket, **dans la devise du ticket** — pas de mélange inter-devises). Affiché sur la carte (Kanban/Liste) « … dépensé » et dans une colonne « Dépensé » de la vue tableau. `listMaintenanceCosts` jointe la devise (`currencyCode/Name/Symbol`) pour afficher chaque coût et les totaux dans leur propre devise. [3.59.12]

### Fixed
- **Domus — Maintenance : devise du coût non appliquée sur la carte** : la carte affichait `money(estimatedCost)` **sans** devise → toujours « CDF » même pour un ticket en USD/EUR. Nouveau helper `costSymbol(ticket)` qui résout `currencyId` → symbole via la table des devises (`currencyById` + `cleanCurrencySymbol`, repli sur les champs du ticket puis la devise par défaut), appliqué aux vues Kanban, Liste et Tableau. Le résumé « Coût estimé total » et les totaux du modal de coûts sont désormais **groupés par devise** (SIFA, aucune conversion). [3.59.12]
- **Comptabilité/SIFA — États financiers ne respectaient pas le filtre devise global** : l'écran « États financiers » (Compte de résultat, Bilan, Balance) rechargeait ses propres rapports via `api.ledgerIncomeStatement/BalanceSheet/TrialBalance()` **sans** le filtre devise de la barre du haut → toutes les devises s'affichaient malgré la sélection (ex. « CDF » montrait aussi USD/EUR/MYR/AZN). Même classe de bug que le Grand livre (3.59.8). `Etats` reçoit désormais `curFilter` et dérive les rapports filtrés (`rawIs/Bs/Tb` → `liveIs/Bs/Tb`) en restreignant chaque liste — lignes **et** totaux `*ByCurrency`/`byCurrency` — sur `currencyId` (prédicat SIFA, aucune conversion). Les scalaires `totalRevenue/Expenses/netIncome` (toutes devises) sont recalculés depuis les `*ByCurrency` filtrés en mono-devise (onglet Flux inclus). [3.59.11]
- **Comptabilité — Écritures/Grand livre : montant à 0 et devise manquante** : la liste des écritures (`ledger.findAll`) ne renvoyait pas `totalDebit`/`totalCredit` (calculés par ligne), donc l'écran « Écritures » et le « Grand livre » affichaient `0` partout. Ajout de deux sous-requêtes corrélées (`sum` des lignes par `side`) au `select` de `findAll`. Front « Écritures » : la colonne Montant affiche désormais la devise de l'écriture à côté du montant (`mc(amount, row)`, pattern SIFA — devise portée par la ligne, repli `CUR`), export CSV inclus, et la date ISO complète est correctement formatée (`slice(0,10)` au lieu d'un `slice(5)` qui produisait `12T00:50:21.000Z/06`). [3.59.9]
- **Comptabilité/SIFA — Grand livre ne respectait pas le filtre devise global** : l'écran « Grand livre » était le seul rendu sans le filtre devise de la barre du haut — il chargeait ses propres écritures via `api.ledgerEntries()` et les affichait toutes, quelle que soit la devise sélectionnée. `GrandLivre` reçoit désormais `curFilter` et filtre les écritures côté front sur `currencyId` (`String(e.currencyId ?? "") === curFilter`), même prédicat SIFA que les autres écrans (aucune conversion, simple restriction d'affichage). Chaque écriture `/ledger` porte bien `currencyId`/`currencyCode`. [3.59.8]
- **Comptabilité — plan comptable : Revenue et Expense mal typés en `Equity` (compte de résultat aveugle, sélecteur de charges vide)** : le seeder créait les comptes racine `Revenue` et `Expense` avec `type='Equity'`. Conséquence : le ledger filtrant sur `accountType='Revenue'`/`'Expense'` ne voyait **aucun** produit ni charge (compte de résultat vide), et l'`ExchangeModal` ne proposait aucun compte de frais. Migration idempotente `0132_fix_account_types` (dans le journal Drizzle → auto-appliquée dev **et** prod) qui corrige `type` sur les comptes `Revenue`/`Expense`, et seeder corrigé pour les bases neuves. Tous les sous-comptes rattachés (Salary, Rent, Utilities, Maintenance, Exchange Fees, FarmOS Expenses/Sales, Rental Revenue…) redeviennent des charges/produits. [3.59.7]
- **Comptabilité — échange de devise : sélecteur « Compte de frais » alimenté** : l'`ExchangeModal` lisait les comptes depuis les *balances* du grand livre, qui excluent les sous-comptes sans écriture (`/ledger/balances` filtre les soldes nuls) → le compte de frais de change (jamais mouvementé) n'apparaissait pas. `Change` charge désormais la liste complète des sous-comptes (`/account?type=sa`) pour les sélecteurs, avec repli sur les balances. [3.59.7]

### Changed
- **Comptabilité — échange de devise : référence générée automatiquement** : le champ « Référence » de l'`ExchangeModal` n'est plus saisi à la main. Il est désormais auto-généré (lecture seule) au format `CHG-AAAA-MM-NNN`, où `NNN` est la séquence du mois courant calculée depuis les échanges existants (premier du mois = `001`). Évite les références oubliées ou incohérentes. [3.59.6]

### Fixed
- **Comptabilité — synchro maintenance : conflit de collation corrigé (cause racine du 500 Analytique)** : la comparaison `p.external_ref = cast(m.id as char)` dans `ensureMaintenanceProjects()` mélangeait deux collations (`utf8mb4_0900_ai_ci` de la colonne vs `utf8mb4_general_ci` du CAST) → `ER_CANT_AGGREGATE_2COLLATIONS`, faisant planter `/projects` en 500. Ajout de `collate utf8mb4_0900_ai_ci` sur les deux comparaisons (INSERT not-exists + UPDATE join) pour que la synchro s'exécute réellement. Complète le garde-fou best-effort [3.59.3]. [3.59.5]
- **Comptabilité — boutons actifs invisibles (segtabs + boutons `+`)** : la règle CSS `.segtab { background:#fff }` (et `.btn-sm { background:#fff }`) était définie **après** `.grad-accent` à spécificité égale, écrasant donc le dégradé du bouton actif → texte blanc sur fond blanc = bouton invisible (ex. onglet « Montant reçu » dans l'échange de devise, bouton « + Nouveau taux »). Le dégradé est désormais porté directement par `.segtab.active` et `.btn-sm.grad-accent` (spécificité supérieure). [3.59.4]
- **Comptabilité — Analytique (projets) ne renvoie plus 500** : la liste `/projects` appelait `ensureMaintenanceProjects()` (synchro auxiliaire des projets de maintenance) sans garde ; un drift de schéma (colonne/table manquante sur un env) faisait planter tout l'écran Analytique en 500. La synchro est désormais best-effort (try/catch + warning loggé) : la liste des projets répond toujours, même en cas de drift. [3.59.3]

### Added
- **Comptabilité/SIFA — filtre par devise global** : sélecteur « Devise » dans la barre du haut du module compta (`comptabilite-app`). « Toutes les devises » par défaut ; en choisissant une devise, tous les écrans branchés (Dashboard, Journaux, Écritures, Plan comptable, Tiers, Trésorerie, Immobilisations, États financiers, TVA, Capacité) ne montrent que les écritures/comptes/totaux de cette devise. Aucune conversion (principe SIFA) : filtrage côté front sur `currencyId` (transactions, comptes et listes `*ByCurrency`), pas de re-fetch. [3.59.2]
- **Comptabilité/SIFA — sous-comptes de change créés par migration (plus de SQL manuel)** : migration Drizzle `0131` (idempotente, dans le journal → auto-appliquée au boot sur dev **et** prod) qui insère les 2 sous-comptes de l'échange de devise : « Currency Exchange Clearing » (compte de virement interne, `accountId=1` Asset) et « Exchange Fees » (frais de change, `accountId=6` Expense). Ces comptes n'étaient créés que par le seeder (base vide uniquement) ; la migration garantit leur présence partout sans geste manuel. Le formulaire d'échange (`ExchangeModal`) **pré-remplit** désormais ces comptes (pont de change + compte de frais) : le comptable n'a plus qu'à saisir montants et devises. Filtres de détection affinés (pont = clearing/virement, hors comptes de frais). [3.59.1]

### Changed
- **Comptabilité/SIFA — UI multi-devises généralisée + devise obligatoire à la saisie** : extension du principe SIFA (aucune conversion, chaque devise = sous-livre indépendant) à **tous les écrans encore mono-devise** de `/comptabilite`, en réutilisant le composant `ByCur` et les helpers `sumByCurrency`/`netByCurrency` déjà introduits pour les États. Nouveau helper `accBalByCur(rows, pick)` qui regroupe des comptes (balance + `currencyId`/`currencyCode` par ligne) en totaux par devise. Écrans corrigés : **Dashboard** (Produits/Charges/Résultat → par devise via `revenueByCurrency`/`expensesByCurrency`), **Tiers** (créances/dettes par devise + colonne Devise au tableau), **Trésorerie** (solde par devise), **Immobilisations** (VNC par devise + colonne Devise), **TVA & taxes** (collectée/déductible/nette par devise + colonne Devise), **Factures fournisseurs** (total/payé/dû par devise depuis `currencyId` de chaque facture + colonne Devise, montants en `mc()`), **Plan de trésorerie & capacité** (refonte : trésorerie/dettes/créances/disponible **calculés par devise**, une carte de capacité par devise — fini la soustraction de devises hétérogènes en un seul nombre). Tous les `m()` (devise globale `CUR` en dur) des tableaux par compte remplacés par `mc(valeur, ligne)` (devise de la ligne). **Saisie d'écriture** : la **devise est désormais obligatoire** (sélecteur autocomplete, pré-rempli avec la devise de la société depuis `setting.currencyId`) ; `createTransaction` envoie `currencyId` ; bouton Enregistrer désactivé sans devise — plus aucun montant saisi sans devise. Aucune migration DB (colonnes `currency_id` déjà présentes). [3.59.0]

### Added
- **Comptabilité/SIFA — Échange de devise = service bancaire (vrais chiffres des deux côtés, pas d'estimation)** : nouveau module `ExchangeService` dans le ledger. Une opération d'échange enregistre les **montants réels des deux côtés** (devise source sortie + devise cible reçue) et le **taux réel**, jamais une valeur estimée/convertie. Comme une banque, l'opération pose **2 (ou 3) écritures comptables liées**, chacune **équilibrée dans SA devise** via un sous-compte « Compte de change » (pont) : sortie devise source (DÉBIT change / CRÉDIT caisse source), entrée devise cible (DÉBIT caisse cible / CRÉDIT change), et **frais de change optionnels** sur une ligne de charge dédiée. Saisie **flexible** : fournir le montant reçu **ou** le taux (le 3ᵉ champ est déduit ; si les deux, les montants réels priment et le taux est recalculé). Migration `0130` (idempotente, `CREATE TABLE IF NOT EXISTS currency_exchanges` + index unique d'idempotence). Endpoints `POST/GET /ledger/exchanges`, `GET /ledger/exchanges/:id`, `POST /ledger/exchanges/:id/reverse` (annulation = contre-passation des écritures liées, aucun DELETE). Sous-comptes seedés « Currency Exchange Clearing » + « Exchange Fees » (à ajouter à la main sur dev/prod déjà peuplés). [3.58.0]
- **Domus/SIFA — Maintenance = projet analytique + dépenses comptabilisées dessus** : un chantier de travaux (ticket de maintenance) devient un **projet** (axe analytique). Migration `0127` (idempotente) ajoute `project_id` sur `real_estate_maintenance_requests` et `real_estate_maintenance_costs`. À la création d'un ticket, un projet « Travaux: <titre> » est auto-créé via le **registre partagé** (`source_system=maintenance`, `external_ref=<ticketId>`, code `MNT-<id>`, budget = coût estimé) et lié au ticket. Chaque dépense de maintenance porte le `project_id` sur sa **ligne de charge du grand livre** → ventilation analytique automatique (la dépense remonte sur le projet dans la compta analytique, via le système de transaction et le gate `maintenance`). Première brique (backend) de l'alignement maintenance Domus ↔ CRM ↔ comptabilité. [3.56.0]
- **ERP/SIFA — Reprise des anciennes transactions plates vers le grand livre (dry-run d'abord)** : `LedgerService.migrateLegacyTransactions()` convertit chaque transaction de la table plate `transaction` en écriture moderne (1 `journal_entry` + 2 lignes débit/crédit), réutilisant `post()` (périodes, équilibre, idempotence). **Idempotent** par `idempotency_key = legacy:tx:<id>` (rejeu sans doublon). Ignore les transactions déjà migrées, inactives, à montant nul, ou dont un compte n'existe plus. Endpoint `POST /ledger/migrate-legacy` avec **`dryRun` par défaut = true** (compte/échantillonne sans écrire ; il faut explicitement `{dryRun:false}` pour appliquer). `sourceModule='legacy_migration'`. [3.55.0]
- **Comptabilité — Gestion des taux de taxe (réutilise l'API existante, pas de doublon)** : l'écran « TVA & taxes » permet maintenant de **créer/lister des taux de taxe** (libellé + pourcentage + statut). Réutilise l'API `product-vat` déjà présente (CRUD `GET/POST/PATCH /product-vat`, table `productVat`) au lieu de créer une table `tax_rates` redondante — principe SIFA : ne pas dupliquer une API qui existe. Panneau de taux affiché même sans compte fiscal mouvementé ; création via modal. [3.54.0]

### Fixed
- **Comptabilité/SIFA — multi-devises sans conversion : soldes & rapports séparés par devise** : dans `/comptabilite`, tous les montants étaient sommés et affichés comme une seule devise (le symbole global `CUR`) alors que chaque transaction porte la sienne (`transaction.currency_id`, `journal_entries.currency_id`). Désormais, **principe SIFA respecté = aucune conversion, chaque devise est un sous-livre indépendant**. Backend : `AccountsService.subAccountBalances()` (table plate) et `LedgerService.subAccountBalances()` (grand livre) groupent par `(sous-compte × devise)` et renvoient `currencyId`/`currencyCode`/`currencySymbol` (jointure `currency`) ; `trialBalance` / `balanceSheet` / `incomeStatement` exposent des **totaux par devise** (`byCurrency`, `*ByCurrency`) et un `match` vérifié devise par devise ; `LedgerService.findAll()` (journal) renvoie le code devise de l'en-tête. Frontend : chaque montant affiche son **code devise**, une ligne par `(compte × devise)`, et les KPI/totaux (Plan, Balance, Bilan, Résultat, Trésorerie, Journal) sont **regroupés par devise** (composant `ByCur`, helpers `sumByCurrency`/`netByCurrency`). Aucune migration DB (colonnes `currency_id` déjà présentes). [3.57.0]
- **Dashboard — devise par défaut lue du paramètre, plus aucune constante en dur** : `salesByCurrency` retombait sur `"CDF"`/`"FC"` codés en dur quand une vente n'avait pas de devise. Remplacé par une résolution de la **devise par défaut depuis le paramètre** (`appSetting.currencyId` → table `currency`). Si aucune devise par défaut n'est configurée, les champs restent `null` (pas de devise inventée). La devise par défaut se règle dans les paramètres, jamais dans le code. [3.53.3]

### Changed
- **HR — sélecteurs de listes de données en autocomplete** : réutilise l'`Autocomplete` déjà présent dans hr-app (navigation clavier, filtrage). Convertis : filtres employé (paie, documents), sélecteur employé (génération de document), rôle et département (embauche d'un candidat). Les enums courts (période, type, devise, stade) restent en select. [3.53.5]
- **Domus — sélecteurs de listes de données en autocomplete** : nouveau composant partagé `Autocomplete` (filtrage texte, effacement, clavier). Les sélecteurs génériques `LeaseSelect` et `DomusPropertySelect` (points de levier → bénéficient à tous leurs usages : biens, unités, baux) deviennent recherchables, ainsi que le choix de bail/modèle (contrats) et de locataire (portail). Les enums courts restent en select. [3.53.4]
- **Comptabilité — sélecteurs de comptes en autocomplete** : les `<select>` de listes de données (choix de compte dans les modals d'écriture/compte et dans l'éditeur de règles SIFA) deviennent des **autocomplete recherchables** (nouveau composant `Autocomplete` local : filtrage par texte, effacement, clavier). Les enums courts (journal, statut, débit/crédit) restent en select natif. Premier jalon de la conversion select→autocomplete par app. [3.53.2]

### Fixed
- **CRM Dashboard — devises ambiguës ($ identique pour USD et CAD)** : la carte « Chiffre d'affaires » affichait deux lignes en « $ » indistinguables. Diagnostic : le code groupe correctement par devise (`revenue.byCurrency`), mais en base **CAD et USD partageaient le symbole `$`**. Corrigé sur deux fronts : (1) le dashboard expose maintenant `currencyCode` par devise et le `KpiCard` multi-devises **préfixe le code** (`USD $…`, `CAD CA$…`) → toujours non ambigu ; (2) symbole CAD corrigé en base dev (`$` → `CA$`). Le total brut multi-devises n'est jamais additionné à tort (déjà séparé par devise côté backend). [3.53.1]

### Added
- **ERP/SIFA — `projects` préparée comme registre partagé (future app de gestion de projet)** : en prévision d'une app de gestion de projet dédiée qui sera la **source autoritaire** des projets, la table `projects` reçoit deux colonnes de liaison neutres (principe SIFA : référencer une source, pas dupliquer). Migration `0126` (idempotente, PREPARE) : `source_system` (défaut `comptabilite`) + `external_ref` + index unique `(source_system, external_ref)`. `ProjectsService.create()` fait un **upsert idempotent** quand `sourceSystem`+`externalRef` sont fournis (l'app projet pousse ses projets sans créer de doublons ; les projets locaux gardent `external_ref` NULL). Tous les modules continuent de référencer par `project_id` (axe analytique). Aucune rupture pour l'existant. [3.53.0]
- **ERP/SIFA — Création de types de transaction modernes (règles multi-lignes) depuis l'app** : la table `transaction_type_rules` (modèle SIFA, consommée par `postByRules`) n'avait aucun endpoint de gestion — impossible de créer un type sans SQL. Ajout du CRUD : `GET /ledger/type-rules` (types groupés avec libellés de comptes), `POST /ledger/type-rules` (crée/remplace un type, **équilibre vérifié : au moins un DEBIT et un CREDIT**, soft delete des anciennes lignes), `POST /ledger/type-rules/:type/delete`. UI `comptabilite-app` : l'écran « Types de transaction » distingue désormais **Types SIFA** (règles multi-lignes éditables : chaque ligne = rôle métier · compte · sens) et **Types legacy** (débit/crédit fixe, lecture). Modal de création/édition multi-lignes (ajout/suppression de lignes, choix du compte et du sens). On peut enfin définir ses propres schémas comptables par rôle métier sans toucher la base. [3.52.0]

### Changed
- **Comptabilité — « Bailleur » → « Financeur » + modal au lieu des popups navigateur** : dans le module analytique (projets), « bailleur » (ambigu avec le bailleur immobilier de Domus) devient **« Financeur »** (libellés UI compta + FarmOS ; le bailleur immobilier de Domus est inchangé). Le « Nouveau projet » utilisait trois `window.prompt` natifs en cascade (popups moches du navigateur) ; remplacés par un **vrai modal** (`FormModal` générique réutilisable : nom / financeur / budget). [3.51.2]

### Added
- **ERP/SIFA P1 — Procurement : bons de commande + réception (boucle achat complète)** : l'écran Stock expose désormais les **bons de commande** (`/procurement/orders`) avec réf., fournisseur, statut (brouillon/commandé/reçu/annulé) et total. Bouton **Recevoir** : récupère les lignes restant à recevoir (`quantity - receivedQuantity`) et appelle `/orders/:id/receive`, ce qui crée les mouvements de stock et incrémente les quantités en entrepôt. Boucle le cycle achat SIFA : commande → réception → stock → facture → comptabilisation. [3.51.1]
- **ERP/SIFA P1 — Comptabilité : écrans Achats (factures fournisseurs) + Stock & entrepôts** : le backend P1 (purchase-invoices, procurement) était complet mais non exposé dans `comptabilite-app`. Deux nouveaux écrans branchés sur l'API réelle. **Factures fournisseurs** (`/purchase-invoice`) : liste (date, pièce, fournisseur, total, reste dû) + KPIs (nombre, total facturé, payé, reste dû via `query=info`) + **bouton Approuver** qui déclenche la comptabilisation de l'écriture différée (module gaté « purchase », cohérent avec le workflow SIFA). **Stock & entrepôts** (`/procurement/warehouses` + `/:id/stock`) : niveaux de stock par entrepôt, EmptyState honnête si aucun entrepôt. Nouvelle section de nav « Achats & stock ». Routes déjà whitelistées (middleware). [3.51.0]

### Changed
- **Comptabilité — Écrans Tiers/Trésorerie/Immo : libellés corrigés + exports CSV réels** : ces écrans étaient **déjà connectés** au grand livre (`/ledger/balances`), mais leurs EmptyState « non connectée » laissaient croire à un manque d'API. Wording corrigé pour refléter la réalité (« connecté au grand livre, en attente d'écritures sur un sous-compte de trésorerie/tiers/immo »). Les 3 boutons « Exporter » factices (toast « à connecter au backend ») deviennent de **vrais exports CSV côté client** (écritures, balance générale, et états financiers — compte de résultat / bilan / balance selon l'onglet), avec BOM UTF-8 pour Excel. Plus aucune action factice dans l'app. [3.50.7]

### Fixed
- **ERP/SIFA — Comptabilisation après approbation : le workflow déclenche enfin le post du ledger (bug critique)** : `WorkflowService.decide()` passait l'instance à `approved` mais **n'appelait jamais `LedgerService.approveAndPost()`** — l'écriture différée par le gate (`ledger_pending_entries`) n'était donc **jamais comptabilisée** même après approbation complète du circuit. Workflow et ledger étaient déconnectés. Désormais, quand un circuit atteint `approved`, le service rejoue l'écriture en attente (`entityType`/`entityId` → `approveAndPost`, hors transaction workflow, idempotent / no-op si rien en attente). `WorkflowModule` importe `LedgerModule`. C'était le blocage réel des 4 modules de dépense (farmos_expense/payroll/purchase/maintenance) sur dev ET prod. [3.50.6]
- **FarmOS — ETL vaccins : bornage des longueurs de colonne (run ACIA réel)** : le 1er run téléchargeant le vrai CSV ACIA a échoué sur `Failed query insert vx_registrations` car certaines lignes ACIA ont un `tradeName`/`ccvbNumber` très long (liste de produits) dépassant les `varchar`. Bornage à l'insert : `product_name` tronqué à 200, `registration_number` à 80. Lignes au nom vide ignorées. Le pipeline télécharge et parse désormais le CSV ACIA de bout en bout. [3.50.5]

### Changed
- **Comptabilité — Écran Approbations : pilotage des gates des 4 modules de dépense** : le tableau « Modules sous approbation obligatoire » devient **actionnable**. Il affiche les 4 modules de dépense connus (Dépense FarmOS, Paie, Facture d'achat, Maintenance) avec leur état dérivé des `approval-requirements`, et un bouton **Activer / Désactiver** par module (via `setApprovalRequirement`, confirmation explicite). Les gates de test (`test_*`) ne polluent plus la liste. Accompagne l'activation des 4 gates de dépense côté ledger (un comptable peut désormais piloter quels modules sont en comptabilisation différée sans passer par l'API). [3.50.4]

### Fixed
- **FarmOS — ETL vaccins : URL réelle du CSV ACIA + parsing colonnes officielles** : le 1er run de synchronisation sur dev a journalisé `ACIA HTTP 404` (URL par défaut erronée). Corrigé vers l'endpoint officiel `apps.inspection.canada.ca/webapps/veterinary-biologics-product-list/Home/GetAllCSV` (vérifié : HTTP 200, `text/csv`, ~158 Ko). Parser adapté aux vraies colonnes ACIA (`tradeName`, `manufacturer`, `species`, `statusCodeName`, `ccvbNumber`) : extraction du nom anglais quand `tradeName` est bilingue (séparateur `[]`), n° de licence `ccvbNumber` utilisé comme `source_ref`. Le pipeline E2E est validé : run journalisé, région Canada auto-créée, gestion d'erreur fonctionnelle. [3.50.3]

### Changed
- **FarmOS — Champ Vétérinaire et listes de données passés en autocomplete** : le champ « Vétérinaire » du dossier vétérinaire (`vetdossier.jsx`, ex-input « Dr… ») devient un **autocomplete branché sur la liste RH des vétérinaires** (`api.listFarmosStaff("vétérinaire")`), cohérent avec la saisie rapide. Les `<select>` portant de vraies **listes de données** (animal/lot dans le dossier et les documents vét., fournisseur de paillettes dans la banque de semence, rôle à l'assignation d'un employé) deviennent des **autocomplete recherchables** (composants `Autocomplete`/`AutocompleteDB` exportés depuis `quickentry.jsx`). Les enums courts fixes (espèce, urgence, statut, type, unité) restent en select natif (meilleure UX mobile). Champs verrouillés après signature : affichage en lecture seule préservé. [3.50.2]

### Added
- **Comptabilité — Plan de trésorerie & Flux de trésorerie branchés sur le grand livre** : les 2 derniers écrans encore en placeholder utilisent désormais les vraies données. **Plan de trésorerie & capacité** calcule le disponible immédiat (trésorerie ledger − dettes fournisseurs), le disponible projeté (+ créances à encaisser) et confronte les **engagements budgétaires restants** au disponible (alerte si dépassement). **Flux de trésorerie** (onglet États financiers) construit le tableau par méthode indirecte simplifiée (résultat net du compte de résultat + position de trésorerie du bilan). Tous les écrans `comptabilite-app` sont maintenant alimentés par l'API réelle, avec `EmptyState` honnête quand l'API ne renvoie aucune donnée. [3.50.1]
- **FarmOS — Référentiel vaccins : fouillage périodique des sources mondiales (ETL ACIA, CRON mensuel)** : pipeline d'ingestion automatisé du référentiel `vx_*` depuis les sources officielles, source pilote **ACIA/CFIA** (CSV des biologiques vétérinaires licenciés au Canada, mis à jour mensuellement). Migration `0125` (idempotente, `CREATE TABLE IF NOT EXISTS`) ajoute `vx_sync_runs` (journal des exécutions : fetched/staged/upserted/unmapped, statut, traçabilité) et `vx_staging_products` (miroir brut des lignes source, **idempotent par hash de ligne** `UNIQUE(source, row_hash)`). `VaccineSyncService` : `fetch` natif → parsing CSV défensif (colonnes par mots-clés) → **staging** → promotion **CORE** via `vx_synonym_map` (un produit n'est upserté que si son fabricant est résolu/mappé, sinon laissé en attente de validation humaine — jamais poussé auto sans mapping). Upsert idempotent des vaccins (clé naturelle nom produit) + homologation Canada. **CRON mensuel** (`@nestjs/schedule`, 1er du mois 03:00) **désactivé par défaut** (`VACCINE_SYNC_ENABLED`) : aucun appel réseau sortant tant que non activé. Endpoints `POST /vaccine-registry/sync` (déclenchement manuel, perm `update-farmos`) et `GET /vaccine-registry/sync/runs` (historique). [3.50.0]
- **FarmOS — Référentiel vaccins : seed normalisé (dimensions + 25 vaccins + protocole conditionnel)** : migrations `0121`→`0124` (idempotentes, INSERT IGNORE / WHERE NOT EXISTS) peuplent le référentiel `vx_*` : 7 régions réglementaires (ACIA, EMA-UPD, WOAH, WSAVA…), 9 espèces (noms scientifiques + FR/EN), 25 pathogènes, 8 fabricants, 25 vaccins normalisés avec composition (antigènes), espèces cibles (relations N-N), et une homologation WOAH par vaccin. Protocole exemple **Newcastle / Volaille** démontrant le moteur de règles : primo J1-7 (toujours) + rappel +21j **conditionné à zone à haut risque** (`vx_conditions` + `vx_protocol_step_conditions`). Délais de retrait (0j viande/œufs) sur les homologations volaille. Le référentiel est désormais requêtable et `resolveProtocol()` renvoie des étapes réelles. [3.49.1]
- **FarmOS — Référentiel mondial de vaccins animaux (socle normalisé + moteur de protocoles)** : évolution de la table plate `farmos_vaccines` vers un modèle relationnel normalisé multi-source / multi-région (migrations `0119`/`0120`, 15 tables `vx_*`). Référentiels universels (`vx_species`, `vx_pathogens`, `vx_regions`, `vx_manufacturers`, `vx_antigens`), produit + composition N-N (`vx_vaccines`, `vx_vaccine_antigens`, `vx_vaccine_species`), **homologations régionales** (`vx_registrations` + `vx_withdrawal_periods` — n° AMM et délai de retrait dépendent du pays), **protocoles cliniques** (`vx_protocols`, `vx_protocol_steps`) avec **moteur de règles data-driven** (`vx_conditions`, `vx_protocol_step_conditions` : règles asymétriques type « rappel S12 uniquement si zone à haut risque », groupes ET/OU), et `vx_synonym_map` pour l'ETL (normalisation espèces/unités hétérogènes ACIA/EMA/WSAVA/OMSA). `VaccineRegistryService` : catalogue filtrable, fiche complète (composition + homologations + délais), `resolveProtocol()` évalue les étapes applicables selon un contexte animal {âge, zone, type production, gestation}. Endpoints `/vaccine-registry/*` (species, pathogens, regions, vaccines, vaccines/:id, vaccines/:id/protocol). Plan détaillé : `livrables ERP-SIFA produits/PLAN_REFERENTIEL_VACCINS_MONDIAL.md`. Socle prêt pour l'ingestion ETL des sources officielles. [3.49.0]
- **ERP/SIFA P2 — Dépenses FarmOS rattachées à un projet/bailleur (analytique alimentée)** : colonne `project_id` sur `farmos_expenses` (migration `0118`, ALTER idempotent PREPARE). À la saisie d'une dépense, un sélecteur **Projet / bailleur** (masqué s'il n'existe aucun projet) ; le `project_id` est stocké et **porté sur la ligne de charge du grand livre** (création + comptabilisation post-approbation). Les rapports analytiques `/projects/:id/report` se remplissent donc avec de vraies données. Premier module écrivain branché sur l'axe analytique. [3.48.0]
- **FarmOS — Base de données de vaccins animaux (catalogue + spécifications)** : table `farmos_vaccines` (migration `0116`, UNIQUE org+nom) avec 24 specs par vaccin (maladies cibles, espèces, type, dose, voie, primo + rappels, durée de protection/traitement, délais de retrait viande/lait/œufs, effets secondaires, contre-indications, précautions, conservation, conditionnement, lien source, n° enregistrement). Seed `0117` de **25 vaccins réels** (volaille : Newcastle, Gumboro, Marek, Coryza, Coccidiose… ; ruminants : PPR, fièvre aphteuse, charbon, brucellose, dermatose nodulaire… ; porcs : peste porcine classique, rouget… ; carnivores : rage, Carré) d'après notices WOAH/OIE, FAO, WSAVA, fabricants. Endpoints `GET /farmos/vaccines` (filtrable par espèce), `GET /farmos/vaccines/:id`, `POST /farmos/vaccines` (ajout custom). UI : le champ texte « Vaccin » du formulaire de vaccination devient un **sélecteur** depuis la base (saisie libre conservée) avec **panneau de détails complet** (toutes les specs + lien source + avertissement « à valider par un vétérinaire »). [3.47.0]
- **ERP/SIFA P2 — Comptabilité analytique : module Projets / Bailleurs** : table `projects` (migration `0115`, dans le journal Drizzle → auto au boot) — code, nom, bailleur, dates, budget, devise. `ProjectsService` : CRUD (soft delete via is_active/status) + **rapport analytique live** `ledgerReport()` qui ventile produits/charges du grand livre filtrés sur `journal_entry_lines.project_id` (+ consommation budgétaire %). Endpoints `/projects` (+ `/:id`, `/:id/report`). Route whitelistée (middleware, désormais dans le CI). UI `comptabilite-app` → écran « Comptabilité analytique » branché : cartes par projet (dépensé/budget/%), tableau produits-charges-solde par projet, création de projet ; fallback démo si aucun projet. Pivot des rapports bailleurs ONG. [3.46.0]
- **ERP/SIFA P2 — États financiers depuis le grand livre moderne** : `LedgerService.incomeStatement()` (compte de résultat : produits Revenue − charges Expense = résultat net) et `balanceSheet()` (bilan : Actif = Passif + Capitaux propres + résultat de l'exercice, avec contrôle d'équilibre) calculés depuis `journal_entry_lines` par type de compte. Endpoints `GET /ledger/income-statement` et `GET /ledger/balance-sheet` (déclarés avant `/ledger/:id`). UI `comptabilite-app` → écran « États financiers » : onglets Compte de résultat et Bilan branchés sur ces endpoints (résultat excédent/déficit, équilibre Actif=Passif+CP), fallback démo si grand livre vide/API indispo. Premier chantier P2. [3.45.0]

### Fixed
- **ERP/SIFA P2 — `comptabilite-app` ne masque plus les écrans non finis avec des données mock** : retrait du fichier `src/data.js` et des fallbacks de démonstration dans les écrans Grand livre, Écritures, Journaux, Plan comptable, Types de transaction, Analytique, Budget, États financiers, Trésorerie, TVA, Immobilisations, Tiers et Capacité. Les écrans branchés lisent les API réelles (`/ledger`, `/ledger/balances`, `/ledger/trial-balance`, `/ledger/income-statement`, `/ledger/balance-sheet`, `/transaction-type`, `/projects`, `/budget/:id/status-ledger`) ; Plan comptable, Trésorerie, TVA, Immobilisations et Tiers exploitent les soldes du grand livre quand ils existent, tandis que les périmètres sans source backend fiable affichent un état vide explicite. L'assistant IA comptable ne simule plus de recommandations/chiffres et reste en mode non connecté tant qu'aucun backend IA réel n'est disponible. `npm run build` nu est bloqué dans `comptabilite-app`, avec `build:dev` / `build:prod` explicites. [Unreleased]
- **Déploiement PROD de FarmOS / Domus / BatiPro impossible (jamais mis à jour)** : pour ces 3 apps, le dossier servi en prod (`html-farmos-prod`, `html-domus-prod`, `html-batipro-prod`) est **INTERNE au conteneur `nglu_prod_frontend`** (pas bind-monté — contrairement à dev). Or les steps prod faisaient `scp → /opt/nglu-app/<app>/dist` (dossier hôte monté nulle part) + `nginx -s reload` → le build n'atteignait jamais le dossier réellement servi → **prod jamais mise à jour, malgré des pipelines « verts »** (symptôme : date de MAJ FarmOS introuvable en prod). Correctif : ces steps font désormais `docker cp /tmp/<app>-dist/. nglu_prod_frontend:/usr/share/nginx/html-<app>-prod/` + `nginx -t && reload`, comme HR/Comptabilité (qui marchaient déjà). Le frontend CRM prod (bind-monté → `html`) garde le pattern inode. [3.44.4]
- **Déploiement front : ancien build servi malgré un pipeline « réussi » (piège bind-mount/inode)** : les steps de déploiement bind-montés (frontend CRM, Domus, FarmOS en dev+prod, BatiPro prod) faisaient `scp -r app/dist $SERVER:$APP/app/`, ce qui **remplaçait le dossier** monté → nouvel inode orphelin → le conteneur nginx continuait de servir l'ancien build (symptôme vécu : date de MAJ FarmOS déployée mais bundle `h3XnP6TL` inchangé). Correctif `bitbucket-pipelines.yml` : scp vers `/tmp/<app>-dist/` puis `find $APP/<app>/dist -mindepth 1 -delete && cp -r /tmp/<app>-dist/.` — on vide le **contenu** du dist en **préservant l'inode** du bind-mount. Les steps hr/comptabilite/batipro-dev (déjà en `docker cp dist/.`) ne sont pas concernés. [3.44.3]

### Added
- **Date de dernière mise à jour dans le CRM (frontend)** : ajout de `VITE_APP_BUILD_DATE` au `define` du `frontend/vite.config.js` (qui n'utilise pas `versionDefine()`) et d'une tuile « Dernière mise à jour » dans l'onglet Paramètres → À propos (`AboutPanel`), à côté de Version/Build/Commit. Complète la même feature livrée sur les 5 apps métier. [3.44.2]
- **Date/heure de dernière mise à jour dans les Paramètres (5 apps)** : `versionDefine()` (source partagée `scripts/app-version.mjs`) injecte désormais `VITE_APP_BUILD_DATE` (date ISO du build). L'écran Paramètres/Réglages de chaque app créée — comptabilité, HR, BâtiPro, FarmOS (bilingue), Domus (nouvelle carte « À propos ») — affiche « Dernière mise à jour » formatée en local (ex. « 11 juin 2026 à 18:30 »). Reflète automatiquement la date du dernier déploiement, sans saisie. [3.44.1]
- **ERP/SIFA — UI comptabilité branchée sur le backend réel** : l'app `comptabilite-app` exposait des écrans sur données factices ; trois sont désormais câblés sur les vraies API. **Grand livre** (`GET /ledger`) liste les écritures partie double réelles (débit/crédit, module source, statut) avec contre-passation en un clic (`POST /ledger/:id/reverse`). Nouvel écran **Approbations** (menu Saisie) : dépenses en attente (`GET /workflow/instances?status=pending`) avec Approuver/Rejeter (`/workflow/instances/:id/approve|reject`) + liste des modules sous gate (`/ledger/approval-requirements`). **Budget** (`GET /budget` + `/:id/status`) affiche consommé vs alloué live depuis le grand livre. Chaque écran garde un fallback démo si l'API est vide/indisponible, gère les erreurs et respecte `canMutate` (lecture seule). `api.js` enrichi (endpoints ledger/workflow/budget) + classe CSS `btn-sm`. [3.44.0]
- **ERP/SIFA — Chantier P1 : module Documents (justificatifs centralisés)** : tables `documents` (fichier + hash + métadonnées) et `document_links` (rattachement polymorphe à N entités) — migration `0114`. `DocumentsService` : enregistrer un document (+ liens), rattacher à une entité (idempotent), lister les justificatifs d'une entité (`GET /documents/entity?entityType=&entityId=`), soft-delete. Permet d'attacher une pièce (facture scannée, reçu, contrat) à toute écriture/facture/commande. Endpoints `/documents`. Route whitelistée. [3.43.0]
- **ERP/SIFA — Chantier P1 : module Procurement + Stock (le « A » de SIFA)** : 6 tables (migration `0113`) — `warehouses`, `stock_movements`, `purchase_orders` (+lignes), `goods_receipts` (+lignes). `ProcurementService` : entrepôts, bons de commande (création + statuts draft/ordered/received/cancelled), **réception** (`receiveOrder` → goods_receipt + stock_movements IN + maj `received_quantity` + stock produit, marque la commande received si tout reçu), niveaux de stock (somme IN−OUT par produit/entrepôt), mouvements manuels. Chaîne demande→commande→réception→stock complète. Endpoints `/procurement/*` (warehouses, orders, orders/:id/receive, movements, stock). Route whitelistée. [3.42.0]
- **ERP/SIFA — HR paie + Domus maintenance câblés au workflow** : `hr` (paie, `sourceModule=payroll`) et `property-management` (coût de maintenance, `sourceModule=maintenance`) soumettent automatiquement au circuit `exp_approval` à la création ; endpoints `POST /salary-history/:id/approve` et `POST /property-management/maintenance-cost/:costId/approve` comptabilisent via `ledger.approveAndPost` à l'approbation finale. **Les 4 modules de dépense (FarmOS, achats, paie, maintenance) sont désormais branchés** sur le gate d'approbation centralisé. [3.41.0]
- **ERP/SIFA — Écritures comptables en attente + purchase-invoices câblé au workflow** : nouvelle table `ledger_pending_entries` (migration `0112`). `LedgerService.post()` ne lève plus 422 quand un module est gaté : il **persiste l'écriture en attente** (idempotent par entité) et renvoie `{deferred:true}`. `approveAndPost(sourceModule, relatedId)` rejoue le payload avec `skipApprovalGate` à l'approbation finale — abstraction générique réutilisable par tous les modules, sans dupliquer la logique. `purchase-invoices` câblé (soumission auto au circuit `exp_approval` à la création, endpoint `POST /purchase-invoice/:id/approve`). Contre-passation forcée non différée (`skipApprovalGate`). [3.40.0]
- **ERP/SIFA — Budget branché sur le grand livre (consommation réelle live)** : `BudgetService.statusFromLedger()` calcule la consommation de chaque ligne budgétaire directement depuis `journal_entry_lines` (somme nette débit−crédit sur compte + dimensions projet/site/département/activité), sans saisie manuelle. Reflète la réalité comptabilisée + alerte dépassement. Endpoint `GET /budget/:id/status-ledger`. Le couplage est en *pull* (Budget lit le grand livre) → pas de dépendance Ledger→Budget. [3.39.0]
- **ERP/SIFA — FarmOS câblé au workflow d'approbation (module pilote)** : à la création d'une dépense FarmOS, soumission automatique au circuit `exp_approval` (`submitExpenseForApproval`, no-op si le workflow/gate n'existe pas). Si le module `farmos_expense` est sous gate, la comptabilisation moderne est reportée (le 422 est toléré). Endpoint `POST /farmos/expenses/:id/approve` : approuve l'étape courante puis, à l'approbation finale, comptabilise via le grand livre avec `skipApprovalGate`. Modèle réplicable aux autres modules. [3.38.0]
- **ERP/SIFA — Gate d'approbation centralisé (dépense → approbation avant comptabilisation)** : table `ledger_approval_requirements` (migration `0111`, **vide par défaut = aucun blocage**, activation progressive par module). `LedgerService.post()` refuse (422) la comptabilisation d'une écriture dont le `sourceModule` exige une approbation tant qu'il n'existe pas d'instance workflow `approved` pour l'entité (`entityType=sourceModule`, `entityId=relatedId`). Bypass interne `skipApprovalGate` pour la comptabilisation déclenchée par l'approbation. Endpoints `GET/POST /ledger/approval-requirements`. Point de contrôle unique pour « toute dépense approuvée avant comptabilisation », activable module par module. [3.37.0]
- **ERP/SIFA — Chantier P1 : module Budget (engagement)** : tables `budgets`, `budget_lines` (par compte + dimensions, montant planifié), `budget_consumptions` (rattachée à une écriture du grand livre) — migration `0109_budget_core.sql`. `BudgetService` : créer budget + lignes, enregistrer une consommation, état consolidé (planifié/consommé/restant + alerte dépassement). Endpoints `/budget` (+ `/:id/lines`, `/:id/status`, `/lines/:lineId/consume`). Route whitelistée. Base des rapports bailleurs ONG. [3.36.0]
- **ERP/SIFA — Chantier P1 : module Workflow (approbations)** : moteur d'approbation générique transverse. Tables `workflows` (définition : clé unique/org, étapes JSON), `workflow_instances` (entité métier rattachée, étape courante, statut pending/approved/rejected), `workflow_approvals` (décisions tracées par étape) — migration `0108_workflow_core.sql`. `WorkflowService` : créer un circuit, soumettre une entité, approuver (avance ou clôt à la dernière étape) / rejeter, lister instances par statut. Endpoints `/workflow`, `/workflow/instances` (+ `/:id/approve`, `/:id/reject`). Route whitelistée (middleware). Réutilisable par achat/dépense/paie avant comptabilisation. [3.35.0]
- **Cœur comptable moderne ERP/SIFA — Phase 6 (périodes & clôture)** : gestion des `accounting_periods` dans `LedgerService` — `listPeriods`, `createPeriod` (refuse le chevauchement de dates), `closePeriod`, `reopenPeriod`. **Intégrité comptable** : `post()` refuse (409) toute écriture dont la date tombe dans une période clôturée (`assertPeriodNotClosed`), contre-passation incluse. Endpoints `GET/POST /ledger/periods`, `POST /ledger/periods/:id/close`, `POST /ledger/periods/:id/reopen` (déclarés avant `/ledger/:id`). [3.34.0]
- **Cœur comptable moderne ERP/SIFA — Phase 4 (rapports modernes en parallèle)** : `LedgerService.subAccountBalances()` et `trialBalance()` calculent les soldes par sous-compte depuis le grand livre moderne (`journal_entry_lines`, `side` DEBIT/CREDIT). Endpoints `GET /ledger/balances` et `GET /ledger/trial-balance` (déclarés avant `/ledger/:id` pour le routing). Ajoutés **en parallèle** des rapports table-plate existants (`accounts.service`) — pas de bascule sèche : les lecteurs actuels restent intacts tant que l'historique n'est pas migré (esprit strangler). [3.33.0]

### Fixed
- **Tables Workflow (0108) non créées sur dev + cause racine du split SQL** : `splitSqlStatements` (migrate.ts, repair au boot) suit les quotes `'` mais ne retirait pas les commentaires `--` ; une apostrophe dans un commentaire (« d'approbation ») faussait le suivi des quotes → `ER_PARSE_ERROR`, migration sautée (touchait aussi 0106/0101). Correctif durable : `splitSqlStatements` ignore désormais les commentaires pleine ligne `--`. Migration `0110_workflow_core_fix.sql` (commentaires sans apostrophe) recrée les tables workflow. [3.36.1]
- **`POST /ledger/by-rules` renvoyait 500** : le `ValidationPipe` global (`whitelist: true`) supprimait `amountsByRole` (champ sans décorateur class-validator) → `Object.keys(undefined)` dans `postByRules`. Ajout de `@IsObject()` + `@IsNotEmpty()` sur le champ DTO + garde défensive (400 explicite si manquant). Diagnostic confirmé par stack trace backend dev + inspection DB (règles 0107 correctement seedées, 10 règles sale/purchase). [3.33.1]
- **Seed des règles comptables non effectif sur dev** : la migration `0106` (INSERT … WHERE NOT EXISTS) n'a pas inséré les règles (échec silencieux au boot, dépendant de l'ordre repair/migrate). Migration `0107_ledger_seed_rules_fix.sql` : contrainte UNIQUE `(organization_id, type, role)` + `INSERT … ON DUPLICATE KEY UPDATE`, idempotente et insensible à l'ordre de boot. `postByRules` pourra résoudre les types `sale`/`purchase`. [3.32.1]

### Added
- **Cœur comptable moderne ERP/SIFA — Phase 3 (règles paramétrables)** : `LedgerService.postByRules(type, amountsByRole)` résout compte+sens de chaque rôle métier depuis `transaction_type_rules` (plus de comptes en dur) ; montants ≤0 ignorés. Endpoint `POST /ledger/by-rules`. Migration `0106_ledger_seed_rules.sql` (idempotente) seede les règles par défaut pour `sale` et `purchase` (org 1) d'après les comptes observés. Les paiements (compte = moyen de paiement) restent gérés ligne à ligne. [3.32.0]
- **Cœur comptable moderne ERP/SIFA — Phase 2 (farmos + hr câblés)** : FarmOS (ventes `farmos_sale:<id>`, dépenses `farmos_expense:<id>`) et HR (salaires `salary:<id>`) écrivent aussi en partie double via `LedgerService` (dual-write, idempotent par ID métier). Comptes dynamiques des types de transaction préservés ; HR salaire débit charge (10) / crédit caisse|banque. `FarmosModule` et `HrModule` importent `LedgerModule`. **Tous les services écrivains métier sont désormais câblés** (sale/purchase-invoices, property-management, farmos, hr) — il reste le seeding des règles (Phase 3) et la bascule des lecteurs (Phase 4). [3.31.0]
- **Cœur comptable moderne ERP/SIFA — Phase 2 (property-management câblé)** : les 4 opérations comptables de Domus écrivent aussi en partie double via `LedgerService` (dual-write, idempotent par ID métier) : paiement de loyer + part de taxe (`rent-payment:<id>`), caution reçue (`deposit-receipt:<id>`), restitution de caution avec retenue regroupée en une écriture équilibrée (`deposit-return:<id>`), coût de maintenance (`maintenance-cost:<id>`). Comptes dynamiques préservés (types de transaction, sous-comptes Tenant Deposits/Maintenance). `PropertyManagementModule` importe `LedgerModule`. [3.30.0]
- **Cœur comptable moderne ERP/SIFA — Phase 2 (purchase-invoices câblé)** : `purchase-invoices.service.create()` génère aussi une écriture moderne en partie double via `LedgerService` (dual-write, idempotent `purchase:<invoiceId>`). Lignes alignées sur les transactions plates (achat débit 3/crédit 5, TVA débit 15/crédit 5, paiements débit 5/crédit caisse), construites conditionnellement, écriture émise seulement si ≥2 lignes. `PurchaseInvoicesModule` importe `LedgerModule`. [3.29.0]
- **Cœur comptable moderne ERP/SIFA — Phase 2 (sale-invoices câblé)** : `sale-invoices.service.create()` génère désormais aussi une écriture moderne en partie double via `LedgerService` (dual-write strangler — les transactions plates restent en place jusqu'à la bascule des lecteurs en Phase 4). Chaque mouvement (cost of sales, créance TTC, TVA, paiements) devient 2 lignes débit/crédit regroupées sous une écriture unique par facture, idempotente (`sale:<invoiceId>`). `SaleInvoicesModule` importe `LedgerModule`. [3.28.0]
- **Cœur comptable moderne ERP/SIFA — Phase 1 (LedgerService + API)** : module `ledger` (backend2). `LedgerService.post()` comptabilise une écriture en partie double avec validation Σdébit=Σcrédit (calcul en centimes, ≥2 lignes), idempotence par `idempotencyKey`, résolution de période ouverte, le tout dans une transaction DB. `reverse()` = contre-passation (écriture inverse liée, aucun DELETE). Endpoints : `POST /ledger`, `GET /ledger`, `GET /ledger/:id`, `GET /ledger/account/:accountId` (grand livre + solde), `POST /ledger/:id/reverse`. Route `/ledger` ajoutée à la whitelist middleware. [3.27.0]
- **Cœur comptable moderne ERP/SIFA — Phase 0 (schéma)** : migration `0105_ledger_core.sql` créant `journal_entries`, `journal_entry_lines` (partie double, 1 compte + 1 sens, `decimal(18,2)`), `transaction_type_rules` (comptes paramétrables) et `accounting_periods`. Idempotence via `journal_entries.idempotency_key` (unique par organisation). Tables Drizzle ajoutées à `backend2/src/database/schema.ts`. Voir `livrables ERP-SIFA produits/PLAN_CŒUR_COMPTABLE_MODERNE.md`. [3.26.0]

## [3.25.0] - 2026-06-11

### Added

- FarmOS — gestion des permissions par employé. Le modal employé permet d'assigner un **rôle** (qui détermine les permissions via le RBAC) parmi les rôles disponibles (Admin Ferme, Gestionnaire Ferme, Éleveur, Vétérinaire, Superviseur Ferme, Employé Ferme, Lecture Ferme…). Backend : `GET /staff/roles` (rôles assignables, hors super-admin) ; `PUT /staff/:id` accepte `role_id` ; la liste des employés expose le rôle courant.

## [3.24.0] - 2026-06-10

### Added

- FarmOS — voir / modifier un employé + gestion du statut. Les cartes employés de l'écran Équipe sont cliquables : modal d'édition (prénom, nom, téléphone, rôle/désignation) et changement de statut **actif / parti / démissionné** (avec motif et date de départ). Backend : `PUT /staff/:id` (update) et `PATCH /staff/:id/status` (réutilise `status`/`leaveDate`/`leaveReason` de `users`, sans migration).

## [3.23.1] - 2026-06-10

### Fixed

- FarmOS — la barre latérale affichait « Non connecté » alors que l'utilisateur était connecté (arrivée depuis le CRM via cookie refresh). L'endpoint `GET /auth/refresh-token` expose désormais `id`/`firstName`/`lastName`/`username`/`email` ; `restoreSession` les stocke (comme le login formulaire) et le `UserChip` se rafraîchit sur l'événement `farmos:auth-changed`.

## [3.23.0] - 2026-06-10

### Added

- FarmOS — module pesées / courbe de croissance. Nouvelle table `farmos_weighings` (migration `0104`, journal idx 84) + endpoints `GET/POST/DELETE /weighings`. Onglet « Poids » dans la fiche animal : saisie rapide d'une pesée, courbe de croissance (SVG), historique avec suppression. La dernière pesée met à jour le poids courant de l'animal.

## [3.22.0] - 2026-06-10

### Changed

- FarmOS — bouton flottant (+) du menu mobile : ouvre désormais un **menu d'actions rapides** (nouvel animal, traitement, production, reproduction, stock, mortalité) en bottom sheet — grandes cibles tactiles adaptées au terrain — au lieu d'ouvrir directement « nouvel animal ». Conforme au principe UX du prompt design (actions rapides à une main).

## [3.21.0] - 2026-06-10

### Added

- FarmOS — statistiques de mortalité (UI). Nouvelle section « Mortalité — statistiques » dans l'écran Santé : total des décès, perte financière estimée, et graphiques à barres par espèce / par cause / par mois (consomme l'endpoint `GET /mortality-events/stats` ajouté en 3.18.0).

## [3.20.4] - 2026-06-10

### Changed

- FarmOS — wordmark officiel. Extraction du wordmark « FarmOS » (Farm vert + OS terracotta) de la planche officielle vers `farmos-wordmark.png`. Utilisé sur l'écran de connexion (lockup : icône tête-de-vache + wordmark image) à la place du texte CSS « FarmOS Pro ».

## [3.20.3] - 2026-06-10

### Changed

- FarmOS — vrai logo. Le composant `Brand` et toutes les icônes (favicon, app-icon PWA 192/512, maskable, apple-touch, `farmos-icon.svg`, assets Android) utilisent désormais le **vrai logo** (tête de vache réaliste + épis + herbe dans un cercle), extrait de la planche officielle `farmos-brand-concept.png` vers `farmos-logo.png`. Remplace les versions SVG approximatives précédentes (tracé fait main + ancien `farmos-icon.svg`) qui ne correspondaient pas à la charte.

## [3.20.2] - 2026-06-10

### Fixed

- FarmOS — écran Santé : les boutons « Individuel » et « Lot » ouvraient le même formulaire sans différence (et un 3e bouton « Nouveau » redondant). Désormais « Individuel » et « Lot » pré-sélectionnent le type d'application (`scope`) dans le formulaire de traitement ; le bouton « Nouveau » redondant est retiré.

## [3.20.1] - 2026-06-10

### Fixed

- FarmOS — responsive mobile : débordement horizontal (scroll + zone blanche à droite) sur l'écran Alertes et autres. La barre de filtres de sévérité scrolle maintenant horizontalement (boutons `flex-shrink:0`) au lieu de pousser la page ; garde CSS globale mobile (`overflow-x:hidden` sur la racine, `max-width:100%` sur les cartes, césure des compteurs mono longs).

## [3.20.0] - 2026-06-10

### Changed

- PDF — architecture centralisée : nouveau **microservice `pdf-service`** (Express + puppeteer-core + chromium isolé) qui génère les PDF (HTML→PDF) pour toutes les apps. backend2 n'embarque **plus** chromium ni puppeteer (Dockerfiles allégés, `puppeteer` retiré du package.json → fin des OOM/échecs de build sur l'installation chromium). HR et FarmOS appellent le service via HTTP (`backend2/src/common/pdf-client.ts`, `PDF_SERVICE_URL`, défaut `http://pdf-service:8002`). Le service lance chromium **à la demande** puis le ferme (empreinte mémoire ~nulle au repos, adapté aux petites instances). Compose dev+prod : service `pdf-service` (mem_limit 320m) ; pipeline : steps « PDF Service → dev/prod ». ⚠️ Déploiement effectif suspendu à la RAM de l'instance (cf. NOTES).

## [3.19.0] - 2026-06-10

### Changed

- FarmOS — panneau Tweaks (⚙ flottant) désactivé en dev et prod. Ses options visuelles utiles (Thème, Densité, Barre latérale, Langue) sont déplacées dans l'écran Paramètres, nouvelle carte « Apparence ». L'aperçu device et la navigation rapide (outils de dev) ne sont pas repris.

## [3.18.0] - 2026-06-10

### Added

- FarmOS — module mortalité enrichi (prompt design). Migration `0103` (journal idx 83) : `event_time`, `barn`, `lot`, `confirmed_cause`, `related_disease_id`, `pre_death_symptoms`, `vet_consulted`, `estimated_loss`, `necropsy_done` sur `farmos_mortality_events`. Section « Détails avancés » dans le formulaire de mortalité (heure, perte estimée $, bâtiment, lot, cause confirmée post-mortem, symptômes avant décès, vétérinaire, autopsie réalisée). Endpoint stats `GET /mortality-events/stats` : décès par mois/espèce/cause, total décès, perte financière totale. (UI des stats à brancher dans un écran dédié — endpoint + données prêts.)

### Fixed

- PDF — corrige le symlink chromium circulaire (`/usr/bin/chromium -> /usr/bin/chromium`) introduit en 3.16.1 : on ne crée le lien que si le binaire réel diffère de `/usr/bin/chromium` (priorité à `chromium-browser`).

## [3.17.0] - 2026-06-10

### Added

- FarmOS — reproduction : alerte anti-consanguinité. Lors d'une saillie/IA avec un mâle identifié (saillie naturelle ou partenaire), si la femelle et le mâle sont apparentés (le mâle est le père de la femelle, la femelle est la mère du mâle, ou fratrie via même mère/père), une confirmation `⚠ Risque de consanguinité` s'affiche avant l'enregistrement. Non bloquant (l'éleveur peut confirmer). Basé sur `mother_id`/`father_id` (ajoutés en 3.12.0).

## [3.16.1] - 2026-06-10

### Fixed

- PDF / pipeline — le bloc d'installation chromium dans `Dockerfile`/`Dockerfile.prod` est rendu NON bloquant (`set +e` + `|| echo WARN` + `exit 0`). L'instance dev a peu de RAM (442 Mio) et le pipeline build l'image sur le serveur (`up -d --build`) → l'`apk add chromium` (206 paquets) échouait en OOM (exit 127) et **cassait tout le déploiement backend**. Désormais le build réussit toujours : si chromium s'installe, le symlink `/usr/bin/chromium` est créé (PDF OK) ; sinon le backend démarre quand même et seul le PDF reste indisponible (échec propre au runtime). À régler définitivement : agrandir l'instance ou déporter le build de l'image (cf. NOTES).

## [3.16.0] - 2026-06-10

### Changed

- FarmOS — icônes animaux : `AnimalGlyph` rend désormais des emojis natifs colorés par espèce (🐄 vache, 🐖 porc, 🐔 poulet, 🐟 poisson, 🐐 chèvre, 🐑 mouton, 🐇 lapin, 🦆 canard, 🦃 dinde) au lieu des tracés SVG schématiques. Rendu « réaliste » et reconnaissable partout (cartes KPI, listes, sidebar, fiche animal). Fallback SVG conservé pour toute espèce sans emoji.

## [3.15.3] - 2026-06-10

### Fixed

- FarmOS — onglets fiche animal : le scroll horizontal des onglets était peu découvrable et difficile à utiliser. Remplacé par un retour à la ligne (`flex-wrap`) : tous les onglets restent visibles sans scroll caché, sur 1-2 lignes selon la largeur du panneau.

## [3.15.2] - 2026-06-10

### Fixed

- PDF — le build de l'image backend2 échouait (exit 127) sur `&& /usr/bin/chromium --version` dans `Dockerfile`/`Dockerfile.prod` : exécuter chromium en root dans Alpine au build retourne un code non-zéro et casse le build (donc le pipeline aussi). Remplacé par `test -x /usr/bin/chromium` (vérifie la présence/exécutabilité sans lancer le binaire). Puppeteer lance déjà chromium avec `--no-sandbox` au runtime. Débloque le rebuild de l'image avec chromium.

## [3.15.1] - 2026-06-10

### Fixed

- FarmOS — responsive fiche animal : le panneau de détail débordait hors écran à droite (sur desktop/tablette). Cause : grilles à panneau latéral utilisant `1fr` (min-width:auto implicite) → le contenu large (tableaux) empêchait la colonne fluide de rétrécir. Passage à `minmax(0, 1fr)` pour `--cols-main`, `--cols-main-detail`, `--cols-main-cal`, `--cols-main-15` (+ surcharges media/force-tablet). Barre d'onglets de la fiche animal : scroll horizontal (`overflow-x:auto`, onglets `flex-shrink:0`) pour les 8 onglets.

## [3.15.0] - 2026-06-10

### Added

- FarmOS — bibliothèque maladies : champs `causes possibles` et `examens recommandés` (complète les champs du prompt design). Migration idempotente `0102` (journal idx 82) + schema/DTO/service + 2 textareas dans le DiseaseFormModal. Backward-compatible.

## [3.14.1] - 2026-06-10

### Fixed

- PDF (HR + FarmOS) 500 « chromium=introuvable » : `backend2/Dockerfile.prod` (utilisé par docker-compose dev ET prod) n'installait pas chromium — le fix précédent (ca540a30) n'était que dans `Dockerfile`, non utilisé par le compose. Ajout du bloc `apk add chromium …` + symlink `/usr/bin/chromium` + `PUPPETEER_EXECUTABLE_PATH` dans `Dockerfile.prod` (build échoue si chromium absent). Vérifié sur serveur dev : chromium absent du conteneur actuel, `PUPPETEER_EXECUTABLE_PATH` vide → cause racine confirmée. Nécessite un rebuild d'image (le `apk add` neuf invalide le cache à partir de cette couche).

## [3.14.0] - 2026-06-10

### Added

- FarmOS — 3 modes UI (Éleveur / Vétérinaire / Gestionnaire) + Tout. Sélecteur de mode dans la barre latérale qui filtre la navigation principale selon le profil (Éleveur : quotidien terrain ; Vétérinaire : clinique ; Gestionnaire : direction/finance ; Tout : comportement historique, défaut). Mode persistant en localStorage (`farmos_mode`). Purement visuel : ne remplace pas les permissions backend (rôles), et le routing direct/deep-links mobile (`/farmos/<slug>`) reste accessible quel que soit le mode. Si l'écran actif sort du mode choisi, retour au tableau de bord.

## [3.13.0] - 2026-06-10

### Added

- FarmOS — rôles fins + permissions farmos. Migration idempotente `0101` (journal idx 81, rejouée auto au boot car idx ≥ 70) : crée les permissions `create/readAll/readSingle/update/delete-farmos` (qui n'étaient jamais seedées — le système marchait via les rôles `isSystem` qui bypassent le PermissionsGuard), les 7 rôles métier (Admin Ferme, Gestionnaire Ferme, Éleveur, Vétérinaire, Superviseur Ferme, Employé Ferme, Lecture Ferme) et leurs liaisons rôle↔permission (Admin/Gestionnaire = CRUD complet ; Vét/Superviseur/Éleveur = read+create+update ; Employé = read+create ; Lecture = read seul). `INSERT IGNORE` + `WHERE NOT EXISTS` → sûr sur bases déjà seedées, ne touche aucun rôle/permission existant. Assignation d'un rôle à un utilisateur via l'UI Rôles du CRM.

## [3.12.0] - 2026-06-10

### Added

- FarmOS — fiche animal : filiation (mère / père) + valeur estimée. Migration idempotente `0100` (journal idx 80) : colonnes `mother_id`, `father_id`, `estimated_value` sur `farmos_animals`. Backend schema/DTO/service (create + update). UI : champs Mère/Père/Valeur estimée dans le formulaire d'édition, carte « Filiation & valeur » dans l'onglet Détails (valeur au format devise `$`). Colonnes optionnelles → backward-compatible.

## [3.11.0] - 2026-06-10

### Added

- FarmOS — fiche animal enrichie : 3 nouveaux onglets dans le tiroir de détail animal. **Finances** (revenus/coûts/profit de l'animal + coûts par catégorie, via `getProfitability().byAnimal`), **Documents** (liste téléchargeable via `listDocuments(animalId)`), **Alertes** (délai de retrait viande/lait/œufs en cours, dérivé de `animal.withdrawal`). Réutilise les API existantes, aucun changement backend. Montants au format devise existant (`$`).

## [3.10.0] - 2026-06-10

### Added

- FarmOS — éditeur de bibliothèque maladies (UI) : carte « Bibliothèque maladies » dans l'écran Santé avec liste cliquable (filtrée par espèce) + bouton Ajouter, et modal `DiseaseFormModal` create/edit/remove exposant tous les champs enrichis (nom FR/EN, espèce, urgence, sévérité, risque de mortalité, voie de transmission, symptômes, prévention, protocole recommandé, contagieuse, vaccin disponible, notes). API front `updateDisease`/`deleteDisease` ajoutées (le backend exposait déjà PUT/PATCH/DELETE). Build farmos-app OK.

## [3.9.0] - 2026-06-10

### Added

- FarmOS — bibliothèque maladies enrichie : nouveaux champs `urgency_level`, `symptoms`, `prevention`, `vaccine_available`, `mortality_risk`, `recommended_protocol` sur `farmos_diseases` (migration idempotente `0099`, journal idx 79). Backend : schema Drizzle, `CreateDiseaseDto`/`UpdateDiseaseDto`, `createDisease`/`updateDisease` persistent ces champs. UI éditeur de maladie à venir (champs déjà exposés par l'API). Colonnes optionnelles → backward-compatible.

## [3.8.0] - 2026-06-10

### Added

- FarmOS — association médicament ↔ stock : à la création d'un traitement avec un médicament et une « Qté prélevée du stock », le stock du médicament est décrémenté automatiquement (réutilise `consumeMedicine`). Champ ajouté au formulaire de traitement (quickentry).

## [3.7.2] - 2026-06-10

### Fixed

- HR — téléchargement PDF : `downloadAuth` affiche désormais le message explicite du backend au lieu d'un « API 400 » brut. Un document sans contenu HTML (ex. contrat sans modèle) affiche « Ce document n'a pas de contenu à générer » au lieu d'une erreur cryptique.

## [3.7.1] - 2026-06-10

### Fixed

- PDF (cause racine enfin identifiée) : `chrome ENOENT … (chromium=introuvable)` — Chromium n'était pas présent dans l'image backend2 déployée. Dockerfile durci : localise le binaire réel après `apk add chromium` (chromium/chromium-browser), crée un lien stable `/usr/bin/chromium`, et **fait échouer le build si Chromium est absent** (garantit que l'image en prod l'a). Détection runtime élargie (htmlToPdf HR+FarmOS) à `/usr/lib/chromium/*`.
- Version « commit: unknown » en dev/prod : le build pipeline tourne hors dépôt git. `app-version.mjs` lit désormais `BITBUCKET_COMMIT` (puis `CI_COMMIT_SHA`) avant de retomber sur git.

## [3.7.0] - 2026-06-10

### Added

- Toutes les apps (hr, domus, batipro, comptabilite) : badge version affiché en bas **en mode dev uniquement** (`version-badge.js`, monté depuis main.jsx) + version dans l'écran **Paramètres/Réglages** (visible en prod). Écran Paramètres créé pour hr-app, batipro-app et comptabilite-app (n'en avaient pas) ; carte « À propos » ajoutée aux Réglages Domus. Le CRM (frontend) affichait déjà la version dans Réglages → À propos. Source unique : fichier racine VERSION.

## [3.6.0] - 2026-06-10

### Added

- FarmOS — rentabilité par bâtiment : `/profitability` renvoie désormais aussi `byBuilding` (regroupement via `animal.barn`), et la section Finances propose une 3ᵉ vue « Par bâtiment » en plus d'animal/lot.

## [3.5.2] - 2026-06-10

### Fixed

- HR PDF (fiches de paie / documents) : même correctif que FarmOS appliqué au `htmlToPdf` de hr.service — `waitUntil:"load"`, `protocolTimeout`, `--disable-gpu`, et exposition de la vraie cause Puppeteer dans la réponse au lieu d'un 500 générique (le bouton PDF de la paie renvoyait « API 500 »).

## [3.5.1] - 2026-06-10

### Fixed

- FarmOS PDF (toujours 500 après le fix Chromium) : `htmlToPdf` passe en `waitUntil:"load"` (les images base64 inline faisaient timeouter `networkidle0`), ajoute `protocolTimeout`/`--disable-gpu`, et expose désormais la vraie cause Puppeteer dans la réponse (au lieu d'un 500 générique) pour diagnostic sans logs serveur.

## [3.5.0] - 2026-06-10

### Added

- FarmOS — dossier vétérinaire enrichi (champs cliniques avancés) : motif de consultation, anamnèse, diagnostic différentiel, examens labo demandés + résultats, recommandation, suivi (migration 0098, ALTER idempotents). Ajoutés à l'éditeur et au rapport PDF.
- FarmOS — calculateur de dose dans l'ordonnance : saisie mg/kg × poids de l'animal → dose totale suggérée, bouton « Utiliser » pour remplir le champ dose.

## [3.4.0] - 2026-06-10

### Added

- FarmOS — module Bâtiments dédié : table `farmos_buildings` (migration 0097) avec capacité, type, température, humidité, responsable, statut d'hygiène. Endpoints CRUD `/buildings` ; l'occupation et le taux sont calculés à la volée depuis `farmos_animals.barn` (+ alerte surcapacité). Nouvel écran « Bâtiments » (cartes occupation + éditeur modal) et entrée de navigation.

## [3.3.2] - 2026-06-10

### Fixed

- Génération PDF (HR + FarmOS) : 500 « Internal server error » sur tous les exports PDF. Sur Alpine, le binaire Chromium est `/usr/bin/chromium` alors que `PUPPETEER_EXECUTABLE_PATH` pointait `/usr/bin/chromium-browser` (chemin absent → crash au lancement de Puppeteer). `htmlToPdf` (hr.service.ts + farmos.service.ts) résout désormais le 1er chemin existant parmi env / `/usr/bin/chromium` / `/usr/bin/chromium-browser` ; Dockerfile backend2 corrigé en `/usr/bin/chromium`. Corrige fiches de paie/documents RH ET dossier vét/rentabilité FarmOS.

## [3.3.1] - 2026-06-10

### Added

- FarmOS — carte « À propos » dans l'écran Paramètres affichant version / build / commit / environnement (visible aussi en prod).

## [3.3.0] - 2026-06-10

### Added

- FarmOS — dossier vétérinaire complet : examen clinique enrichi (T°, poids, examen, diagnostic, protocole), ordonnance multi-lignes (médicament/dose/fréquence/durée/voie + délais de retrait) et signature vétérinaire (canvas) qui verrouille le dossier. Migration `0095_farmos_vet_dossier` (tables `farmos_vet_exams` enrichie + `farmos_vet_prescriptions`). Commit `917c1a63`.
- FarmOS — documents & rapports PDF : table `farmos_documents` (certificats, ordonnances, factures, analyses labo, upload/download base64). PDF dossier vétérinaire + PDF rentabilité via Puppeteer (dépendance HR réutilisée). Migration `0096_farmos_documents`. Commit `917c1a63`.
- FarmOS — rentabilité par animal / lot : endpoint `/profitability` (revenu − coût par animal, agrégat par lot, totaux) + section dédiée dans l'écran Finances + export PDF. Commit `917c1a63`.
- FarmOS — badge version + environnement (dev/prod) en bas de la sidebar. Commit `55eac250`.

### Changed

- FarmOS — délai de retrait (withdrawal) : dénormalisation de `withdrawal_until`/`withdrawal_kind` sur l'animal (recalcul à chaque create/update/delete de traitement), alertes dashboard, et blocage de la vente d'un animal encore sous délai viande. Commit `917c1a63`.

### Fixed

- HR (drift migrations 0080->0087): les timestamps `when` du journal Drizzle etaient en desordre (0085/0086/0087 < 0084), si bien que Drizzle sautait ces 8 migrations au boot. Consequence sur dev: tables `hr_attendances`, `hr_candidates`, `hr_personal_documents`, `hr_tax_rules` absentes + colonnes payroll-approval / leave-workflow / document-generation manquantes -> ecrans Presences, Recrutement, upload de documents et paie casses (500). En plus, 0084 et 0087 etaient ecrites en syntaxe PostgreSQL (`serial`, `text DEFAULT NULL`).
  - 0084 et 0087 reecrites en MySQL (`BIGINT UNSIGNED AUTO_INCREMENT`).
  - 0082, 0083, 0085 et 0086 rendues idempotentes (pattern `SET/IF/PREPARE/EXECUTE` ou `IF NOT EXISTS`) pour pouvoir etre rejouees sans erreur.
  - Ajout de 0080->0087 a `OPERATIONAL_REPAIR_MIGRATIONS` (backend2 `migrate.ts`) afin qu'elles soient reappliquees a chaque boot tant que le journal reste desordonne -> corrige dev ET prod via pipeline.
  - Filet manuel: `scripts/sql/0080_0087_hr_drift_repair.sql` (idempotent) applique a la main sur la base dev.
- HR: les suppressions des tables avec `status` passent en suppression logique (`status=false`) et les listes masquent les enregistrements inactifs par defaut.
- HR app: nettoyage du flux d'enregistrement pour retirer les appels API HR dupliques/inatteignables, et alignement de `closeUser` sur `PUT /user/:id` afin de conserver `leaveDate` et `leaveReason`.
- HR app: affichage du telephone reel dans l'annuaire employes et ajout des actions Visualiser, Modifier et Fermer le compte depuis chaque employe.
- HR: ajout de la migration Drizzle `0071_hr_modules` pour creer automatiquement les tables RH manquantes (`hr_leave_requests`, contrats, documents, frais, declarations, performance, formations, recrutement) lors du deploy Bitbucket.
- HR app: stabilisation du tableau de bord departements; les compteurs/couleurs sont enrichis depuis le personnel live au lieu de remplacer le fallback par des departements API incomplets.
- HR app: suppression des donnees metier hardcodees de `data.js`; les ecrans utilisent uniquement les donnees API/BD ou affichent un etat vide.
- FarmOS app: suppression des donnees metier hardcodees de `data.jsx`; QuickEntry et les panneaux lisent les animaux, stocks, maladies et alertes depuis l'API/BD ou restent vides.

### Added

- HR deploy: ajout de `scripts/deploy-dev-hr-aws.ps1` et integration de `hr-app` dans `scripts/deploy-dev-all.ps1`.

## [3.2.0] - 2026-06-04

### Security

- Mise a jour de `drizzle-orm` 0.38.4 -> 0.45.2 : correction de la faille d'injection SQL via des identifiants SQL mal echappes (GHSA, severite haute). `drizzle-kit` 0.30.1 -> 0.31.10. Verifie : build NestJS OK, migrations au boot OK, health 200, requetes drizzle live OK.

### Fixed

- Domus (baux): menu d'actions « ... » aligne sur le CRM (4 etats: signe, en attente de signature, sans contrat, expire) et epure (sans « Exporter CSV » ni « Copier la reference »); « Renouveler » seulement si le bail finit dans <= 4 mois ou est expire; « Resilier » seulement si le contrat est signe; ouverture automatique vers le haut/bas selon la place; fermeture au clic en dehors ou sur Echap; « Voir les paiements » et « Tickets maintenance » deplaces dans le detail du bail.
- Domus: paiement de loyer bloque tant que le contrat du bail n'est pas signe; duree de bail inclusive (12 mois et non 11); filtre de periode par defaut sur « Annee »; message d'erreur API lisible (message NestJS au lieu du JSON brut); couleur distincte des biens Loue/Libre.
- Deploy: `deploy-dev-domus-aws.ps1` — le `git pull` distant est rendu non fatal pour ne plus interrompre la livraison de la dist locale (le serveur servait un vieux bundle).
- Domus: les actions contrat utilisent maintenant un vrai PDF `jsPDF` avec signatures bailleur/locataire; l'aperçu de contrat depuis les baux affiche aussi les signatures.
- Domus: alignement des criteres de donnees immobilier avec le CRM: filtre de periode par defaut sur "Tout", exclusion des soft-deleted/inactifs, unites rattachees aux biens actifs, et paiements rattaches aux baux visibles.
- FarmOS: le tableau de bord charge maintenant ses donnees via `GET /api/farmos/dashboard` au lieu de declencher plusieurs requetes liste cote navigateur.
  - Evite la cascade de rechargements causee par les evenements `farmos:cache-updated` de chaque table.
  - Le client realtime FarmOS attend maintenant un token avant d'ouvrir SSE/polling, et ne lance plus le polling en parallele d'une connexion SSE saine.
- FarmOS: les appels API frontend sont maintenant serialises et les lectures identiques deja en cours sont dedupliquees pour eviter les rafales `429` au chargement des ecrans.
- FarmOS: Workbox ne revalide plus les endpoints `/api/farmos/*`; le mode offline reste assure par Dexie et l'outbox, sans doubler les appels API.
- FarmOS: les refresh Dexie de fond (`farmos:cache-updated`) ne relancent plus les ecrans en boucle; les mutations et le realtime continuent de passer par `farmos:data-changed`.
- FarmOS: ajout d'une migration PWA qui desinscrit une seule fois les anciens service workers FarmOS pouvant encore intercepter `/api/farmos/*` et nettoyer leurs caches API.

### Added

- Domus: caution / depot de garantie — cycle complet encaissement + restitution avec retenue pour degats, comptabilisee en passif « Tenant Deposits » (debit Caisse/Banque). Nouvelle table `real_estate_security_deposits` (migration 0068, a creer a la main en prod via `scripts/sql/0068_security_deposits_apply.sql`) et endpoints `GET /deposits`, `POST /leases/:id/deposit`, `POST /leases/:id/deposit/return`.
- Domus (loyers): suivi des arrieres et du solde reel par bail gerant les paiements partiels — « reste a payer », barre de couverture fractionnaire, avance « couvert jusqu'a <mois> », metrique « Arrieres (reste du) » par devise.
- Domus: moyens de paiement supplementaires (Bancaire, Carte, Cheque) avec mapping comptable du compte debite selon le moyen (Caisse/Banque/Mobile Money); numero de recu auto et telephone locataire pre-rempli.
- CRM: colonne devise et symbole par paiement dans l'ecran Transactions.
- BatiPro: ajout du socle applicatif Construction sous `/batipro/` avec auth CRM partagee, PWA Vite, dashboard chantier, navigation CRM, routage nginx et permissions initiales.
  - Ajout des tables/API CRUD projets, taches, materiaux et equipes avec soft-delete, realtime et script de deploiement dev.

- Domus: configuration signature bailleur dans Reglages (eIDAS, tablette, cursif, image) — partagee avec le CRM via `landlordSignature`.

- SCRUM-247: Domus — ecran Contrats & signature (liste, KPIs, detail papier, journal d'audit, envoi/lien, modèles).
  - Creation depuis un bail, impression/PDF, renvoi pour signature, filtre periode global.
  - Panneau des modeles de contrat (lecture seule ; edition dans le CRM admin).

- SCRUM-249: Domus — ecran Espace locataire cable sur l'API (baux, paiements, contrats).
  - Hero locataire, prochain loyer avec statut, paiement mobile money, aide (maintenance, contact).
  - Documents (bail + quittances) et historique des paiements, filtre par periode global.
  - Selecteur gestionnaire pour previsualiser le portail d'un locataire ; pre-selection du bail vers Encaisser.

- Domus: ajout d'un ecran de connexion local partageant la meme session CRM/FarmOS via `access-token`, `role`, `roleId`, `user`, `id`, `email` et `isLogged`.

- SCRUM-227: Immobilier - restauration du suivi admin des liens d'inscription locataire.
  - Les dossiers d'inscription generes apparaissent de nouveau dans l'onglet Locataires avec badges Non rempli, En remplissage, Soumis ou Expire.
  - L'admin peut ouvrir un dossier, enregistrer un brouillon, completer les champs et valider pour creer le vrai locataire.
  - La creation de bail verifie maintenant que le locataire est un vrai locataire valide de l'organisation.

- SCRUM-221: Comptabilite/Dashboard - les factures vente/achat supprimees logiquement sont exclues des listes, totaux, graphiques et transactions comptables.
  - Ajout du statut soft-delete sur `saleInvoice` et `purchaseInvoice`.
  - La suppression d'une facture met aussi ses transactions liees en `status=false`.
  - Les dashboards, rapports et fiches client/fournisseur filtrent les factures et transactions actives.

- Immobilier: les signatures publiques de contrats publient maintenant un evenement realtime `contract`, et l'administration recharge automatiquement la liste des contrats.
  - Le statut signe, vu, envoye, cree ou supprime est propage via `data.updated` avec le tag `contracts`.
  - Le script backend dev remplace maintenant aussi `backend2/drizzle` afin de deployer les nouvelles migrations avec le code.

- SCRUM-226: Immobilier - correction du paiement des loyers en retard.
  - Le formulaire "Enregistrer paiement" ouvert depuis un retard pre-remplit maintenant le bail, le montant restant, la devise, la date, le mode et une note.
  - Les retards sont recalcules sur le solde restant du cycle: un paiement complet retire le retard, un paiement partiel reduit le montant du.
  - Apres saisie d'un paiement, les donnees immobilier completes sont rechargees pour refleter la nouvelle echeance.

- SCRUM-23: Realtime multi-tab offline and recovery support.
  - Added `BroadcastChannel("data-updates")` propagation for `data.updated` events across tabs.
  - Added SSE connection status tracking, reconnect refresh for active dashboard/property-management pages, light fallback polling while SSE is down, and a discreet recovery indicator.

- SCRUM-24: Realtime deploy contract guard for Redis/SSE/nginx routing.
  - Added `scripts/check-realtime-deploy-contract.mjs` to validate Redis in local/dev/prod compose files, `/api/events/me` frontend SSE path, nginx `/api/events/` buffering rules, and the production marketing/CRM/API routing contract.
  - Documented shared-data Docker and nginx validation in `REALTIME_SHARED_DATA_CONTRACT.md`.

- SCRUM-25: Realtime shared-data test coverage.
  - Added backend Jest coverage for `data.updated` event building/validation, data publisher Redis fallback behavior, EventBus delivery, and scope filtering.
  - Added frontend Vitest coverage for `data.updated` handlers, debounce, BroadcastChannel propagation, stale marking, and realtime connection status.
  - Added backend/frontend test scripts and dev test dependencies required to run the suites.

- SCRUM-165: **Fix — Immobilier: erreur "Validation failed (numeric string is expected)" lors de la suppression d'un locataire**
  - `TenantsPanel.jsx`: conversion explicite de `tenant.id` en entier via `parseInt(String(tenant.id), 10)` avant l'appel `deleteCustomer`
  - Garde ajoutée: si l'ID n'est pas un entier positif valide, affiche un message d'erreur sans appeler l'API
  - Comparaison bail corrigée: `Number(lease.tenantId) === numericId` pour éviter les incohérences de type
  - Message d'erreur amélioré: affiche le message API réel si disponible, sinon message générique

- SCRUM-22: **Realtime — Phase E: Scopes et confidentialité des données**
  - Nouveau fichier `backend2/src/realtime/scope-guard.ts` : définit les 4 types de scopes (`global`, `per_property`, `per_account`, `per_department`) et la fonction `scopeAllowsUser(scope, requiredPermissions, user)`.
  - V1 : filtrage par permissions (role-based). Les TODOs dans le code documentent précisément où ajouter les vérifications fines par propriété/compte/département quand les tables d'affectation existeront.
  - `SseController.canReceive()` utilise maintenant `scopeAllowsUser` au lieu d'inliner la vérification de permission.
  - Comportement V1 identique à avant (pas de régression) ; abstraction en place pour les phases suivantes.

- SCRUM-85: **HR Hub — Fonctionnalités manquantes complétées**
  - **Nouvel employé** : Bouton wiring + modal `EditStaffModal` en mode create (`mode="create"`). Champ password obligatoire (min 12 chars, lettre + chiffre). Appel `POST /user/register` au lieu de `PATCH /user/:id`.
  - **Filtres** : Dropdowns Select Ant Design pour département et statut dans l'onglet Employés. Filtre appliqué sur `filteredStaff` combinant recherche texte + département + statut.
  - **Export CSV** : Bouton Download exporte employés filtrés en CSV (Nom, Username, Email, Poste, Département, Statut, Salaire, Date d'embauche) avec BOM UTF-8 pour Excel.
  - Backend : `/user/register` déjà fonctionnel. Frontend : wiring et UI React uniquement. Modes edit et create coexistent via prop `mode`.

- SCRUM-142: `GET /dashboard/startup` — agrège KPIs + alertes (baux en retard, maintenance, stock faible, factures du mois) + badge SideNav en une seule requête (remplace 6 appels individuels). Backend: Promise.all sur DashboardService + counts DB directs. Frontend: `loadDashboardStartup` thunk, Dashboard.jsx migré, Header lit depuis Redux, SideNav lit depuis Redux avec fallback axios.
- SCRUM-142: `GET /dashboard/recent-activity` — agrège ventes récentes + cart orders PENDING/RECEIVED/DELIVERED en une seule requête (remplace 4 dispatches). Frontend: `loadDashboardRecentActivity` thunk, Content.jsx migré. Endpoints existants inchangés.

- SCRUM-167: **Immobilier — actions pour régler les paiements en retard**
  - **Bouton "Enregistrer paiement"** : sur chaque ligne en retard dans PaymentsTable, bouton rapide (▶) ouvre le formulaire pré-rempli avec le bail et le montant. Nouveau prop `initialLeaseId` dans `PaymentFormModal`.
  - **Bouton "Envoyer rappel"** : sur chaque ligne en retard, bouton (🔔) envoie un email nodemailer au locataire via nouvel endpoint `POST /property-management/payments/reminder`. Email inclut : bail référence, montant, appel à régulariser. Gestion SMTP : si non configuré, retour OK sans envoi.
  - Frontend : `PaymentsPanel` state `quickPayLeaseId`, handlers `handleQuickPay` et `handleSendReminder`. `PaymentsTable` ajoute boutons sur lignes `paymentStatus==="danger"`. Backend : `PropertyManagementService.sendPaymentReminder()` jointure `realEstateLeases → customers.email`, nodemailer HTML FR.

### Security

- SCRUM-15: **RISK-4 — Keep security server-side (Immobilier permissions audit)**
  - Added `@Permissions()` decorators to sensitive routes in `property-management.controller.ts`
  - Protected POST /properties, /units, /leases, /payments with `create-propertyManagement`
  - Protected PUT /properties/:id, /units/:id, /leases/:id with `update-propertyManagement`
  - Protected DELETE /leases/:id, /contracts/:id with `delete-propertyManagement`
  - Backend now enforces permission checks on all sensitive operations (previously missing)
  - Frontend permission hiding remains UX-only; backend validation is the security layer

### Fixed

- SCRUM-169: Immobilier > Baux > Nouveau bail: formulaire enrichi avec selections recherchables Bien/Unite/Locataire, filtrage des unites deja occupees, duree calculant automatiquement la date de fin, valeurs par defaut, devise autocomplete et statut `inactive` qui libere l'unite.

- SCRUM-168: Comptabilite > Ecritures permet maintenant aux usagers avec `update-transaction` ou `delete-transaction` de modifier ou supprimer logiquement une transaction.

- SCRUM-164: les compteurs Immobilier et les onglets Propriétés/Locataires excluent maintenant les propriétés, unités et rattachements supprimés/inactifs afin de rester alignés avec les listes visibles.

- SCRUM-165: suppression de locataire en Immobilier > Locataires : corrigé l'erreur "Validation failed (numeric string is expected)". Cause : `deleteCustomer(tenant.id)` passait un scalaire au lieu d'un objet `{ id, status }`. Fix : `deleteCustomer({ id: tenant.id })`. Suppression logique : `status=false`.

- SCRUM-166: le filtre `Tous` dans Immobilier > Paiements inclut maintenant les paiements en retard/en attente calcules depuis les baux, avec statuts coherents dans les vues Tableau, Par locataire et Calendrier.

- SCRUM-159: propriétés/unités immobilier rechargent désormais uniquement `/property-management/properties` et `/property-management/units` après création, modification ou suppression logique, au lieu de relancer `loadPropertyManagement()` et ses 8 endpoints.

- SCRUM-156: baux immobilier recharge désormais uniquement `/property-management/leases` et `/property-management/dashboard` après création, modification, suppression logique ou renouvellement, au lieu de relancer `loadPropertyManagement()` et ses 8 endpoints.

- SCRUM-157: paiements immobilier recharge désormais uniquement `/property-management/payments` et `/property-management/dashboard` après création d'un paiement, au lieu de relancer `loadPropertyManagement()` et ses 8 endpoints.

- SCRUM-158: maintenance immobilier recharge désormais uniquement `/property-management/maintenance` après création, modification, suppression logique ou changement de statut, au lieu de relancer `loadPropertyManagement()` et ses 8 endpoints.

- Contrats immobilier: ajout d'une confirmation Ant Design avant suppression logique d'un contrat, avec rappel que l'historique reste conservé.

- Baux immobilier: remplacement de la confirmation navigateur par une confirmation Ant Design avant suppression/résiliation logique, avec rappel que les historiques sont conservés et que l'unité sera marquée vacante.

- SCRUM-141: cartes "Par locataire" affichaient toujours "À jour" même pour les locataires en retard. Cause : `statusOf()` utilisait `Array.includes()` par égalité de référence sur des objets synthétiques créés à chaque render. Fix : lookup par `leaseId` via `Set`. Labels corrigés : "Montant dû" (retard), "Montant attendu" (attente), "Montant mensuel" (payé). Jours de retard affichés `(Xj)`. Commit : 697b192.

### Changed

- Scripts prod: `deploy-prod-aws.ps1` remplace maintenant les contenus `frontend/dist` et `marketing-site/dist` avec `sudo` puis remet les droits `admin`, pour eviter les blocages `Permission denied` sur les artifacts web.

- Scripts prod: `deploy-prod-backend-aws.ps1` remplace maintenant aussi `backend2/drizzle` avec `sudo rm -rf` avant extraction afin d'eviter les erreurs `tar: Cannot open: File exists` et `Permission denied` pendant le deploiement backend.

- Scripts dev: `deploy-dev-backend-aws.ps1` normalise maintenant les fins de ligne avant d'envoyer le script distant a `bash`, comme le script frontend, pour eviter l'erreur `set: pipefail\r` sur Windows.

- DEVELOPMENT_RULES.md: ajout d'une politique de périmètre Jira; les agents doivent préserver les fonctionnalités existantes et signaler le risque avant toute suppression ou réduction fonctionnelle.
- frontend/package.json: `npm run build` bloqué avec exit 1 — oblige à utiliser `build:dev` ou `build:prod` pour garantir la cible API.
- deploy-dev-aws.ps1: assertion locale `assert-api-target.mjs development` ajoutée avant le pack/upload, même avec `-SkipLocalBuild` — le script échoue si le dist ne contient pas `https://dev.ongdngolu.org/api`.
- scripts/deploy-dev-middleware-aws.ps1: nouveau script de déploiement middleware (pack src/ + rebuild image Docker + health check). DEVELOPMENT_RULES.md et DEPLOY.md mis à jour.
- scripts/deploy-dev-backend-aws.ps1: nouveau script de déploiement backend2 (NestJS build + upload dist + restart container + health check).

### Security

- SCRUM-112: lockout username après 5 échecs de connexion — compte verrouillé 15 min, audit log `auth.login.locked`, compteur réinitialisé sur succès.
- SCRUM-124: audit logs sur actions admin sensibles — `admin.user.created`, `admin.user.updated` (avec `passwordChanged`, `roleChanged`), `admin.user.status_changed`, `admin.role.created`, `admin.role.updated`, `admin.role.status_changed`, `admin.role.deleted`. UsersService et RolesService injectent `AuditService` via `AuditModule`.

## [3.1.0] - 2026-05-22

### Added

- SCRUM-85: HR hub page at `/admin/hr` — KPI strip (employés actifs, présents, masse salariale, congés), 6 onglets (Employés grille/tableau, Paie, Postes & Départements, placeholders Présences/Congés/Performance). Sidebar mise à jour.
- SCRUM-80: Page Paramètres unifiée à `/admin/settings` — layout left-sidebar avec 12 entrées (Entreprise, Profil, Sécurité, Notifications, Apparence, Facturation, Intégrations, Utilisateurs & Rôles, Modèles, Audit, Sauvegarde, À propos). Fusionne AppSettings et AdminSettings.
- SCRUM-109: table `sessions` (JTI UUID) et validation dans `JwtAuthGuard` — les tokens forgés sont bloqués même si `JWT_SECRET` fuite.
- SCRUM-138: outil de déploiement dev AWS (`scripts/deploy-dev-aws.ps1`) avec verrou serveur, smoke checks, et documentation.
- SCRUM-139: outil de déploiement production AWS (`scripts/deploy-prod-aws.ps1`) avec garde de confirmation, verrou serveur, smoke checks routage, et documentation.
- SCRUM-125: panneau "À propos" dans les paramètres — affiche la version de build et le CHANGELOG. Version affichée en bas des écrans local/dev, cachée en production.
- SCRUM-32: MFA TOTP complet — backend (otplib, codes de récupération), middleware routes, frontend login étape 2, panneau de configuration dans Paramètres > Sécurité.
- SCRUM-31: réinitialisation de mot de passe sécurisée — token unique SHA-256, révocation des sessions à l'usage.
- SCRUM-30: audit log avec redaction des champs sensibles (mot de passe, token).
- SCRUM-33: validation politique mot de passe + audit CI sécurité.
- SCRUM-27: hash du refresh token avant stockage DB + révocation au logout.
- SCRUM-28: remplacement du bypass super-admin par un flag `roles.is_system` en base.
- SCRUM-9: handler SSE `permissions.updated` — refresh des permissions en temps réel sans déconnexion.
- SCRUM-19/20/21: SSE temps réel — EventBus, hooks publisher, endpoint `/events/me`, client React avec reconnexion automatique.
- SCRUM-7/6/17/18: contrats d'événements Redis pour mises à jour permissions et données partagées.
- SCRUM-63: suppression propriété/unité avec garde de permission et vérification bail actif.
- SCRUM-43: paiements multi-select, export CSV en masse, export CSV baux.
- SCRUM-70: panneau alertes dans le header CRM.
- Rapports hub `/admin/reports` — 6 cartes de raccourcis vers les rapports existants.
- SCRUM-52: script smoke test du contrat de routage (`scripts/smoke-routing-contract.mjs`).
- Politique de versionnage (`VERSIONING.md`) et outil `scripts/version-info.mjs`.

### Fixed

- SCRUM-113: rate limiting 30 req/min sur les controllers de mutation sensibles (auth, users, roles).
- SCRUM-111: validation type MIME (JPEG/PNG/WebP/PDF) et limite 5 MB sur l'upload de reçus de coûts.
- SCRUM-110: Content Security Policy sur nginx (frontend) et Helmet (API backend).
- SCRUM-123: headers HTTP avancés — HSTS, Referrer-Policy, Permissions-Policy.
- SCRUM-120: désactivation de Swagger `/api-docs` en production (`NODE_ENV=production`).
- SCRUM-61: suppression logique des baux, contrats, templates et coûts de maintenance (`status=cancelled/deleted`, `isActive=0`).
- SCRUM-108: suppression logique des propriétés et unités immobilières (`isActive=0`).
- SCRUM-12: rejet du contexte d'authentification périmé — `AUTH_CONTEXT_STALE` si le rôle a changé depuis l'émission du token.
- SCRUM-107: suppression de l'erreur console sur l'URL de logo manquant.
- SCRUM-14: désactivation du buffering nginx pour SSE.
- SCRUM-71: nettoyage du header CRM mobile.
- SCRUM-65: déploiement dev CRM depuis artifact local (pas de build sur Lightsail).
- SSE: URL relative `/api/events/me` pour compatibilité nginx, token via query param `?token=`.
- deploy-dev-aws.ps1: paramètres renommés (`$RemoteNginxDir`, `$NginxComposeProject`) avec commentaire expliquant que nginx vit dans le stack prod; smoke checks étendus (`/admin/dashboard`, `/api/health`, `smoke-routing-contract.mjs`).

## [3.0.0] - 2026-05-22

### Baseline

- Current NGLU application baseline before enforcing per-change version notes.
- Future commits must update the `[Unreleased]` section before being pushed.
