<script setup>
// Page « Toutes les applications » d'avelomi.com (#/apps).
// Portée depuis avelomi-all-apps.html : catalogue par catégorie, recherche,
// filtres par catégorie et modal de détail d'app. Bilingue FR/EN (prop lang).
import { ref, computed } from 'vue';

const props = defineProps({ lang: { type: String, default: 'fr' } });

const I = {
  wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  pkg:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  brief:'<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  kanban:'<path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/>',
  building:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  hat:'<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
  truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  chart:'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  spark:'<path d="M12 3v3"/><path d="M12 18v3"/><path d="M5.6 5.6l2.1 2.1"/><path d="M16.3 16.3l2.1 2.1"/><path d="M3 12h3"/><path d="M18 12h3"/><circle cx="12" cy="12" r="4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8"/><path d="M16 12H8"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  qrpay:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM14 20h3M20 14v3M17 20h4v-3"/>',
};
const grad = (a, b) => `linear-gradient(135deg,${a},${b})`;
const FARMOS_IMG = '/img/farmos-icon.png';

const CATS = [
  { key:'finance', icon:I.wallet, c:grad('#2563eb','#0ea5e9'),
    fr:'Finance', en:'Finance', fr_s:'Compta, factures, trésorerie', en_s:'Accounting, billing, cash',
    apps:[
      {fr:'Comptabilité',en:'Accounting',fr_d:'Multi-devises',en_d:'Multi-currency',icon:I.wallet},
      {fr:'Facturation',en:'Invoicing',fr_d:'Devis & factures',en_d:'Quotes & bills',icon:I.file},
      {fr:'Dépenses',en:'Expenses',fr_d:'Notes de frais',en_d:'Expense reports',icon:I.receipt},
      {fr:'Analytique',en:'Analytics',fr_d:'Tableaux de bord',en_d:'Dashboards',icon:I.chart},
      {fr:'KodaPay',en:'KodaPay',fr_d:'Commande & paiement resto (QR code)',en_d:'Restaurant order & payment (QR code)',icon:I.qrpay,soon:true},
    ]},
  { key:'sales', icon:I.target, c:grad('#a78bfa','#7c3aed'),
    fr:'Ventes', en:'Sales', fr_s:'CRM, devis, point de vente', en_s:'CRM, quotes, POS',
    apps:[
      {fr:'CRM',en:'CRM',fr_d:'Pipeline & opportunités',en_d:'Pipeline & deals',icon:I.target},
      {fr:'Ventes',en:'Sales',fr_d:'Bons de commande',en_d:'Sales orders',icon:I.file},
      {fr:'Point de vente',en:'Point of Sale',fr_d:'Caisse & terrain',en_d:'Cashier & field',icon:I.cart},
      {fr:'Emailing',en:'Email Marketing',fr_d:'Campagnes',en_d:'Campaigns',icon:I.mail},
    ]},
  { key:'ops', icon:I.pkg, c:grad('#34d399','#059669'),
    fr:'Opérations', en:'Operations', fr_s:'Stock, achats, logistique', en_s:'Inventory, purchase, logistics',
    apps:[
      {fr:'Stock',en:'Inventory',fr_d:'Entrepôts & lots',en_d:'Warehouses & lots',icon:I.pkg},
      {fr:'Achats',en:'Purchase',fr_d:'Fournisseurs',en_d:'Suppliers',icon:I.truck},
      {fr:'Maintenance',en:'Maintenance',fr_d:'Interventions',en_d:'Work orders',icon:I.wrench},
    ]},
  { key:'field', icon:FARMOS_IMG, img:true, c:grad('#2dd4bf','#0d9488'),
    fr:'Métiers de terrain', en:'Field businesses', fr_s:'Immobilier, chantier, élevage', en_s:'Real estate, construction, livestock',
    apps:[
      {fr:'Immobilier',en:'Real Estate',fr_d:'Baux & loyers',en_d:'Leases & rent',icon:I.building},
      {fr:'BatiPro',en:'BatiPro',fr_d:'Chantiers BTP',en_d:'Construction sites',icon:I.hat},
      {fr:'FarmOS',en:'FarmOS',fr_d:'Élevage & culture',en_d:'Livestock & crops',img:FARMOS_IMG},
      {fr:'Cultures',en:'Crops',fr_d:'Parcelles & récoltes',en_d:'Plots & harvests',icon:I.leaf,soon:true},
    ]},
  { key:'hr', icon:I.brief, c:grad('#14b8a6','#0f766e'),
    fr:'Ressources humaines', en:'Human Resources', fr_s:'Paie, congés, recrutement', en_s:'Payroll, leave, hiring',
    apps:[
      {fr:'Employés',en:'Employees',fr_d:'Annuaire RH',en_d:'HR directory',icon:I.users},
      {fr:'Paie',en:'Payroll',fr_d:'Bulletins & cotisations',en_d:'Payslips & contributions',icon:I.wallet},
      {fr:'Congés',en:'Time Off',fr_d:'Demandes & soldes',en_d:'Requests & balances',icon:I.calendar},
      {fr:'Recrutement',en:'Recruitment',fr_d:'Candidats & CV',en_d:'Applicants & CVs',icon:I.brief},
    ]},
  { key:'prod', icon:I.kanban, c:grad('#84cc16','#4d7c0f'),
    fr:'Productivité', en:'Productivity', fr_s:'Projets, IA, paramétrage', en_s:'Projects, AI, settings',
    apps:[
      {fr:'Projets',en:'Projects',fr_d:'Tâches & temps',en_d:'Tasks & time',icon:I.kanban},
      {fr:'Assistant IA',en:'AI Assistant',fr_d:'Demandez, il agit',en_d:'Ask, it acts',icon:I.spark},
      {fr:'Feuilles de temps',en:'Timesheets',fr_d:'Suivi des heures',en_d:'Hours tracking',icon:I.clock},
      {fr:'Documents',en:'Documents',fr_d:'GED & signatures',en_d:'Files & e-sign',icon:I.book},
      {fr:'Paramètres',en:'Settings',fr_d:'Rôles & permissions',en_d:'Roles & permissions',icon:I.cog},
    ]},
];

