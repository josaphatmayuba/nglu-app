# FarmOS Pro - Backlog concurrentiel par tache

Ce document transforme la comparaison avec les entreprises concurrentes en taches executables. Il complete:

- `FARMOS_COMPETITIVE_GAPS_ROADMAP.md` pour la strategie globale.
- `FARMOS_DESIGN_UX_TASK_BACKLOG.md` pour les taches design/UX.

## Objectif

Construire FarmOS Pro pour depasser progressivement:

- les apps multi-especes simples: Herdwatch, Farmbrite;
- les plateformes ranch/paturage: AgriWebb, CattleMax;
- les outils specialises lait: DairyComp, BoviSync;
- les outils specialises porc: PigCHAMP;
- les outils specialises volaille: PoultryPlan, PoultryCare, MTech/solutions integrateurs;
- les feuilles Excel, cahiers papier et petits outils locaux.

## Strategie de victoire

FarmOS Pro ne doit pas essayer de battre tous les concurrents sur leur terrain le meme jour. La bonne sequence est:

1. Battre Excel et le cahier papier.
2. Battre les apps multi-especes simples sur mobile/offline, tracabilite et finance.
3. Battre les outils ranch/paturage sur les fermes mixtes.
4. Devenir tres fort sur bovin, puis porc et volaille.
5. Ajouter les integrations hardware et les benchmarks quand les donnees sont fiables.
6. Vendre avec une niche claire: elevage multi-especes francophone, mobile/offline, finance et tracabilite integrees.

## Segments concurrents et angle d'attaque

| Segment | Concurrents | Forces concurrentes | Angle FarmOS Pro |
|---|---|---|---|
| Multi-especes simple | Herdwatch, Farmbrite | mobile, offline, taches, traitements, reproduction, rapports | plus complet sur finance, multi-especes, offline, rapports et francophonie |
| Ranch/paturage | AgriWebb, CattleMax | cartes, paturages, lots/mobs, cattle records, imports | cartes + lots + finance + multi-especes + terrain offline |
| Laitier | DairyComp, BoviSync | production lait, reproduction, protocoles, reporting, travail cow-side | module laitier cible PME, plus simple, mobile, finance liee aux soins |
| Porcin | PigCHAMP | reproduction truies, lots, grow-finish, rapports, analytics | module porc simplifie + lots + couts + mortalite + alimentation |
| Volaille | PoultryPlan, PoultryCare, MTech | flock management, feed, medication, growth, hatchery/integrator workflows | module volaille PME + ponte/chair + couts + alertes + rapports |
| Local/francophone | Boviclic, Synel, Pilot'Elevage, outils coops | conformite locale, habitudes metier, accompagnement | UX moderne + offline + integrations + support francophone |

## Sprint 0 - Positionnement et fondation

### COMP-P0-001 - Clarifier le positionnement public

Priorite: P0

Concurrents vises:

- Tous.

Objectif:

- Definir une promesse simple et defendable: "l'app mobile/offline pour gerer elevage multi-especes, tracabilite, finance et rapports".

Taches:

- Ecrire une phrase de positionnement.
- Definir la niche prioritaire: fermes mixtes francophones et organisations multi-fermes.
- Lister les concurrents que FarmOS Pro ne cherche pas encore a battre completement.

Criteres d'acceptation:

- Le positionnement tient en une phrase.
- Les 3 premiers segments clients sont nommes.
- Le document de vente peut expliquer pourquoi choisir FarmOS Pro plutot que Herdwatch, Farmbrite ou AgriWebb.

Statut: a faire.

### COMP-P0-002 - Verifier le risque de nom FarmOS

Priorite: P0

Concurrents vises:

- farmOS.org et tout risque de confusion de marque.

Objectif:

- Eviter une confusion commerciale ou juridique avec le projet farmOS existant.

Taches:

- Faire une verification marque/domaine.
- Decider si le nom public reste FarmOS Pro ou change.
- Preparer 3 alternatives de nom si necessaire.

Criteres d'acceptation:

