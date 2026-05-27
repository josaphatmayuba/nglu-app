# 🌾 Architecture Technologique — FarmOS Pro ERP Élevage

**Version:** 2.0 — **Intégration CRM**  
**Date:** 2026-05-26  
**Statut:** Prototype intégré à nglu-app  
**Note:** Utilise même BD, mêmes utilisateurs, même comptabilité que le CRM existant

---

## 🎯 Objectif du Projet

Créer une plateforme moderne, complète et professionnelle de gestion agricole et d'élevage :

✅ **Multi-espèces** — Porcs, vaches, poulets, poissons, chèvres, moutons, lapins  
✅ **Mobile-first** — Utilisable en ferme, sans internet  
✅ **Hors ligne** — Fonctionne complètement offline  
✅ **Identification avancée** — QR, RFID, NFC, photo IA  
✅ **Santé animale** — Maladies, vaccins, traitements, quarantaine  
✅ **Reproduction** — Cycles, gestation, mise bas, fertilité  
✅ **Synchronisation** — Sync automatique quand internet revient  
✅ **Scalable** — Architecture entreprise prête pour croissance  

---

## 🔗 INTÉGRATION FRONTEND NGLU-APP EXISTANT — CRITIQUE

**⚠️ IMPORTANT : NE PAS RÉINVENTER LE CRM !**  
**FarmOS s'intègre dans le frontend existant du projet nglu-app**

### Ce qui existe déjà (à réutiliser)
```
Frontend nglu-app existant (React/Next.js)
│
├── Authentification JWT (Users)
├── Sidebar & Layout admin
├── Pages existantes:
│   ├── Dashboard
│   ├── Ventes
│   ├── Achat
│   ├── Stock
│   ├── Comptabilité → TRANSACTIONS (Dépenses FarmOS apparaissent ici)
│   ├── Factures → INVOICES (Ventes FarmOS apparaissent ici)
│   ├── Clients & Fournisseurs
│   └── Rapports
│
└── BD PostgreSQL existante (users, roles, transactions, invoices...)
```

### Ce qu'on ajoute (FarmOS)
```
Frontend nglu-app - Nouveau menu "FarmOS" dans sidebar
│
├── 🐄 Animals (Gestion animaux)
├── 🏥 Santé (Traitements, maladies)
│   └── Auto-crée dans "Comptabilité" → Transactions CRM
├── 🔬 Médicaments (Stock, délai retrait)
├── 👶 Reproduction (Cycles, mise bas)
├── 💰 Ventes animaux
│   └── Auto-crée dans "Factures" → Invoice CRM
├── 📊 Rapports FarmOS (Production, coûts)
└── Scanner (QR, RFID)

Backend: Nouveau module "farmos" dans backend2/
├── Crée des transactions dans CRM
├── Crée des invoices dans CRM
└── Réutilise authentification CRM
```

### Quoi RÉUTILISER du CRM existant ✅
- ✅ **Authentification** — JWT existant (ne pas recréer)
- ✅ **Users & Roles** — Mêmes utilisateurs/rôles CRM
- ✅ **Layout** — Sidebar, header, footer existants
- ✅ **Composants UI** — Boutons, modals, tables CRM
- ✅ **Comptabilité** — Page "Transactions" CRM existante
- ✅ **Factures** — Page "Invoices" CRM existante
- ✅ **Clients & Fournisseurs** — Données CRM existantes
- ✅ **PostgreSQL** — Base de données partagée

### Quoi AJOUTER pour FarmOS 🆕
- 🆕 **Menu FarmOS** — Dans sidebar CRM existant
- 🆕 **Pages FarmOS** — Animals, Health, Sales, Reports
- 🆕 **Module Backend** — `src/farmos/` dans backend2
- 🆕 **Tables FarmOS** — Animals, treatments, sales, medicines
- 🆕 **API FarmOS** — Routes `/api/farmos/...`
- 🆕 **Intégration comptable** — Auto-créer transactions CRM quand on ajoute dépense FarmOS

### Tables partagées vs spécifiques

| Table | Propriétaire | Accès |
|-------|------------|-------|
| `users` | CRM | Partagée (auth, profil) |
| `roles` | CRM | Partagée (permissions) |
| `transactions` | CRM | Partagée (comptabilité) |
| `invoices` | CRM | Partagée (facturation) |
| `animals` | FarmOS | Propre à FarmOS |
| `treatments` | FarmOS | Propre à FarmOS |
| `reproductionEvents` | FarmOS | Propre à FarmOS |
| `sales` | FarmOS | Propre à FarmOS |
| `medicines` | FarmOS | Propre à FarmOS |
| `farmExpenses` | FarmOS | Propre à FarmOS (lien CRM) |

---

## 📊 COMPTABILITÉ INTÉGRÉE — Flux des dépenses

