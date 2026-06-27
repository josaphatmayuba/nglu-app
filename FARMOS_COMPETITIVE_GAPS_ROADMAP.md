# FarmOS Pro - Ajouts a prevoir pour etre plus competitif

Date: 2026-06-27

## Objectif du document

Ce document resume ce qu'il faut ajouter a FarmOS Pro pour le positionner face aux applications connues de gestion d'elevage:

- Multi-especes / ferme complete: Farmbrite, Livestocked, Ranch Manager, FarmKeep.
- Bovins / ovins / caprins: Herdwatch, AgriWebb, CattleMax, Boviclic, Synel, Pilot'Elevage.
- Laitier specialise: DairyComp, BoviSync, CowManager.
- Porcin specialise: PigCHAMP.
- Volaille specialisee: PoultryCare, MTech/Amino, PoultryPlan.

Le produit local est deja concurrent sur le segment multi-especes, mais il doit encore gagner en profondeur metier, UX terrain, reporting et integrations pour concurrencer les acteurs specialises.

## Positionnement recommande

Positionnement court:

> Application mobile/offline de gestion d'elevage multi-especes pour fermes francophones, avec sante, reproduction, production, stocks, ventes et finance integres.

Ce positionnement evite de se battre directement contre DairyComp, PigCHAMP ou PoultryCare sur leur profondeur industrielle. Il met en avant les forces actuelles:

- Multi-especes: vaches, porcs, poulets, poissons, chevres, moutons, lapins, canards, dindes.
- PWA/mobile avec cache local et outbox offline.
- Identification terrain: camera, QR/code-barres, NFC/RFID, photo, reconnaissance.
- Modules transversaux: animaux, sante, reproduction, production, stock, POS, finances, rapports, equipe.
- Integration potentielle avec CRM, comptabilite, fournisseurs, RH et projets.

## Priorite 1 - Indispensable pour concurrencer Farmbrite / Livestocked / Herdwatch

### 1. Fiche animal complete

Ajouter ou renforcer:

- Historique chronologique complet par animal: naissance, achat, poids, traitement, vaccin, reproduction, production, vente, mortalite.
- Arbre genealogique visuel: mere, pere, descendants.
- Statut clair: actif, en traitement, quarantaine, a vendre, vendu, mort, reforme.
- Documents joints: carnet sanitaire, ordonnance, certificat, photo, facture.
- Alertes visibles sur la fiche: retrait lait/viande/oeufs, vaccin en retard, traitement ouvert, perte de poids.

Pourquoi:

Les concurrents gagnent souvent par la qualite de la fiche animal. C'est l'ecran central d'un logiciel d'elevage.

### 2. Workflow terrain ultra rapide

Ajouter:

- Mode "saisie rapide" en 3 taps: choisir animal, choisir evenement, valider.
- Actions favorites par espece: pesee, traitement, vaccin, mise bas, ponte, mortalite.
- Mode lot: appliquer une action a plusieurs animaux ou a un batiment/enclos.
- Scan direct depuis chaque formulaire.
- Brouillons offline recuperables.

Pourquoi:

Un eleveur travaille souvent dans l'etable, le poulailler ou le champ. Il ne doit pas remplir un formulaire long.

### 3. Gestion de lots et groupes

Ajouter:

- Lots dynamiques: lot de poulets, bande de porcs, bassin de poissons, troupeau de chevres.
- Evenements au niveau lot: aliment, vaccin, mortalite, transfert, vente, production.
- Calcul automatique du nombre restant apres ventes/mortalites/transferts.
- Fusion/split de lots.

Pourquoi:

Les animaux comme volailles, poissons et porcs sont souvent geres par lots, pas seulement individuellement.

### 4. Calendrier et rappels operationnels

Ajouter:

- Calendrier unique: vaccins, rappels, controles veto, chaleurs, inseminations, mises bas, sevrages, traitements, taches.
- Notifications PWA/mobile.
- Priorites: urgent, aujourd'hui, cette semaine, en retard.
- Generation automatique des rappels apres creation d'un evenement.

Pourquoi:

Herdwatch, AgriWebb et les apps specialisees creent de la valeur en evitant les oublis.

### 5. Exports simples et professionnels

Ajouter:

- Export PDF fiche animal.
- Export PDF registre sanitaire.
- Export Excel/CSV animaux, traitements, ventes, productions.
- Rapport mensuel ferme.
- Rapport par espece.