- Decision documentee: garder, modifier ou renommer.
- Aucune campagne publique lancee sans decision.

Statut: a faire.

### COMP-P0-003 - Construire une matrice concurrentielle maintenue

Priorite: P0

Concurrents vises:

- Herdwatch, AgriWebb, Farmbrite, CattleMax, DairyComp, BoviSync, PigCHAMP, PoultryPlan.

Objectif:

- Garder une vision claire des forces/faiblesses concurrentes.

Taches:

- Creer un tableau avec fonctionnalites, prix si public, cible, forces, faiblesses.
- Mettre a jour tous les 3 mois.
- Ajouter une colonne "reponse FarmOS Pro".

Criteres d'acceptation:

- Minimum 10 concurrents suivis.
- Minimum 25 criteres compares.
- Les gaps FarmOS Pro deviennent des taches.

Statut: a faire.

## Sprint 1 - Battre Excel et les apps simples

### COMP-P1-001 - Finaliser import Excel/CSV animaux

Priorite: P1

Concurrents vises:

- Excel, Farmbrite, CattleMax.

Objectif:

- Rendre la migration vers FarmOS Pro simple.

Taches:

- Importer animaux individuels.
- Importer lots/groupes.
- Mapper colonnes automatiquement.
- Afficher erreurs ligne par ligne.
- Permettre annulation/import test.

Criteres d'acceptation:

- Un utilisateur importe 500 animaux sans aide technique.
- Les doublons sont detectes.
- Les erreurs sont exportables.
- L'import conserve especes, sexe, age/date naissance, identifiants, lot, statut.

Statut: a faire.

### COMP-P1-002 - Finaliser fiche animal complete

Priorite: P1

Concurrents vises:

- Herdwatch, Farmbrite, CattleMax, DairyComp.

Objectif:

- Offrir une fiche animal plus utile qu'un simple registre.

Taches:

- Onglets: identite, sante, reproduction, production, poids, documents, finance, historique.
- Timeline unique de tous les evenements.
- Statuts visibles: malade, retrait, gestante, vendu, mort, quarantaine.
- Documents et photos rattaches.

Criteres d'acceptation:

- Un eleveur comprend l'etat complet d'un animal en moins de 30 secondes.
- Toutes les actions importantes sont accessibles depuis la fiche.
- La fiche fonctionne sur mobile.

Statut: a faire.

### COMP-P1-003 - Construire la saisie rapide terrain

Priorite: P1

Concurrents vises:

- Herdwatch, BoviSync, PigCHAMP Mobile.

Objectif:

- Enregistrer une action terrain plus vite que dans les apps concurrentes.

Taches:

- Traitement.
- Vaccin.
- Mortalite.
- Pesee.
- Naissance.
- Vente.
- Deplacement/changement de lot.
- Note terrain.

Criteres d'acceptation:

- Une saisie standard prend moins de 20 secondes.
- Fonctionne offline.
- Les donnees sont synchronisees automatiquement.
- L'utilisateur voit si la saisie est en attente, synchronisee ou en erreur.

Statut: a faire.

### COMP-P1-004 - Finaliser lots/groupes/mobs

Priorite: P1

Concurrents vises:

- AgriWebb, CattleMax, Farmbrite, PigCHAMP, PoultryPlan.

Objectif:

- Gerer des animaux individuellement et par groupe selon l'espece.

Taches:

- Creer lot/groupe/mob/flock/cohort.
- Associer animaux individuels a un lot.
- Historique des mouvements entre lots.
- Evenements appliques a tout un lot.
- Statistiques par lot: effectif, mortalite, poids moyen, couts, ventes.

Criteres d'acceptation:

- Un traitement peut etre applique a un lot entier.
- La mortalite diminue automatiquement l'effectif du lot.
- Les rapports peuvent filtrer par lot.

Statut: a faire.

### COMP-P1-005 - Finaliser calendrier et rappels intelligents

Priorite: P1

Concurrents vises:

- Herdwatch, AgriWebb, Farmbrite, BoviSync.

