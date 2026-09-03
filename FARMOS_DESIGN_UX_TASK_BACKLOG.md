# FarmOS Pro - Backlog design et UX par tache

Ce document transforme la strategie design/UX en taches executables. Il est centre sur l'interface FarmOS Pro, pas sur les grandes fonctionnalites metier deja listees dans `FARMOS_COMPETITIVE_GAPS_ROADMAP.md`.

## Objectif

Faire de FarmOS Pro une application plus rapide, plus claire et plus fiable sur le terrain que les concurrents multi-especes, avec une experience mobile/offline professionnelle.

## Regles de priorisation

- P0: bloque la perception de qualite ou casse le rendu.
- P1: reduit fortement le temps terrain ou la confusion utilisateur.
- P2: ameliore la puissance produit et la coherence a grande echelle.
- P3: augmente la confiance commerciale et l'effet premium.

## Sprint 0 - Stabilisation visuelle

### UX-P0-001 - Verifier les chemins statiques de l'app

Priorite: P0

Objectif:

- Eviter que le CSS, le manifest ou les icones soient charges depuis `/farmos/farmos/...`.

Fichiers probables:

- `farmos-app/index.html`
- `farmos-app/vite.config.js`
- `farmos-app/public/styles/app.css`

Criteres d'acceptation:

- `/farmos/styles/app.css` retourne 200 en dev.
- Le build genere bien `dist/styles/app.css`.
- Le rendu login n'utilise jamais les styles navigateur par defaut.
- Les liens manifest et icones pointent sous `/farmos/` une seule fois.

Verification:

- `npm.cmd run build` dans `farmos-app`.
- Capture desktop 1440 x 900.
- Capture mobile 390 x 844.

Statut: commence.

### UX-P0-002 - Corriger les debordements mobiles du login

Priorite: P0

Objectif:

- Le formulaire de connexion doit tenir dans les petits ecrans sans scroll horizontal.

Fichiers probables:

- `farmos-app/src/auth.jsx`
- `farmos-app/public/styles/app.css`

Criteres d'acceptation:

- Aucun scroll horizontal a 390 x 844.
- Aucun scroll horizontal a 360 x 740.
- Les inputs tiennent dans la carte.
- Le bouton principal reste visible et tappable.

Verification:

- Mesurer `document.documentElement.scrollWidth === window.innerWidth`.
- Verifier visuellement mobile.

Statut: commence.

### UX-P0-003 - Ajouter une checklist QA visuelle minimale

Priorite: P0

Objectif:

- Eviter les regressions visuelles avant chaque livraison.

Fichiers probables:

- `FARMOS_DESIGN_UX_TASK_BACKLOG.md`
- Un futur script de verification si necessaire.

Criteres d'acceptation:

- La checklist couvre login, dashboard, animaux, fiche animal, saisie rapide, identification, ventes/POS, rapports.
- La checklist couvre desktop, tablette, mobile standard et mobile compact.
- Les chemins CSS/manifest/icones sont explicitement verifies.

Statut: a faire.

## Sprint 1 - Navigation mobile terrain

### UX-P1-001 - Simplifier la navigation mobile principale

Priorite: P1

Objectif:

- Donner acces aux actions essentielles sans exposer tous les modules sur mobile.

Fichiers probables:

- `farmos-app/src/shell.jsx`
- `farmos-app/src/app.jsx`
- `farmos-app/public/styles/app.css`

Criteres d'acceptation:

- La navigation mobile affiche uniquement: Accueil, Scanner, Ajouter, Animaux, Alertes.
- Les autres modules restent accessibles via menu ou recherche.
- Chaque item a une zone tactile de 44 px minimum.
- Aucun libelle ne deborde a 360 px.

Statut: a faire.

### UX-P1-002 - Mettre un bouton Ajouter central pour les saisies rapides

Priorite: P1

Objectif:

- Rendre la saisie terrain plus rapide que les apps concurrentes simples.

Fichiers probables:

- `farmos-app/src/app.jsx`
- `farmos-app/src/quickentry.jsx`
- `farmos-app/src/shell.jsx`

Criteres d'acceptation:

- Le bouton `+` ouvre la saisie rapide depuis mobile.
- Les actions principales sont visibles: traitement, mortalite, vente, pesee, naissance, alimentation.
- L'utilisateur peut fermer sans perdre ses donnees saisies.
- Le mode offline indique clairement si l'action est synchronisee ou en attente.

