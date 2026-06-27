<script setup>
// Pages Connexion / Inscription / Espace propres a Avelomi (site Vue).
// Tapent le MEME backend que l'ERP via le proxy /api (nginx -> middleware) :
//   POST /api/auth/login    { email, password }              -> { token, ... } | { requireMfa, mfaToken }
//   POST /api/auth/register { firstName,lastName,email,... }  -> { token, organization }
// Token en memoire applicative (SCRUM-119) ; cookie refresh pose par le backend.
// Vues pilotees par le hash : #/login, #/signup, #/accueil (espace).
// Parcours inscription en 4 etapes : compte -> organisation -> plan -> confirmation.
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'fr' },
  view: { type: String, default: 'login' }, // 'login' | 'signup' | 'accueil'
});
const t = (fr, en) => (props.lang === 'en' ? en : fr);

const API = '/api';
let accessToken = null;
const loading = ref(false);
const error = ref('');
const me = ref(null);          // { firstName, email, org, slug }
const success = ref(false);    // ecran bienvenue
const inWorkspace = ref(false); // espace de travail

// ───────────────────────── Connexion ─────────────────────────
const login = reactive({ email: '', password: '' });
async function submitLogin() {
  error.value = '';
  if (!login.email || !login.password) { error.value = t('Email et mot de passe requis.', 'Email and password required.'); return; }
  loading.value = true;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: login.email.trim().toLowerCase(), password: login.password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || t('Identifiants invalides.', 'Invalid credentials.'));
    if (data.requireMfa) { error.value = t('Authentification a deux facteurs requise — connectez-vous depuis l’application.', 'Two-factor authentication required — sign in from the app.'); return; }
    accessToken = data.token || null;
    me.value = { firstName: data.firstName || data.name || login.email, email: login.email, org: data.organization?.name };
    enterWorkspace();
  } catch (e) { error.value = Array.isArray(e.message) ? e.message[0] : e.message; }
  finally { loading.value = false; }
}

// ───────────────────────── Inscription (4 etapes) ─────────────────────────
const step = ref(1);
const TOTAL = 4;
const accountType = ref('org'); // 'org' | 'solo'
// Plan pre-selectionne depuis la grille de prix de la landing (#/signup?plan=business).
const PLAN_IDS = ['free', 'starter', 'business', 'enterprise'];
const planFromUrl = (location.hash.split('?')[1] || '').split('&').map(p => p.split('=')).find(([k]) => k === 'plan')?.[1];
const reg = reactive({ firstName: '', lastName: '', email: '', password: '', orgName: '', slug: '', sector: 'agri', phone: '', plan: PLAN_IDS.includes(planFromUrl) ? planFromUrl : 'free', acceptedTerms: false });
const fieldErr = reactive({});

const stepLabel = computed(() => {
  const l = props.lang === 'en'
    ? { 1: 'Your account', 2: 'Your organization', 3: 'Your plan', 4: 'Confirmation' }
    : { 1: 'Votre compte', 2: 'Votre organisation', 3: 'Votre abonnement', 4: 'Confirmation' };
  return t(`Étape ${step.value} sur ${TOTAL} — ${l[step.value]}`, `Step ${step.value} of ${TOTAL} — ${l[step.value]}`);
});

const sectors = computed(() => ([
  { v: 'agri', l: t('Agriculture / Élevage', 'Agriculture / Livestock') },
  { v: 'immo', l: t('Immobilier', 'Real estate') },
  { v: 'btp', l: t('Construction / BTP', 'Construction') },
  { v: 'commerce', l: t('Commerce / Vente', 'Retail / Sales') },
  { v: 'autre', l: t('Autre', 'Other') },
]));

const plans = computed(() => ([
  { v: 'free',    name: t('Gratuit', 'Free'),       price: t('0 $', '$0'),        per: t('pour toujours', 'forever'),   desc: t('Toutes les apps, 3 utilisateurs.', 'All apps, 3 users.') },
  { v: 'starter', name: 'Starter',                  price: t('5 $', '$5'),        per: t('/ mois', '/ mo'),             desc: t('Jusqu’à 50 utilisateurs.', 'Up to 50 users.') },
  { v: 'business',name: 'Business', popular: true,  price: t('19 $', '$19'),      per: t('/ mois', '/ mo'),             desc: t('IA pleine puissance, illimité.', 'Full-power AI, unlimited.') },
  { v: 'enterprise', name: 'Enterprise',            price: t('Sur devis', 'Custom'), per: t('multi-entités', 'multi-entity'), desc: t('Consolidation & SSO.', 'Consolidation & SSO.') },
]));

