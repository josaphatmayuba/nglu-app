<script setup>
import { h, onMounted } from "vue";
import {
  ArrowRight,
  Award,
  BarChart3,
  Beef,
  Bird,
  Cpu,
  Globe,
  GraduationCap,
  Heart,
  HeartHandshake,
  HeartPulse,
  Leaf,
  LogIn,
  Mail,
  MapPin,
  Menu,
  PackageSearch,
  PiggyBank,
  Rocket,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
  Utensils,
  Wheat,
  Zap,
} from "@lucide/vue";

const iconComponents = {
  ArrowRight,
  Award,
  BarChart3,
  Beef,
  Bird,
  Cpu,
  Globe,
  GraduationCap,
  Heart,
  HeartHandshake,
  HeartPulse,
  Leaf,
  LogIn,
  Mail,
  MapPin,
  Menu,
  PackageSearch,
  PiggyBank,
  Rocket,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
  Utensils,
  Wheat,
  Zap,
};

const Icon = (props, { attrs }) => h(iconComponents[props.name], attrs);
Icon.props = {
  name: {
    type: String,
    required: true,
  },
};

onMounted(() => {
  // Mobile menu toggle
  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("mobile-nav");
  if (toggle && menu) {
    toggle.addEventListener("click", () => menu.classList.toggle("hidden"));
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => menu.classList.add("hidden")),
    );
  }

  // Fade-in on scroll
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

  // Donate amount buttons interaction
  document.querySelectorAll("#don button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#don button").forEach((b) => {
        b.classList.remove("bg-white", "text-accent-600", "border-white", "shadow-lg");
        b.classList.add("bg-white/20", "border-white/40");
      });
      btn.classList.remove("bg-white/20", "border-white/40");
      btn.classList.add("bg-white", "text-accent-600", "border-white", "shadow-lg");
    });
  });
});
</script>