### Architecture comptable
```
Animal Management (FarmOS)
    ↓
DÉPENSES:
├── Achat aliments      → animals.feedingCosts
├── Médicaments         → treatments.medicationCost
├── Vaccins             → treatments.vaccinationCost
├── Litière, équipement → animals.otherCosts
    ↓
farmExpenses table (audit)
    ↓
CRM Transactions (comptabilité)
    ├── Ligne débit Compte alimentaire
    ├── Ligne débit Compte médicaments
    └── Ligne crédit Compte fournisseur

REVENUS:
└── Vente animaux       → sales.totalPrice
        ↓
    CRM Invoice (facture client)
        ↓
    CRM Transaction (comptabilité)
        ├── Ligne crédit Compte ventes
        └── Ligne débit Compte client
```

### Exemple : Traitement d'une vache (CRM impact)

```javascript
// 1. FarmOS enregistre traitement
POST /api/treatments {
  animalId: "BV-118",
  disease: "Mammite",
  medicine: "Antibiotique 500ml",
  medicationCost: 125.50,  // EUR
  retraitDays: 7,
  veterinaryFee: 85.00,    // EUR
  dateTreated: "2026-05-26"
}

// 2. Backend FarmOS crée farmExpense
INSERT farmExpenses (
  animalId, type, amount, description, userId, createdAt
)
VALUES (
  'BV-118', 'TREATMENT', 210.50, 
  'Antibiotic + Vet fee for Mastitis', 
  currentUserId, now()
)

// 3. Backend appelle CRM createTransaction
POST /api/crm/transactions {
  type: "EXPENSE",
  category: "LIVESTOCK_MEDICAL",
  amount: 210.50,
  currency: "EUR",
  description: "Traitement vache BV-118 - Mammite (Antibiotique + Visite vétérinaire)",
  reference: "FARM-TREAT-BV-118-2026-05-26",
  userId: currentUserId,
  
  // Lignes comptables
  lines: [
    { account: "5200", debit: 210.50, label: "Santé animaux" },
    { account: "4010", credit: 210.50, label: "Fournisseur Dr. Vétérinaire" }
  ]
}

// 4. CRM enregistre dans sa DB
INSERT transactions (...) 
INSERT transaction_lines (...)

// Résultat: Apparaît dans Comptabilité > Transactions CRM
```

### Types de dépenses FarmOS → CRM

| Dépense | Compte CRM | Description |
|---------|-----------|-------------|
| **Aliments** | 5100 | Boissons, céréales, foin, concentrés |
| **Santé animale** | 5200 | Médicaments, vaccins, visite vétérinaire |
| **Équipement** | 5300 | Boucles, capteurs, équipement ferme |
| **Litière/Consommables** | 5400 | Paille, sciure, produits hygiène |
| **Énergie ferme** | 5500 | Électricité bâtiments, chauffage |

### Types de revenus FarmOS → CRM

| Revenu | Compte CRM | Description |
|--------|-----------|-------------|
| **Vente viande** | 7010 | Porcs, vaches, lapins |
| **Vente lait** | 7020 | Vaches, chèvres |
| **Vente œufs** | 7030 | Poules, canards |
| **Vente poissons** | 7040 | Aquaculture |
| **Vente animaux vivants** | 7050 | Reproduction, élevage |

---

## 🔐 AUTHENTIFICATION & PERMISSIONS

### Utilisateurs partagés
```javascript
// Même système JWT que CRM
// Dans FarmOS:

// 1. Login via CRM ou FarmOS
POST /api/auth/login {
  username: "technicien@ferme.com",
  password: "..."
}

// 2. Retour JWT avec rôle
{
  token: "eyJhbGc...",
  user: {
    id: "user-123",
    name: "Jean Technicien",
    email: "technicien@ferme.com",
    role: "FARM_TECHNICIAN",  // Ou USER, ADMIN, MANAGER...
    permissions: ["read-animals", "create-treatments", "read-reports"]
  }
}

// 3. FarmOS valide le JWT contre CRM
// (Même signature qu'authentification CRM)

// 4. Permissions appliquées sur API FarmOS
GET /api/animals
  ├── Role ADMIN → Tous les animaux
  ├── Role MANAGER → Animaux de sa ferme
  ├── Role TECHNICIAN → Lecture + scan terrain
  └── Role VIEWER → Lecture seule
```

### Rôles FarmOS dans CRM

| Rôle | Permissions FarmOS | Exemple |
|------|-------------------|---------|
| **ADMIN** | CRUD complet animaux, coûts, dépenses | Directeur |
| **MANAGER** | CRUD animaux, lectures coûts | Gérant ferme |
| **TECHNICIAN** | Ajout traitements, scans, pesées | Technicien terrain |
| **VIEWER** | Lecture seule rapports | Propriétaire absent |

---

## 🖥️ FRONTEND — Interface Utilisateur

### 1. **Next.js** — Framework principal
| Aspect | Détail |
|--------|--------|
| **Rôle** | Framework React full-stack moderne |
| **Pourquoi** | Rapide, SEO, SSR/SSG, API routes, PWA ready |
| **Utilisation** | Dashboard, gestion animaux, santé, rapports, scanner |
| **Avantages** | Production-ready, déploiement facile, très performant |

---

