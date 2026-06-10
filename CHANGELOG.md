# Changelog

All notable project changes must be documented in this file.

This project follows:

- Semantic Versioning for the base application version in `VERSION`.
- Keep a Changelog style sections.
- Jira issue keys and Git commit hashes for traceability.

## [Unreleased]

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
