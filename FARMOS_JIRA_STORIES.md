# FarmOS — Jira Stories (SCRUM-192, 191, 199, 200)

**Project**: NgluApp - FarmOS Module  
**Created**: 2026-05-26  
**Architecture**: SPA Séparée (React) + Backend Partagé (NestJS) + Mobile Flutter  
**Template Source**: `mockup/FarmOS Pro/src/`

---

## 🏗️ EPIC SCRUM-192: FarmOS Backend (NestJS + Postgres)

**Duration**: 3 weeks  
**Points**: 34  
**Goal**: Production-ready API with database schema, CRUD operations, and CRM transaction sync

---

## SCRUM-193: Database Schema — Postgres Migrations

**Type**: Story  
**Points**: 5  
**Duration**: 3 days  
**Priority**: P0 (Blocker for API)

### Description
Create Postgres database schema for FarmOS using Drizzle ORM migrations. Initialize tables for animals, treatments, medicines, sales, reproduction events, and farm expenses with proper foreign keys and relationships.

**Template Source**: Mockup data structure from `mockup/FarmOS Pro/src/data.jsx`

### Tasks
- [ ] Create Drizzle migration files in `backend2/src/farmos/migrations/`
  - [ ] `001_create_animals_table.sql`
  - [ ] `002_create_treatments_table.sql`
  - [ ] `003_create_medicines_table.sql`
  - [ ] `004_create_sales_table.sql`
  - [ ] `005_create_reproduction_events_table.sql`
  - [ ] `006_create_farm_expenses_table.sql`
- [ ] Add multi-tenancy: `farm_id` FK to `farms` table (CRM)
- [ ] Create indexes on frequently-queried columns (species, date, farm_id)
- [ ] Run migrations on local dev Postgres
- [ ] Verify schema with `\d+ farmos_*` in psql
- [ ] Document schema diagram in `backend2/docs/farmos-schema.md`

### Acceptance Criteria
- ✅ All 6 tables created in Postgres
- ✅ Foreign keys established to `farms` table
- ✅ Indexes on (farm_id, species, created_at)
- ✅ Migrations are idempotent and reversible
- ✅ Schema verified with sample data insert

### Database Schema

```sql
-- Animals
CREATE TABLE farmos_animals (
  id UUID PRIMARY KEY,
  farm_id INT NOT NULL REFERENCES farms(id),
  external_id VARCHAR(50),  -- BQ-2024-0118
  name VARCHAR(255),
  species VARCHAR(50),  -- cow, pig, chicken, fish, goat, sheep, rabbit, duck, turkey
  sex CHAR(1),  -- F, M, Mixte
  weight DECIMAL(10,2),
  race VARCHAR(100),
  lot VARCHAR(50),
  barn VARCHAR(100),
  date_of_birth DATE,
  status VARCHAR(20),  -- healthy, treatment, alert
  withdrawal BOOLEAN DEFAULT false,
  last_event VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Treatments
CREATE TABLE farmos_treatments (
  id UUID PRIMARY KEY,
  farm_id INT NOT NULL REFERENCES farms(id),
  animal_id UUID NOT NULL REFERENCES farmos_animals(id),
  disease VARCHAR(255),
  medicine VARCHAR(255),
  route VARCHAR(50),  -- injection, oral, water, feed, pond, spray
  dosage VARCHAR(100),
  start_date DATE,
  duration_days INT,
  withdrawal_milk_hours INT,
  withdrawal_meat_days INT,
  status VARCHAR(20),  -- running, completed
  created_at TIMESTAMP DEFAULT NOW()
);

-- Medicines/Stock
CREATE TABLE farmos_medicines (
  id UUID PRIMARY KEY,
  farm_id INT NOT NULL REFERENCES farms(id),
  name VARCHAR(255),
  quantity DECIMAL(10,2),
  unit VARCHAR(20),  -- mg, L, units
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sales
CREATE TABLE farmos_sales (
  id UUID PRIMARY KEY,
  farm_id INT NOT NULL REFERENCES farms(id),
  animal_id UUID REFERENCES farmos_animals(id),
  quantity INT,
  price DECIMAL(12,2),
  currency VARCHAR(3),
  sale_date DATE,
  buyer VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reproduction Events
CREATE TABLE farmos_reproduction_events (
  id UUID PRIMARY KEY,
  farm_id INT NOT NULL REFERENCES farms(id),
  animal_id UUID NOT NULL REFERENCES farmos_animals(id),
  event_type VARCHAR(50),  -- heat, ai, birth
  event_date DATE,
  male_id VARCHAR(255),
  live_births INT,
  stillborn INT,
  birth_weight DECIMAL(10,2),
  difficulty VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Farm Expenses (auto-sync to CRM transactions)
CREATE TABLE farmos_farm_expenses (
  id UUID PRIMARY KEY,
  farm_id INT NOT NULL REFERENCES farms(id),
  transaction_id INT REFERENCES transactions(id),  -- CRM link
  amount DECIMAL(12,2),
  currency VARCHAR(3),
  description VARCHAR(255),
  expense_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## SCRUM-194: Backend NestJS CRUD Module — Farmos Service & Controller

**Type**: Story  
**Points**: 8  
**Duration**: 10 days  
**Priority**: P0  
**Depends On**: SCRUM-193

### Description
Implement production-ready NestJS module with Drizzle ORM service and REST controller for FarmOS. Provide CRUD endpoints for animals, treatments, medicines, sales, and reproduction events. Include JWT auth guard and error handling.

**Template Source**: None (pure backend), but mirrors mockup data model

### Tasks
- [ ] Create `backend2/src/farmos/` folder structure
- [ ] Implement `FarmosService` with Drizzle ORM
  - [ ] `createAnimal()`, `getAnimal()`, `updateAnimal()`, `deleteAnimal()`
  - [ ] `createTreatment()`, `getTreatments()`
  - [ ] `createMedicine()`, `updateMedicineStock()`
  - [ ] `createSale()`, `getSales()`
  - [ ] `recordReproductionEvent()`
  - [ ] `createExpense()` + auto-call to TransactionsService
- [ ] Implement `FarmosController` with routes:
  - [ ] `POST /farmos/animals`
  - [ ] `GET /farmos/animals` (paginated, filter by species)
  - [ ] `GET /farmos/animals/:id`
  - [ ] `PATCH /farmos/animals/:id`
  - [ ] `DELETE /farmos/animals/:id`
  - [ ] `POST /farmos/treatments`
  - [ ] `GET /farmos/treatments?animalId=X`
  - [ ] `POST /farmos/medicines`
  - [ ] `PATCH /farmos/medicines/:id`
  - [ ] `POST /farmos/sales`
  - [ ] `GET /farmos/sales`
  - [ ] `POST /farmos/reproduction`
  - [ ] `POST /farmos/farm-expenses`
  - [ ] `GET /farmos/farm-expenses`
- [ ] Add `@UseGuards(JwtAuthGuard)` to all endpoints
- [ ] Create DTOs with validation (`@IsNumber`, `@IsString`, etc.)
- [ ] Add error handling (404, 400, 500)
- [ ] Write unit tests for service methods
- [ ] Document endpoints in Postman collection

### Acceptance Criteria
- ✅ All 13 endpoints functional and tested
- ✅ JWT auth guard enforced
- ✅ DTOs validate all inputs
- ✅ Error responses follow API standard
- ✅ Postman collection created and shared
- ✅ Pagination works (limit, offset)

### Endpoints Example

```
POST /farmos/animals
Body: {
  externalId: "BQ-2024-0118",
  name: "Marguerite",
  species: "cow",
  sex: "F",
  weight: 450,
  race: "Holstein",
  lot: "Lot A",
  barn: "Étable 1"
}
Response: 201 { id, createdAt, ... }