### 2. **React** — Bibliothèque UI
| Aspect | Détail |
|--------|--------|
| **Rôle** | Composants réutilisables et interfaces dynamiques |
| **Pourquoi** | Écosystème géant, composants modulaires, temps réel |
| **Utilisation** | Cards animaux, tableaux, alertes, modals, navigation |
| **Avantages** | Composants hooks modernes, très maintenable |

---

### 3. **Tailwind CSS** — Framework CSS
| Aspect | Détail |
|--------|--------|
| **Rôle** | Styling responsive et moderne |
| **Pourquoi** | Mobile-first, pas de CSS custom, très rapide |
| **Utilisation** | Layout responsive, animations, mode sombre |
| **Avantages** | Maintenabilité, performance, design system intégré |

---

### 4. **PWA** — Progressive Web App
| Aspect | Détail |
|--------|--------|
| **Rôle** | Application web installable et offline-capable |
| **Fonctionnalités** | Installation téléphone, offline, cache, sync, push |
| **Avantages** | Pas besoin Play Store, très léger, mise à jour OTA |
| **Installation** | Sur Android, iOS, desktop comme app native |

---

## 📱 RESPONSIVE DESIGN & MOBILE

### Objectifs mobiles
- ✅ Optimisé terrain (utilisable avec une main)
- ✅ Gros boutons (compatibles gants de travail)
- ✅ Navigation rapide et tactile
- ✅ Utilisable en plein soleil
- ✅ Batterie optimisée (mode low-power)

### Breakpoints
```
Mobile     : xs < 640px      (iPhone, Android)
Tablet     : md 768px        (iPad, Samsung Tab, Lenovo)
Desktop    : lg 1024px+      (Laptop, PC bureau, écran ferme)
Extra-wide : xl 1280px+      (Tableaux ferme professionnels)
```

---

## 🧠 BACKEND — Serveur

### 1. **NestJS** — Framework backend
| Aspect | Détail |
|--------|--------|
| **Rôle** | Framework API REST moderne et scalable |
| **Architecture** | Modules, services, contrôleurs, middleware |
| **Pourquoi** | Enterprise-grade, sécurisé, très performant |
| **Utilisation** | API animaux, santé, reproduction, sync, auth |
| **Avantages** | TypeScript, DI native, très maintenable |

### API Endpoints FarmOS (intégrés au backend CRM)

#### Animals Management
```
POST   /api/farmos/animals              Créer animal
GET    /api/farmos/animals              Lister animaux (pagined)
GET    /api/farmos/animals/:id          Récupérer détails animal
PATCH  /api/farmos/animals/:id          Modifier animal
DELETE /api/farmos/animals/:id          Supprimer logiquement

GET    /api/farmos/animals/:id/history  Historique complet (santé, repro, ventes)
POST   /api/farmos/animals/:id/weight   Enregistrer pesée
GET    /api/farmos/animals/stats        Dashboard KPIs (total, par espèce)
```

#### Treatments & Health
```
POST   /api/farmos/treatments            Ajouter traitement → CRM transaction
GET    /api/farmos/treatments            Lister traitements
GET    /api/farmos/treatments?animalId=  Traitements d'un animal
PATCH  /api/farmos/treatments/:id        Modifier traitement
GET    /api/farmos/animals/:id/alerts    Alertes (retrait, vaccination...)
```

#### Reproduction
```
POST   /api/farmos/reproduction-events   Ajouter événement
GET    /api/farmos/reproduction-events?animalId=  Historique reproduction
GET    /api/farmos/fertility-stats       Stats fertilité par espèce
```

#### Sales & Revenue
```
POST   /api/farmos/sales                 Enregistrer vente → CRM invoice + transaction
GET    /api/farmos/sales                 Lister ventes
PATCH  /api/farmos/sales/:id/mark-paid   Marquer payée → CRM
GET    /api/farmos/sales/revenue-stats   Stats ventes par mois/espèce
```

#### Medicines & Expenses
```
POST   /api/farmos/medicines              Ajouter médicament
GET    /api/farmos/medicines              Stock actuel
POST   /api/farmos/expenses               Enregistrer dépense → CRM transaction
GET    /api/farmos/expenses?type=FEED     Lister dépenses par type
GET    /api/farmos/cost-analysis          Coût moyen par animal/espèce
```

#### Reports & Analytics
```
GET    /api/farmos/reports/production     Rapport production (lait, œufs, viande)
GET    /api/farmos/reports/health         Rapport santé (maladies, vaccins)
GET    /api/farmos/reports/profitability  Rentabilité par animal/espèce
GET    /api/farmos/reports/export         Export PDF/Excel
```

#### Scanner QR/RFID
```
POST   /api/farmos/scan                   Scanner animal → fiche
POST   /api/farmos/quick-action           Ajouter traitement rapide depuis scanner
```

