# FarmOS Pro — Matrice concurrentielle (COMP-P0-003)

Livrable de la tache **COMP-P0-003**. A mettre a jour tous les 3 mois.

- Derniere mise a jour : **28 juin 2026**
- Prochaine revue prevue : **28 septembre 2026**
- Voir aussi : `FARMOS_COMPETITIVE_TASK_BACKLOG.md` (taches), `FARMOS_COMPETITIVE_GAPS_ROADMAP.md` (strategie).

## Legende

- `OUI` = couvert / disponible.
- `PARTIEL` = couvert en partie ou en v1 simplifiee.
- `NON` = absent.
- `?` = non confirme publiquement.
- Colonne **FarmOS Pro** = etat reel au 28 juin 2026 dans `farmos-app` + `backend2`.

## Concurrents suivis (12)

| # | Concurrent | Segment | Cible |
|---|---|---|---|
| 1 | Herdwatch | Multi-especes simple | Eleveurs mobiles, tracabilite |
| 2 | Farmbrite | Multi-especes + ferme diversifiee | Petites fermes, gestion globale |
| 3 | AgriWebb | Ranch / paturage | Elevage extensif, lots/mobs |
| 4 | CattleMax | Bovin / cow-calf | Troupeaux bovins structures |
| 5 | DairyComp (VAS) | Laitier | Fermes laitieres moyennes/grandes |
| 6 | BoviSync | Laitier | Fermes laitieres, reporting avance |
| 7 | PigCHAMP | Porcin | Naisseurs-engraisseurs |
| 8 | PoultryPlan | Volaille | Bandes chair/ponte |
| 9 | PoultryCare | Volaille | Fermes avicoles |
| 10 | Excel / cahier papier | Generique | Tout eleveur non equipe |
| 11 | Boviclic / outils locaux FR | Local francophone | Eleveurs francophones |
| 12 | FarmKeep / petits outils | Multi-especes leger | Petites exploitations |

## Matrice fonctionnelle (28 criteres)

Pour chaque critere : etat des concurrents (synthese), puis **etat reel FarmOS Pro** et la **reponse** (avantage / a faire).