Statut: a faire.

### UX-P1-003 - Rendre les en-tetes mobiles anti-debordement

Priorite: P1

Objectif:

- Eviter les titres coupes ou les informations tassees dans le header.

Fichiers probables:

- `farmos-app/src/shell.jsx`
- `farmos-app/src/dashboard.jsx`
- `farmos-app/public/styles/app.css`

Criteres d'acceptation:

- Les titres longs passent sur deux lignes ou se condensent proprement.
- Les actions icones restent accessibles.
- Aucun chevauchement avec les badges, filtres ou boutons.

Statut: a faire.

## Sprint 2 - Dashboard decisionnel

### UX-P1-004 - Recomposer le dashboard autour des urgences

Priorite: P1

Objectif:

- Le dashboard doit repondre a: "Que dois-je faire maintenant ?"

Fichiers probables:

- `farmos-app/src/dashboard.jsx`
- `farmos-app/src/api.js`
- `backend2/src/farmos/farmos.controller.ts`
- `backend2/src/farmos/farmos.service.ts`

Criteres d'acceptation:

- Les alertes critiques sont visibles au-dessus de la ligne de flottaison.
- Les taches du jour sont visibles.
- Les animaux/lots a risque sont visibles.
- Les raccourcis de saisie terrain sont accessibles sans scroll long.

Statut: a faire.

### UX-P1-005 - Ajouter des etats vides utiles sur le dashboard

Priorite: P1

Objectif:

- Eviter un tableau de bord vide avec uniquement des zeros.

Fichiers probables:

- `farmos-app/src/dashboard.jsx`
- `farmos-app/src/animals.jsx`
- `farmos-app/src/screens.jsx`

Criteres d'acceptation:

- Si aucun animal: CTA "Importer animaux" et "Ajouter animal".
- Si aucune tache: CTA "Planifier vaccin" ou "Creer rappel".
- Si aucune vente: CTA "Configurer produits/POS".
- Les etats vides n'utilisent pas de texte marketing long.

Statut: a faire.

### UX-P1-006 - Ajouter une section "Aujourd'hui"

Priorite: P1

Objectif:

- Centraliser les actions terrain du jour.

Fichiers probables:

- `farmos-app/src/dashboard.jsx`
- `farmos-app/src/screens.jsx`
- `backend2/src/farmos/farmos.service.ts`

Criteres d'acceptation:

- Affiche vaccins, traitements, pesees, reproductions, controles et ventes prevues.
- Chaque ligne a une action directe: ouvrir, terminer, reporter.
- Les taches en retard sont visibles avec priorite.

Statut: a faire.

## Sprint 3 - Listes animaux et fiches rapides

### UX-P2-001 - Ameliorer les filtres animaux

Priorite: P2

Objectif:

- Trouver rapidement un animal ou un lot dans une grande ferme.

Fichiers probables:

- `farmos-app/src/animals.jsx`
- `farmos-app/src/api.js`
- `backend2/src/farmos/farmos.controller.ts`

Criteres d'acceptation:

- Filtres: espece, lot, statut, age, sexe, sante, ferme, batiment.
- Les filtres restent actifs apres ouverture/fermeture d'une fiche.
- Les filtres peuvent etre remis a zero en un clic.
- La recherche reste visible sur mobile.

Statut: a faire.

### UX-P2-002 - Ajouter des vues sauvegardees

Priorite: P2

Objectif:

- Permettre aux eleveurs de retrouver rapidement leurs listes de travail.

Fichiers probables:

- `farmos-app/src/animals.jsx`
- `farmos-app/src/offline-db.js`
- `backend2/src/farmos/farmos.service.ts`

Criteres d'acceptation:

- L'utilisateur peut sauvegarder une combinaison de filtres.
- Exemples: "Malades", "Gestantes", "Retrait actif", "A vendre", "Jeunes".
- Les vues sauvegardees fonctionnent offline avec les donnees locales.

Statut: a faire.

### UX-P2-003 - Ajouter un tiroir de detail rapide

Priorite: P2

Objectif:

- Consulter une fiche sans perdre le contexte de la liste.

Fichiers probables:

- `farmos-app/src/animals.jsx`
- `farmos-app/src/screens.jsx`
- `farmos-app/public/styles/app.css`

