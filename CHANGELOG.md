# Changelog

All notable project changes must be documented in this file.

This project follows:

- Semantic Versioning for the base application version in `VERSION`.
- Keep a Changelog style sections.
- Jira issue keys and Git commit hashes for traceability.

## [Unreleased]

### Added

- SCRUM-142: `GET /dashboard/startup` — agrège KPIs + alertes (baux en retard, maintenance, stock faible, factures du mois) + badge SideNav en une seule requête (remplace 6 appels individuels). Backend: Promise.all sur DashboardService + counts DB directs. Frontend: `loadDashboardStartup` thunk, Dashboard.jsx migré, Header lit depuis Redux, SideNav lit depuis Redux avec fallback axios.
- SCRUM-142: `GET /dashboard/recent-activity` — agrège ventes récentes + cart orders PENDING/RECEIVED/DELIVERED en une seule requête (remplace 4 dispatches). Frontend: `loadDashboardRecentActivity` thunk, Content.jsx migré. Endpoints existants inchangés.

### Fixed

- SCRUM-141: cartes "Par locataire" affichaient toujours "À jour" même pour les locataires en retard. Cause : `statusOf()` utilisait `Array.includes()` par égalité de référence sur des objets synthétiques créés à chaque render. Fix : lookup par `leaseId` via `Set`. Labels corrigés : "Montant dû" (retard), "Montant attendu" (attente), "Montant mensuel" (payé). Jours de retard affichés `(Xj)`. Commit : 697b192.

### Changed

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