| # | Critere | Herdwatch | Farmbrite | AgriWebb | CattleMax | DairyComp | PigCHAMP | PoultryPlan | Excel | FarmOS Pro | Reponse FarmOS Pro |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | App mobile | OUI | OUI | OUI | PARTIEL | PARTIEL | PARTIEL | PARTIEL | NON | OUI | PWA + Capacitor, meme code web/mobile |
| 2 | Mode offline / outbox | OUI | PARTIEL | OUI | NON | NON | PARTIEL | NON | NON | OUI | offline-db + outbox + indicateurs sync |
| 3 | Multi-especes | PARTIEL | OUI | PARTIEL | NON | NON | NON | NON | OUI | OUI | 9 especes dans un seul outil |
| 4 | Fiche animal complete | OUI | OUI | OUI | OUI | OUI | OUI | PARTIEL | NON | OUI | 9 onglets (sante/repro/prod/poids/finance/docs/historique) |
| 5 | Import CSV/Excel animaux | PARTIEL | OUI | OUI | OUI | ? | ? | ? | OUI | OUI | Import + dryRun + dedup external_id (P1-001) |
| 6 | Saisie rapide terrain | OUI | PARTIEL | OUI | PARTIEL | OUI | OUI | PARTIEL | NON | OUI | quickentry + offline (< 20 s) |
| 7 | Lots / groupes / bandes | OUI | OUI | OUI | OUI | OUI | OUI | OUI | PARTIEL | OUI | lot/box/batiment + effectif |
| 8 | Calendrier & rappels | OUI | OUI | OUI | PARTIEL | OUI | PARTIEL | PARTIEL | NON | OUI | Vaccins/retrait/repro + retards (P1-005) |
| 9 | Sante & traitements | OUI | OUI | OUI | OUI | OUI | OUI | OUI | NON | OUI | Medicaments stock + protocoles |
| 10 | Retrait medicament + blocage vente | OUI | PARTIEL | PARTIEL | NON | OUI | PARTIEL | PARTIEL | NON | OUI | Calcul retrait + blocage vente bloquant |
| 11 | Reproduction | OUI | OUI | OUI | OUI | OUI | OUI | PARTIEL | NON | OUI | Saillie/IA + gestation + livre de velage (P2-001) |
| 12 | Indicateurs portee (porc) | NON | NON | NON | NON | NON | OUI | NON | NON | OUI | Nes vivants/mort-nes/momifies/sevres (P2-007) |
| 13 | Production lait | PARTIEL | PARTIEL | NON | NON | OUI | NON | NON | NON | OUI | KPI + courbe + alerte baisse (P2-004) |
| 14 | Production oeufs / volaille | PARTIEL | PARTIEL | NON | NON | NON | NON | OUI | NON | OUI | egg_sales/egg_stock + bandes |
| 15 | Pesees + courbe poids/GMQ | OUI | OUI | OUI | OUI | OUI | OUI | PARTIEL | NON | OUI | Pesees + import CSV balance (P2-014) |
| 16 | Mortalite par cause | OUI | OUI | OUI | OUI | OUI | OUI | OUI | NON | OUI | Stats par cause + rapport |
| 17 | Finance liee aux animaux/lots | PARTIEL | OUI | PARTIEL | OUI | PARTIEL | OUI | PARTIEL | NON | OUI | Rentabilite par animal/lot (ledger) |
| 18 | Perf / marge par lot ou cohorte | PARTIEL | PARTIEL | OUI | OUI | OUI | OUI | OUI | NON | OUI | Export perf par lot (P2-008) |
| 19 | Carte / zones / batiments | PARTIEL | PARTIEL | OUI | PARTIEL | NON | PARTIEL | NON | NON | OUI | Ferme>Zone>Batiment + plan 2D |
| 20 | Notes terrain geolocalisees | PARTIEL | NON | OUI | NON | NON | NON | NON | NON | OUI | Notes GPS + lien carte (P1-009) |
| 21 | Taches d'equipe & statuts | PARTIEL | OUI | OUI | NON | OUI | NON | NON | NON | OUI | Taches assignees + statuts (P1-010) |
| 22 | Rapports export PDF/CSV | OUI | OUI | OUI | OUI | OUI | OUI | OUI | PARTIEL | OUI | PDF + exports CSV filtres (P1-007) |
| 23 | Rapports custom sauvegardes | PARTIEL | OUI | PARTIEL | OUI | OUI | OUI | PARTIEL | NON | OUI | Sauvegarde/rejeu (P2-017) |
| 24 | Benchmarks | PARTIEL | PARTIEL | OUI | PARTIEL | OUI | OUI | OUI | NON | PARTIEL | Intra-org (quartiles internes) — cross-org plus tard (P2-016) |
| 25 | Multi-fermes / multi-sites | PARTIEL | PARTIEL | OUI | PARTIEL | OUI | PARTIEL | PARTIEL | NON | OUI | Comparaison fermes (P2-018) |
| 26 | Roles & permissions | OUI | OUI | OUI | PARTIEL | OUI | OUI | PARTIEL | NON | OUI | Permissions par action (RBAC CRM) |
| 27 | RFID / QR / scan | PARTIEL | OUI | OUI | OUI | PARTIEL | OUI | NON | NON | OUI | QR + scan zxing + NFC + reco faciale |
| 28 | Francophonie / support local | NON | NON | NON | NON | NON | NON | NON | OUI | OUI | UI FR/EN native + RDC (+243, devise DB) |

## Synthese des avantages FarmOS Pro

- **Mobile + offline + multi-especes + finance + francophonie** dans un seul outil — aucun concurrent ne couvre les cinq a la fois.
- **Tracabilite securite alimentaire** : retrait medicament avec blocage de vente bloquant (rare chez les outils simples).
- **Indicateurs porcins** (portee) et **alerte baisse de production lait** : au niveau des outils specialises, mais integres.
- **Import/export** complets (animaux, pesees) avec dryRun et dedup : reduit la friction de migration depuis Excel/concurrents.

## Gaps restants vs concurrents (a transformer en taches)

- **Benchmarks cross-organisations** (vs P2-016 intra-org) : necessite anonymisation + opt-in + isolation multi-tenant. A cadrer.
- **Integrations hardware** (balances connectees temps reel, automates laitiers) : import CSV fait, connexion directe non.
- **API partenaires** (coops/vetos/feed mills) : COMP-P3-001, non commence.
- **Commercialisation** : pack demo, pricing, pilotes, partenariats (taches business du backlog).

## Methode de mise a jour (tous les 3 mois)

1. Revisiter les sites des 12 concurrents (section Sources du backlog).
2. Mettre a jour les colonnes concurrents (OUI/PARTIEL/NON/?).
3. Mettre a jour la colonne FarmOS Pro selon les livraisons de la periode.
4. Convertir chaque nouveau gap en tache `COMP-*` dans le backlog.
5. Mettre a jour la date de revue en tete de ce fichier.
