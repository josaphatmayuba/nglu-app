# PROMPT 15 — INTÉGRATIONS EXTERNES, API, IMPORT/EXPORT ET INTEROPÉRABILITÉ ERP/SIFA

## Objectif de ce prompt

Ce prompt sert à concevoir la stratégie d’intégration externe de l’ERP/SIFA.

Un ERP/SIFA mature ne doit pas être isolé.

Il doit pouvoir communiquer avec :

- Excel
- CSV
- banques
- mobile money
- SMS
- email
- Power BI
- systèmes comptables externes
- API gouvernementales
- scanners code-barres
- QR code
- signature électronique
- applications mobiles
- systèmes clients existants

L’objectif est de préparer une architecture propre pour les intégrations sans casser le cœur ERP.

---

# 1. Contexte

Le projet ERP/SIFA vise à gérer :

```text
Finance
Approvisionnement
Stock
Ventes
RH
Paie
Immobilier
Construction
Agriculture
Élevage
Projets ONG
Logistique
Documents
Workflow
Budget
Audit
Rapports
```

Le système doit pouvoir être utilisé par :

```text
PME
ONG
coopératives
sociétés immobilières
entreprises de construction
institutions publiques
municipalités
provinces
ministères
gouvernements
```

Ces clients auront souvent besoin d’importer, exporter ou synchroniser des données.

---

# 2. Mission principale

Produire une stratégie complète d’intégration.

L’agent doit définir :

1. architecture API publique
2. stratégie import/export
3. intégration Excel/CSV
4. intégration Power BI
5. intégration email
6. intégration SMS
7. intégration mobile money
8. intégration bancaire future
9. intégration QR code
10. intégration code-barres
11. intégration signature électronique
12. webhooks
13. connecteurs externes
14. sécurité API
15. journalisation des intégrations
16. tickets techniques

---

# 3. Règle absolue

Les intégrations ne doivent jamais contourner :

```text
permissions
audit
validation métier
workflow
budget
sécurité
organisationId
tenantId
```

Toute donnée importée ou synchronisée doit passer par les mêmes règles que les données saisies manuellement.

---

# 4. Architecture d’intégration cible

Créer une couche :

```text
Integration Layer
```

Composants recommandés :

```text
Public API
Import Service
Export Service
Webhook Service
Integration Logs
Connector Registry
API Keys
Rate Limiting
Data Mapping
Validation Engine
Error Handling
Retry Queue
```

---

# 5. API publique

Prévoir une API documentée pour intégrations.

Endpoints possibles :

```text
GET /api/v1/customers
POST /api/v1/customers
GET /api/v1/suppliers
POST /api/v1/suppliers
GET /api/v1/products
POST /api/v1/products
GET /api/v1/invoices
POST /api/v1/invoices
GET /api/v1/payments
POST /api/v1/payments
GET /api/v1/stock/movements
POST /api/v1/stock/movements
GET /api/v1/reports
```

Chaque endpoint doit respecter :

```text
authentification
permission
organizationId
audit
rate limit
validation DTO
```

---

# 6. API Keys

Créer un système d’API keys pour intégrations.

Table recommandée :

```text
api_keys
- id
- organizationId
- name
- keyHash
- scopes
- status
- expiresAt
- lastUsedAt
- createdBy
- createdAt
```

Scopes possibles :

```text
customers.read
customers.write
suppliers.read
products.read
invoices.read
invoices.write
payments.read
stock.read
reports.read
```

Règles :

```text
ne jamais stocker la clé brute
afficher la clé une seule fois
auditer utilisation
permettre révocation
limiter par organisation
```

---

# 7. Webhooks

Prévoir webhooks pour notifier systèmes externes.

Événements :

```text
invoice.created
invoice.paid
payment.received
stock.low
purchase.approved
workflow.approved
document.uploaded
transaction.posted
budget.exceeded
```

Table recommandée :

```text
webhooks
- id
- organizationId
- name
- url
- events
- secret
- status
- createdAt
```

Logs :

```text
webhook_deliveries
- id
- webhookId
- event
- payload
- status
- responseCode
- error
- attempts
- createdAt
```

---

# 8. Import Excel/CSV

Créer un moteur d’import.

Entités importables :

```text
clients
fournisseurs
produits
plan comptable
employés
stocks initiaux
factures
paiements
budgets
projets
immobilier
animaux
champs agricoles
```

