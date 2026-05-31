# FarmOS Dev Seed

Données de démonstration pour le module FarmOS, **uniquement** appliquées sur l'environnement de dev (`nglu_db_dev`).

Ces fichiers ne sont pas listés dans `drizzle/meta/_journal.json` et donc **ne sont pas auto-exécutés** par `npm run db:migrate`. Ils doivent être appliqués manuellement.

## Application

```bash
# Sur le serveur dev (Lightsail)
ssh ... admin@dev-host
cd /opt/nglu-app-dev
. ./.env.dev
docker cp backend2/drizzle/_dev_seed/01_farmos_animals_etc.sql nglu_dev_mysql:/tmp/seed.sql
docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" nglu_dev_mysql sh -c "mysql -uroot $DB_DATABASE < /tmp/seed.sql"
# Idem pour 02_vaccinations_ai.sql
```

## Fichiers

| Fichier | Contenu |
|---|---|
| `01_farmos_animals_etc.sql` | 15 animaux, 10 médicaments, 5 traitements, 3 events repro, 5 ventes, 6 dépenses (ex-mockup data.jsx) |
| `02_vaccinations_ai.sql` | 10 vaccinations + 4 AI insights (ex-mockup data.jsx) |
| `03_lookups.sql` | Pré-remplissage `farmos_lookups` : races, types porc, vétos, voies d'administration, causes mortalité (ex-mockup quickentry.jsx). Prod = vide; l'utilisateur ajoute via le bouton **+ Ajouter**. |
| `04_production_logs.sql` | 365 jours de production (lait AM+PM, œufs quotidiens, poids porc hebdo, tontes mouton). Remplit le graphique Production du dashboard pour les 4 périodes (7j/30j/trimestre/année). `DELETE` puis ré-insère : idempotent. |
| `05_farmos_staff.sql` | Département CRM « FarmOS », 4 désignations (Vétérinaire, Gérant ferme, Technicien agricole, Éleveur), 5 employés démo rattachés au département. Vu dans l'écran **Équipe** de FarmOS et dans le module RH du CRM. Idempotent (INSERT si non existant). |
| `06_alerts.sql` | Déclenche 13 alertes : 4 stocks faibles (2 critical), 4 délais de retrait actifs (lait/viande/œufs), 5 gestations en cours dont 4 imminentes, + 4 animaux marqués `sick`. Visibles dans l'écran **Alertes** (avec les filtres Critique/Élevée/Moyenne/Retrait) et dans la bannière dashboard. |
| `07_suppliers_and_vet_tremblay.sql` | Promeut les noms écrits en dur dans `farmos_medicines.supplier` / `farmos_expenses.supplier` vers la vraie table CRM `supplier` (9 fournisseurs : Coop Agri-Pro, Meunerie Tremblay, Skretting, Ferme Lapierre, Vétoquinol, Elanco, Boehringer Ingelheim, MSD Santé Animale, Aquatech). Ajoute aussi le vétérinaire **Dr. Anne Tremblay** dans `users` (les autres vétos Boucher/Lavoie sont déjà dans `05`). Idempotent. |
| `08_semen_straws.sql` | Banque de semence : 14 paillettes IA couvrant les 4 espèces (cow/pig/goat/sheep) — taureaux Holstein/Jersey/Angus/Hereford, verrats Duroc/Landrace/Yorkshire/Pietrain, boucs Alpine/Saanen/Boer, béliers Suffolk/Mérinos/Dorper. Rattachées aux fournisseurs créés par `07`, avec traits génétiques en JSON (motilité, lait, longévité…). Pré-requis: `07` appliqué (FK supplier_id). Idempotent. |

## Prod

**Ne JAMAIS appliquer en prod.** La prod doit démarrer vide avec uniquement les tables et le catalogue global des maladies (`farmos_diseases` avec `organization_id = NULL`).