POST /farmos/farm-expenses
Body: {
  amount: 500,
  currency: "MAD",
  description: "Medication for animal X"
}
Response: 201 { id, transactionId, ... }
  → Auto-creates CRM transaction
```

---

## SCRUM-195: Auto-Sync Farm Expenses → CRM Transactions

**Type**: Story  
**Points**: 5  
**Duration**: 5 days  
**Priority**: P1  
**Depends On**: SCRUM-194, CRM transactions API

### Description
Implement automatic synchronization of farm expenses to CRM Comptabilité module. When a farm expense is recorded (POST /farmos/farm-expenses), automatically create a corresponding CRM transaction with proper accounting entries.

### Tasks
- [ ] In `FarmosService.createExpense()`: call `TransactionsService.createTransaction()`
- [ ] Create relationship: `farmos_farm_expenses.transaction_id` → `transactions.id` (FK)
- [ ] Map expense fields → transaction fields:
  - `amount` → `amount` (negative for expense)
  - `currency` → `currency`
  - `description` → `description`
  - `farm_id` → `farmId` (link to property)
  - `expense_date` → `transactionDate`
  - Type: `"farmos-expense"`
- [ ] Error handling: if transaction creation fails, rollback expense
- [ ] Write integration test: Create expense → verify transaction appears in CRM
- [ ] Document workflow in `backend2/docs/farmos-crm-sync.md`

### Acceptance Criteria
- ✅ Farm expense creates CRM transaction
- ✅ Fields mapped correctly
- ✅ Expense type labeled "farmos-expense"
- ✅ Transaction appears in CRM Comptabilité within 1s
- ✅ Rollback works on error

---

## 🎨 EPIC SCRUM-191: FarmOS Frontend SPA (React)

**Duration**: 8 weeks  
**Points**: 55  
**Goal**: Complete React SPA with identification scanner, animal management, and offline support

---

## SCRUM-195a: Identification Module — Scanner & Result Card

**Type**: Story  
**Points**: 13  
**Duration**: 10 days  
**Priority**: P0

### Description
Implement the Identification module as core field scanner for FarmOS. Include 6 scanner modes (barcode, QR, RFID, face recognition, photo, manual), camera viewport with mode-specific overlays, and result card with quick actions.

**Template Source**: `mockup/FarmOS Pro/src/identification.jsx`  
**Mockup URL**: `http://localhost:8080/FarmOS%20Pro.html` → Click "Identification"