<template>
  <div>
    <header class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 md:h-20">
          <a href="#" class="flex items-center gap-3">
            <img src="/static/logo.png" alt="ONGD NGOLU" class="h-12 w-12 md:h-14 md:w-14">
            <div class="hidden sm:block">
              <div class="font-bold text-primary-700 text-lg md:text-xl leading-none">ONGD NGOLU</div>
              <div class="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Aide au Développement Durable</div>
            </div>
          </a>
          <nav class="hidden lg:flex items-center gap-8">
            <a href="#mission" class="nav-link text-sm font-medium text-slate-700 hover:text-primary-700">Mission</a>
            <a href="#agriculture" class="nav-link text-sm font-medium text-slate-700 hover:text-primary-700">Agriculture</a>
            <a href="#social" class="nav-link text-sm font-medium text-slate-700 hover:text-primary-700">Impact Social</a>
            <a href="#technologie" class="nav-link text-sm font-medium text-slate-700 hover:text-primary-700">Technologie</a>
            <a href="#contact" class="nav-link text-sm font-medium text-slate-700 hover:text-primary-700">Contact</a>
          </nav>
          <div class="flex items-center gap-2 md:gap-3">
            <a href="/crm" class="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-700 border border-primary-700 rounded-lg hover:bg-primary-50 transition">
              <Icon name="LogIn" class="w-4 h-4" /> Se connecter
            </a>
            <a href="#don" class="donate-btn hidden sm:inline-flex items-center gap-1.5 px-4 py-2 md:px-5 md:py-2.5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 rounded-lg transition shadow-md">
              <Icon name="Heart" class="w-4 h-4" />
              <span>Faire un don</span>
            </a>
            <button id="menu-toggle" class="lg:hidden p-2 text-slate-700 hover:text-primary-700" aria-label="Menu">
              <Icon name="Menu" class="w-6 h-6" />
            </button>
          </div>
        </div>
        <nav id="mobile-nav" class="lg:hidden hidden pb-4 border-t border-slate-200 pt-3 space-y-1">
          <a href="#mission" class="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">Mission</a>
          <a href="#agriculture" class="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">Agriculture</a>
          <a href="#social" class="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">Impact Social</a>
          <a href="#technologie" class="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">Technologie</a>
          <a href="#contact" class="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100">Contact</a>
          <a href="/crm" class="block px-3 py-2 rounded-md text-sm font-medium text-primary-700 hover:bg-primary-50">Se connecter →</a>
        </nav>
      </div>
    </header>

    <section class="hero-gradient text-white pt-32 md:pt-40 pb-20 md:pb-28 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="fade-in">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-white/10 border border-white/20 text-xs font-medium tracking-wider uppercase">
              <span class="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
              République Démocratique du Congo
            </div>
            <h1 class="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
              Nourrir le Congo,<br>
              <span class="text-accent-500">éveiller</span> son avenir.
            </h1>
            <p class="text-lg md:text-xl text-blue-100/90 mb-8 max-w-xl leading-relaxed">
              ONGD NGOLU combat la faim, soutient les orphelinats et bâtit la souveraineté alimentaire de la RDC grâce à une alliance unique entre <strong class="text-white">production locale</strong> et <strong class="text-white">technologie</strong>.
            </p>
            <div class="flex flex-wrap gap-3">
              <a href="#don" class="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg shadow-lg transition">
                <Icon name="Heart" class="w-5 h-5" /> Faire un don
              </a>
              <a href="#mission" class="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/30 backdrop-blur-sm transition">
                Découvrir notre mission
                <Icon name="ArrowRight" class="w-5 h-5" />
              </a>
            </div>
            <div class="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/20">
              <div><div class="text-2xl md:text-3xl font-bold text-accent-500">4</div><div class="text-xs md:text-sm text-blue-100/80">Piliers agricoles</div></div>
              <div><div class="text-2xl md:text-3xl font-bold text-accent-500">100%</div><div class="text-xs md:text-sm text-blue-100/80">Production locale</div></div>
              <div><div class="text-2xl md:text-3xl font-bold text-accent-500">∞</div><div class="text-xs md:text-sm text-blue-100/80">Vies impactées</div></div>
            </div>
          </div>
          <div class="hidden lg:flex justify-center fade-in">
            <div class="relative">
              <div class="absolute inset-0 bg-accent-500/20 blur-3xl rounded-full"></div>
              <img src="/static/logo.png" alt="ONGD NGOLU" class="relative w-96 h-96 drop-shadow-2xl">
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="mission" class="py-20 md:py-24 pattern-bg">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center fade-in">
        <div class="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-primary-700 bg-primary-50 rounded-full">Notre Mission</div>
        <h2 class="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
          Une approche moderne pour <span class="text-primary-700">éradiquer la faim</span> en RDC
        </h2>
        <p class="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
          Nous combattons la faim, soutenons le développement national et réduisons la souffrance humaine en optimisant l'aide grâce à la technologie. Notre conviction : l'autonomie alimentaire est la première étape vers un Congo prospère.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div class="p-6 bg-white rounded-2xl border border-slate-200">
            <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-growth-500/10 rounded-xl">
              <Icon name="Wheat" class="w-6 h-6 text-growth-600" />
            </div>
            <h3 class="font-bold text-lg mb-2">Souveraineté Alimentaire</h3>
            <p class="text-sm text-slate-600">Cultiver localement pour ne plus dépendre des importations.</p>
          </div>
          <div class="p-6 bg-white rounded-2xl border border-slate-200">
            <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-accent-500/10 rounded-xl">
              <Icon name="HeartHandshake" class="w-6 h-6 text-accent-600" />
            </div>
            <h3 class="font-bold text-lg mb-2">Impact Humanitaire</h3>
            <p class="text-sm text-slate-600">Soutenir les orphelinats et les plus démunis avec dignité.</p>
          </div>
          <div class="p-6 bg-white rounded-2xl border border-slate-200">
            <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-primary-700/10 rounded-xl">
              <Icon name="Cpu" class="w-6 h-6 text-primary-700" />
            </div>
            <h3 class="font-bold text-lg mb-2">Innovation Numérique</h3>
            <p class="text-sm text-slate-600">Garantir la traçabilité et la transparence par la technologie.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="agriculture" class="py-20 md:py-24 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14 fade-in">
          <div class="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-growth-600 bg-growth-500/10 rounded-full">Agriculture & Élevage</div>
          <h2 class="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Quatre piliers pour <span class="text-growth-600">nourrir la nation</span>
          </h2>
          <p class="text-lg text-slate-600 max-w-2xl mx-auto">
            Une production locale forte, traçable et durable. Du champ à l'assiette, chaque maillon est maîtrisé.
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="pillar-card bg-white rounded-2xl p-6 border border-slate-200 fade-in">
            <div class="w-14 h-14 mb-5 flex items-center justify-center bg-growth-500 text-white rounded-xl shadow-md">
              <Icon name="Sprout" class="w-7 h-7" />
            </div>
            <h3 class="font-bold text-xl text-slate-900 mb-2">Produits Locaux</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">Manioc, maïs, légumes, fruits — cultivés sur nos terres congolaises pour stabiliser l'accès à la nourriture.</p>
            <div class="flex items-center text-xs font-medium text-growth-600">
              <Icon name="Leaf" class="w-4 h-4 mr-1" /> Culture intensive durable
            </div>
          </div>
          <div class="pillar-card bg-white rounded-2xl p-6 border border-slate-200 fade-in" style="animation-delay: 100ms">
            <div class="w-14 h-14 mb-5 flex items-center justify-center bg-accent-500 text-white rounded-xl shadow-md">
              <Icon name="Bird" class="w-7 h-7" />
            </div>
            <h3 class="font-bold text-xl text-slate-900 mb-2">Filière Poulet</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">Élevage avicole intensif : production d'œufs et de viande blanche accessibles, riches en protéines essentielles.</p>
            <div class="flex items-center text-xs font-medium text-accent-600">
              <Icon name="Zap" class="w-4 h-4 mr-1" /> Cycle court, haute valeur
            </div>
          </div>
          <div class="pillar-card bg-white rounded-2xl p-6 border border-slate-200 fade-in" style="animation-delay: 200ms">
            <div class="w-14 h-14 mb-5 flex items-center justify-center bg-primary-600 text-white rounded-xl shadow-md">
              <Icon name="PiggyBank" class="w-7 h-7" />
            </div>
            <h3 class="font-bold text-xl text-slate-900 mb-2">Filière Porc</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">Élevage porcin moderne et hygiénique. Viande de qualité, sources d'emplois et de revenus pour les communautés.</p>
            <div class="flex items-center text-xs font-medium text-primary-700">
              <Icon name="TrendingUp" class="w-4 h-4 mr-1" /> Croissance économique
            </div>
          </div>
          <div class="pillar-card bg-white rounded-2xl p-6 border border-slate-200 fade-in" style="animation-delay: 300ms">
            <div class="w-14 h-14 mb-5 flex items-center justify-center bg-amber-700 text-white rounded-xl shadow-md">
              <Icon name="Beef" class="w-7 h-7" />
            </div>
            <h3 class="font-bold text-xl text-slate-900 mb-2">Filière Bœuf</h3>
            <p class="text-sm text-slate-600 leading-relaxed mb-4">Élevage bovin extensif. Viande rouge, lait et cuir — une filière complète à fort impact social et nutritionnel.</p>
            <div class="flex items-center text-xs font-medium text-amber-700">
              <Icon name="Award" class="w-4 h-4 mr-1" /> Tradition & modernité
            </div>
          </div>
        </div>
        <div class="mt-14 p-8 md:p-10 bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl text-white text-center fade-in">
          <Icon name="Target" class="w-10 h-10 mx-auto mb-4 text-accent-500" />
          <h3 class="font-display text-2xl md:text-3xl font-bold mb-3">Notre objectif national</h3>
          <p class="text-blue-100 max-w-2xl mx-auto text-lg">
            Une production nationale forte qui permette à la RDC de <strong class="text-white">ne plus dépendre des importations</strong>, et de devenir un acteur agro-pastoral de référence en Afrique centrale.
          </p>
        </div>
      </div>
    </section>

    <section id="social" class="py-20 md:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="fade-in">
            <div class="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-accent-600 bg-accent-500/10 rounded-full">Impact Social</div>
            <h2 class="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Donner sa chance à <span class="text-accent-600">chaque enfant.</span>
            </h2>
            <p class="text-lg text-slate-600 leading-relaxed mb-6">
              Une part de notre production agricole et de l'élevage est destinée aux <strong>orphelinats partenaires</strong>. Chaque sac de manioc, chaque poulet, chaque œuf devient un repas, une promesse d'avenir.
            </p>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <div class="flex-shrink-0 mt-1 w-6 h-6 flex items-center justify-center bg-accent-500/10 text-accent-600 rounded-full">
                  <Icon name="Utensils" class="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong class="text-slate-900">Dons alimentaires réguliers</strong>
                  <p class="text-sm text-slate-600">Issus directement de nos fermes, livrés frais aux orphelinats partenaires.</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <div class="flex-shrink-0 mt-1 w-6 h-6 flex items-center justify-center bg-accent-500/10 text-accent-600 rounded-full">
                  <Icon name="HeartPulse" class="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong class="text-slate-900">Programmes de soins</strong>
                  <p class="text-sm text-slate-600">Accès aux soins de base, vaccinations et accompagnement médical.</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <div class="flex-shrink-0 mt-1 w-6 h-6 flex items-center justify-center bg-accent-500/10 text-accent-600 rounded-full">
                  <Icon name="GraduationCap" class="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong class="text-slate-900">Soutien éducatif</strong>
                  <p class="text-sm text-slate-600">Bourses, fournitures et formations pour préparer chaque enfant à l'avenir.</p>
                </div>
              </li>
            </ul>
            <a href="#don" class="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg shadow-md transition">
              <Icon name="Heart" class="w-5 h-5" /> Soutenir un orphelinat
            </a>
          </div>
          <div class="fade-in">
            <div class="relative">
              <div class="absolute inset-0 bg-accent-500/10 rounded-3xl transform rotate-3"></div>
              <div class="absolute inset-0 bg-primary-100 rounded-3xl transform -rotate-3"></div>
              <div class="relative bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl p-10 shadow-xl border border-slate-200">
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-white rounded-2xl p-5 shadow-sm">
                    <div class="text-3xl mb-2">🌾</div>
                    <div class="font-bold text-slate-900 text-sm">Nourriture</div>
                    <div class="text-xs text-slate-500">de nos fermes</div>
                  </div>
                  <div class="bg-white rounded-2xl p-5 shadow-sm">
                    <div class="text-3xl mb-2">🏥</div>
                    <div class="font-bold text-slate-900 text-sm">Soins</div>
                    <div class="text-xs text-slate-500">médicaux gratuits</div>
                  </div>
                  <div class="bg-white rounded-2xl p-5 shadow-sm">
                    <div class="text-3xl mb-2">📚</div>
                    <div class="font-bold text-slate-900 text-sm">Éducation</div>
                    <div class="text-xs text-slate-500">& fournitures</div>
                  </div>
                  <div class="bg-white rounded-2xl p-5 shadow-sm">
                    <div class="text-3xl mb-2">💛</div>
                    <div class="font-bold text-slate-900 text-sm">Dignité</div>
                    <div class="text-xs text-slate-500">retrouvée</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="technologie" class="py-20 md:py-24 tech-bg relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14 fade-in">
          <div class="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-primary-700 bg-primary-100 rounded-full">L'innovation NGOLU</div>
          <h2 class="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Un logiciel pour <span class="text-primary-700">tout maîtriser</span>.
          </h2>
          <p class="text-lg text-slate-600 max-w-3xl mx-auto">
            Au cœur de NGOLU, un système de gestion intégré qui trace chaque production, chaque don, chaque ressource — pour une transparence totale et une efficacité maximale.
          </p>
        </div>
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="space-y-5 fade-in">
            <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary-100 text-primary-700 rounded-lg">
                <Icon name="PackageSearch" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900 mb-1">Traçabilité de la production</h3>
                <p class="text-sm text-slate-600">Du champ à l'assiette, chaque récolte et chaque animal sont suivis en temps réel.</p>
              </div>
            </div>
            <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-growth-500/10 text-growth-600 rounded-lg">
                <Icon name="BarChart3" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900 mb-1">Gestion des ressources</h3>
                <p class="text-sm text-slate-600">Stocks, finances, ventes, achats — une vue unifiée de toute l'activité.</p>
              </div>
            </div>
            <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-accent-500/10 text-accent-600 rounded-lg">
                <Icon name="ShieldCheck" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900 mb-1">Transparence des dons</h3>
                <p class="text-sm text-slate-600">Chaque don est tracé jusqu'au bénéficiaire final. Les donateurs voient exactement où va leur soutien.</p>
              </div>
            </div>
            <div class="flex gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-100 text-purple-700 rounded-lg">
                <Icon name="Rocket" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900 mb-1">Au service des startups</h3>
                <p class="text-sm text-slate-600">Notre logiciel est mis à disposition des jeunes entrepreneurs pour structurer et développer leurs activités.</p>
              </div>
            </div>
          </div>
          <div class="fade-in">
            <div class="relative bg-gradient-to-br from-primary-700 to-primary-600 rounded-2xl p-8 shadow-2xl">
              <div class="flex items-center gap-2 mb-6">
                <div class="w-3 h-3 rounded-full bg-red-400"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div class="w-3 h-3 rounded-full bg-green-400"></div>
                <div class="ml-3 text-xs text-blue-100 font-mono">ngolu.app/dashboard</div>
              </div>
              <div class="bg-white/10 backdrop-blur rounded-xl p-5 mb-3 border border-white/20">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-blue-100 font-medium">PRODUCTION DU MOIS</span>
                  <Icon name="TrendingUp" class="w-4 h-4 text-accent-500" />
                </div>
                <div class="text-3xl font-bold text-white">+ 12 450 kg</div>
                <div class="text-xs text-blue-200">↑ 23% vs mois dernier</div>
              </div>
              <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20"><div class="text-xs text-blue-100 mb-1">Bœufs</div><div class="text-xl font-bold text-white">86</div></div>
                <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20"><div class="text-xs text-blue-100 mb-1">Porcs</div><div class="text-xl font-bold text-white">214</div></div>
                <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20"><div class="text-xs text-blue-100 mb-1">Poulets</div><div class="text-xl font-bold text-white">3 408</div></div>
                <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20"><div class="text-xs text-blue-100 mb-1">Cultures</div><div class="text-xl font-bold text-white">42 ha</div></div>
              </div>
              <div class="bg-accent-500/20 backdrop-blur rounded-xl p-4 border border-accent-500/30">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs text-blue-100">Dons aux orphelinats ce mois-ci</div>
                    <div class="text-lg font-bold text-white">1 240 kg distribués</div>
                  </div>
                  <Icon name="Heart" class="w-8 h-8 text-accent-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="don" class="py-20 md:py-24 bg-gradient-to-br from-accent-500 to-orange-600 text-white relative overflow-hidden">
      <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 30px 30px;"></div>
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 fade-in">
        <Icon name="Heart" class="w-14 h-14 mx-auto mb-6 text-white" />
        <h2 class="font-display text-3xl md:text-5xl font-bold mb-6 leading-tight">Votre don. Notre action. Leur avenir.</h2>
        <p class="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
          Chaque contribution est tracée dans notre système, vous voyez exactement comment elle est utilisée. 100% de votre don sert directement nos projets agricoles et humanitaires.
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 max-w-2xl mx-auto">
          <button class="px-6 py-4 bg-white/20 hover:bg-white/30 border-2 border-white/40 rounded-xl font-bold text-lg transition">10 $</button>
          <button class="px-6 py-4 bg-white/20 hover:bg-white/30 border-2 border-white/40 rounded-xl font-bold text-lg transition">25 $</button>
          <button class="px-6 py-4 bg-white text-accent-600 border-2 border-white rounded-xl font-bold text-lg shadow-lg transition">50 $</button>
          <button class="px-6 py-4 bg-white/20 hover:bg-white/30 border-2 border-white/40 rounded-xl font-bold text-lg transition">100 $</button>
        </div>
        <a href="mailto:don@ongdngolu.org" class="inline-flex items-center gap-2 px-8 py-4 bg-white text-accent-600 hover:bg-amber-50 font-bold text-lg rounded-xl shadow-xl transition">
          Faire un don maintenant
          <Icon name="ArrowRight" class="w-5 h-5" />
        </a>
        <p class="mt-6 text-sm text-white/70">
          Vous pouvez aussi nous contacter à <a href="mailto:contact@ongdngolu.org" class="underline">contact@ongdngolu.org</a>
        </p>
      </div>
    </section>

    <footer id="contact" class="bg-slate-900 text-slate-300 py-14">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div class="md:col-span-2">
            <div class="flex items-center gap-3 mb-4">
              <img src="/static/logo.png" alt="ONGD NGOLU" class="h-14 w-14">
              <div>
                <div class="font-bold text-white text-lg">ONGD NGOLU</div>
                <div class="text-xs text-slate-400 uppercase tracking-wider">Aide au Développement Durable</div>
              </div>
            </div>
            <p class="text-sm text-slate-400 max-w-md leading-relaxed">
              Une ONG congolaise dédiée à la souveraineté alimentaire, au soutien des orphelinats et à l'innovation technologique au service du développement.
            </p>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Navigation</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="#mission" class="hover:text-accent-500 transition">Mission</a></li>
              <li><a href="#agriculture" class="hover:text-accent-500 transition">Agriculture</a></li>
              <li><a href="#social" class="hover:text-accent-500 transition">Impact Social</a></li>
              <li><a href="#technologie" class="hover:text-accent-500 transition">Technologie</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">Contact</h4>
            <ul class="space-y-2 text-sm text-slate-400">
              <li class="flex items-start gap-2">
                <Icon name="MapPin" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                République Démocratique du Congo
              </li>
              <li class="flex items-center gap-2">
                <Icon name="Mail" class="w-4 h-4 flex-shrink-0" />
                <a href="mailto:contact@ongdngolu.org" class="hover:text-accent-500">contact@ongdngolu.org</a>
              </li>
              <li class="flex items-center gap-2">
                <Icon name="Globe" class="w-4 h-4 flex-shrink-0" />
                <a href="https://ongdngolu.org" class="hover:text-accent-500">ongdngolu.org</a>
              </li>
            </ul>
            <div class="mt-5">
              <a href="/crm" class="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition">
                <Icon name="LogIn" class="w-4 h-4" /> Espace ERP
              </a>
            </div>
          </div>
        </div>
        <div class="mt-10 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
          © 2026 ONGD NGOLU. Tous droits réservés. — Développé avec ❤️ pour la RDC.
        </div>
      </div>
    </footer>
  </div>
</template>
