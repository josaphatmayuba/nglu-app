# Plan — Module documentaire BâtiPro (devis → BC → situations → factures)

## Contexte / pourquoi

BâtiPro doit devenir un outil de gestion de projet immobilier **où le gestionnaire saisit
l'avancement du chantier et génère les documents contractuels** (devis, bons de commande,
situations de travaux, factures), **et où le client reçoit/suit ces documents**. Aujourd'hui
BâtiPro gère chantiers, phases, situations et avenants, mais pas la chaîne documentaire complète
ni l'accès client.

**Décisions cadrées avec l'utilisateur :**
- Cycle BTP complet : **devis → bons de commande → situations de travaux → factures**.
- **Greffé sur les chantiers existants** (`batipro_projects`), pas un module isolé.
- **Factures branchées sur la compta existante** (ledger `postByRules`, une facture = une écriture).
- **Accès client double** : espace connecté (rôle restreint) **+** lien sans compte (token signé).
- **Format document = HTML + impression navigateur** (pas de PDF serveur — cohérent HR/contrats).
- **Phase 1 = le devis** (entrée de la chaîne, le plus visible pour le client).

**Ajout prioritaire — Portail sous-traitant (soumission entrante sans compte) :**
- Les sous-traitants **n'ont pas de compte**. Le gestionnaire leur partage un **lien sécurisé** pour
  qu'ils **soumettent eux-mêmes** leurs devis/factures sur un chantier.
- Le sous-traitant **uploade son document (PDF) ET remplit un formulaire structuré** (lignes,
  montant + devise, rattachement à une/des **phases**, description du travail).