### Sub-Tasks
- [ ] Create route `/farmos/identification` in FarmOS app
- [ ] Build mode selector (6 horizontal scrollable tabs)
  - [ ] Code-barre (barcode icon)
  - [ ] QR code (qr icon)
  - [ ] RFID / NFC (rfid icon)
  - [ ] Reco faciale (user icon)
  - [ ] Photo (camera icon)
  - [ ] Manuel (edit icon)
- [ ] Implement camera viewport component
  - [ ] SVG barn/animal silhouette background
  - [ ] Dark gradient overlay
  - [ ] Mode-specific overlays:
    - [ ] Barcode: corner brackets + scan lines
    - [ ] QR: larger corner brackets + scan area
    - [ ] RFID: concentric pulse waves (@keyframe animation)
    - [ ] Face: rotating circle + feature points + connecting lines
    - [ ] Photo: rule-of-thirds grid + auto-focus square
  - [ ] Top HUD: status indicator (ready/scanning) + flash/rotate buttons
  - [ ] Bottom message pill: mode-specific instruction text
- [ ] Implement scan button with mode-dependent behavior
  - [ ] Barcode/QR/Manual: "Scanner" button
  - [ ] RFID: "Détecter" button
  - [ ] Face: "Reconnaître" button
  - [ ] Photo: "Capturer" button + white center dot
- [ ] Add scanning animation (1700ms default, 1100ms RFID, 2200ms face)
- [ ] Implement manual entry form
  - [ ] Search input (ID or name)
  - [ ] Real-time autocomplete (filter ANIMALS)
  - [ ] Max 5 results, clickable cards
- [ ] Build result card
  - [ ] Success banner (animal found + method)
  - [ ] Animal info card (photo placeholder + details)
  - [ ] 6 action buttons (see, treatment, production, photo, weight, death)
  - [ ] Rescan button (reset state)
- [ ] Implement recent identifications list
  - [ ] Show last 6 scans
  - [ ] Card per scan: species icon + name + ID + method + time
  - [ ] Click to show result card
  - [ ] Update in real-time
- [ ] Add "Gallery" button (future: view all history)
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Bilingual (FR/EN) labels

### Acceptance Criteria
- ✅ 6 scanner modes switch without errors
- ✅ Camera viewport displays correctly (3:4 aspect ratio, 460px max)
- ✅ Overlays match mockup (barcode lines, RFID pulse, face rotation, etc.)
- ✅ Scanning animation fires (1700ms default)
- ✅ Result card shows animal details + 6 actions
- ✅ Manual entry autocomplete works (type "Marguerite" → results)
- ✅ Recent list updates after each scan
- ✅ Responsive on iPhone 12 (390px), iPad (820px), Desktop (1440px)
- ✅ FR/EN labels correct and complete

### Mockup Reference
```
File: mockup/FarmOS Pro/src/identification.jsx (585 lines)
  ├─ Identification component (main)
  ├─ CameraViewport (scanner view)
  ├─ BarcodeOverlay, QrOverlay, RfidOverlay, FaceOverlay, PhotoOverlay
  ├─ CameraBackground (SVG barn + animal)
  ├─ ManualEntry (search form)
  └─ ResultCard (animal details + actions)
```

---

## SCRUM-195b: QuickEntry Drawer — 6 Adaptive Forms

**Type**: Story  
**Points**: 21  
**Duration**: 15 days  
**Priority**: P0  
**Depends On**: SCRUM-195a (Identification triggers QuickEntry)

### Description
Implement the QuickEntry drawer with 6 specialized forms for recording farm data. Forms adapt fields based on selected animal species (e.g., cattle gets ear tag field, poultry hides sex field). Include validation, error handling, and submission to backend.

**Template Source**: `mockup/FarmOS Pro/src/quickentry.jsx`

### Sub-Tasks

#### **Form 1: Animal Form** (New Animal Registration)
- [ ] Species selector (pill buttons for all SPECIES)
- [ ] Identification section:
  - [ ] ID/Tag (required, auto-placeholder per species)
  - [ ] Name (optional, except poultry/fish)
  - [ ] Count (required for poultry/fish)
- [ ] Race dropdown (species-specific breeds)
- [ ] Sex (F/M toggle, NOT for poultry/fish)
- [ ] Date of birth (date picker)
- [ ] Weight (kg) input
- [ ] Location: Barn/Bassin + Lot inputs
- [ ] Species-specific sections:
  - [ ] Cattle: Official ear tag + Lactation #
  - [ ] Pigs: Type dropdown + Room number
  - [ ] Fish: Oxygen + pH + Water temp + Density
  - [ ] Poultry: Temperature + Humidity + Age
- [ ] Notes textarea
- [ ] Adaptive note banner: "[X] fields specific to [Species]"
- [ ] Validation: required fields marked with *
- [ ] POST `/farmos/animals` on submit