Objectif:

- Ne plus rater vaccin, traitement, reproduction, controle ou retrait.

Taches:

- Rappels sanitaires.
- Rappels reproduction.
- Rappels retrait medicament.
- Rappels taches equipe.
- Notifications mobile/PWA.

Criteres d'acceptation:

- Les taches du jour sont visibles au dashboard.
- Les retards sont mis en avant.
- Un rappel peut etre reporte ou marque termine.
- Les rappels sont lies a animal, lot, ferme ou batiment.

Statut: a faire.

## Sprint 2 - Battre Herdwatch, Farmbrite et AgriWebb

### COMP-P1-006 - Gestion sanitaire avancee et retrait medicament

Priorite: P1

Concurrents vises:

- Herdwatch, Farmbrite, AgriWebb.

Objectif:

- Devenir meilleur sur tracabilite sanitaire et securite alimentaire.

Taches:

- Medicaments avec stock, lot, expiration.
- Protocoles de traitement.
- Doses par animal ou par kg.
- Date fin retrait viande/lait/oeufs.
- Alertes vente interdite pendant retrait.

Criteres d'acceptation:

- Un animal sous retrait ne peut pas etre vendu sans confirmation bloquante.
- Le stock medicament diminue apres traitement.
- Rapport sanitaire exportable PDF/CSV.

Statut: a faire.

### COMP-P1-007 - Rapports conformite/audit

Priorite: P1

Concurrents vises:

- Herdwatch, AgriWebb, Farmbrite, outils locaux.

Objectif:

- Produire rapidement les rapports demandes par clients, vetos, cooperatives et audits.

Taches:

- Rapport traitements.
- Rapport mortalite.
- Rapport mouvements.
- Rapport inventaire animaux/lots.
- Rapport retraits actifs.
- Rapport ventes.

Criteres d'acceptation:

- Export PDF propre.
- Export CSV exploitable.
- Filtres: periode, espece, lot, ferme, batiment.
- Historique de generation conserve.

Statut: a faire.

### COMP-P1-008 - Finance liee aux animaux et lots

Priorite: P1

Concurrents vises:

- Farmbrite, AgriWebb, CattleMax.

Objectif:

- Faire mieux que les registres sanitaires en montrant la rentabilite.

Taches:

- Depenses par lot: aliments, medicaments, main-d'oeuvre, achats.
- Revenus par vente.
- Marge par lot/espece/periode.
- Cout sanitaire par animal/lot.
- Cout alimentaire par kg produit si donnees disponibles.

Criteres d'acceptation:

- Dashboard marge par espece.
- Rapport profitabilite par lot.
- Une vente est rattachee aux animaux/lots vendus.

Statut: a faire.

### COMP-P1-009 - Paturage, zones et carte ferme

Priorite: P1

Concurrents vises:

- AgriWebb, CattleMax, Herdwatch Pasture.

Objectif:

- Couvrir les besoins ranch/paturage de base.

Taches:

- Carte ferme avec zones, batiments, paddocks.
- Deplacement lot vers zone.
- Historique de paturage.
- Capacite/charge approximative.
- Notes terrain avec photo/GPS.

Criteres d'acceptation:

- Un utilisateur voit ou se trouve chaque lot.
- Un mouvement de lot met a jour la carte et l'historique.
- Les rapports peuvent filtrer par zone.

Statut: a faire.

### COMP-P1-010 - Taches equipe et journal de travail

Priorite: P1

Concurrents vises:

- AgriWebb, BoviSync, Farmbrite.

Objectif:

- Gerer le travail quotidien d'une equipe agricole.

Taches:

- Assigner tache a un utilisateur.
- Statuts: a faire, en cours, termine, reporte.
- Commentaires/photos.
- Journal de travail par employe.
- Alertes tache critique.

Criteres d'acceptation:

- Un manager voit les taches par personne et par ferme.
- Les taches peuvent etre liees a animal, lot, batiment ou zone.
- Fonctionne mobile.

Statut: a faire.

