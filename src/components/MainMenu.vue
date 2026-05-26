<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['launch']);

const modules = [
  { id: 'fps', icon: '🎯', name: 'FPS 射击', desc: '无畏契约靶场训练 · 灵敏度校准 · 弹道练习', enabled: true },
  { id: 'notes', icon: '📝', name: '记事本', desc: '伪装办公记事 · 即将上线', enabled: false },
  { id: 'reader', icon: '📖', name: '小说阅读', desc: '本地 TXT 阅读器 · 即将上线', enabled: false },
];

const selected = ref('fps');

const launchLabel = computed(() => {
  const m = modules.find(m => m.id === selected.value);
  return m ? `启动 ${m.name}` : '启动';
});

function select(id) {
  const m = modules.find(m => m.id === id);
  if (m?.enabled) selected.value = id;
}
</script>

<template>
  <div class="main-menu">
    <div class="menu-header">
      <h1>🔧 摸鱼工具箱</h1>
      <p>选择一个模块开始</p>
    </div>
    <div class="menu-modules">
      <div
        v-for="m in modules" :key="m.id"
        class="menu-module"
        :class="{ active: selected === m.id, disabled: !m.enabled }"
        @click="select(m.id)"
      >
        <div class="module-icon">{{ m.icon }}</div>
        <div class="module-name">{{ m.name }}</div>
        <div class="module-desc">{{ m.desc }}</div>
      </div>
    </div>
    <button class="menu-launch-btn" @click="emit('launch')">{{ launchLabel }}</button>
  </div>
</template>

<style scoped>
.main-menu {
  position: absolute; inset: 0; background: #0d0d12;
  display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 500; gap: 30px;
}
.menu-header { text-align: center; }
.menu-header h1 { font-size: 2rem; color: #ff4655; margin-bottom: 6px; }
.menu-header p { font-size: 0.85rem; color: #666; }
.menu-modules { display: flex; gap: 14px; }
.menu-module {
  width: 200px; padding: 24px 16px; background: #141418; border: 2px solid #2a2a2a;
  border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s;
}
.menu-module:hover:not(.disabled) { border-color: #ff4655; background: #1a1218; transform: translateY(-2px); }
.menu-module.active { border-color: #ff4655; background: #1f1418; }
.menu-module.disabled { opacity: 0.4; cursor: default; }
.module-icon { font-size: 2.2rem; margin-bottom: 10px; }
.module-name { font-size: 1rem; font-weight: bold; color: #ddd; margin-bottom: 6px; }
.module-desc { font-size: 0.7rem; color: #666; line-height: 1.4; }
.menu-launch-btn {
  padding: 12px 50px; background: #ff4655; border: none; border-radius: 6px;
  color: #fff; font-size: 1rem; font-weight: bold; cursor: pointer; letter-spacing: 1px;
}
.menu-launch-btn:hover { background: #e03d4a; }
</style>