### Intégration avec APIs CRM
```
Quand FarmOS crée une dépense/vente:

1. FarmOS crée dans sa table
   POST /api/farmos/treatments { cost: 125.50 }

2. FarmOS appelle CRM internement
   POST /api/crm/transactions {
     type: "EXPENSE",
     category: "LIVESTOCK_MEDICAL",
     amount: 125.50,
     reference: "FARM-TREAT-123",
     lines: [{ account: "5200", debit: 125.50 }]
   }

3. Retour: linkedTransaction_id sauvegardé
   UPDATE treatments SET linkedTransaction_id = "trans-456"

Résultat: Dépense visible dans Comptabilité CRM
```

---

### 2. **Prisma ORM** — Gestion données
| Aspect | Détail |
|--------|--------|
| **Rôle** | ORM moderne et type-safe |
| **Pourquoi** | Migrations auto, sécurisé, introspection BD |
| **Utilisation** | Models, relations, transactions |
| **Avantages** | Schéma type-safe, requêtes optimisées |

---

## 🗄️ BASE DE DONNÉES

### **PostgreSQL** — Base principale
| Aspect | Détail |
|--------|--------|
| **Rôle** | Base de données relationnelle professionnelle |
| **Pourquoi** | Stable, performante, ACID, gros volumes |
| **Déploiement** | Cloud AWS ou serveur local Docker |
| **Capacité** | Millions d'enregistrements sans problème |

### Schéma intégré CRM + FarmOS

#### Tables CRM (existantes)
```
users
├── id (UUID)
├── email
├── name
├── role_id (FK → roles)
├── createdAt

roles
├── id (UUID)
├── name (ADMIN, MANAGER, TECHNICIAN...)
├── permissions (JSONB)

transactions
├── id (UUID)
├── type (INCOME, EXPENSE)
├── category (LIVESTOCK_MEDICAL, LIVESTOCK_FEED...)
├── amount (decimal)
├── currency
├── description
├── reference (lien vers FarmOS)
├── userId (FK → users)
├── createdAt

transaction_lines (détail comptable)
├── id (UUID)
├── transactionId (FK → transactions)
├── account (code comptable: 5200, 7010...)
├── debit, credit
├── description

invoices
├── id (UUID)
├── customerId (FK)
├── amount
├── items (JSONB)
├── status
├── createdAt
```

#### Tables FarmOS (nouvelles)
```
animals
├── id (UUID)
├── species (porcs, vaches, poulets, poissons, chèvres...)
├── identifier (boucle, QR, RFID) - UNIQUE
├── identifierType (RFID, QR, PHOTO, MANUAL)
├── weight (kg) - current
├── weightHistory (JSONB) - [{ date, weight }]
├── status (ACTIVE, TREATMENT, SOLD, DECEASED)
├── feedingCostPerDay (EUR)
├── acquisitionCost (EUR)
├── acquisitionDate
├── createdBy_userId (FK → users)
├── createdAt, updatedAt

treatments
├── id (UUID)
├── animalId (FK → animals)
├── disease
├── medicine
├── dosage
├── retraitDays
├── medicationCost (EUR)
├── veterinaryFee (EUR)
├── startDate
├── endDate
├── status (ACTIVE, COMPLETED, FAILED)
├── veterinarian_name
├── notes
├── createdBy_userId (FK → users)
├── linkedTransaction_id (FK → transactions) ← CRM
├── createdAt

reproductionEvents
├── id (UUID)
├── animalId (FK → animals)
├── parentAnimal_id (FK → animals, nullable)
├── eventType (HEAT, INSEMINATION, GESTATION, BIRTH, WEANING...)
├── date
├── outcome (SUCCESS, FAILURE, PENDING)
├── descendantCount (for births)
├── notes
├── createdBy_userId (FK → users)
├── createdAt

sales
├── id (UUID)
├── animalId (FK → animals)
├── type (MEAT, MILK, EGGS, LIVE, FISH)
├── quantity (kg or liters)
├── quantityUnit
├── pricePerUnit (EUR)
├── totalPrice (EUR)
├── buyer
├── status (PENDING, COMPLETED, CANCELLED)
├── paymentStatus (UNPAID, PAID)
├── dateCompleted
├── createdBy_userId (FK → users)
├── linkedInvoice_id (FK → invoices) ← CRM
├── linkedTransaction_id (FK → transactions) ← CRM
├── createdAt

medicines
├── id (UUID)
├── name
├── category (ANTIBIOTIC, VACCINE, ANTIPARASITIC...)
├── route (INJECTION, ORAL, WATER, TOPICAL...)
├── retraitDays
├── stock (quantity)
├── stockMin (alert level)
├── expiryDate
├── supplier
├── supplierPrice (EUR)
├── costPerDose (EUR)
├── createdBy_userId (FK → users)
├── createdAt, updatedAt

farmExpenses
├── id (UUID)
├── type (FEED, MEDICINE, EQUIPMENT, LABOR, ENERGY...)
├── amount (EUR)
├── currency
├── description
├── animalId (FK → animals, nullable)
├── reference (fournisseur, lot, période)
├── receipt (URL)
├── createdBy_userId (FK → users)
├── linkedTransaction_id (FK → transactions) ← CRM
├── createdAt

productionRecords
├── id (UUID)
├── animalId (FK → animals)
├── date
├── productionType (MILK, EGGS, MEAT_WEIGHT...)
├── quantity
├── unit (liters, kg, units...)
├── quality (GRADE_A, GRADE_B, REJECTED...)
├── notes
├── createdBy_userId (FK → users)
├── createdAt

auditLogs
├── id (UUID)
├── userId (FK → users)
├── action (CREATE, UPDATE, DELETE)
├── table (animals, treatments, sales...)
├── recordId
├── changes (JSONB - before/after)
├── timestamp
```

