# 📱 Stratégie Mobile CRM — NgoluApp

## 🎯 Objectif Principal

Transformer le CRM NgoluApp en **application mobile-first** avec:
- ✅ Interface responsive (mobile-first design)
- ✅ Support offline complet via Service Worker + cache local
- ✅ Synchronisation automatique des données
- ✅ Progressive Web App (PWA) installable
- ✅ Native apps (Flutter) pour iOS/Android

---

## 📊 Contexte & Motivation

### Problématique actuelle
- CRM actuellement optimisé pour desktop uniquement
- FarmOS Pro (module intégré) utilisé par des fermiers sur le terrain → besoin CRITIQUE de mobile
- Opérations critiques (Comptabilité, Transactions, Propriétés) doivent fonctionner hors ligne
- Aucun support PWA/installable actuellement

### Enjeux métier
- 🔴 **Comptabilité**: Enregistrer dépenses/revenus en temps réel sur terrain
- 🔴 **Transactions**: Paiements mobiles, reçus numériques
- 🟠 **Propriétés/Leases**: Inspections sur site avec photos/notes
- 🟡 **Clients/Fournisseurs**: Fiches consultées en déplacement
- 🟢 **Rapports**: Dashboards lisibles sur petit écran

---

## 🏗️ Architecture Cible

```
┌─────────────────────────────────────────┐
│      Frontend React (Next.js)           │
│  ├─ Mobile-first responsive design      │
│  ├─ React Query pour cache local        │
│  ├─ Dexie.js pour IndexedDB cache       │
│  └─ Service Worker (Workbox)            │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      v                 v
 Online Mode        Offline Mode
  (Backend API)    (Local Storage)
      │                 │
      └────────┬────────┘
               │
         Sync Queue
     (last-write-wins)
```

### Composants clés

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Frontend** | React + Next.js | UI responsive, offline-first |
| **Cache Local** | Dexie.js + IndexedDB | Stockage persistant local |
| **Service Worker** | Workbox | Assets statiques, sync |
| **Sync Engine** | React Query | Réconciliation online/offline |
| **Mobile Apps** | Flutter | iOS/Android natif |

---

## 📅 Plan d'Implémentation (11 semaines)

### **Phase 1 — Responsive Foundation** (2 semaines)
**Objectif**: Adapter interface pour mobile

- [ ] Refactor `AdminLayout.jsx`
  - [ ] Sidebar collapsible sur mobile
  - [ ] Top navbar responsive
  - [ ] Main content responsive
- [ ] Ant Design responsiveness
  - [ ] Breakpoints: `xs` (320px), `sm` (576px), `md` (768px), `lg` (1024px)
  - [ ] Grid layout adaptatif
  - [ ] Tables → stacked cards sur mobile
- [ ] Mobile bottom navigation
  - [ ] 5 onglets principaux (Dashboard, Comptabilité, Propriétés, Clients, Rapports)
  - [ ] Hamburger menu pour pages secondaires
- [ ] Touch optimization
  - [ ] Buttons minimum 48px × 48px
  - [ ] Spacing minimum 44px entre éléments cliquables
  - [ ] Input fields adaptés (date pickers, selects)

**Deliverables**:
- [ ] `AdminLayout.jsx` refactorisé + tests responsive
- [ ] Mobile nav component
- [ ] Responsive breakpoints validés sur devices réels

---

### **Phase 2 — Offline-First Capability** (3 semaines)
**Objectif**: Cache local + synchronisation

#### 2.1 Service Worker Setup (5 jours)
- [ ] Installer Workbox
- [ ] Cache strategy:
  - [ ] Assets statiques (JS, CSS) → Cache First
  - [ ] Images → Stale While Revalidate
  - [ ] API calls → Network First
- [ ] PWA manifest.json
  - [ ] Icon 192×192 et 512×512
  - [ ] Start URL, display mode, theme color

#### 2.2 Local Database (Dexie.js) (5 jours)
- [ ] Installer Dexie.js
- [ ] Create IndexedDB schema:
  ```javascript
  const db = new Dexie('CrmDB');
  db.version(1).stores({
    transactions: '++id, leaseId, date',
    properties: '++id, ownerId',
    leases: '++id, propertyId',
    customers: '++id, name',
    payments: '++id, leaseId, date'
  });
  ```
- [ ] Sync tables: transactions, properties, leases, customers, payments
- [ ] Conflict resolution strategy (timestamp-based)

#### 2.3 Sync Queue System (5 jours)
- [ ] Queue data structure (actions hors ligne)
  ```typescript
  interface QueuedAction {
    id: string;
    type: 'create' | 'update' | 'delete';
    resource: string; // 'transaction', 'payment', etc.
    data: any;
    timestamp: number;
    retries: number;
  }
  ```