const slugAuto = computed(() => (reg.orgName || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, ''));
const effectiveSlug = computed(() => (reg.slug || slugAuto.value));
function syncSlug() { reg.slug = slugAuto.value; }

const pwdScore = computed(() => {
  const p = reg.password; let s = 0;
  if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
});
const pwdColor = computed(() => ['#dc2626', '#f59e0b', '#eab308', '#1fbf73'][Math.max(0, pwdScore.value - 1)] || '#e7ebf2');

function validateStep(n) {
  Object.keys(fieldErr).forEach(k => delete fieldErr[k]);
  let ok = true;
  // Format noms : lettres (accents), espaces, tirets, apostrophes, points (idem backend).
  const NAME_RE = /^\p{L}[\p{L} '.-]*$/u;
  if (n === 1) {
    if (!reg.firstName.trim()) { fieldErr.firstName = t('Prénom requis.', 'First name required.'); ok = false; }
    else if (!NAME_RE.test(reg.firstName.trim())) { fieldErr.firstName = t('Prénom invalide.', 'Invalid first name.'); ok = false; }
    if (!reg.lastName.trim()) { fieldErr.lastName = t('Nom requis.', 'Last name required.'); ok = false; }
    else if (!NAME_RE.test(reg.lastName.trim())) { fieldErr.lastName = t('Nom invalide.', 'Invalid last name.'); ok = false; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email.trim())) { fieldErr.email = t('Email invalide.', 'Invalid email.'); ok = false; }
    if (reg.password.length < 8 || !/^(?=.*[a-zA-Z])(?=.*\d).+$/.test(reg.password)) { fieldErr.password = t('Au moins 8 caractères, une lettre et un chiffre.', 'At least 8 characters, one letter and one digit.'); ok = false; }
  }
  if (n === 2) {
    if (accountType.value === 'org') {
      if (!reg.orgName.trim()) { fieldErr.orgName = t('Indiquez un nom.', 'Enter a name.'); ok = false; }
      else if (!/^[\p{L}\p{N}][\p{L}\p{N} &.,'-]*$/u.test(reg.orgName.trim())) { fieldErr.orgName = t('Nom d’entreprise invalide.', 'Invalid company name.'); ok = false; }
    }
    const s = effectiveSlug.value;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s) || s.length < 3 || s.length > 63) {
      fieldErr.slug = t('Adresse invalide (3+ caractères : minuscules, chiffres, tirets).', 'Invalid address (3+ chars: lowercase, digits, hyphens).'); ok = false;
    }
  }
  return ok;
}
function next() { if (validateStep(step.value)) step.value = Math.min(TOTAL, step.value + 1); }
function prev() { step.value = Math.max(1, step.value - 1); }
function setType(tp) { accountType.value = tp; }

async function submitSignup() {
  error.value = '';
  if (!reg.acceptedTerms) { fieldErr.terms = t('Vous devez accepter les conditions.', 'You must accept the terms.'); return; }
  loading.value = true;
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        firstName: reg.firstName.trim(),
        lastName: reg.lastName.trim(),
        email: reg.email.trim().toLowerCase(),
        password: reg.password,
        accountType: accountType.value,
        orgName: accountType.value === 'org' ? reg.orgName.trim() : undefined,
        slug: effectiveSlug.value,
        sector: reg.sector,
        phone: reg.phone.trim() || undefined,
        plan: reg.plan,
        acceptedTerms: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || t('La création a échoué. Vérifiez vos informations.', 'Sign-up failed. Check your details.');
      if (res.status === 409 && /adresse|slug/i.test(msg)) { step.value = 2; fieldErr.slug = msg; }
      else if (/email/i.test(msg)) { step.value = 1; fieldErr.email = Array.isArray(msg) ? msg[0] : msg; }
      else error.value = Array.isArray(msg) ? msg[0] : msg;
      return;
    }
    accessToken = data.token || null;
    me.value = { firstName: reg.firstName.trim(), email: reg.email.trim().toLowerCase(), org: data.organization?.name || reg.orgName.trim(), slug: data.organization?.slug || effectiveSlug.value };
    success.value = true;
  } catch (e) { error.value = t('Réseau indisponible. Réessayez.', 'Network unavailable. Try again.'); }
  finally { loading.value = false; }
}