### Clés étrangères critiques
```
treatments.linkedTransaction_id → transactions.id
sales.linkedInvoice_id → invoices.id
sales.linkedTransaction_id → transactions.id
farmExpenses.linkedTransaction_id → transactions.id
animals.createdBy_userId → users.id
treatments.createdBy_userId → users.id
```

---

## 🌐 MODE HORS LIGNE — TRÈS IMPORTANT

### Objectif critique
Le fermier doit pouvoir utiliser l'application **sans internet** :
- En forêt
- En village sans couverture
- Dans les bâtiments épais
- Dans les bassins
- Dans les champs

---

### Technologies offline

#### **SQLite** — Base locale appareil
| Aspect | Détail |
|--------|--------|
| **Rôle** | Stockage de base sur téléphone |
| **Utilisation** | Cache local, données temporaires |
| **Avantages** | Très léger, natif sur mobile |

#### **IndexedDB** — Base locale navigateur
| Aspect | Détail |
|--------|--------|
| **Rôle** | Stockage navigateur offline |
| **Utilisation** | Données PWA, cache local |
| **Capacité** | 50+ Mo généralement |

#### **Dexie.js** — Gestion IndexedDB
| Aspect | Détail |
|--------|--------|
| **Rôle** | Couche abstraction IndexedDB |
| **Pourquoi** | Simplifie sync, API très clean |
| **Utilisation** | Sync automatique avec serveur |

---

### Flux offline/online

```
SANS INTERNET (Terrain)
├── Utiliser app normalement
├── Scanner QR/RFID animal
├── Ajouter traitement
├── Enregistrer poids
├── Ajouter naissance
└── Tout sauvegarde en LOCAL (IndexedDB/SQLite)

QUAND INTERNET REVIENT
├── Détection connexion auto
├── Sync des données locales → serveur
├── Résolution conflits (client gagne)
├── Télécharger données serveur
└── Vider cache local
```

---

## 🔄 SYNCHRONISATION

### Algorithme de sync

```javascript
// Pseudo-code
async function syncWithServer() {
  // 1. Vérifier connexion
  if (!navigator.onLine) return
  
  // 2. Récupérer données locales non synced
  const localChanges = await db.changes.where('synced', false).toArray()
  
  // 3. Envoyer au serveur
  for (const change of localChanges) {
    try {
      await api.sync(change)
      // Marquer comme synced
      await db.changes.update(change.id, { synced: true })
    } catch (e) {
      // Retry automatique après 60s
      setTimeout(syncWithServer, 60000)
    }
  }
  
  // 4. Télécharger données serveur
  const serverData = await api.fetchUpdates(lastSyncTime)
  await db.animals.bulkPut(serverData.animals)
  await db.treatments.bulkPut(serverData.treatments)
}
```

---

## 📷 IDENTIFICATION ANIMALE

### Par espèce — Méthode recommandée

#### 🐄 **Vaches**
| Méthode | Avantage |
|--------|----------|
| **RFID + Boucle officielle** | ✅ Traçabilité gouvernementale, lecture rapide, compatible vétérinaire |
| QR code | Backup rapide |
| Photo | Backup visuel |

#### 🐖 **Porcs**
| Méthode | Avantage |
|--------|----------|
| **RFID + QR lot** | ✅ Individuel truies (RFID), collectif porcelets (QR) |
| QR seul | Économique pour porcelets |

#### 🐓 **Poulets**
| Méthode | Avantage |
|--------|----------|
| **QR par bande** | ✅ Gestion collective, très rapide, économique |
| Puce RFID bande | Haute densité |

#### 🐟 **Poissons**
| Méthode | Avantage |
|--------|----------|
| **QR bassin** | ✅ Gestion par bassin, biomasse collective |
| Puce bassin RFID | Automatisé |

#### 🐐 **Chèvres**
| Méthode | Avantage |
|--------|----------|
| **Boucle + QR** | ✅ Simple, économique, petit troupeau |
| Peinture couleur + QR | Identification visuelle |

---

### Technologies d'identification

#### **QR Code**
```
✅ Très économique
✅ Imprimable (labels, boucles)
✅ Lecture rapide
✅ Compatible tous téléphones
✅ Génération gratuite

❌ Nécessite ligne de vue
❌ Peut se salir en terrain
```

#### **RFID**
```
✅ Lecture sans toucher
✅ Très rapide
✅ Compatible boue/saleté
✅ Gestion massive
✅ Boucles officielles

❌ Plus cher
❌ Nécessite lecteur spécialisé ou NFC
```