Pourquoi:

Les eleveurs doivent partager des documents avec veterinaire, comptable, administration, acheteurs ou partenaires.

## Priorite 2 - Differenciation forte

### 6. Module sanitaire avance

Ajouter:

- Protocoles de traitement par maladie et espece.
- Ordonnance veto avec signature.
- Stock medicament lie automatiquement aux traitements.
- Delais de retrait plus stricts: viande, lait, oeufs.
- Blocage automatique de vente si retrait actif.
- Analyse des maladies par mois, batiment, espece et lot.

Pourquoi:

C'est un angle fort pour se differencier: securite alimentaire + traçabilite + decision sanitaire.

### 7. Reproduction plus profonde

Ajouter:

- Cycles chaleur, saillie, insemination, diagnostic gestation, mise bas, avortement, sevrage.
- Calcul automatique des dates attendues par espece.
- Performance reproductrice: taux de gestation, intervalle velage-velage, taille moyenne portee.
- Suggestion male/semence selon historique et consanguinite.
- Alertes femelles improductives ou a reformer.

Pourquoi:

CattleMax, DairyComp, BoviSync et PigCHAMP sont forts sur la reproduction. Ton module semence est deja une bonne base.

### 8. Production par espece

Ajouter:

- Lait: AM/PM, total jour, moyenne par animal, baisse anormale.
- Oeufs: ponte par jour, casse/perte, stock vendable, lots.
- Viande/croissance: poids, GMQ, age, estimation valeur.
- Poisson: biomasse, densite, mortalite, oxygene, temperature, pH.
- Laine: tonte, poids laine, qualite.

Pourquoi:

Un produit multi-especes doit avoir des indicateurs adaptes a chaque espece, pas seulement des champs generiques.

### 9. Finance agricole connectee

Ajouter:

- Cout par espece, par lot, par animal, par produit.
- Marge brute par vente.
- Cout alimentaire par kg produit.
- Cout medicament/veto par espece.
- Rentabilite par batiment ou lot.
- Liaison comptable automatique plus visible dans l'UI.

Pourquoi:

Farmbrite est fort car il relie production, stock, ventes et finance. Ton avantage est l'integration CRM/compta.

### 10. Tableau de bord decisionnel

Ajouter:

- Score sante.
- Score reproduction.
- Score production.
- Score finance.
- Alertes prioritaires avec action directe.
- Comparaison periode actuelle vs precedente.
- Vues par espece et par site/batiment.

Pourquoi:

Le tableau de bord doit repondre a: "Qu'est-ce qui ne va pas aujourd'hui ?" et "Ou est-ce que je gagne/perds de l'argent ?"

## Priorite 3 - Pour attaquer les acteurs specialises

### 11. Bovins viande / cow-calf

Ajouter:

- Vêlage, sevrage, poids naissance, poids sevrage.
- Performance mere.
- Taureaux reproducteurs.
- Lots de paturage.
- Historique acheteur par animal vendu.

Concurrents cibles:

- CattleMax.
- Herdwatch.
- AgriWebb.

### 12. Laitier

Ajouter:

- Lactations.
- Courbes laitieres.
- Jours en lait.
- Tarissement.
- Mammites recurrentes.
- Integration future salle de traite/capteurs.

Concurrents cibles:

- DairyComp.
- BoviSync.
- CowManager, seulement via integration capteurs.

### 13. Porcin

Ajouter:

- Truie, verrat, porcelets, bandes.
- Saillie, mise bas, nes vivants, morts-nes, sevrage.
- Taux de mortalite pre-sevrage.
- Croissance engraissement.
- Lots batiment/salle.

Concurrents cibles:

- PigCHAMP.
- SwineManagement.com.

### 14. Volaille

Ajouter:

- Bandes broilers/layers/breeders.
- Entrees/sorties de bande.
- Ponte, mortalite, alimentation, poids moyen.
- Couvoir/incubation si cible industrielle.
- Conversion alimentaire.

Concurrents cibles:

- PoultryCare.
- MTech/Amino.
- PoultryPlan.
- Flockstar pour petites fermes.

### 15. Ovin / caprin

Ajouter:

- Agnelage/mise bas.
- Lactation caprine.
- Tonte et laine.
- Parasites et traitements saisonniers.
- Gestion troupeaux/paturages.

Concurrents cibles:

