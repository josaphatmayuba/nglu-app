# Mockup -> Implémentation : écarts & plan

Comparaison entre [design-mockup.html](../../../design-mockup.html) (section `data-page="immobilier"`) et [PropertyManagement.jsx](./PropertyManagement.jsx).

État au début : la majorité du mockup est implémentée (KPIs, 5 onglets, cartes propriétés/locataires/baux, 3 vues baux, modal contrat, tickets maintenance, paiements paginés).

---

## Phase 1 - Filtres de sous-onglets fonctionnels ✅ TERMINÉE

**Objectif** : Les chips de filtre statut sous les onglets Baux / Paiements / Maintenance doivent réellement filtrer la liste, pas seulement afficher des compteurs.

- [x] **Baux** - `leaseStatusFilter` (`all` | `active` | `renew` | `expired` | `no-contract`) câblé sur les 5 chips
- [x] **Paiements** - `paymentStatusFilter` (`all` | `paid` | `pending` | `late`) + reset `paymentsPage` à 1 au changement
- [x] **Maintenance** - `maintenanceStatusFilter` (`all` | `urgent` | `in_progress` | `done`) câblé

**Notes de travail** :

- **2026-05-16** - Implémentation complète, parse Babel OK.
- États ajoutés dans [PropertyManagement.jsx](./PropertyManagement.jsx) : 3 `useState` avec `"all"` par défaut, juste après `paymentsPage`.
- Baux : l'ancien `leasesView` a été séparé en `searchScope` (compteurs + bannière "sans contrat") et `leasesView` filtré par `leaseStatusFilter`.
- Paiements : le filtrage reste cohérent avec le modèle actuel, où `safePayments` représente les paiements encaissés. Pour afficher de vraies lignes "en attente" / "en retard", il faudra unifier les paiements attendus et les paiements réels.
- Maintenance : `renderMaintenanceMockup` a été converti en fonction à corps explicite pour calculer `maintenanceView` et les chips avant le JSX.

---

## Phase 2 - Vue Carte des propriétés ✅ TERMINÉE