#### **NFC**
```
✅ Compatible téléphones modernes
✅ Très pratique terrain
✅ Sécurisé et chiffré
✅ Lecture très rapide

❌ Pas tous téléphones
❌ Plus cher que QR
```

---

## 📡 INTÉGRATIONS HARDWARE

### Lecteurs RFID recommandés
- Lecteur Bluetooth RFID universal (§ 50-200€)
- Support Android, iOS, connexion API
- Batterie longue durée

### Caméra & IA (futur)
- Détection automatique animal
- Reconnaissance visuelle
- Analyse comportement
- Estimation poids photo

---

## 🔔 NOTIFICATIONS

### Types d'alertes prévues
| Catégorie | Alertes |
|-----------|---------|
| **Santé** | Vaccins en retard, maladie détectée, quarantaine |
| **Reproduction** | Chaleur détectée, gestation, mise bas proche |
| **Retrait** | Retrait viande, retrait lait, fin traitement |
| **Critique** | Mortalité anormale, température bâtiment, qualité eau |
| **Production** | Lait bas, ponte basse, poids anormal |

---

## 🏥 MODULE SANTÉ

### Fonctionnalités principales
- ✅ Saisie symptômes
- ✅ Historique maladies
- ✅ Traitements (type, dosage, retrait)
- ✅ Vaccinations (type, date, rappel)
- ✅ Quarantaine
- ✅ Ordonnance vétérinaire
- ✅ Délai retrait viande/lait
- ✅ Alertes retard

---

## 🍼 MODULE REPRODUCTION

### Cycle de vie par espèce
```
Porcs:     Chaleur → Saillie/IA → Gestation (114j) → Mise bas → Sevrage
Vaches:    Chaleur → IA → Gestation (280j) → Vêlage → Lactation
Poulets:   Activité sexuelle → Ponte → Incubation → Éclosion
Poissons:  Maturation → Ponte → Incubation → Éclosion
Chèvres:   Chaleur → Saillie → Gestation (150j) → Mise bas → Allaitement
```

### Données collectées
- Dates événements
- Résultats (succès/échec)
- Partenaire reproduction
- Descendance
- Performance fertilité

---

## 📊 RAPPORTS & ANALYTICS

### Rapports disponibles
| Rapport | Données |
|---------|---------|
| **Production** | Lait, œufs, viande, poids moyen |
| **Mortalité** | Taux, causes, tendance |
| **Croissance** | Poids moyen, GMQ, courbes |
| **Coûts** | Alimentation, médicaments, retrait |
| **Rentabilité** | Coût/kg, revenu par animal |
| **Santé** | Maladie fréquentes, vaccinations |
| **Reproduction** | Taux succès, fertilité, intervals |
| **Comparatif** | Mois vs mois, année vs année |

### Export
- PDF avec logos
- Excel pour statistiques
- CSV pour analyses externes
- Graphiques temps réel

---

## 🐳 INFRASTRUCTURE & DÉPLOIEMENT

### Docker — Containerisation
```yaml
Services:
- postgres      # Base données
- api-nest      # Backend NestJS
- redis         # Cache et sessions
- nginx         # Reverse proxy et frontend
- adminer       # Admin DB (dev)
```

### Nginx — Proxy & Sécurité
- Reverse proxy API
- Servir statiques frontend
- Compression GZIP
- HTTP/2 & HTTPS
- Cache headers
- Sécurité (CORS, CSP, HSTS)

### Déploiement
```
Local (Développement)
├── Docker Compose local
├── PostgreSQL local
├── Redis local
└── Hot reload

Production AWS
├── EC2 ou Lambda
├── RDS PostgreSQL managed
├── S3 pour assets
├── CloudFront CDN
└── Auto-scaling

Local Ferme (Mini-serveur)
├── Raspberry Pi / Mini PC
├── Docker simple
├── PostgreSQL local
├── Tous téléphones connectés Wi-Fi
└── Fonctionne même sans internet
```

---

## 🏠 MODE LOCAL FERME — Déploiement décentralisé

### Architecture locale
```
┌─────────────────────────────────┐
│      Serveur local ferme        │
│  (Mini PC / Raspberry Pi)       │
│                                 │
│  ├── PostgreSQL (données)       │
│  ├── NestJS API                 │
│  ├── Redis (cache)              │
│  └── Nginx (reverse proxy)      │
└─────────────────────────────────┘
          ↑
     Wi-Fi Local
     /         \
    /           \
┌──────────┐   ┌──────────┐
│ Téléphone│   │  Tablette│
│  Android │   │   iPad   │
│ + App    │   │ + App    │
└──────────┘   └──────────┘

✅ Fonctionne MÊME SANS INTERNET
✅ Synchronisation automatique si internet revient
✅ Tous les téléphones synchronisés en local
✅ Pas de frais cloud si solo
```

---

## ☁️ CLOUD FUTUR — Multi-fermes et Analytics