#### **Form 2: Production Form**
- [ ] Species selector
- [ ] Date input + Period (AM/PM/Daily)
- [ ] Animal/Batch dropdown
- [ ] Value input (species-dependent):
  - [ ] Milk: Volume (L)
  - [ ] Eggs: Count
  - [ ] Growth: Avg weight (kg)
  - [ ] Wool: Shearing (kg)
- [ ] Quality metrics (species-dependent):
  - [ ] Milk: Fat %, Protein %, Conductivity
  - [ ] Eggs: Broken, Avg size, Lay rate %
- [ ] Notes textarea
- [ ] POST `/farmos/production` on submit

#### **Form 3: Health Form** (Treatment, Vaccine, Exam)
- [ ] Kind selector (3 pills: Treatment, Vaccine, Exam)
- [ ] Target section:
  - [ ] Application type (Individual/Batch/Collective)
  - [ ] Species dropdown
  - [ ] Animal/Batch dropdown
- [ ] Treatment branch (if selected):
  - [ ] Disease reason dropdown (species-specific)
  - [ ] Medicine dropdown (filtered by species)
  - [ ] Route dropdown (injection, oral, water, feed, pond, spray)
  - [ ] Dosage input
  - [ ] Start date + Duration (days)
  - [ ] Withdrawal banner (auto-calculated: "Milk: 96h · Meat: 28d · Eggs: 7d")
- [ ] Vaccine branch:
  - [ ] Vaccine name input
  - [ ] Date + Animal count
  - [ ] Next booster date
- [ ] Exam branch:
  - [ ] Veterinarian dropdown
  - [ ] Date input
  - [ ] Diagnosis textarea
- [ ] POST `/farmos/treatments` on submit

#### **Form 4: Stock Form** (In/Out)
- [ ] Mode toggle (Stock in / Stock out)
- [ ] Product dropdown (grouped: Aliment, Médicaments)
- [ ] Quantity input (required)
- [ ] Date input
- [ ] Stock in:
  - [ ] Supplier input
  - [ ] Total cost ($)
  - [ ] Invoice # (mono)
  - [ ] Expiry date
- [ ] Stock out:
  - [ ] Destination/Batch input
- [ ] POST `/farmos/stock/in` or `/farmos/stock/out` on submit

#### **Form 5: Repro Form** (Heat, AI, Birth)
- [ ] Kind selector (3 pills: Heat, AI, Birth)
- [ ] Species dropdown (only repro-capable species)
- [ ] Female dropdown (sex = F or Mixte)
- [ ] Event date (required)
- [ ] AI branch:
  - [ ] Male/Semen input
- [ ] Birth branch:
  - [ ] Live births count
  - [ ] Stillborn count
  - [ ] Avg weight (kg)
  - [ ] Difficulty (Easy/Assisted/Hard/Cesarean)
- [ ] Notes textarea
- [ ] POST `/farmos/reproduction` on submit

#### **Form 6: Death Form**
- [ ] Red warning banner: "Déclaration de mortalité"
- [ ] Species dropdown
- [ ] Animal/Batch dropdown
- [ ] Date (required) + Count (required)
- [ ] Suspected cause dropdown (Disease, Accident, Birthing, Heat stress, Predation, Unknown, Sanitary cull)
- [ ] Details textarea
- [ ] Necropsy requested (checkbox)
- [ ] POST `/farmos/mortality` on submit

### General Form Features
- [ ] All forms: Cancel button (gray) + Save button (primary)
- [ ] Validation: required fields marked with *, show error messages
- [ ] Success toast after submit: "Enregistré" + relevant data
- [ ] Error handling: show error toast if API fails
- [ ] Drawer closes on successful submit
- [ ] Reset form when drawer reopens

### Acceptance Criteria
- ✅ All 6 form types functional
- ✅ Species-adaptive fields work correctly (e.g., switch species → form fields update instantly)
- ✅ Validation prevents empty required fields
- ✅ All POST endpoints called with correct data
- ✅ Success/error toasts appear
- ✅ Responsive (mobile drawer collapses width)
- ✅ FR/EN labels complete
- ✅ Forms match mockup styling and layout

---

## SCRUM-195c: Recent Identifications History & Gallery

**Type**: Story  
**Points**: 5  
**Duration**: 5 days  
**Priority**: P2

### Description
Implement storage and display of recent identification history (last 6 scans). Add gallery view to browse and revisit previous identifications. Integrate with offline Dexie cache for field use.

### Tasks
- [ ] Create Dexie table for identification scans:
  - [ ] `scans: '++id, farmId, timestamp'`
  - [ ] Fields: id, farmId, userId, animalId, method, timestamp, location
- [ ] Store scan on successful identification
- [ ] Display last 6 in recent list (default)
- [ ] "Gallery" button → full history view
  - [ ] Paginated list (20 per page)
  - [ ] Filter by method (barcode, QR, RFID, face, photo, manual)
  - [ ] Filter by date range
  - [ ] Sort by newest first
