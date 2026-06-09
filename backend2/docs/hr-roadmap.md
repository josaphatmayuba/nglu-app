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

Statut: termine.

Fait:
- Generation automatique d'un bulletin depuis le contrat actif + presences + conges du mois (API GET hr/payrolls/generate).
- Workflow draft -> validated -> paid avec verrouillage du bulletin paye.
- API hr/payrolls/summary pour KPIs globaux (brut total, net, workflow draft/valide/paye).
- Calcul serveur: jours travailles, conges payes, absences non payees, heures supplementaires depuis presences.
- Filtres par periode, employe et devise dans la page Paie.
- Actions en ligne: Valider et Marquer paye directement depuis la table.
- Export CSV enrichi avec jours travailles, absences, impots, CNSS.

Reste:
- Regles CNSS/IPR parametrees par pays (taux configurables).
- Generation PDF fiche de paie.
- Verrouillage et validation workflow RH (approbation superieur avant paiement).

## Stade 5 - Presence

Objectif: relier le temps travaille a l'employe et a la paie.

- Pointage manuel d'abord.
- Historique entree, pause, retour, sortie.
- Retard, absence, heures supplementaires.
- QR/GPS ensuite.
- Biometrie seulement apres analyse legale et securite.

Statut: termine.

Fait:
- Table `hr_attendances` pour pointage manuel.
- API `hr/attendances` avec creation, liste, mise a jour, suppression.
- API `hr/attendances/summary` pour totaux presence, retard, absence et heures supplementaires.
- Calcul serveur des heures travaillees avec pause, retard selon horaire, absence et heures sup.
- Page `Presences & pointage` connectee a la base avec KPIs, table et export CSV.

Reste:
- QR/GPS en phase suivante.
- Biometrie uniquement apres analyse legale et securite.

## Stade 6 - Conges avec workflow

Objectif: conges connectes aux soldes, presence et paie.

- Types de conges.
- Soldes par employe.
- Workflow employe -> chef -> RH -> approuve.
- Impact presence et paie.

Statut: termine.

Fait:
- Workflow `pending -> manager_approved -> approved` avec rejet possible.
- Champs DB/API pour responsable, commentaires chef/RH, dates de decision et decideur.
- Calcul serveur des jours demandes, droits annuels, solde avant et solde apres approbation.
- API `hr/leave-requests/summary` pour les soldes par employe et indicateurs workflow.
- Impact presence: une demande approuvee genere des lignes `hr_attendances` liees par `leaveRequestId`.
- Page `Conges & absences` avec KPIs workflow, decisions chef/RH, absents aujourd'hui et soldes par employe.

Reste:
- Parametrage fin des droits par pays/contrat/type de conge.
- Jours feries locaux et demi-jour.
- Verrouillage paie mensuelle une fois les conges importes.

## Stade 7 - Affectations projets

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
- Code projet automatique `PRJ-YYYY-0001` si non renseigne.
- Budget RH par projet avec devise.
- Cout mensuel impute par affectation avec pourcentage de temps.
- Page RH "Affectations projets" avec KPI multi-devise, listes projets/affectations et export CSV.
- Dossier employe 360 relie aux affectations projets.
- Relier les saisies de temps a `project_id` au lieu du libelle texte.
- Rapport analytique projet par mois et departement.
- Comparaison budget RH vs cout reel par periode.

Reste:
- Optionnel: ventilation avancee par ligne budgetaire si un plan analytique detaille est ajoute plus tard.

## Stade 8 - Documents et signature

Objectif: automatiser les documents RH.

- Generation contrat, avenant, attestation, certificat, lettre disciplinaire.
- PDF.
- Signature electronique.
- Historique des versions.

Statut: termine.

Fait:
- Migration 0083: colonnes templateType, version, generatedAt, generatedBy, content, signedAt, signedBy sur hr_documents.
- API POST hr/documents/generate: genere un document HTML depuis template (contrat, avenant, attestation, certificat, lettre disciplinaire, autorisation de conge) en lisant le contrat actif de l'employe.
- API POST hr/documents/:id/sign: marque le document comme signe avec nom et date.
- API GET hr/documents/summary: KPIs (total, generes, signes, en attente, par type).
- Versioning automatique par employe et type de template.
- Page Documents enrichie: generation depuis template avec formulaire, table avec filtre, badge "Genere", colonne version et signataire.
- Apercu HTML inline avec bouton Imprimer/PDF (impression navigateur ou sauvegarde PDF).
- Modal de signature avec nom du signataire.
- Dossier 360 employe: panneau "Documents signes" relie.

Reste:
- Generation PDF serveur (puppeteer ou wkhtmltopdf si installe en prod).
- Signature electronique avec certificat numerique.
- Workflow de validation avant signature (approbation RH).

## Stade 9 - Recrutement

Objectif: gerer les candidats jusqu'a l'embauche.

- Candidats.
- CV et documents.
- Pipeline nouveau, entrevue, test, offre, accepte, embauche.
- Conversion candidat -> employe.

Statut: termine.

Fait:
- Migration 0084: table hr_candidates avec profil complet (identite, profil pro, candidature, calendrier).
- Pipeline 7 etapes: nouveau, entrevue, test, offre, accepte, embauche, rejete.
- API GET hr/candidates/summary: KPIs pipeline (nb par etape, en cours, convertis, avec entretien).
- API CRUD hr/candidates: creation, liste, mise a jour, suppression.
- API POST hr/candidates/:id/convert: conversion automatique candidat -> employe (creation compte utilisateur, matricule EMP-YYYY-0001, mot de passe hache).
- Page Recrutement reecrite: KPIs pipeline, mini-kanban par etape, tableau des candidats avec filtres, deplacement d'etape inline, modal conversion avec choix role/departement/date d'entree.
- Postes ouverts (hr_recruitment_offers actifs) affiches en bandeau.
- Dossier employe 360: panneau "Dossier de candidature" affiche si l'employe a ete converti depuis un candidat (poste anterieur, experience, entretien, competences).

Reste:
- Upload CV et documents joints (stockage central).
- Email automatique au candidat a chaque changement d'etape.
- Score d'evaluation candidat avec grille de criteres.

## Stade 10 - IA RH

Objectif: assistant RH base sur les donnees structurees.

- Contrats a renouveler.
- Absents du jour.
- Preparation paie.
- Questions sur couts RH par projet.
- Generation de documents.

Statut: termine.

Fait:
- API GET hr/ai/context: aggrege en temps reel contrats expirant sous 30 j, absents du jour, timesheets manquants de la semaine, bulletins de paie en brouillon du mois, candidats en attente dans le pipeline.
- Calcul de severite par alerte (high/medium/low) selon seuils relatifs a l'effectif.
- Widget IA RH (FAB + panneau chat + onglet Alertes) branche sur les donnees reelles au demarrage.
- Recommandations generees dynamiquement depuis les alertes vives (aucune donnee hardcodee).
- Reponses chat contextualisees : chaque mot-cle (contrat, absent, timesheet, paie, candidat) donne une reponse construite depuis les chiffres reels.
- Salutation adaptee : nb d'alertes detectees + nb d'employes actifs du jour.
- Degradation propre si l'API est indisponible : widget reste fonctionnel avec reponses generiques.

Reste:
- Branchement LLM (Claude API) via proxy backend pour reponses en langage naturel illimite.
- Questions sur couts RH par projet (necessiterait agregation hr_project_assignments + hr_payrolls).
- Generation de documents depuis le chat (appel interne a POST hr/documents/generate).