const DET = {
  'Accounting':{fr_p:'Balance équilibrée : Débit 1 180 $ = Crédit 1 180 $',en_p:'Balanced entry: Debit $1,180 = Credit $1,180',f:[['Comptabilité en partie double, plan comptable complet','Double-entry accounting, full chart of accounts'],['Multi-devises (USD/CDF/EUR) avec taux automatiques','Multi-currency (USD/CDF/EUR) with auto FX rates'],['Compte de résultat & bilan en temps réel','Real-time P&L and balance sheet']]},
  'Invoicing':{fr_p:'Facture VTE/2026/0184 — payée, écriture générée',en_p:'Invoice SAL/2026/0184 — paid, entry posted',f:[['Devis → facture → encaissement en un flux','Quote → invoice → payment in one flow'],['Relances automatiques des impayés','Automatic dunning of overdue bills'],['PDF personnalisé, envoi par email','Branded PDF, email delivery']]},
  'Expenses':{fr_p:"Note de frais 250 $ — en attente d'approbation",en_p:'Expense report $250 — awaiting approval',f:[['Saisie mobile avec photo du reçu','Mobile capture with receipt photo'],['Validation par le supérieur','Manager approval workflow'],['Remboursement et comptabilisation auto','Auto reimbursement and posting']]},
  'Analytics':{fr_p:'CA consolidé ▲ 18.2 % ce trimestre',en_p:'Consolidated revenue ▲ 18.2% this quarter',f:[['Tableaux de bord temps réel par module','Real-time dashboards per module'],['Prévisions multi-scénarios','Multi-scenario forecasts'],['Export PDF & Excel en un clic','One-click PDF & Excel export']]},
  'CRM':{fr_p:"7 opportunités · 1 en retard, 1 aujourd'hui",en_p:'7 opportunities · 1 late, 1 today',f:[['Pipeline visuel glisser-déposer','Visual drag-and-drop pipeline'],['Suivi des relances et activités','Follow-ups and activity tracking'],["Conversion devis depuis l'opportunité",'Quote conversion from the deal']]},
  'Sales':{fr_p:'Bon de commande confirmé → stock réservé',en_p:'Sales order confirmed → stock reserved',f:[['Bons de commande & livraisons','Sales orders & deliveries'],['Tarifs et remises par client','Customer-specific pricing & discounts'],['Mise à jour stock et compta automatique','Auto stock and accounting update']]},
  'Point of Sale':{fr_p:'Caisse ouverte · paiement Mobile Money accepté',en_p:'Register open · Mobile Money accepted',f:[['Interface caisse tactile, rapide','Fast touch cashier interface'],['Fonctionne hors-ligne','Works offline'],['Stock et ventes synchronisés','Stock and sales synced']]},
  'Email Marketing':{fr_p:'Campagne envoyée à 1 240 contacts',en_p:'Campaign sent to 1,240 contacts',f:[["Éditeur d'emails par blocs",'Block-based email editor'],['Segmentation des contacts','Contact segmentation'],["Statistiques d'ouverture et de clics",'Open and click analytics']]},
  'Inventory':{fr_p:'Lot #34 · 312 kg · délai de retrait respecté',en_p:'Lot #34 · 312 kg · withdrawal period cleared',f:[['Multi-entrepôts et suivi par lot','Multi-warehouse and lot tracking'],['Mouvements et inventaires','Stock moves and counts'],['Alertes de réapprovisionnement','Reordering alerts']]},
  'Purchase':{fr_p:"Demande d'achat ACH/041 — 2 niveaux validés",en_p:'Purchase request PUR/041 — 2 levels approved',f:[["Demandes d'achat avec approbation",'Purchase requests with approval'],['Suivi fournisseurs et réceptions','Supplier and receipt tracking'],['Lien direct avec le stock et la compta','Direct link to stock and accounting']]},
  'Maintenance':{fr_p:'Intervention #18 planifiée — équipe terrain',en_p:'Work order #18 scheduled — field team',f:[['Interventions préventives et correctives','Preventive and corrective work orders'],['Planning des équipes','Team scheduling'],['Historique par équipement','History per asset']]},
  'Real Estate':{fr_p:'Bail Apt. B12 · loyer à jour · caution 1 300 $',en_p:'Lease Apt. B12 · rent up to date · deposit $1,300',f:[['Baux, loyers et quittances PDF','Leases, rent and PDF receipts'],['Cautions et taxe par bail','Deposits and per-lease tax'],["Rappels d'échéance automatiques",'Automatic due-date reminders']]},
  'BatiPro':{fr_p:'Chantier Matete · situation n°3 · 68 %',en_p:'Matete site · progress claim #3 · 68%',f:[['Planning et situations de chantier','Site planning and progress claims'],['Plan 3D depuis une photo','3D plan from a photo'],["Facturation à l'avancement",'Progress-based invoicing']]},
  'FarmOS':{fr_p:'Lot bovin #34 · marge 184 $/tête · sain',en_p:'Cattle lot #34 · margin $184/head · healthy',f:[['Cheptel, zones et bâtiments','Herd, zones and buildings'],['Dossier vétérinaire et délai de retrait','Vet records and withdrawal period'],['Rentabilité par animal ou par lot','Profitability per animal or lot']]},
  'Crops':{fr_p:'Parcelle Nord · semis prévu en avril',en_p:'North plot · sowing planned in April',f:[['Parcelles, semis et récoltes','Plots, sowing and harvests'],['Suivi des intrants','Input tracking'],['Rendement par parcelle','Yield per plot']]},
  'Employees':{fr_p:'Annuaire · 42 employés · 3 contrats à renouveler',en_p:'Directory · 42 employees · 3 contracts to renew',f:[['Dossiers employés et contrats','Employee files and contracts'],['Organigramme et équipes','Org chart and teams'],['Documents RH signés','Signed HR documents']]},
  'Payroll':{fr_p:'Bulletin juin · net à payer 551 $ · approuvé',en_p:'June payslip · net pay $551 · approved',f:[['Bulletins de paie et cotisations (CNSS)','Payslips and contributions (CNSS)'],['Adapté à votre pays','Localized to your country'],['Génération PDF et historique','PDF generation and history']]},
  'Time Off':{fr_p:'2 demandes de congé en attente',en_p:'2 leave requests pending',f:[['Demandes et validation des congés','Leave requests and approval'],['Soldes et jours fériés','Balances and public holidays'],["Calendrier d'équipe",'Team calendar']]},
  'Recruitment':{fr_p:"6 candidats à traiter · 1 entretien aujourd'hui",en_p:'6 applicants to review · 1 interview today',f:[['Suivi des candidatures par étape','Stage-based applicant tracking'],['Upload de CV et notes','CV upload and notes'],["Du candidat à l'embauche",'From applicant to hire']]},
  'Projects':{fr_p:'Refonte site · Phase 2 · 72 % · 86 h pointées',en_p:'Site revamp · Phase 2 · 72% · 86 h logged',f:[['Tableaux Kanban et tâches','Kanban boards and tasks'],['Suivi du temps et des coûts','Time and cost tracking'],['Facturation au temps passé','Time-based billing']]},
  'AI Assistant':{fr_p:'« Ajoute une dépense 250 $ » → ✓ créée, à valider',en_p:'"Add a $250 expense" → ✓ created, to confirm',f:[['Saisie en langage naturel (crée des données)','Plain-language data entry (creates records)'],['Prévisions et multi-scénarios','Forecasts and multi-scenario'],['Lit vos vraies données, sans saisie en plus','Reads your real data, no extra input']]},
  'Timesheets':{fr_p:'86 h pointées cette semaine sur 3 projets',en_p:'86 h logged this week across 3 projects',f:[['Saisie des heures par projet','Hours entry per project'],['Validation hebdomadaire','Weekly approval'],['Lien avec la paie et la facturation','Link to payroll and billing']]},
  'Documents':{fr_p:'Contrat signé électroniquement · archivé',en_p:'Contract e-signed · archived',f:[['GED centralisée et recherche','Central document store and search'],['Signature électronique','Electronic signature'],['Partage et permissions','Sharing and permissions']]},
  'Settings':{fr_p:'Rôle « Comptable » · 12 permissions actives',en_p:'"Accountant" role · 12 active permissions',f:[['Rôles et permissions fines','Roles and fine-grained permissions'],['Utilisateurs et sécurité (2FA)','Users and security (2FA)'],['Paramétrage par module','Per-module configuration']]},
};
function det(a){
  return DET[a.en] || { fr_p:a.fr_d, en_p:a.en_d, f:[[a.fr_d,a.en_d],['Intégré au reste de la plateforme','Integrated with the rest of the platform'],['Inclus, même dans le forfait gratuit','Included, even on the free plan']] };
}

