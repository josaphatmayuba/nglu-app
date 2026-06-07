# Roadmap RH NgoluApp

Ce document sert de note de travail pour faire evoluer RH NgoluApp par stades. Regle de base: l'employe est le centre du systeme et les modules doivent se relier par `employee_id`, `contract_id`, `department_id`, `project_id` et `currency_id`.

## Regles permanentes

- Pas de donnees metier hardcodees dans le frontend.
- Les montants affichent toujours la devise.
- Les telephones affichent toujours l'indicatif pays.
- Les modules RH doivent lire/ecrire via API et base de donnees.
- Pas de deploiement manuel par Codex: code, tests, commit, push.

## Stade 1 - Dossier employe 360

Objectif: quand on ouvre un employe, voir son dossier central au lieu d'une fiche simple.

- Profil complet disponible actuellement.
- Contrat actif et historique contrats.
- Historique de paie.
- Conges et absences.
- Temps saisi par projet/activite.
- Documents RH.
- Evaluations.
- Demandes RH.
- Emplacements reserves pour discipline, formation personnelle, affectations projets et signature lorsque les tables/API existent.

Statut: en cours.

## Stade 2 - Employe complet

Objectif: enrichir la table et les formulaires employes.

- Photo/avatar.
- Matricule automatique `EMP-YYYY-0001`.
- Genre, date de naissance, etat civil, nombre d'enfants.
- Nationalite.
- Adresse structuree.
- Contact d'urgence.
- Pieces jointes personnelles.

Statut: en cours.

Fait:
- Champs DB/API pour genre, date de naissance, etat civil, enfants, nationalite.
- Contact d'urgence avec telephone international.
- Photo via lien fichier.
- Matricule genere par l'API au format `EMP-YYYY-0001` si vide.
- Formulaires RH creation/modification connectes a ces champs.
- Dossier employe 360 affiche ces informations.

Reste:
- Vrai upload fichier/photo avec stockage central.
- Table dediee pour pieces personnelles si plusieurs fichiers doivent etre versionnes.

## Stade 3 - Organigramme

Objectif: relier chaque employe a un responsable et une equipe. en se basant ce qui est sur crm.

- Superieur hierarchique.
- Equipe/service.
- Vue organigramme par departement.
- Alertes sur postes sans manager.

Statut: en cours.

Fait:
- Table `hr_payrolls` pour bulletins mensuels.
- API `hr/payrolls` avec creation, liste, mise a jour, suppression.
- Calcul serveur du brut et du net a payer.
- Formulaire HR avec salaire de base, primes, heures supplementaires, retenues, impots et CNSS.
- Page Paie avec bulletins, brut total, net a payer, filtres et export.
- Dossier employe 360 relie aux bulletins de paie.

Reste:
- Generation automatique d'une paie depuis contrat + presence + conges.
- Regles CNSS/IPR parametrees par pays.
- Validation workflow et verrouillage apres paiement.
- PDF fiche de paie et signature/accuse de reception employe.

## Stade 4 - Paie professionnelle

Objectif: produire une paie calculable et auditable.

- Salaire de base.
- Primes: transport, logement, risque, autres.
- Heures supplementaires.
- Retenues, avances, absences non payees.
- CNSS et impots selon pays.
- Brut, net a payer, multi-devise.
- Lien avec contrat, presence et conges.

Statut: a faire.

## Stade 5 - Presence

Objectif: relier le temps travaille a l'employe et a la paie.

- Pointage manuel d'abord.
- Historique entree, pause, retour, sortie.
- Retard, absence, heures supplementaires.
- QR/GPS ensuite.
- Biometrie seulement apres analyse legale et securite.

Statut: a faire.

## Stade 6 - Conges avec workflow

Objectif: conges connectes aux soldes, presence et paie.

- Types de conges.
- Soldes par employe.
- Workflow employe -> chef -> RH -> approuve.
- Impact presence et paie.

Statut: a faire.

## Stade 7 - Affectations projets ONG

Objectif: calculer le cout RH par projet.

- Projet.
- Affectation employe-projet.
- Pourcentage de temps.
- Budget RH du projet.
- Rapport de cout RH par projet et devise.

Statut: termine.

Fait:
- Tables `hr_projects` et `hr_project_assignments`.
- API `hr/projects` et `hr/project-assignments`.
- Code projet automatique `ONG-YYYY-0001` si non renseigne.
- Budget RH par projet avec devise.
- Cout mensuel impute par affectation avec pourcentage de temps.
- Page RH "Affectations projets" avec KPI multi-devise, listes projets/affectations et export CSV.
- Dossier employe 360 relie aux affectations projets.
- Relier les saisies de temps a `project_id` au lieu du libelle texte.
- Rapport analytique projet par mois, bailleur et departement.
- Comparaison budget RH vs cout reel par periode.

Reste:
- Optionnel: ventilation avancee par ligne budgetaire bailleur si un plan analytique detaille est ajoute plus tard.

## Stade 8 - Documents et signature

Objectif: automatiser les documents RH.

- Generation contrat, avenant, attestation, certificat, lettre disciplinaire.
- PDF.
- Signature electronique.
- Historique des versions.

Statut: a faire.

## Stade 9 - Recrutement

Objectif: gerer les candidats jusqu'a l'embauche.

- Candidats.
- CV et documents.
- Pipeline nouveau, entrevue, test, offre, accepte, embauche.
- Conversion candidat -> employe.

Statut: a faire.

## Stade 10 - IA RH

Objectif: assistant RH base sur les donnees structurees.

- Contrats a renouveler.
- Absents du jour.
- Preparation paie.
- Questions sur couts RH par projet.
- Generation de documents.

Statut: a faire apres structuration des donnees.
