<script setup>
// Routeur hash léger pour avelomi.com (pas de vue-router) :
//   #/apps  -> page « Toutes les applications »
//   sinon   -> landing produit.
// La langue (FR/EN) est partagée entre les deux vues.
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Landing from './Landing.vue';
import AllApps from './AllApps.vue';
import Auth from './Auth.vue';

const lang = ref('fr');
const route = ref(location.hash);

function onHash(){
  route.value = location.hash;
  window.scrollTo({ top: 0 });
}
onMounted(() => window.addEventListener('hashchange', onHash));
onUnmounted(() => window.removeEventListener('hashchange', onHash));

const isApps = computed(() => route.value.startsWith('#/apps'));
// Pages auth Avelomi (memes backend que l'ERP via /api).
const authView = computed(() => {
  if (route.value.startsWith('#/login')) return 'login';
  if (route.value.startsWith('#/signup')) return 'signup';
  if (route.value.startsWith('#/accueil')) return 'accueil';
  return null;
});
</script>

<template>
  <Auth v-if="authView" :lang="lang" :view="authView" />
  <AllApps v-else-if="isApps" :lang="lang" />
  <Landing v-else v-model:lang="lang" />
</template>