## Sprint 3 - Battre CattleMax sur bovin/cow-calf

### COMP-P2-001 - Module bovin cow-calf

Priorite: P2

Concurrents vises:

- CattleMax, Herdwatch.

Objectif:

- Couvrir les workflows bovins essentiels.

Taches:

- Livre de velage.
- Saillie/insemination.
- Diagnostic gestation.
- Dates prevues de velage.
- Performance veau: naissance, sevrage, poids.
- Historique mere/pere.

Criteres d'acceptation:

- Une femelle affiche son cycle reproduction complet.
- Les velages prevus generent des rappels.
- Les veaux sont lies a leur mere.

Statut: a faire.

### COMP-P2-002 - Import association/pedigree

Priorite: P2

Concurrents vises:

- CattleMax.

Objectif:

- Faciliter la migration de troupeaux bovins structures.

Taches:

- Import pedigree CSV.
- Champs race, mere, pere, numero association.
- Detection parent absent.
- Rapport anomalies import.

Criteres d'acceptation:

- Le pedigree apparait sur fiche animal.
- Les erreurs parentales sont signalees.
- L'import peut etre relance sans doublons.

Statut: a faire.

### COMP-P2-003 - Rapports bovins predefinis

Priorite: P2

Concurrents vises:

- CattleMax.

Objectif:

- Donner des rapports utiles sans config complexe.

Taches:

- Rapport inventaire bovin.
- Rapport reproduction.
- Rapport velages.
- Rapport poids/gain.
- Rapport ventes bovines.
- Rapport mortalite.

Criteres d'acceptation:

- Minimum 10 rapports bovins predefinis.
- Chaque rapport exporte PDF/CSV.
- Rapports filtrables par lot, sexe, age, statut.

Statut: a faire.

## Sprint 4 - Module laitier simplifie

### COMP-P2-004 - Production lait

Priorite: P2

Concurrents vises:

- DairyComp, BoviSync.

Objectif:

- Couvrir les fermes laitieres petites et moyennes sans viser tout de suite les grandes laiteries industrielles.

Taches:

- Saisie production lait par vache ou par lot.
- Production journaliere.
- Qualite lait si disponible.
- Courbes production.
- Alertes baisse anormale.

Criteres d'acceptation:

- Dashboard production lait.
- Rapport production par periode.
- Lien entre traitement/retrait et vente lait.

Statut: a faire.

### COMP-P2-005 - Protocoles laitiers

Priorite: P2

Concurrents vises:

- DairyComp, BoviSync.

Objectif:

- Standardiser les soins repetitifs en ferme laitiere.

Taches:

- Protocoles mammite.
- Protocole tarissement.
- Protocole reproduction.
- Protocoles boiterie.
- Rappels automatiques par protocole.

Criteres d'acceptation:

- Un protocole cree plusieurs taches automatiquement.
- Les traitements restent tracables.
- Les retraits lait/viande sont calcules.

Statut: a faire.

### COMP-P2-006 - Reporting laitier custom

Priorite: P2

Concurrents vises:

- DairyComp, BoviSync.

Objectif:

- Donner des rapports configurables sans complexite de logiciel expert.

Taches:

- Filtres reproduction, production, sante.
- Rapports sauvegardes.
- Export PDF/CSV.
- Partage avec veterinaire/conseiller.

Criteres d'acceptation:

- Un rapport sauvegarde peut etre relance.
- Les donnees sont filtrees par ferme, lot, statut, periode.

Statut: a faire.

## Sprint 5 - Module porcin

### COMP-P2-007 - Cycle reproduction porcin

Priorite: P2

Concurrents vises:

- PigCHAMP.

Objectif:

- Couvrir les bases truies/verrats et reproduction.

Taches:

- Fiche truie.
- Saillie/insemination.
- Mise bas.
- Nes vivants, mort-nes, momifies.
- Sevrage.
- Intervalle sevrage-saillie.

Criteres d'acceptation:

- Une truie affiche son historique de portees.
- Les indicateurs reproduction sont calcules.
- Les evenements sont saisissables mobile.