- Synel.
- Pilot'Elevage.
- OVICLIC.
- My Sheep Manager / My Goat Manager.

## Priorite 4 - Integrations et confiance produit

### 16. Identification officielle et traçabilite

Ajouter:

- Import CSV depuis systemes officiels ou fichiers EDE selon pays cible.
- Numeros de boucles et historique de mouvements.
- Registre mouvements: entree, sortie, transfert, vente, mort.
- Champs conformes par pays cible: Canada, France, Afrique francophone, etc.

Pourquoi:

Boviclic/Synel gagnent par leur proximite avec les obligations locales. Sans cette couche, ton produit est plus "gestion interne" que "outil officiel".

### 17. Roles metier

Ajouter:

- Eleveur / gerant ferme.
- Veterinaire.
- Technicien.
- Comptable.
- Commercial/POS.
- Lecture seule investisseur/partenaire.
- Permissions fines par module et action.

Pourquoi:

Une ferme professionnelle a plusieurs intervenants. Les concurrents avancent vers collaboration et audit.

### 18. Import / migration

Ajouter:

- Import animaux depuis Excel/CSV.
- Import traitements.
- Import ventes.
- Mapping colonnes assisté.
- Detection doublons par external_id/boucle.
- Rapport d'import avec erreurs.

Pourquoi:

Sans import, l'adoption est lente car les eleveurs ont deja des carnets, Excel ou anciens logiciels.

### 19. API publique / webhooks

Ajouter:

- API documentee pour animaux, traitements, production, ventes.
- Webhooks: animal vendu, traitement cree, retrait expire, stock bas.
- Connecteurs futurs capteurs/RFID/balances.

Pourquoi:

C'est necessaire pour capteurs, balances, plateformes partenaires et clients plus gros.

### 20. Qualite commerciale

Ajouter:

- Page produit publique claire.
- Demo avec donnees propres.
- Parcours onboarding: creer ferme, choisir especes, importer animaux.
- Donnees de demo par type de ferme.
- Guide utilisateur court.
- Videos/tutoriels terrain.

Pourquoi:

Un produit peut avoir beaucoup de fonctions mais perdre face a un concurrent plus simple a comprendre.

## Matrice de priorite

| Priorite | Ajout | Impact business | Complexite | A faire quand |
|---|---|---:|---:|---|
| P1 | Fiche animal complete | Tres fort | Moyen | Maintenant |
| P1 | Saisie rapide terrain | Tres fort | Moyen | Maintenant |
| P1 | Lots/groupes | Tres fort | Eleve | Maintenant |
| P1 | Calendrier/rappels | Fort | Moyen | Maintenant |
| P1 | Exports PDF/CSV | Fort | Moyen | Maintenant |
| P2 | Sanitaire avance | Tres fort | Eleve | Apres socle P1 |
| P2 | Reproduction avancee | Fort | Eleve | Apres socle P1 |
| P2 | Production par espece | Fort | Eleve | Apres socle P1 |
| P2 | Finance agricole | Tres fort | Moyen | Apres ventes/stock stables |
| P3 | Bovins specialises | Moyen/fort | Moyen | Selon cible client |
| P3 | Laitier specialise | Fort | Tres eleve | Si cible fermes laitieres |
| P3 | Porcin specialise | Fort | Tres eleve | Si cible porcheries |
| P3 | Volaille industrielle | Fort | Tres eleve | Si cible industriels |
| P4 | Identification officielle | Tres fort | Eleve | Selon pays cible |
| P4 | Import/migration | Tres fort | Moyen | Avant vente commerciale |
| P4 | API/webhooks | Moyen/fort | Eleve | Clients avances |

## Roadmap conseillee

### Phase 1 - Produit vendable multi-especes

Objectif: battre les outils simples type Excel, Livestocked, petites apps mobiles.

- Fiche animal complete.
- Saisie rapide terrain.
- Lots/groupes.
- Calendrier/rappels.
- Exports PDF/CSV.
- Import CSV animaux.

### Phase 2 - Produit professionnel ferme

Objectif: concurrencer Farmbrite, Herdwatch, AgriWebb sur le quotidien.

- Sanitaire avance.
- Reproduction avancee.
- Production par espece.
- Finance agricole.
- Tableau de bord decisionnel.
- Roles metier.

### Phase 3 - Specialisation marche