Criteres d'acceptation:

- Clic sur une ligne ouvre un tiroir lateral desktop.
- Sur mobile, le tiroir devient panneau plein ecran.
- Le tiroir affiche identite, statut, alertes, dernier traitement, dernier poids, lot, actions.
- Fermeture retour a la meme position dans la liste.

Statut: a faire.

### UX-P2-004 - Ajouter les actions de masse

Priorite: P2

Objectif:

- Reduire le temps de gestion des lots et grands troupeaux.

Fichiers probables:

- `farmos-app/src/animals.jsx`
- `farmos-app/src/quickentry.jsx`
- `backend2/src/farmos/farmos.controller.ts`
- `backend2/src/farmos/farmos.service.ts`

Criteres d'acceptation:

- Selection multiple depuis la liste.
- Actions: vacciner, changer de lot, vendre, archiver, exporter.
- Confirmation claire avant action irreversible.
- Compatible offline si l'action peut etre mise en outbox.

Statut: a faire.

## Sprint 4 - Design system operationnel

### UX-P2-005 - Centraliser les composants UI repetes

Priorite: P2

Objectif:

- Reduire les styles inline disperses et rendre l'interface coherente.

Fichiers probables:

- `farmos-app/src/components/` si le dossier existe ou doit etre cree.
- `farmos-app/public/styles/app.css`
- `farmos-app/public/styles/farm-tokens.css`

Criteres d'acceptation:

- Composants communs: `StatusBadge`, `KpiTile`, `ActionButton`, `EntityCard`, `EmptyState`, `QuickDrawer`.
- Les nouveaux composants utilisent les tokens existants.
- Les ecrans existants peuvent migrer progressivement sans refonte massive.

Statut: a faire.

### UX-P2-006 - Standardiser les statuts

Priorite: P2

Objectif:

- Rendre les alertes et etats metier immediatement comprenables.

Fichiers probables:

- `farmos-app/public/styles/farm-tokens.css`
- `farmos-app/public/styles/app.css`
- `farmos-app/src/dashboard.jsx`
- `farmos-app/src/animals.jsx`
- `farmos-app/src/screens.jsx`

Criteres d'acceptation:

- Statuts standard: critique, attention, succes, information, brouillon, offline, sync, retrait actif.
- Chaque statut a couleur, icone ou symbole, libelle et contraste correct.
- La couleur n'est jamais le seul signal.

Statut: a faire.

### UX-P2-007 - Remplacer les emojis metier par des icones coherentes

Priorite: P2

Objectif:

- Donner une apparence plus professionnelle, surtout pour les ventes et demos.

Fichiers probables:

- `farmos-app/src/icons.jsx`
- `farmos-app/src/dashboard.jsx`
- `farmos-app/src/animals.jsx`
- `farmos-app/src/screens.jsx`

Criteres d'acceptation:

- Les actions metier utilisent un set d'icones coherent.
- Les especes peuvent garder des pictogrammes, mais ils doivent etre consistants.
- Aucun emoji aleatoire dans les boutons principaux.

Statut: a faire.

## Sprint 5 - Accessibilite et terrain

### UX-P2-008 - Auditer contraste et lisibilite

Priorite: P2

Objectif:

- Rendre l'app lisible en plein soleil et sur ecrans mobiles moyens.

Fichiers probables:

- `farmos-app/public/styles/app.css`
- `farmos-app/public/styles/farm-tokens.css`

Criteres d'acceptation:

- Texte normal lisible sur fonds principaux.
- Badges critiques lisibles.
- Boutons desactives reconnaissables sans devenir illisibles.
- Focus clavier visible.

Statut: a faire.

### UX-P2-009 - Ajouter un mode densite

Priorite: P2

Objectif:

- Adapter l'interface au bureau et au terrain.

Fichiers probables:

- `farmos-app/public/styles/app.css`
- `farmos-app/src/shell.jsx`
- `farmos-app/src/screens.jsx`

Criteres d'acceptation:

- Mode confortable par defaut mobile.
- Mode compact utile pour grands tableaux desktop.
- Le choix est conserve localement.
- Les zones tactiles restent suffisantes sur mobile.

Statut: a faire.

### UX-P2-010 - Ameliorer les etats offline/sync

Priorite: P2

Objectif:

- Eviter que l'utilisateur doute de la sauvegarde de ses actions.

