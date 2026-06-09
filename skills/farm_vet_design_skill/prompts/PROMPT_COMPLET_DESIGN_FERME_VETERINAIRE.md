# Prompt complet — Redesign application ferme, élevage et vétérinaire

## Objectif
Transformer l'application actuelle en une plateforme professionnelle moderne pour :

1. les éleveurs / fermiers ;
2. les vétérinaires ;
3. les gestionnaires / entreprises agricoles ;
4. les superviseurs terrain ;
5. les administrateurs financiers.

Le design actuel doit être conservé comme base moderne, mais l'expérience utilisateur doit être améliorée pour devenir plus pratique sur le terrain, surtout sur téléphone, tablette et PWA.

---

## Vision du produit
L'application ne doit pas seulement être un logiciel de gestion d'animaux. Elle doit devenir une plateforme complète de gestion d'élevage, santé animale, rentabilité, bâtiments, stocks, équipes, documents et assistance vétérinaire.

Elle doit fonctionner pour :

- porcs ;
- bovins ;
- chèvres ;
- moutons ;
- volailles ;
- lapins ;
- pisciculture ;
- autres espèces ajoutables plus tard.

---

## Principe UX principal
L'application doit être pensée pour un utilisateur qui travaille dans une ferme, parfois avec une seule main, parfois sans bonne connexion internet, parfois dans un environnement sale ou bruyant.

Donc l'interface doit avoir :

- gros boutons ;
- actions rapides ;
- peu de texte inutile ;
- icônes visibles ;
- cartes simples ;
- mode mobile-first ;
- fonctionnement PWA hors ligne ;
- synchronisation automatique quand internet revient ;
- scan QR / code animal ;
- accès rapide aux actions urgentes.

---

## Structure générale proposée
Créer 3 modes principaux dans la même application :

### 1. Mode Éleveur
Interface simple pour les actions quotidiennes.

Fonctions principales :

- ajouter animal ;
- naissance ;
- décès ;
- vaccination ;
- traitement ;
- pesée ;
- reproduction ;
- alimentation ;
- déplacement entre bâtiments ;
- observation santé ;
- scan animal.

### 2. Mode Vétérinaire
Interface clinique avancée.

Fonctions principales :

- dossier médical animal ;
- examen clinique ;
- diagnostic ;
- ordonnance ;
- traitement ;
- protocole médical ;
- laboratoire ;
- vaccination ;
- suivi maladie ;
- rapport vétérinaire ;
- délai de retrait viande / lait / œufs ;
- assistant IA vétérinaire.

### 3. Mode Gestionnaire
Interface pour direction, entreprise et finance.

Fonctions principales :

- rentabilité par animal ;
- rentabilité par lot ;
- rentabilité par bâtiment ;
- coûts alimentaires ;
- coûts vétérinaires ;
- ventes ;
- achats ;
- stock ;
- RH ;
- tâches ;
- rapports PDF / Excel ;
- indicateurs de performance.

---

## Tableau de bord principal
Créer un tableau de bord vivant avec les indicateurs essentiels.

Exemple :

- total animaux ;
- porcs ;
- bovins ;
- chèvres ;
- moutons ;
- animaux malades ;
- gestantes ;
- vaccinations dues ;
- traitements actifs ;
- décès ce mois ;
- naissances ce mois ;
- stock aliment critique ;
- stock médicament critique ;
- profit estimé du mois ;
- tâches en retard.

Design : cartes KPI modernes, icônes agricoles, couleurs claires, statut par couleur.

Couleurs proposées :

- vert : santé / agriculture ;
- bleu : information ;
- orange : attention ;
- rouge : urgence ;
- brun doux : terre / ferme ;
- gris clair : fond neutre.

---

## Centre d'actions rapides
Créer une section visible dès l'accueil.

Actions rapides :

- Vacciner ;
- Traiter ;
- Naissance ;
- Décès ;
- Pesée ;
- Saillie ;
- Insémination ;
- Déplacer animal ;
- Ajouter dépense ;
- Ajouter stock ;
- Scanner animal ;
- Créer tâche.

Chaque action doit ouvrir un formulaire simple, adapté à l'espèce sélectionnée.

---

## Gestion des animaux
Créer une page animaux avec cartes par espèce.

Chaque carte doit afficher :