Objectif: choisir un segment et battre les outils specialises sur une niche.

Choisir une priorite:

- Bovins viande/cow-calf.
- Laitier.
- Porcin.
- Volaille.
- Ovin/caprin.

Ne pas tout specialiser en meme temps. Le risque serait de construire trop large et pas assez profond.

### Phase 4 - Integrations et ecosysteme

Objectif: monter vers clients plus gros et partenaires.

- Identification officielle.
- API publique.
- Webhooks.
- Integrations balances, RFID, capteurs, compta, ERP.
- Onboarding commercial complet.

## Strategie pour depasser les concurrents

### Principe central

Il ne faut pas essayer de depasser toutes les entreprises sur leur terrain en meme temps. Il faut choisir un angle ou FarmOS Pro peut etre objectivement meilleur, puis elargir.

Angle recommande:

> Devenir la meilleure plateforme d'elevage multi-especes francophone, mobile/offline, avec sante, reproduction, production, ventes et finance dans un seul systeme.

Cette strategie permet d'eviter une guerre directe trop tot contre:

- DairyComp sur le laitier industriel.
- PigCHAMP sur le porc industriel.
- PoultryCare/MTech sur la volaille industrielle.
- Boviclic/Synel sur les obligations locales tres connectees aux organismes.

FarmOS Pro doit d'abord battre:

- Excel, cahiers papier et WhatsApp.
- Les petites apps mono-espece.
- Les logiciels multi-especes qui n'ont pas une vraie integration finance/offline/francophone.

### Marche d'attaque prioritaire

Tete de pont recommandee:

**Fermes et organisations francophones multi-especes, avec connectivite parfois faible, besoin de traçabilite, ventes, stock et finance.**

Profils cibles:

- Fermes mixtes: bovins + volailles + caprins/ovins + porcs.
- Cooperatives ou projets agricoles qui suivent plusieurs fermes.
- ONG/projets de developpement agricole qui doivent suivre animaux, production, mortalite, intrants et resultats.
- Fermes commerciales moyennes qui n'ont pas encore d'ERP specialise.
- Veterinaires ou techniciens qui accompagnent plusieurs fermes.

Pourquoi ce marche:

- Les grands concurrents sont souvent anglophones, chers, complexes ou trop specialises.
- Les petites fermes ont besoin d'offline et de mobile terrain.
- Les projets/cooperatives ont besoin de rapports, multi-fermes, finance et traçabilite.
- L'integration CRM/compta/RH peut devenir un avantage que les apps d'elevage simples n'ont pas.

### Promesse produit a afficher

Promesse courte:

> Tout votre elevage dans une seule application: animaux, lots, sante, reproduction, production, ventes, stocks, finance et rapports, meme hors connexion.

Promesse operationnelle:

- Scanner un animal.
- Saisir un evenement en moins de 30 secondes.
- Voir les alertes critiques du jour.
- Sortir un rapport propre pour veto, comptable, bailleur ou administration.
- Connaitre la rentabilite par espece, lot ou batiment.

### Avantage defendable

FarmOS Pro doit construire un avantage difficile a copier autour de 6 piliers:

1. **Offline-first reel**
   - Cache local structure.
   - Outbox de mutations.
   - Sync visible.
   - Pas de perte de donnees sur le terrain.

2. **Multi-especes mais avec profondeur par espece**
   - Pas seulement un champ "species".
   - Des workflows differents pour bovin, porc, volaille, poisson, caprin, ovin.

3. **Finance integree**
   - Ventes, depenses, stocks et rentabilite lies aux animaux/lots.
   - Synchronisation comptable.
   - Marge par espece et par lot.

4. **Identification terrain**
   - QR/code-barres.
   - RFID/NFC.
   - Photos.
   - Recherche rapide.
   - Reconnaissance visuelle comme differenciation future.

5. **Conformite et traçabilite**
   - Registre sanitaire.
   - Registre mouvements.
   - Delais de retrait.
   - Exports administratifs.

6. **Ecosysteme francophone**
   - Interface FR d'abord.
   - Rapports en francais.
   - Modeles pays/region.
   - Support et onboarding en francais.

### Strategie concurrent par concurrent