Fichiers probables:

- `farmos-app/src/offline-status.jsx`
- `farmos-app/src/offline-outbox.js`
- `farmos-app/src/quickentry.jsx`
- `farmos-app/src/shell.jsx`

Criteres d'acceptation:

- Etat visible: en ligne, offline, synchronisation, erreur.
- Chaque saisie offline affiche un statut.
- L'utilisateur peut voir les actions en attente.
- Les erreurs de sync donnent une action de correction.

Statut: a faire.

## Sprint 6 - Onboarding et confiance commerciale

### UX-P3-001 - Creer un onboarding ferme

Priorite: P3

Objectif:

- Aider une nouvelle ferme a obtenir rapidement une premiere valeur.

Fichiers probables:

- `farmos-app/src/screens.jsx`
- `farmos-app/src/app.jsx`
- `farmos-app/src/animals.jsx`

Criteres d'acceptation:

- Etapes: creer ferme, importer animaux, creer lot, planifier vaccin, generer rapport.
- L'onboarding disparait une fois les etapes faites.
- Les etapes sont adaptees au role utilisateur.

Statut: a faire.

### UX-P3-002 - Ajouter des donnees demo realistes

Priorite: P3

Objectif:

- Montrer la valeur produit pendant les demonstrations commerciales.

Fichiers probables:

- `backend2/drizzle/_dev_seed/`
- `backend2/src/farmos/`
- `farmos-app/src/dashboard.jsx`

Criteres d'acceptation:

- Ferme demo multi-especes.
- Donnees: animaux, lots, traitements, ventes, alertes, production, finance.
- Les donnees demo ne polluent pas les vraies organisations.

Statut: a faire.

### UX-P3-003 - Ameliorer les rapports PDF visuellement

Priorite: P3

Objectif:

- Produire des rapports qui inspirent confiance aux clients, cooperatives et partenaires.

Fichiers probables:

- `farmos-app/src/screens.jsx`
- `backend2/src/farmos/`

Criteres d'acceptation:

- Rapport avec logo, ferme, periode, auteur.
- Tableaux lisibles.
- Graphiques simples.
- Alertes importantes mises en avant.
- Export correct sur desktop et mobile.

Statut: a faire.

## Ordre d'execution recommande

1. UX-P0-001 - Chemins CSS/manifest/icones.
2. UX-P0-002 - Login mobile sans debordement.
3. UX-P0-003 - Checklist QA visuelle.
4. UX-P1-001 - Navigation mobile principale.
5. UX-P1-002 - Bouton Ajouter central.
6. UX-P1-003 - En-tetes mobiles.
7. UX-P1-004 - Dashboard urgences.
8. UX-P1-005 - Etats vides utiles.
9. UX-P1-006 - Section Aujourd'hui.
10. UX-P2-001 - Filtres animaux.
11. UX-P2-002 - Vues sauvegardees.
12. UX-P2-003 - Tiroir detail rapide.
13. UX-P2-004 - Actions de masse.
14. UX-P2-005 - Composants UI communs.
15. UX-P2-006 - Statuts standardises.
16. UX-P2-007 - Icones coherentes.
17. UX-P2-008 - Contraste et lisibilite.
18. UX-P2-009 - Mode densite.
19. UX-P2-010 - Offline/sync visible.
20. UX-P3-001 - Onboarding ferme.
21. UX-P3-002 - Donnees demo.
22. UX-P3-003 - Rapports PDF premium.

## Definition of done globale

Une tache design/UX est terminee seulement si:

- Elle fonctionne en desktop et mobile.
- Elle ne casse pas le mode offline.
- Elle respecte les roles utilisateur existants.
- Elle passe `npm.cmd run build` dans `farmos-app`.
- Elle a ete verifiee au minimum en 1440 x 900 et 390 x 844.
- Aucun texte ne deborde en francais.
- Aucun scroll horizontal mobile n'est introduit.

## KPI de suivi

- Temps pour ajouter un animal.
- Temps pour enregistrer un traitement.
- Temps pour scanner et ouvrir une fiche.
- Temps pour generer un rapport.
- Nombre de clics pour une vente.
- Taux de saisies offline synchronisees sans erreur.
- Nombre de bugs visuels mobiles.
- Taux d'activation nouvelle ferme: animaux importes + premier evenement + premier rapport.