- icône de l'espèce ;
- nombre total ;
- nombre malades ;
- gestantes ;
- jeunes ;
- adultes ;
- vaccinations dues ;
- décès récents ;
- bouton ouvrir.

Espèces :

- Porcs ;
- Bovins ;
- Chèvres ;
- Moutons ;
- Volailles ;
- Lapins ;
- Poissons.

---

## Fiche animal
Chaque animal doit avoir une fiche complète.

Informations de base :

- identifiant unique ;
- QR code ;
- photo ;
- espèce ;
- race ;
- sexe ;
- date de naissance ;
- âge ;
- poids actuel ;
- statut santé ;
- bâtiment ;
- lot ;
- mère ;
- père ;
- origine ;
- valeur estimée.

Onglets :

1. Résumé ;
2. Santé ;
3. Reproduction ;
4. Poids / croissance ;
5. Alimentation ;
6. Finances ;
7. Documents ;
8. Historique ;
9. Alertes.

---

## Module santé animale
Ajouter ou améliorer :

- symptômes ;
- température ;
- pouls ;
- respiration ;
- état corporel ;
- appétit ;
- comportement ;
- diagnostic probable ;
- diagnostic confirmé ;
- traitement ;
- médicament ;
- dose ;
- durée ;
- vétérinaire responsable ;
- délai de retrait ;
- photos ;
- documents ;
- suivi quotidien.

---

## Module vétérinaire avancé
Créer un vrai dossier clinique.

Champs à prévoir :

- motif de consultation ;
- anamnèse ;
- examen clinique ;
- diagnostic différentiel ;
- diagnostic final ;
- ordonnance ;
- protocole ;
- examens complémentaires ;
- laboratoire ;
- résultat laboratoire ;
- recommandation ;
- suivi ;
- signature vétérinaire.

Fonctions :

- générer ordonnance PDF ;
- générer rapport PDF ;
- envoyer rapport au propriétaire ;
- associer médicament au stock ;
- calcul automatique de la dose selon poids ;
- alerte délai de retrait.

---

## Bibliothèque maladies et protocoles
Ajouter une base de connaissances interne.

Pour chaque maladie :

- espèce concernée ;
- symptômes ;
- niveau d'urgence ;
- causes possibles ;
- examens recommandés ;
- traitements possibles ;
- prévention ;
- vaccin disponible ;
- protocole recommandé ;
- risque de mortalité ;
- contagiosité.

Exemples :

Porcs :

- rouget ;
- peste porcine ;
- pneumonie ;
- diarrhée ;
- parasites ;
- boiterie.

Bovins :

- mammite ;
- brucellose ;
- fièvre aphteuse ;
- parasitose ;
- métrite.

Caprins / ovins :

- PPR ;
- parasites internes ;
- pneumonie ;
- diarrhée.

---

## Assistant IA vétérinaire
Créer un module IA qui aide sans remplacer le vétérinaire.

L'utilisateur peut entrer :

- espèce ;
- âge ;
- poids ;
- symptômes ;
- température ;
- comportement ;
- photos ;
- historique.

L'IA propose :

- hypothèses possibles ;
- niveau d'urgence ;
- examens à faire ;
- questions à poser ;
- protocole à vérifier ;
- recommandation de contacter un vétérinaire.

Important : toujours afficher que l'IA ne remplace pas le diagnostic vétérinaire.

---

## Module mortalité
Créer un module complet pour les décès.

Champs :

- animal ;
- date décès ;
- heure ;
- bâtiment ;
- lot ;
- âge ;
- cause probable ;
- cause confirmée ;
- maladie liée ;
- symptômes avant décès ;
- vétérinaire consulté ;
- photo ;
- autopsie ;
- document joint ;
- perte financière estimée.

Statistiques :

- décès par mois ;
- décès par espèce ;
- décès par bâtiment ;
- décès par maladie ;
- taux de mortalité ;
- comparaison annuelle.

---

## Module reproduction
Pour chaque espèce, adapter les champs.

Fonctions :

- chaleur ;
- saillie ;
- insémination artificielle ;
- gestation ;
- mise bas ;
- avortement ;
- sevrage ;
- portée ;
- nombre nés vivants ;
- nombre mort-nés ;
- nombre sevrés ;
- père ;
- mère ;
- éviter consanguinité ;
- calendrier prévisionnel.

Alertes :

- prochaine chaleur ;
- diagnostic gestation ;
- mise bas proche ;
- sevrage ;
- repos reproductif.

