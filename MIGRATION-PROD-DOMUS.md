# Migration PROD — derniers changements Domus (juin 2026)

Checklist **à exécuter dans l'ordre** avant/pendant le déploiement en production des
dernières fonctionnalités Domus (taxes, messages configurables, offline, FR/EN,
édition locataires, contrats, etc.).

> ⚠️ Ces changements ont été appliqués et validés en **dev** uniquement.
> Plusieurs étapes DB ont été faites **à la main** sur dev (pas de migration drizzle
> journal, pour éviter le crash-loop au boot). Elles **doivent être rejouées à la main
> sur prod**, sinon le backend plante (`Unknown column`) ou la taxe n'est pas comptabilisée.

---

## 0. Cibles prod (à confirmer)

| Élément | Valeur attendue |
|---|---|
| Répertoire prod | `/opt/nglu-app` |
| Compose project | `nglu_prod` (`docker-compose.prod.yml`, `.env.prod`) |
| Conteneur backend | `nglu_prod_backend2` |
| Conteneur MySQL prod | `nglu_mysql` (db `nglu_db`) — **PAS `nglu_dev_mysql`** |
| Dist Domus prod servi | `/opt/nglu-app/domus-app/dist` |
| Scripts | `scripts/deploy-prod-backend-aws.ps1`, `scripts/deploy-prod-aws.ps1` |

Confirmer le nom réel du conteneur/DB avant d'écrire :
```bash
docker ps --format '{{.Names}}' | grep -i mysql
docker exec nglu_mysql sh -c 'printenv | grep -iE "MYSQL_(DATABASE|USER)"'
```

---

## 1. Dépendances / build

- **Backend** : aucune nouvelle dépendance npm. `Dockerfile.prod` fait `npm ci` →
  `backend2/package.json` + `package-lock.json` inchangés, rien de spécial.
  (Rappel général : toute nouvelle dép backend doit shipper package*.json, cf.
  `project_prod_backend_deploy_deps`.)
- **Frontend Domus** : nouvelle dépendance **`react-phone-number-input`** (téléphone à
  drapeaux). Elle est **bundlée au build Vite** → présente dans le `dist`, aucun
  `node_modules` requis côté serveur. Construire le dist avant de déployer.

---

## 2. ⚠️ DB — colonnes taxe (OBLIGATOIRE avant que le backend serve les paiements)

Le boot prod lance `migrate.js` (dossier `./drizzle`). **Aucune migration journal**
n'a été créée pour ces colonnes → il faut les ajouter à la main.

Vérifier d'abord si déjà présentes :
```sql
SHOW COLUMNS FROM real_estate_leases LIKE 'tax%';
SHOW COLUMNS FROM real_estate_rent_payments LIKE 'tax%';
```

Si absentes, appliquer :
```sql
ALTER TABLE real_estate_leases
  ADD COLUMN tax_name VARCHAR(255) NULL,
  ADD COLUMN tax_type VARCHAR(20) NULL,
  ADD COLUMN tax_value DECIMAL(15,4) NULL,
  ADD COLUMN tax_apply_mode VARCHAR(20) NOT NULL DEFAULT 'never';

ALTER TABLE real_estate_rent_payments
  ADD COLUMN tax_amount DECIMAL(15,2) NULL,
  ADD COLUMN tax_name VARCHAR(255) NULL;
```

Exécution (exemple) :
```bash
# écrire le SQL ci-dessus dans /tmp/tax.sql sur le serveur prod, puis :
docker cp /tmp/tax.sql nglu_mysql:/tmp/tax.sql
docker exec nglu_mysql sh -c 'mysql -uroot -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE < /tmp/tax.sql'
```

> Sans ces colonnes, `createPayment` et la liste des baux renvoient 500 (`Unknown column`).

---

## 3. DB — type comptable « Real Estate Tax » (pour que la taxe soit comptabilisée)

Le service a un **fallback gracieux** : si le type manque, la part de taxe est quand même
enregistrée sur le paiement, mais **aucune écriture comptable** n'est créée. Pour activer
la compta, créer le sous-compte `Tax` + le type `Real Estate Tax`
(débit Rental Revenue → crédit Tax). Le seeder `property-accounting.seeder.ts` le fait
mais **n'est pas branché au boot**.

