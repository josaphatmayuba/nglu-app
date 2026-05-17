# Baux - Design / Contract Workflow Handoff

Date: 2026-05-17

## Correctif affichage devise

Les cartes Baux affichaient parfois le code HTML de devise, par exemple
`&#36; 950K/mois`, parce que `shortMoney()` ne decodait pas le symbole avant
de formater les montants en `K` / `M`.

Fichier modifie:

- `shared/format.js`
  - `shortMoney(value, symbol)` passe maintenant `symbol` dans
    `decodeCurrencyText()` avant l'affichage.

Impact:

- Corrige la grille Baux (`LeaseGridView`) et tous les autres composants qui
  utilisent `shortMoney()` avec un `currencySymbol` venant de l'API.

---

## Correctif clause personnalisée

Regression constatee apres migration modulaire: le bouton `Ajouter une clause personnalisée`
dans le modal `Generer le contrat de bail` etait visible mais ne faisait rien.

Cause:

- `ContractWorkflowModal.jsx` rendait le bouton `.immo-add-clause` sans `onClick`.
- Le mockup `frontend/design-mockup.html` avait une fonction imperative
  `addCustomClause()` qui injectait un bloc dans `#custom-clauses`; cette logique
  n'avait pas ete portee en React.

Fichiers modifies:

- `modules/Leases/ContractWorkflowModal.jsx`
  - ajout de l'etat `customClauses`;
  - ajout des handlers `addCustomClause`, `updateCustomClause`, `removeCustomClause`;
  - rendu d'un bloc editable par clause: checkbox, titre, description, compteur 500 caracteres, suppression;
  - inclusion des clauses personnalisees cochees dans `buildLeaseContractContent()`.
- `PropertyManagement.css`
  - styles `.immo-custom-clause*` proches du mockup.

## Verification rapide

1. Ouvrir `/admin/property-management`.
2. Onglet `Baux`, ouvrir `Generer le contrat`.
3. Cliquer `Ajouter une clause personnalisée`.
4. Un bloc avec titre + textarea doit apparaitre, focus sur le titre.
5. Remplir titre/description, puis `Aperçu PDF`: la clause doit apparaitre dans `Clauses additionnelles`.