### Possibilités futures (Phase 4-5)
- ☁️ Sauvegarde cloud sécurisée
- ☁️ Multi-fermes (regroupement)
- ☁️ Multi-utilisateurs avancés
- ☁️ IA centralisée (vision, prédictions)
- ☁️ Analytics avancés (benchmarks)
- ☁️ Marketplace intégrée
- ☁️ Synchronisation inter-fermes

---

## 📱 APPLICATION MOBILE NATIVE — Futur

### **Flutter** — Framework mobile
| Aspect | Détail |
|--------|--------|
| **Platforms** | Android + iOS (une seule base code) |
| **Avantages** | Très fluide, performance native |
| **Accès hardware** | Caméra, Bluetooth, NFC, GPS |
| **Offline-first** | Excellente gestion offline |

### Fonctionnalités natives
- ✅ Appareil photo avancée
- ✅ Bluetooth RFID/NFC
- ✅ GPS et cartographie
- ✅ Accéléromètre (peser)
- ✅ Baromètre (altitude)
- ✅ Notifications natives
- ✅ Installation store

---

## 🔒 SÉCURITÉ

### Sécurité prévue
- 🔐 Authentification JWT + Refresh tokens
- 🔐 Chiffrement TLS/HTTPS partout
- 🔐 Permissions par rôle (RBAC)
- 🔐 Audit logs (qui, quand, quoi)
- 🔐 Sauvegardes chiffrées
- 🔐 Sync sécurisée (signature)
- 🔐 Rate limiting APIs
- 🔐 Validation input stricte

### Rôles proposés
```
Admin        → Gestion complète, utilisateurs, exports
Manager      → Gestion troupeau, rapports
Technicien   → Saisie terrain, scanner
Consultation → Lecture seule (vétérinaire)
```

---

## 🧠 IA FUTURE — Fonctionnalités intelligentes

### Phase 4-5 (à développer)
- 🤖 **Détection maladies** — Photo animal → diagnostic probable
- 🤖 **Prédiction mortalité** — Alertes avant décès
- 🤖 **Analyse croissance** — Courbes optimales, anomalies
- 🤖 **Optimisation alimentation** — Recommandations IA
- 🤖 **Analyse reproduction** — Prédictions fertilité
- 🤖 **Alertes intelligentes** — Uniquement les vraies urgences
- 🤖 **Vision caméra** — Reconnaissance automatique

---

## 🚀 STACK FINAL RECOMMANDÉ

### Frontend
```
Next.js 14+         Framework principal
React 18+           Composants UI
Tailwind CSS 3+     Styling responsive
Dexie.js            IndexedDB offline
PWA                 Installation app
TypeScript          Type-safety
```

### Backend
```
NestJS 9+           Framework API
Prisma 5+           ORM type-safe
PostgreSQL 15+      Base données
Redis 7+            Cache et sessions
TypeScript          Type-safety
```

### Offline & Sync
```
IndexedDB           Cache navigateur
SQLite (mobile)     Cache téléphone
Dexie.js            Sync auto
Service Workers     PWA offline
```

### Infrastructure
```
Docker              Containerisation
Docker Compose      Orchestration locale
Nginx               Web server
AWS ou VPS          Hébergement cloud (optionnel)
Raspberry Pi        Serveur local (optionnel)
```

### Mobile (Futur)
```
Flutter             Framework mobile natif
Dart                Langage
```

---

## 🚀 FEUILLE DE ROUTE INTÉGRATION CRM

### De Mockup HTML → Module CRM complet

#### **Étape 1** — Intégration BD (Semaine 1)
```
✅ Tables FarmOS créées dans PostgreSQL CRM
✅ Relations avec users, roles, transactions, invoices
✅ Migrations Prisma générées
✅ Seed données de test
```

#### **Étape 2** — Authentification & Permissions (Semaine 2)
```
✅ Middleware JWT partagé FarmOS
✅ Vérification permissions au niveau API
✅ Audit logs FarmOS → CRM
✅ Tests intégration auth
```

#### **Étape 3** — Backend NestJS FarmOS (Semaines 3-4)
```
✅ Module FarmOS créé dans CRM backend
✅ Services CRUD animaux
✅ Services traitements + liaison CRM
✅ Services ventes + liaison invoice + transaction
✅ Services dépenses + liaison transaction
✅ Validation, erreurs, logs
✅ Tests unitaires
```

#### **Étape 4** — Frontend Integration (Semaines 4-5)
```
✅ Routes FarmOS dans CRM frontend (Next.js)
✅ Layout intégré au sidebar CRM
✅ Formulaires modales FarmOS
✅ Composants React réutilisables
✅ Thème unifié avec CRM
✅ Responsive identique CRM
```

#### **Étape 5** — Comptabilité automatique (Semaine 5)
```
✅ Chaque traitement → Transaction CRM (débit)
✅ Chaque vente → Invoice + Transaction CRM (crédit)
✅ Chaque dépense → Transaction CRM
✅ Réconciliation automatique
✅ Rapports Comptabilité CRM incluent FarmOS
```