// ───────────────────────── Espace ─────────────────────────
const apps = computed(() => ([
  { ico: '🐄', nm: 'FarmOS' }, { ico: '💰', nm: t('Comptabilité', 'Accounting') }, { ico: '🏠', nm: 'Domus' },
  { ico: '🏗️', nm: 'BatiPro' }, { ico: '👥', nm: t('RH', 'HR') }, { ico: '📊', nm: t('Stats', 'Stats') },
]));
function enterWorkspace() { success.value = false; inWorkspace.value = true; go('#/accueil'); }
function go(hash) { location.hash = hash; }
function logout() { accessToken = null; me.value = null; success.value = false; inWorkspace.value = false; go('#/login'); }
</script>

<template>
  <!-- ESPACE DE TRAVAIL -->
  <div v-if="view === 'accueil' && inWorkspace" class="ws-app">
    <aside class="ws-side">
      <div class="ws-brand"><span class="mark"><svg viewBox="0 0 64 64"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/></g></svg></span>{{ me?.org || 'Avelomi' }}</div>
      <div class="ws-side-sub">{{ t('Votre espace', 'Your workspace') }}</div>
      <div class="ws-nav active">📊 <span>{{ t('Accueil', 'Home') }}</span></div>
      <div class="ws-nav" v-for="a in apps" :key="a.nm">{{ a.ico }} <span>{{ a.nm }}</span></div>
      <div class="ws-nav" @click="logout">⏻ <span>{{ t('Se déconnecter', 'Sign out') }}</span></div>
    </aside>
    <main class="ws-main">
      <div class="ws-banner">
        <span>⏳ <strong>{{ t('Période d’essai', 'Trial') }}</strong> — {{ t('14 jours restants.', '14 days left.') }}</span>
        <a class="btn-mini" href="#/signup" @click.prevent="go('#/signup')">{{ t('Voir les offres', 'See plans') }}</a>
      </div>
      <h1 class="ws-title">{{ t('Bonjour', 'Hello') }}, {{ me?.firstName }} 👋</h1>
      <p class="ws-sub">{{ t('Vous gérez', 'You manage') }} <strong>{{ me?.org }}</strong>. {{ t('Vos données sont isolées à votre organisation.', 'Your data is isolated to your organization.') }}</p>
      <h3>{{ t('Vos applications', 'Your apps') }}</h3>
      <div class="mod-grid">
        <a class="mod-card" v-for="a in apps" :key="a.nm" href="#/accueil" @click.prevent>
          <div class="ico">{{ a.ico }}</div><div class="nm">{{ a.nm }}</div>
        </a>
      </div>
    </main>
  </div>

  <div v-else class="auth-wrap">
    <a class="auth-logo" href="#/" @click.prevent="go('#/')">
      <span class="mark"><svg viewBox="0 0 64 64" aria-label="Avelomi"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/></g></svg></span> Avelomi
    </a>

    <!-- CONNEXION -->
    <form v-if="view === 'login'" class="auth-card" @submit.prevent="submitLogin">
      <h1>{{ t('Connexion', 'Sign in') }}</h1>
      <p class="auth-sub">{{ t('Accédez à votre espace Avelomi.', 'Access your Avelomi workspace.') }}</p>
      <label>{{ t('Email', 'Email') }}<input v-model="login.email" type="email" autocomplete="email" :placeholder="t('vous@entreprise.com','you@company.com')" /></label>
      <label>{{ t('Mot de passe', 'Password') }}<input v-model="login.password" type="password" autocomplete="current-password" placeholder="••••••••" /></label>
      <p v-if="error" class="auth-err">{{ error }}</p>
      <button class="auth-btn" :disabled="loading">{{ loading ? t('Connexion…','Signing in…') : t('Se connecter','Sign in') }}</button>
      <p class="auth-alt">{{ t('Pas encore de compte ?', 'No account yet?') }} <a href="#/signup" @click.prevent="go('#/signup')">{{ t('Commencer', 'Get started') }}</a></p>
    </form>

    <!-- SUCCES / BIENVENUE -->
    <div v-else-if="view === 'signup' && success" class="auth-card success-card">
      <div class="success-icon">🎉</div>
      <h1>{{ t('Bienvenue', 'Welcome') }}, {{ me?.firstName }} !</h1>
      <p class="auth-sub">{{ t('Votre espace', 'Your workspace') }} <strong>{{ me?.org }}</strong> {{ t('est prêt.', 'is ready.') }}</p>
      <div class="ws-url">{{ me?.slug }}.avelomi.com</div>
      <p class="auth-sub">{{ t('Toutes les applications sont activées :', 'All apps are enabled:') }}</p>
      <div class="apps-preview">
        <div class="app-chip" v-for="a in apps" :key="a.nm"><div class="ico">{{ a.ico }}</div><div class="nm">{{ a.nm }}</div></div>
      </div>
      <button class="auth-btn" @click="enterWorkspace">{{ t('Entrer dans mon espace →', 'Enter my workspace →') }}</button>
    </div>

    <!-- INSCRIPTION (4 etapes) -->
    <div v-else-if="view === 'signup'" class="auth-card">
      <h1>{{ t('Créer votre compte', 'Create your account') }}</h1>
      <div class="steps-head"><span class="step-label">{{ stepLabel }}</span><span class="step-count">{{ step }}/{{ TOTAL }}</span></div>
      <div class="steps-bar"><span class="seg" v-for="i in TOTAL" :key="i" :class="{ done: i <= step }"></span></div>

      <!-- Etape 1 : compte -->
      <form v-if="step === 1" class="step-form" @submit.prevent="next">
        <div class="auth-row">
          <label>{{ t('Prénom','First name') }}<span class="field" :class="{err:fieldErr.firstName}"><i class="fi">👤</i><input v-model="reg.firstName" type="text" :placeholder="t('Marie','Mary')" /></span><small v-if="fieldErr.firstName" class="fe">{{ fieldErr.firstName }}</small></label>
          <label>{{ t('Nom','Last name') }}<span class="field" :class="{err:fieldErr.lastName}"><input v-model="reg.lastName" type="text" :placeholder="t('Dupont','Smith')" /></span><small v-if="fieldErr.lastName" class="fe">{{ fieldErr.lastName }}</small></label>
        </div>
        <label>{{ t('Email professionnel','Work email') }}<span class="field" :class="{err:fieldErr.email}"><i class="fi">✉️</i><input v-model="reg.email" type="email" :placeholder="t('vous@entreprise.com','you@company.com')" /></span><small v-if="fieldErr.email" class="fe">{{ fieldErr.email }}</small></label>
        <label>{{ t('Mot de passe','Password') }}<span class="field" :class="{err:fieldErr.password}"><i class="fi">🔒</i><input v-model="reg.password" type="password" :placeholder="t('Au moins 8 caractères','At least 8 characters')" /></span>
          <span v-if="reg.password" class="pwd-bar"><i :style="{ width: (pwdScore/4*100)+'%', background: pwdColor }"></i></span>
          <small v-if="fieldErr.password" class="fe">{{ fieldErr.password }}</small>
        </label>
        <div class="form-actions">
          <button class="auth-btn">{{ t('Continuer →','Continue →') }}</button>
          <p class="auth-alt">{{ t('Déjà un compte ?', 'Already have an account?') }} <a href="#/login" @click.prevent="go('#/login')">{{ t('Se connecter', 'Sign in') }}</a></p>
        </div>
      </form>

      <!-- Etape 2 : organisation -->
      <form v-else-if="step === 2" class="step-form" @submit.prevent="next">
        <div class="type-toggle">
          <button type="button" class="type-btn" :class="{active:accountType==='org'}" @click="setType('org')"><div class="ico">🏢</div><div class="tit">{{ t('Une entreprise','A company') }}</div><div class="des">{{ t('Équipe, plusieurs utilisateurs','Team, multiple users') }}</div></button>
          <button type="button" class="type-btn" :class="{active:accountType==='solo'}" @click="setType('solo')"><div class="ico">👤</div><div class="tit">{{ t('Moi seul','Just me') }}</div><div class="des">{{ t('Usage individuel','Individual use') }}</div></button>
        </div>
        <label v-if="accountType==='org'">{{ t('Nom de l’entreprise','Company name') }}<input v-model="reg.orgName" type="text" @input="syncSlug" :class="{err:fieldErr.orgName}" /><small v-if="fieldErr.orgName" class="fe">{{ fieldErr.orgName }}</small></label>
        <label>{{ t('Adresse de votre espace','Your workspace address') }}
          <span class="slug-row"><input v-model="reg.slug" type="text" :placeholder="slugAuto || 'mon-entreprise'" /><span class="slug-suffix">.avelomi.com</span></span>
          <small v-if="fieldErr.slug" class="fe">{{ fieldErr.slug }}</small>
          <small v-else class="hint">{{ effectiveSlug ? '✓ ' + effectiveSlug + '.avelomi.com' : t('Identifiant unique de votre espace.','Your workspace’s unique ID.') }}</small>
        </label>
        <label>{{ t('Secteur d’activité','Industry') }}<select v-model="reg.sector"><option v-for="s in sectors" :key="s.v" :value="s.v">{{ s.l }}</option></select></label>
        <div class="btn-row"><button type="button" class="auth-btn ghost" @click="prev">← {{ t('Retour','Back') }}</button><button class="auth-btn">{{ t('Continuer →','Continue →') }}</button></div>
      </form>

      <!-- Etape 3 : plan -->
      <form v-else-if="step === 3" class="step-form" @submit.prevent="next">
        <p class="auth-sub">{{ t('Choisissez votre formule. Modifiable à tout moment.','Pick your plan. Change anytime.') }}</p>
        <div class="plan-list">
          <label class="plan-opt" v-for="p in plans" :key="p.v" :class="{sel:reg.plan===p.v}">
            <input type="radio" :value="p.v" v-model="reg.plan" />
            <span class="plan-main">
              <b>{{ p.name }} <em v-if="p.popular" class="pop">{{ t('Populaire','Popular') }}</em></b>
              <small>{{ p.desc }}</small>
            </span>
            <span class="plan-price">{{ p.price }}<em>{{ p.per }}</em></span>
          </label>
        </div>
        <div class="btn-row"><button type="button" class="auth-btn ghost" @click="prev">← {{ t('Retour','Back') }}</button><button class="auth-btn">{{ t('Continuer →','Continue →') }}</button></div>
      </form>

      <!-- Etape 4 : confirmation -->
      <form v-else class="step-form" @submit.prevent="submitSignup">
        <label>{{ t('Téléphone (RDC par défaut)','Phone (DRC default)') }}<input v-model="reg.phone" type="tel" placeholder="+243 …" /><small class="hint">{{ t('Pour sécuriser votre compte (optionnel).','To secure your account (optional).') }}</small></label>
        <div class="recap">
          <div class="recap-t">{{ t('Récapitulatif','Summary') }}</div>
          <div>👤 {{ reg.firstName }} {{ reg.lastName }} — {{ reg.email }}</div>
          <div>{{ accountType==='org' ? '🏢' : '👤' }} {{ accountType==='org' ? reg.orgName : (reg.firstName+' '+reg.lastName) }}</div>
          <div>🔗 {{ effectiveSlug }}.avelomi.com</div>
          <div>💳 {{ plans.find(p=>p.v===reg.plan)?.name }} — {{ plans.find(p=>p.v===reg.plan)?.price }}{{ plans.find(p=>p.v===reg.plan)?.per ? ' '+plans.find(p=>p.v===reg.plan).per : '' }}</div>
          <div class="recap-ok">✓ {{ t('Toutes les apps · Essai gratuit 14 jours','All apps · 14-day free trial') }}</div>
        </div>
        <label class="auth-check"><input v-model="reg.acceptedTerms" type="checkbox" /><span>{{ t('J’accepte les conditions d’utilisation et la politique de confidentialité.','I accept the terms of service and privacy policy.') }}</span></label>
        <small v-if="fieldErr.terms" class="fe">{{ fieldErr.terms }}</small>
        <p v-if="error" class="auth-err">{{ error }}</p>
        <div class="btn-row"><button type="button" class="auth-btn ghost" @click="prev">← {{ t('Retour','Back') }}</button><button class="auth-btn" :disabled="loading">{{ loading ? t('Création…','Creating…') : t('Créer mon espace 🚀','Create my workspace 🚀') }}</button></div>
      </form>
    </div>

    <!-- Fallback accueil sans session -->
    <div v-else class="auth-card success-card">
      <h1>{{ t('Session expirée', 'Session expired') }}</h1>
      <p class="auth-sub">{{ t('Reconnectez-vous pour accéder à votre espace.', 'Sign in again to access your workspace.') }}</p>
      <a class="auth-btn" href="#/login" @click.prevent="go('#/login')">{{ t('Se connecter', 'Sign in') }}</a>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap{width:100%;box-sizing:border-box;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:24px;padding:36px 18px 44px;background:linear-gradient(180deg,#f8fcfa 0%,#eef7f1 58%,#e9f2ed 100%)}
.auth-logo{display:inline-flex;align-items:center;gap:9px;font-weight:850;font-size:22px;letter-spacing:0;color:#0e2418;text-decoration:none}
.auth-logo .mark,.ws-brand .mark{width:30px;height:30px;display:inline-grid;place-items:center}
.auth-logo .mark svg,.ws-brand .mark svg{width:30px;height:30px}
.auth-card{width:min(540px,calc(100vw - 32px));box-sizing:border-box;background:#fff;border:1px solid #e7eee9;border-radius:22px;padding:42px 40px 36px;box-shadow:0 34px 70px -36px rgba(15,35,26,.38),0 1px 2px rgba(15,35,26,.05);display:flex;flex-direction:column;gap:18px}
.auth-card h1{max-width:none;margin:0;text-align:center;font-size:30px;letter-spacing:0;font-weight:850;color:#0f1729;line-height:1.12}
.auth-sub{color:#6b7a90;font-size:14.5px;margin-top:-8px}
.auth-card label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:750;color:#2d3d58;letter-spacing:0}
/* wrapper champ avec icone */
.field{display:flex;align-items:center;gap:10px;border:1.5px solid #e2e8f0;border-radius:14px;padding:0 14px;background:#fbfcfd;transition:.16s}
.field:focus-within{border-color:#1fbf73;background:#fff;box-shadow:0 0 0 3.5px rgba(31,191,115,.13)}
.field.err{border-color:#dc2626;background:#fff}
.field .fi{font-size:15px;opacity:.6;flex-shrink:0;line-height:1}
.field input{flex:1;min-width:0;border:none!important;outline:none;background:transparent;padding:15px 0;font-size:15.5px;font-family:inherit;color:#0f1729}
/* champs hors wrapper (select, slug, tel des autres etapes) */
.auth-card input[type=text],.auth-card input[type=email],.auth-card input[type=password],.auth-card input[type=tel],.auth-card select{width:100%;min-width:0;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:14px;padding:15px 14px;font-size:15.5px;font-family:inherit;color:#0f1729;outline:none;transition:.16s;background:#fbfcfd}
.field input{border-radius:0!important}
.auth-card input:not(.field input):focus,.auth-card select:focus{border-color:#1fbf73;background:#fff;box-shadow:0 0 0 3.5px rgba(31,191,115,.13)}
.auth-card input.err{border-color:#dc2626}
.step-form{display:flex;flex-direction:column;gap:14px;margin-top:2px}
.auth-row{display:flex;gap:14px}
.auth-row label{flex:1;min-width:0}
/* en-tete des etapes */
.steps-head{display:flex;justify-content:space-between;align-items:center;margin-top:-2px}
.step-count{font-size:12px;font-weight:850;color:#0e7a48;background:#ecfdf3;border:1px solid #d7f4e4;border-radius:999px;padding:3px 9px}
.fe{color:#dc2626;font-size:12px;font-weight:600}
.hint{color:#94a0b4;font-size:12px;font-weight:600}
.pwd-bar{height:4px;border-radius:99px;background:#e7ebf2;overflow:hidden;margin-top:2px}
.pwd-bar i{display:block;height:100%;border-radius:99px;transition:.3s}
.auth-check{flex-direction:row!important;align-items:flex-start;gap:9px;font-weight:600;color:#3a4a63;font-size:13.5px}
.auth-check input{width:17px;height:17px;flex-shrink:0;margin-top:2px}
.auth-btn{width:100%;min-height:52px;margin-top:0;border:none;border-radius:14px;padding:14px 18px;font-size:15.5px;font-weight:850;letter-spacing:0;cursor:pointer;background:linear-gradient(135deg,#22c97b,#0e7a48);color:#fff;transition:.16s;text-decoration:none;text-align:center;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 14px 26px -14px rgba(14,122,72,.78)}
.auth-btn:hover{filter:brightness(1.04);transform:translateY(-1px)}
.auth-btn:active{transform:translateY(0)}
.auth-btn:disabled{opacity:.6;cursor:default}
.auth-btn.ghost{background:#fff;color:#0e7a48;border:1.5px solid #1fbf73}
.btn-row{display:flex;gap:10px}
.btn-row .auth-btn{flex:1;width:auto}
.btn-row .auth-btn.ghost{flex:0 0 auto;min-width:116px}
.auth-err{color:#dc2626;font-size:13.5px;background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:9px 12px}
.form-actions{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding-top:6px}
.form-actions .auth-alt{margin:0}
.auth-alt{text-align:center;font-size:14px;color:#6b7a90;line-height:1.35}
.auth-alt a{color:#0e7a48;font-weight:800;text-decoration:none}
/* steps */
.steps-bar{display:flex;gap:8px}
.steps-bar .seg{flex:1;height:5px;border-radius:99px;background:#e7ebf2;transition:.35s}
.steps-bar .seg.done{background:#1fbf73}
.step-label{font-size:13px;color:#94a0b4;font-weight:600;margin-bottom:2px}
/* type toggle */
.type-toggle{display:flex;gap:10px}
.type-btn{flex:1;padding:14px 10px;border:1px solid #d7deea;border-radius:12px;background:#fff;cursor:pointer;text-align:center;transition:.15s;font-family:inherit}
.type-btn .ico{font-size:22px;line-height:1}
.type-btn .tit{font-weight:700;font-size:13.5px;margin-top:5px;color:#0f1729}
.type-btn .des{font-size:11px;color:#94a0b4;margin-top:2px}
.type-btn.active{border-color:#1fbf73;background:#f0fbf5;box-shadow:0 0 0 1px #1fbf73}
/* slug */
.slug-row{display:flex;align-items:stretch;border:1px solid #d7deea;border-radius:11px;overflow:hidden}
.slug-row:focus-within{border-color:#1fbf73;box-shadow:0 0 0 3px rgba(31,191,115,.15)}
.slug-row input{border:none!important;box-shadow:none!important;border-radius:0!important;flex:1}
.slug-suffix{display:flex;align-items:center;padding:0 12px;background:#f4f7f5;color:#6b7a90;font-size:13px;white-space:nowrap;border-left:1px solid #e7ebf2}
/* plans */
.plan-list{display:flex;flex-direction:column;gap:9px}
.plan-opt{display:flex;align-items:center;gap:12px;border:1px solid #d7deea;border-radius:12px;padding:13px 14px;cursor:pointer;transition:.15s;flex-direction:row!important;font-weight:500!important}
.plan-opt:hover{border-color:#9fe3c2}
.plan-opt.sel{border-color:#1fbf73;background:#f0fbf5;box-shadow:0 0 0 1px #1fbf73}
.plan-opt input{width:17px;height:17px;flex-shrink:0;accent-color:#1fbf73}
.plan-main{flex:1;display:flex;flex-direction:column;gap:2px}
.plan-main b{font-size:14.5px;color:#0f1729;display:flex;align-items:center;gap:7px}
.plan-main small{color:#6b7a90;font-size:12px}
.pop{font-style:normal;font-size:10px;font-weight:800;background:#1fbf73;color:#fff;padding:2px 7px;border-radius:99px}
.plan-price{font-weight:850;font-size:15px;color:#0e2418;text-align:right;white-space:nowrap}
.plan-price em{display:block;font-style:normal;font-size:10.5px;color:#94a0b4;font-weight:600}
/* recap */
.recap{background:#f0fbf5;border:1px solid #d3f0e1;border-radius:11px;padding:13px 15px;font-size:13.5px;color:#3a4a63;line-height:1.7}
.recap-t{font-weight:800;color:#0e2418;margin-bottom:4px}
.recap-ok{margin-top:5px;color:#0e7a48;font-weight:700}
/* success */
.success-card{text-align:center;align-items:center}
.success-icon{font-size:48px;line-height:1}
.ws-url{background:#f0fbf5;border:1px solid #d3f0e1;border-radius:11px;padding:11px;font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#0e7a48;font-weight:700;word-break:break-all;width:100%}
.apps-preview{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;width:100%}
.app-chip{border:1px solid #e7ebf2;border-radius:11px;padding:11px 4px;text-align:center}
.app-chip .ico{font-size:21px;line-height:1}
.app-chip .nm{font-size:11px;font-weight:700;color:#6b7a90;margin-top:3px}
/* workspace */
.ws-app{display:flex;min-height:100vh;background:#f4faf6}
.ws-side{width:244px;background:#fff;border-right:1px solid #e7ebf2;padding:20px 12px}
.ws-brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;letter-spacing:0;color:#0e2418;padding:0 6px}
.ws-side-sub{font-size:11px;color:#94a0b4;font-weight:700;text-transform:uppercase;letter-spacing:0;padding:0 6px;margin:2px 0 18px}
.ws-nav{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;color:#3a4a63;cursor:pointer;margin-bottom:2px;font-size:14px;font-weight:600;transition:.12s}
.ws-nav:hover{background:#eef5f0;color:#0e2418}
.ws-nav.active{background:#f0fbf5;color:#0e7a48}
.ws-main{flex:1;padding:30px 34px}
.ws-banner{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#fffbeb;border:1px solid #fde68a;color:#b45309;border-radius:12px;padding:13px 16px;margin-bottom:24px;font-size:14px}
.btn-mini{background:#1fbf73;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:7px 13px;border-radius:9px;white-space:nowrap}
.ws-title{font-size:26px;font-weight:850;letter-spacing:0;color:#0f1729}
.ws-sub{color:#6b7a90;margin:4px 0 26px}
.ws-main h3{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0;color:#94a0b4;margin-bottom:12px}
.mod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.mod-card{background:#fff;border:1px solid #e7ebf2;border-radius:14px;padding:20px 12px;text-align:center;cursor:pointer;transition:.18s;text-decoration:none;display:block}
.mod-card:hover{border-color:#9fe3c2;transform:translateY(-3px);box-shadow:0 12px 24px -14px rgba(20,40,30,.3)}
.mod-card .ico{font-size:28px;line-height:1}
.mod-card .nm{font-weight:700;margin-top:7px;font-size:14px;color:#0f1729}
@media (max-width:600px){
  .auth-wrap{gap:16px;padding:24px 14px 32px}
  .auth-card{width:100%;padding:30px 20px 26px;border-radius:18px;gap:16px}
  .auth-card h1{font-size:26px}
  .auth-row{flex-direction:column;gap:12px}
  .btn-row{flex-direction:column-reverse}
  .btn-row .auth-btn,.btn-row .auth-btn.ghost{width:100%;min-width:0}
  .ws-side{width:62px;padding:14px 6px}
  .ws-brand span:not(.mark),.ws-side-sub,.ws-nav span{display:none}
  .ws-nav{justify-content:center}
  .ws-main{padding:18px}
  .apps-preview{grid-template-columns:repeat(2,1fr)}
}
</style>