- [ ] Click scan → show result card
- [ ] Sync to backend when online: POST `/farmos/identification/scan`
- [ ] Retry failed syncs on reconnect

### Acceptance Criteria
- ✅ Last 6 scans displayed in recent list
- ✅ Gallery shows all scans, paginated
- ✅ Filters work (method, date range)
- ✅ Offline: scans stored in Dexie, sync on reconnect
- ✅ Click any scan → result card appears

---

## SCRUM-195d: Animals List & Detail Pages

**Type**: Story  
**Points**: 8  
**Duration**: 8 days  
**Priority**: P1

### Description
Implement Animals module for viewing, creating, and editing animal records. Display herd list with filtering by species, status, and barn. Show detailed animal profile with health history, reproduction timeline, and production stats.

**Template Source**: `mockup/FarmOS Pro/src/animals.jsx`

### Tasks
- [ ] Create `AnimalsList` component
  - [ ] GET `/farmos/animals` with pagination
  - [ ] Filter by species, status (healthy/treatment/alert), barn
  - [ ] Table view (desktop) + Card view (mobile)
  - [ ] Columns: ID, Name, Species, Sex, Weight, Status, Last event
  - [ ] Click row → detail page
- [ ] Create `AnimalDetail` component
  - [ ] GET `/farmos/animals/:id`
  - [ ] Display full profile (photo placeholder, stats, metadata)
  - [ ] Treatments history (tab)
  - [ ] Reproduction timeline (tab)
  - [ ] Production metrics (tab)
  - [ ] Edit button (opens form)
  - [ ] Delete button (with confirmation)
- [ ] Create `AnimalForm` (edit/create)
  - [ ] Pre-fill from detail (edit) or empty (create)
  - [ ] Same fields as QuickEntry animal form
  - [ ] PATCH `/farmos/animals/:id` or POST `/farmos/animals`
- [ ] Responsive design

### Acceptance Criteria
- ✅ Animals list loads with 10+ animals
- ✅ Filter by species works
- ✅ Detail page shows all stats
- ✅ Tabs load correctly (treatments, repro, production)
- ✅ Edit form saves correctly
- ✅ Delete with confirmation works

---

## SCRUM-195e: Integration with Identification Actions

**Type**: Story  
**Points**: 3  
**Duration**: 3 days  
**Priority**: P1  
**Depends On**: SCRUM-195a, SCRUM-195b

### Description
Wire Identification result card actions to open QuickEntry drawer or navigate to Animals page. Ensure transitions are smooth and data is pre-populated.

### Tasks
- [ ] ResultCard "Voir fiche" button → navigate to `/farmos/animals/:id`
- [ ] ResultCard action buttons trigger custom events:
  - [ ] "Saisir traitement" → emit `farmos:openEntry` with tab="health"
  - [ ] "Production" → emit `farmos:openEntry` with tab="production"
  - [ ] "Ajouter photo" → emit `farmos:openEntry` with tab="animal" (photo field)
  - [ ] "Pesée" → emit `farmos:openEntry` with tab="repro" (weight context)
  - [ ] "Déclarer mortalité" → emit `farmos:openEntry` with tab="death"
- [ ] QuickEntry drawer pre-fills:
  - [ ] Selected animal ID
  - [ ] Animal species (for form adaptation)
  - [ ] Today's date

### Acceptance Criteria
- ✅ All 5 action buttons trigger correct drawer/page
- ✅ Pre-filled data appears in forms
- ✅ Navigation transitions smoothly

---

## SCRUM-195f: Offline Support (Dexie + Sync Queue)

**Type**: Story  
**Points**: 8  
**Duration**: 10 days  
**Priority**: P2  
**Depends On**: SCRUM-195a (Identification must work offline)

### Description
Implement offline-first architecture for FarmOS using Dexie.js for local IndexedDB cache and sync queue for delayed submissions. Allow field workers to continue identifying and recording animals without internet, with automatic sync on reconnect.

### Tasks
- [ ] Install Dexie.js
- [ ] Create Dexie schema:
  ```javascript
  const db = new Dexie('FarmOSDB');
  db.version(1).schemas({
    animals: '++id, farmId, species',
    treatments: '++id, animalId',
    productions: '++id, animalId',
    scans: '++id, timestamp',
    syncQueue: '++id, status, timestamp'
  });
  ```
- [ ] Read from Dexie when offline:
  - [ ] Animals list from cache
  - [ ] Search/autocomplete from cache
  - [ ] Result cards from cache
- [ ] Write to Dexie + queue when offline:
  - [ ] New animal creation → queue
  - [ ] Treatment entry → queue
  - [ ] Production entry → queue
  - [ ] Etc. (all POST endpoints)
- [ ] Create sync queue logic:
  - [ ] Queue structure: { id, type, resource, data, timestamp, retries }
  - [ ] Retry on reconnect with exponential backoff
  - [ ] Conflict resolution: last-write-wins (compare timestamps)
  - [ ] Auto-purge successful items after 7 days