| Concurrent | Leur force | Notre angle pour gagner |
|---|---|---|
| Farmbrite | Ferme complete, finance, multi-fonction | Etre plus terrain/offline, plus francophone, plus rapide pour l'elevage |
| Livestocked | Multi-especes, offline, simple | Ajouter meilleure finance, rapports, sante, reproduction et UX moderne |
| Herdwatch | Bovins/ovins, conformite, mobile | Battre sur multi-especes, finance, francophone, modules production et POS |
| AgriWebb | Ranch, paturage, equipe, carte | Battre sur elevage mixte, sante, vente, stock, compta, petits/moyens elevages |
| CattleMax | Bovins tres solide | Ne pas attaquer d'abord les ranchs bovins purs; gagner les fermes mixtes |
| Boviclic/Synel | Ancrage local/reglementaire France | Gagner hors obligations officielles d'abord; ajouter connecteurs/exports ensuite |
| DairyComp/BoviSync | Profondeur laitier | Ne pas les remplacer au debut; offrir un module laitier suffisant pour fermes mixtes |
| PigCHAMP | Porc industriel | Gagner porcheries petites/moyennes avant industriel |
| PoultryCare/MTech | Volaille industrielle et supply chain | Gagner volailles petites/moyennes, puis bandes et couvoir si marche confirme |

### Strategie produit en 18 mois

#### Mois 0-3 - Battre Excel et cahiers papier

Objectif:

- Produit utilisable par une vraie ferme sans assistance technique lourde.

Livrables:

- Fiche animal complete.
- Import Excel/CSV animaux.
- Saisie rapide terrain.
- Lots/groupes.
- Calendrier/rappels.
- Exports PDF/CSV.
- Dashboard alertes du jour.
- Onboarding: creer ferme, choisir especes, importer animaux.

Definition de succes:

- Une ferme peut migrer ses animaux en moins d'une journee.
- Un utilisateur peut saisir traitement/pesee/vaccin/mortalite en moins de 30 secondes.
- Les donnees restent utilisables offline.

#### Mois 3-6 - Battre les apps multi-especes simples

Objectif:

- Devenir meilleur que les apps generalistes pour une ferme mixte.

Livrables:

- Sanitaire avance avec delais de retrait et blocage vente.
- Reproduction avancee par espece.
- Production par espece.
- Finance agricole par espece/lot.
- Gestion stock medicaments/aliments.
- Roles metier.
- Rapports mensuels automatiques.

Definition de succes:

- L'utilisateur voit quelles especes et quels lots gagnent ou perdent de l'argent.
- Les alertes sante/reproduction/stock sont fiables.
- Le responsable peut controler le travail de l'equipe.

#### Mois 6-12 - Gagner une niche specialisee

Objectif:

- Choisir une niche et y devenir excellent.

Niche recommandee en premier:

**Fermes multi-especes avec bovins + volailles + caprins/ovins.**

Raison:

- Ce segment valorise le multi-especes.
- Il a besoin de lots pour volailles et petits ruminants.
- Il a besoin de finance/stock/production.
- Il n'est pas totalement capture par DairyComp/PigCHAMP/PoultryCare.

Livrables:

- Bovins: vêlage, sevrage, poids naissance/sevrage, reproduction.
- Volailles: bandes, ponte, mortalite, alimentation, stock oeufs, vente oeufs.
- Caprins/ovins: mise bas, lactation, parasites, tonte/laine si utile.
- Comparaison multi-especes: rentabilite, mortalite, production.

Definition de succes:

- FarmOS Pro devient la meilleure option pour une ferme mixte francophone.

#### Mois 12-18 - Monter en gamme

Objectif:

- Vendre a cooperatives, projets agricoles, multi-fermes et fermes commerciales.

Livrables:

- Multi-fermes / multi-sites.
- Rapports bailleurs/cooperatives.
- API publique.
- Webhooks.
- Connecteurs balance/RFID/capteurs.
- Mode technicien/veterinaire multi-clients.
- Audit log complet.
- SLA/support.

Definition de succes:

- Une organisation peut piloter plusieurs fermes depuis FarmOS Pro.
- Les rapports remplacent les fichiers Excel de suivi projet.
- Les donnees peuvent alimenter compta, BI ou partenaires.

### Strategie IA

L'IA ne doit pas etre un gadget. Elle doit aider a decider plus vite.

Priorite IA:

1. Alertes explicables:
   - baisse production lait/oeufs,
   - mortalite anormale,
   - stock bientot en rupture,
   - traitement en retard,
   - femelle a inseminer,
   - animal sous delai de retrait.

