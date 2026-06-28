# FarmOS Pro — Proposition de pricing (COMP-P2-021)

> **PROPOSITION a valider** — les montants ci-dessous sont des exemples de depart, pas des prix definitifs. A ajuster selon couts, marche cible (RDC/francophone) et concurrence. Les cases `[A VALIDER]` attendent ta decision.

- Date : **28 juin 2026** · Statut tache : **proposition (a valider)**
- Voir aussi : `FARMOS_COMPETITIVE_POSITIONING.md`, `FARMOS_COMPETITIVE_MATRIX.md`.

## Principe

- 3 packs simples (le client comprend en moins de 2 minutes).
- Prix justifie par le temps gagne (vs Excel/papier) et la tracabilite/finance.
- Devise affichee depuis la base (`currency`/`setting`) — ne pas coder de devise en dur cote app.
- Facturation **par ferme** (et non par animal) pour rester previsible pour l'eleveur.

## Packs proposes

| | **Starter** | **Pro** | **Organisation** |
|---|---|---|---|
| Cible | Petite ferme, 1 espece dominante | Ferme mixte, plusieurs especes | Coop / ONG / multi-sites |
| Especes | 1 a 2 | Toutes (9) | Toutes (9) |
| Animaux inclus | jusqu'a `[A VALIDER ~200]` | jusqu'a `[A VALIDER ~2000]` | illimite |
| Fermes | 1 | 1 | multi-fermes |
| Utilisateurs | `[A VALIDER ~2]` | `[A VALIDER ~10]` | illimite |
| Mobile + offline | OUI | OUI | OUI |
| Sante + retrait medicament | OUI | OUI | OUI |
| Reproduction / pesees | OUI | OUI | OUI |
| Finance & rentabilite par lot | basique | complete | complete + consolidation |
| Rapports export CSV/PDF | de base | + custom sauvegardes | + custom + consolides |
| Roles & permissions | non | oui | oui (fin) |
| Benchmarks internes | non | oui (intra-org) | oui |
| API partenaires | non | non | oui (a venir, P3-001) |
| Support | email | email prioritaire | dedie + accompagnement |
| **Prix indicatif / mois** | `[A VALIDER]` | `[A VALIDER]` | `[A VALIDER / sur devis]` |

> Repere marche (a verifier) : les concurrents anglophones se situent souvent autour de quelques dizaines a quelques centaines d'USD/mois par ferme selon la taille. Adapter au pouvoir d'achat de la cible francophone/RDC.

## Options

- **Accompagnement migration** (import Excel/concurrent + parametrage) : forfait unique `[A VALIDER]`.
- **Engagement annuel** : remise `[A VALIDER ~ -2 mois]` vs mensuel.
- **Tarif ONG / cooperative** : `[A VALIDER]` (mission sociale, volumes).

## Limites a rendre explicites (par pack)

- Nombre d'animaux, de fermes, d'utilisateurs.
- Acces API (Organisation uniquement).
- Niveau de support.

## A trancher par toi avant publication

1. Devise(s) de reference et grille par pays.
2. Montants des 3 packs + options.
3. Quotas (animaux / utilisateurs) reels par pack.
4. Modele de facturation (par ferme confirme ? par animal au-dela d'un seuil ?).
5. Politique ONG/coop.

## Criteres d'acceptation (COMP-P2-021)

- [ ] Montants valides par le proprietaire.
- [x] Offre comprehensible en moins de 2 minutes (3 packs, limites claires).
- [x] Limites par pack explicites.
- [x] Prix relie a la valeur (temps gagne, tracabilite, finance).
