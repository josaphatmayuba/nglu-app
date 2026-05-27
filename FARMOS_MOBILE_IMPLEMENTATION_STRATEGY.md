# 🚀 FarmOS + CRM Mobile — Plan de Travail 2026

**Date**: 2026-05-26  
**Status**: Ready to Start  
**Total Duration**: 13-14 semaines (Scénario optimisé)  
**Jira Epics**: SCRUM-192 (FarmOS), SCRUM-191 (Mobile)

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

#### Semaine 1: Database Schema
- **Jira**: SCRUM-193
- **Fichiers à créer**:
  ```
  backend2/
    ├─ migrations/
    │   ├─ create_animals_table.sql
    │   ├─ create_treatments_table.sql
    │   ├─ create_medicines_table.sql
    │   ├─ create_sales_table.sql
    │   └─ create_reproduction_events_table.sql
    └─ src/
        └─ farmos/
            └─ schemas/
                ├─ animal.schema.ts
                ├─ treatment.schema.ts
                └─ ...
  ```
- **Tâches**:
  - [ ] Drizzle migrations (animals, treatments, medicines, sales, reproductionEvents)
  - [ ] Create tables: `farmos_animals`, `farmos_treatments`, `farmos_medicines`, `farmos_sales`, `farmos_farm_expenses`
  - [ ] Add foreign keys to `farms` table (multi-tenancy)
  - [ ] Run migrations on dev DB
  - [ ] Verify schema with `SHOW TABLES;`

#### Weeks 2-3: Backend API Module
- **Jira**: SCRUM-194
- **Architecture**:
  ```
  backend2/src/farmos/
    ├─ farmos.module.ts         (imports, exports)
    ├─ farmos.service.ts        (CRUD logic)
    ├─ farmos.controller.ts      (routes: /farmos/*)
    ├─ dto/
    │   ├─ create-animal.dto.ts
    │   ├─ create-treatment.dto.ts
    │   └─ ...
    └─ entities/
        ├─ animal.entity.ts
        ├─ treatment.entity.ts
        └─ ...
  ```
- **Endpoints to Implement**:
  ```
  POST   /farmos/animals           → Create animal
  GET    /farmos/animals           → List all
  GET    /farmos/animals/:id       → Get single
  PATCH  /farmos/animals/:id       → Update
  DELETE /farmos/animals/:id       → Delete
  
  POST   /farmos/treatments        → Record treatment
  GET    /farmos/treatments?animalId=X → Filter by animal
  
  POST   /farmos/medicines         → Add medicine stock
  PATCH  /farmos/medicines/:id     → Update stock
  
  POST   /farmos/sales             → Record sale
  GET    /farmos/sales             → List sales
  
  POST   /farmos/farm-expenses     → Record expense
  GET    /farmos/farm-expenses     → List expenses (for auto-sync)
  ```
- **Tâches**:
  - [ ] Create `FarmosModule` in `app.module.ts`
  - [ ] Implement `FarmosService` with Drizzle ORM
  - [ ] Implement `FarmosController` with `@UseGuards(JwtAuthGuard)`
  - [ ] Add DTOs with validation (@IsNumber, @IsString, etc.)
  - [ ] Test endpoints with Postman (local)
  - [ ] Add error handling (404 if animal not found, etc.)

#### Semaine 3: Auto-Sync to CRM
- **Task**: `FarmOS: Auto-sync to CRM Comptabilité`
- **Logic**:
  ```
  POST /farmos/farm-expenses { amount: 500, currency: 'MAD', description: 'Medication' }
    ↓ (auto-trigger)
    ├─ Create CRM Transaction: { leaseId: null, amount: -500, type: 'farmos-expense' }
    ├─ Insert into `transactions` table
    └─ Return { success: true, transactionId: 123 }
  ```
- **Tâches**:
  - [ ] In `FarmosService.createExpense()`: call `TransactionsService.createTransaction()`
  - [ ] Create relationship: `farmos_farm_expenses.transaction_id` → `transactions.id`
  - [ ] Test: Create expense → verify transaction appears in CRM

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

#### Phase 1 + FarmOS Frontend (Weeks 5-6)
- **Parallel**: Start converting mockup to React
  ```
  frontend/src/components/farmos/
    ├─ FarmosLayout.jsx
    ├─ Animals/
    │   ├─ AnimalList.jsx
    │   ├─ AnimalDetail.jsx
    │   └─ AnimalModal.jsx
    ├─ Treatments/
    ├─ Medicines/
    ├─ Sales/
    └─ ...
  ```

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

## 🏗️ Architecture: FarmOS Backend

```
FarmOS (Nuevo Proyecto, Separado)
    ↓ (API REST)
    ├─ POST /farmos/animals
    ├─ POST /farmos/treatments
    ├─ POST /farmos/farm-expenses
    └─ GET /farmos/sales
          ↓
    backend2 (NestJS)
          ↓
    ├─ Farmos Service (CRUD, auto-accounting)
    ├─ Transactions Service (auto-create from expenses)
    └─ MySQL Database (shared)
          ↓
    CRM Comptabilité Module
    └─ Transactions visible in CRM

Frontend FarmOS (React)
    ↓ (Calls)
    └─ Backend2 /farmos/* endpoints
          ↓
    CRM Layout + Auth
```

---

## 📊 Jira Tickets Reference

| ID | Titre | Durée | Status |
|---|---|---|---|
| **SCRUM-192** | **FarmOS Epic** | - | Backlog |
| SCRUM-193 | Database schema | 3d | Todo |
| SCRUM-194 | Backend NestJS CRUD | 10d | Todo |
| SCRUM-195 | Frontend React | 10d | Todo |
| **SCRUM-191** | **CRM Mobile Epic** | - | Backlog |
| SCRUM-196 | Phase 1: Responsive | 10d | Todo |
| SCRUM-197 | Phase 2: Offline-First | 15d | Todo |
| SCRUM-198 | Phase 3: Performance | 10d | Todo |
| SCRUM-199 | Phase 4: Flutter | 20d | Todo |

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