2. Recommandations:
   - quels animaux surveiller aujourd'hui,
   - quels lots coutent trop cher,
   - quel vaccin/traitement arrive,
   - quelle espece est la plus rentable.

3. Assistant terrain:
   - recherche en langage naturel,
   - "montre les vaches sous traitement",
   - "cree un rappel vaccin pour le lot A",
   - "genere le rapport sanitaire du mois".

4. IA avancee plus tard:
   - prediction mortalite,
   - prediction production,
   - suggestion reproduction,
   - reconnaissance animale par photo.

Regle:

- Toute recommandation IA doit afficher les donnees qui l'ont motivee.
- Pas de conseil veterinaire dangereux sans validation humaine.

### Strategie conformite

La conformite doit etre progressive par pays.

Ordre recommande:

1. Registres internes universels:
   - registre sanitaire,
   - registre mouvements,
   - registre mortalite,
   - registre production,
   - registre traitements/retraits.

2. Modeles pays:
   - Canada/Quebec.
   - France.
   - Afrique francophone par pays prioritaire.

3. Connecteurs/exports:
   - exports CSV/PDF compatibles avec organismes.
   - import depuis anciens systemes.
   - champs specifiques par pays.

4. Integrations officielles:
   - seulement si le marche le justifie.

### Strategie go-to-market

#### Cible 1 - Ferme pilote

Objectif:

- Obtenir 5 a 10 fermes pilotes avec vrais animaux et vrais problemes.

Ce qu'il faut vendre:

- Moins de papier.
- Moins d'oublis sanitaires.
- Meilleur suivi mortalite/production.
- Rapports propres.
- Donnees disponibles meme hors connexion.

Livrables commerciaux:

- Demo publique avec donnees propres.
- Video courte: scanner animal -> traitement -> rapport.
- Modele Excel d'import.
- Guide "demarrer en 30 minutes".

#### Cible 2 - Techniciens/veterinaires

Objectif:

- Toucher plusieurs fermes via un seul utilisateur expert.

Ce qu'il faut vendre:

- Suivi multi-fermes.
- Dossiers sanitaires.
- Ordonnances/signatures.
- Alertes et rapports.

#### Cible 3 - Cooperatives/projets agricoles

Objectif:

- Vendre un pilotage multi-fermes.

Ce qu'il faut vendre:

- Donnees centralisees.
- Rapports bailleurs/direction.
- Suivi production/mortalite/ventes.
- Gestion intrants et stock.

### Strategie pricing

Pricing recommande a tester:

- **Starter**: petite ferme, 1-2 utilisateurs, nombre limite d'animaux/lots, fonctions essentielles.
- **Pro**: ferme active, offline complet, rapports, finance, multi-utilisateurs.
- **Organisation**: multi-fermes, roles avances, API, rapports consolides, support.
- **Enterprise/Projet**: personnalisation, hebergement dedie, integrations, SLA.

Regle:

- Ne pas facturer seulement par utilisateur. En agriculture, la valeur vient aussi du nombre d'animaux/lots, des modules et des rapports.
- Garder un prix d'entree simple pour battre Excel.
- Facturer plus cher la valeur organisationnelle: multi-fermes, reporting, integrations, support.

### Strategie partenariats

Partenaires prioritaires:

- Veterinaires.
- Techniciens agricoles.
- Cooperatives.
- Fournisseurs aliments/medicaments.
- Vendeurs RFID/balances.
- Programmes agricoles/ONG.
- Cabinets comptables agricoles.

Objectif:

- Faire distribuer FarmOS Pro par des acteurs qui ont deja la confiance des eleveurs.

### Strategie marque

Point critique:

- Le nom farmOS existe deja comme projet open source connu et marque enregistree.
- Pour un produit public/commercial, prevoir un nom distinct.

Options:

- Garder "FarmOS Pro" seulement en interne.
- Creer une marque propre avant commercialisation.
- Positionner le module comme "Elevage" ou "Livestock" dans la plateforme NgoluApp/Avelomi.

Decision recommandee:

- Ne pas lancer commercialement sous le nom FarmOS sans verification juridique.

### KPI de domination

KPI produit:

- Temps moyen pour ajouter un evenement terrain.
- Pourcentage de mutations saisies offline puis synchronisees.
- Nombre d'animaux/lots actifs.
- Nombre d'evenements par ferme par semaine.
- Nombre d'alertes resolues.
- Nombre de rapports exportes.

