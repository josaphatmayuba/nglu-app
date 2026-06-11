# Changelog

All notable project changes must be documented in this file.

This project follows:

- Semantic Versioning for the base application version in `VERSION`.
- Keep a Changelog style sections.
- Jira issue keys and Git commit hashes for traceability.

## [Unreleased]

### Added
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
