<script setup>
// Pages Connexion / Inscription propres a Avelomi (servies par le site Vue).
// Tapent le MEME backend que l'ERP via le proxy /api (nginx -> middleware) :
//   POST /api/auth/login    { email, password }            -> { token, ... } | { requireMfa, mfaToken }
//   POST /api/auth/register { firstName,lastName,email,... } -> { token }
// Le token reste en memoire applicative (pas de localStorage — regle SCRUM-119).
// Vues pilotees par le hash : #/login, #/signup, #/accueil.
import { ref, computed } from 'vue';

const props = defineProps({
  lang: { type: String, default: 'fr' },
  view: { type: String, default: 'login' }, // 'login' | 'signup' | 'accueil'
});
const t = (fr, en) => (props.lang === 'en' ? en : fr);

const API = '/api';
let accessToken = null; // memoire applicative uniquement

const loading = ref(false);
const error = ref('');
const me = ref(null); // { firstName, email, role } apres connexion

// ── Connexion ──
const login = ref({ email: '', password: '' });
async function submitLogin() {
  error.value = '';
  if (!login.value.email || !login.value.password) {
    error.value = t('Email et mot de passe requis.', 'Email and password required.');
    return;
  }
  loading.value = true;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: login.value.email.trim().toLowerCase(), password: login.value.password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || t('Identifiants invalides.', 'Invalid credentials.'));
    if (data.requireMfa) {
      error.value = t('Authentification a deux facteurs requise — connectez-vous depuis l’application.',
                      'Two-factor authentication required — sign in from the app.');
      return;
    }
    accessToken = data.token || null;
    me.value = { firstName: data.firstName || data.name || login.value.email, email: login.value.email, role: data.role };
    location.hash = '#/accueil';
  } catch (e) {
    error.value = Array.isArray(e.message) ? e.message[0] : e.message;
  } finally {
    loading.value = false;
  }
}

// ── Inscription (SaaS : cree org + admin) ──
const reg = ref({ firstName: '', lastName: '', email: '', password: '', orgName: '', slug: '', sector: 'general', phone: '', acceptedTerms: false });
const slugAuto = computed(() => reg.value.orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
async function submitSignup() {
  error.value = '';
  const r = reg.value;
  if (!r.firstName || !r.lastName || !r.email || !r.password || !r.orgName) {
    error.value = t('Tous les champs marques sont requis.', 'All required fields must be filled.');
    return;
  }
  if (!r.acceptedTerms) {
    error.value = t('Veuillez accepter les conditions.', 'Please accept the terms.');
    return;
  }
  loading.value = true;
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        email: r.email.trim().toLowerCase(),
        password: r.password,
        accountType: 'org',
        orgName: r.orgName.trim(),
        slug: (r.slug || slugAuto.value).trim().toLowerCase(),
        sector: r.sector,
        phone: r.phone.trim() || undefined,
        acceptedTerms: r.acceptedTerms,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || t('Inscription impossible. Reessayez.', 'Sign-up failed. Try again.'));
    accessToken = data.token || null;
    me.value = { firstName: r.firstName.trim(), email: r.email.trim().toLowerCase(), org: r.orgName.trim() };
    location.hash = '#/accueil';
  } catch (e) {
    error.value = Array.isArray(e.message) ? e.message[0] : e.message;
  } finally {
    loading.value = false;
  }
}

function go(hash) { location.hash = hash; }
function logout() { accessToken = null; me.value = null; go('#/login'); }
</script>