Processus import :

```text
upload fichier
détection colonnes
mapping colonnes
prévisualisation
validation
rapport erreurs
import confirmé
audit
```

---

# 9. Validation import

Le système doit détecter :

```text
colonnes manquantes
format invalide
doublons
références inexistantes
devise inconnue
organisation absente
montants invalides
dates invalides
emails invalides
produits inexistants
comptes inexistants
```

Ne pas importer directement si erreurs critiques.

---

# 10. Export Excel/CSV

Exporter :

```text
transactions
journal entries
clients
fournisseurs
produits
stock
factures
paiements
budgets
rapports financiers
rapports projets
rapports stock
audit logs
```

Chaque export doit être :

```text
filtré par permissions
filtré par organisation
audité
horodaté
```

---

# 11. Power BI / Reporting externe

Prévoir une stratégie Power BI.

Options :

```text
export CSV/Excel
API reports
vue SQL dédiée lecture seule
connecteur OData futur
```

Ne pas donner accès direct à la base production sans contrôle.

Prévoir :

```text
reporting_views
read-only user
API token
permissions
audit exports
```

---

# 12. Email

Le système doit envoyer emails pour :

```text
création utilisateur
réinitialisation mot de passe
MFA
demande approbation
facture envoyée
reçu paiement
alerte stock
budget dépassé
rapport planifié
```

Créer :

```text
email_templates
email_logs
email_queue
```

Règles :

```text
templates personnalisables
logs d’envoi
retry si échec
pas de données sensibles inutiles
```

---

# 13. SMS

Prévoir SMS pour :

```text
MFA
alertes urgentes
approbation en attente
paiement reçu
stock critique
mission terrain
```

Créer une interface abstraite :

```text
SmsProvider
```

Pour pouvoir brancher :

```text
Twilio
Orange SMS
Airtel
Vodacom
autre fournisseur local
```

---

# 14. Mobile money

Prévoir intégration future avec :

```text
M-Pesa
Airtel Money
Orange Money
MTN Mobile Money
```

Cas d’usage :

```text
recevoir paiement client
payer fournisseur
payer salaire
recevoir loyer
preuve paiement
rapprochement
```

Architecture :

```text
mobile_money_providers
mobile_money_transactions
payment_callbacks
reconciliation_logs
```

Règles :

```text
ne jamais marquer payé sans confirmation fournisseur
auditer callback
vérifier signature webhook
gérer doublons
rapprocher avec facture/paiement
```

---

# 15. Intégration bancaire

Prévoir plus tard :

```text
import relevé bancaire
rapprochement bancaire
paiement fournisseur
paiement salaire
```

Formats :

```text
CSV bancaire
Excel bancaire
API bancaire si disponible
```

Fonctions :

```text
import statement
match payments
detect unmatched
reconcile
audit
```

---

# 16. QR Code

Utiliser QR code pour :

```text
facture
reçu
bon de commande
bon de réception
document
animal
produit
stock
contrat
```

Fonctions :

```text
générer QR
scanner QR
ouvrir entité
vérifier authenticité document
```

Exemple :

```text
QR sur reçu de paiement → ouvre reçu dans ERP
QR sur animal → ouvre fiche animal
QR sur produit → ouvre stock produit
```

---

# 17. Code-barres / scanner

Prévoir pour :

```text
stock
inventaire
réception
sortie
transfert
produits
matériaux
médicaments
```

Fonctions :

```text
scan produit
scan lot
scan entrepôt
scan mouvement
inventaire rapide
```

---

# 18. Signature électronique future

Prévoir une architecture pour :

```text
contrats
bons de commande
approbations
documents officiels
rapports
```

Ne pas implémenter forcément au début, mais prévoir :

```text
document_signatures
signature_requests
signature_logs
```

---

# 19. Connecteurs systèmes externes

Prévoir une architecture :

```text
connectors
connector_settings
connector_logs
```

Connecteurs possibles :

```text
Odoo
QuickBooks
Sage
Dolibarr
Google Drive
OneDrive
Dropbox
Power BI
Email SMTP
SMS provider
Bank API
Mobile Money API
```

---

# 20. Journalisation des intégrations

Créer :

```text
integration_logs
```

Champs :

```text
id
organizationId
integrationName
direction
entityType
entityId
status
requestPayload
responsePayload
error
attempts
createdAt
```