Statut: a faire.

### COMP-P2-008 - Lots grow-finish et mortalite porcine

Priorite: P2

Concurrents vises:

- PigCHAMP, SwineManagement.

Objectif:

- Gerer la production par cohorte.

Taches:

- Creation cohorte.
- Entrees/sorties.
- Mortalites par cause.
- Aliment consomme.
- Poids moyen.
- Vente/abattage.

Criteres d'acceptation:

- Rapport performance par cohorte.
- Taux mortalite calcule.
- Marge par cohorte visible.

Statut: a faire.

### COMP-P2-009 - Rapports porcins

Priorite: P2

Concurrents vises:

- PigCHAMP.

Objectif:

- Donner les indicateurs essentiels sans logiciel trop complexe.

Taches:

- Rapport reproduction.
- Rapport mortalite.
- Rapport inventaire.
- Rapport grow-finish.
- Rapport finance par cohorte.

Criteres d'acceptation:

- Minimum 8 rapports porcins predefinis.
- Export PDF/CSV.
- Donnees filtrables par batiment, lot, periode.

Statut: a faire.

## Sprint 6 - Module volaille

### COMP-P2-010 - Gestion flock/bande

Priorite: P2

Concurrents vises:

- PoultryPlan, PoultryCare, FarmKeep.

Objectif:

- Gerer la volaille par bande plutot qu'animal individuel.

Taches:

- Creation bande.
- Type: chair, ponte, reproducteur.
- Entree poussins.
- Age en jours/semaines.
- Batiment/box.
- Sortie/vente/abattage.

Criteres d'acceptation:

- Une bande affiche effectif initial, actuel, age, mortalite, production.
- Les evenements s'appliquent a la bande.

Statut: a faire.

### COMP-P2-011 - Production oeufs et croissance

Priorite: P2

Concurrents vises:

- PoultryPlan, PoultryCare.

Objectif:

- Couvrir ponte et volaille de chair.

Taches:

- Saisie oeufs/jour.
- Saisie poids moyen.
- Aliment consomme.
- Taux ponte.
- Gain moyen.
- Conversion alimentaire approximative.

Criteres d'acceptation:

- Dashboard bande volaille.
- Courbes oeufs, poids, mortalite, aliment.
- Alertes baisse production.

Statut: a faire.

### COMP-P2-012 - Traitements et mortalite volaille

Priorite: P2

Concurrents vises:

- PoultryPlan, MTech/solutions integrateurs.

Objectif:

- Ameliorer la tracabilite sanitaire des bandes.

Taches:

- Traitements par bande.
- Vaccins par bande.
- Mortalites journalieres.
- Causes mortalite.
- Retrait oeufs/viande.

Criteres d'acceptation:

- Rapport mortalite bande.
- Alertes mortalite anormale.
- Blocage vente si retrait actif.

Statut: a faire.

## Sprint 7 - Integrations et hardware

### COMP-P2-013 - RFID, code-barres et QR robuste

Priorite: P2

Concurrents vises:

- PigCHAMP Mobile, Farmbrite, AgriWebb, CattleMax.

Objectif:

- Identifier rapidement animaux/lots sur le terrain.

Taches:

- Scan QR.
- Scan code-barres.
- Support RFID/Bluetooth si disponible.
- Association tag -> animal/lot.
- Historique des scans.

Criteres d'acceptation:

- Scan ouvre la fiche correspondante.
- Si tag inconnu, l'app propose creation ou association.
- Fonctionne mobile.

Statut: a faire.

### COMP-P2-014 - Integrations balances et pesees

Priorite: P2

Concurrents vises:

- AgriWebb, CattleMax, outils ranch.

Objectif:

- Rendre la pesee plus rapide et plus fiable.

Taches:

- Import CSV balance.
- Liaison poids a animal/lot.
- Courbe poids.
- Gain moyen quotidien.
- Detection anomalies.

Criteres d'acceptation:

- Import pesees sans doublons.
- Rapport gains par lot.
- Alertes sous-performance.

