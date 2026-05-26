<script setup>
import { ref, computed } from 'vue';
import { GAME_RATIOS, GAME_NAMES, Sensitivity } from '../sensitivity.js';

const props = defineProps({ sensInfo: String });
const emit = defineEmits(['startMode', 'backMenu', 'resume']);

const catFPS = ref(true);
const catSettings = ref(false);

const gameSens = ref(1.0);
const gameSelect = ref('');
const convertResult = ref('');
const convertedSens = ref(null);
const quickSens = ref(0.50);
const bossOn = ref(true);

try { const s = localStorage.getItem('valorant-boss-key'); if (s !== null) bossOn.value = s === 'true'; } catch {}

const games = computed(() =>
  Object.entries(GAME_RATIOS).map(([id, ratio]) => ({
    id, name: GAME_NAMES[id] || id, ratio,
  })).sort((a, b) => a.name.localeCompare(b.name, 'zh'))
);

function doConvert() {
  if (!gameSelect.value || !gameSens.value || gameSens.value <= 0) { convertResult.value = ''; return; }
  try {
    const r = Sensitivity.convertFromGame(gameSelect.value, 800, gameSens.value);
    convertedSens.value = r.valorantSens;
    convertResult.value = `Valorant: ${r.valorantSens.toFixed(3)} | cm/360°: ${r.cm360.toFixed(1)}cm`;
  } catch { convertResult.value = ''; }
}

function applyConverted() {
  if (convertedSens.value === null) return;
  // 通知父组件（GameContainer）更新灵敏度
  quickSens.value = convertedSens.value;
  convertResult.value = '✓ 已应用';
}

function modes() {
  return [
    { id: 'elim50', icon: '50', name: '消灭 50' },
    { id: 'elim100', icon: '100', name: '消灭 100' },
    { id: 'timed30', icon: '30s', name: '计时 30秒' },
    { id: 'timed60', icon: '60s', name: '计时 60秒' },
    { id: 'flying', icon: '✈', name: '浮空靶' },
    { id: 'strafe', icon: '↔', name: '移动靶' },
  ];
}

function toggleBoss() {
  bossOn.value = !bossOn.value;
  try { localStorage.setItem('valorant-boss-key', String(bossOn.value)); } catch {}
}
</script>

