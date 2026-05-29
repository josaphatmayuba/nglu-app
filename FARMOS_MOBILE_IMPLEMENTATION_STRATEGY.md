# 🚀 FarmOS + CRM Mobile — Plan de Travail 2026

**Date**: 2026-05-26  
**Status**: Ready to Start  
**Total Duration**: 12 weeks optimized (3-4 developers)  
**Jira Epics**: SCRUM-192 (Backend), SCRUM-191 (Frontend SPA), SCRUM-200 (CRM Integration), SCRUM-199 (Mobile Flutter)

### **Architecture Summary**

- **FarmOS**: Completely separate from CRM (new repository, new PostgreSQL database)
- **Authentication**: Shared JWT token (same secret) — login via CRM, valid on FarmOS
- **Integration**: Sidebar menu link in CRM → opens FarmOS SPA in new tab/window
- **Mobile**: Native Flutter app (iOS/Android), not web wrapper, same auth & sync logic
- **Databases**: CRM uses MySQL (backend2), FarmOS uses PostgreSQL (farmos-backend)

---

## 📊 Vue d'Ensemble: Scénario Choisi

```
┌─────────────────────────────────────────────────────────┐
│ SCÉNARIO OPTIMISÉ: FarmOS BACKEND RAPIDE + Mobile      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Semaines 1-3:   FarmOS Backend (database + API)      │
│  ├─ Jira: SCRUM-193 (DB schema) + SCRUM-194 (API)     │
│  └─ Deliverable: Production-ready API endpoints       │
│                                                         │
│  Semaines 4-14:  CRM Mobile (parallèle FarmOS frontend)│
│  ├─ Jira: SCRUM-196-199 (Phase 1-4)                   │
│  └─ Deliverable: PWA + Flutter apps                   │
│                                                         │
│  Semaines 7-11:  FarmOS Frontend (in parallel w/ Mobile)
│  ├─ Jira: SCRUM-195 (React components)               │
│  └─ Deliverable: React component library              │
│                                                         │
└─────────────────────────────────────────────────────────┘

⏱️  TOTAL: 14 semaines (vs 17+ sequential ou 11 mobile-only)
🎯 AVANTAGE: FarmOS API stable dès semaine 3, Mobile progress parallèle
```

---

## 📅 Timeline Détaillée

### **SEMAINES 1-3: FarmOS Backend (SCRUM-192)**