**Objectif** : Le toggle grille/liste/**carte** doit afficher une vraie carte avec les propriétés.

- [x] Lib choisie : **Leaflet 1.9.4 + react-leaflet 4.2.1** (tuiles OpenStreetMap, pas de clé API).
- [x] Données géo : **aucun champ `latitude`/`longitude` n'existe** côté backend2 ni dans le modèle frontend → fallback pseudo-coords déterministes autour de Kinshasa.
- [x] Rendu carte avec marqueurs colorés par statut (loué/vacant/maintenance/retard).
- [x] Popup marker avec nom, adresse, statut, loyer + action "Assigner un locataire" si vacant.
- [x] Bannière d'avertissement quand au moins un marqueur est sur une pseudo-position.

**Notes de travail** :

- **2026-05-16** — Implémentation complète, parse Babel OK pour les deux fichiers.
- **Installation** : `cd frontend && npm install leaflet react-leaflet@4 --legacy-peer-deps`
  - `react-leaflet@5` exige `react@^19` ; le projet est en React 18 → pinner sur v4.
  - `--legacy-peer-deps` requis à cause d'un conflit *préexistant* entre `@ant-design/icons` et `@ant-design/charts@1.4.2` (ne pas tenter de résoudre dans cette phase, c'est hors scope).
  - Tentative `yarn add` échoue car `yarn` n'est pas sur le PATH de la machine — utiliser `npm` (le repo a les deux lockfiles).
- **Nouveau fichier** : [PropertyMapView.jsx](./PropertyMapView.jsx)
  - Composant isolé pour éviter d'alourdir `PropertyManagement.jsx` (déjà 3700+ lignes).
  - **Piège Leaflet/Webpack résolu** : les icônes par défaut de Leaflet pointent vers des URLs relatives non résolues par CRA → `setupDefaultIcon()` force les URLs CDN (workaround standard documenté).
  - Marqueurs : `L.divIcon` avec un `<span>` coloré (pas d'image) pour pouvoir teinter selon le statut sans charger d'assets supplémentaires.
- **Pseudo-coordonnées** (`pseudoCoords(id)`) :
  - Hash déterministe sur l'id → toujours la même position pour la même unité (évite que les marqueurs sautent entre les renders).
  - Spread de ±0.04° (~4 km) autour du centre de Kinshasa (-4.3217, 15.3126).
  - **Forward-compat** : si un jour `unit.latitude` / `unit.longitude` (ou `unit.property.latitude/longitude`) sont remplis côté backend, le composant les utilise automatiquement et n'affiche plus la bannière "approximative" pour ces marqueurs.
- **Intégration** ([PropertyManagement.jsx:~2074](./PropertyManagement.jsx)) : nouvelle branche `viewMode === "map"` placée **avant** la branche `"list"`, qui rend `<PropertyMapView />` avec `onAssignTenant` câblé au modal de création de bail.
- **CSS** : ajouté à la fin de [PropertyManagement.css](./PropertyManagement.css) (~80 lignes) — wrapper, canvas 520px, bannière ambre, dot marker, popup. Import du CSS Leaflet fait dans `PropertyMapView.jsx` via `"leaflet/dist/leaflet.css"` (déjà résolu par CRA).

**Comment vérifier** :

1. `cd frontend && npm start` (ou `yarn start` si installé).
2. Immobilier → onglet Propriétés → cliquer l'icône carte (3ème du toggle de vue).
3. La carte OSM doit s'afficher, centrée sur Kinshasa, avec un marqueur coloré par unité.
4. Bannière ambre visible tant qu'aucune unité n'a de coordonnées réelles.
5. Cliquer un marqueur → popup avec infos + bouton "Assigner un locataire" pour les unités vacantes.

**Améliorations possibles plus tard** (non bloquantes) :

- **Backend** : ajouter `latitude` / `longitude` (Float, nullable) au modèle Property côté Prisma + DTO, plus champs dans le formulaire de création/édition de propriété.
- **Géocoding auto** depuis le champ `address` à la sauvegarde (Nominatim côté backend pour respecter la politique d'usage : 1 req/s, User-Agent obligatoire).
- **Sélecteur de tuiles** (clair/sombre/satellite) si demandé.
- **Cluster** des marqueurs avec `react-leaflet-cluster` quand le nombre de propriétés explose.
- **Recadrage auto** `map.fitBounds()` sur les marqueurs réels une fois que les coords seront en base.

---

## Phase 3 - Panneau Filtres avancés ✅ TERMINÉE

**Objectif** : Le bouton "Filtres" du header doit ouvrir un panneau latéral / popover avec filtres avancés.

- [x] Filtres livrés : **ville/quartier, loyer min, loyer max, chambres min, surface min**
- [x] Persistance dans le state (state local React, pas l'URL — voir notes)
- [x] Badge sur le bouton indiquant le nombre de filtres actifs
- [x] Bouton "Réinitialiser" qui efface tous les filtres

**Notes de travail** :

- **2026-05-16** — Implémentation complète, parse Babel OK.
- **États ajoutés** ([PropertyManagement.jsx:~607](./PropertyManagement.jsx)) :
  - `advancedFiltersOpen` (bool) : ouvre/ferme le panneau
  - `advancedFilters` (objet) : `{ city, minRent, maxRent, minBedrooms, minArea }` — toutes les valeurs sont des **strings** (vide = pas de filtre), converties en number au moment du filtrage.
- **`activeFilterCount`** : memo qui compte les clés non vides → utilisé pour afficher le badge sur le bouton et le résumé "X filtres actifs" dans le pied du panneau.
- **Filtrage** ([PropertyManagement.jsx:~1297](./PropertyManagement.jsx) `filteredUnits`) : ajout de prédicats au-dessus du `return` existant pour ne pas casser la logique `searchTerm` + `typeFilter`. Tous les filtres sont AND.
  - Ville : recherche normalisée dans `unit.property?.city`, `unit.city`, `unit.displayAddress` (couvre les 3 schémas possibles vus dans le code).
  - Loyer : compare `Number(unit.monthlyRent || 0)` aux bornes.
  - Chambres / surface : seuils minimaux sur `unit.bedrooms` / `unit.area`.
- **UI** ([PropertyManagement.jsx:~3268](./PropertyManagement.jsx)) :
  - Le bouton "Filtres" du header (qui n'avait pas de `onClick`) est maintenant câblé à `setAdvancedFiltersOpen((v) => !v)`, avec classe `.active` quand ouvert et `<span class="immo-filter-badge">N</span>` quand au moins un filtre est actif.
  - Le panneau (`.immo-advanced-filters`) est rendu **juste après le header** (full-width bandeau) — pas en popover absolute. C'est plus simple (pas de gestion de clic extérieur), plus accessible (focus management trivial) et reste visible quand l'utilisateur scrolle dans la grille.
  - Grille auto-fit `minmax(160px, 1fr)` pour s'adapter mobile → desktop sans media queries.
- **CSS** : ajouté à la fin de [PropertyManagement.css](./PropertyManagement.css) (~90 lignes) — badge pastille indigo, panneau carte blanche, inputs avec focus ring.

**Choix d'architecture documentés** :

- **Bandeau full-width vs popover** : retenu le bandeau pour éviter de gérer la fermeture sur clic extérieur, le positionnement responsive et l'overflow.
- **State local React vs URL params** : retenu le state local. Persister dans l'URL (via `useSearchParams`) serait propre pour partage de lien, mais c'est de la complexité supplémentaire non demandée en Phase 3. Marqué comme amélioration possible.
- **Tous filtres en AND** : le mockup ne précise pas la logique de combinaison ; AND est la convention universelle pour ce type d'UI.

**Comment vérifier** :

1. `cd frontend && npm start`.
2. Immobilier → cliquer "Filtres" dans le header : le panneau s'ouvre sous la barre de titre.
3. Saisir "Gombe" dans Ville → la grille/liste/carte se restreint aux unités situées à Gombe.
4. Loyer min 500000, max 1500000 → restreint au range.
5. Badge sur "Filtres" affiche le nombre de filtres actifs ; bouton "Réinitialiser" vide tout.
6. Le filtre s'applique aux **3 vues** (grille, liste, carte) — `filteredUnits` est consommé par les trois.

**Améliorations possibles plus tard** (non bloquantes) :

- **Persistance URL** via `useSearchParams` (react-router) pour partage de lien filtré et back/forward navigateur.
- **Sliders** (Ant Slider) pour le range de loyer au lieu de deux inputs séparés — plus visuel.
- **Liste déroulante** Ville/Quartier (autocomplete depuis les valeurs distinctes des propriétés en base) plutôt que texte libre.
- **Réinitialisation par filtre** (petit ✕ sur chaque champ rempli) en plus du "Tout réinitialiser".

---

## Phase 4 - Vue Liste compacte des propriétés ✅ TERMINÉE

**Objectif** : Mode "liste" doit afficher un vrai tableau dense, pas juste un changement de CSS de cartes.

- [x] Séparer le rendu `viewMode === "list"` en un composant `<PropertyListTable>` (tableau natif)
- [x] Colonnes : Code, Nom, Type, Statut, Locataire, Loyer, Actions
- [x] Tri par colonne

**Notes de travail** :

- **2026-05-16** - Phase 4 implémentée dans [PropertyManagement.jsx](./PropertyManagement.jsx) et [PropertyManagement.css](./PropertyManagement.css).
- Ajout d'un composant `<PropertyListTable>` avec tri interne (`code`, `name`, `type`, `status`, `tenant`, `rent`) et ordre asc/desc au clic sur les en-têtes.
- Le mode `viewMode === "list"` n'utilise plus les cartes compactées : il affiche maintenant un vrai tableau dense avec scroll horizontal responsive.
- Colonnes livrées : Code, Nom/adresse, Type, Statut, Locataire, Loyer, Actions.
- Actions disponibles : assigner un locataire pour une unité libre, modifier l'unité pour toutes les lignes.
- Choix d'architecture : tableau HTML natif au lieu d'Ant Table pour rester cohérent avec les autres tableaux custom de l'écran Immobilier (`immo-table-scroll`, `immo-recent-table`) et garder un rendu proche du mockup.

---

## Phase 5 - Confort UX (paiements/baux)

- [ ] **Checkboxes de sélection multiple** sur le tableau paiements (le mockup les montre lignes 769-779 pour les factures, à appliquer ici)
- [ ] **Bouton Exporter** (CSV/PDF) pour Paiements et Baux
- [ ] **Action groupée** : marquer comme payé / envoyer rappel sur une sélection

**Notes de travail** :

- (vide)

---

## Correctif post-cutover - Grille Baux modulaire ✅ TERMINÉE

**Objectif** : Après activation de `PropertyManagementNew`, l'onglet Baux ne doit pas perdre le design du mockup/legacy.

- [x] Restaurer la structure de carte attendue par le CSS existant (`immo-lease-person`, `immo-lease-progress`, `immo-lease-card-foot`, `immo-card-actions`)
- [x] Remettre le badge statut à gauche et le chip contrat / bouton Générer à droite
- [x] Remettre la section progression avec référence, durée, barre, dates et pourcentage
- [x] Remettre le footer avec loyer, note paiement, bouton contrat et menu actions

**Notes de travail** :

- **2026-05-16** - Corrigé dans [modules/Leases/LeaseGridView.jsx](./modules/Leases/LeaseGridView.jsx).
- Cause : pendant l'extraction Phase C, `LeaseGridView` avait été simplifié avec une structure différente (`immo-lease-card-body`, `immo-progress-line`) qui ne correspondait pas au CSS du mockup. Résultat visible sur dev : cartes très hautes, textes collés, informations mal hiérarchisées.
- Correction : alignement du JSX modulaire sur la structure exacte de la grille legacy `renderLeasesMockup`, au lieu d'ajouter du CSS compensatoire. C'est plus sûr parce que `PropertyManagement.css` contient déjà tous les styles attendus pour ces classes.
- À vérifier par l'autre agent : onglet Baux en vue Grille sur `/admin/property-management`, puis comparer avec le mockup section Baux. La vue Tableau/Timeline n'a pas été modifiée dans ce correctif.

---

## Correctif post-cutover - Menu cartes Proprietes

**Objectif** : Le bouton `...` des cartes Proprietes doit ouvrir un menu visible comme dans l'intention du mockup.

- [x] Ajouter un etat de menu dans `PropertyCardGrid`
- [x] Rendre un dropdown sous le bouton `...`
- [x] Fermer le menu au clic exterieur
- [x] Documenter la passation pour l'autre agent

**Notes de travail** :

- **2026-05-16** - Corrige dans [modules/Properties/PropertyCardGrid.jsx](./modules/Properties/PropertyCardGrid.jsx), [modules/Properties/PropertiesPanel.jsx](./modules/Properties/PropertiesPanel.jsx) et [modules/Properties/PropertiesPanel.css](./modules/Properties/PropertiesPanel.css).
- Le fichier de passation est ici : [modules/Properties/PROPERTIES_DESIGN_HANDOFF.md](./modules/Properties/PROPERTIES_DESIGN_HANDOFF.md).
- Les actions `Voir paiements` et `Voir bail` ont encore des fallback demo tant que la navigation inter-onglets n'est pas branchee.

---

## Correctif post-cutover - Devise modal Proprietes

**Objectif** : Le modal de modification Proprietes doit permettre de choisir la devise utilisee par le loyer mensuel et le depot de garantie.

- [x] Remplacer le titre `Modifier l'unite` par `Modifier propriétés`
- [x] Ajouter le select `Devise loyer / dépôt`
- [x] Envoyer `currencyId` avec `monthlyRent` et `securityDeposit`
- [x] Documenter la passation pour l'autre agent

**Notes de travail** :

- **2026-05-17** - Corrige dans [modules/Properties/UnitFormModal.jsx](./modules/Properties/UnitFormModal.jsx) et [PropertyManagementNew.jsx](./PropertyManagementNew.jsx).
- Le fichier de passation est ici : [modules/Properties/PROPERTIES_DESIGN_HANDOFF.md](./modules/Properties/PROPERTIES_DESIGN_HANDOFF.md).
- Une seule devise est stockee par unite via `currencyId`; elle s'applique aux deux montants.

---

## Correctif post-cutover - Clause personnalisée contrat bail

**Objectif** : Le bouton `Ajouter une clause personnalisée` dans le workflow contrat doit ajouter un bloc editable comme dans le mockup.

- [x] Ajouter l'etat React des clauses personnalisées
- [x] Brancher le bouton `Ajouter une clause personnalisée`
- [x] Ajouter suppression, checkbox, titre, description et compteur
- [x] Inclure les clauses cochees dans le contenu genere
- [x] Documenter la passation pour l'autre agent

**Notes de travail** :

- **2026-05-17** - Corrige dans [modules/Leases/ContractWorkflowModal.jsx](./modules/Leases/ContractWorkflowModal.jsx) et [PropertyManagement.css](./PropertyManagement.css).
- Le fichier de passation est ici : [modules/Leases/LEASES_DESIGN_HANDOFF.md](./modules/Leases/LEASES_DESIGN_HANDOFF.md).
- Cause : le mockup utilisait `addCustomClause()` en JS imperatif, mais la version modulaire avait seulement le bouton sans `onClick`.

---

## Correctif post-cutover - Symboles devise encodés

**Objectif** : Les cartes ne doivent pas afficher les entites HTML de devise comme `&#36;`.

- [x] Decoder le symbole dans `shortMoney()`
- [x] Documenter la correction pour l'autre agent

**Notes de travail** :

- **2026-05-17** - Corrige dans [shared/format.js](./shared/format.js).
- Le fichier de passation est ici : [modules/Leases/LEASES_DESIGN_HANDOFF.md](./modules/Leases/LEASES_DESIGN_HANDOFF.md).
- Cause : `compactMoney()` decodait deja les devises, mais `shortMoney()` utilisait le symbole brut pour les formats `K` / `M`.

---

## Correctif full-stack - Devise des unités Propriétés

**Objectif** : La devise choisie pour `Loyer mensuel` et `Dépôt de garantie` doit être envoyée, sauvegardée par backend2 et renvoyée à l'UI.

- [x] Ajouter `currency_id` sur `real_estate_units`
- [x] Accepter `currencyId` dans `CreateUnitDto` / `UpdateUnitDto`
- [x] Sauvegarder `currencyId` dans `createUnit` / `updateUnit`
- [x] Renvoyer `currencyId`, `currencyName`, `currencySymbol` dans `/property-management/units`
- [x] Envoyer `currencyId` depuis le formulaire d'unités de `Nouvelle propriété`
- [x] Afficher les loyers Propriétés avec `unit.currencySymbol`

**Notes de travail** :

- **2026-05-17** - Corrige dans backend2 (`schema.ts`, `property-management.dto.ts`, `property-management.service.ts`, migration `0014_add_currency_id_to_property_units.sql`) et frontend (`PropertyFormModal.jsx`, `PropertiesPanel.jsx`, `PropertyCardGrid.jsx`, `PropertyListTable.jsx`, `PropertyMapView.jsx`).
- Le fichier de passation est ici : [modules/Properties/PROPERTIES_DESIGN_HANDOFF.md](./modules/Properties/PROPERTIES_DESIGN_HANDOFF.md).
- La migration doit etre appliquee sur local/dev avant que le backend accepte la colonne.

---

## SCRUM-72 — Maintenance 4 vues ✅ TERMINÉE

**Objectif** : L'onglet Maintenance doit avoir un toggle de vue Kanban/Liste/Tableau/Calendrier, comme dans le mockup (lignes 3813-3830).

- [x] `MaintenancePanel.jsx` avec toggle 4 vues (Kanban par défaut, persisté localStorage)
- [x] `MaintenanceKanbanView.jsx` — 3 swim lanes Ouvert/En cours/Résolu
- [x] `MaintenanceTableView.jsx` — tableau dense Ticket/Propriété/Priorité/Assigné/Statut/Coût
- [x] `MaintenanceCalendarView.jsx` — grille mensuelle, navigation prev/today/next
- [x] `MaintenanceTicketCard.jsx` — vue liste (cartes tickets existantes)
- [x] CSS ajouté en fin de `PropertyManagement.css` (banner SCRUM-72 : `.immo-kanban*`, `.immo-calendar*`, `.immo-table-row*`)
- [x] Wired dans `PropertyManagementNew.jsx` (composant actif de production)
- [x] Wired dans `PropertyManagement.jsx` (legacy — cohérence)

**Notes de travail** :

- **2026-05-19** (commit `ef1b7f7`) — Implémenté par josaphatmayuba. Fichiers créés : `modules/Maintenance/MaintenancePanel.jsx`, `MaintenanceKanbanView.jsx`, `MaintenanceTableView.jsx`, `MaintenanceCalendarView.jsx`. CSS ajouté à `PropertyManagement.css`. `PropertyManagementNew.jsx` déjà wired au moment du commit.
- **2026-05-19** (commit `2aff904`) — Audit mockup vs implémentation complet. Vérifié que toutes les phases 1-4 + SCRUM-72 sont conformes. Wired `MaintenancePanel` dans le legacy `PropertyManagement.jsx` pour cohérence (no-op en prod). Pas de Jira disponible dans la session — ticket SCRUM-72 à déplacer en `Done` manuellement.
- **Validation** : build/typecheck non exécutés dans cette session — à faire avant déploiement AWS dev.

---

## Convention de mise à jour

Pour chaque tâche entamée :

1. Cocher la case `[ ]` -> `[x]`
2. Ajouter une ligne dans **Notes de travail** de la phase avec : date, ce qui a été fait, fichiers touchés, problèmes rencontrés
3. Si un choix d'architecture est fait (ex. lib carte), le documenter ici avant de coder
