<script setup>
defineProps({
  kills: Number, accuracy: Number, timer: String, sens: Number, cm360: Number,
  comboText: String, showCombo: Boolean, hitmarkerType: String,
  killfeed: Array,
});
</script>

<template>
  <div class="hud-root">
    <div class="hud-score">
      <span class="hud-val">{{ kills }}</span><span class="hud-lbl">击杀</span>
    </div>
    <div class="hud-acc">
      <span class="hud-val" :style="{ color: accuracy >= 80 ? '#0f0' : accuracy >= 50 ? '#ff0' : '#f00' }">{{ accuracy }}%</span>
      <span class="hud-lbl">命中率</span>
    </div>
    <div class="hud-time">
      <span class="hud-val">{{ timer }}</span><span class="hud-lbl">时间</span>
    </div>
    <div class="hud-sens">
      <div class="hud-sens-row"><span>{{ sens.toFixed(2) }}</span><span class="hud-lbl">灵敏度</span></div>
      <div class="hud-sens-row"><span>{{ cm360.toFixed(1) }}cm</span><span class="hud-lbl">/360°</span></div>
    </div>
    <div class="hud-combo" v-if="showCombo"><span>{{ comboText }}</span></div>
    <div class="hud-hit" :class="hitmarkerType" v-if="hitmarkerType"></div>
    <div class="hud-killfeed">
      <div v-for="(k, i) in killfeed" :key="i" class="kf-entry" :style="{ borderLeftColor: k.killed ? '#ff4655' : '#ffaa00' }">
        {{ k.type === 'head' ? '💀爆头' : k.type === 'neck' ? '🎯脖子' : k.type === 'legs' ? '🦵腿部' : '🔫身体' }} -{{ k.damage }} {{ k.dist }}m
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud-root { position: absolute; inset: 0; pointer-events: none; z-index: 10; color: #fff; font-family: 'Segoe UI', sans-serif; }
.hud-score { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); text-align: center; }
.hud-val { display: block; font-size: 2.8rem; font-weight: bold; }
.hud-lbl { display: block; font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 2px; }
.hud-score .hud-val { text-shadow: 0 0 10px rgba(255,70,85,0.5); }
.hud-acc { position: absolute; top: 20px; right: 20px; text-align: right; }
.hud-acc .hud-val { font-size: 1.3rem; }
.hud-time { position: absolute; top: 20px; left: 20px; }
.hud-time .hud-val { font-size: 1.3rem; }
.hud-sens { position: absolute; bottom: 110px; left: 20px; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 4px; border-left: 2px solid #ff4655; }
.hud-sens-row { display: flex; align-items: baseline; gap: 4px; font-size: 0.8rem; }
.hud-sens .hud-lbl { font-size: 0.6rem; }
.hud-combo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100px); font-size: 1.4rem; font-weight: bold; color: #ff4655; text-shadow: 0 0 20px rgba(255,70,85,0.8); }
.hud-hit { position: absolute; top: 50%; left: 50%; width: 20px; height: 20px; transform: translate(-50%, -50%); }
.hud-hit.kill::before, .hud-hit.kill::after { content: ''; position: absolute; background: #ff4655; top: 50%; left: 0; right: 0; height: 2px; }
.hud-hit.kill::before { transform: translateY(-50%) rotate(45deg); }
.hud-hit.kill::after { transform: translateY(-50%) rotate(-45deg); }
.hud-hit.hit::before, .hud-hit.hit::after { content: ''; position: absolute; background: #fff; top: 50%; left: 0; right: 0; height: 2px; }
.hud-hit.hit::before { transform: translateY(-50%) rotate(45deg); }
.hud-hit.hit::after { transform: translateY(-50%) rotate(-45deg); }
.hud-killfeed { position: absolute; top: 80px; right: 20px; display: flex; flex-direction: column; gap: 3px; }
.kf-entry { font-size: 0.78rem; background: rgba(0,0,0,0.6); padding: 3px 8px; border-radius: 2px; border-left: 3px solid; }
</style>