// rattache chaque app à sa catégorie (pour l'en-tête du modal) ; les apps héritent
// de la couleur de leur catégorie sauf si elles définissent la leur explicitement
CATS.forEach(c => c.apps.forEach(a => { a._cat = c; if (!a.c) a.c = c.c; }));

const isEn = computed(() => props.lang === 'en');
const t = (fr, en) => (isEn.value ? en : fr);

// ----- recherche + filtre catégorie -----
const query = ref('');
const activeCat = ref('all');

function setCat(key){ activeCat.value = key; query.value = ''; }

const visibleCats = computed(() => {
  const q = query.value.trim().toLowerCase();
  return CATS
    .filter(c => activeCat.value === 'all' || c.key === activeCat.value)
    .map(c => {
      const apps = q
        ? c.apps.filter(a => (a.fr + ' ' + a.en).toLowerCase().includes(q))
        : c.apps;
      return { ...c, _apps: apps };
    })
    .filter(c => c._apps.length > 0);
});

// ----- modal détail -----
const selected = ref(null);
function openApp(a){ selected.value = a; }
function closeApp(){ selected.value = null; }
const selDet = computed(() => (selected.value ? det(selected.value) : null));

function goHome(){ location.hash = ''; }
</script>

<template>
  <div class="av av-apps" :class="isEn ? 'lang-en' : 'lang-fr'">
    <!-- header -->
    <header>
      <div class="wrap">
        <nav>
          <a class="logo" href="#" @click.prevent="goHome">
            <span class="mark"><svg viewBox="0 0 64 64" aria-label="Avelomi"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/><rect x="-6.5" y="-6.5" width="13" height="13" rx="3.5" transform="rotate(45)" fill="#0e7a48"/><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.6" transform="rotate(45)" fill="#ffffff"/></g></svg></span> Avelomi
          </a>
          <div class="nav-right">
            <a class="btn btn-ghost btn-connexion" href="/crm"><span data-fr>Connexion</span><span data-en>Sign in</span></a>
            <a class="btn btn-primary" href="/crm"><span data-fr>Commencer</span><span data-en>Start now</span></a>
          </div>
        </nav>
      </div>
    </header>

    <div class="wrap">
      <div class="apps-head">
        <div class="crumb"><a href="#" @click.prevent="goHome">← {{ t('Accueil','Home') }}</a></div>
        <div class="eyebrow">{{ t('Toutes les applications','All apps') }}</div>
        <h1>
          <template v-if="!isEn">Un besoin ? <span class="hl">Il y a une appli</span> pour ça.</template>
          <template v-else>Got a need? <span class="hl">There's an app</span> for that.</template>
        </h1>
        <p>{{ t("Toutes les applications Avelomi sont incluses, même dans le forfait gratuit, et chacune existe aussi en app mobile (iOS & Android, hors-ligne). Activez celles dont vous avez besoin, ajoutez les autres en grandissant.","Every Avelomi app is included, even on the free plan, and each one also ships as a mobile app (iOS & Android, offline-ready). Turn on what you need, add the rest as you grow.") }}</p>
      </div>

      <div class="apps-tools">
        <div class="apps-search">🔎 <input type="text" v-model="query" :placeholder="t('Rechercher une application…','Search an app…')" /></div>
        <div class="chips">
          <button class="chip" :class="{on: activeCat==='all'}" @click="setCat('all')">{{ t('Toutes','All') }}</button>
          <button v-for="c in CATS" :key="c.key" class="chip" :class="{on: activeCat===c.key}" @click="setCat(c.key)">{{ t(c.fr, c.en) }}</button>
        </div>
      </div>
    </div>

    <main class="wrap">
      <section class="cat" v-for="c in visibleCats" :key="c.key">
        <div class="cat-head">
          <span class="ci" v-if="c.img" style="overflow:hidden;background:#fff;border:1px solid var(--line)"><img :src="c.icon" alt="" style="width:100%;height:100%;object-fit:cover"></span>
          <span class="ci" v-else :style="{background:c.c}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="c.icon"></svg></span>
          <h2>{{ t(c.fr, c.en) }}</h2><span>{{ t(c.fr_s, c.en_s) }}</span>
        </div>
        <div class="agrid">
          <a class="acard" href="#" v-for="a in c._apps" :key="a.en" @click.prevent="openApp(a)">
            <span class="ab" v-if="a.img"><img :src="a.img" alt=""></span>
            <span class="ab" v-else :style="{background:a.c}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="a.icon"></svg></span>
            <span><b>{{ t(a.fr, a.en) }}</b><small>{{ t(a.fr_d, a.en_d) }}</small></span>
            <span class="soon" v-if="a.soon">{{ t('Bientôt','Soon') }}</span>
          </a>
        </div>
      </section>
    </main>

    <div class="wrap">
      <div class="apps-cta">
        <h2>{{ t('Toutes ces apps. Gratuitement.','All these apps. For free.') }}</h2>
        <p>{{ t('Créez votre espace en 5 minutes, sans carte bancaire.','Set up your workspace in 5 minutes, no credit card.') }}</p>
        <a class="btn btn-primary" style="padding:15px 28px;font-size:16.5px" href="/crm">{{ t("Commencer — c'est gratuit","Start now — it's free") }}</a>
      </div>
    </div>

    <footer style="border-top:1px solid var(--line);padding:40px 0;background:var(--bg-soft);text-align:center;color:#93a0b4;font-size:13.5px;margin-top:30px">
      <span>© 2026 Avelomi. {{ t('Tous droits réservés.','All rights reserved.') }}</span>
    </footer>

    <!-- modal détail app -->
    <div class="ov" :class="{show: selected}" @click.self="closeApp" v-if="selected">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="m-top">
          <span class="m-ic" v-if="selected.img"><img :src="selected.img" alt=""></span>
          <span class="m-ic" v-else :style="{background:selected.c}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="selected.icon"></svg></span>
          <div>
            <div class="m-cat">{{ t(selected._cat ? selected._cat.fr : '', selected._cat ? selected._cat.en : '') }}</div>
            <h3>{{ t(selected.fr, selected.en) }}<span class="m-soon" v-if="selected.soon">{{ t('Bientôt','Soon') }}</span></h3>
          </div>
          <button class="m-x" @click="closeApp" aria-label="Fermer">✕</button>
        </div>
        <div class="m-body">
          <p class="m-desc">{{ t(selected.fr_d + ' — intégré à toute votre activité sur Avelomi.', selected.en_d + ' — connected to your whole business on Avelomi.') }}</p>
          <ul class="m-list">
            <li v-for="(x,i) in selDet.f" :key="i"><span class="mk">✓</span><span>{{ t(x[0], x[1]) }}</span></li>
          </ul>
          <div class="m-prev"><span class="mp-dot"></span><span>{{ t(selDet.fr_p, selDet.en_p) }}</span></div>
        </div>
        <div class="m-foot">
          <a class="btn btn-primary" href="/crm" v-if="!selected.soon">{{ t('Activer cette app','Enable this app') }}</a>
          <a class="btn btn-ghost" href="#" @click.prevent v-else>{{ t('Être prévenu au lancement','Notify me at launch') }}</a>
          <a class="btn btn-ghost" href="#" @click.prevent="goHome">{{ t('En savoir plus','Learn more') }}</a>
        </div>
      </div>
    </div>
  </div>
</template>
