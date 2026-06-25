<script setup>
// Landing Avelomi (avelomi.com) — portée depuis le mockup HTML.
// Toggle FR/EN géré en réactif : la classe lang-fr / lang-en sur la racine .av
// pilote l’affichage des [data-fr] / [data-en] (règles dans style.css).
// La langue est partagée avec la page all-apps via v-model (App.vue).
import { computed } from 'vue';
const props = defineProps({ lang: { type: String, default: 'fr' } });
const emit = defineEmits(['update:lang']);
const lang = computed({
  get: () => props.lang,
  set: (v) => emit('update:lang', v),
});
</script>

<template>
  <div class="av" :class="lang === 'en' ? 'lang-en' : 'lang-fr'">

<header>
  <div class="wrap">
    <nav>
      <a class="logo" href="#"><span class="mark"><svg viewBox="0 0 64 64" aria-label="Avelomi"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/><rect x="-6.5" y="-6.5" width="13" height="13" rx="3.5" transform="rotate(45)" fill="#0e7a48"/><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.6" transform="rotate(45)" fill="#ffffff"/></g></svg></span> Avelomi</a>
      <div class="nav-links">
        <a href="#modules" data-fr>Applications</a><a href="#modules" data-en>Apps</a>
        <a href="#features" data-fr>Plateforme</a><a href="#features" data-en>Platform</a>
        <a href="#mobile" data-fr>Mobile</a><a href="#mobile" data-en>Mobile</a>
        <a href="#compare" data-fr>Comparer</a><a href="#compare" data-en>Compare</a>
        <a href="#pricing" data-fr>Tarifs</a><a href="#pricing" data-en>Pricing</a>
        <a href="#faq" data-fr>FAQ</a><a href="#faq" data-en>FAQ</a>
      </div>
      <div class="nav-right">
        <div class="lang">
          <button :class="{active: lang==='fr'}" @click="lang='fr'">FR</button>
          <button :class="{active: lang==='en'}" @click="lang='en'">EN</button>
        </div>
        <a class="btn btn-ghost btn-connexion" href="#"><span data-fr>Connexion</span><span data-en>Sign in</span></a>
        <a class="btn btn-primary" href="#"><span data-fr>Commencer</span><span data-en>Start now</span></a>
      </div>
    </nav>
  </div>
</header>

<!-- HERO -->
<section class="hero">
  <span class="doodle d1">↘</span>
  <span class="doodle d3">➜</span>
  <div class="wrap">
    <span class="pill"><span class="dot"></span>
      <span data-fr>Une seule plateforme. Toute votre entreprise.</span>
      <span data-en>One platform. Your entire company.</span>
    </span>
    <h1>
      <span data-fr>Toute votre activité sur <span class="hl">une seule plateforme</span></span>
      <span data-en>All your business on <span class="hl">one platform</span></span>
    </h1>
    <p class="sub">
      <span data-fr>Compta, ventes, RH, stock, immobilier, agriculture, projets — des applications simples et 100&nbsp;% intégrées. Toute la puissance d'un grand ERP, sans la complexité ni la facture.</span>
      <span data-en>Accounting, sales, HR, inventory, real estate, agriculture, projects — simple apps, 100% integrated. The power of a major ERP, without the complexity or the bill.</span>
    </p>
    <div class="hero-cta">
      <a class="btn btn-primary btn-lg" href="#"><span data-fr>Commencer — c'est gratuit</span><span data-en>Start now — it's free</span></a>
      <a class="btn btn-ghost btn-lg" href="#"><span data-fr>▶ Voir la démo</span><span data-en>▶ Watch demo</span></a>
    </div>
    <p class="hero-note">
      <span data-fr>À partir de <span class="price-strong">19&nbsp;$/mois</span> · Sans carte bancaire · Tout illimité</span>
      <span data-en>From <span class="price-strong">$19/month</span> · No credit card · Unlimited everything</span>
    </p>
    <div class="stores" style="justify-content:center;margin-top:16px">
      <a class="store" href="#">
        <svg viewBox="0 0 24 24" fill="#fff"><path d="M16.36 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.55 2.05-1.11.02-1.47-.66-2.74-.66s-1.67.64-2.72.68c-1.1.04-1.94-1.1-2.63-2.11-1.42-2.07-2.5-5.84-1.05-8.39.72-1.27 2.01-2.07 3.41-2.09 1.08-.02 2.09.72 2.74.72.65 0 1.88-.89 3.17-.76.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.78 3.18M14.28 5.5c.57-.69.96-1.65.85-2.61-.83.03-1.83.55-2.42 1.24-.53.61-.99 1.59-.87 2.53.92.07 1.87-.47 2.44-1.16"/></svg>
        <span class="st-t"><small data-fr>Télécharger sur</small><small data-en>Download on the</small><b>App Store</b></span>
      </a>
      <a class="store" href="#">
        <svg viewBox="0 0 24 24"><path fill="#00d3ff" d="M3.27 1.84A1.5 1.5 0 0 0 3 2.7v18.6c0 .35.1.65.27.86L13.4 12 3.27 1.84z"/><path fill="#00f076" d="M16.95 8.37 4.9 1.46a1.46 1.46 0 0 0-1.63.38L13.4 12l3.55-3.63z"/><path fill="#ffce00" d="m16.95 8.37-3.55 3.63 3.55 3.63 3.06-1.76c.99-.57.99-2.17 0-2.74l-3.06-1.76z"/><path fill="#ff3a44" d="M3.27 22.16c.43.5 1.12.62 1.63.38l12.05-6.91L13.4 12 3.27 22.16z"/></svg>
        <span class="st-t"><small data-fr>Disponible sur</small><small data-en>Get it on</small><b>Google Play</b></span>
      </a>
    </div>

    <!-- APP GRID AS HERO (Odoo style) -->
    <p class="hero-apps-kick">
      <span data-fr>Une collection complète d'applications métier à votre disposition. Un besoin ? Il y a une appli pour ça.</span>
      <span data-en>A full collection of business apps at your fingertips. Got a need? There's an app for that.</span>
    </p>
    <div class="hero-apps">
      <!-- Comptabilité — Wallet, blue→sky -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#2563eb,#0ea5e9)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
      </span><b data-fr>Comptabilité</b><b data-en>Accounting</b></a>
      <!-- Ventes — FileText, violet -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#a78bfa,#7c3aed)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
      </span><b data-fr>Ventes & CRM</b><b data-en>Sales & CRM</b></a>
      <!-- Produits/Stock — Package, emerald -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#34d399,#059669)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      </span><b data-fr>Stock</b><b data-en>Inventory</b></a>
      <!-- Facturation — FileText, sky -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#38bdf8,#0284c7)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
      </span><b data-fr>Facturation</b><b data-en>Invoicing</b></a>
      <!-- RH — Briefcase, teal -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#14b8a6,#0f766e)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
      </span><b data-fr>Ress. H.</b><b data-en>HR</b></a>
      <!-- Projet — Kanban, lime -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#a3e635,#65a30d)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></svg>
      </span><b data-fr>Projets</b><b data-en>Projects</b></a>
      <!-- Immobilier — Building2, teal -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#2dd4bf,#0d9488)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
      </span><b data-fr>Immobilier</b><b data-en>Real Estate</b></a>
      <!-- BatiPro — HardHat, blue→amber -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#1d4ed8,#f59e0b)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>
      </span><b>BatiPro</b></a>
      <!-- FarmOS — vrai logo (tête de bœuf) -->
      <a class="happ" href="#"><span class="hb hb-img">
        <img src="/img/farmos-icon.png" alt="FarmOS" />
      </span><b>FarmOS</b></a>
      <!-- Achats — Truck, rose -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#fb7185,#e11d48)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </span><b data-fr>Achats</b><b data-en>Purchase</b></a>
      <!-- Point de Vente — ShoppingCart, orange -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#fb923c,#ea580c)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
      </span><b data-fr>Point de vente</b><b data-en>Point of Sale</b></a>
      <!-- Rapports/Analytique — BarChart3, blue -->
      <a class="happ" href="#"><span class="hb" style="background:linear-gradient(135deg,#60a5fa,#2563eb)">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
      </span><b data-fr>Analytique</b><b data-en>Analytics</b></a>
    </div>
    <a class="happ-all" href="#/apps"><span data-fr>Voir toutes les applications →</span><span data-en>View all apps →</span></a>
  </div>
</section>

