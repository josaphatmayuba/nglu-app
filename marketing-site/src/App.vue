<script setup>
const crmUrl = "/crm";

const focusAreas = [
  {
    eyebrow: "Souverainete alimentaire",
    title: "Produire localement, nourrir durablement",
    text: "Nous investissons dans l'agriculture, l'elevage et les circuits courts pour renforcer l'autonomie alimentaire des communautes.",
  },
  {
    eyebrow: "Impact social",
    title: "Soutenir les familles et les orphelinats",
    text: "Les actions terrain ciblent la nourriture, l'education, les soins essentiels et l'accompagnement des structures locales.",
  },
  {
    eyebrow: "Gestion numerique",
    title: "Piloter les operations avec des donnees fiables",
    text: "Le CRM NGOLU centralise ventes, stocks, finances, immobilier, RH et rapports pour accelerer les decisions.",
  },
];

const programs = [
  "Fermes pilotes et accompagnement des producteurs",
  "Elevage de volaille, porc et betail",
  "Distribution alimentaire et soutien aux orphelinats",
  "Outils de gestion pour les operations locales",
];

const metrics = [
  { value: "3", label: "axes d'action" },
  { value: "24/7", label: "suivi operationnel" },
  { value: "RDC", label: "terrain prioritaire" },
];
</script>

<template>
  <main class="site-shell">
    <header class="topbar" aria-label="Navigation principale">
      <a class="brand" href="#accueil" aria-label="ONGD NGOLU accueil">
        <img src="/static/logo.png" alt="" />
        <span>
          <strong>ONGD NGOLU</strong>
          <small>Developpement durable</small>
        </span>
      </a>
      <nav>
        <a href="#mission">Mission</a>
        <a href="#programmes">Programmes</a>
        <a href="#impact">Impact</a>
        <a :href="crmUrl" class="login-link">CRM</a>
      </nav>
    </header>

    <section id="accueil" class="hero">
      <div class="hero-copy">
        <p class="kicker">Agriculture. Humanitaire. Technologie.</p>
        <h1>ONGD NGOLU</h1>
        <p class="lead">
          Une organisation congolaise qui relie production locale, solidarite sociale
          et outils numeriques pour construire des operations plus transparentes.
        </p>
        <div class="hero-actions">
          <a href="#programmes" class="button primary">Voir les programmes</a>
          <a href="mailto:contact@ongdngolu.org" class="button secondary">Nous contacter</a>
        </div>
      </div>

      <aside class="hero-panel" aria-label="Apercu des operations">
        <div class="panel-header">
          <span>Tableau de bord NGOLU</span>
          <strong>Live</strong>
        </div>
        <div class="dashboard-grid">
          <div v-for="metric in metrics" :key="metric.label" class="metric">
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.label }}</span>
          </div>
        </div>
        <div class="flow-card">
          <span class="flow-dot"></span>
          <div>
            <strong>Operations connectees</strong>
            <p>Donnees terrain, finances et rapports disponibles dans le CRM.</p>
          </div>
        </div>
      </aside>
    </section>

    <section id="mission" class="section">
      <div class="section-heading">
        <p class="kicker">Notre mission</p>
        <h2>Transformer les ressources locales en impact mesurable</h2>
      </div>
      <div class="focus-grid">
        <article v-for="area in focusAreas" :key="area.title" class="focus-card">
          <p>{{ area.eyebrow }}</p>
          <h3>{{ area.title }}</h3>
          <span>{{ area.text }}</span>
        </article>
      </div>
    </section>

    <section id="programmes" class="program-band">
      <div>
        <p class="kicker">Programmes</p>
        <h2>Une approche integree pour le terrain</h2>
        <p>
          NGOLU combine production, distribution, soutien communautaire et suivi
          numerique afin que chaque action soit traçable et utile.
        </p>
      </div>
      <ul>
        <li v-for="program in programs" :key="program">{{ program }}</li>
      </ul>
    </section>

    <section id="impact" class="impact-section">
      <div class="impact-copy">
        <p class="kicker">Impact</p>
        <h2>Un site public simple, un CRM separe et protege</h2>
        <p>
          Le site marketing reste a la racine du domaine. L'application de gestion
          conserve son entree officielle sous <strong>/crm</strong>, avec ses routes
          internes sous <strong>/admin</strong>.
        </p>
      </div>
      <a :href="crmUrl" class="button dark">Acceder au CRM</a>
    </section>

    <footer>
      <span>ONGD NGOLU</span>
      <a href="mailto:contact@ongdngolu.org">contact@ongdngolu.org</a>
    </footer>
  </main>
</template>