<template>
  <div class="esc-overlay" @click.self="emit('resume')">
    <div class="esc-panel">
      <div class="esc-header">
        <h1>VALORANT 靶场训练</h1>
        <p>{{ sensInfo }}</p>
      </div>

      <!-- FPS射击 -->
      <div class="esc-section">
        <div class="esc-cat" :class="{ active: catFPS }" @click="catFPS = !catFPS">
          <h3>🎯 FPS射击</h3><span class="esc-arrow">▼</span>
        </div>
        <div v-show="catFPS" class="esc-cat-body">
          <div class="mode-grid">
            <button v-for="m in modes()" :key="m.id" class="mode-btn" @click="emit('startMode', m.id)">
              <span class="mode-icon">{{ m.icon }}</span>
              <span class="mode-name">{{ m.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 设置 -->
      <div class="esc-section">
        <div class="esc-cat" :class="{ active: catSettings }" @click="catSettings = !catSettings">
          <h3>📐 设置</h3><span class="esc-arrow">▶</span>
        </div>
        <div v-show="catSettings" class="esc-cat-body">
          <div class="sub-section">
            <div class="sub-label">游戏转换</div>
            <div class="conv-row">
              <select v-model="gameSelect" @change="doConvert">
                <option value="">-- 选择原游戏 --</option>
                <option v-for="g in games" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
              <input type="number" v-model="gameSens" placeholder="灵敏度" step="0.01" @input="doConvert" />
              <button class="btn-xs" @click="doConvert">转换</button>
            </div>
            <div class="conv-result" v-if="convertResult">{{ convertResult }}</div>
            <button v-if="convertedSens !== null" class="btn-sm" @click="applyConverted">应用</button>
          </div>
          <div class="sub-section">
            <div class="sub-label">快速调整</div>
            <div class="sens-row">
              <button class="sens-btn" @click="quickSens = Math.max(0.01, +(quickSens - 0.05).toFixed(2))">-0.05</button>
              <button class="sens-btn" @click="quickSens = Math.max(0.01, +(quickSens - 0.01).toFixed(2))">-0.01</button>
              <span class="sens-val">{{ quickSens.toFixed(2) }}</span>
              <button class="sens-btn" @click="quickSens = Math.min(10, +(quickSens + 0.01).toFixed(2))">+0.01</button>
              <button class="sens-btn" @click="quickSens = Math.min(10, +(quickSens + 0.05).toFixed(2))">+0.05</button>
            </div>
          </div>
          <div class="sub-section">
            <div class="sub-label">🕶 老板键</div>
            <div class="boss-row">
              <label class="toggle-label" @click="toggleBoss">
                <span class="toggle-track" :class="{ on: bossOn }"><span class="toggle-thumb"></span></span>
                {{ bossOn ? '已启用' : '已禁用' }}
              </label>
              <span class="boss-hint">按 <kbd>F8</kbd> 切换</span>
            </div>
          </div>
        </div>
      </div>

      <button class="back-btn" @click="emit('backMenu')">← 返回主菜单</button>
      <button class="resume-btn" @click="emit('resume')">返回游戏</button>
    </div>
  </div>
</template>

<style scoped>
.esc-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 150; pointer-events: all; }
.esc-panel { width: 500px; max-height: 85vh; background: rgba(15,15,20,0.97); border: 2px solid #ff4655; border-radius: 8px; padding: 20px 24px; overflow-y: auto; }
.esc-header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #222; }
.esc-header h1 { font-size: 1.4rem; color: #ff4655; }
.esc-header p { font-size: 0.78rem; color: #888; margin-top: 4px; }
.esc-section { margin-bottom: 10px; }
.esc-cat { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 5px; cursor: pointer; transition: all 0.15s; }
.esc-cat:hover { border-color: #ff4655; background: #221a1a; }
.esc-cat.active { border-color: #ff4655; background: #1f1a1a; border-radius: 5px 5px 0 0; }
.esc-cat h3 { font-size: 0.9rem; color: #ddd; margin: 0; }
.esc-arrow { font-size: 0.7rem; color: #888; }
.esc-cat-body { border: 1px solid #333; border-top: none; border-radius: 0 0 5px 5px; padding: 10px; background: #141414; }
.mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.mode-btn { display: flex; flex-direction: column; align-items: center; padding: 10px 6px; background: #1a1a1a; border: 1px solid #333; border-radius: 6px; color: #ccc; cursor: pointer; }
.mode-btn:hover { background: #2a1a1a; border-color: #ff4655; color: #fff; }
.mode-icon { font-size: 1.1rem; font-weight: bold; }
.mode-name { font-size: 0.7rem; }
.sub-section { margin-bottom: 12px; }
.sub-label { font-size: 0.72rem; color: #888; margin-bottom: 6px; text-transform: uppercase; }
.conv-row { display: flex; gap: 4px; }
.conv-row select, .conv-row input { padding: 4px 6px; background: #1a1a1a; border: 1px solid #444; border-radius: 3px; color: #fff; font-size: 0.75rem; }
.conv-row select { flex: 1; }
.conv-row input { width: 70px; text-align: center; }
.btn-xs { padding: 4px 8px; background: #333; border: 1px solid #555; border-radius: 3px; color: #ccc; font-size: 0.7rem; cursor: pointer; }
.btn-xs:hover { background: #444; }
.btn-sm { display: block; width: 100%; margin-top: 6px; padding: 5px; background: #333; border: 1px solid #555; border-radius: 3px; color: #ccc; font-size: 0.75rem; cursor: pointer; }
.btn-sm:hover { background: #444; }
.conv-result { font-size: 0.75rem; color: #aaa; margin-top: 4px; }
.sens-row { display: flex; align-items: center; justify-content: center; gap: 4px; }
.sens-btn { padding: 3px 7px; background: #1a1a1a; border: 1px solid #444; border-radius: 3px; color: #ccc; font-size: 0.72rem; cursor: pointer; }
.sens-btn:hover { background: #2a2a2a; border-color: #ff4655; }
.sens-val { display: inline-block; min-width: 45px; font-size: 0.95rem; font-weight: bold; color: #fff; text-align: center; }
.boss-row { display: flex; justify-content: space-between; align-items: center; }
.toggle-label { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #ccc; cursor: pointer; }
.toggle-track { width: 34px; height: 18px; background: #333; border-radius: 9px; position: relative; display: inline-block; transition: background 0.2s; }
.toggle-track.on { background: #ff4655; }
.toggle-thumb { position: absolute; width: 14px; height: 14px; top: 2px; left: 2px; background: #888; border-radius: 50%; transition: all 0.2s; }
.toggle-track.on .toggle-thumb { left: 18px; background: #fff; }
.boss-hint { font-size: 0.7rem; color: #666; }
.boss-hint kbd { background: #222; border: 1px solid #444; border-radius: 2px; padding: 1px 4px; font-size: 0.65rem; color: #ff4655; }
.back-btn { display: block; width: 100%; padding: 8px; background: #1a1a1a; border: 1px solid #333; border-radius: 4px; color: #999; font-size: 0.82rem; cursor: pointer; margin-bottom: 6px; margin-top: 10px; }
.back-btn:hover { background: #2a2a2a; color: #fff; }
.resume-btn { display: block; width: 100%; padding: 12px; background: #ff4655; border: none; border-radius: 4px; color: #fff; font-size: 0.9rem; font-weight: bold; cursor: pointer; }
.resume-btn:hover { background: #e03d4a; }
</style>
