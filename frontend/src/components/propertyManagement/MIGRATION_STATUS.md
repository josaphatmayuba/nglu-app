# PropertyManagement — Migration Status

Coordination board for the soft migration of [PropertyManagement.jsx](./PropertyManagement.jsx) (~3700 lignes) into 5 modules + a shared/ folder.

Reference plan : [fait-moi-un-plan-generic-locket.md](../../../../C:/Users/pauln/.claude/plans/fait-moi-un-plan-generic-locket.md) (local plan file, not committed).

## Rules

1. **Before starting a phase**, change its `État` from `pending` → `in_progress` and put your agent name + PR/branch link.
2. **At the end**, set `État` to `done`. Add a short note about what was delivered and any surprise found.
3. **Never** touch a phase already marked `in_progress` by someone else.
4. **Never** edit [PropertyManagement.jsx](./PropertyManagement.jsx) or [PropertyManagement.css](./PropertyManagement.css) before Phase F. If you find you need to, **stop** and document the dependency in the Notes column.

## Status

| Phase | Owner       | État         | Branche/PR | Notes |
|-------|-------------|--------------|------------|-------|
| 0     | claude (this session) | done | agents/nuclear-aphid | shared/ + hook + modules/ scaffolded. Le legacy continue de tourner inchangé. |
| A — Properties   | claude (this session) | done | agents/nuclear-aphid | Voir notes Phase A ci-dessous. Démo : `/admin/property-management/_new/properties`. |
| B — Tenants      | claude (this session) | done | agents/nuclear-aphid | Voir notes Phase B ci-dessous. Démo : `/admin/property-management/_new/tenants`. |
| C — Leases       | codex | done | agents/nuclear-aphid | Créé modules/Leases/LeasesPanel.jsx, LeaseGridView.jsx, LeaseTableView.jsx, LeaseTimelineView.jsx, LeaseContextMenu.jsx, ContractWorkflowModal.jsx, LeaseFormModal.jsx, LeaseRenewModal.jsx, leaseUtils.js. Module autonome avec filtres, 3 vues, contrat, création/édition/renouvellement. Non branché au legacy avant Phase F. |
| D — Payments     | codex | done | agents/nuclear-aphid | Créé modules/Payments/PaymentsPanel.jsx, PaymentsTable.jsx, PaymentFormModal.jsx. Le module consomme usePropertyManagementData(), gère filtres, pagination et création de paiement. Non branché au legacy avant Phase F. |
| E — Maintenance  | codex | done | agents/nuclear-aphid | Créé modules/Maintenance/MaintenancePanel.jsx, MaintenanceTicketCard.jsx, MaintenanceFormModal.jsx. Le module consomme usePropertyManagementData(), gère KPIs, filtres, liste tickets et création de ticket. Non branché au legacy avant Phase F. |
| F — Cutover      | codex | done | agents/nuclear-aphid | Route principale `/admin/property-management` sur `PropertyManagementNew.jsx`; routes preview `_new*` supprimées; messages "à câbler Phase F" nettoyés. Legacy reste dans le repo seulement comme référence non routée. |
| G — Archive      | Claude Sonnet | done | develop | SCRUM-41: `PropertyManagementNew.jsx` → `PropertyManagement.jsx` (renommé + legacy supprimé). Shim `PropertyMapView.jsx` supprimé. Routes `_new/*` supprimées de `PropertyManagementRoutes.jsx`. `PropertyManagementSettings` dérouté (import retiré). Migration terminée, aucun fichier legacy actif. |

## Phase 0 — ce qui a été fait

**Date** : 2026-05-16

**Fichiers créés** :

- [shared/constants.js](./shared/constants.js) — propertyTypes, unitTypes, maritalStatuses, coupleStatuses, statusColor, typeLabel, statusLabel, paymentMethodLabels, onboardingStatus, currencySymbolFallbacks, avatarColors, typeFilters, propertyListColumns, modalSelectProps.
- [shared/format.js](./shared/format.js) — money, decodeCurrencyText, cleanCurrencySymbol, getCurrencyValue, optionalNumber, buildCurrencyOptions, compactMoney, shortMoney, normalize.
- [shared/tenants.js](./shared/tenants.js) — tenantName, tenantNameFromLease, initials, parseOnboardingData.
- [shared/units.jsx](./shared/units.jsx) — getUnitKind, unitTypeIcon (JSX), ticketIconFor (JSX), ticketIconTone.
- [shared/ui.jsx](./shared/ui.jsx) — Kpi, MetricCard, EmptyState (composants présentationnels).
- [shared/usePropertyManagementData.js](./shared/usePropertyManagementData.js) — hook central : selectors Redux + dispatchers bootstrap + memos `safeX` + `enrichedUnits`, `availabilityRows`, KPIs (occupiedUnits, vacantUnits, monthlyRent, occupancyRate, etc.), buckets de paiements (overduePayments, upcomingPayments, paidAmount, pendingAmount, lateAmount, plannedAmount), buckets de maintenance.
- [modules/.gitkeep](./modules/.gitkeep) — dossier d'accueil pour les modules à venir.
- Ce fichier ([MIGRATION_STATUS.md](./MIGRATION_STATUS.md)).

