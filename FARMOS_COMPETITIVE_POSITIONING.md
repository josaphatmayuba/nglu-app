# FarmOS Pro — Positionnement public (COMP-P0-001)

Livrable de la tache **COMP-P0-001**.

- Derniere mise a jour : **28 juin 2026**
- Voir aussi : `FARMOS_COMPETITIVE_MATRIX.md` (preuves), `FARMOS_COMPETITIVE_TASK_BACKLOG.md` (taches).

## Phrase de positionnement

> **FarmOS Pro, c'est l'application mobile et hors-ligne qui reunit, dans un seul outil francophone, la gestion multi-especes de votre cheptel, la tracabilite sanitaire et la rentabilite de votre ferme.**

Variante courte (slogan) :

> **Un seul outil pour tout votre elevage : mobile, hors-ligne, multi-especes.**

## Promesse defendable (preuves)

Chaque promesse est adossee a une fonctionnalite reelle (voir matrice) :

- **Mobile & hors-ligne** : PWA + Capacitor, saisie terrain < 20 s, outbox de synchronisation.
- **Multi-especes** : 9 especes (bovin, porc, volaille, poisson, caprin, ovin, lapin, canard, dinde) dans la meme interface.
- **Tracabilite sanitaire** : retrait medicament avec **blocage de vente bloquant**, protocoles, rapports.
- **Rentabilite** : finance liee aux animaux/lots, marge par lot, alertes (baisse production, stock).
- **Francophone** : interface FR/EN native, defaut RDC (telephone +243, devise depuis la base).

## Niche prioritaire

**Fermes mixtes francophones** (plusieurs especes sur une meme exploitation) et **organisations multi-fermes** (cooperatives, ONG agricoles, groupes), la ou les outils anglophones mono-espece sont mal adaptes.

## 3 segments clients prioritaires

1. **Ferme familiale mixte francophone** — quitte Excel/cahier ; veut une appli simple qui marche sur le telephone, meme sans reseau, pour plusieurs especes.
2. **Organisation multi-fermes (coop / ONG / groupe)** — supervise plusieurs sites ; veut consolidation, comparaison entre fermes, roles par equipe.
3. **Eleveur en croissance avec enjeu sanitaire/financier** — bovin lait/viande, porc ou volaille ; veut tracabilite (retrait, audits) et rentabilite par lot pour decider.

## Pourquoi FarmOS Pro plutot que...

- **vs Herdwatch** : Herdwatch est fort sur mobile/tracabilite bovin anglophone, mais FarmOS Pro est **vraiment multi-especes**, **francophone**, et integre la **finance/rentabilite** au meme endroit.
- **vs Farmbrite** : Farmbrite couvre large mais reste anglophone, oriente petite ferme US ; FarmOS Pro mise sur le **terrain hors-ligne**, la **francophonie** et la **securite alimentaire** (blocage vente en retrait).
- **vs AgriWebb** : AgriWebb excelle sur le ranch/paturage extensif ; FarmOS Pro adresse les **fermes mixtes** (especes variees) avec finance et tracabilite, sans imposer un modele uniquement paturage.

## Concurrents que FarmOS Pro ne cherche PAS encore a battre completement

A assumer dans le discours commercial (eviter les comparaisons frontales premature) :

- **DairyComp / BoviSync** sur le laitier industriel expert (genetique, protocoles tres pousses, gros troupeaux).
- **PigCHAMP** sur l'analytique porcine avancee de grands groupes naisseurs.
- **PoultryPlan / MTech** sur les workflows integrateurs avicoles a grande echelle (hatchery, contrats integrateurs).
- **Plateformes enterprise avec API/hardware** (capteurs temps reel, automates) : FarmOS Pro fait l'import CSV, pas encore l'integration directe.

Strategie : gagner d'abord les **fermes mixtes francophones** et les **organisations multi-fermes**, puis monter en specialisation espece par espece.

## Criteres d'acceptation (COMP-P0-001)

- [x] Le positionnement tient en une phrase.
- [x] Les 3 premiers segments clients sont nommes.
- [x] Le document explique pourquoi choisir FarmOS Pro plutot que Herdwatch, Farmbrite ou AgriWebb.