Statut: a faire.

### COMP-P3-001 - API partenaires

Priorite: P3

Concurrents vises:

- AgriWebb, BoviSync, plateformes enterprise.

Objectif:

- Permettre integrations coops, vetos, feed mills, comptabilite et capteurs.

Taches:

- Documentation API.
- Webhooks evenements.
- Export automatique rapports.
- Tokens partenaires scopes.

Criteres d'acceptation:

- Un partenaire peut lire animaux/lots autorises.
- Les droits sont scopes par organisation.
- Audit log des acces.

Statut: a faire.

## Sprint 8 - IA, analytics et avantage donnees

### COMP-P2-015 - Insights automatiques fiables

Priorite: P2

Concurrents vises:

- Farmbrite, AgriWebb, BoviSync, DairyComp.

Objectif:

- Donner des recommandations utiles basees sur les donnees existantes.

Taches:

- Detecter mortalite anormale.
- Detecter chute production.
- Detecter hausse couts medicaments/aliments.
- Detecter animaux/lots sous-performants.
- Expliquer pourquoi l'alerte est declenchee.

Criteres d'acceptation:

- Chaque insight cite les donnees utilisees.
- L'utilisateur peut marquer "utile" ou "pas utile".
- Aucune recommandation medicale risquee sans validation veterinaire.

Statut: a faire.

### COMP-P2-016 - Benchmarks internes anonymises

Priorite: P2

Concurrents vises:

- PoultryPlan, PigCHAMP, AgriWebb.

Objectif:

- Montrer aux fermes ou elles se situent par rapport a des fermes similaires.

Taches:

- Definir metriques comparables.
- Anonymiser donnees.
- Segmenter par espece, taille, region si possible.
- Afficher quartiles simples.

Criteres d'acceptation:

- Aucun client identifiable.
- Le client peut refuser le benchmark.
- Les benchmarks ne s'affichent que si l'echantillon est suffisant.

Statut: a faire.

### COMP-P2-017 - Rapports custom sauvegardes

Priorite: P2

Concurrents vises:

- BoviSync, DairyComp, Farmbrite, CattleMax.

Objectif:

- Permettre a un manager de construire ses propres rapports.

Taches:

- Choisir colonnes.
- Choisir filtres.
- Sauvegarder rapport.
- Export PDF/CSV.
- Planifier generation periodique.

Criteres d'acceptation:

- Rapport sauvegarde par utilisateur ou ferme.
- Export fiable.
- Permissions respectees.

Statut: a faire.

## Sprint 9 - Multi-fermes, roles et enterprise light

### COMP-P2-018 - Multi-fermes et multi-sites

Priorite: P2

Concurrents vises:

- DairyComp/OneView, BoviSync, AgriWebb.

Objectif:

- Servir cooperatives, ONG, groupes agricoles et exploitations multi-sites.

Taches:

- Dashboard organisation.
- Comparaison fermes/sites.
- Permissions par ferme.
- Filtre global par ferme/site.
- Exports consolides.

Criteres d'acceptation:

- Un manager voit toutes les fermes autorisees.
- Un employe terrain ne voit que son site.
- Rapports consolidables.

Statut: a faire.

### COMP-P2-019 - Roles operationnels

Priorite: P2

Concurrents vises:

- BoviSync, AgriWebb, Farmbrite.

Objectif:

- Adapter l'app au travail reel des equipes.

Taches:

- Roles: proprietaire, manager, ouvrier, veterinaire, comptable, lecteur.
- Droits: lire, creer, modifier, exporter, valider.
- Journal d'audit.

Criteres d'acceptation:

- Les actions sensibles sont protegees.
- Le veto peut voir dossiers sanitaires sans acces finance si configure.
- Le comptable peut voir finance sans modifier sante.

Statut: a faire.

### COMP-P2-020 - Audit log complet

Priorite: P2

Concurrents vises:

- Outils enterprise et conformite.

Objectif:

- Rendre FarmOS Pro credible pour organisations et audits.

Taches:

