# FarmOS Identification Module — Features Audit

**Date**: 2026-05-26  
**Status**: Mockup Review for Jira Planning  
**Scope**: Module Identification + QuickEntry integration

---

## 📋 TABLE OF CONTENTS

1. [Module Identification](#module-identification)
2. [QuickEntry Drawer](#quickentry-drawer)
3. [Data Dependencies](#data-dependencies)
4. [Backend Requirements](#backend-requirements)
5. [Frontend Components](#frontend-components)
6. [User Workflows](#user-workflows)
7. [Jira Epic Breakdown](#jira-epic-breakdown)

---

## 🎯 MODULE IDENTIFICATION

### **Screen Location**
- Route: `/identification` (NEW)
- Menu: Sidebar "Identification" (icon: scanLine) — 2nd position after Dashboard
- Mobile: BottomTabBar item "Scanner" (icon: scanLine)
- Navigation: Via sidebar click or custom event `farmos:nav`

### **Header**
- **Title**: "Identification, scanner instantané" (FR) / "Identification, instant scanner" (EN)
- **Subtitle**: "Sur le terrain · Field" (FR/EN bilingual)
- **Overline**: "Sur le terrain · Field" badge
- **Responsive**: Full-width on all devices

---

## 🔧 IDENTIFICATION MODES

### **6 Scanner Modes** (Scrollable horizontal tabs)

| Mode | Icon | FR Label | EN Label | Behavior | Duration |
|------|------|----------|----------|----------|----------|
| **Barcode** | scanLine | Code-barre | Barcode | Scan EAN/UPC from ear tag | 1700ms |
| **QR Code** | qr | QR code | QR code | Scan QR code on tag/document | 1700ms |
| **RFID/NFC** | rfid | RFID / NFC | RFID / NFC | Detect RFID reader proximity | 1100ms (faster) |
| **Face Recognition** | user | Reco faciale | Face recog. | AI biometric animal recognition | 2200ms (slower) |
| **Photo** | camera | Photo | Photo | Capture animal photo + recognition | 1700ms |
| **Manual** | edit | Manuel | Manual | Type animal ID manually (search) | N/A |

### **Mode Tab Styling**
- **Active mode**: Clay-700 background, bone-50 text, shadow
- **Inactive mode**: Paper background, ink-800 text, border-2
- **Horizontal scroll**: Overflow-x auto, no scrollbar
- **Click behavior**: Switch mode + reset state (clear found animal)

---

## 🎥 CAMERA VIEWPORT (Modes: Barcode, QR, RFID, Face, Photo)

### **Layout**
- **Aspect ratio**: 3:4 (portrait, like phone camera)
- **Max height**: 460px
- **Border radius**: 18px
- **Overflow**: hidden (round corners)
- **Background**: Dark gradient (barn floor simulation)

### **Camera Background Simulation**
- **SVG**: Vague animal silhouette (cow head + ears + body)
- **Opacity**: 0.42
- **Gradient**: `linear-gradient(cow-body)`
- **Details**: 
  - Ellipse for body (120×80)
  - Ellipse for head (55×48)
  - Two ears (14×20 each)
  - Two eyes
  - Mouth
  - Ear tag rectangle (22×14) with "0118" text
- **Vignette**: Radial gradient overlay (dark at edges)
- **Grain/Noise**: Subtle 3px grid overlay (opacity 0.04)

### **Mode-Specific Overlays**

#### **Barcode Overlay**
- Corner brackets (L-shaped corners, 22px × 22px)
- Fake barcode lines (28 lines, variable widths)
- Scan line (horizontal animation when scanning)

#### **QR Overlay**
- Larger corner brackets (thicker: 3px vs 2.5px)
- 200×200px square frame
- Scan line animation

#### **RFID Overlay**
- **Concentric pulse waves** (3 rings)
- **Animated pulse**: `rfid-pulse` @keyframe (1.4s infinite)
- **Center dot**: Wheat-400 circle with RFID icon
- **Glow effect**: `box-shadow: 0 0 24px rgba(215,170,69,0.6)`

#### **Face Recognition Overlay**
- **SVG circle**: Ellipse (92px radius, dashed stroke)
- **Animation**: Rotation (spin @keyframe, 8s linear infinite)
- **Feature points**: 5 points (eyes, nose, chin x2) visible when scanning
- **Connection lines**: Lines between feature points (opacity 0.5)

#### **Photo Overlay**
- **Rule of thirds grid**: 2 vertical lines @ 33%, 66%
- **Auto-focus square**: 90×90px at center (border: wheat-400)
- **Guides**: Subtle grid for composition

#### **Manual Entry**
- **Search input box**: Icon + input field
- **Placeholder**: "BQ-2024-… or Marguerite" (ID or name)
- **Autocomplete**: Real-time matching ANIMALS (case-insensitive)
- **Results**: Max 5 matching animals, clickable cards

### **Top HUD (All modes)**
- **Status indicator**: 6×6 circle (sage-500 ready / rust-500 scanning)
- **Status text**: "PRÊT" / "EN COURS" (FR) or "READY" / "SCANNING" (EN)
- **Action buttons**: 
  - Flash toggle (32×32 icon button)
  - Rotate camera (32×32 icon button)
- **Styling**: Backdrop blur (8px), dark semi-transparent background

### **Bottom Message Pill**
- **Dynamic text**: Mode-specific instruction
- **Examples**:
  - Barcode: "Pointez vers le code-barre de la boucle" (FR)
  - QR: "Cadrez le QR code dans la zone" (FR)
  - RFID: "Approchez le lecteur RFID de la boucle (5 cm max)" (FR)
  - Face: "Cadrez la tête de l'animal — reconnaissance IA" (FR)
  - Photo: "Centrez l'animal puis touchez le déclencheur" (FR)
- **Animation**: Fade in/out with mode change

### **Capture/Scan Button Row** (Bottom)
- **Mic button** (left): 44×44 circle, icon button (optional)
- **Main button** (center, flex: 1): 
  - **Height**: 56px
  - **Color**: Clay-700 (scan) or Bone-50 (photo mode)
  - **Text**: "Scanner" / "Détecter" / "Reconnaître" / "Capturer" (mode-specific)
  - **Icon**: Mode-specific icon
  - **Disabled state**: Gray (forest-700), cursor: wait
  - **Hover**: Shadow (0 8px 20px -6px rgba(168,90,42,0.45))
- **Gallery button** (right): 44×44 circle, icon button
- **Photo mode special**: White center dot (30px, clay-700)

### **Flash Effect**
- **Trigger**: Photo mode button click
- **Visual**: Full-screen white overlay (#FFFCF6)
- **Duration**: 80ms fade-in reverse animation
- **Effect**: Simulates camera flash

---

## ✅ RESULT CARD (After identification)

### **Success Banner**
- **Background**: Gradient sage-700 → sage-900
- **Icon circle**: 36×36, white background (18% opacity)
- **Icon**: Check mark (white)
- **Text**:
  - **Label**: "Identifié via [mode]" (FR) / "Identified via [mode]" (EN)
  - **Main text**: "Animal trouvé · [ID]" (FR) or "Animal found · [ID]" (EN)
- **Close button**: X icon (32×32 circle, semi-transparent)
- **Shadow**: 0 6px 16px -4px rgba(46,92,66,0.32)

### **Animal Card**
- **Photo section** (height: 140px):
  - **Background**: Gradient (species accent color)
  - **Animal glyph**: Watermark (opacity 0.5, size 120px)
  - **Dark overlay**: Gradient fade (180deg)
  - **Tags** (top-left corner):
    - Species tag: `[Icon] [Species Singular]`
    - Status tag: `[Dot color] [Status label]`
    - Withdrawal tag (if applicable): Red warning "Retrait" / "Withdrawal"
  - **Plus button** (bottom-right): 38×38, add photo shortcut

- **Info section** (padding: 14-18px):
  - **Name**: Large display font (24px, font-display)
  - **Details**: "Race · Sex · Weight kg" (13px, gray)
  - **Lot/Barn**: Mono font (11.5px, dim)
  - **Last event**: Icon + "Il y a X jours" (12px, gray background card)

### **Action Grid** (3-column layout)
6 action buttons:

| ID | Icon | FR Label | EN Label | Color | Event |
|----|------|----------|----------|-------|-------|
| view | eye | Voir fiche | View record | forest-900 | Navigate to Animals |
| treatment | syringe | Saisir traitement | Add treatment | clay-700 | Emit `farmos:openEntry` (health) |
| milk | droplet | Production | Production | sky-700 | Emit `farmos:openEntry` (production) |
| photo | camera | Ajouter photo | Add photo | forest-700 | Open photo upload |
| weight | weight | Pesée | Weigh | wheat-700 | Emit `farmos:openEntry` (weight/repro) |
| death | alert | Déclarer mortalité | Report death | rust-700 | Emit `farmos:openEntry` (death) |

- **Button styling**: 14px padding, 3-column grid, card design, flex column icon+label
- **Icon circle**: Colored background (12% opacity of action color)

### **Rescan Button**
- **Full width**: Bottom of card
- **Text**: "Scanner un autre animal" (FR) / "Scan another animal" (EN)
- **Icon**: scanLine
- **Click**: Reset state (close result card)

---

## 📋 RECENT IDENTIFICATIONS LIST

### **Header**
- **Overline**: "Récents · 4 dernières" (FR) / "Recent · last 4" (EN)
- **Action button**: "Galerie" / "Gallery" button (view all history)

### **Recent Card** (Each record)
- **Layout**: Flex, gap 12px
- **Species icon** (left): 38×38 circle with animal glyph
- **Animal info** (flex 1):
  - **Name**: 14px, bold, black
  - **ID**: 11px mono, gray
- **Method badge** (right): Tag with method (QR, RFID, Code-barre, Faciale, Photo, Manuel)
- **Time**: "Il y a 4 min" / "Just now" (10.5px, gray)
- **Clickable**: Click → select and show ResultCard
- **Limit**: Show max 6 recent (slide 0-5)
- **Update**: Add to beginning when new scan completes

### **Data Structure**
```javascript
{
  id: "BQ-2024-0118",
  time: "Il y a 4 min",
  method: "qr",  // barcode | qr | rfid | face | photo | manual
  animal: { ...ANIMALS_entry }
}
```

---

## 📝 QUICKENTRY DRAWER

### **Screen Location**
- **Trigger**: 
  - Topbar button "Saisie rapide" / "Quick Entry"
  - BottomTabBar "+" button (mobile)
  - Custom event `farmos:openEntry(tab)`
- **Position**: Slide-in from right
- **Backdrop**: Semi-transparent dark overlay (click to close)
- **Z-index**: 100 (drawer), 90 (backdrop)

### **Layout**
- **Width**: 480px (maxWidth: 100vw on mobile)
- **Height**: Full viewport
- **Animation**: Slide-in-right (240ms)
- **Overflow**: flex column, vertical scrollable body

### **Header Section**
- **Overline**: "Saisie rapide · Quick entry" (FR/EN bilingual)
- **Title**: "Enregistrer une donnée" (FR) / "Record an entry" (EN)
- **Close button**: X icon (34×34, top-right)

### **6 Tab Navigation**
Horizontal scrollable tabs below header:

| Tab ID | Icon | FR Label | EN Label |
|--------|------|----------|----------|
| animal | plus | Nouvel animal | New animal |
| production | droplet | Production | Production |
| health | syringe | Soin / vaccin | Care / vaccine |
| stock | package | Stock | Stock |
| repro | fingerprint | Reproduction | Reproduction |
| death | alert | Mortalité | Mortality |

- **Active tab**: Border-bottom clay-700 (2px)
- **Inactive tab**: Border-bottom transparent
- **Click**: Switch tab, keep drawer open

---

## 📝 QUICKENTRY FORMS

### **Animal Form** (SPECIES-ADAPTIVE)

**Species selector**: Pill buttons (height 32px)
- Show: SPECIES list with glyphs
- Adaptation**: All subsequent fields change based on species

**Identification section**:
- **ID / Tag** (required):
  - Label changes per species: "ID / Numéro" (general) or "ID Lot" (poultry) or "ID Bassin" (fish)
  - Placeholder: Auto-generated `[SPECIES-CODE]-2026-[3-digit]`
  - Mono font
- **Name** (optional, NOT for poultry/fish):
  - Placeholder: Species-specific (Marguerite, Truie A33, etc.)
- **Count** (for poultry/fish only):
  - Number input, placeholder "4200"

**Race/Breed section**:
- **Race/Breed** dropdown (standard options per species)
- **Sex** (NOT for poultry/fish): F/M toggle buttons
- **Date of birth**: Date input

**Weight section**:
- **Weight (kg)**: Number input, placeholder "450"

**Location section**:
- **Barn/Pond**: Text input
  - Label changes: "Bâtiment" (general) vs "Bassin" (fish)
  - Placeholder: "Étable 1" or "Bassin 7 · Circuit B"
- **Batch/Lot**: Text input, placeholder "Lot A"

**Species-specific sections**:

- **Cattle (BOVINS)**:
  - Official ear tag (CAN format)
  - Lactation number

- **Pigs (PORCS)**:
  - Type dropdown (Verrat, Truie, Cochette, Porcelet, Sevré, Engraissement)
  - Room number (Salle #)

- **Fish (AQUACULTURE)**:
  - Oxygen (mg/L), step 0.1
  - pH (step 0.1)
  - Water temperature °C (step 0.1)
  - Density (kg/m³)

- **Poultry (VOLAILLE)**:
  - Temperature °C (step 0.1)
  - Humidity %
  - Age (days)

**Notes section**:
- Textarea (height 70px)
- Placeholder: "Observations, origine, condition d'arrivée…" (FR) or "Observations, origin, arrival condition…" (EN)

**Adaptive note banner**:
- Shows: "[X] fields specific to [Species]"
- Updates live as user changes species

**Form actions**:
- Cancel button (gray)
- Save button (primary clay-700)

---

### **Production Form**

**Species selector**: Pill buttons (adaptive)

**Production section**:
- **Date** (required): Date input
- **Period**: Dropdown (Traite matin, Traite après-midi, Total jour) = (Morning, Afternoon, Daily total)
- **Animal / Batch**: Species-filtered dropdown
- **Value** (required, species-dependent):
  - **Milk**: Volume (L) — step 0.1, placeholder "22.4"
  - **Eggs**: Count — placeholder "4200"
  - **Growth**: Avg weight (kg) — step 0.1, placeholder "68"
  - **Wool**: Shearing (kg) — step 0.1, placeholder "4.8"

**Milk quality** (only for milk-producing species):
- Fat % (step 0.01)
- Protein % (step 0.01)
- Conductivity (mS) (step 0.1)

**Egg metrics** (only for poultry):
- Broken count
- Avg size (g)
- Lay rate %

**Notes section**: Textarea

**Form actions**: Cancel / Save

---

### **Health Form** (Treatment, Vaccine, Exam)

**Kind selector** (3 options):
- Treatment (pill/pill icon)
- Vaccine (syringe icon)
- Exam (pulse icon)

**Target section**:
- **Application type**: Individual / By batch / Collective
- **Species**: Dropdown
- **Animal / Batch**: Species-filtered dropdown

**Treatment section** (if selected):
- **Reason / Disease** (required): Dropdown (species-specific diseases)
- **Medicine** (required): Dropdown (filtered by species + kind="med")
- **Route**: Injection, Oral, Drinking water, Feed, Pond, Spray
- **Dosage**: Text, placeholder "10 mg/kg"
- **Start date**: Date input
- **Duration (days)**: Number input, placeholder "5"
- **Withdrawal banner**: Auto-calculated display
  - "Délai de retrait calculé automatiquement" (FR)
  - "Milk: 96h · Meat: 28d · Eggs: 7d"

**Vaccine section** (if selected):
- **Vaccine name** (required): Text input, placeholder "Mycoplasme, Newcastle, IBR…"
- **Date**: Date input
- **Animal count**: Number input
- **Next booster date**: Date input

**Exam section** (if selected):
- **Veterinarian**: Dropdown (Dr. Émilie Boucher, Dr. Marc Lavoie, etc.)
- **Date**: Date input
- **Diagnosis / Observations**: Textarea (height 80px)

**Form actions**: Cancel / Save

---

### **Stock Form** (In / Out)

**Mode selector** (2 options):
- Stock in (arrowDown icon)
- Stock out / consumption (arrowUp icon)

**Details section**:
- **Product** (required): Dropdown (grouped by Aliment, Médicaments)
- **Quantity** (required): Number input
- **Date**: Date input

**Stock in specific**:
- **Supplier**: Text input, placeholder "Coop Agri-Pro"
- **Total cost ($)**: Number input
- **Invoice #**: Text input, mono format
- **Expiry date**: Date input

**Stock out specific**:
- **Destination / Batch**: Text input, placeholder "Lot Engr. 77 · 198 porcs"

**Form actions**: Cancel / Save

---

### **Repro Form** (Heat, AI, Birth)

**Kind selector** (3 options):
- Heat (pulse icon)
- AI / Mating (fingerprint icon)
- Birth (sparkle icon)

**Animal section**:
- **Species**: Dropdown (only species with repro data)
- **Female** (required): Dropdown (sex = F or Mixte)

**Event section**:
- **Date** (required): Date input
- **Male / Semen** (if AI): Text input, placeholder "Holstein #2042"
- **Live births** (if Birth): Number input

**Birth-specific**:
- **Stillborn count**: Number input
- **Avg weight (kg)**: Number step 0.01
- **Difficulty**: Easy / Assisted / Hard / Cesarean

**Notes section**: Textarea

**Form actions**: Cancel / Save

---

### **Death Form**

**Warning banner**: Red background, alert icon
- "Déclaration de mortalité" (FR) / "Mortality declaration" (EN)
- "Une autopsie peut être recommandée…" (FR) / "Necropsy may be required…" (EN)

**Animal section**:
- **Species**: Dropdown
- **Animal / Batch**: Species-filtered dropdown

**Cause section**:
- **Date** (required): Date input
- **Count** (required): Number input
- **Suspected cause** (required): Dropdown
  - Disease, Accident, Birthing, Heat stress, Predation, Unknown, Sanitary cull
- **Details**: Textarea (height 80px)
- **Necropsy requested**: Checkbox

**Form actions**: Cancel / Save

---

## 🔄 DATA DEPENDENCIES

### **Global Data** (from data.jsx)

```javascript
ANIMALS: [
  {
    id: string,
    name: string,
    species: string,
    sex: "F" | "M" | "Mixte",
    weight: number,
    race: string,
    lot: string,
    barn: string,
    lastEvent: string,
    status: "healthy" | "treatment" | "alert",
    withdrawal: boolean,
    ... species-specific fields
  }
]

SPECIES: [
  {
    id: string,
    fr: string,
    en: string,
    frSing: string,
    enSing: string,
    glyph: string,
    accent: color,
    fields: string[], // which form fields to show
    diseases: string[],
    diseasesEn: string[],
    repro: string[],
    productPrimary: "milk" | "eggs" | "growth" | "wool"
  }
]

STOCK: [
  {
    id: string,
    name: string,
    kind: "feed" | "med",
    species: string[]
  }
]

TREATMENTS: [...]
ALERTS: [...]
```

### **State** (Identification module)

```javascript
mode: "scanner" | "qr" | "rfid" | "face" | "photo" | "manual"
scanning: boolean
found: ANIMAL | null
photo: File | null
flash: boolean
recent: [ { id, time, method, animal }, ...]
```

### **State** (QuickEntry drawer)

```javascript
open: boolean
defaultTab: "animal" | "production" | "health" | "stock" | "repro" | "death"
defaultSpecies: string | null
lang: "fr" | "en"
form: { [fieldName]: value, ... }
```

---

## 🔌 BACKEND REQUIREMENTS

### **Read-Only Endpoints** (GET)

```
GET /farmos/animals          → List all animals (paginated)
GET /farmos/animals/:id      → Get single animal
GET /farmos/treatments       → List treatments
GET /farmos/medicines        → List stock (kind='med')
GET /farmos/stock            → List stock (kind='feed')
```

### **Write Endpoints** (POST/PATCH)

```
POST /farmos/animals         → Create animal (from form)
POST /farmos/treatments      → Record treatment
POST /farmos/production      → Record production event
POST /farmos/stock/in        → Stock entry
POST /farmos/stock/out       → Stock consumption
POST /farmos/reproduction    → Record heat/AI/birth
POST /farmos/mortality       → Record death

PATCH /farmos/animals/:id    → Update animal (from camera photo, etc.)
```

### **Real-Time Scanning**

```
POST /farmos/identify        → Decode barcode/QR/RFID (external service)
POST /farmos/identify/face   → Face recognition (TensorFlow.js or AWS)
POST /farmos/animals/:id/photo → Upload animal photo (S3 or blob)
```

### **History/Recent**

```
GET /farmos/identification/recent → Last 6 scans by current user
POST /farmos/identification/scan  → Log scan event (timestamp, method, user)
```

---

## 🎨 FRONTEND COMPONENTS

### **Identification.jsx**
- `<Identification>` (main)
  - `<CameraViewport>` (scanner view)
    - `<BarcodeOverlay>`, `<QrOverlay>`, `<RfidOverlay>`, `<FaceOverlay>`, `<PhotoOverlay>`
    - `<CameraBackground>`
    - `<CornerBrackets>`, `<ScanLine>`
  - `<ManualEntry>` (search form)
  - `<ResultCard>` (after identification)
  - Recent identifications list

### **QuickEntry.jsx**
- `<QuickEntryDrawer>` (main)
  - `<AnimalForm>`, `<ProductionForm>`, `<HealthForm>`, `<StockForm>`, `<ReproForm>`, `<DeathForm>`
  - `<FormSection>`, `<FormGrid>`, `<FormField>`, `<FormActions>`
  - `<Toast>` (success feedback)

---

## 👤 USER WORKFLOWS

### **Workflow 1: Quick Animal Identification (Barcode)**
1. User navigates to Identification
2. Mode = "Scanner" (default)
3. Points phone at ear tag barcode
4. Clicks "Scanner" button
5. Animation: scan line moves (1700ms)
6. Result card appears with animal details
7. User can:
   - View full record (navigate to Animals)
   - Add treatment
   - Record production
   - Add photo
   - Record weight
   - Report death
8. Click "Scanner un autre animal" → reset, ready for next

### **Workflow 2: Face Recognition + Quick Entry**
1. User navigates to Identification
2. Mode = "Reco faciale"
3. Frames animal head
4. Clicks "Reconnaître" button
5. AI processes (2200ms, slower)
6. Result card: Same options as Barcode
7. User clicks "Saisir traitement" → triggers QuickEntry drawer
8. Tab "Soin / vaccin" opens pre-populated with animal species
9. User selects disease, medicine, route
10. Saves → toast "Traitement enregistré"

### **Workflow 3: Manual Entry + Production Record**
1. Mode = "Manuel"
2. Search box appears with autocomplete
3. User types "Marguerite" or "BQ-2024"
4. Clicks result card
5. Result card: Same options
6. User clicks "Production" → QuickEntry drawer, "Production" tab
7. Pre-filled: Animal ID, species (for milk/eggs/weight form)
8. Selects period, enters volume
9. Saves → added to production history

### **Workflow 4: Dead Animal Declaration**
1. User on Identification
2. Scans animal (any mode)
3. Result card appears
4. Clicks "Déclarer mortalité"
5. QuickEntry drawer opens, "Mortalité" tab
6. Pre-filled: Animal species, ID
7. User selects cause, count, notes
8. Clicks "Enregistrer"
9. Toast: "Mortalité enregistrée — 1 animal" (red severity="high")
10. Animal marked as dead in database

### **Workflow 5: Stock Entry from Field**
1. User identifies animal (barcode)
2. Realizes they used last dose of vaccine
3. Clicks result card action (not directly shown, but implied)
4. Or: Opens QuickEntry, "Stock" tab
5. Mode = "Stock in"
6. Selects vaccine product
7. Enters supplier, cost, invoice
8. Saves

---

## 🔨 JIRA EPIC BREAKDOWN

### **SCRUM-192: FarmOS Backend (Existing)**
- SCRUM-193: Database schema (animals, treatments, medicines, sales, reproduction, mortality)
- SCRUM-194: Backend API module (CRUD endpoints)

### **SCRUM-195: FarmOS Frontend — Now includes Identification Module**

Recommend **split into sub-tasks**:

#### **SCRUM-195a: Identification Module** (NEW EPIC)
- SCRUM-195a-1: Identification screen + routing
- SCRUM-195a-2: 6 scanner modes (UI + simulation)
- SCRUM-195a-3: Camera viewport + overlays (barcode, QR, RFID, face, photo)
- SCRUM-195a-4: Manual entry form + autocomplete
- SCRUM-195a-5: Result card + actions
- SCRUM-195a-6: Recent identifications history (6-item list)
- SCRUM-195a-7: Integration with QuickEntry drawer

#### **SCRUM-195b: QuickEntry Drawer — Existing**
- SCRUM-195b-1: Drawer layout + 6 tabs
- SCRUM-195b-2: AnimalForm (species-adaptive)
- SCRUM-195b-3: ProductionForm
- SCRUM-195b-4: HealthForm (treatment, vaccine, exam)
- SCRUM-195b-5: StockForm (in/out)
- SCRUM-195b-6: ReproForm (heat, AI, birth)
- SCRUM-195b-7: DeathForm + warning banner
- SCRUM-195b-8: Form validation + submission

#### **SCRUM-195c: Integration & Polish**
- SCRUM-195c-1: Responsive design (mobile/tablet/desktop)
- SCRUM-195c-2: Bilingual support (FR/EN)
- SCRUM-195c-3: Offline sync (Dexie cache for scans)
- SCRUM-195c-4: Error handling & retry logic
- SCRUM-195c-5: Performance optimization (lazy loading, memoization)

---

## 📊 FEATURE COMPLEXITY MATRIX

| Feature | Complexity | Days | Dependencies |
|---------|-----------|------|--------------|
| **Identification Route** | Low | 1d | app.jsx, shell.jsx |
| **Mode Tabs** | Low | 1d | CSS, state management |
| **Barcode/QR/Manual Overlays** | Low | 2d | SVG, icons |
| **RFID Pulse Animation** | Medium | 2d | @keyframes, CSS |
| **Face Recognition Overlay** | Medium | 2d | SVG, feature points |
| **Photo Flash Effect** | Low | 1d | CSS animation |
| **CameraBackground Simulation** | Medium | 2d | SVG, gradients |
| **Result Card + Actions** | Medium | 3d | API integration |
| **Recent Identifications** | Low | 1d | State, list rendering |
| **Manual Entry Search** | Medium | 2d | Autocomplete, filtering |
| **QuickEntry Drawer** | High | 5d | Complex form logic |
| **Animal Form (Adaptive)** | High | 4d | Conditional rendering |
| **Production/Health/Stock/Repro/Death Forms** | High | 8d | Validation, species rules |
| **Integration Test** | Medium | 3d | E2E workflows |
| **Offline Sync (PWA)** | High | 5d | Dexie, service worker |
| **TOTAL** | **HIGH** | **40-45 days** | Full stack |

---

## ✅ NEXT STEPS

1. **Review this audit** — confirm all features are captured
2. **Clarify backend**:
   - Will barcode/QR decoding be frontend (jsQR) or backend?
   - Face recognition: TensorFlow.js (client) or AWS Rekognition (server)?
   - Photo storage: S3, base64 in DB, or local blob?
   - RFID: Bluetooth integration, or API mock?
3. **Create Jira stories** from epic breakdown above
4. **Estimate per story** (refined story points)
5. **Assign to sprint** (prioritize: Identification → QuickEntry → Integration)

---

**Document prepared**: 2026-05-26  
**Mockup status**: Fully functional, ready for implementation  
**Review status**: Awaiting feedback before Jira planning