<!-- PRODUCT COLLAGE (Odoo-style overlapping screenshots) -->
<section class="showcase">
  <div class="collage">

    <!-- back: full dashboard browser -->
    <div class="c-card c-dash">
      <div class="browser-bar">
        <i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i>
        <span class="url">app.avelomi.com/dashboard</span>
      </div>
      <div class="dash-body">
        <div class="dash-col">
          <div class="dash-head"><b data-fr>En cours</b><b data-en>In progress</b><span class="plus">+</span></div>
          <div class="prog"><span style="width:55%;background:var(--gold)"></span></div><span class="ct">3</span>
          <div class="mini-card">
            <b data-fr>Chantier Matete</b><b data-en>Matete site</b>
            <div class="tags"><span class="tg tg-v" data-fr>Gros œuvre</span><span class="tg tg-v" data-en>Structure</span><span class="tg tg-g">Plan 3D</span></div>
            <small data-fr>Dans 2 jours</small><small data-en>In 2 days</small>
            <div class="stars">★★★☆☆ <span class="hh">80h</span></div>
          </div>
        </div>
        <div class="dash-col">
          <div class="dash-head"><b data-fr>À valider</b><b data-en>To review</b><span class="plus">+</span></div>
          <div class="prog"><span style="width:90%;background:var(--green)"></span></div><span class="ct">3</span>
          <div class="mini-card">
            <b data-fr>Bail — Apt. B12</b><b data-en>Lease — Apt. B12</b>
            <div class="floor">🏠 ▤▤▤</div>
            <div class="stars">★★★☆☆ <span class="hh">1h</span></div>
          </div>
          <div class="mini-card">
            <b data-fr>Lot bovin #34</b><b data-en>Cattle lot #34</b>
            <div class="tags"><span class="tg tg-b" data-fr>Élevage</span><span class="tg tg-b" data-en>Livestock</span><span class="tg tg-p" data-fr>Vétérinaire</span><span class="tg tg-p" data-en>Vet</span></div>
            <div class="stars">★★☆☆☆ <span class="hh">0h 30m</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- top-left: activity list -->
    <div class="c-card c-activity">
      <div class="act-bar"><span class="dots">📞 💬 🔔</span></div>
      <div class="act-row"><span class="ai ai1">📅</span><div><b data-fr>Échéance loyer</b><b data-en>Rent due</b><small data-fr>0 en retard · 1 aujourd'hui</small><small data-en>0 late · 1 today</small></div><span class="fut" data-fr>2 à venir</span><span class="fut" data-en>2 future</span></div>
      <div class="act-row"><span class="ai ai2">🌴</span><div><b data-fr>Congé</b><b data-en>Time off</b><small data-fr>0 en retard · 1 aujourd'hui</small><small data-en>0 late · 1 today</small></div><span class="fut" data-fr>0 à venir</span><span class="fut" data-en>0 future</span></div>
      <div class="act-row"><span class="ai ai3">💲</span><div><b data-fr>Écriture comptable</b><b data-en>Journal entry</b><small data-fr>0 en retard · 2 aujourd'hui</small><small data-en>0 late · 2 today</small></div><span class="fut" data-fr>4 à venir</span><span class="fut" data-en>4 future</span></div>
      <div class="act-row"><span class="ai ai4">🎯</span><div><b data-fr>Opportunité</b><b data-en>Opportunity</b><small data-fr>1 en retard · 1 aujourd'hui</small><small data-en>1 late · 1 today</small></div><span class="fut" data-fr>7 à venir</span><span class="fut" data-en>7 future</span></div>
      <div class="act-row"><span class="ai ai5">🎫</span><div><b data-fr>Intervention</b><b data-en>Maintenance</b><small data-fr>1 en retard · 1 aujourd'hui</small><small data-en>1 late · 1 today</small></div><span class="fut" data-fr>1 à venir</span><span class="fut" data-en>1 future</span></div>
      <div class="act-row"><span class="ai ai6">🧑</span><div><b data-fr>Candidat</b><b data-en>Applicant</b><small data-fr>6 en retard · 1 aujourd'hui</small><small data-en>6 late · 1 today</small></div><span class="fut" data-fr>0 à venir</span><span class="fut" data-en>0 future</span></div>
    </div>

    <!-- right: forecast / pilotage -->
    <div class="c-card c-ai">
      <div class="ai-bar"><b>✦ <span data-fr>Prévision</span><span data-en>Forecast</span></b><span class="ai-x">— ✕</span></div>
      <div class="bub me" data-fr>Quelle trésorerie dans 3 mois au rythme actuel ?</div>
      <div class="bub me" data-en>What's my cash in 3 months at the current pace?</div>
      <div class="bub ai" data-fr>Projection réaliste : <b>+71 420 $</b> fin septembre, dont 19 baux et 3 chantiers encaissés.</div>
      <div class="bub ai" data-en>Realistic projection: <b>+$71,420</b> by end of September, incl. 19 leases and 3 job sites collected.</div>
      <div class="bub ai bub-chart">
        <svg viewBox="0 0 240 96" preserveAspectRatio="none" width="100%" height="76">
          <polyline points="0,72 40,62 80,66 120,48 160,52 200,34 240,30" fill="none" stroke="#1fbf8f" stroke-width="3"/>
          <polyline points="120,48 160,44 200,32 240,22" fill="none" stroke="#6d5efc" stroke-width="3" stroke-dasharray="5 5"/>
          <line x1="120" y1="8" x2="120" y2="92" stroke="#d7deea" stroke-width="1.2"/>
        </svg>
        <div class="bc-leg"><span class="bcl bcl-g" data-fr>Réel</span><span class="bcl bcl-g" data-en>Actual</span><span class="bcl bcl-v" data-fr>Prévu</span><span class="bcl bcl-v" data-en>Forecast</span></div>
      </div>
      <div class="bub me" data-fr>Et en scénario prudent ?</div>
      <div class="bub me" data-en>And in a cautious scenario?</div>
      <div class="bub ai thinking" data-fr>✦ Calcul…</div>
      <div class="bub ai thinking" data-en>✦ Computing…</div>
      <div class="ai-input"><span data-fr>Poser une question…</span><span data-en>Ask a question…</span><span class="snd">➤</span></div>
    </div>

  </div>
</section>


<!-- MODULES -->
<section class="block soft" id="modules">
  <div class="wrap">
    <div class="eyebrow" data-fr>Explorez les applications</div><div class="eyebrow" data-en>Explore the apps</div>
    <h2 class="h2" data-fr>Chaque appli, <span class="mark-g">prête à l'emploi</span></h2>
    <h2 class="h2" data-en>Each app, <span class="mark-g">ready out of the box</span></h2>
    <p class="lead" data-fr>Cliquez pour découvrir ce que chaque application fait pour vous. Commencez avec une, ajoutez les autres quand vous grandissez.</p>
    <p class="lead" data-en>Click to see what each app does for you. Start with one, add the rest as you grow.</p>
    <div class="mods">
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#2563eb,#0ea5e9)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg></div><b data-fr>Comptabilité</b><b data-en>Accounting</b><small data-fr>Multi-devises</small><small data-en>Multi-currency</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#a78bfa,#7c3aed)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg></div><b data-fr>Ventes & CRM</b><b data-en>Sales & CRM</b><small data-fr>Pipeline</small><small data-en>Pipeline</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#34d399,#059669)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div><b data-fr>Stock</b><b data-en>Inventory</b><small data-fr>& Achats</small><small data-en>& Purchase</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#14b8a6,#0f766e)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg></div><b data-fr>Ress. H.</b><b data-en>Human Res.</b><small data-fr>Paie & congés</small><small data-en>Payroll & leave</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#2dd4bf,#0d9488)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div><b data-fr>Immobilier</b><b data-en>Real Estate</b><small data-fr>Baux & loyers</small><small data-en>Leases & rent</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#1d4ed8,#f59e0b)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg></div><b>BatiPro</b><small data-fr>Chantiers</small><small data-en>Job sites</small></div>
      <div class="mod"><div class="badge badge-img"><img src="/img/farmos-icon.png" alt="FarmOS" /></div><b>FarmOS</b><small data-fr>Élevage & culture</small><small data-en>Livestock & crops</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#a3e635,#65a30d)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></svg></div><b data-fr>Projets</b><b data-en>Projects</b><small data-fr>Tâches & temps</small><small data-en>Tasks & time</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#38bdf8,#0284c7)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg></div><b data-fr>Facturation</b><b data-en>Invoicing</b><small data-fr>Devis & factures</small><small data-en>Quotes & bills</small></div>
      <div class="mod"><div class="badge" style="background:linear-gradient(135deg,#60a5fa,#2563eb)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></div><b data-fr>Analytique</b><b data-en>Analytics</b><small data-fr>Tableaux de bord</small><small data-en>Dashboards</small></div>
    </div>
    <div class="mods-cta">
      <a class="btn btn-ghost btn-lg" href="#/apps"><span data-fr>Voir toutes les applications →</span><span data-en>View all apps →</span></a>
    </div>
  </div>
</section>