- Journal creation/modification/suppression.
- Utilisateur, date, ancien/nouveau contenu.
- Export audit.
- Filtre par entite.

Criteres d'acceptation:

- Toute modification critique est auditee.
- L'audit log est immuable pour utilisateurs standards.

Statut: a faire.

## Sprint 10 - Commercialisation et preuve marche

### COMP-P1-011 - Pack demo concurrentiel

Priorite: P1

Concurrents vises:

- Tous.

Objectif:

- Montrer FarmOS Pro en conditions realistes.

Taches:

- Ferme demo bovin/porc/volaille.
- Scenario demo 15 minutes.
- Scenario demo 45 minutes.
- Jeu de donnees avec alertes, ventes, traitements, rapports.

Criteres d'acceptation:

- Une demo peut etre faite sans preparation technique.
- Les avantages vs Excel/Herdwatch/Farmbrite sont visibles.
- Les rapports generes sont propres.

Statut: a faire.

### COMP-P1-012 - Programme pilotes 5 a 10 fermes

Priorite: P1

Concurrents vises:

- Tous, surtout Excel et apps simples.

Objectif:

- Obtenir feedback terrain et preuves de valeur.

Taches:

- Recruter fermes mixtes.
- Installer donnees initiales.
- Mesurer temps gagne.
- Collecter bugs terrain.
- Collecter temoignages.

Criteres d'acceptation:

- Minimum 5 fermes actives pendant 60 jours.
- Chaque ferme a animaux importes, 10 evenements, 1 rapport.
- Au moins 3 temoignages exploitables.

Statut: a faire.

### COMP-P1-013 - Migration depuis Excel et concurrents

Priorite: P1

Concurrents vises:

- Excel, Farmbrite, CattleMax, AgriWebb.

Objectif:

- Reduire la friction de changement.

Taches:

- Templates CSV.
- Guide import.
- Mapping depuis exports courants.
- Service d'import assiste.

Criteres d'acceptation:

- Une ferme peut migrer sans developpeur.
- Les imports sont validables avant confirmation.
- Les erreurs sont compréhensibles.

Statut: a faire.

### COMP-P2-021 - Pricing et packaging

Priorite: P2

Concurrents vises:

- Herdwatch, Farmbrite, AgriWebb, CattleMax.

Objectif:

- Avoir une offre simple et competitive.

Taches:

- Pack Starter: petite ferme.
- Pack Pro: multi-especes + finance + rapports.
- Pack Organisation: multi-fermes + roles + API.
- Option accompagnement migration.

Criteres d'acceptation:

- Le client comprend quoi acheter en moins de 2 minutes.
- Le prix est justifie par le temps gagne et les rapports.
- Les limites par pack sont claires.

Statut: a faire.

### COMP-P2-022 - Partenariats terrain

Priorite: P2

Concurrents vises:

- Outils locaux et coops.

Objectif:

- Gagner la distribution par confiance locale.

Taches:

- Veterinaires.
- Cooperatives.
- Fournisseurs aliments.
- Consultants agricoles.
- Programmes ONG/agriculture.

Criteres d'acceptation:

- Minimum 3 partenaires pilotes.
- Un partenaire peut recommander FarmOS Pro avec support commercial.

Statut: a faire.

## Sprint 11 - Qualite, securite et scalabilite

### COMP-P0-004 - Durcir offline/outbox

Priorite: P0

Concurrents vises:

- Herdwatch, AgriWebb, Farmbrite.

Objectif:

- Faire confiance a FarmOS Pro meme sans reseau.

Taches:

- Tests perte reseau.
- Rejeu outbox.
- Gestion conflits.
- Indicateurs sync.
- Journal erreurs.

Criteres d'acceptation:

- Aucune donnee terrain perdue en offline.
- L'utilisateur sait quoi faire en erreur.
- Les conflits sont resolvables.

Statut: a faire.

### COMP-P0-005 - Tests workflows critiques

Priorite: P0

Concurrents vises:

- Tous.

Objectif:

- Ne pas perdre la confiance utilisateur sur les actions metier.

Taches:

- Test creation animal.
- Test traitement + retrait.
- Test mortalite.
- Test vente.
- Test import CSV.
- Test rapport PDF/CSV.
- Test sync offline.

Criteres d'acceptation:

- Tests automatises ou checklist reproductible.
- Aucun workflow critique casse avant release.

Statut: a faire.

### COMP-P1-014 - Performance grands troupeaux

Priorite: P1

Concurrents vises:

- CattleMax, DairyComp, BoviSync, PigCHAMP.

Objectif:

- Rester rapide avec beaucoup de donnees.

Taches:

- Tester 5 000 animaux.
- Tester 50 000 evenements.
- Pagination/virtualisation listes.
- Index backend.
- Cache offline controle.

Criteres d'acceptation:

- Liste animaux utilisable avec 5 000 animaux.
- Recherche en moins de 1 seconde sur donnees locales raisonnables.
- Dashboard charge sans bloquer l'app.

Statut: a faire.

## Ordre d'execution recommande

1. COMP-P0-001 - Positionnement.
2. COMP-P0-002 - Risque nom FarmOS.
3. COMP-P0-003 - Matrice concurrentielle.
4. COMP-P1-001 - Import Excel/CSV animaux.
5. COMP-P1-002 - Fiche animal complete.
6. COMP-P1-003 - Saisie rapide terrain.
7. COMP-P1-004 - Lots/groupes/mobs.
8. COMP-P1-005 - Calendrier/rappels.
9. COMP-P1-006 - Sanitaire/retrait.
10. COMP-P1-007 - Rapports audit.
11. COMP-P1-008 - Finance animaux/lots.
12. COMP-P1-009 - Paturage/carte.
13. COMP-P1-010 - Taches equipe.
14. COMP-P2-001 - Cow-calf.
15. COMP-P2-004 - Production lait.
16. COMP-P2-007 - Reproduction porcine.
17. COMP-P2-010 - Flock volaille.
18. COMP-P2-013 - RFID/QR/barcode.
19. COMP-P2-015 - Insights.
20. COMP-P2-018 - Multi-fermes.
21. COMP-P1-011 - Pack demo.
22. COMP-P1-012 - Fermes pilotes.
23. COMP-P1-013 - Migration.
24. COMP-P2-021 - Pricing.
25. COMP-P2-022 - Partenariats.
26. COMP-P0-004 - Offline/outbox.
27. COMP-P0-005 - Tests critiques.
28. COMP-P1-014 - Performance grands troupeaux.

## Definition of done globale

Une tache concurrentielle est terminee seulement si:

- Elle couvre un besoin utilisateur reel observe chez un concurrent ou en ferme pilote.
- Elle fonctionne sur mobile.
- Elle respecte les droits utilisateur.
- Elle fonctionne offline si elle concerne le terrain.
- Elle a un export ou une trace quand elle touche la conformite.
- Elle passe les tests ou la checklist du workflow critique.
- Elle peut etre expliquee simplement dans une demo commerciale.

## KPI de domination concurrentielle

- Temps pour importer une ferme existante.
- Temps pour ajouter traitement, mortalite, naissance, vente.
- Nombre d'evenements saisis offline sans erreur.
- Nombre de rapports exportes par ferme.
- Marge par lot/espece calculee.
- Retention pilote 30/90 jours.
- Taux conversion pilote vers payant.
- Nombre de fermes actives par segment.
- Nombre de migrations Excel/concurrent reussies.
- Nombre de bugs critiques terrain.

## Sources concurrentielles a surveiller

- Herdwatch: https://herdwatch.com/
- AgriWebb: https://www.agriwebb.com/us/
- Farmbrite: https://www.farmbrite.com/
- CattleMax: https://www.cattlemax.com/
- DairyComp/VAS: https://vas.com/dairycomp/
- BoviSync: https://bovisync.com/
- PigCHAMP: https://www.pigchamp.com/
- PoultryPlan: https://www.poultryplan.com/