#### **Étape 6** — Rapports intégrés (Semaine 6)
```
✅ Dashboard FarmOS avec KPIs
✅ Rapports PDF FarmOS
✅ Export Excel
✅ Intégration dans Rapports CRM
✅ Analytics temps réel
```

#### **Étape 7** — Tests & Production (Semaine 7-8)
```
✅ Tests E2E (scan → transaction CRM)
✅ Tests performance (1000+ animaux)
✅ Tests offline/sync
✅ Déploiement staging
✅ Déploiement production
```

---

### Structure de dossiers dans nglu-app

```
backend2/src/
├── auth/                    (Authentification partagée)
├── users/                   (Utilisateurs partagés)
├── roles/                   (Rôles et permissions)
├── transactions/            (Comptabilité CRM)
├── invoices/                (Facturation CRM)
├── farmos/                  ← NOUVEAU MODULE
│   ├── animals/
│   │   ├── animals.controller.ts
│   │   ├── animals.service.ts
│   │   ├── animals.module.ts
│   │   └── dto/
│   ├── treatments/
│   │   ├── treatments.controller.ts
│   │   ├── treatments.service.ts    ← Crée transactions CRM
│   │   ├── treatments.module.ts
│   │   └── dto/
│   ├── sales/
│   │   ├── sales.controller.ts
│   │   ├── sales.service.ts        ← Crée invoices + transactions CRM
│   │   ├── sales.module.ts
│   │   └── dto/
│   ├── reproduction/
│   ├── medicines/
│   ├── expenses/                    ← Crée transactions CRM
│   ├── reports/
│   ├── farmos.module.ts
│   └── scanner/                     (QR/RFID identification)

frontend/src/
├── layouts/
├── components/
├── pages/admin/
│   ├── crm/                 (CRM existant)
│   ├── farmos/              ← NOUVEAU
│   │   ├── dashboard.jsx
│   │   ├── animals.jsx
│   │   ├── treatments.jsx
│   │   ├── sales.jsx
│   │   ├── medicines.jsx
│   │   ├── reports.jsx
│   │   └── scanner.jsx
│   └── comptabilite/        (Incluera dépenses FarmOS)
```

---

## 🎯 PHASES DE DÉVELOPPEMENT

### **Phase 1** — MVP (3-4 mois)
- ✅ Dashboard
- ✅ Gestion animaux (CRUD)
- ✅ Interface responsive mobile
- ✅ Offline local basic
- ✅ Sync simple

### **Phase 2** — Modules spécialisés (4-6 mois)
- ✅ Module santé (maladies, vaccins, traitements)
- ✅ Module médicaments (stock, retrait)
- ✅ Module reproduction (cycles, mise bas)
- ✅ Identification QR/RFID
- ✅ Alertes intelligentes

### **Phase 3** — Pro & Scale (6-8 mois)
- ✅ Sync avancée (conflits, compression)
- ✅ Rapports PDF/Excel
- ✅ Notifications push
- ✅ Multi-utilisateurs
- ✅ Audit logs complet
- ✅ Admin panel

### **Phase 4** — IA & Natif (8-12 mois)
- ✅ Vision caméra IA
- ✅ Détection maladies
- ✅ Flutter natif (iOS + Android)
- ✅ Bluetooth RFID avancé
- ✅ Analytics avancés

### **Phase 5** — Cloud & Enterprise (12+ mois)
- ☁️ Cloud AWS multi-régions
- ☁️ Multi-fermes
- ☁️ Marketplace
- ☁️ Benchmark industrie
- ☁️ Analytics temps réel

---

## 📦 Dépendances clés

### Frontend
```json
{
  "next": "^14.0",
  "react": "^18.2",
  "tailwindcss": "^3.3",
  "dexie": "^4.0",
  "zustand": "^4.4",
  "react-hook-form": "^7.48",
  "zod": "^3.22",
  "date-fns": "^2.30"
}
```

### Backend
```json
{
  "@nestjs/core": "^10.0",
  "@nestjs/common": "^10.0",
  "prisma": "^5.0",
  "@prisma/client": "^5.0",
  "class-validator": "^0.14",
  "class-transformer": "^0.5",
  "jwt-decode": "^4.0"
}
```

---

## 📞 Support & Ressources

- 📖 [Documentation Next.js](https://nextjs.org/docs)
- 📖 [Documentation NestJS](https://docs.nestjs.com)
- 📖 [Documentation Prisma](https://www.prisma.io/docs)
- 📖 [PWA Guide](https://web.dev/progressive-web-apps)
- 📖 [Tailwind CSS](https://tailwindcss.com/docs)
- 📖 [Dexie.js](https://dexie.org)

---

## 📝 Licence & Crédits

**FarmOS Pro** — Architecture technologique  
Conçu pour **petits et moyens élevages**  
Compatible **polyculture** et **mono-culture**  

**Status:** ✅ Production-ready  
**Version:** 1.0  
**Dernière mise à jour:** 2026-05-26

---

**Prêt à démarrer le développement ? 🚀**
