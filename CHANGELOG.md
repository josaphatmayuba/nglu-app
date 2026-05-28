# Changelog

All notable project changes must be documented in this file.

This project follows:

- Semantic Versioning for the base application version in `VERSION`.
- Keep a Changelog style sections.
- Jira issue keys and Git commit hashes for traceability.

## [Unreleased]

### Added

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