<!-- APP SHOWCASE (un exemple concret par app) -->
<section class="block" id="showcase-apps">
  <div class="wrap">
    <div class="eyebrow" data-fr>Vos métiers, en vrai</div><div class="eyebrow" data-en>Your real businesses</div>
    <h2 class="h2" data-fr>Un exemple <span class="mark-y">par application</span></h2>
    <h2 class="h2" data-en>One example <span class="mark-y">per app</span></h2>
    <p class="lead" data-fr>Pas une démo abstraite : voici à quoi ressemble chaque appli sur votre terrain — élevage, chantier, locatif, paie.</p>
    <p class="lead" data-en>Not an abstract demo: here's what each app looks like on your ground — livestock, job sites, rentals, payroll.</p>
    <div class="showgrid">

      <!-- FarmOS -->
      <div class="showcard">
        <div class="showcard-head">
          <span class="showcard-ic" style="overflow:hidden"><img src="/img/farmos-icon.png" alt="FarmOS" style="width:100%;height:100%;object-fit:cover"/></span>
          <div><b>FarmOS</b><small data-fr>Élevage & culture</small><small data-en>Livestock & crops</small></div>
        </div>
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Lot bovin #34 — Ferme Matete</b><b data-en>Cattle lot #34 — Matete farm</b><span class="ui-badge ok" data-fr>Sain</span><span class="ui-badge ok" data-en>Healthy</span></div>
          <table class="ui-tbl">
            <tr><th><span data-fr>Indicateur</span><span data-en>Metric</span></th><th><span data-fr>Valeur</span><span data-en>Value</span></th></tr>
            <tr><td><span data-fr>Têtes</span><span data-en>Head count</span></td><td>34</td></tr>
            <tr><td><span data-fr>Poids moyen</span><span data-en>Avg. weight</span></td><td>312 kg</td></tr>
            <tr><td><span data-fr>Mortalité (mois)</span><span data-en>Mortality (month)</span></td><td>1.2%</td></tr>
            <tr class="ui-tot"><td><span data-fr>Marge / tête</span><span data-en>Margin / head</span></td><td>$184</td></tr>
          </table>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Délai de retrait vétérinaire respecté · vente débloquée</span><span data-en>Vet withdrawal period cleared · sale unlocked</span></div>
        </div>
      </div>

      <!-- BatiPro -->
      <div class="showcard">
        <div class="showcard-head">
          <span class="showcard-ic" style="background:linear-gradient(135deg,#1d4ed8,#f59e0b)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>
          </span>
          <div><b>BatiPro</b><small data-fr>Chantiers BTP</small><small data-en>Construction sites</small></div>
        </div>
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Chantier Matete — Situation n°3</b><b data-en>Matete site — Progress claim #3</b><span class="ui-badge up">68%</span></div>
          <div class="fx-row"><span class="fx-cur" data-fr>Gros œuvre</span><span class="fx-cur" data-en>Structure</span><span class="fx-bar"><i style="width:92%"></i></span><b>92%</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>Second œuvre</span><span class="fx-cur" data-en>Fit-out</span><span class="fx-bar"><i style="width:55%;background:var(--gold)"></i></span><b>55%</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>Finitions</span><span class="fx-cur" data-en>Finishes</span><span class="fx-bar"><i style="width:20%;background:#5fe0c2"></i></span><b>20%</b></div>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Plan 3D à jour · à facturer : $42 800</span><span data-en>3D plan up to date · to invoice: $42,800</span></div>
        </div>
      </div>

      <!-- Domus / Immobilier -->
      <div class="showcard">
        <div class="showcard-head">
          <span class="showcard-ic" style="background:linear-gradient(135deg,#2dd4bf,#0d9488)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
          </span>
          <div><b data-fr>Immobilier</b><b data-en>Real Estate</b><small data-fr>Baux & loyers</small><small data-en>Leases & rent</small></div>
        </div>
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Bail — Apt. B12</b><b data-en>Lease — Apt. B12</b><span class="ui-badge ok" data-fr>À jour</span><span class="ui-badge ok" data-en>Up to date</span></div>
          <table class="ui-tbl">
            <tr><th><span data-fr>Échéance</span><span data-en>Due date</span></th><th><span data-fr>Loyer</span><span data-en>Rent</span></th><th><span data-fr>Statut</span><span data-en>Status</span></th></tr>
            <tr><td>01/06/2026</td><td>$650</td><td><span class="tg tg-g" data-fr>Payé</span><span class="tg tg-g" data-en>Paid</span></td></tr>
            <tr><td>01/07/2026</td><td>$650</td><td><span class="tg tg-v" data-fr>À venir</span><span class="tg tg-v" data-en>Upcoming</span></td></tr>
            <tr class="ui-tot"><td><span data-fr>Caution</span><span data-en>Deposit</span></td><td>$1,300</td><td>—</td></tr>
          </table>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Quittance PDF générée · écriture comptable automatique</span><span data-en>PDF receipt generated · journal entry automatic</span></div>
        </div>
      </div>

      <!-- RH -->
      <div class="showcard">
        <div class="showcard-head">
          <span class="showcard-ic" style="background:linear-gradient(135deg,#14b8a6,#0f766e)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
          </span>
          <div><b data-fr>Ress. Humaines</b><b data-en>Human Resources</b><small data-fr>Paie & congés</small><small data-en>Payroll & leave</small></div>
        </div>
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Bulletin de paie — Juin 2026</b><b data-en>Payslip — June 2026</b><span class="ui-badge ok" data-fr>Approuvé</span><span class="ui-badge ok" data-en>Approved</span></div>
          <table class="ui-tbl">
            <tr><th><span data-fr>Ligne</span><span data-en>Line</span></th><th><span data-fr>Montant</span><span data-en>Amount</span></th></tr>
            <tr><td><span data-fr>Salaire de base</span><span data-en>Base salary</span></td><td>$520</td></tr>
            <tr><td><span data-fr>Prime de terrain</span><span data-en>Field bonus</span></td><td>$60</td></tr>
            <tr><td><span data-fr>Cotisations (CNSS)</span><span data-en>Contributions (CNSS)</span></td><td>−$29</td></tr>
            <tr class="ui-tot"><td><span data-fr>Net à payer</span><span data-en>Net pay</span></td><td>$551</td></tr>
          </table>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Workflow d'approbation validé · 2 congés en attente</span><span data-en>Approval workflow cleared · 2 leave requests pending</span></div>
        </div>
      </div>

      <!-- Projets -->
      <div class="showcard">
        <div class="showcard-head">
          <span class="showcard-ic" style="background:linear-gradient(135deg,#a3e635,#65a30d)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></svg>
          </span>
          <div><b data-fr>Projets</b><b data-en>Projects</b><small data-fr>Tâches & temps</small><small data-en>Tasks & time</small></div>
        </div>
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Refonte site client — Phase 2</b><b data-en>Client site revamp — Phase 2</b><span class="ui-badge up">72%</span></div>
          <div class="fx-row"><span class="fx-cur" data-fr>À faire</span><span class="fx-cur" data-en>To do</span><span class="fx-bar"><i style="width:25%;background:#5fe0c2"></i></span><b>4</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>En cours</span><span class="fx-cur" data-en>In progress</span><span class="fx-bar"><i style="width:50%;background:var(--gold)"></i></span><b>3</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>Terminé</span><span class="fx-cur" data-en>Done</span><span class="fx-bar"><i style="width:100%"></i></span><b>11</b></div>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>86 h pointées · facturation au temps passé automatique</span><span data-en>86 h logged · time-based billing automatic</span></div>
        </div>
      </div>

      <!-- AI / Assistant -->
      <div class="showcard">
        <div class="showcard-head">
          <span class="showcard-ic" style="background:linear-gradient(135deg,#6d5efc,#a78bfa)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"/><path d="M12 18v3"/><path d="M5.6 5.6l2.1 2.1"/><path d="M16.3 16.3l2.1 2.1"/><path d="M3 12h3"/><path d="M18 12h3"/><circle cx="12" cy="12" r="4"/></svg>
          </span>
          <div><b><span data-fr>Assistant IA</span><span data-en>AI Assistant</span></b><small data-fr>Demandez, il agit</small><small data-en>Ask, it acts</small></div>
        </div>
        <div class="ui-win">
          <div class="ai-bar"><b>✦ <span data-fr>Assistant</span><span data-en>Assistant</span></b><span class="ai-x">— ✕</span></div>
          <div class="bub me" data-fr>Ajoute une dépense de 250 $ carburant au chantier Matete</div>
          <div class="bub me" data-en>Add a $250 fuel expense to the Matete site</div>
          <div class="bub ai" data-fr>✓ Dépense créée : <b>250 $ — Carburant</b>, affectée au chantier Matete et à la compta. Valider ?</div>
          <div class="bub ai" data-en>✓ Expense created: <b>$250 — Fuel</b>, posted to Matete site and accounting. Confirm?</div>
          <div class="bub me" data-fr>Et ma trésorerie dans 3 mois ?</div>
          <div class="bub me" data-en>And my cash in 3 months?</div>
          <div class="bub ai" data-fr>Projection réaliste : <b>+71 420 $</b> fin septembre, dont 19 baux et 3 chantiers encaissés.</div>
          <div class="bub ai" data-en>Realistic projection: <b>+$71,420</b> by end of September, incl. 19 leases and 3 job sites collected.</div>
          <div class="bub ai bub-chart">
            <svg viewBox="0 0 240 96" preserveAspectRatio="none" width="100%" height="84">
              <polyline points="0,72 40,62 80,66 120,48 160,52 200,34 240,30" fill="none" stroke="#1fbf8f" stroke-width="3"/>
              <polyline points="120,48 160,44 200,32 240,22" fill="none" stroke="#6d5efc" stroke-width="3" stroke-dasharray="5 5"/>
              <line x1="120" y1="8" x2="120" y2="92" stroke="#d7deea" stroke-width="1.2"/>
            </svg>
            <div class="bc-leg"><span class="bcl bcl-g" data-fr>Réel</span><span class="bcl bcl-g" data-en>Actual</span><span class="bcl bcl-v" data-fr>Prévu</span><span class="bcl bcl-v" data-en>Forecast</span></div>
          </div>
          <div class="ai-input"><span data-fr>Demandez n'importe quoi…</span><span data-en>Ask anything…</span><span class="snd">➤</span></div>
        </div>
        <div class="ui-foot" style="border:1px solid var(--line);border-radius:10px;margin-top:-2px"><span class="dotg"></span><span data-fr>Saisit, interroge et prévoit sur vos vraies données — en langage naturel</span><span data-en>Creates, queries and forecasts on your real data — in plain language</span></div>
      </div>

    </div>
  </div>