- **Double mode de lien** : nominatif (sous-traitant existant de `batipro_subcontractors` + chantier)
  **et** générique par chantier (le sous-traitant s'identifie lui-même, rapprochement manuel).
- Workflow standard BTP (confirmé par recherche) : *soumis → le gestionnaire révise ligne par ligne
  → validé / renvoyé pour correction → intégré au chantier* (rien n'est acté avant validation).
- C'est la **même chaîne documentaire vue dans le sens montant** : extension du socle
  `batipro_documents`, pas un module parallèle.

## Principe directeur : réutiliser, ne pas réinventer

L'exploration montre que ~70 % du socle existe. Le module NE crée PAS de nouveau pattern : il
calque l'existant.

| Besoin | Brique existante à réutiliser | Chemin |
|---|---|---|
| CRUD + permissions + soft-delete + realtime | pattern "phases" | `batipro.service.ts:397-452`, `batipro.controller.ts:186-212` |
| Comptabiliser une facture (sans comptes en dur) | `LedgerService.postByRules` | `backend2/src/ledger/ledger.service.ts:215` |
| Exemple facture → écriture | `sale-invoices.service.ts:257` | idempotence, `sourceModule`, `relatedId` |
| Lien client sans login (token usage unique) | contrats Domus | `contracts.service.ts:258/511/538`, `contracts-public.controller.ts` |
| Stocker/servir un fichier protégé | `ObjectStorageService` + `StreamableFile` + front `blobUrl` | `property-management/object-storage.service.ts`, `batipro.controller.ts:363` |
| Affichage montant + devise depuis DB | `money()` / `currencyCode` join | `batipro-app/src/app.jsx:76`, `batipro.service.ts:455` |
| Document HTML imprimable (pas de PDF serveur) | pattern paie HR | `hr.service.ts:676` `payrollPdfHtml(id): Promise<string>` |
| Restreindre un user à ses chantiers | RBAC par chantier | `batiproProjectAssignments`, `BatiproProjectGuard` |

## Briques à CRÉER (actées)

1. **Entités Devis et Bons de commande** (situations/avenants existent déjà, pas ceux-là).
2. **Service de numérotation séquentielle légale** (ex. `DEV-2026-0001`, `FAC-2026-0001`) —
   aucun service central n'existe ; `situations.number` est saisi manuellement (à sécuriser aussi).
3. **Rôle/accès client restreint** — n'existe pas ; le guard BâtiPro est **fail-open**
   (`batipro-project-scope.decorator.ts:11-14`) → à durcir pour un vrai accès client.
4. **Contrôleur public par token** pour BâtiPro (calqué sur `contracts-public.controller.ts`).

---

## Modèle de données (nouvelles tables, gabarit "phases")

Toutes préfixées `batipro_`, avec `organizationId`, `isActive` (soft-delete), `createdAt/updatedAt`,
`currencyId` + join devise, et `publish()` realtime sur chaque mutation.

### Socle commun — table `batipro_documents`
Un seul en-tête pour les 4 types (évite de dupliquer numérotation/statuts/totaux 4×) :
- `projectId` (→ `batipro_projects`), `type` enum `quote|purchase_order|situation|invoice`
- `number` (généré, unique par org+type+année), `issueDate`, `dueDate`
- `status` (cycle propre au type — voir plus bas), `currencyId`
- `totalHt`, `totalVat`, `totalTtc` (calculés depuis les lignes)
- `parentDocumentId` (chaînage : une facture référence sa situation, une situation son devis)
- `clientToken` + `clientTokenExpiry` (lien public, pattern contrats), `notes`
- `ledgerEntryId` (rempli quand la facture est comptabilisée)

### Lignes — table `batipro_document_lines`
- `documentId`, `position`, `designation`, `quantity`, `unitPrice`, `vatRate`, `lineHt`, `lineTtc`
- optionnel `phaseId` (relier une ligne à une phase du chantier → base des situations d'avancement)

> Note : les `batipro_situations`/`batipro_change_orders` existants restent en place. La situation
> "documentaire" (avec lignes + génération de facture) peut soit réutiliser `batipro_situations`
> enrichi, soit être un `type=situation` de `batipro_documents`. **Choix recommandé** : nouveau
> socle `batipro_documents` pour devis/BC/factures, et **faire converger** les situations vers ce
> socle en Phase 3 (ne pas casser l'existant en Phase 1).

### Cycles de statut par type
- **Devis** : `draft → sent → accepted / refused → expired`
- **BC** : `draft → sent → confirmed → received / cancelled`
- **Situation** : `draft → submitted → validated → invoiced`
- **Facture** : `draft → issued → paid (partiel/total) → cancelled`

### Migration Drizzle
- Fichier `backend2/drizzle/00XX_batipro_documents.sql` (numéro à prendre après le dernier au moment
  du dev), **`CREATE TABLE IF NOT EXISTS`**, **1 statement par `--> statement-breakpoint`**,
  entrée `_journal.json` (idx suivant, `when` croissant). Schéma TS dans
  `backend2/src/database/schema.ts` à côté des autres `batipro_*` (~ligne 2273+).

---

## Backend (`backend2/src/batipro/`)

- **Service** : méthodes calquées sur le pattern phases — `listDocuments(filtre projectId/type)`,
  `getDocument` (throw si autre org), `createDocument` + `createLines`, `updateDocument`,
  `deleteDocument` (soft), toutes avec `publish("batipro", ...)` et join devise.
- **Numérotation** : nouvelle méthode `nextDocumentNumber(orgId, type, year)` — séquence par
  (org, type, année) en transaction (SELECT MAX ... FOR UPDATE ou table compteur dédiée) pour
  éviter trous/doublons. À utiliser pour devis/factures (et rétrofit situations).
- **Comptabilisation facture** : `postInvoiceToLedger(documentId, orgId)` appelant
  `ledger.postByRules({ sourceModule:"batipro", relatedId:documentId, idempotencyKey:\`batipro:invoice:${documentId}\`, amountsByRole:{...} })` — rôles métier (créance client, produit, TVA), **jamais de compte en dur**. Modèle : `sale-invoices.service.ts:233-257` mais **sans** le dual-write legacy `transactions`. Met à jour `batipro_projects.billedAmount` et `documents.ledgerEntryId`.
- **Rendu HTML imprimable** : `documentHtml(documentId): Promise<string>` — calqué sur
  `hr.service.ts:676`, HTML stylé, montants via devise DB. Sert à la fois l'aperçu gestionnaire
  et la page client.
- **DTO** : `dto/batipro.dto.ts` étendu (class-validator, snake_case API, `currency_id` optionnel).
- **Permissions** : réutiliser `readAll/create/update/delete-batipro` pour le gestionnaire.

### Contrôleurs
- **Gestionnaire** (`batipro.controller.ts`) : routes `GET/POST/PUT/DELETE /documents` +
  `/documents/:id/lines` + `POST /documents/:id/issue` (émet/comptabilise) +
  `GET /documents/:id/html` (aperçu, `@Permissions readAll-batipro`, `blobUrl` front) +
  `POST /documents/:id/share` (génère `clientToken`, renvoie le lien).
- **Public client** (NOUVEAU `batipro-public.controller.ts`) : calqué sur
  `contracts-public.controller.ts` — `@Controller("batipro/public/documents")`, **sans guard**,
  `@Throttle`, `GET :token` (rend le HTML du document + log "viewed"),
  `POST :token/accept` (client accepte un devis → statut `accepted`). Token opaque
  (`crypto.randomUUID`), expiry, IP/User-Agent pour audit.
- **Whitelist middleware** : `/batipro` déjà couvert par `{prefix:'/batipro'}` — vérifier que la
  route publique passe (sinon 403).

### Accès client connecté (durcissement RBAC — Phase 4)
- Créer un rôle "client BâtiPro" ne portant que `readAll-batipro` + affectation via
  `batiproProjectAssignments` à ses seuls chantiers.
- **Durcir le fail-open** : `batipro-project-scope.decorator.ts` doit renvoyer `[]` (aucun accès)
  au lieu de `"all"` quand l'user a le rôle client et aucune affectation. Ne PAS changer le
  comportement des rôles internes (rétrocompat).

---

## Frontend (`batipro-app/src/`)

- **Onglet "Documents"** : soit enrichir l'onglet `situations` existant (`app.jsx:968-1057`) en
  "Situations & Documents" avec sous-onglets Devis / BC / Situations / Factures, soit nouvel
  onglet dédié. Réutiliser `money()`/`moneyByCurrency` (`app.jsx:76-85`).
- **Éditeur de devis** (Phase 1) : sélecteur de chantier, saisie des lignes (désignation, qté, PU,
  TVA), totaux calculés, bouton "Aperçu" (ouvre le HTML via `blobUrl`), bouton "Envoyer au client"
  (génère le lien partageable → copier / WhatsApp).
- **`api.js`** : ajouter les endpoints documents (réutiliser `jsonFetch`, `blobUrl` pour l'aperçu
  HTML protégé). Token JWT en mémoire (déjà en place, SCRUM-119).
- **Page client publique** : une route front minimale (ou page servie) qui, à partir du token,
  affiche le document et le bouton "Accepter" pour un devis. Peut être un rendu HTML direct servi
  par le contrôleur public (pas besoin d'app React lourde pour le client).

---

## Portail sous-traitant (soumission entrante sans compte)

Extension du socle documentaire, dans le sens **montant** (sous-traitant → gestionnaire). Réutilise
exactement les mêmes briques que l'accès client sortant (token public, upload fichier, HTML).

### Modèle de données
- `batipro_documents` gagne un champ **`direction`** enum `outbound|inbound` (défaut `outbound`).
  Une soumission sous-traitant = `type=quote|invoice`, `direction=inbound`, avec `subcontractorId`.
- `batipro_documents` gagne **`subcontractorId`** (nullable, → `batipro_subcontractors`) et
  **`submittedByName`** / `submittedByCompany` (mode générique où le sous-traitant s'identifie).
- `attachedFileKey` / `attachedFileFormat` / `attachedFileSize` : le PDF uploadé par le
  sous-traitant (stockage MinIO via `ObjectStorageService.putDocument`, clé
  `batipro/submissions/${orgId}/${projectId}/...`).
- Lignes dans `batipro_document_lines` (mêmes colonnes ; `phaseId` = rattachement à la phase).
- Nouveau statut inbound : `submitted → under_review → validated / returned` (renvoyé pour correction).

### Génération du lien (côté gestionnaire, authentifié)
- `POST /batipro/documents/subcontractor-link` — body : `project_id`, `subcontractor_id?`
  (nominatif) OU rien (générique). Crée un token opaque (`crypto.randomUUID`) +
  `clientTokenExpiry` (défaut J+7, configurable). Renvoie le lien partageable (copier / WhatsApp).
- Deux variantes : token **nominatif** (pré-rempli avec le sous-traitant) ou **générique par
  chantier** (le sous-traitant saisit nom/entreprise). Même colonne `clientToken`, distinction via
  `subcontractorId` présent ou non.

### Contrôleur public (NOUVEAU, sans guard — `batipro-public.controller.ts`)
Calqué sur `contracts-public.controller.ts` + le streaming photo public de
`property-management-public.controller.ts`. Toutes les routes `@Throttle` :
- `GET /batipro/public/submit/:token` — renvoie le contexte (nom du chantier, sous-traitant si
  nominatif, phases disponibles pour rattachement) sans exposer d'autres données du chantier/org.
- `POST /batipro/public/submit/:token` — reçoit le formulaire (lignes, montant, phases,
  description, identité si générique) → crée le `batipro_documents` `direction=inbound`
  `status=submitted`.
- `POST /batipro/public/submit/:token/file` — **upload multipart** via `FileInterceptor` →
  `ObjectStorageService.putDocument` (PDF/images, ≤ 15 Mo — contrôle MIME magic-bytes déjà en place
  côté upload-security). Token = l'autorisation, jamais dans une query de login.
- **Sécurité (pratiques BTP confirmées)** : token opaque + expiration, throttling, types/taille de
  fichier restreints, audit IP/User-Agent, le token ne donne accès qu'à SON chantier — aucune fuite
  inter-chantier/inter-org. Envisager un token **multi-usage jusqu'à expiration** (le sous-traitant
  peut soumettre plusieurs documents) plutôt qu'usage unique comme la signature de contrat.
- **Whitelist middleware** : ajouter la route `/batipro/public/*` si non couverte par
  `{prefix:'/batipro'}` (vérifier, sinon 403).

### Revue côté gestionnaire (authentifié, `readAll/update-batipro`)
- Liste des soumissions `direction=inbound status=submitted` par chantier (nouvel onglet/section
  "Soumissions sous-traitants" dans l'UI, ou filtre de l'onglet Documents).
- Voir le document uploadé (`blobUrl` protégé) + les lignes saisies, réviser, **valider**
  (`validated`) ou **renvoyer** (`returned` + motif). La validation intègre au suivi budgétaire du
  chantier (engagé/facturé) et, en Phase 4, peut déclencher la compta fournisseur (ledger, rôle
  "dette fournisseur / sous-traitance").

## Découpage en phases (tickets)

**Phase 0 — Portail sous-traitant (PRIORITAIRE, besoin fort)**
1. Migration : socle `batipro_documents` + `batipro_document_lines` (partagé avec la suite) avec
   `direction`, `subcontractorId`, `submittedBy*`, `attachedFile*`.
2. Service : `createSubcontractorLink`, CRUD soumissions, validation/renvoi.
3. Contrôleur public `batipro-public.controller.ts` : GET contexte, POST soumission, POST upload
   fichier — token opaque + throttle + contrôle fichier.
4. Front gestionnaire : génération du lien (nominatif/générique), onglet "Soumissions", revue.
5. Front public : page minimale servie par token (formulaire + upload + rattachement phases).

**Phase 1 — Devis (livre de la valeur vite)**
1. Migration `batipro_documents` + `batipro_document_lines` + schéma TS.
2. Service numérotation `nextDocumentNumber` + CRUD documents/lignes (type `quote`).
3. Rendu `documentHtml` pour le devis + route aperçu gestionnaire.
4. Front : onglet Documents + éditeur de devis + aperçu.
5. Partage client : `clientToken` + `batipro-public.controller.ts` (GET token = voir le devis,
   POST accept). Lien copiable/WhatsApp.

**Phase 2 — Bons de commande**
- Type `purchase_order`, rattachés au chantier (+ optionnel `supplierId`/`subcontractorId` existants).
- Suivi budgétaire chantier : devis (prévu) vs BC engagés.

**Phase 3 — Situations de travaux (branchées sur les phases)**
- Faire converger `batipro_situations` vers le socle documents (type `situation`), lignes reliées
  aux `phaseId` avec % d'avancement → calcul auto du montant à facturer sur la période.
- C'est le cœur métier BTP : la saisie d'avancement du gestionnaire alimente la facturation.

**Phase 4 — Factures + compta + accès client connecté**
- Type `invoice` généré depuis une situation validée ; `postInvoiceToLedger` (ledger `postByRules`).
- Mise à jour `billedAmount`, paiements/solde.
- Rôle client connecté + durcissement du guard fail-open.

---

## Vérification (end-to-end, par phase)

- **DB** : après migration, `docker-compose logs` du conteneur dev confirme l'application (cibler
  `nglu_dev_mysql`, jamais prod). `npx tsc --noEmit` backend2.
- **Devis (Phase 1)** : créer un devis sur un chantier de test → vérifier numéro séquentiel,
  totaux HT/TVA/TTC avec devise DB, aperçu HTML correct → générer le lien → ouvrir le lien en
  navigation privée (sans login) → voir le devis → "Accepter" → statut passe à `accepted`.
- **Portail sous-traitant (Phase 0)** : générer un lien (nominatif + générique) → ouvrir en
  navigation privée → soumettre un formulaire + uploader un PDF → rattacher à une phase → côté
  gestionnaire, la soumission apparaît, le PDF est consultable, valider/renvoyer fonctionne →
  vérifier qu'un token ne donne accès qu'à SON chantier (pas de fuite inter-chantier/org).
- **Facture (Phase 4)** : émettre une facture → vérifier l'écriture ledger créée (idempotence :
  ré-émettre ne double pas l'écriture), `billedAmount` mis à jour, période non clôturée respectée.
- **Front** : `npx vite build --mode development` batipro-app (jamais `npm run build` nu).
- **Sécurité** : un user client ne voit QUE ses chantiers (guard durci) ; le token public est
  expirable/throttlé et ne fuit aucune donnée d'un autre chantier/org.

## Points d'attention / risques

- **Coordination** : une session batipro a livré les plans 3D (commité). Coordonner les
  modifs sur `app.jsx` / `batipro.service.ts` / `schema.ts` pour éviter les conflits.
- **Numérotation légale** : séquence sans trou en transaction — point sensible (audit/compta).
- **Fail-open RBAC** : le durcissement du guard client ne doit pas régresser l'accès des rôles
  internes (Phase 2 RBAC batipro était fail-open volontairement).
- **Compta** : brancher via `postByRules` (rôles métier) et non `post` avec comptes en dur ;
  respecter le gate d'approbation et les périodes clôturées du ledger.
- **Upload public** : contrôle MIME magic-bytes + taille (déjà en place côté upload-security),
  throttling, token expirable — un endpoint public d'upload est une surface d'attaque à traiter
  avec soin.
- **Mobile** : batipro-app est Capacitor — prévoir le responsive de l'éditeur de devis et du
  formulaire de soumission sous-traitant.
