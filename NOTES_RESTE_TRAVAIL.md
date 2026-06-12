# Notes — reste du travail (session 10 juin 2026)

Branche `develop`, version actuelle **3.25.0** (push auto = deploy dev). Toujours bump VERSION + CHANGELOG + `Co-Authored-By: Claude Opus 4.8` à chaque commit.

## ✅ FAIT 10-11 juin (suite) — tout poussé develop
- Identité : vrai logo (tête de vache) extrait de la planche -> farmos-logo.png, partout (Brand, favicon, app-icons PWA, apple-touch, farmos-icon.svg régénéré) [3.20.3] ; wordmark FarmOS -> farmos-wordmark.png sur le login [3.20.4] ; emojis animaux 🐄🐖🐐 [3.16.0].
- UI/bugs : responsive panneau détail [3.15.1], onglets fiche animal en wrap [3.15.3], responsive mobile écran Alertes [3.20.1], boutons Individuel/Lot santé [3.20.2], sidebar « Non connecté » corrigé (refresh-token expose user) [3.23.1].
- Features : stats mortalité UI [3.21.0], FAB menu d'actions mobile [3.22.0], module pesées + courbe de croissance (table 0104) [3.23.0], voir/modifier employé + statut parti/démissionné [3.24.0], gestion permissions = assigner un rôle à un employé [3.25.0], Tweaks désactivé -> options dans Paramètres « Apparence » [3.19.0].
- Migrations à jour : journal 0095→0104 (idx 75→84).

## 🔴 PDF — refait en MICROSERVICE (3.20.0), déploiement suspendu à la RAM
- **Nouvelle archi (commit 15eff6fe)** : microservice **`pdf-service/`** (Express + puppeteer-core + chromium isolé). backend2 n'a PLUS chromium ni puppeteer (Dockerfiles allégés, `puppeteer` retiré du package.json + lock régénéré). HR & FarmOS appellent le service via HTTP (`backend2/src/common/pdf-client.ts`, env `PDF_SERVICE_URL=http://pdf-service:8002`). Chromium lancé **à la demande** (mémoire ~nulle au repos). Compose dev+prod : service `pdf-service` (mem_limit 320m). Pipeline : steps « PDF Service → dev/prod » (condition `pdf-service/**`).
- **Pourquoi** : l'ancien `apk add chromium` dans backend2 cassait le build (OOM 442 Mio) ; isoler le chromium dans son service supprime le risque pour le backend principal.
- **RESTE / À SURVEILLER** :
  - Le `pdf-service` doit démarrer sur le serveur. Au 10/06 soir, pas encore déployé (pipeline en retard, serveur encore à b0604701). Vérifier `docker ps | grep pdf`, `curl http://localhost:8002/health` dans le réseau, et un PDF réel.
  - ⚠️ **RAM** : l'instance fait 442 Mio. Même à la demande, lancer chromium ponctuellement peut saturer si tout tourne déjà. Vrai fix durable = agrandir l'instance OU swap (`fallocate`/`swapon`) OU build d'image en CI+registry (pas `--build` sur serveur). Nettoyage : `docker builder prune` (~3.6 Go), `docker image prune`.
  - Test final : `GET /api/farmos/reports/finance/pdf` (login demo / 246824682468Aa!) → header `%PDF` (37,80,68,70) ; `/api/hr/payrolls/2/pdf`.
  - ⚠️ Si jamais on revient à chromium-dans-backend2 : ne pas recréer le symlink circulaire (`ln` seulement si binaire réel ≠ /usr/bin/chromium).

## ✅ Mojibake (double-encodage UTF-8) — CLOS le 11 juin
- Confirmé : double-encodage (`é` = `C383C2A9` au lieu de `C3A9`). NE PAS se fier à l'affichage terminal (il « re-corrige » visuellement) → vérifier en **HEX**.
- **DEV : RÉPARÉ + vérifié** — `scripts/sql/repair_mojibake_farmos.sql` appliqué sur `nglu_db_dev` (conteneur `nglu_dev_mysql`). Post-vérif = 0 valeur corrompue, HEX redevenu `C3A9` sain (Clémence, Câline, Mère…). Reconversion `CONVERT(BINARY CONVERT(col USING latin1) USING utf8mb4)` ciblée `HEX LIKE '%C383%'`, idempotente.
- **PROD : RIEN À FAIRE** — `SHOW TABLES LIKE 'farmos%'` sur `nglu_db` (conteneur `nglu_mysql`) = **vide**. FarmOS n'est PAS déployé en prod (aucune table). Les futures données prod seront saisies en UTF-8 sain via l'app ; ne PAS importer les anciennes données corrompues (dev est désormais propre de toute façon).
- Accès serveur utilisé : `ssh -i "$HOME\Downloads\LightsailDefaultKey-ca-central-1 (3).pem" admin@16.54.167.125`. Astuce Windows : scp le `.sh`/`.sql` puis `sed -i '1s/^\xEF\xBB\xBF//'` + `sed 's/\r$//'` côté serveur (PowerShell injecte un BOM/CRLF via stdin).

## ⚪ FarmOS — manques prompt design encore À FAIRE
- Mortalité enrichie : heure, cause confirmée, maladie liée, autopsie, perte financière estimée + stats (décès/mois, /espèce, /bâtiment, taux). Migration + UI.
- Reproduction : **anti-consanguinité** (alerte/blocage saillie entre apparentés via mother_id/father_id déjà ajoutés). ABSENT.
- Onglets fiche animal **Alimentation** + **Poids/croissance** dédiés (courbe de poids). Actuellement fondus dans Production.
- FAB mobile → menu d'actions rapides (nourrir/peser/traiter/vacciner/mortalité) au lieu d'ouvrir direct « nouvel animal ». (MobileTabBar existe déjà, app.jsx l.288.)
- Granularité fine des permissions farmos par sous-module (refacto des 87 @Permissions du controller) si « rôles fins » réels requis.