- [ ] Detect online/offline: `window.addEventListener('online'/'offline')`
- [ ] Background sync when online:
  - [ ] Process queue items in order
  - [ ] Emit `sync:start`, `sync:progress`, `sync:complete` events
  - [ ] Update Dexie cache from server on sync

### Acceptance Criteria
- ✅ App works without internet (identification, forms)
- ✅ Data stored in Dexie while offline
- ✅ Sync queue populated
- ✅ On reconnect, queue processes automatically
- ✅ No data loss on reconnect
- ✅ Conflict resolution works (last-write-wins)

---

## 🔌 EPIC SCRUM-200: CRM Integration

**Duration**: 2 weeks  
**Points**: 13

---

## SCRUM-200a: Add FarmOS Menu to CRM Sidebar

**Type**: Story  
**Points**: 3  
**Duration**: 2 days  
**Priority**: P0

### Description
Add "FarmOS" menu item to CRM sidebar navigation. Clicking it opens the FarmOS SPA in a new window or modal with shared JWT authentication.

**Template Source**: CRM sidebar structure (existing)

### Tasks
- [ ] Add menu item to CRM sidebar:
  - [ ] Label: "FarmOS" (FR) / "FarmOS" (EN)
  - [ ] Icon: wheat or leaf icon
  - [ ] Position: After "Immobilier", before "Settings"
- [ ] Click behavior:
  - [ ] Open FarmOS SPA URL: `http://farmos.localhost:3001/` (or configured domain)
  - [ ] Pass JWT token in URL query param or localStorage
  - [ ] OR: Open in new window/tab (external app)
- [ ] Verify JWT token is valid for FarmOS app
- [ ] Add routing in CRM to handle FarmOS link

### Acceptance Criteria
- ✅ Menu item appears in sidebar
- ✅ Click opens FarmOS app
- ✅ JWT token passed and accepted by FarmOS
- ✅ User authenticated in FarmOS without re-login

---

## SCRUM-200b: Shared JWT Authentication

**Type**: Story  
**Points**: 5  
**Duration**: 5 days  
**Priority**: P0

### Description
Implement shared JWT token authentication between CRM and FarmOS SPA. Both apps accept the same JWT issued by backend2. Ensure token refresh, expiration, and logout work across both apps.

### Tasks
- [ ] Backend2:
  - [ ] JWT secret shared between CRM and FarmOS
  - [ ] Add `/farmos/*` routes under same JWT guard
  - [ ] Implement token refresh endpoint (if needed)
- [ ] CRM:
  - [ ] Store JWT token in localStorage (already done)
  - [ ] Pass token to FarmOS on navigation
- [ ] FarmOS SPA:
  - [ ] Retrieve JWT from localStorage or URL query param
  - [ ] Store in localStorage for API calls
  - [ ] Add Authorization header to all API requests
  - [ ] Handle 401 Unauthorized → redirect to login
  - [ ] Implement logout → clear token + redirect to CRM
- [ ] Integration test:
  - [ ] Login to CRM
  - [ ] Navigate to FarmOS
  - [ ] FarmOS verifies token
  - [ ] Make API call → succeeds with token
  - [ ] Token refresh works (if applicable)

### Acceptance Criteria
- ✅ Same JWT works for CRM and FarmOS
- ✅ FarmOS API calls include Authorization header
- ✅ 401 response redirects to login
- ✅ Logout clears token in both apps
- ✅ Token refresh (if needed) works across both

---

## 📱 EPIC SCRUM-199: FarmOS Mobile (Flutter)

**Duration**: 4 weeks  
**Points**: 34  
**Goal**: Native iOS/Android app with offline-first sync and PWA parity

---

## SCRUM-199a: Flutter Project Setup & Authentication

**Type**: Story  
**Points**: 5  
**Duration**: 5 days  
**Priority**: P0

### Description
Initialize Flutter project with authentication, offline cache (Hive), and API client setup. Ensure same JWT token from web works for mobile.

### Tasks
- [ ] Create Flutter project: `flutter create farmos_mobile`
- [ ] Add dependencies:
  - [ ] `provider` (state management)
  - [ ] `hive` (offline cache, same as Dexie.js)
  - [ ] `dio` (HTTP client)
  - [ ] `intl` (i18n: FR/EN)
  - [ ] `permission_handler` (camera, location)
  - [ ] `image_picker` (photo from camera/gallery)
  - [ ] `firebase_messaging` (push notifications)
  - [ ] `barcode_scan2` (barcode/QR scanning)
- [ ] Setup authentication:
  - [ ] OAuth/JWT from same backend2
  - [ ] Store token in encrypted Hive box
  - [ ] Create API client with Authorization header
  - [ ] Handle 401 → re-authenticate
- [ ] Setup offline Hive schema:
  - [ ] Same as web: animals, treatments, productions, scans, syncQueue
- [ ] Create AppState provider:
  - [ ] isOnline state
  - [ ] currentUser, token
  - [ ] syncStatus