**Imports relatifs depuis `shared/`** :

```js
// Les modules sous modules/<Name>/ doivent importer comme suit
import { tenantName } from "../../shared/tenants";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";
import { Redux } from "../../../../redux/rtk/features/..."; // 4 niveaux jusqu'à src/
```

**Pièges connus pour les phases suivantes** :

- `unitTypeIcon`, `ticketIconFor`, `ticketIconTone` retournent du JSX → fichier en `.jsx`.
- Le hook `usePropertyManagementData` **dispatche déjà** `loadPropertyManagement`, `loadAllAccount`, `loadContracts`, `loadContractTemplates`, `loadAllCurrency` au mount. Ne pas re-dispatcher dans les panneaux.
- `paidAmount` est calculé sur le mois courant uniquement (cf. logique d'origine).
- `pendingAmount` / `lateAmount` sont des **agrégats de loyers de baux** (pas de paiements réels) ; pour les afficher correctement dans le panneau Paiements, voir la note de Phase 1 dans [MOCKUP_GAPS.md](./MOCKUP_GAPS.md).
- Tous les exports `shared/*` sont également **dupliqués** dans [PropertyManagement.jsx](./PropertyManagement.jsx) (lignes ~102-590) — ne pas supprimer ces définitions tant que la Phase F n'a pas tourné.
- Pour vérifier qu'un fichier compile : `node -e "require('./frontend/node_modules/@babel/parser').parse(require('fs').readFileSync('<path>','utf8'),{sourceType:'module',plugins:['jsx']});"`.

## Phase A — ce qui a été fait

**Date** : 2026-05-16

**Fichiers créés** (dans `modules/Properties/`) :

- [PropertyMapView.jsx](./modules/Properties/PropertyMapView.jsx) — déplacé depuis `propertyManagement/PropertyMapView.jsx` (contenu identique sauf renommage de `statusColor` interne en `markerColor` pour éviter un shadow avec `constants.statusColor`).
- [PropertyListTable.jsx](./modules/Properties/PropertyListTable.jsx) — extrait depuis [PropertyManagement.jsx](./PropertyManagement.jsx) (lignes ~400-555 dans la legacy). Garde la signature `{ units, avatarColors?, initials?, onAssignTenant, onEditUnit }` avec valeurs par défaut depuis `shared/` pour rester drop-in compatible avec l'inline legacy.
- [PropertyCardGrid.jsx](./modules/Properties/PropertyCardGrid.jsx) — extrait de `renderProperties` (branche grille, lignes ~2118-2196).
- [RecentPaymentsTable.jsx](./modules/Properties/RecentPaymentsTable.jsx) — extrait de `renderProperties` (lignes ~2205-2265). Prend `payments`, `latePayments`, `pendingPayments`, `onViewAll` en props.
- [PropertyFormModal.jsx](./modules/Properties/PropertyFormModal.jsx) — modal **autonome** : possède son propre `Form.useForm`, dispatche `saveProperty` + batch `saveUnit` quand `addUnitsNow` est coché, déclenche `loadPropertyManagement` après succès et appelle `onSaved`/`onClose`. Signature : `{ open, record, onClose, onSaved }`.
- [PropertiesPanel.jsx](./modules/Properties/PropertiesPanel.jsx) — orchestrateur. Consomme `usePropertyManagementData()`, gère son propre `typeFilter` / `viewMode` / `advancedFilters` / `searchTerm` (avec props optionnelles `searchTerm` + `onSearchTermChange` pour permettre à Phase F de connecter la barre de recherche globale).
- [PropertiesPanel.css](./modules/Properties/PropertiesPanel.css) — petit CSS co-localisé pour le toolbar du panneau (évite de toucher au fichier CSS global).

**Fichiers modifiés** :

- [PropertyMapView.jsx](./PropertyMapView.jsx) (ancien chemin) — réduit à un **re-export shim** vers `./modules/Properties/PropertyMapView`. Le legacy [PropertyManagement.jsx](./PropertyManagement.jsx) importe toujours `./PropertyMapView` et continue de fonctionner.
- [PropertyManagementRoutes.jsx](../../layouts/AdminRoutes/PropertyManagementRoutes.jsx) — ajout d'une route de démo `/admin/property-management/_new/properties` qui rend `<PropertiesPanel />` en isolation (à supprimer en Phase F).

**Fichiers PAS modifiés** (par règle) :

- [PropertyManagement.jsx](./PropertyManagement.jsx) — **strictement intact**, le legacy tourne toujours. `PropertyListTable` reste défini inline dedans ; ce n'est PAS un re-export car personne d'externe ne l'importait.
- [PropertyManagement.css](./PropertyManagement.css) — pas touché. Le panel utilise les classes CSS existantes (`.immo-property-grid`, `.immo-property-card`, `.immo-property-list-table`, `.immo-filters`, `.immo-view-switch`, etc.) + un mini CSS co-localisé.

**Choix d'architecture** :

- **Modal autonome** vs callback `onOpenModal('property')` : retenu autonome. Le modal porte sa propre logique de save (saveProperty + batch saveUnit + loadPropertyManagement). Phase F pourra remonter cet état si besoin d'une orchestration centralisée, mais l'autonomie permet à la démo de fonctionner sans wiring externe.
- **Callbacks `onAssignTenant` / `onEditUnit` / `onViewAllPayments`** en props (optionnels) : Phase F les câblera vers les modaux lease/unit du PropertyManagementNew. En isolation démo, fallback `window.alert` pour signaler que c'est un cross-module qui sera relié plus tard.
- **State local** (typeFilter, viewMode, advancedFilters) plutôt que props : permet la démo isolée. Phase F pourra hisser ces états si besoin de partage avec la barre de recherche globale.

**Comment vérifier** :

1. `cd frontend && npm start`
2. Naviguer vers `/admin/property-management` → le legacy doit fonctionner *exactement comme avant* (aucune régression Phase 1-3 attendue).
3. Naviguer vers `/admin/property-management/_new/properties` → le nouveau panel doit afficher :
   - Toolbar avec recherche + Filtres (badge si actifs) + Nouvelle propriété
   - Panneau filtres avancés (ville, loyer min/max, chambres, surface) replié par défaut
   - Filtre type chips (Tous, Appartement, Maison, Bureau, Commerce)
   - Switch de vue grille / liste / carte
   - Selon la vue : grille de cartes, tableau triable (clic sur colonne), ou carte Leaflet (Kinshasa, marqueurs colorés)
   - "Paiements de loyer récents" en bas si paiements présents
   - Bouton "Nouvelle propriété" ouvre la modal complète avec section unités optionnelle

**Pièges rencontrés / à connaître** :

- Conflit de nom : le helper local `statusColor` de `PropertyMapView` (couleur du marqueur) entrait en collision conceptuelle avec `shared/constants.statusColor` (table de Tag color). Renommé en `markerColor` dans la version module.
- `Form.useWatch` doit être appelé **dans le composant qui rend le `<Form>`** (pas dans un parent). C'est pourquoi le watch `addUnitsNow` vit dans `PropertyFormModal`, pas dans `PropertiesPanel`.
- Le legacy [PropertyManagement.jsx](./PropertyManagement.jsx) continue d'avoir sa propre version de `renderProperties` / `PropertyListTable` / `addUnitsNow` watch — c'est intentionnel (migration douce). Phase F supprimera tout ça d'un coup.

## Phase B — ce qui a été fait

**Date** : 2026-05-16

**Fichiers créés** (dans `modules/Tenants/`) :

- [TenantContextMenu.jsx](./modules/Tenants/TenantContextMenu.jsx) — menu contextuel (Modifier / Voir bail / Voir paiements / Copier email / Copier téléphone / Supprimer). Reçoit `tenant`, `lease`, `onAction(action, tenant)` en props.
- [TenantCard.jsx](./modules/Tenants/TenantCard.jsx) — carte locataire avec avatar, badge (VIP/Pro/Standard/Retard/À renouveler) et ligne bail. Reçoit `tenant`, `tenantLeases`, `activeUnit`, `index`, `menuOpen`, `onToggleMenu`, `onAction`.
- [TenantFormModal.jsx](./modules/Tenants/TenantFormModal.jsx) — modal autonome ~190 lignes : Form avec sections Identité, Profil civil, Contact urgence, Pro & revenus, Historique & ménage. Affiche dynamiquement le bloc partenaire si `marital_status` est un statut "couple" (constants.coupleStatuses) et N champs âge selon `child_number`. Dispatche `saveTenant` + `loadPropertyManagement` au succès.
- [TenantsPanel.jsx](./modules/Tenants/TenantsPanel.jsx) — orchestrateur. Consomme `usePropertyManagementData()`, gère le filtre recherche local (+ props facultatives pour Phase F), le menu contextuel ouvert (avec fermeture au clic extérieur via `document.addEventListener`), les actions tenant (edit ouvre modal, copyEmail/copyPhone, delete avec garde "a un bail actif"), et expose `onGenerateOnboardingLink` / `onNavigateToLeases` / `onNavigateToPayments` / `onOpenLeaseMenu` en props pour Phase F.
- [TenantsPanel.css](./modules/Tenants/TenantsPanel.css) — petit CSS co-localisé pour le toolbar.

**Fichiers modifiés** :

- [PropertyManagementRoutes.jsx](../../layouts/AdminRoutes/PropertyManagementRoutes.jsx) — ajout de la route démo `/admin/property-management/_new/tenants`.

**Fichiers PAS modifiés** :

- [PropertyManagement.jsx](./PropertyManagement.jsx), [PropertyManagement.css](./PropertyManagement.css) — strictement intacts. Le legacy `renderTenantsMockup` / `renderTenantContextMenu` / `handleTenantAction` / le bloc modal `tenant` restent en place et continuent de fonctionner sans rien savoir des nouveaux modules.

**Choix d'architecture** :

- **Onboarding (lien d'inscription) hors scope** : le legacy gère deux modaux supplémentaires (`onboardingGenerate`, `onboardingEdit`) côté locataires. Ils n'apparaissent PAS dans le panneau modulaire Phase B — le bouton "Lien d'inscription" appelle un callback `onGenerateOnboardingLink` (no-op en démo). Si on les extrait dans un module, ce sera un sous-module `modules/Tenants/Onboarding*` à part. Documenté pour Phase F.
- **Fermeture du menu contextuel sur clic extérieur** : géré via `document.addEventListener("click", ...)` dans un `useEffect` qui se monte uniquement quand `openMenuId` est non null. Le bouton qui ouvre le menu fait `event.stopPropagation()` pour ne pas se refermer instantanément.
- **Modaux autonomes** : `TenantFormModal` porte son propre `Form.useForm` et son submit (saveTenant + loadPropertyManagement). Cohérent avec `PropertyFormModal` Phase A.

**Pièges à connaître** :

- Les `safeLeases` du hook contiennent **tous** les baux (pas seulement actifs). `TenantCard` choisit le bail actif en priorité, sinon le dernier connu. Si le locataire a 0 bail, `activeLease` est `undefined` et l'avatar+ligne s'affichent quand même.
- L'action `delete` du context menu refuse la suppression si le locataire a un bail (actif ou pas) — c'est volontaire, le backend rejetterait sinon. Côté UX, le message guide vers la résiliation du bail d'abord.
- Le `TenantFormModal` réutilise **toutes** les classes CSS existantes (`pm-section-title`, `pm-form-grid`, `immo-modal-footer`, etc.) — pas besoin d'ajout au CSS global.

**Comment vérifier** :

1. `cd frontend && npm start`
2. `/admin/property-management` → legacy intact, aucune régression attendue.
3. `/admin/property-management/_new/tenants` → la grille de cartes locataires s'affiche, la recherche filtre, le menu contextuel s'ouvre/ferme (clic extérieur), "Nouveau locataire" ouvre la modal complète avec affichage conditionnel du bloc partenaire (sélectionner "Marié" ou "Conjoint de fait") et N champs âge enfants.

## Phase F — cutover finalisé

**Date** : 2026-05-17

**Statut** : Assemblage modulaire activé sur la route principale `/admin/property-management`.

**Fichiers créés** :

- [PropertyManagementNew.jsx](./PropertyManagementNew.jsx) — page principale entièrement modulaire. Assemble : header (titre + recherche + Modèles de contrat), 4 MetricCards (Propriétés, Taux d'occupation, Loyers du mois, Loyers en retard), barre d'onglets, et l'un des 5 panneaux (`<PropertiesPanel/>`, `<TenantsPanel/>`, `<LeasesPanel/>`, `<PaymentsPanel/>`, `<MaintenancePanel/>`).
- [modules/Properties/UnitFormModal.jsx](./modules/Properties/UnitFormModal.jsx) — modal d'édition/création d'unité (nécessaire pour le bouton "Modifier" des cartes propriétés). Pas couvert par les phases A-E, créé en Phase F.

**Fichiers modifiés** :

- [PropertyManagementRoutes.jsx](../../layouts/AdminRoutes/PropertyManagementRoutes.jsx) — route principale `/property-management` basculée sur `<PropertyManagementNew />`. Les routes preview `_new`, `_new/properties`, `_new/tenants` ont été supprimées pour éviter deux chemins vers le même écran.
- [PropertyManagementNew.jsx](./PropertyManagementNew.jsx) — retrait du panneau `Filtres` global du header. Les filtres avancés restent dans le toolbar de l'onglet Propriétés, là où ils sont réellement appliqués.
- [modules/Properties/PropertiesPanel.jsx](./modules/Properties/PropertiesPanel.jsx) — ajout du callback `onViewUnitLease` pour basculer vers l'onglet Baux depuis une carte propriété.
- [modules/Tenants/TenantsPanel.jsx](./modules/Tenants/TenantsPanel.jsx) et [modules/Leases/LeasesPanel.jsx](./modules/Leases/LeasesPanel.jsx) — suppression des messages "à câbler en Phase F" maintenant que l'assemblage est actif.

**Fichiers PAS modifiés** :

- [PropertyManagement.jsx](./PropertyManagement.jsx), [PropertyManagement.css](./PropertyManagement.css) — conservés comme référence legacy, mais non routés par `PropertyManagementRoutes.jsx`.

**Wiring inter-modules** :

- **Recherche** — `searchTerm` est hissé à `PropertyManagementNew`, passé à chaque panneau via prop. `PropertiesPanel` et `TenantsPanel` exposent aussi `onSearchTermChange` (parent peut driver) ; `LeasesPanel`, `PaymentsPanel`, `MaintenancePanel` lisent en read-only.
- **Navigation cross-onglets** :
  - `PropertiesPanel.onAssignTenant` → `setActiveSection("leases")`
  - `PropertiesPanel.onViewAllPayments` → `setActiveSection("payments")`
  - `PropertiesPanel.onEditUnit(unit)` → ouvre `UnitFormModal` (state au niveau page)
  - `TenantsPanel.onNavigateToLeases` → `setActiveSection("leases")`
  - `TenantsPanel.onNavigateToPayments` → `setActiveSection("payments")`
  - `LeasesPanel.onViewMaintenance` → `setActiveSection("maintenance")`
  - `LeasesPanel.onViewPayments` → `setActiveSection("payments")`
- **Modaux** : chaque panneau gère ses propres modaux (création/édition de son entité). Seul `UnitFormModal` vit au niveau page (déclenché par PropertiesPanel).
- **Bootstrap Redux** : `usePropertyManagementData()` est appelé dans `PropertyManagementNew` ET dans chaque panneau. Le hook a un `useEffect` de bootstrap qui dispatche `loadPropertyManagement/loadAllAccount/loadContracts/loadContractTemplates/loadAllCurrency` au mount. React-Redux dédoublonne les selectors, donc plusieurs appels au hook sur le même rendu n'ont qu'un coût négligeable (sélecteurs + memos déjà calculés une fois par store update). Aucun dispatch n'est dupliqué côté réseau car les thunks sont idempotents et React batchera le mount.

**Limites connues après cutover** :

1. **Onboarding tenant (`onboardingGenerate` / `onboardingEdit`)** — pas encore migré. Le bouton "Lien d'inscription" affiche un message neutre. À ajouter dans `modules/Tenants/OnboardingFormModal.jsx` + `OnboardingListTable.jsx`.
2. **MetricCards toujours hardcodés pour les trends** — les valeurs `+2`, `+8.2%` restent statiques comme dans la legacy; à remplacer par des deltas calculés quand le backend exposera l'historique.
3. **Section actions header** — la version modulaire laisse chaque panneau rendre son propre bouton primaire dans son toolbar. C'est volontaire pour éviter les doublons.

**Vérification immédiate** :

- `cd frontend && npm run build:dev`
- `/admin/property-management` → nouvelle page modulaire, parcourir les 5 onglets, ouvrir modal Nouvelle propriété / Nouveau locataire / Nouveau bail / Enregistrer paiement / Nouveau ticket, tester navigation cross-tabs.
- `/admin/property-management/_new`, `/admin/property-management/_new/properties`, `/admin/property-management/_new/tenants` ne sont plus des routes déclarées.