#### Week 1: Database Schema (SCRUM-193)
- **New Service**: `farmos-backend` (NestJS, separate repository)
- **Database**: PostgreSQL (separate from CRM's MySQL)
- **Files to Create**:
  ```
  farmos-app/
    └─ backend/
        ├─ src/
        │   ├─ database/
        │   │   ├─ schema.ts          (Drizzle ORM schema)
        │   │   └─ migrations/
        │   │       ├─ 0001_animals.sql
        │   │       ├─ 0002_treatments.sql
        │   │       ├─ 0003_medicines.sql
        │   │       ├─ 0004_sales.sql
        │   │       └─ 0005_farm_expenses.sql
        │   └─ app.module.ts
        ├─ docker-compose.yml        (PostgreSQL 15+)
        └─ migrations/
  ```
- **Tasks**:
  - [ ] Create `farmos-app` repository (separate from nglu-app)
  - [ ] Setup PostgreSQL locally with Docker Compose
  - [ ] Create Drizzle schema: animals, treatments, medicines, sales, farm_expenses
  - [ ] Add foreign keys: animals.farm_id, treatments.animal_id, sales.animal_id, etc.
  - [ ] Run migrations: `drizzle-kit generate` → apply to PostgreSQL
  - [ ] Verify schema: `\dt` in psql shows all tables
  - [ ] Document schema in FARMOS_JIRA_STORIES.md (already done ✅)

#### Weeks 2-3: Backend API Module (SCRUM-194)
- **Service**: `farmos-backend` (NestJS, PostgreSQL)
- **Structure**:
  ```
  farmos-app/
    └─ backend/src/
        ├─ farmos/                   (main module)
        │   ├─ animals/
        │   │   ├─ animals.module.ts
        │   │   ├─ animals.service.ts
        │   │   ├─ animals.controller.ts
        │   │   └─ dto/
        │   ├─ treatments/
        │   ├─ medicines/
        │   ├─ sales/
        │   └─ farm-expenses/
        ├─ auth/
        │   ├─ jwt.guard.ts           (verify JWT from CRM)
        │   └─ jwt.strategy.ts
        ├─ database/
        │   └─ database.module.ts     (Drizzle + PostgreSQL)
        ├─ app.module.ts
        └─ main.ts
  ```
- **API Endpoints** (see FARMOS_JIRA_STORIES.md for full specs):
  ```
  POST   /animals                 → Create animal
  GET    /animals                 → List (paginated)
  GET    /animals/:id             → Get single + related data
  PATCH  /animals/:id             → Update
  DELETE /animals/:id             → Soft-delete
  
  POST   /treatments              → Record treatment/vaccine
  GET    /treatments?animalId=X   → Filter by animal
  
  POST   /medicines               → Add medicine batch
  PATCH  /medicines/:id           → Update stock
  GET    /medicines               → List inventory
  
  POST   /sales                   → Record animal sale
  GET    /sales                   → List with filters
  
  POST   /farm-expenses           → Record expense (triggers sync)
  GET    /farm-expenses           → List (for CRM visibility)
  ```
- **Authentication**:
  - `JwtAuthGuard` on all routes (verify token from CRM)
  - Token claims: `{ sub, email, farmId, role }`
  - Same JWT secret as CRM backend2
- **Tasks**:
  - [ ] Create `FarmosModule` with all sub-modules
  - [ ] Implement all Services with Drizzle ORM + PostgreSQL
  - [ ] Implement all Controllers with `@UseGuards(JwtAuthGuard)`
  - [ ] Create DTOs with validation (class-validator)
  - [ ] Error handling: proper HTTP status codes + messages
  - [ ] Add JWT strategy (validate token from Authorization header)
  - [ ] Test with Postman: all endpoints (with valid JWT token)
  - [ ] Document endpoints in OpenAPI/Swagger

#### Week 3: Auto-Sync to CRM (SCRUM-195, part 1)
- **Integration**: FarmOS expenses → CRM transactions
- **Flow**:
  ```
  User records animal treatment in FarmOS:
    POST /treatments
    └─ { animalId, type: 'vaccine', cost: 500 }
  
  farmos-backend (PostgreSQL):
    ├─ Insert treatment record
    └─ If cost > 0: call backend2 integration endpoint
    
  Backend2 Integration Endpoint (MySQL):
    POST /property-management/farmos/sync-expense
    └─ Auth: JWT token (same secret as farmos-backend)
    ├─ Create CRM Transaction: { type: 'farmos-expense', amount: -500 }
    ├─ Insert into MySQL transactions table
    └─ Return { success: true, transactionId }
  
  farmos-backend:
    ├─ Store response transactionId
    ├─ Update treatment record: `transaction_id = 123`
    └─ Return to frontend
  
  Result:
    ✅ Expense visible in farmos-backend (PostgreSQL)
    ✅ Transaction visible in CRM (MySQL)
  ```
- **Tasks**:
  - [ ] In `farmos-backend` TreatmentsService: detect when cost > 0
  - [ ] Call backend2 REST endpoint: `POST http://backend2-url/property-management/farmos/sync-expense`
  - [ ] Include JWT token in Authorization header
  - [ ] Store returned transactionId in farmos_treatments.transaction_id
  - [ ] In `farmos-backend`: create new endpoint `POST /farmos/sync-expense` (called by farmos-backend)
  - [ ] In `backend2`: verify JWT token origin (farmos-backend service account)
  - [ ] Add error handling: retry if backend2 unreachable, queue for later sync
  - [ ] Test: Create treatment with cost → verify in both databases

### **WEEKS 4-6: CRM Mobile Phase 1 + FarmOS Frontend Start**

#### Phase 1: Responsive Design (SCRUM-196)
- **Target**: All CRM modules responsive on xs(320px) → lg(1024px)
- **Files to Update**:
  ```
  frontend/
    ├─ src/
    │   ├─ layouts/AdminLayout.jsx  (refactor: sidebar → hamburger on mobile)
    │   ├─ components/
    │   │   ├─ propertyManagement/
    │   │   │   └─ modules/*/
    │   │   │       ├─ *Panel.jsx
    │   │   │       └─ *Table.jsx (cards on mobile)
    │   │   ├─ transaction/
    │   │   ├─ sale/
    │   │   └─ ...
    │   └─ tailwind.config.js  (verify breakpoints)
  ```
- **Tasks**:
  - [ ] Refactor `AdminLayout.jsx`: collapse sidebar on sm breakpoint
  - [ ] Add mobile bottom navbar (5 tabs: Dashboard, Comptabilité, Propriétés, Clients, More)
  - [ ] Update all Tables → responsive cards on mobile
  - [ ] Test on Chrome DevTools (iPhone 12, Galaxy A13)
  - [ ] Verify buttons ≥ 48px × 48px touch target
  - [ ] Verify spacing ≥ 44px between clickable elements

#### Weeks 5-6: FarmOS Frontend Start (SCRUM-191)
- **New Repository**: `farmos-app` (separate from `nglu-app`)
- **Setup**:
  ```
  farmos-app/
    ├─ frontend/                 (React SPA)
    │   ├─ src/
    │   │   ├─ components/
    │   │   │   ├─ Identification/
    │   │   │   ├─ QuickEntry/
    │   │   │   ├─ Animals/
    │   │   │   ├─ History/
    │   │   │   └─ Layout.jsx
    │   │   ├─ services/
    │   │   │   ├─ farmos-api.js    (calls farmos-backend /farmos/*)
    │   │   │   ├─ crm-api.js       (calls backend2 /property-management for integration)
    │   │   │   └─ auth.js          (JWT from localStorage, shared with CRM)
    │   │   └─ App.jsx
    │   └─ package.json
    │
    └─ backend/                  (NestJS, separate service)
        ├─ src/
        │   ├─ farmos/
        │   │   ├─ animals/
        │   │   ├─ treatments/
        │   │   ├─ sales/
        │   │   └─ ...
        │   ├─ auth/             (verify JWT)
        │   ├─ database/         (Drizzle + PostgreSQL)
        │   └─ app.module.ts
        ├─ docker-compose.yml    (PostgreSQL)
        └─ package.json
  ```
- **Tasks**:
  - [ ] Initialize `farmos-app` repo (separate from nglu-app)
  - [ ] Create frontend React structure (copy from mockup)
  - [ ] Create backend NestJS structure (use schema from SCRUM-193)
  - [ ] Setup Docker PostgreSQL locally
  - [ ] Configure JWT verification in farmos-backend (share secret with CRM)
  - [ ] Test: Auth token from CRM login works on FarmOS endpoints

### **WEEKS 7-11: CRM Mobile Phase 2-3 + FarmOS Frontend Complete**

#### Phase 2A: Service Worker + PWA (SCRUM-197, part 1)
- **Tasks**:
  - [ ] Install Workbox: `npm install --save-dev workbox-*`
  - [ ] Create Service Worker with cache strategies:
    - Cache First: JS, CSS, images
    - Stale While Revalidate: images
    - Network First: API calls
  - [ ] Create `public/manifest.json` (PWA metadata)
  - [ ] Test: Add to Home Screen on Chrome mobile

#### Phase 2B: Dexie.js Offline Cache (SCRUM-197, part 2)
- **Schema**:
  ```javascript
  const db = new Dexie('CrmDB');
  db.version(1).stores({
    transactions: '++id, leaseId, date',
    properties: '++id, ownerId',
    leases: '++id, propertyId',
    customers: '++id, name',
    payments: '++id, leaseId, date',
    farmos_animals: '++id, farmId',
    farmos_treatments: '++id, animalId',
    farmos_sales: '++id, date'
  });
  ```
- **Tasks**:
  - [ ] Install Dexie.js
  - [ ] Create DB schema for CRM + FarmOS tables
  - [ ] Implement sync logic (read from local if offline, write to queue)

#### Phase 2C: Sync Queue (SCRUM-197, part 3)
- **Queue Structure**:
  ```typescript
  interface QueuedAction {
    id: string;
    type: 'create' | 'update' | 'delete';
    resource: 'transaction' | 'payment' | 'farmos_animal' | ...;
    data: any;
    timestamp: number;
    retries: number;
  }
  ```
- **Tasks**:
  - [ ] Create `useSyncQueue()` hook
  - [ ] Implement retry logic with exponential backoff
  - [ ] Background sync when online (Service Worker)
  - [ ] Conflict resolution: last-write-wins (compare timestamps)

#### Phase 3: Performance (SCRUM-198)
- **Tasks**:
  - [ ] Image lazy loading (IntersectionObserver)
  - [ ] WebP format with PNG fallback
  - [ ] API request batching (load 10 properties in 1 request)
  - [ ] Skeleton screens for lists
  - [ ] Lighthouse Mobile ≥ 80% target
  - [ ] Test FCP < 2s, TTI < 3s

#### FarmOS Frontend (SCRUM-195)
- **Parallel weeks 7-11**: Convert remaining mockup components
  - [ ] Animals list + detail pages
  - [ ] Treatments form + history
  - [ ] Medicines inventory
  - [ ] Sales recording
  - [ ] Integration with FarmOS API
  - [ ] Integration with CRM layout + auth

### **WEEKS 12-14: Phase 4 (Flutter) + Final Testing**

#### Phase 4: Flutter iOS/Android (SCRUM-199)
- **Structure**:
  ```
  flutter_app/
    ├─ lib/
    │   ├─ models/       (shared entities with web)
    │   ├─ services/     (API client, offline cache, sync)
    │   └─ ui/           (Flutter widgets)
    ├─ pubspec.yaml      (dependencies: Provider, Hive, Dio)
  ```
- **Tasks**:
  - [ ] Flutter project setup
  - [ ] Authentication (JWT same as web)
  - [ ] Offline cache (Hive)
  - [ ] Sync engine (same business logic as web)
  - [ ] Key screens: Dashboard, Transactions, Properties, Payments
  - [ ] Native integrations: Camera, Geolocation
  - [ ] TestFlight (iOS), Google Play (Android)

#### Final Testing & Deployment
- **QA**:
  - [ ] End-to-end offline flow (create transaction offline, sync online)
  - [ ] Conflict resolution (edit same record in web + mobile)
  - [ ] Lighthouse Mobile audit
  - [ ] Device testing (iPhone, Galaxy)
  - [ ] FarmOS API integration with mobile
  - [ ] Auto-sync transactions to CRM Comptabilité

---

## 🏗️ Architecture: Separate FarmOS Stack

### **Deployment Model**

Three **independent apps** with shared authentication:

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CRM SPA (React)                                     │
│     ├─ Dashboard, Comptabilité, Immobilier, Clients    │
│     ├─ Sidebar menu: Lien "→ FarmOS"                   │
│     └─ API: backend2 (MySQL/NestJS)                    │
│                                                         │
│  2. FarmOS SPA (React, Separate)                        │
│     ├─ Identification, QuickEntry, Animals, History    │
│     ├─ API: farmos-backend (PostgreSQL/NestJS)         │
│     └─ JWT: Shared token from CRM auth                 │
│                                                         │
│  3. Mobile Apps (Flutter, iOS/Android)                 │
│     ├─ Same features as FarmOS SPA                     │
│     ├─ Native integrations: Camera, GPS, offline       │
│     └─ JWT: Same auth token as web                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  BACKEND LAYER                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CRM Backend (backend2)                                 │
│  ├─ NestJS + Drizzle ORM                               │
│  ├─ MySQL (legacy CRM data)                            │
│  ├─ Routes: /property-management, /transaction, etc.   │
│  └─ Auth: JWT sign/verify                              │
│                                                         │
│  FarmOS Backend (New Service)                           │
│  ├─ NestJS + Drizzle ORM                               │
│  ├─ PostgreSQL (animals, treatments, sales, etc.)      │
│  ├─ Routes: /animals, /treatments, /sales, etc.        │
│  └─ Auth: JWT verify (same secret as CRM)              │
│                                                         │
│  **Integration Endpoint** (in backend2)                 │
│  ├─ `POST /property-management/payments/reminder`      │
│  ├─ Auto-sync: FarmOS expenses → CRM transactions      │
│  └─ Cross-service calls (REST or internal)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### **Authentication Flow**

```
User logs in via CRM SPA
    ↓
CRM Backend (backend2) generates JWT token
    └─ Claims: { sub, email, farmId, role }
    └─ Secret: SHARED_JWT_SECRET (env var)

Token stored in browser localStorage
    ↓
User navigates to FarmOS SPA
    ↓
FarmOS SPA sends request with Authorization header
    ↓
FarmOS Backend validates JWT (same secret)
    └─ If valid: process request
    └─ If invalid: return 401
```

### **Data Integration**

Farm expenses → Auto-sync to CRM transactions:

```
User records expense in FarmOS:
    POST /animals/treatments
    └─ { animalId, description, cost: 500 }

FarmOS Backend:
    ├─ Insert into farmos_animals_treatments (PostgreSQL)
    └─ If expense type: POST to backend2 integration endpoint
              ↓
Backend2 Integration Endpoint:
    ├─ Verify FarmOS token validity
    ├─ Create CRM Transaction: { amount: -500, type: 'farmos-expense' }
    ├─ Insert into MySQL transactions table
    └─ Return { success: true, transactionId }

Result:
    └─ Expense visible in both FarmOS and CRM Comptabilité
```

### **Database Separation**

| Data | Database | Service | Tables |
|------|----------|---------|--------|
| CRM Core | MySQL | backend2 | customers, transactions, properties, leases, etc. |
| FarmOS | PostgreSQL | farmos-backend | animals, treatments, medicines, sales, farm_expenses, etc. |
| Auth | Shared Secret | Both Services | JWT secret in environment variables |

---

## 📊 Jira Tickets Reference

See **FARMOS_JIRA_STORIES.md** for complete story definitions with acceptance criteria, tasks, and database schema examples.

### **Epic Structure**

| ID | Titre | Type | Estimation | Status |
|---|---|---|---|---|
| **SCRUM-192** | **FarmOS Backend** | Epic | 18 points | Backlog |
| SCRUM-193 | Database Schema | Story | 5 pts | Todo |
| SCRUM-194 | CRUD API Endpoints | Story | 8 pts | Todo |
| SCRUM-195 | Auto-Sync to CRM | Story | 5 pts | Todo |
| **SCRUM-191** | **FarmOS Frontend React SPA** | Epic | 64 points | Backlog |
| SCRUM-196 | Identification Module | Story | 13 pts | Todo |
| SCRUM-197 | QuickEntry Module | Story | 21 pts | Todo |
| SCRUM-198 | History & Animals | Story | 13 pts | Todo |
| SCRUM-199 | Integration & Offline Sync | Story | 17 pts | Todo |
| **SCRUM-200** | **CRM Integration** | Epic | 8 points | Backlog |
| SCRUM-201 | Sidebar Menu & Navigation | Story | 3 pts | Todo |
| SCRUM-202 | Shared JWT Auth | Story | 5 pts | Todo |
| **SCRUM-199** | **Mobile Flutter Apps** | Epic | 34 points | Backlog |
| SCRUM-203 | Setup & Navigation | Story | 5 pts | Todo |
| SCRUM-204 | Scanner Integration | Story | 8 pts | Todo |
| SCRUM-205 | Mobile Forms | Story | 8 pts | Todo |
| SCRUM-206 | Sync & Offline Mode | Story | 8 pts | Todo |
| SCRUM-207 | Native Integrations | Story | 5 pts | Todo |

**Total**: 98 points / ~12 weeks / 4 developers

---

## ✅ Acceptance Criteria

### FarmOS Backend (SCRUM-192)
- [x] All endpoints (CRUD animals, treatments, medicines, sales)
- [x] JWT auth guard on all endpoints
- [x] Auto-sync: expense → CRM transaction
- [x] Tests passing
- [x] Postman collection created
- [x] DB migrations run successfully

### FarmOS Frontend (SCRUM-195)
- [x] All mockup pages converted to React
- [x] API integration working
- [x] Offline support (reads from Dexie cache)
- [x] Mobile responsive (xs-lg breakpoints)
- [x] Integration with CRM layout

### CRM Mobile (SCRUM-191)
- [x] All modules responsive (320-1024px)
- [x] PWA installable
- [x] Service Worker caching working
- [x] Dexie offline cache functional
- [x] Sync queue: offline → online flow
- [x] Lighthouse Mobile ≥ 80%
- [x] Flutter apps on App Store + Google Play
- [x] Push notifications working

---

## 🔄 Dependencies & Sequencing

```
SCRUM-193 (DB schema)
    ↓ (required before)
SCRUM-194 (Backend API)
    ↓ (required before)
SCRUM-195 (Frontend)
    
    ↓ (parallel with FarmOS frontend)

SCRUM-196 (Responsive)
    ↓
SCRUM-197 (Offline)
    ↓
SCRUM-198 (Performance)
    ↓
SCRUM-199 (Flutter)
```

---

## 🚀 Getting Started This Week

### Monday (Day 1):
1. ✅ Jira epics + stories created (DONE)
2. [ ] Create `backend2/src/farmos/` folder structure
3. [ ] Design FarmOS database schema (animals, treatments, etc.)
4. [ ] Start Drizzle migrations

### Tuesday-Wednesday:
4. [ ] Implement FarmosService with CRUD methods
5. [ ] Create FarmosController with endpoints
6. [ ] Test endpoints with Postman

### Thursday-Friday:
7. [ ] Refactor AdminLayout for mobile (responsive sidebar)
8. [ ] Start FarmOS React components (parallel)
9. [ ] Deploy to dev environment

---

## 📞 Questions Before Starting?

1. **FarmOS Repository**: Separate git repo or folder in nglu-app?
2. **Frontend FarmOS**: Integrate into CRM menu, or separate React app?
3. **Database**: Use same MySQL as CRM, or separate FarmOS DB?
4. **Team**: How many developers? (Affects parallelization)

---

**Next Step**: Begin SCRUM-193 (Database Schema) on Monday 🚀

Jira: https://14735340canadainc.atlassian.net/browse/SCRUM-192