### Acceptance Criteria
- ✅ Flutter project compiles and runs
- ✅ Login works with same backend2 JWT
- ✅ Token stored securely in Hive
- ✅ API calls include Authorization header
- ✅ Offline/online state detected
- ✅ Hive schema created

---

## SCRUM-199b: Identification Scanner (Mobile)

**Type**: Story  
**Points**: 8  
**Duration**: 8 days  
**Priority**: P1  
**Depends On**: SCRUM-199a

### Description
Implement animal identification screen for Flutter with barcode/QR scanning, face recognition, and photo capture. Mirror web Identification functionality.

### Tasks
- [ ] Create `IdentificationScreen` widget
- [ ] Mode selector (6 tabs same as web)
- [ ] Barcode scanner:
  - [ ] Use `barcode_scan2` package
  - [ ] Request camera permission
  - [ ] Scan and trigger API `/farmos/identify`
- [ ] QR code scanner (same as barcode, different decoder)
- [ ] RFID: Mock for now (no hardware integration yet)
- [ ] Face recognition:
  - [ ] Use Firebase ML Kit or local TensorFlow.js model
  - [ ] Capture photo from camera
  - [ ] Send to backend for processing
- [ ] Photo mode:
  - [ ] Use `image_picker`
  - [ ] Capture photo → send to backend
- [ ] Manual entry:
  - [ ] Text input with autocomplete (from local Hive)
  - [ ] Search ANIMALS by ID/name
- [ ] Result card:
  - [ ] Show identified animal
  - [ ] 6 action buttons (see, treatment, production, photo, weight, death)
- [ ] Recent scans list (from Hive)
- [ ] Offline: search from local cache, queue scans

### Acceptance Criteria
- ✅ Camera permissions requested and granted
- ✅ Barcode/QR scanning works
- ✅ Face recognition works (offline or API)
- ✅ Photo capture works
- ✅ Manual search works from Hive
- ✅ Result card displays correctly
- ✅ Offline scans are queued
- ✅ Recent list shows last 10 scans

---

## SCRUM-199c: Quick Entry Forms (Mobile)

**Type**: Story  
**Points**: 8  
**Duration**: 10 days  
**Priority**: P1  
**Depends On**: SCRUM-199a, SCRUM-199b

### Description
Implement all 6 QuickEntry forms for mobile (same functionality as web). Forms adapt to device size, use native pickers for date/species, and submit to backend or queue offline.

### Tasks
- [ ] Create shared `FormField` widget (label, input, validation)
- [ ] AnimalForm (species-adaptive)
- [ ] ProductionForm
- [ ] HealthForm (treatment, vaccine, exam)
- [ ] StockForm (in/out)
- [ ] ReproForm (heat, AI, birth)
- [ ] DeathForm (with warning)
- [ ] Use native widgets:
  - [ ] `DatePickerDialog` for dates
  - [ ] `DropdownButton` for selects
  - [ ] `TextField` for text inputs
  - [ ] `Checkbox` for toggles
- [ ] Form validation (required fields, formats)
- [ ] Error handling (show snackbars)
- [ ] Submit to API:
  - [ ] If online: POST `/farmos/*`
  - [ ] If offline: add to Hive syncQueue
- [ ] Success feedback (toast)

### Acceptance Criteria
- ✅ All 6 forms functional
- ✅ Species-adaptive fields work
- ✅ Validation prevents submission with errors
- ✅ Online: API calls succeed
- ✅ Offline: items queued
- ✅ Success/error toasts appear
- ✅ Forms fit mobile screen (no overflow)

---

## SCRUM-199d: Offline Sync Queue

**Type**: Story  
**Points**: 8  
**Duration**: 8 days  
**Priority**: P2  
**Depends On**: SCRUM-199c

### Description
Implement background sync for queued actions. When device goes online, automatically sync all pending farm data (animals created, treatments recorded, etc.) to backend with conflict resolution.

### Tasks
- [ ] Create SyncQueue model in Hive:
  - [ ] Fields: id, type, resource, data, timestamp, retries, status
- [ ] Create SyncService:
  - [ ] `addToQueue(type, resource, data)` on offline submission
  - [ ] `syncQueue()` when online
  - [ ] Retry with exponential backoff (3-5 retries)
  - [ ] Conflict resolution: last-write-wins
  - [ ] Progress updates: `onSyncProgress` callback
- [ ] Listen to online/offline changes:
  - [ ] `connectivity_plus` package
  - [ ] Trigger sync on `online` event
- [ ] UI indicators:
  - [ ] Show "syncing..." badge while queue processes
  - [ ] Show "queued" badge on pending items
  - [ ] Show error if sync fails
- [ ] Local data merging:
  - [ ] After sync, merge server response with local Hive
  - [ ] Update local IDs (server-issued)

### Acceptance Criteria
- ✅ Queue populates when offline
- ✅ Sync triggers on reconnect
- ✅ All queued items submitted
- ✅ Conflicts resolved (last-write-wins)
- ✅ UI shows sync progress
- ✅ Local data updated after sync
- ✅ No data loss

