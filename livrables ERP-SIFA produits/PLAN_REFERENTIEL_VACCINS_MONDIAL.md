# Référentiel mondial de vaccins animaux — Plan d'implantation (intégré nglu-app)

> Évolution de `farmos_vaccines` (table plate, MVP 3.47.0) vers un **référentiel de données maître** normalisé, multi-région, à protocoles requêtables. Transposé du modèle SQL Server vers **MySQL/Drizzle** (backend2).

## Objectif
Consolider (1) homologations réglementaires (ACIA/Santé Canada, EMA-UPD…) et (2) directives cliniques (WSAVA animaux de compagnie, WOAH/OMSA animaux de rente) pour répondre : *quels vaccins sont disponibles, leur composition, et les protocoles exacts selon espèce / âge / région*.

## Modèle (3NF) — 3 blocs

### A. Référentiels universels
- `vx_species` (taxon, noms FR/EN, catégorie) — UNIQUE scientific_name
- `vx_pathogens` (maladie cible, type, zoonose, code OMSA)
- `vx_regions` (ISO2, organisme réglementaire, hiérarchie parent — UE→pays)
- `vx_manufacturers`
- `vx_antigens` (souche + forme : vivant/inactivé/recombinant/anatoxine) → FK pathogen

### B. Produit + composition (N-N)
- `vx_vaccines` (produit, fabricant, nature mono/poly, forme, plage de conservation)
- `vx_vaccine_antigens` (N antigènes/vaccin + titre)
- `vx_vaccine_species` (espèces cibles)

### C. Homologation régionale + protocoles
- `vx_registrations` (vaccin × région : n° AMM, statut, dates, source) — c'est ICI que vivent le n° d'homologation et le statut
- `vx_withdrawal_periods` (délai retrait par registration + denrée viande/lait/œufs) — dépend de la RÉGION
- `vx_protocols` (vaccin × espèce, source guideline WSAVA/WOAH, core/non-core)
- `vx_protocol_steps` (étapes ordonnées : âge min/max, intervalle, dose, voie)
- `vx_conditions` + `vx_protocol_step_conditions` : règles asymétriques data-driven (ex: rappel S12 uniquement si zone haut risque). Évaluation contre un contexte animal {espèce, âge, zone, type prod, gestation}.

## Sources mondiales — investigation (juin 2026)

| Source | Données | Format / accès | Fréquence | Verdict |
|--------|---------|----------------|-----------|---------|
| **ACIA/CFIA (Canada)** — Veterinary biologics licensed in Canada | Produits biologiques vét. licenciés (nom, fabricant, espèces, statut) | **CSV + XML téléchargeables** + filtres espèce/fabricant. `apps.inspection.canada.ca/webapps/veterinary-biologics-product-list/` | **Mensuelle** | ✅ **Source pilote idéale** (open data, format simple, cadence mensuelle alignée sur notre CRON) |
| **EMA — Union Product Database (UPD)** | Médicaments vét. autorisés UE/EEE + disponibilité par pays | **API** (données non-confidentielles publiques) + site web. UPD officielle EMA | maj fréquente | ✅ API exploitable (mapping plus riche, multi-pays UE) |
| **WOAH/OMSA — Terrestrial Manual + Code** | Standards vaccins + chapitres maladies (protocoles, contrôle) | PDF (EN/FR/ES), 12e éd. 2023 | par édition | 🟡 Texte/PDF → parsing manuel ou semi-auto ; alimente `vx_protocols` |
| **WSAVA** | Guidelines vaccination animaux de compagnie (core/non-core) | PDF / guidelines | par édition | 🟡 PDF → extraction manuelle des protocoles compagnie |

**Stratégie retenue** : commencer par **ACIA (CSV mensuel)** comme connecteur pilote du CRON, puis **EMA-UPD (API)**. WOAH/WSAVA = ingestion semi-manuelle des protocoles (PDF) car pas de flux structuré.

## ETL (ingestion multi-source)
- Zones RAW (fichiers bruts horodatés) → STAGING (miroir NVARCHAR + hash ligne) → CORE (MERGE/upsert idempotent).
- Normalisation via `vx_synonym_map` (EntityType, RawValue, SourceSystem → CanonicalId, confidence) ; non-mappé → file de validation humaine (jamais poussé auto en CORE).
- Idempotence par hash de ligne ; traçabilité LoadBatchId + source_system par registration.

## Intégration nglu-app
- `farmos_vaccines` (table plate existante) → devient une **projection/cache** filtrée par la région de la ferme ; l'UI sélecteur (3.47.0) pointera sur l'API référentiel.
- Préfixe tables `vx_` ; migrations Drizzle dans le journal (auto au boot).
- Permissions sous le périmètre farmos (lecture) ; écriture/admin référentiel = rôle dédié.

## Phasage
1. **Socle référentiel** (A+B) : tables + CRUD lecture + reprise du seed 25 vaccins vers le modèle normalisé.
2. **Homologations** (C-registrations + withdrawal) multi-région.
3. **Protocoles + moteur de règles** (steps + conditions + évaluation contexte animal).
4. **ETL** d'une 1ère source réelle (ACIA .txt) + synonymes.
5. Rebranchement UI + dépréciation seed manuel.