KPI business:

- Fermes pilotes actives.
- Taux d'activation: ferme creee + animaux importes + 1 evenement + 1 rapport.
- Retention 30/90 jours.
- Nombre d'utilisateurs par ferme.
- Taux de conversion pilote -> payant.
- Revenu moyen par ferme.

KPI qualite:

- Donnees perdues: objectif 0.
- Erreurs de sync offline.
- Temps de chargement mobile.
- Bugs critiques en saisie terrain.
- Taux de reussite import CSV.

### Ordre d'execution recommande

1. Finaliser import CSV animaux/lots.
2. Finaliser fiche animal complete.
3. Finaliser saisie rapide terrain.
4. Finaliser lots/groupes.
5. Finaliser calendrier/rappels.
6. Finaliser exports PDF/CSV.
7. Renforcer sanitaire/retrait/stock.
8. Renforcer production par espece.
9. Renforcer reproduction par espece.
10. Ajouter finance par lot/espece.
11. Construire demo/onboarding/pricing.
12. Lancer 5 a 10 fermes pilotes.

Regle de priorisation:

- Si une fonction ne reduit pas le temps terrain, n'ameliore pas la traçabilite, n'aide pas a vendre/produire plus, ou ne facilite pas le reporting, elle attend.

## Strategie design et UX pour depasser les concurrents

Le design doit etre traite comme un avantage produit, pas comme une couche visuelle. Les eleveurs utilisent l'application debout, dehors, avec peu de temps, parfois hors connexion. L'interface doit donc permettre de saisir une action en quelques secondes et de comprendre les urgences sans chercher.

### P0 - Corriger le chargement du design system

Point critique observe:

- Le fichier CSS peut etre reference avec un chemin duplique: `/farmos/farmos/styles/app.css`.
- Quand cela arrive, l'application retombe sur un rendu navigateur par defaut: boutons natifs, police serif, espacements faibles, titres qui debordent sur mobile.

Actions:

- Utiliser des chemins relatifs ou compatibles Vite/base URL pour `manifest`, icones et `styles/app.css`.
- Verifier le rendu en dev et en production sous `/farmos/`.
- Ajouter un controle visuel rapide avant chaque livraison: desktop, tablette, mobile.

### P1 - Mobile terrain d'abord

Objectif: l'utilisateur doit pouvoir travailler a une main, rapidement, sans reflechir a la navigation.

A ajouter ou renforcer:

- Navigation mobile limitee aux actions principales: Accueil, Scanner, Ajouter, Animaux, Alertes.
- Bouton `+` central pour les saisies rapides: traitement, mortalite, vente, pesee, naissance, alimentation.
- Zones tactiles de 44 a 48 px minimum.
- En-tetes qui ne debordent jamais sur mobile.
- Actions principales visibles en bas de l'ecran ou sticky dans les formulaires.
- Mode offline visible et rassurant: synchronise, en attente, erreur.

### P1 - Tableau de bord decisionnel

Le tableau de bord ne doit pas seulement afficher des chiffres. Il doit repondre a la question: "Que dois-je faire maintenant ?"

A mettre au-dessus de la ligne de flottaison:

- Alertes critiques: retraits medicaments, maladies, mortalites, ruptures stock.
- Taches du jour: vaccins, reproduction, pesees, controles, ventes prevues.
- Animaux ou lots a risque.
- Indicateurs financiers simples: ventes, depenses, marge estimee.
- Raccourcis de saisie terrain.

### P1 - Reduire la charge cognitive

L'application a beaucoup de modules, ce qui est bon pour la puissance produit mais risque de faire peur au premier usage.

Actions:

- Regrouper la navigation en familles: Terrain, Animaux, Production, Finance, Rapports, Administration.
- Afficher les modules selon le role: ouvrier, veterinaire, manager, proprietaire.
- Masquer les fonctions avancees tant que la ferme n'a pas de donnees correspondantes.
- Ajouter des etats vides utiles: importer animaux, ajouter premier lot, planifier premier vaccin.

### P2 - Design system operationnel

Objectif: rendre l'application plus professionnelle que les outils concurrents simples, sans devenir une landing page decorative.

A standardiser:

