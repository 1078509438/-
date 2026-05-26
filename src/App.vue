<script setup>
import { ref, provide } from 'vue';
import MainMenu from './components/MainMenu.vue';
import GameContainer from './components/GameContainer.vue';

const currentView = ref('menu'); // 'menu' | 'game'
const bossActive = ref(false);
const bossEnabled = ref(true);

try {
  const s = localStorage.getItem('valorant-boss-key');
  if (s !== null) bossEnabled.value = s === 'true';
} catch {}

provide('bossEnabled', bossEnabled);
provide('bossActive', bossActive);

function launchGame() { currentView.value = 'game'; }
function backToMenu() { currentView.value = 'menu'; }
</script>

<template>
  <div id="app">
    <MainMenu v-if="currentView === 'menu'" @launch="launchGame" />
    <GameContainer v-else @back="backToMenu" />
  </div>
</template>

<style>
#app { width: 100%; height: 100%; position: relative; }
</style>
