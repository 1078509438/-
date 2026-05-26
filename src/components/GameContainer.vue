<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import BossScreen from './BossScreen.vue';

const emit = defineEmits(['back']);
const showBoss = ref(false);
let bossEnabled = true;
try { const s = localStorage.getItem('valorant-boss-key'); if (s !== null) bossEnabled = s === 'true'; } catch {}

let gameModule = null;

onMounted(async () => {
  const { ValorantRange } = await import('./game.js');
  gameModule = new ValorantRange(() => emit('back'));
});

function onBossKey(e) {
  if (!bossEnabled || !gameModule) return;
  if (e.key === 'F8' || e.key === 'F1') {
    e.preventDefault();
    showBoss.value = !showBoss.value;
    gameModule.toggleBoss(showBoss.value);
  }
}

onMounted(() => window.addEventListener('keydown', onBossKey));
onUnmounted(() => window.removeEventListener('keydown', onBossKey));
</script>

<template>
  <div class="game-root">
    <canvas id="game-canvas"></canvas>
    <BossScreen v-if="showBoss" />
  </div>
</template>

<style scoped>
.game-root { position: absolute; inset: 0; }
#game-canvas { display: block; width: 100%; height: 100%; }
</style>