</section>

<!-- MOBILE SECTION -->
<section class="block soft" id="mobile">
  <div class="wrap">
    <div class="mobile-wrap">
      <div class="mobile-text">
        <div class="eyebrow" style="text-align:left" data-fr>Avelomi mobile</div><div class="eyebrow" style="text-align:left" data-en>Avelomi mobile</div>
        <h2 class="h2" data-fr>Toute votre activité, <span class="mark-y">dans votre poche</span></h2>
        <h2 class="h2" data-en>Your whole business, <span class="mark-y">in your pocket</span></h2>
        <p class="lead" data-fr>Chaque application Avelomi a son app mobile native, iOS et Android. Vos équipes saisissent sur le terrain, même sans réseau — tout se synchronise au retour en ligne.</p>
        <p class="lead" data-en>Every Avelomi app comes with a native mobile app, iOS and Android. Your teams capture data in the field, even offline — everything syncs when back online.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Une app par module : Compta, Immobilier, FarmOS, RH…</span><span data-en>One app per module: Accounting, Real Estate, FarmOS, HR…</span></li>
          <li><span class="ck">✓</span><span data-fr>Mode hors-ligne avec synchronisation automatique</span><span data-en>Offline mode with automatic sync</span></li>
          <li><span class="ck">✓</span><span data-fr>Photos, GPS, scan et signatures depuis le mobile</span><span data-en>Photos, GPS, scan and signatures from mobile</span></li>
          <li><span class="ck">✓</span><span data-fr>Mêmes données qu'en web, en temps réel</span><span data-en>Same data as the web, in real time</span></li>
        </ul>
        <div class="stores">
          <a class="store" href="#">
            <svg viewBox="0 0 24 24" fill="#fff"><path d="M16.36 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.55 2.05-1.11.02-1.47-.66-2.74-.66s-1.67.64-2.72.68c-1.1.04-1.94-1.1-2.63-2.11-1.42-2.07-2.5-5.84-1.05-8.39.72-1.27 2.01-2.07 3.41-2.09 1.08-.02 2.09.72 2.74.72.65 0 1.88-.89 3.17-.76.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.78 3.18M14.28 5.5c.57-.69.96-1.65.85-2.61-.83.03-1.83.55-2.42 1.24-.53.61-.99 1.59-.87 2.53.92.07 1.87-.47 2.44-1.16"/></svg>
            <span class="st-t"><small data-fr>Télécharger sur</small><small data-en>Download on the</small><b>App Store</b></span>
          </a>
          <a class="store" href="#">
            <svg viewBox="0 0 24 24"><path fill="#00d3ff" d="M3.27 1.84A1.5 1.5 0 0 0 3 2.7v18.6c0 .35.1.65.27.86L13.4 12 3.27 1.84z"/><path fill="#00f076" d="M16.95 8.37 4.9 1.46a1.46 1.46 0 0 0-1.63.38L13.4 12l3.55-3.63z"/><path fill="#ffce00" d="m16.95 8.37-3.55 3.63 3.55 3.63 3.06-1.76c.99-.57.99-2.17 0-2.74l-3.06-1.76z"/><path fill="#ff3a44" d="M3.27 22.16c.43.5 1.12.62 1.63.38l12.05-6.91L13.4 12 3.27 22.16z"/></svg>
            <span class="st-t"><small data-fr>Disponible sur</small><small data-en>Get it on</small><b>Google Play</b></span>
          </a>
        </div>
      </div>
      <div class="phone">
        <div class="scr">
          <div class="ph-bar">
            <span class="ph-logo"><svg viewBox="0 0 64 64"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/></g></svg></span>
            FarmOS
          </div>
          <div class="ph-body">
            <div class="ph-card">
              <b data-fr>Lot bovin #34</b><b data-en>Cattle lot #34</b>
              <small data-fr>34 têtes · 312 kg · sain</small><small data-en>34 head · 312 kg · healthy</small>
              <div class="ph-sync">✓ <span data-fr>Pesée synchronisée</span><span data-en>Weigh-in synced</span></div>
            </div>
            <div class="ph-card">
              <b data-fr>Soin vétérinaire</b><b data-en>Vet care</b>
              <small data-fr>Lot #34 · en file d'attente</small><small data-en>Lot #34 · queued</small>
              <div class="ph-sync" style="color:#6d5efc">◷ <span data-fr>En attente de réseau</span><span data-en>Waiting for network</span></div>
            </div>
            <div class="ph-card">
              <b data-fr>Photo chantier</b><b data-en>Site photo</b>
              <small data-fr>Matete · 📷 ajoutée hors-ligne</small><small data-en>Matete · 📷 added offline</small>
            </div>
          </div>
          <div class="ph-tab"><span class="on">🏠</span><span>🐄</span><span>➕</span><span>📊</span><span>👤</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURE ROWS -->
