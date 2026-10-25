# Registre des bugs

Bugs et anomalies constatés pendant l'usage réel ou la QA (prod et dev).
Pas de ticket Jira : ce fichier fait foi. Statuts : **Ouvert**, **Corrigé (version)**, **À vérifier**.

| # | Date | App | Où | Constat | Gravité | Statut |
|---|---|---|---|---|---|---|
| 1 | 2026-10-24 | BâtiPro | Bons de commande | Un BC mélangeant $ et FC s'enregistrait, puis le règlement échouait (400 « plusieurs devises »). | Majeur | Corrigé (3.245.3) : refus dès l'enregistrement avec un message clair |
| 2 | 2026-10-24 | BâtiPro | Bons de commande | Un BC dont toutes les lignes sont en FC affichait 0 $ et ne pouvait pas être réglé. | Majeur | Corrigé (3.245.3) : le BC prend la devise FC |
| 3 | 2026-10-24 | BâtiPro | Sous-traitants, situations, avenants | Enregistrement refusé (400 « currency_id must be an integer number ») dès qu'une devise est choisie. | Bloquant | Corrigé (3.245.3) |
| 4 | 2026-10-24 | BâtiPro | Toutes les erreurs API | Message d'erreur affiché en JSON brut tronqué, illisible. | Mineur | Corrigé (3.245.3) |
| 5 | 2026-10-24 | Toutes les apps | Affichage des montants | Les montants sont arrondis à l'unité (6,52 $ affiché 7 $, 60,53 $ affiché 61 $) dans BâtiPro, et aussi dans la compta du CRM, Domus, FarmOS, RH et Comptabilité. Règle : aucun montant arrondi. | Majeur | En cours : BâtiPro corrigé (non poussé), autres apps en correction |
| 20 | 2026-10-25 | Base de données | `backend2/src/database/schema.ts` | 60 colonnes d'argent sur 25 tables sont en `double` (virgule flottante) au lieu de `DECIMAL` exact, contraire au principe bancaire : paie RH, factures de vente et d'achat, `transaction.amount`, produits, devis et retours du CRM legacy, `manualPayment`. Les modules Domus, FarmOS et BâtiPro sont déjà en DECIMAL. En plus, `hr.service.ts` arrondit avec `Math.round(x*100)/100` (1,005 donne 1,00) et les totaux de facture sont cumulés en flottant. Plan en 5 lots (0322 à 0326) étudié le 2026-10-25. | Majeur | Ouvert (plan prêt, à valider) |
| 21 | 2026-10-25 | CRM (factures, PDF) | `numberToWords(Math.round(total))` dans Invoice/*, salePDF.js, purchasePDF.js | Le montant en lettres des factures est arrondi à l'unité (les centimes disparaissent du texte). | Moyen | Ouvert |
| 22 | 2026-10-25 | FarmOS | `farmos.service.ts` l.3501, 4203-4204, 4248-4249 | Pertes de mortalité, séries recettes/dépenses et marge par animal arrondies à l'unité côté serveur. | Moyen | Corrigé (non poussé) : arrondi au centime |
| 19 | 2026-10-25 | BâtiPro | `money()` | Devise par défaut « USD » codée en dur quand la devise est absente : un montant en FC peut s'afficher en $. | Moyen | Ouvert |
| 6 | 2026-10-24 | BâtiPro | BC, facture fournisseur avec photo | Le serveur répond 201 en 4 s mais l'interface n'affiche jamais « Facture fournisseur créée » et la requête reste « en attente » côté navigateur. | Moyen | À vérifier |
| 7 | 2026-10-24 | BâtiPro | Fiche sous-traitant | Pas de champ téléphone (numéro mis dans le nom en attendant). | Moyen | Ouvert (prévu Lot 2) |
| 8 | 2026-10-24 | BâtiPro | Sous-traitants | Honoraires en % des dépenses et avances datées impossibles (montant fixe seulement). | Moyen | Ouvert (prévu Lot 2) |
| 9 | 2026-10-24 | BâtiPro | Résumé budgétaire | Les montants en FC ne sont jamais convertis ni comptés dans le total en $ (aucun taux de change enregistré). | Moyen | Ouvert (prévu Lot 3) |
| 10 | 2026-10-25 | BâtiPro | Lignes de devis | Prix et quantités négatifs refusés : impossible de saisir une ligne d'ajustement ou de remise. | Mineur | Ouvert |
| 11 | 2026-10-25 | BâtiPro | Front, permissions | Les boutons d'action s'affichent sans vérifier les permissions (le backend bloque bien en 403). | Mineur | Ouvert |
| 12 | 2026-10-25 | BâtiPro | Portails publics (devis client, dépôt sous-traitant) | Liens cassés sur les sous-domaines Avelomi : nginx retire `/batipro`, la page tombe sur l'écran de connexion. | Moyen | Ouvert (corrigé pour le lien de suivi en 3.246.0) |
| 13 | 2026-10-25 | Infra | Serveur ongdngolu (442 Mo RAM) | Pendant un déploiement (dev ou prod), la prod répond « connexion refusée » ou 504 : les builds tournent sur la même machine que la prod. Enregistrements perdus ou incertains pendant ce temps. | Majeur | Ouvert |
| 14 | 2026-10-24 | Infra | Backend prod | `Redis connection error: getaddrinfo EAI_AGAIN redis` toutes les ~7 s dans les logs : le temps réel n'a pas de Redis joignable. | Moyen | Ouvert |
| 15 | 2026-10-23 | Domus | Dépenses | Créer une dépense n'envoie aucun SMS au propriétaire. | Moyen | Ouvert (étude faite) |
| 16 | 2026-10-23 | Domus | Dépenses | Supprimer une dépense ne contre-passe pas son écriture comptable. | Moyen | Ouvert |
| 17 | 2026-10-23 | Domus | Dépenses | Pas de catégorie « Honoraires juridiques », pas de rattachement à un bail, pas de refacturation au locataire. | Mineur | Ouvert (étude faite) |
| 18 | 2026-10-25 | Domus, BâtiPro | Session | Le formulaire de connexion prod est pré-rempli avec le compte demo (QA dev) : risque de saisir des données réelles sous ce compte. Probablement l'autocomplétion du navigateur de test, pas l'app. | Mineur | À vérifier |