---

## SCRUM-199e: Native Integrations (Camera, Geolocation)

**Type**: Story  
**Points**: 5  
**Duration**: 5 days  
**Priority**: P2  
**Depends On**: SCRUM-199b

### Description
Add native device capabilities: camera for photo identification, geolocation to tag scan location, and notifications for reminders.

### Tasks
- [ ] Camera:
  - [ ] Integrate with image_picker (already done in SCRUM-199b)
  - [ ] Crop/rotate before upload
- [ ] Geolocation:
  - [ ] Use `geolocator` or `location` package
  - [ ] Request location permission
  - [ ] Tag each scan with GPS coordinates
  - [ ] Display map in history (optional)
- [ ] Push notifications:
  - [ ] Use `firebase_messaging`
  - [ ] Receive treatment reminders, vaccination alerts
  - [ ] Click notification → open relevant screen

### Acceptance Criteria
- ✅ Camera works on iOS/Android
- ✅ Photos captured and uploaded
- ✅ Location permission requested
- ✅ Scans tagged with coordinates
- ✅ Push notifications received
- ✅ Notification actions work (open screen)

---

## 📋 DEPENDENCIES & SEQUENCING

```
Backend (SCRUM-192)
├─ SCRUM-193: Database Schema (3d) ✓ BLOCKER
│   └─ SCRUM-194: CRUD API (10d) ✓ DEPENDS ON 193
│       └─ SCRUM-195: Auto-Sync (5d) ✓ DEPENDS ON 194
│
Frontend SPA (SCRUM-191)
├─ SCRUM-195a: Identification (10d) ✓ DEPENDS ON SCRUM-194
│   └─ SCRUM-195b: QuickEntry (15d) ✓ DEPENDS ON 195a
│       └─ SCRUM-195e: Integration (3d) ✓ DEPENDS ON 195a+195b
│           └─ SCRUM-195c: History (5d) ✓ DEPENDS ON 195e
│
└─ SCRUM-195d: Animals Pages (8d) ✓ DEPENDS ON 194
│   └─ SCRUM-195f: Offline (10d) ✓ DEPENDS ON 195d
│
CRM Integration (SCRUM-200)
├─ SCRUM-200a: Menu (2d) ✓ DEPENDS ON Frontend SPA ready
└─ SCRUM-200b: Shared Auth (5d) ✓ DEPENDS ON 200a

Mobile (SCRUM-199) [PARALLEL]
├─ SCRUM-199a: Setup (5d) ✓ BLOCKER
├─ SCRUM-199b: Scanner (8d) ✓ DEPENDS ON 199a + Backend ready
├─ SCRUM-199c: Forms (10d) ✓ DEPENDS ON 199a
├─ SCRUM-199d: Sync (8d) ✓ DEPENDS ON 199c
└─ SCRUM-199e: Native (5d) ✓ DEPENDS ON 199b
```

---

## 📊 TOTAL ESTIMATES

| Epic | Stories | Points | Days | Team |
|------|---------|--------|------|------|
| Backend (SCRUM-192) | 3 | 18 | 18 | 1 Backend |
| Frontend SPA (SCRUM-191) | 6 | 38 | 41 | 2 Frontend |
| CRM Integration (SCRUM-200) | 2 | 8 | 7 | 1 Frontend |
| Mobile (SCRUM-199) | 5 | 34 | 36 | 1 Mobile |
| **TOTAL** | **16** | **98** | **~12 weeks** | **4 devs** |

---

## ✅ ACCEPTANCE CHECKLIST (ALL EPICS)

### Backend (SCRUM-192)
- [ ] All 6 tables in Postgres
- [ ] All 13 endpoints functional
- [ ] JWT guard on all endpoints
- [ ] Auto-sync farm-expenses → CRM transactions
- [ ] Unit tests pass
- [ ] Postman collection created

### Frontend SPA (SCRUM-191)
- [ ] 6 scanner modes work
- [ ] Camera viewport matches mockup
- [ ] 6 QuickEntry forms functional
- [ ] Animals list/detail pages work
- [ ] Offline sync works (Dexie + queue)
- [ ] Responsive (mobile/tablet/desktop)
- [ ] FR/EN labels complete
- [ ] Lighthouse Mobile ≥ 80%

### CRM Integration (SCRUM-200)
- [ ] FarmOS menu item in CRM sidebar
- [ ] Click → FarmOS SPA opens
- [ ] JWT token passed and accepted
- [ ] Same user authenticated in both apps

### Mobile (SCRUM-199)
- [ ] Flutter app compiles (iOS/Android)
- [ ] Identification scanner works
- [ ] All 6 QuickEntry forms work
- [ ] Offline sync works
- [ ] Native camera, geolocation working
- [ ] Buildable for App Store/Play Store

---

**Document Created**: 2026-05-26  
**Ready for Jira Import**: YES  
**Template Source Verified**: mockup/FarmOS Pro/  
**Architecture Approved**: SPA Separate + Postgres + Flutter Mobile