<section class="block" id="features">
  <div class="wrap">
    <div class="frow">
      <div class="ftext">
        <span class="ftag">✦ <span data-fr>Données unifiées</span><span data-en>Unified data</span></span>
        <h3 data-fr>Une donnée. Zéro double saisie.</h3>
        <h3 data-en>One source of truth. Zero double entry.</h3>
        <p data-fr>Une vente met à jour le stock, la comptabilité et le CRM instantanément. Fini les 12 logiciels qui ne se parlent pas.</p>
        <p data-en>A sale updates inventory, accounting and CRM instantly. No more 12 tools that don't talk to each other.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Synchronisation en temps réel entre tous les modules</span><span data-en>Real-time sync across every module</span></li>
          <li><span class="ck">✓</span><span data-fr>Consolidation automatique multi-entités</span><span data-en>Automatic multi-entity consolidation</span></li>
          <li><span class="ck">✓</span><span data-fr>Piste d'audit complète sur chaque écriture</span><span data-en>Full audit trail on every record</span></li>
        </ul>
      </div>
      <div class="fvisual">
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Écriture — VTE/2026/0184</b><b data-en>Entry — SAL/2026/0184</b><span class="ui-badge ok" data-fr>Validée</span><span class="ui-badge ok" data-en>Posted</span></div>
          <table class="ui-tbl">
            <tr>
              <th><span data-fr>Compte</span><span data-en>Account</span></th>
              <th><span data-fr>Débit</span><span data-en>Debit</span></th>
              <th><span data-fr>Crédit</span><span data-en>Credit</span></th>
            </tr>
            <tr><td>411000 · Clients</td><td>$1,180</td><td>—</td></tr>
            <tr><td>707000 · <span data-fr>Ventes</span><span data-en>Sales</span></td><td>—</td><td>$1,000</td></tr>
            <tr><td>445710 · <span data-fr>TVA</span><span data-en>VAT</span></td><td>—</td><td>$180</td></tr>
            <tr class="ui-tot"><td>Total</td><td>$1,180</td><td>$1,180</td></tr>
          </table>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Stock & CRM mis à jour automatiquement</span><span data-en>Inventory & CRM auto-updated</span></div>
        </div>
      </div>
    </div>

    <div class="frow rev">
      <div class="ftext">
        <span class="ftag">🌍 <span data-fr>Global par défaut</span><span data-en>Global by default</span></span>
        <h3 data-fr>Multi-devises, multi-langues, multi-sites</h3>
        <h3 data-en>Multi-currency, multi-language, multi-site</h3>
        <p data-fr>Gérez plusieurs entités, devises et pays sans surcoût. Là où d'autres facturent des modules en plus, c'est inclus.</p>
        <p data-en>Run multiple entities, currencies and countries at no extra cost. Where others charge add-ons, it's built in.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Taux de change automatiques</span><span data-en>Automatic exchange rates</span></li>
          <li><span class="ck">✓</span><span data-fr>Conformité fiscale par pays</span><span data-en>Per-country tax compliance</span></li>
          <li><span class="ck">✓</span><span data-fr>Mobile natif & hors-ligne pour le terrain</span><span data-en>Native, offline-ready mobile for the field</span></li>
        </ul>
      </div>
      <div class="fvisual">
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Chiffre d'affaires consolidé</b><b data-en>Consolidated revenue</b><span class="ui-badge up">▲ 18.2%</span></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">$</span>USD</span><span class="fx-bar"><i style="width:100%"></i></span><b>$284,910</b></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">€</span>EUR</span><span class="fx-bar"><i style="width:62%;background:#5fe0c2"></i></span><b>€176,400</b></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">FC</span>CDF</span><span class="fx-bar"><i style="width:38%;background:var(--gold)"></i></span><b>108M FC</b></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">£</span>GBP</span><span class="fx-bar"><i style="width:54%;background:#7c3aed"></i></span><b>£149,200</b></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">¥</span>JPY</span><span class="fx-bar"><i style="width:46%;background:#f59e0b"></i></span><b>¥21.8M</b></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">C$</span>CAD</span><span class="fx-bar"><i style="width:30%;background:#fb7185"></i></span><b>C$96,500</b></div>
          <div class="fx-row"><span class="fx-cur"><span class="cflag">F</span>CFA</span><span class="fx-bar"><i style="width:24%;background:#38bdf8"></i></span><b>71M FCFA</b></div>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Taux de change appliqués automatiquement</span><span data-en>Exchange rates applied automatically</span></div>
        </div>
      </div>
    </div>

    <div class="frow">
      <div class="ftext">
        <span class="ftag">📊 <span data-fr>Décisions pilotées</span><span data-en>Decision-ready</span></span>
        <h3 data-fr>Pilotez avec les chiffres, pas au feeling</h3>
        <h3 data-en>Run on numbers, not gut feeling</h3>
        <p data-fr>Tableaux de bord en temps réel, prévisions de trésorerie et alertes d'écart prévu vs réel. Vous voyez venir, vous décidez vite.</p>
        <p data-en>Real-time dashboards, cashflow forecasts and budget-vs-actual alerts. You see it coming, you decide fast.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Prévisions multi-scénarios (prudent / réaliste / optimiste)</span><span data-en>Multi-scenario forecasts (cautious / realistic / optimistic)</span></li>
          <li><span class="ck">✓</span><span data-fr>Rôles, permissions fines et workflows d'approbation</span><span data-en>Roles, fine permissions and approval workflows</span></li>
          <li><span class="ck">✓</span><span data-fr>Export PDF & Excel en un clic</span><span data-en>One-click PDF & Excel export</span></li>
        </ul>
      </div>
      <div class="fvisual">
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Prévision de trésorerie</b><b data-en>Cashflow forecast</b><span class="ui-badge up">▲ 18.2%</span></div>
          <div class="fc-chart">
            <svg viewBox="0 0 280 120" preserveAspectRatio="none">
              <polyline points="0,90 47,78 93,82 140,60 187,64 233,42 280,38" fill="none" stroke="#1fbf8f" stroke-width="3"/>
              <polyline points="140,60 187,55 233,40 280,28" fill="none" stroke="#6d5efc" stroke-width="3" stroke-dasharray="5 5"/>
              <line x1="140" y1="10" x2="140" y2="115" stroke="#e7ebf2" stroke-width="1.5"/>
            </svg>
            <div class="fc-leg"><span class="lg lg-g" data-fr>Réel</span><span class="lg lg-g" data-en>Actual</span><span class="lg lg-v" data-fr>Prévu</span><span class="lg lg-v" data-en>Forecast</span></div>
          </div>
          <div class="fc-scn">
            <span data-fr>Scénario :</span><span data-en>Scenario:</span>
            <span class="scn">Prudent</span><span class="scn on">Réaliste</span><span class="scn">Optimiste</span>
          </div>
        </div>
      </div>
    </div>

    <div class="frow rev">
      <div class="ftext">
        <span class="ftag">🛡️ <span data-fr>Validé avant de partir</span><span data-en>Approved before it ships</span></span>
        <h3 data-fr>Rien ne passe sans le bon feu vert</h3>
        <h3 data-en>Nothing moves without the right sign-off</h3>
        <p data-fr>Dépenses, paie, achats : chaque opération sensible suit une chaîne d'approbation par rôle. Vous gardez le contrôle, sans bloquer le terrain.</p>
        <p data-en>Expenses, payroll, purchases: every sensitive operation follows a role-based approval chain. You stay in control without slowing the field down.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Niveaux d'approbation configurables par montant</span><span data-en>Approval levels configurable by amount</span></li>
          <li><span class="ck">✓</span><span data-fr>Permissions fines par rôle et par module</span><span data-en>Fine-grained permissions per role and module</span></li>
          <li><span class="ck">✓</span><span data-fr>Notifications et relances automatiques</span><span data-en>Automatic notifications and reminders</span></li>
        </ul>
      </div>
      <div class="fvisual">
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Demande d'achat — ACH/2026/041</b><b data-en>Purchase request — PUR/2026/041</b><span class="ui-badge" data-fr>À valider</span><span class="ui-badge" data-en>To approve</span></div>
          <div class="fx-row"><span class="fx-cur" data-fr>① Soumis</span><span class="fx-cur" data-en>① Submitted</span><span style="flex:1;font-size:12px;color:var(--ink-2)" data-fr>Jean — chef chantier</span><span style="flex:1;font-size:12px;color:var(--ink-2)" data-en>Jean — site lead</span><b style="color:var(--green)">✓</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>② Supérieur</span><span class="fx-cur" data-en>② Manager</span><span style="flex:1;font-size:12px;color:var(--ink-2)" data-fr>Marie — directrice</span><span style="flex:1;font-size:12px;color:var(--ink-2)" data-en>Marie — director</span><b style="color:var(--green)">✓</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>③ Comptable</span><span class="fx-cur" data-en>③ Accountant</span><span style="flex:1;font-size:12px;color:var(--muted)" data-fr>en attente…</span><span style="flex:1;font-size:12px;color:var(--muted)" data-en>pending…</span><b style="color:var(--muted)">◷</b></div>
          <div class="fx-row"><span class="fx-cur" data-fr>④ Payé</span><span class="fx-cur" data-en>④ Paid</span><span style="flex:1;font-size:12px;color:#cbd3df">—</span><b style="color:#cbd3df">·</b></div>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>2 niveaux requis · gate obligatoire sur les achats</span><span data-en>2 levels required · mandatory gate on purchases</span></div>
        </div>
      </div>
    </div>

    <div class="frow">
      <div class="ftext">
        <span class="ftag">📱 <span data-fr>Pensé pour le terrain</span><span data-en>Built for the field</span></span>
        <h3 data-fr>Vos équipes saisissent là où ça se passe</h3>
        <h3 data-en>Your teams capture data where the work happens</h3>
        <p data-fr>Application mobile native, même quand le réseau lâche. Pesées, soins vétérinaires, photos de chantier : tout se synchronise dès le retour en ligne.</p>
        <p data-en>Native mobile app, even when the network drops. Weigh-ins, vet care, site photos: everything syncs the moment you're back online.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Fonctionne 100 % hors-ligne, sync automatique</span><span data-en>Works fully offline, auto-sync</span></li>
          <li><span class="ck">✓</span><span data-fr>Même donnée que le web, en temps réel</span><span data-en>Same data as the web, in real time</span></li>
          <li><span class="ck">✓</span><span data-fr>Photos, GPS et signatures depuis le mobile</span><span data-en>Photos, GPS and signatures from mobile</span></li>
        </ul>
      </div>
      <div class="fvisual">
        <div class="ui-win">
          <div class="ui-top"><b data-fr>📱 Avelomi Mobile — Cheptel</b><b data-en>📱 Avelomi Mobile — Livestock</b><span class="ui-badge ok" data-fr>Hors-ligne</span><span class="ui-badge ok" data-en>Offline</span></div>
          <table class="ui-tbl">
            <tr><th><span data-fr>Action terrain</span><span data-en>Field action</span></th><th><span data-fr>Lot</span><span data-en>Lot</span></th><th>Sync</th></tr>
            <tr><td><span data-fr>Pesée</span><span data-en>Weigh-in</span> · 312 kg</td><td>#34</td><td><span class="tg tg-g">✓</span></td></tr>
            <tr><td><span data-fr>Soin vétérinaire</span><span data-en>Vet care</span></td><td>#34</td><td><span class="tg tg-v" data-fr>En file</span><span class="tg tg-v" data-en>Queued</span></td></tr>
            <tr><td><span data-fr>Photo chantier</span><span data-en>Site photo</span></td><td>Matete</td><td><span class="tg tg-v" data-fr>En file</span><span class="tg tg-v" data-en>Queued</span></td></tr>
          </table>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>3 actions en attente · sync auto au retour réseau</span><span data-en>3 actions pending · auto-sync when back online</span></div>
        </div>
      </div>
    </div>

    <div class="frow rev">
      <div class="ftext">
        <span class="ftag">🔒 <span data-fr>Sécurité & traçabilité</span><span data-en>Security & audit</span></span>
        <h3 data-fr>Chaque action laisse une trace</h3>
        <h3 data-en>Every action leaves a trail</h3>
        <p data-fr>Qui a fait quoi, quand et depuis où. Une piste d'audit complète et immuable sur chaque écriture, avec connexion sécurisée et sauvegardes.</p>
        <p data-en>Who did what, when and from where. A complete, immutable audit trail on every record, with secure login and backups.</p>
        <ul class="flist">
          <li><span class="ck">✓</span><span data-fr>Journal d'audit immuable sur toutes les écritures</span><span data-en>Immutable audit log on every record</span></li>
          <li><span class="ck">✓</span><span data-fr>Authentification forte (2FA) et sessions par appareil</span><span data-en>Strong auth (2FA) and per-device sessions</span></li>
          <li><span class="ck">✓</span><span data-fr>Sauvegardes automatiques et données chiffrées</span><span data-en>Automatic backups and encrypted data</span></li>
        </ul>
      </div>
      <div class="fvisual">
        <div class="ui-win">
          <div class="ui-top"><b data-fr>Journal d'audit</b><b data-en>Audit log</b><span class="ui-badge ok" data-fr>Immuable</span><span class="ui-badge ok" data-en>Immutable</span></div>
          <div class="fx-row"><span style="font-size:11.5px;color:var(--muted);width:46px">10:42</span><span style="flex:1;font-size:12.5px;color:var(--ink-2)" data-fr>Marie a validé ACH/041</span><span style="flex:1;font-size:12.5px;color:var(--ink-2)" data-en>Marie approved PUR/041</span><b style="color:var(--green)">✓</b></div>
          <div class="fx-row"><span style="font-size:11.5px;color:var(--muted);width:46px">10:39</span><span style="flex:1;font-size:12.5px;color:var(--ink-2)" data-fr>Jean a créé une dépense $250</span><span style="flex:1;font-size:12.5px;color:var(--ink-2)" data-en>Jean created a $250 expense</span><b>＋</b></div>
          <div class="fx-row"><span style="font-size:11.5px;color:var(--muted);width:46px">09:15</span><span style="flex:1;font-size:12.5px;color:var(--ink-2)" data-fr>Connexion · 2FA · Kinshasa</span><span style="flex:1;font-size:12.5px;color:var(--ink-2)" data-en>Login · 2FA · Kinshasa</span><b>🔒</b></div>
          <div class="ui-foot"><span class="dotg"></span><span data-fr>Traçabilité complète, horodatée et non modifiable</span><span data-en>Full traceability, timestamped and tamper-proof</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- COMPARE -->