- Typographie, tailles de titres, espacements, cartes, boutons, onglets, badges, tableaux, modales.
- Couleurs de statut: critique, attention, succes, information, brouillon, synchronisation.
- Icones coherentes au lieu d'emojis disperses pour les actions metier.
- Tables denses mais lisibles pour les grands troupeaux.
- Composants reutilisables pour fiche animal, alerte, evenement, document, lot et KPI.

### P2 - Listes, tables et fiches animal

Les concurrents forts gagnent souvent sur la vitesse de consultation. FarmOS Pro doit devenir excellent sur les listes longues.

A ajouter:

- Filtres sauvegardes: espece, lot, statut, age, sexe, sante, ferme, batiment.
- Tri rapide et recherche persistante.
- Actions en masse: vacciner, changer de lot, vendre, archiver, exporter.
- Tiroir de detail rapide sans quitter la liste.
- Indicateurs visibles: retrait, gestation, maladie, alerte, document manquant.
- Mode compact pour bureau et mode confortable pour mobile.

### P2 - Accessibilite et conditions terrain

A garantir:

- Contraste lisible en plein soleil.
- Texte qui tient en francais et en anglais.
- Aucun scroll horizontal mobile.
- Etats focus clavier visibles.
- Couleur jamais seule pour indiquer un statut.
- Option texte plus grand pour utilisateurs terrain.
- Chargement, erreur et offline explicites.

### P3 - Effet premium et confiance

A ameliorer quand les bases P0/P1/P2 sont solides:

- Onboarding visuel propre avec exemples de ferme, troupeau, lots et rapports.
- Donnees de demonstration realistes pour les ventes.
- Rapports PDF plus premium: logo, ferme, periode, graphiques, alertes, signature.
- Page de connexion et installation PWA plus rassurantes.
- Branding distinctif si le nom FarmOS presente un risque de confusion avec le projet farmOS existant.

### KPI design et UX

- Temps pour ajouter un animal.
- Temps pour enregistrer un traitement.
- Temps pour enregistrer une mortalite.
- Temps pour scanner et ouvrir une fiche.
- Taux de reussite des saisies offline.
- Nombre de clics pour generer un rapport.
- Taux d'abandon au premier usage.
- Nombre de bugs de texte qui deborde ou de scroll horizontal mobile.

### Checklist QA visuelle

Avant chaque version importante, verifier:

- Desktop 1440 x 900.
- Tablette 1180 x 820.
- Mobile 390 x 844.
- Mobile compact 360 x 740.
- Ecrans: login, dashboard, animaux, fiche animal, saisie rapide, identification, ventes/POS, rapports, parametres.
- Chemins statiques sous `/farmos/`: CSS, manifest, icones.
- Aucun texte coupe dans les boutons et en-tetes.
- Aucune carte imbriquee inutilement.
- Navigation utilisable sans formation.

## Ce qu'il ne faut pas prioriser maintenant

- Concurrencer DairyComp completement: trop specialise laitier.
- Concurrencer PigCHAMP completement: trop specialise porcin industriel.
- Concurrencer MTech/Amino completement: trop supply-chain/ERP industriel.
- Ajouter des capteurs hardware proprietaires avant d'avoir les workflows terrain parfaits.
- Ajouter trop d'IA sans donnees fiables. L'IA doit d'abord expliquer, alerter et recommander a partir des donnees existantes.
- Commercialiser publiquement sous le nom FarmOS sans verification marque.
- Construire des integrations officielles pays par pays avant d'avoir des fermes pilotes.

## Conclusion

FarmOS Pro est deja concurrent sur le segment multi-especes et ferme connectee. Pour depasser les concurrents, il faut etre le meilleur sur une niche claire avant d'elargir: elevage multi-especes francophone, mobile/offline, avec finance et traçabilite integrees.

Les ajouts prioritaires sont:

1. Fiche animal complete.
2. Saisie terrain ultra rapide.
3. Gestion de lots/groupes.
4. Calendrier/rappels.
5. Exports et imports.
6. Sanitaire avance avec retraits et stock medicament.
7. Reproduction et production adaptees par espece.
8. Finance agricole liee aux ventes, depenses et stocks.

La strategie gagnante est:

1. Battre Excel et les cahiers papier.
2. Battre les apps multi-especes simples.
3. Devenir excellent sur une niche: fermes mixtes francophones.
4. Monter vers cooperatives, projets agricoles et multi-fermes.
5. Ajouter les specialisations industrielles seulement quand le marche le demande.