---

## Module bâtiments
Créer une gestion par bâtiment / zone.

Champs :

- nom bâtiment ;
- type ;
- capacité ;
- occupation ;
- température ;
- humidité ;
- ventilation ;
- statut hygiène ;
- responsable ;
- animaux présents ;
- lots présents ;
- événements récents.

Vues :

- grille des bâtiments ;
- carte de ferme ;
- taux d'occupation ;
- alertes bâtiment.

---

## Module rentabilité
Très important pour les entreprises.

Calculer :

- coût alimentation par animal ;
- coût médicament par animal ;
- coût vétérinaire ;
- coût main-d'œuvre ;
- coût bâtiment ;
- coût reproduction ;
- coût total ;
- valeur de vente ;
- profit estimé ;
- profit réel ;
- marge par animal ;
- marge par lot ;
- marge par espèce ;
- marge par bâtiment.

Créer un tableau financier simple avec graphiques.

---

## Module stock
Gérer :

- aliments ;
- médicaments ;
- vaccins ;
- matériel ;
- consommables ;
- produits vétérinaires.

Fonctions :

- entrée stock ;
- sortie stock ;
- stock minimum ;
- alerte rupture ;
- date expiration ;
- lot médicament ;
- fournisseur ;
- coût unitaire ;
- consommation par animal / lot.

---

## Module RH et tâches
Ajouter une gestion simple du personnel.

Fonctions :

- employés ;
- rôles ;
- présence ;
- tâches ;
- affectation bâtiment ;
- superviseur ;
- rapport journalier ;
- paie simple ;
- performance.

Tâches types :

- nourrir ;
- nettoyer ;
- vacciner ;
- traiter ;
- peser ;
- vérifier bâtiment ;
- rapporter anomalie.

---

## Documents
Chaque animal, bâtiment, traitement ou vente doit pouvoir recevoir des documents.

Documents :

- facture ;
- ordonnance ;
- certificat ;
- analyse laboratoire ;
- photo ;
- vidéo ;
- contrat ;
- rapport vétérinaire ;
- document de vente.

---

## Rapports
Créer des rapports exportables PDF / Excel.

Rapports :

- inventaire animaux ;
- santé animale ;
- vaccination ;
- traitement ;
- mortalité ;
- reproduction ;
- production ;
- stock ;
- finances ;
- rentabilité ;
- RH ;
- rapport vétérinaire ;
- rapport de ferme mensuel.

---

## Design UI proposé
Style : moderne, agricole, professionnel, mobile-first.

Principes :

- cartes KPI ;
- icônes grandes ;
- menu bas sur mobile ;
- bouton flottant d'action rapide ;
- navigation simple ;
- filtres visibles ;
- code couleur santé ;
- fiches animales lisibles ;
- tableaux seulement quand nécessaire ;
- mode sombre optionnel.

Navigation mobile proposée :

1. Accueil ;
2. Animaux ;
3. Actions ;
4. Alertes ;
5. Plus.

Navigation desktop :

- Dashboard ;
- Animaux ;
- Santé ;
- Reproduction ;
- Bâtiments ;
- Stock ;
- Finances ;
- RH ;
- Rapports ;
- Paramètres.

---

## Exigences techniques
L'application doit rester :

- responsive ;
- PWA ;
- utilisable hors ligne ;
- compatible mobile / tablette / desktop ;
- rapide ;
- claire ;
- sécurisée par rôles.

Prévoir rôles :

- Admin ;
- Gestionnaire ;
- Éleveur ;
- Vétérinaire ;
- Superviseur ;
- Employé ;
- Lecture seule.

---

## Résultat attendu
L'agent doit analyser le projet existant, conserver ce qui est déjà bon, puis proposer ou implémenter un redesign complet avec :

1. dashboard agricole moderne ;
2. actions rapides terrain ;
3. mode éleveur ;
4. mode vétérinaire ;
5. mode gestionnaire ;
6. fiche animal complète ;
7. dossier clinique vétérinaire ;
8. mortalité ;
9. rentabilité ;
10. bâtiments ;
11. RH ;
12. documents ;
13. rapports ;
14. IA vétérinaire ;
15. design mobile-first.

Le résultat final doit donner une application professionnelle qui peut être vendue aux fermes, entreprises agricoles et vétérinaires.