Direction :

```text
INBOUND
OUTBOUND
```

Statuts :

```text
SUCCESS
FAILED
PENDING
RETRYING
```

---

# 21. File d’attente et retry

Pour intégrations externes, prévoir :

```text
queue
retry
dead letter queue
logs
```

Cas :

```text
email échoué
webhook échoué
SMS échoué
sync externe échouée
```

---

# 22. Sécurité intégrations

Exigences :

```text
API keys hashées
scopes limités
rate limiting
IP allowlist optionnelle
webhook signature
audit API access
rotation clés
expiration clés
permissions par organisation
```

---

# 23. Documentation intégration

Créer :

```text
API_INTEGRATION_GUIDE.md
IMPORT_EXPORT_GUIDE.md
WEBHOOKS_GUIDE.md
API_KEYS_GUIDE.md
POWERBI_GUIDE.md
```

Chaque guide doit contenir :

```text
authentification
endpoints
payloads
erreurs
exemples
permissions
limites
```

---

# 24. Tickets techniques attendus

Créer tickets pour :

```text
1. Créer api_keys
2. Créer gestion scopes API
3. Créer Public API v1
4. Créer rate limiting API
5. Créer integration_logs
6. Créer ImportService Excel/CSV
7. Créer ExportService Excel/CSV
8. Créer mapping import
9. Créer validation import
10. Créer rapport erreurs import
11. Créer webhooks
12. Créer webhook deliveries
13. Créer email queue
14. Créer email logs
15. Créer SmsProvider interface
16. Préparer mobile money architecture
17. Préparer bank statement import
18. Ajouter QR code génération
19. Ajouter QR code scanner support
20. Ajouter barcode support stock
21. Préparer signature électronique
22. Créer reporting API pour Power BI
23. Créer documentation intégration
24. Ajouter tests sécurité API keys
25. Ajouter tests import/export
```

---

# 25. Format des tickets

Chaque ticket doit contenir :

```text
Titre :
Priorité :
Module :
Type :
Contexte :
Objectif :
Tables concernées :
Services concernés :
Endpoints concernés :
Travail à faire :
Critères d’acceptation :
Tests :
Risques :
Dépendances :
```

---

# 26. Priorités recommandées

## P0

```text
Export Excel/CSV
Import Excel/CSV de base
Email transactionnel
API interne stable
Audit exports
```

## P1

```text
API keys
Public API v1
Webhooks
Integration logs
Power BI export
QR code documents
```

## P2

```text
SMS
Barcode stock
Bank statement import
Mobile money architecture
```

## P3

```text
Mobile money complet
Bank API complet
Signature électronique
Connecteurs Odoo/Sage/QuickBooks
```

---

# 27. Tests obligatoires

Tester :

```text
API key invalide refusée
API key sans scope refusée
export audité
import avec erreurs bloqué
import valide réussi
webhook retry si échec
email log créé
QR code ouvre bonne entité
stock scan crée mouvement correct
```

---

# 28. Livrables attendus

L’agent doit produire :

1. Architecture intégration.
2. Liste des intégrations prioritaires.
3. Tables à créer.
4. Services à créer.
5. Endpoints à créer.
6. Sécurité API.
7. Stratégie import/export.
8. Stratégie webhooks.
9. Stratégie email/SMS.
10. Stratégie mobile money/bank future.
11. Tickets techniques.
12. Tests.
13. Documentation à produire.

---

# 29. Format final attendu

La réponse doit être structurée comme ceci :

```text
1. Résumé exécutif
2. Architecture intégration cible
3. API publique
4. API keys et sécurité
5. Import Excel/CSV
6. Export Excel/CSV
7. Power BI / reporting
8. Email
9. SMS
10. Mobile money
11. Banque
12. QR code
13. Code-barres
14. Signature électronique
15. Webhooks
16. Logs intégration
17. Priorités
18. Tickets techniques
19. Tests
20. Documentation
21. Conclusion
```

---

# 30. Conclusion

Le but final est de rendre l’ERP/SIFA interopérable.

Le système doit pouvoir recevoir et envoyer des données de façon sécurisée.

Mais les intégrations doivent toujours respecter :

```text
permissions
audit
validation métier
organisationId
workflow
budget
sécurité
```

Une bonne architecture d’intégration rendra le produit plus crédible pour les entreprises, ONG et institutions.
