<script setup>
import { ref } from 'vue';
import { Sensitivity, GAME_RATIOS, GAME_NAMES } from '../sensitivity.js';

const emit = defineEmits(['confirm']);
const dpi = ref(800);
const sens = ref(0.5);
const cm360 = ref(41.6);
const edpi = ref(400);
const convertGame = ref('');
const convertSens = ref(1.0);

function update() {
  const s = new Sensitivity(dpi.value, sens.value);
  cm360.value = s.cmPer360;
  edpi.value = s.edpi;
}

function fromCm360() {
  if (cm360.value > 0) {
    sens.value = Sensitivity.calcSensFromCm360(dpi.value, cm360.value);
    update();
  }
}

function doConvert() {
  if (!convertGame.value || convertSens.value <= 0) return;
  try {
    const r = Sensitivity.convertFromGame(convertGame.value, dpi.value, convertSens.value);
    sens.value = r.valorantSens; update();
  } catch {}
}

const games = Object.entries(GAME_RATIOS).map(([id]) => ({ id, name: GAME_NAMES[id] || id })).sort((a, b) => a.name.localeCompare(b.name, 'zh'));
</script>

<template>
  <div class="overlay">
    <div class="card">
      <div class="head"><h1>设置你的灵敏度</h1><p>输入你在无畏契约中的鼠标设置</p></div>
      <div class="body">
        <div class="row"><label>鼠标 DPI</label><input type="number" v-model.number="dpi" @input="update" /><span class="h">鼠标驱动中查看</span></div>
        <div class="row"><label>游戏内灵敏度</label><input type="number" v-model.number="sens" step="0.01" @input="update" /><span class="h">Valorant 设置 → 灵敏度</span></div>
        <div class="row alt"><label>或输入 cm/360°</label><input type="number" v-model.number="cm360" step="0.1" @input="fromCm360" /><span class="h">自动反算灵敏度</span></div>
        <div class="prev">
          <div class="pv"><span class="pv-v">{{ cm360.toFixed(1) }}</span><span class="pv-l">cm / 360°</span></div>
          <div class="pv-d"></div>
          <div class="pv"><span class="pv-v">{{ edpi }}</span><span class="pv-l">eDPI</span></div>
        </div>
        <div class="tips">
          <p>🔄 从其他游戏转过来？</p>
          <div class="conv">
            <select v-model="convertGame"><option value="">-- 原游戏 --</option><option v-for="g in games" :key="g.id" :value="g.id">{{ g.name }}</option></select>
            <input type="number" v-model.number="convertSens" placeholder="原灵敏度" step="0.01" />
            <button class="btn-xs" @click="doConvert">转换</button>
          </div>
        </div>
      </div>
      <button class="confirm" @click="emit('confirm')">确认并开始训练</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 300; }
.card { width: 440px; background: rgba(18,18,24,0.98); border: 2px solid #ff4655; border-radius: 8px; overflow: hidden; }
.head { padding: 24px 24px 16px; text-align: center; }
.head h1 { font-size: 1.5rem; color: #ff4655; }
.head p { font-size: 0.82rem; color: #888; margin-top: 4px; }
.body { padding: 0 24px; }
.row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.row label { width: 120px; font-size: 0.82rem; color: #aaa; text-align: right; }
.row input { width: 110px; padding: 7px 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 0.9rem; text-align: center; font-weight: bold; }
.row input:focus { border-color: #ff4655; outline: none; }
.h { font-size: 0.7rem; color: #555; }
.alt input { border-style: dashed; border-color: #555; }
.prev { display: flex; align-items: center; justify-content: center; padding: 12px; background: rgba(255,70,85,0.05); border-radius: 6px; margin: 8px 0 12px; }
.pv { display: flex; flex-direction: column; align-items: center; padding: 0 18px; }
.pv-v { font-size: 1.4rem; font-weight: bold; color: #ff4655; }
.pv-l { font-size: 0.65rem; color: #888; margin-top: 2px; }
.pv-d { width: 1px; height: 36px; background: #333; }
.tips { padding: 10px; background: rgba(255,70,85,0.04); border-radius: 4px; margin-bottom: 8px; }
.tips p { font-size: 0.78rem; color: #999; margin-bottom: 6px; }
.conv { display: flex; gap: 4px; }
.conv select, .conv input { padding: 4px; background: #1a1a1a; border: 1px solid #444; border-radius: 3px; color: #fff; font-size: 0.74rem; }
.conv select { flex: 1; }
.conv input { width: 70px; text-align: center; }
.btn-xs { padding: 4px 8px; background: #333; border: 1px solid #555; border-radius: 3px; color: #ccc; font-size: 0.72rem; cursor: pointer; }
.confirm { display: block; width: 100%; padding: 13px; background: #ff4655; border: none; color: #fff; font-size: 0.95rem; font-weight: bold; cursor: pointer; letter-spacing: 1px; }
.confirm:hover { background: #e03d4a; }
</style>