<section class="block soft" id="compare">
  <div class="wrap">
    <div class="eyebrow" data-fr>La comparaison</div><div class="eyebrow" data-en>The comparison</div>
    <h2 class="h2" data-fr>Ce qu'Avelomi fait <span class="mark-p">et qu'eux ne font pas</span></h2>
    <h2 class="h2" data-en>What Avelomi does <span class="mark-p">and they don't</span></h2>
    <p class="lead" data-fr>Les vrais métiers de votre terrain — immobilier, chantier, élevage — pas seulement la compta et le CRM.</p>
    <p class="lead" data-en>The real businesses on your ground — real estate, construction, livestock — not just accounting and CRM.</p>
    <div class="cscroll">
    <div class="ctable">
      <div class="crow head">
        <div data-fr>Capacité métier</div><div data-en>Business capability</div>
        <div class="me">Avelomi</div><div>Odoo</div><div>Salesforce</div><div>Zoho</div><div>SAP</div><div>QuickBooks</div><div>Sage</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Gestion locative (baux, loyers, quittances, caution)</div><div class="feat" data-en>Rental management (leases, rent, receipts, deposits)</div>
        <div class="col-me yes">✓</div><div class="no">—</div><div class="no">—</div><div class="no">—</div><div class="no" data-fr>Module tiers</div><div class="no" data-en>3rd-party</div><div class="no">—</div><div class="no">—</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Chantiers BTP (planning, situations, plan 3D)</div><div class="feat" data-en>Construction sites (planning, progress, 3D plan)</div>
        <div class="col-me yes">✓</div><div class="no" data-fr>Générique</div><div class="no" data-en>Generic</div><div class="no">—</div><div class="no">—</div><div class="no" data-fr>Générique</div><div class="no" data-en>Generic</div><div class="no">—</div><div class="no">—</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Élevage & agriculture (cheptel, vétérinaire, mortalité)</div><div class="feat" data-en>Livestock & farming (herd, vet, mortality)</div>
        <div class="col-me yes">✓</div><div class="no">—</div><div class="no">—</div><div class="no">—</div><div class="no" data-fr>Module tiers</div><div class="no" data-en>3rd-party</div><div class="no">—</div><div class="no">—</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Multi-devises (USD / EUR / GBP / JPY / CAD / CDF…) sans surcoût</div><div class="feat" data-en>Multi-currency (USD / EUR / GBP / JPY / CAD / CDF…), no add-on</div>
        <div class="col-me yes">✓</div><div class="no" data-fr>Payant</div><div class="no" data-en>Paid</div><div class="no" data-fr>Payant</div><div class="no" data-en>Paid</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Payant</div><div class="no" data-en>Paid</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Payant</div><div class="no" data-en>Paid</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Paie & RH adaptées à votre pays (cotisations, devises, langues)</div><div class="feat" data-en>Payroll & HR localized to your country (contributions, currencies, languages)</div>
        <div class="col-me yes">✓</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no">—</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no">—</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Mobile natif & hors-ligne pour le terrain</div><div class="feat" data-en>Native, offline mobile for the field</div>
        <div class="col-me yes">✓</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div><div class="no" data-fr>Limité</div><div class="no" data-en>Limited</div>
      </div>
      <div class="crow">
        <div class="feat" data-fr>Tout-en-un, prix tout compris</div><div class="feat" data-en>All-in-one, all-inclusive pricing</div>
        <div class="col-me yes">✓</div><div class="no" data-fr>Par appli</div><div class="no" data-en>Per app</div><div class="no" data-fr>Élevé</div><div class="no" data-en>High</div><div class="no" data-fr>Par appli</div><div class="no" data-en>Per app</div><div class="no" data-fr>Très élevé</div><div class="no" data-en>Very high</div><div class="no" data-fr>Compta seule</div><div class="no" data-en>Accounting only</div><div class="no" data-fr>Par module</div><div class="no" data-en>Per module</div>
      </div>
    </div>
    </div>
    <p class="cscroll-hint" data-fr>← Faites défiler pour comparer tous les acteurs →</p>
    <p class="cscroll-hint" data-en>← Scroll to compare all vendors →</p>
  </div>
</section>