<template>
  <div class="auth-wrap">
    <a class="auth-logo" href="#/" @click.prevent="go('#/')">
      <span class="mark"><svg viewBox="0 0 64 64" aria-label="Avelomi"><g transform="translate(32 32)"><rect x="-17.5" y="-17.5" width="14" height="14" rx="4.5" fill="#34d27e"/><rect x="3.5" y="-17.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="-17.5" y="3.5" width="14" height="14" rx="4.5" fill="#1fbf73"/><rect x="3.5" y="3.5" width="14" height="14" rx="4.5" fill="#0e7a48"/></g></svg></span> Avelomi
    </a>

    <!-- CONNEXION -->
    <form v-if="view === 'login'" class="auth-card" @submit.prevent="submitLogin">
      <h1>{{ t('Connexion', 'Sign in') }}</h1>
      <p class="auth-sub">{{ t('Accedez a votre espace Avelomi.', 'Access your Avelomi workspace.') }}</p>
      <label>{{ t('Email', 'Email') }}
        <input v-model="login.email" type="email" autocomplete="email" :placeholder="t('vous@entreprise.com','you@company.com')" />
      </label>
      <label>{{ t('Mot de passe', 'Password') }}
        <input v-model="login.password" type="password" autocomplete="current-password" placeholder="••••••••" />
      </label>
      <p v-if="error" class="auth-err">{{ error }}</p>
      <button class="auth-btn" :disabled="loading">{{ loading ? t('Connexion…','Signing in…') : t('Se connecter','Sign in') }}</button>
      <p class="auth-alt">{{ t('Pas encore de compte ?', 'No account yet?') }}
        <a href="#/signup" @click.prevent="go('#/signup')">{{ t('Commencer', 'Get started') }}</a>
      </p>
    </form>

    <!-- INSCRIPTION -->
    <form v-else-if="view === 'signup'" class="auth-card" @submit.prevent="submitSignup">
      <h1>{{ t('Commencer', 'Get started') }}</h1>
      <p class="auth-sub">{{ t('Creez votre entreprise sur Avelomi — gratuitement.', 'Create your company on Avelomi — for free.') }}</p>
      <div class="auth-row">
        <label>{{ t('Prenom','First name') }}<input v-model="reg.firstName" type="text" autocomplete="given-name" /></label>
        <label>{{ t('Nom','Last name') }}<input v-model="reg.lastName" type="text" autocomplete="family-name" /></label>
      </div>
      <label>{{ t('Email professionnel','Work email') }}<input v-model="reg.email" type="email" autocomplete="email" /></label>
      <label>{{ t('Mot de passe','Password') }}<input v-model="reg.password" type="password" autocomplete="new-password" /></label>
      <label>{{ t('Nom de l’entreprise','Company name') }}<input v-model="reg.orgName" type="text" /></label>
      <label>{{ t('Telephone (optionnel)','Phone (optional)') }}<input v-model="reg.phone" type="tel" placeholder="+243…" /></label>
      <label class="auth-check"><input v-model="reg.acceptedTerms" type="checkbox" />
        <span>{{ t('J’accepte les conditions d’utilisation.', 'I accept the terms of service.') }}</span>
      </label>
      <p v-if="error" class="auth-err">{{ error }}</p>
      <button class="auth-btn" :disabled="loading">{{ loading ? t('Creation…','Creating…') : t('Creer mon entreprise','Create my company') }}</button>
      <p class="auth-alt">{{ t('Deja un compte ?', 'Already have an account?') }}
        <a href="#/login" @click.prevent="go('#/login')">{{ t('Se connecter', 'Sign in') }}</a>
      </p>
    </form>

    <!-- ACCUEIL CONNECTE -->
    <div v-else class="auth-card" style="text-align:center">
      <h1>{{ t('Bienvenue', 'Welcome') }}<span v-if="me?.firstName">, {{ me.firstName }}</span> 👋</h1>
      <p class="auth-sub" v-if="me">
        {{ t('Vous etes connecte', 'You are signed in') }}<span v-if="me.org"> — {{ me.org }}</span>.
      </p>
      <p class="auth-sub" v-else>{{ t('Session non trouvee. Reconnectez-vous.', 'No session found. Please sign in again.') }}</p>
      <div class="auth-apps">
        <a href="#/apps" @click.prevent="go('#/apps')" class="auth-btn ghost">{{ t('Voir mes applications', 'View my apps') }}</a>
        <button class="auth-btn ghost" @click="logout">{{ t('Se deconnecter', 'Sign out') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:32px 18px;background:linear-gradient(180deg,#f4faf6,#eef5f0)}
.auth-logo{display:inline-flex;align-items:center;gap:9px;font-weight:850;font-size:22px;letter-spacing:-.5px;color:#0e2418;text-decoration:none}
.auth-logo .mark{width:30px;height:30px;display:inline-grid;place-items:center}
.auth-logo .mark svg{width:30px;height:30px}
.auth-card{width:min(420px,94vw);background:#fff;border:1px solid #e7ebf2;border-radius:20px;padding:30px 28px;box-shadow:0 30px 60px -34px rgba(20,40,30,.4);display:flex;flex-direction:column;gap:13px}
.auth-card h1{font-size:25px;letter-spacing:-.7px;font-weight:850;color:#0f1729}
.auth-sub{color:#6b7a90;font-size:14.5px;margin-top:-6px;margin-bottom:6px}
.auth-card label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:#3a4a63}
.auth-card input[type=text],.auth-card input[type=email],.auth-card input[type=password],.auth-card input[type=tel]{border:1px solid #d7deea;border-radius:11px;padding:11px 13px;font-size:15px;font-family:inherit;color:#0f1729;outline:none;transition:.15s}
.auth-card input:focus{border-color:#1fbf73;box-shadow:0 0 0 3px rgba(31,191,115,.15)}
.auth-row{display:flex;gap:12px}
.auth-row label{flex:1}
.auth-check{flex-direction:row!important;align-items:center;gap:9px;font-weight:600;color:#3a4a63}
.auth-check input{width:17px;height:17px;flex-shrink:0}
.auth-btn{margin-top:4px;border:none;border-radius:12px;padding:13px 18px;font-size:15.5px;font-weight:800;letter-spacing:-.2px;cursor:pointer;background:linear-gradient(135deg,#1fbf73,#0e7a48);color:#fff;transition:.15s}
.auth-btn:hover{filter:brightness(1.05)}
.auth-btn:disabled{opacity:.6;cursor:default}
.auth-btn.ghost{background:#fff;color:#0e7a48;border:1.5px solid #1fbf73}
.auth-err{color:#dc2626;font-size:13.5px;background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:9px 12px;margin:2px 0}
.auth-alt{text-align:center;font-size:14px;color:#6b7a90;margin-top:8px}
.auth-alt a{color:#0e7a48;font-weight:800;text-decoration:none}
.auth-apps{display:flex;flex-direction:column;gap:11px;margin-top:14px}
</style>