```sql
INSERT INTO subAccount (name, accountId, status, created_at, updated_at)
SELECT 'Rental Revenue',5,'true',NOW(),NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM subAccount WHERE name='Rental Revenue') t);

INSERT INTO subAccount (name, accountId, status, created_at, updated_at)
SELECT 'Tax',2,'true',NOW(),NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM subAccount WHERE name='Tax') t);

INSERT INTO transaction_types (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'Real Estate Tax',
 (SELECT id FROM subAccount WHERE name='Rental Revenue' LIMIT 1),
 (SELECT id FROM subAccount WHERE name='Tax' LIMIT 1),
 'Tax portion included in rent', 1, NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM transaction_types WHERE name='Real Estate Tax') t);

SELECT id, name, debit_account_id, credit_account_id FROM transaction_types WHERE name='Real Estate Tax';
```
(`accountId` 5 = Revenue, 2 = Liability, d'après `accounts.seeder.ts`.)

---

## 4. DB — table `email_templates` (messages configurables)

La feature « Messages & notifications » (Réglages) et le rappel de paiement câblé
utilisent la table `email_templates` (migration drizzle SCRUM-146). Vérifier qu'elle
existe en prod (normalement déjà migrée) :
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'email_templates';
```
Si `0`, déclencher les migrations drizzle (boot backend) ou créer la table via la
migration correspondante. Aucune donnée requise : les messages sont optionnels
(fallback sur les textes par défaut).

---

## 5. Déploiement backend prod

```powershell
scripts\deploy-prod-backend-aws.ps1
```
Le script sauvegarde la DB puis rebuild l'image et redémarre `nglu_prod_backend2`
(le boot lance `migrate.js`). **Faire l'étape §2 avant**, ou juste après mais **avant
tout paiement/édition de bail**.

Changements backend inclus : `PUT tenants/:id` (édition locataire), champs locataire
optionnels (origin_province, entity_address, hiring_date), taxe par bail
(DTO + service + calcul + compta), rappel de paiement utilisant le template configuré.

Vérifier :
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<DOMAINE_PROD>/api/health         # 200
curl -s -o /dev/null -w "%{http_code}\n" -X PUT https://<DOMAINE_PROD>/api/property-management/tenants/1 -d '{}' -H 'Content-Type: application/json'  # 401 = route présente
```

---

## 6. Déploiement frontend Domus prod

1. Builder le dist (le `sw.js`/`workbox` PWA doivent être dans l'archive — piège OneDrive,
   cf. `project_deploy_onedrive_sw_desync` : **build + tar dans la même commande**) :
   ```bash
   cd domus-app && npx vite build
   cd .. && tar -czf /tmp/nglu-domus.tgz domus-app/dist
   tar -tzf /tmp/nglu-domus.tgz | grep -E 'sw\.js|workbox|index\.html'   # doit lister sw.js + workbox + index.html
   ```
2. Pousser et extraire dans `/opt/nglu-app/domus-app/dist` (chemin servi par
   `nglu_prod_frontend` sous le domaine prod). Après extraction via `sudo tar`,
   **rendre lisible par nginx** :
   ```bash
   sudo chown -R admin:admin domus-app/dist
   sudo chmod -R a+rX domus-app/dist
   ```
3. Vérifier les content-types (le SW NE doit PAS être servi en HTML) :
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://<DOMAINE_PROD>/domus/sw.js   # 200 application/javascript
   ```

> Il n'existe pas (encore) de `deploy-prod-domus-aws.ps1` ; suivre le même schéma que
> `deploy-dev-domus-aws.ps1` mais avec le répertoire `/opt/nglu-app`.

---

## 7. Post-déploiement

- **Service worker PWA** : prévenir de faire **Ctrl+Shift+R** (ou Application → Service
  Workers → Unregister). L'offline-lecture nécessite un 1er chargement en ligne.
- **Offline écriture** : la file d'attente (`outbox`) est purement locale (localStorage),
  rien à migrer.
- **i18n FR/EN** : aucune donnée serveur ; la préférence est en localStorage.

---

## 8. Récap des features de ce lot

Locataires (édition/suppression `PUT tenants/:id`, 3 champs retirés, 9 statuts pro, lien
d'inscription, tiroir détail) · Baux (statut contrat réel + génération) · Contrats (modal,
texte lisible, date de signature locataire) · Modèles de contrat éditables + aperçu HTML ·
Offline lecture + écriture · **Taxe par bail** (incluse/informative + comptabilisée) ·
Téléphone international à drapeaux · Nom du locataire sur les cartes Biens · **Messages
configurables** (Réglages + rappel câblé) · **FR/EN** (shell traduit) · **Page d'onboarding
publique propre à Domus** (URL propre `/domus/onboarding/tenant?token=…`, servie par le
fallback SPA nginx `@*_domus_spa`, habillage Domus) — réutilise les endpoints publics
existants `/tenant-onboarding` (GET/save/submit), donc **frontend Domus uniquement, aucune
DB ni backend** ; le lien partagé dans Locataires est réécrit vers Domus au lieu du CRM
(`domusOnboardingUrl` dans `api.js`).

Étapes DB strictement obligatoires pour prod : **§2** (sinon crash). §3/§4 recommandées
(sinon dégradation gracieuse).

---

## 9. Autres apps du même lot non poussé (à déployer aussi en prod)

La branche `develop` est **9 commits en avance sur `origin/develop`**. En plus de Domus,
ce lot contient **FarmOS** et le **frontend CRM**. Vérifier : `git log --oneline origin/develop..HEAD`.

> ✅ Aucune de ces apps n'ajoute de changement de schéma DB : la **seule** modif de
> `schema.ts` vs origin = les colonnes taxe (§2). Aucune migration `00xx`/`_journal.json`
> ajoutée. Les `.sql` sous `backend2/drizzle/_dev_seed/` sont **dev-only** (pas prod).

### 9a. FarmOS (`farmos-app`)
Commits `c24f4f8a` → `689bb4f8` (+ branding). Changements : **nouveau logo/branding**
(`farmos-app/public/*` + `farmos-app/src/icons.jsx`), corrections d'écrans
(`api.js`, `quickentry.jsx`, `screens.jsx`, `shell.jsx`). **Frontend uniquement, pas de DB.**

- Builder + déployer le dist vers le chemin prod FarmOS (même schéma que `deploy-dev-farmos-aws.ps1`,
  mais répertoire `/opt/nglu-app`). Appliquer le **piège sw.js** (build+tar groupés) et le
  `chown/chmod a+rX` après extraction.
- Vérifier `https://<DOMAINE_PROD>/farmos/sw.js` → `200 application/javascript`.

### 9b. Frontend CRM (`frontend`)
Commit `689bb4f8` « shared Domus login ». Changements : `components/user/Login.jsx`,
`layouts/AdminLayout.jsx`, `layouts/PrivateRoute.jsx`, `utils/authSession.js`
(session partagée CRM ↔ Domus ↔ FarmOS). **Frontend uniquement, pas de DB.**

- Builder + déployer le dist CRM vers le chemin prod (`/opt/nglu-app/frontend/dist`).
- Tester la connexion sur `/admin` et que la session reste valide en passant sur `/domus` et `/farmos`.

### 9c. Backend2
Les seules modifs backend non poussées sont **property-management** (Domus) : DTO,
controller, service. **Aucune** modif backend FarmOS dans ce lot → le déploiement backend
du §5 suffit pour tout.

---

## 10. Nettoyage avant push

- **`Userspaulnjira.json`** (racine) : export de réponse Jira commité par accident
  (14 Ko, pas de secret). À retirer du repo : `git rm Userspaulnjira.json` puis l'ajouter
  à `.gitignore`.
- Penser à `git push origin develop` une fois prod validé (9 commits locaux), ou suivre le
  déploiement AWS manuel direct (pipelines épuisés).

---

## Récap « ce qui doit toucher la prod »

| Cible | Action | DB ? |
|---|---|---|
| **DB prod** | ALTER colonnes taxe (§2) **obligatoire** ; type compta + accounts (§3) ; vérif `email_templates` (§4) | ✅ |
| **Backend2** | `deploy-prod-backend-aws.ps1` (couvre Domus + rien de neuf côté FarmOS) | — |
| **Domus dist** | build + push vers `/opt/nglu-app/domus-app/dist` (§6) | — |
| **FarmOS dist** | build + push vers chemin prod FarmOS (§9a) | — |
| **Frontend CRM dist** | build + push vers `/opt/nglu-app/frontend/dist` (§9b) | — |
| **Repo** | retirer `Userspaulnjira.json`, push (§10) | — |
