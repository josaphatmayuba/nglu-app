<script setup>
// Vitrine produit Avelomi : présente l'entreprise et ses applications de
// gestion, proposées en abonnement aux clients. Le login/accès client pointe
// vers /crm (point d'entrée CRM commun, multi-tenant par organisation côté
// backend Avelomi). Page volontairement distincte de la marketing-site ONG.
const apps = [
  { name: "Comptabilité", path: "/comptabilite/", desc: "Plan comptable, écritures en partie double, états financiers et analytique.", icon: "📊" },
  { name: "Ressources Humaines", path: "/hr/", desc: "Employés, contrats, paie, présences, congés et recrutement.", icon: "👥" },
  { name: "Domus — Immobilier locatif", path: "/domus/", desc: "Biens, baux, loyers, cautions et rappels automatiques.", icon: "🏠" },
  { name: "BâtiPro — Construction", path: "/batipro/", desc: "Chantiers, échéanciers, suivi de coûts et avancement.", icon: "🏗️" },
  { name: "FarmOS — Agriculture", path: "/farmos/", desc: "Fermes, élevage, stocks, rentabilité par animal et par lot.", icon: "🌱" },
  { name: "CRM", path: "/crm", desc: "Clients, ventes, suivi commercial et tableau de bord.", icon: "🤝" },
];

const benefits = [
  { title: "En ligne, sans installation", desc: "Accédez à vos applications depuis un navigateur, sur ordinateur comme sur mobile." },
  { title: "Vos données isolées", desc: "Chaque organisation dispose de son espace cloisonné. Vos données ne sont pas partagées." },
  { title: "Une suite intégrée", desc: "Comptabilité, RH, immobilier, agriculture : les modules communiquent entre eux." },
];
</script>

<template>
  <div>
    <!-- ─── Header ─────────────────────────────────────────── -->
    <header class="absolute top-0 inset-x-0 z-20">
      <nav class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <span class="text-2xl font-extrabold text-white tracking-tight">Avelomi</span>
        <div class="flex items-center gap-3">
          <a href="#apps" class="hidden sm:inline text-sm text-white/80 hover:text-white">Applications</a>
          <a href="#abonnement" class="hidden sm:inline text-sm text-white/80 hover:text-white">Abonnement</a>
          <a href="/crm" class="inline-flex items-center rounded-lg bg-white text-brand-700 px-4 py-2 text-sm font-semibold hover:bg-brand-50">
            Se connecter
          </a>
        </div>
      </nav>
    </header>

    <!-- ─── Hero ───────────────────────────────────────────── -->
    <section class="hero-gradient relative pt-32 pb-24 px-6">
      <div class="max-w-4xl mx-auto text-center">
        <h1 class="text-4xl sm:text-6xl font-extrabold text-white leading-tight">
          Vos applications de gestion, en ligne.
        </h1>
        <p class="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
          Avelomi met à disposition des entreprises une suite complète d'outils —
          comptabilité, ressources humaines, immobilier, agriculture, CRM.
          Abonnez-vous et accédez à vos applications immédiatement.
        </p>
        <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#abonnement" class="inline-flex items-center justify-center rounded-lg bg-accent-500 text-white px-7 py-3 font-semibold hover:bg-accent-600">
            Demander un abonnement
          </a>
          <a href="/crm" class="inline-flex items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/30 px-7 py-3 font-semibold hover:bg-white/20">
            Accès client
          </a>
        </div>
      </div>
    </section>

    <!-- ─── Bénéfices ──────────────────────────────────────── -->
    <section class="py-20 px-6 bg-white">
      <div class="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
        <div v-for="b in benefits" :key="b.title" class="text-center">
          <h3 class="text-lg font-bold text-brand-800">{{ b.title }}</h3>
          <p class="mt-2 text-slate-600">{{ b.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Catalogue d'applications ───────────────────────── -->
    <section id="apps" class="py-20 px-6 bg-slate-50">
      <div class="max-w-6xl mx-auto">
        <div class="text-center max-w-2xl mx-auto">
          <h2 class="text-3xl font-extrabold text-slate-900">Nos applications</h2>
          <p class="mt-3 text-slate-600">
            Choisissez les modules dont votre organisation a besoin.
          </p>
        </div>
        <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="app in apps" :key="app.name"
               class="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:ring-brand-300 hover:shadow-lg transition">
            <div class="text-3xl">{{ app.icon }}</div>
            <h3 class="mt-4 text-lg font-bold text-slate-900">{{ app.name }}</h3>
            <p class="mt-2 text-sm text-slate-600">{{ app.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Abonnement / CTA ───────────────────────────────── -->
    <section id="abonnement" class="py-24 px-6 bg-brand-700">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-3xl font-extrabold text-white">Prêt à démarrer ?</h2>
        <p class="mt-4 text-brand-100">
          Contactez-nous pour ouvrir l'espace de votre organisation. Une fois
          votre abonnement activé, vos équipes se connectent et accèdent à leurs
          applications.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a href="mailto:contact@avelomi.com"
             class="inline-flex items-center justify-center rounded-lg bg-white text-brand-700 px-7 py-3 font-semibold hover:bg-brand-50">
            Nous contacter
          </a>
          <a href="/crm"
             class="inline-flex items-center justify-center rounded-lg bg-brand-600 text-white ring-1 ring-white/30 px-7 py-3 font-semibold hover:bg-brand-500">
            J'ai déjà un compte
          </a>
        </div>
      </div>
    </section>

    <!-- ─── Footer ─────────────────────────────────────────── -->
    <footer class="bg-slate-900 text-slate-400 py-10 px-6">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-white font-bold">Avelomi</span>
        <span class="text-sm">© {{ new Date().getFullYear() }} Avelomi. Tous droits réservés.</span>
      </div>
    </footer>
  </div>
</template>