- [ ] `useSyncQueue()` hook
  - [ ] Ajouter action à queue
  - [ ] Retry logic avec exponential backoff
  - [ ] Conflict detection (last-write-wins)
- [ ] Background sync quand online

**Deliverables**:
- [ ] Service Worker implémenté et testé
- [ ] Dexie schema validé
- [ ] Sync queue fonctionnelle
- [ ] Offline/online tests passés

---

### **Phase 3 — Mobile Optimizations** (2 semaines)
**Objectif**: Performance et UX mobile

- [ ] **Image Optimization**
  - [ ] Lazy loading avec IntersectionObserver
  - [ ] WebP format avec fallback PNG
  - [ ] Responsive images (srcset)
  - [ ] Compression (tinypng)

- [ ] **API Request Batching**
  - [ ] Grouper requêtes (ex: charger 10 propriétés en 1 requête)
  - [ ] Pagination lazy-load
  - [ ] Reduce round-trips

- [ ] **Progressive Data Loading**
  - [ ] Skeleton screens pour tableaux/listes
  - [ ] Streaming JSON (priorité données critiques)
  - [ ] Incremental rendering

- [ ] **Form Optimization**
  - [ ] Native date pickers sur mobile
  - [ ] Mobile-friendly selects (full-screen options)
  - [ ] Input masking (téléphone, code postal)
  - [ ] Auto-save drafts

- [ ] **Performance Metrics**
  - [ ] Lighthouse Mobile ≥ 80%
  - [ ] First Contentful Paint < 2s
  - [ ] Time to Interactive < 3s

**Deliverables**:
- [ ] Lighthouse scores ≥ 80%
- [ ] Images optimisées
- [ ] Progressive loading implémenté
- [ ] Forms mobile-friendly

---

### **Phase 4 — Native Apps (Flutter)** (4 semaines)
**Objectif**: iOS/Android natif pour meilleure UX

#### 4.1 Flutter Setup (1 semaine)
- [ ] Create Flutter project
- [ ] Share business logic avec CRM web
  ```
  ├─ lib/
  │  ├─ models/       (shared entities)
  │  ├─ services/     (API, sync, cache)
  │  └─ ui/           (Flutter widgets)
  ```
- [ ] HTTP client configuration (same API endpoints)

#### 4.2 Core Features (2 semaines)
- [ ] Authentication (JWT same as web)
- [ ] Offline cache (Hive for local storage)
- [ ] Sync engine (same logic as web)
- [ ] Key screens:
  - [ ] Dashboard
  - [ ] Transactions (créer, éditer)
  - [ ] Properties list + detail
  - [ ] Payments