## 🟢 À VALIDER SUR DEV (déployé, NON testé en runtime — session 10 juin soir)
Login demo : `POST /api/auth/login` {username:"demo", password:"246824682468Aa!"}. URL https://dev.ongdngolu.org.

- **[3.13.0 — AUTH, PRIORITAIRE] Rôles fins** (migration 0101, commit c53774b5) : migration **non exécutée localement** (pas de MySQL local).
  - Vérifier dans les logs backend au boot : « operational repair » / application de 0101 (idx 81, rejouée car idx≥70).
  - UI Rôles du CRM : les 7 rôles doivent apparaître (Admin Ferme, Gestionnaire Ferme, Éleveur, Vétérinaire, Superviseur Ferme, Employé Ferme, Lecture Ferme).
  - Permissions créées : `create/readAll/readSingle/update/delete-farmos` (n'existaient PAS avant ; farmos marchait via rôles isSystem qui bypassent le PermissionsGuard).
  - Test : un user en « Lecture Ferme » ne doit PAS pouvoir créer/supprimer (403) ; « Admin Ferme » = CRUD complet.
  - ⚠️ Granularité grossière (4 verbes globaux farmos) — le controller n'expose que ça. Finesse par sous-module = refacto des 87 @Permissions (chantier séparé).
- **[3.12.0] Filiation & valeur** (commit f90effa1) : fiche animal → Modifier → champs Mère / Père / Valeur estimée → enregistrer → vérifier persistance + carte « Filiation & valeur » dans l'onglet Détails (format $). Migration 0100 (mother_id, father_id, estimated_value).
- **[3.11.0] Onglets fiche animal** (commit ac443d00) : onglets Finances (revenus/coûts/profit via getProfitability), Documents (téléchargement), Alertes (délai de retrait). Finances n'affiche que si ventes/dépenses liées à l'animal.
- **[3.10.0] UI éditeur maladies** (commit e179e42c) : écran Santé → carte « Bibliothèque maladies » → Ajouter/Éditer → vérifier persistance des champs enrichis (urgence, symptômes, prévention, vaccin, mortalité, protocole).
- **[3.14.0] 3 modes UI** (commit c0cd7750) : sidebar → sélecteur Mode (Tout/Éleveur/Vét/Gestionnaire) → la nav se filtre ; vérifier que le deep-link `/farmos/finances` reste accessible même en mode Éleveur (routing direct préservé) ; mode persistant après reload.
- **[3.15.0] Maladies causes/examens** (commit bc6b2f1a) : 2 champs en plus dans DiseaseFormModal (migration 0102).
- **[3.15.1] Responsive fiche animal** (commit 784594fc) : le panneau détail ne doit plus déborder à droite (grilles minmax(0,1fr)).
- **[3.15.3] Onglets fiche animal en wrap** (commit c24002af) : tous les onglets visibles (1-2 lignes), plus de scroll caché.
- **[3.16.0] Emojis animaux** (commit 9d59a76a) : 🐄🐖🐐🐑… au lieu des SVG schématiques (KPI, listes, sidebar, fiche).
- ⚠️ **Beaucoup de ces fixes UI ne seront visibles qu'après REDÉPLOIEMENT du frontend farmos sur dev** (le frontend dev sert un build en retard — c'est ce qui explique emojis/responsive/mojibake vus en ligne).

## ✅ FAIT cette session (tous poussés sur develop)
- **[3.9.0→3.16.1] FarmOS** : bibliothèque maladies enrichie (0099 + UI 3.10.0) + causes/examens (0102, 3.15.0), onglets fiche animal Finances/Documents/Alertes (3.11.0), filiation+valeur estimée (0100, 3.12.0), rôles fins+permissions farmos (0101, 3.13.0), 3 modes UI (3.14.0), responsive panneau détail (3.15.1), onglets wrap (3.15.3), emojis animaux (3.16.0), fix pipeline chromium non bloquant (3.16.1).
- **Skill token-optimizer** installé/invocable + amélioré (router nglu, Windows, règle cache) ; CLAUDE.md créé (mode par défaut + règles dev depuis mémoire + DEVELOPMENT_RULES.md).
- #1 délai retrait, #2 dossier vét signé, #3 documents/PDF, #4 rentabilité animal/lot (commits initiaux 3.5.x→3.6.0).
- Module Bâtiments [3.4.0], rentabilité par bâtiment [3.6.0], dossier vét champs avancés + calcul dose mg/kg [3.5.0].
- Badge version dev + écran Paramètres (version) sur hr/domus/batipro/compta [3.7.0] ; CRM avait déjà.
- Fix `commit: unknown` via BITBUCKET_COMMIT [3.7.1] ; fix message doc PDF 400 [3.7.2] ; médoc↔stock [3.8.0].

## Rappels infra
- Migrations à appliquer au boot : 0095→0102 (journal à jour, idx 75→82). Idempotentes ; rejouées auto car idx≥70 (OPERATIONAL_REPAIR_MIN_INDEX dans migrate.ts).
- Pipeline backend : `up -d --build` build l'image SUR le serveur (RAM limitée) → tout `apk add` lourd doit être non bloquant. `npm audit --audit-level=high` (l.36) peut aussi bloquer un step.
- Whitelist middleware : `/farmos` wildcard déjà présent.
- Tests live API dev = PowerShell Invoke-RestMethod, login `POST /api/auth/login` {username:"demo", password:"246824682468Aa!"}.