<!-- STATS -->
<section class="block">
  <div class="wrap">
    <div class="statsrow">
      <div class="stat"><b>12+</b><span data-fr>applications intégrées</span><span data-en>integrated apps</span></div>
      <div class="stat"><b>0</b><span data-fr>double saisie</span><span data-en>double entry</span></div>
      <div class="stat"><b>24/7</b><span data-fr>web & mobile hors-ligne</span><span data-en>web & offline mobile</span></div>
      <div class="stat"><b>5 min</b><span data-fr>pour démarrer</span><span data-en>to get started</span></div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="block soft" id="pricing">
  <div class="wrap">
    <div class="eyebrow" data-fr>Tarifs simples</div><div class="eyebrow" data-en>Simple pricing</div>
    <h2 class="h2" data-fr>Toutes les apps, <span class="mark-g">gratuitement</span></h2>
    <h2 class="h2" data-en>All the apps, <span class="mark-g">for free</span></h2>
    <p class="lead" data-fr>Commencez avec tout, sans payer. Montez en gamme pour plus de requêtes IA par mois et le multi-entreprises.</p>
    <p class="lead" data-en>Start with everything, pay nothing. Move up for more monthly AI requests and multi-company.</p>

    <div class="plans">
      <!-- FREE -->
      <div class="plan">
        <div class="pname" data-fr>Gratuit</div><div class="pname" data-en>Free</div>
        <div class="pdesc" data-fr>Pour démarrer et tester tout l'ERP.</div><div class="pdesc" data-en>To get started and test the whole ERP.</div>
        <div class="pprice"><b>0 $</b><span data-fr>/ pour toujours</span><span data-en>/ forever</span></div>
        <div class="pbill" data-fr>Aucune carte bancaire</div><div class="pbill" data-en>No credit card</div>
        <a class="btn btn-ghost btn-lg" href="#"><span data-fr>Commencer gratuitement</span><span data-en>Start for free</span></a>
        <ul class="plist">
          <li><span class="pk">✓</span><span data-fr><b>Toutes les applications</b> incluses</span><span data-en><b>All apps</b> included</span></li>
          <li><span class="pk">✓</span><span data-fr>1 entreprise · jusqu'à 3 utilisateurs</span><span data-en>1 company · up to 3 users</span></li>
          <li><span class="pk">✓</span><span data-fr>Assistant IA — <b>20 requêtes / mois</b></span><span data-en>AI Assistant — <b>20 requests / month</b></span></li>
          <li><span class="pk">✓</span><span data-fr>Mobile hors-ligne · 1 Go de stockage</span><span data-en>Offline mobile · 1 GB storage</span></li>
        </ul>
      </div>

      <!-- STARTER -->
      <div class="plan">
        <div class="pname">Starter</div>
        <div class="pdesc" data-fr>Plus d'IA au quotidien, petit budget.</div><div class="pdesc" data-en>More daily AI on a small budget.</div>
        <div class="pprice"><b>5 $</b><span data-fr>/ mois</span><span data-en>/ month</span></div>
        <div class="pbill" data-fr>Facturé mensuellement</div><div class="pbill" data-en>Billed monthly</div>
        <a class="btn btn-ghost btn-lg" href="#"><span data-fr>Choisir Starter</span><span data-en>Choose Starter</span></a>
        <ul class="plist">
          <li><span class="pk">✓</span><span data-fr><b>Tout du forfait Gratuit</b></span><span data-en><b>Everything in Free</b></span></li>
          <li><span class="pk">✓</span><span data-fr>1 entreprise · jusqu'à 50 utilisateurs</span><span data-en>1 company · up to 50 users</span></li>
          <li><span class="pk">✓</span><span data-fr>Assistant IA — <b>100 requêtes / mois</b></span><span data-en>AI Assistant — <b>100 requests / month</b></span></li>
          <li><span class="pk">✓</span><span data-fr>Export PDF & Excel</span><span data-en>PDF & Excel export</span></li>
          <li><span class="pk">✓</span><span data-fr>10 Go de stockage</span><span data-en>10 GB storage</span></li>
        </ul>
      </div>

      <!-- BUSINESS (featured) -->
      <div class="plan feat">
        <span class="ptag" data-fr>★ Le plus populaire</span><span class="ptag" data-en>★ Most popular</span>
        <div class="pname">Business</div>
        <div class="pdesc" data-fr>L'IA à pleine puissance, tout illimité.</div><div class="pdesc" data-en>AI at full power, everything unlimited.</div>
        <div class="pprice"><b>19 $</b><span data-fr>/ mois</span><span data-en>/ month</span></div>
        <div class="pbill" data-fr>Facturé mensuellement</div><div class="pbill" data-en>Billed monthly</div>
        <a class="btn btn-primary btn-lg" href="#"><span data-fr>Choisir Business</span><span data-en>Choose Business</span></a>
        <ul class="plist">
          <li><span class="pk">✓</span><span data-fr><b>Tout du forfait Starter</b></span><span data-en><b>Everything in Starter</b></span></li>
          <li><span class="pk">✓</span><span data-fr>1 entreprise · jusqu'à 100 utilisateurs</span><span data-en>1 company · up to 100 users</span></li>
          <li><span class="pk">✓</span><span data-fr><b>Assistant IA — 500 requêtes / mois</b> — prévisions, saisie & multi-scénarios</span><span data-en><b>AI — 500 requests / month</b> — forecasts, data entry & multi-scenario</span></li>
          <li><span class="pk">✓</span><span data-fr>Workflows d'approbation & permissions fines</span><span data-en>Approval workflows & fine permissions</span></li>
          <li><span class="pk">✓</span><span data-fr>Multi-devises · export PDF & Excel</span><span data-en>Multi-currency · PDF & Excel export</span></li>
          <li><span class="pk">✓</span><span data-fr>Support prioritaire · 100 Go</span><span data-en>Priority support · 100 GB</span></li>
        </ul>
      </div>

      <!-- ENTERPRISE -->
      <div class="plan">
        <div class="pname">Enterprise</div>
        <div class="pdesc" data-fr>Pour les groupes multi-entités.</div><div class="pdesc" data-en>For multi-entity groups.</div>
        <div class="pprice"><b data-fr>Sur devis</b><b data-en>Custom</b></div>
        <div class="pbill" data-fr>Adapté à votre organisation</div><div class="pbill" data-en>Tailored to your organization</div>
        <a class="btn btn-ghost btn-lg" href="#"><span data-fr>Parler à un expert</span><span data-en>Talk to sales</span></a>
        <ul class="plist">
          <li><span class="pk">✓</span><span data-fr><b>Tout du forfait Business</b></span><span data-en><b>Everything in Business</b></span></li>
          <li><span class="pk">✓</span><span data-fr><b>Multi-entreprises</b> & consolidation</span><span data-en><b>Multi-company</b> & consolidation</span></li>
          <li><span class="pk">✓</span><span data-fr>IA dédiée à plus haut quota & modèles avancés</span><span data-en>Dedicated AI, higher quota & advanced models</span></li>
          <li><span class="pk">✓</span><span data-fr>SSO, accès API & audit avancé</span><span data-en>SSO, API access & advanced audit</span></li>
          <li><span class="pk">✓</span><span data-fr>Accompagnement & migration dédiés</span><span data-en>Dedicated onboarding & migration</span></li>
        </ul>
      </div>
    </div>
    <p class="pnote" data-fr>Prix en USD. Paiement local accepté (CDF, Mobile Money). Changez ou annulez à tout moment.</p>
    <p class="pnote" data-en>Prices in USD. Local payment accepted (CDF, Mobile Money). Change or cancel anytime.</p>
  </div>
</section>