#### 4.3 Native Integrations (1 semaine)
- [ ] Deep linking (flutter://transaction/123)
- [ ] Push notifications
- [ ] Camera (photos pour propriétés)
- [ ] Geolocation (pour inspections)

**Deliverables**:
- [ ] iOS app on App Store
- [ ] Android app on Google Play
- [ ] Feature parity avec web version
- [ ] Push notifications working

---

## 🎯 Priorités par Module CRM

### 🔴 **CRITIQUE** (Phase 1-2)
| Module | Raison | Mobile Features |
|--------|--------|-----------------|
| **Comptabilité** | Saisir dépenses en temps réel sur terrain | Formulaire rapide, offline |
| **Transactions** | Paiements mobiles, reçus | Créer transaction, sync |

### 🟠 **HAUTE** (Phase 1-2)
| Module | Raison | Mobile Features |
|--------|--------|-----------------|
| **Propriétés** | Inspections sur site | Detail card, photos, notes offline |
| **Leases** | Consultées en déplacement | Liste responsive, search |

### 🟡 **MOYENNE** (Phase 3)
| Module | Raison | Mobile Features |
|--------|--------|-----------------|
| **Clients** | Fiches consulting | Cards, contact info, links |
| **Fournisseurs** | Références en déplacement | Search, filters |

### 🟢 **BASSE** (Phase 4)
| Module | Raison | Mobile Features |
|--------|--------|-----------------|
| **Rapports** | Dashboards lisibles | Charts responsive, export |

---

## 💻 Tech Stack

### Frontend
```json
{
  "react": "^18.2.0",
  "next.js": "^14.0.0",
  "react-query": "^3.39.3",
  "dexie": "^3.2.4",
  "workbox": "^7.0.0",
  "react-responsive": "^9.0.0",
  "antd": "^5.0.0"
}
```

### Backend
```javascript
// New endpoints for mobile
GET    /api/v2/mobile/transactions
POST   /api/v2/mobile/transactions
PATCH  /api/v2/mobile/transactions/:id
DELETE /api/v2/mobile/transactions/:id

// Webhooks
POST   /api/v2/mobile/webhooks/sync
// Payload: { leaseId, timestamp, resources: ['transactions', 'properties'] }

// Last-Modified header for caching
GET    /api/v2/mobile/transactions?since=2026-05-26T10:00:00Z
Response: Last-Modified: 2026-05-26T12:30:00Z
```

### Mobile
```
Flutter 3.20+
Dart 3.0+
Provider (state management)
Hive (local storage)
Dio (HTTP client)
```

---

## ✅ Acceptance Criteria

### Global
- [ ] PWA installable sur Chrome (Add to Home Screen)
- [ ] Offline mode: actions queuedées, sync automatique quand online
- [ ] 80%+ Lighthouse Mobile score
- [ ] Touch UX optimisée (sizes, spacing, responsiveness)

### Par Phase
- [ ] **Phase 1**: All major modules responsive on 320px-1024px
- [ ] **Phase 2**: Offline sync queue tested, conflict resolution working
- [ ] **Phase 3**: Lighthouse ≥ 80%, images optimized
- [ ] **Phase 4**: iOS/Android apps in stores, feature parity

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Sync queue logic
- [ ] Conflict resolution
- [ ] Cache invalidation

### Integration Tests
- [ ] Offline → online flow
- [ ] API batching
- [ ] Offline form submission

### E2E Tests
- [ ] PWA installation
- [ ] Offline transaction creation
- [ ] Sync verification

### Device Testing
- [ ] iPhone 12 mini (5.4")
- [ ] iPhone 14 (6.1")
- [ ] iPhone 15 Plus (6.7")
- [ ] Samsung Galaxy A13 (6.5")
- [ ] iPad 10th gen (10.9")
- [ ] Desktop (1920×1080)

---

## 📊 Success Metrics

| Métrique | Cible | Baseline |
|----------|-------|----------|
| Lighthouse Mobile | ≥ 80% | - |
| First Contentful Paint | < 2s | - |
| Time to Interactive | < 3s | - |
| Offline sync success rate | > 99% | - |
| Conflict resolution rate | > 99% | - |
| iOS/Android store rating | ≥ 4.5⭐ | - |

---

## 🚀 Déploiement & Release

### Development
- [ ] Deploy PWA to https://dev.ongdngolu.org
- [ ] Service Worker caching tested
- [ ] Offline mode QA

### Staging
- [ ] Beta test on iOS TestFlight
- [ ] Beta test on Android Google Play
- [ ] Lighthouse audit

### Production
- [ ] Release PWA (auto-update Service Worker)
- [ ] App Store release (iOS)
- [ ] Google Play release (Android)
- [ ] Monitor crash rates + performance

---

## 📝 Estimation & Timeline

```
Phase 1 (Responsive)       [█████░░░░░░░░░░░░░░] 2 semaines
Phase 2 (Offline)          [██████████░░░░░░░░░░] 3 semaines
Phase 3 (Optimizations)    [████░░░░░░░░░░░░░░░░] 2 semaines
Phase 4 (Flutter)          [██████░░░░░░░░░░░░░░] 4 semaines
                           ─────────────────────────
                           TOTAL: 11 semaines
```

### Resource Requirements
- **1x Frontend Engineer** (React/Mobile specialist)
- **1x Backend Engineer** (API optimization, webhooks)
- **1x QA Engineer** (responsive + offline testing)
- **1x Flutter Engineer** (Phase 4 only)

---

## 🔒 Considérations de Sécurité

- [ ] JWT tokens stored securely (httpOnly cookies + IndexedDB backup)
- [ ] Offline data encrypted with AES-256
- [ ] Sync queue signed (HMAC) to prevent tampering
- [ ] HTTPS everywhere (Service Worker blocks http)
- [ ] CSP headers for security

---

## 📚 Documentation & Support

- [ ] PWA setup guide for devs
- [ ] Offline mode architecture doc
- [ ] Flutter shared logic doc
- [ ] Mobile testing checklist
- [ ] Sync queue troubleshooting guide

---

## 🔗 Références

- [Workbox Docs](https://developers.google.com/web/tools/workbox)
- [Dexie.js Docs](https://dexie.org)
- [Flutter Docs](https://flutter.dev/docs)
- [Web.dev Mobile](https://web.dev/mobile)

---

**Ticket Creator**: Claude Code  
**Date**: 2026-05-26  
**Status**: Ready for Jira Creation  

---

## 📌 Comment créer le ticket Jira

1. Va sur https://14735340canadainc.atlassian.net/browse/SCRUM
2. Clique **"Create Issue"**
3. **Type**: Epic ou Story (High Priority)
4. **Summary**: `CRM Mobile Adaptation — PWA + Offline Strategy`
5. **Description**: Copie le contenu ci-dessus
6. **Labels**: mobile, pwa, offline, architecture, farmos
7. **Create**

Le ticket créé servira de parent pour les 4 phases et sous-tâches.
