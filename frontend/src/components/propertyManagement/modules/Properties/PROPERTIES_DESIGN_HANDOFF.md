# Propriétés - Design Mockup Handoff

Date: 2026-05-16

## Correctif design - modal Nouvelle propriete

Le modal `Nouvelle propriete` de la version modulaire ne respectait plus le
mockup `frontend/design-mockup.html`: largeur trop fragile, header/body/footer
pilotes par les styles Ant Design globaux, et body/footer pas scopes au modal
Proprietes.

Fichiers modifies:

- `PropertyFormModal.jsx`
  - ajout de `className="immo-property-modal"`;
  - ajout de `wrapClassName="immo-property-modal-wrap"`.
- `PropertiesPanel.css`
  - couche CSS scopee pour ce modal uniquement;
  - modal limite a `min(768px, 100vw - 24px)`;
  - `ant-modal-content` en flex column avec `max-height`;
  - header/footer fixes et body scrollable;
  - grilles a deux colonnes desktop, une colonne mobile;
  - champs, labels, radio cards, notes et footer alignes sur le mockup.

Point important: les styles sont volontairement scopes sous
`.immo-property-modal` pour eviter de casser les modals Baux/Paiements/Tenants.
Si un autre agent ajuste les styles globaux `.ant-modal-*`, il doit verifier que
ces overrides scopes restent prioritaires.

Verification attendue:

1. Ouvrir `/admin/property-management`.
2. Onglet `Proprietes` puis `Nouvelle propriete`.
3. Comparer avec `frontend/design-mockup.html` section `PROPERTY MODAL`.
4. Tester desktop et mobile: footer visible, contenu scrollable, pas de grille
   ecrasee, boutons `Annuler/Brouillon/Creer la propriete` alignes.

## Correctif devise modal propriete

Le modal ouvert depuis les cartes Proprietes affichait `Modifier l'unite` et ne
permettait pas de choisir une devise pour les champs financiers.

Fichiers modifies:

- `UnitFormModal.jsx`
  - titre remplace par `Modifier propriétés` / `Nouvelle propriété`;
  - ajout du champ `Devise loyer / dépôt`;
  - le champ utilise `currencyId` et les `currencyOptions` deja construites par
    `usePropertyManagementData()`;
  - le submit normalise `currencyId` avec `optionalNumber()` avant `saveUnit`.
- `PropertyManagementNew.jsx`
  - recupere `currencyOptions` depuis `usePropertyManagementData()`;
  - passe `currencyOptions` a `UnitFormModal`.

Point important: une seule devise est stockee sur l'unite via `currencyId`; elle
s'applique au loyer mensuel et au depot de garantie. Si le backend ajoute plus
tard deux devises separees, il faudra ajouter des champs distincts.

## Correctif backend devise unite

Suite au test reseau, le frontend pouvait afficher/envoyer un champ devise, mais
`backend2` ne persistait pas encore la devise sur les unites.

Fichiers modifies:

- `backend2/src/database/schema.ts`
  - ajout de `realEstateUnits.currencyId` mappe sur `real_estate_units.currency_id`.
- `backend2/drizzle/0014_add_currency_id_to_property_units.sql`
  - migration SQL pour ajouter `currency_id` aux unites;
  - backfill avec `appSetting.currencyId`.
- `backend2/src/property-management/dto/property-management.dto.ts`
  - `CreateUnitDto.currencyId` accepte la devise du loyer/depot.
- `backend2/src/property-management/property-management.service.ts`
  - `createUnit` sauvegarde `currencyId` ou utilise la devise par defaut;
  - `updateUnit` accepte et sauvegarde `currencyId`;
  - `/property-management/units` renvoie `currencyId`, `currencyName`, `currencySymbol`.
- `PropertyFormModal.jsx`
  - ajout du select `Devise` quand on cree des unites depuis `Nouvelle propriété`.
- `PropertyCardGrid.jsx`, `PropertyListTable.jsx`, `PropertyMapView.jsx`
  - affichage du loyer avec `unit.currencySymbol`.

Verification attendue:

1. Executer la migration backend2 (`0014_add_currency_id_to_property_units.sql`).
2. Redemarrer backend2.
3. Creer/modifier une unite avec une devise.
4. Verifier dans Network que `/property-management/units` renvoie `currencyId` + `currencySymbol`.

---

## Correctif applique

Le bouton `...` des cartes Propriétés ne faisait rien dans la version modulaire.
Le mockup `frontend/design-mockup.html` montre ce bouton sur chaque carte, mais le
composant `PropertyCardGrid.jsx` n'avait aucun etat de menu ni rendu de dropdown.

Fichiers modifies:

- `PropertyCardGrid.jsx`
  - ajout d'un menu contextuel par carte;
  - fermeture automatique au clic exterieur;
  - actions branchees sur les callbacks existants: modifier, assigner locataire;
  - actions de lecture ajoutees: voir paiements, voir bail;
  - nettoyage local des textes casses dans la carte: `Â·` remplace par `-`, `mÂ²` remplace par `m2`.
- `PropertiesPanel.jsx`
  - passe les callbacks `onViewPayments` et `onViewLease` a `PropertyCardGrid`;
  - fallback demo par `window.alert` quand le routing inter-module n'est pas encore branche.
- `PropertiesPanel.css`
  - positionne le menu contextuel au coin superieur droit;
  - autorise l'overflow uniquement quand le menu est ouvert pour eviter que le dropdown soit coupe.

## Points a reprendre plus tard

- Remplacer les fallback `window.alert` par une navigation ou ouverture de panneau:
  - `Voir paiements` devrait basculer vers l'onglet Paiements avec filtre sur l'unite ou le bail.
  - `Voir bail` devrait ouvrir le bail actif ou basculer vers l'onglet Baux.
- Harmoniser les textes mojibake restants dans le module Propriétés
  (`propriÃ©tÃ©`, `unitÃ©`, `Filtres avancÃ©s`, etc.) si l'autre agent traite l'encodage global.
- Le menu Propriétés reutilise les classes globales `.immo-context-menu` et `.immo-menu-head`.
  Ne pas dupliquer un second systeme de dropdown sans verifier Tenants/Leases.

## Verification rapide

1. Ouvrir `/admin/property-management`.
2. Onglet `Propriétés`, vue `Grille`.
3. Cliquer sur `...` dans une carte.
4. Le menu doit apparaitre sous le bouton, rester au-dessus de la carte, puis se fermer au clic exterieur.