<!-- REASSURANCE / TRUST (placeholders — pas de faux témoignages) -->
<section class="block soft" id="trust">
  <div class="wrap">
    <div class="eyebrow" data-fr>Conçu pour vos réalités</div><div class="eyebrow" data-en>Built for your reality</div>
    <h2 class="h2" data-fr>Pensé pour les entreprises <span class="mark-g">qui travaillent sur le terrain</span></h2>
    <h2 class="h2" data-en>Made for businesses <span class="mark-g">that work in the field</span></h2>
    <p class="lead" data-fr>Multi-devises, hors-ligne, paie et fiscalité locales : Avelomi est conçu pour la réalité des PME africaines, pas adapté à contrecœur.</p>
    <p class="lead" data-en>Multi-currency, offline, local payroll and tax: Avelomi is built for the reality of African SMEs, not reluctantly retrofitted.</p>

    <!-- Garanties (vraies, déjà tenues ailleurs sur la page) -->
    <div class="trust-row">
      <div class="trust-item"><span class="trust-ic">🆓</span><b data-fr>Gratuit pour démarrer</b><b data-en>Free to start</b><small data-fr>Toutes les apps, sans carte bancaire</small><small data-en>All apps, no credit card</small></div>
      <div class="trust-item"><span class="trust-ic">📶</span><b data-fr>Fonctionne hors-ligne</b><b data-en>Works offline</b><small data-fr>Sync automatique au retour réseau</small><small data-en>Auto-sync when back online</small></div>
      <div class="trust-item"><span class="trust-ic">🌍</span><b data-fr>Multi-devises inclus</b><b data-en>Multi-currency included</b><small data-fr>USD, EUR, CDF, CFA… sans surcoût</small><small data-en>USD, EUR, CDF, CFA… no add-on</small></div>
      <div class="trust-item"><span class="trust-ic">🤝</span><b data-fr>Migration assistée</b><b data-en>Assisted migration</b><small data-fr>On reprend vos données Excel</small><small data-en>We bring over your Excel data</small></div>
    </div>

    <!-- Bandeau logos clients — emplacements à remplir plus tard -->
    <p class="trust-kick" data-fr>Bientôt : les entreprises qui pilotent leur activité avec Avelomi</p>
    <p class="trust-kick" data-en>Coming soon: companies running their business on Avelomi</p>
    <div class="logos">
      <span class="logo-ph" data-fr>Votre logo ici</span><span class="logo-ph" data-en>Your logo here</span>
      <span class="logo-ph" data-fr>Votre logo ici</span><span class="logo-ph" data-en>Your logo here</span>
      <span class="logo-ph" data-fr>Votre logo ici</span><span class="logo-ph" data-en>Your logo here</span>
      <span class="logo-ph" data-fr>Votre logo ici</span><span class="logo-ph" data-en>Your logo here</span>
      <span class="logo-ph" data-fr>Votre logo ici</span><span class="logo-ph" data-en>Your logo here</span>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="block" id="faq">
  <div class="wrap">
    <div class="eyebrow" data-fr>Questions fréquentes</div><div class="eyebrow" data-en>Frequently asked</div>
    <h2 class="h2" data-fr>Vous vous demandez sûrement…</h2>
    <h2 class="h2" data-en>You're probably wondering…</h2>
    <div class="faq">
      <details class="faq-item" open>
        <summary><span data-fr>Mes données m'appartiennent-elles ?</span><span data-en>Do I own my data?</span><span class="faq-x">+</span></summary>
        <p data-fr>Oui, à 100 %. Vos données sont les vôtres, exportables à tout moment en PDF et Excel. Elles sont chiffrées, sauvegardées automatiquement et tracées par un journal d'audit immuable.</p>
        <p data-en>Yes, 100%. Your data is yours, exportable anytime to PDF and Excel. It's encrypted, automatically backed up and tracked by an immutable audit log.</p>
      </details>
      <details class="faq-item">
        <summary><span data-fr>Puis-je migrer depuis Excel ou un autre logiciel ?</span><span data-en>Can I migrate from Excel or another tool?</span><span class="faq-x">+</span></summary>
        <p data-fr>Oui. La migration assistée est incluse : on reprend vos fichiers Excel et vos données existantes pour vous faire démarrer sans tout ressaisir.</p>
        <p data-en>Yes. Assisted migration is included: we bring over your Excel files and existing data so you start without re-entering everything.</p>
      </details>
      <details class="faq-item">
        <summary><span data-fr>Ça marche sans connexion Internet ?</span><span data-en>Does it work without internet?</span><span class="faq-x">+</span></summary>
        <p data-fr>Oui. L'application mobile fonctionne 100 % hors-ligne — pesées, soins, photos, dépenses — et synchronise automatiquement dès le retour du réseau.</p>
        <p data-en>Yes. The mobile app works fully offline — weigh-ins, care, photos, expenses — and syncs automatically the moment the network is back.</p>
      </details>
      <details class="faq-item">
        <summary><span data-fr>Puis-je payer en monnaie locale (CDF, Mobile Money) ?</span><span data-en>Can I pay in local currency (CDF, Mobile Money)?</span><span class="faq-x">+</span></summary>
        <p data-fr>Oui. Les prix sont en USD mais le paiement local est accepté, y compris en francs congolais (CDF) et par Mobile Money.</p>
        <p data-en>Yes. Prices are in USD but local payment is accepted, including Congolese francs (CDF) and Mobile Money.</p>
      </details>
      <details class="faq-item">
        <summary><span data-fr>Dois-je installer toutes les applications ?</span><span data-en>Do I have to install every app?</span><span class="faq-x">+</span></summary>
        <p data-fr>Non. Commencez avec une seule appli (par ex. la compta ou l'immobilier) et activez les autres quand vous grandissez. Elles partagent les mêmes données, sans double saisie.</p>
        <p data-en>No. Start with a single app (e.g. accounting or real estate) and switch the others on as you grow. They share the same data, with no double entry.</p>
      </details>
      <details class="faq-item">
        <summary><span data-fr>Puis-je changer ou annuler mon forfait ?</span><span data-en>Can I change or cancel my plan?</span><span class="faq-x">+</span></summary>
        <p data-fr>À tout moment, sans engagement. Vous montez ou descendez de forfait quand vous voulez, et le forfait Gratuit reste gratuit pour toujours.</p>
        <p data-en>Anytime, no commitment. Move up or down whenever you want, and the Free plan stays free forever.</p>
      </details>
    </div>
  </div>
</section>

<!-- CTA BAND -->
<section class="block" style="padding-top:88px">
  <div class="wrap">
    <div class="ctaband">
      <h2 data-fr>Prêt à unifier votre entreprise ?</h2>
      <h2 data-en>Ready to unify your company?</h2>
      <p data-fr>Essai gratuit · Sans carte bancaire · Migration assistée incluse.</p>
      <p data-en>Free trial · No credit card · Assisted migration included.</p>
      <div class="hero-cta">
        <a class="btn btn-primary btn-lg" href="#"><span data-fr>Commencer maintenant</span><span data-en>Start now</span></a>
        <a class="btn btn-ghost btn-lg" href="#"><span data-fr>Parler à un expert</span><span data-en>Talk to an advisor</span></a>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="fgrid">
      <div class="fcol">
        <a class="logo" href="#" style="margin-bottom:14px"><span class="mark"><svg viewBox="0 0 64 64" aria-label="Avelomi"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/><rect x="-6.5" y="-6.5" width="13" height="13" rx="3.5" transform="rotate(45)" fill="#0e7a48"/><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.6" transform="rotate(45)" fill="#ffffff"/></g></svg></span> Avelomi</a>
        <p data-fr>L'ERP tout-en-un pour piloter toute votre entreprise, où qu'elle soit.</p>
        <p data-en>The all-in-one ERP to run your entire company, wherever it is.</p>
        <div class="stores" style="margin-top:18px">
          <a class="store" href="#" style="padding:8px 13px">
            <svg viewBox="0 0 24 24" fill="#fff"><path d="M16.36 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.55 2.05-1.11.02-1.47-.66-2.74-.66s-1.67.64-2.72.68c-1.1.04-1.94-1.1-2.63-2.11-1.42-2.07-2.5-5.84-1.05-8.39.72-1.27 2.01-2.07 3.41-2.09 1.08-.02 2.09.72 2.74.72.65 0 1.88-.89 3.17-.76.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.78 3.18M14.28 5.5c.57-.69.96-1.65.85-2.61-.83.03-1.83.55-2.42 1.24-.53.61-.99 1.59-.87 2.53.92.07 1.87-.47 2.44-1.16"/></svg>
            <span class="st-t"><small data-fr>Sur</small><small data-en>On</small><b>App Store</b></span>
          </a>
          <a class="store" href="#" style="padding:8px 13px">
            <svg viewBox="0 0 24 24"><path fill="#00d3ff" d="M3.27 1.84A1.5 1.5 0 0 0 3 2.7v18.6c0 .35.1.65.27.86L13.4 12 3.27 1.84z"/><path fill="#00f076" d="M16.95 8.37 4.9 1.46a1.46 1.46 0 0 0-1.63.38L13.4 12l3.55-3.63z"/><path fill="#ffce00" d="m16.95 8.37-3.55 3.63 3.55 3.63 3.06-1.76c.99-.57.99-2.17 0-2.74l-3.06-1.76z"/><path fill="#ff3a44" d="M3.27 22.16c.43.5 1.12.62 1.63.38l12.05-6.91L13.4 12 3.27 22.16z"/></svg>
            <span class="st-t"><small data-fr>Sur</small><small data-en>On</small><b>Google Play</b></span>
          </a>
        </div>
      </div>
      <div class="fcol">
        <h5 data-fr>Produit</h5><h5 data-en>Product</h5>
        <a href="#" data-fr>Applications</a><a href="#" data-en>Apps</a>
        <a href="#" data-fr>Plateforme</a><a href="#" data-en>Platform</a>
        <a href="#" data-fr>Tarifs</a><a href="#" data-en>Pricing</a>
        <a href="#" data-fr>Sécurité</a><a href="#" data-en>Security</a>
      </div>
      <div class="fcol">
        <h5 data-fr>Entreprise</h5><h5 data-en>Company</h5>
        <a href="#" data-fr>À propos</a><a href="#" data-en>About</a>
        <a href="#" data-fr>Clients</a><a href="#" data-en>Customers</a>
        <a href="#" data-fr>Carrières</a><a href="#" data-en>Careers</a>
        <a href="#">Contact</a>
      </div>
      <div class="fcol">
        <h5 data-fr>Ressources</h5><h5 data-en>Resources</h5>
        <a href="#" data-fr>Documentation</a><a href="#" data-en>Docs</a>
        <a href="#">API</a>
        <a href="#" data-fr>Statut</a><a href="#" data-en>Status</a>
        <a href="#" data-fr>Support</a><a href="#" data-en>Support</a>
      </div>
    </div>
    <div class="fbottom">
      <span>© 2026 Avelomi. <span data-fr>Tous droits réservés.</span><span data-en>All rights reserved.</span></span>
      <span><span data-fr>Confidentialité · Conditions · Cookies</span><span data-en>Privacy · Terms · Cookies</span></span>
    </div>
  </div>
</footer>

  </div>
</template>
