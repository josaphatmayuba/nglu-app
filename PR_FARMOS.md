# PR develop → master

Lien formulaire pré-rempli :
https://bitbucket.org/ngolu-ong-gestion/nglu-app/pull-requests/new?source=develop&dest=master

---

## Titre

FarmOS — dossier vétérinaire, délai de retrait, documents/PDF, rentabilité par animal/lot

---

## Description

## Contexte
Application du skill `farm_vet_design_skill` au module FarmOS : 4 features vét/ferme.

## Changements

### #1 Délai de retrait (withdrawal) — sécurité alimentaire
- Dénormalisation de `withdrawal_until`/`withdrawal_kind` sur l'animal, recalculé à chaque create/update/delete d'un traitement.
- Alertes « animaux sous délai de retrait » dans le dashboard.
- **Blocage de la vente** d'un animal encore sous délai viande.
- Aucune migration (colonnes déjà présentes).

### #2 Dossier vétérinaire complet — migration 0095
- Examen clinique enrichi (T°, poids, examen, diagnostic, protocole).
- Ordonnance multi-lignes (médicament/dose/fréquence/durée/voie + délais de retrait).
- Signature vétérinaire (canvas) qui verrouille le dossier en lecture seule.

### #3 Documents & rapports PDF — migration 0096
- Table `farmos_documents` : certificats, ordonnances, factures, analyses labo (upload/download).
- PDF dossier vétérinaire + PDF rentabilité, générés via Puppeteer (dépendance HR réutilisée — **aucune nouvelle dép npm**).

### #4 Rentabilité par animal / lot
- Endpoint `/profitability` (revenu − coût par animal, agrégat par lot, totaux).
- Section dédiée dans l'écran Finances + export PDF.
- Aucune migration (liens `animal_id`/`related_animal_id` déjà présents).

## Vérifications
- `tsc --noEmit` (backend2) ✅
- `vite build` (farmos-app) ✅
- Whitelist middleware : `/farmos` wildcard déjà présent → rien à ajouter.

## ⚠️ À surveiller au déploiement prod
- Migrations **0095** + **0096** appliquées au boot du backend (journal Drizzle à jour, idx 75/76).
- **Puppeteer prod** : nécessite Chromium + `PUPPETEER_EXECUTABLE_PATH` (OK si les PDF HR fonctionnent déjà).
- Inclut aussi le commit `chore(skills)` (sans impact runtime).
