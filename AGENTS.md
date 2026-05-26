# AGENTS.md — 摸鱼工具箱 / Valorant 靶场训练

## 项目概述

基于 **Vue 3 + Three.js** 的网页 FPS 训练工具，复刻无畏契约靶场。

- **线上地址**：`npm run dev` → localhost:3000
- **生产构建**：`npm run build` → `dist/`
- **穿透分享**：用 `npm run preview` + ngrok/serveo（不要用 dev 模式穿透，WebSocket HMR 会卡）

## 技术栈

| 层级 | 技术 |
|------|------|
| UI 框架 | Vue 3 (SFC + script setup) |
| 构建 | Vite 6 + @vitejs/plugin-vue |
| 3D 引擎 | Three.js 0.170 |
| 样式 | Scoped CSS + 全局 CSS |
| 部署 | 纯静态文件，无后端 |

## 目录结构

```
valorant-range/
├── index.html              # Vue 挂载点 (空壳)
├── vite.config.js          # Vue 插件 + allowedHosts:true
├── src/
│   ├── main.js             # Vue 入口 (createApp)
│   ├── App.vue             # 根组件: menu ↔ game 切换
│   ├── global.css          # 全局 reset 样式
│   ├── components/
│   │   ├── MainMenu.vue        # 主菜单(模块选择)
│   │   ├── GameContainer.vue   # 游戏容器(动态加载 game.js)
│   │   ├── BossScreen.vue      # 仿 VSCode 老板键界面
│   │   ├── EscMenu.vue         # ESC 暂停菜单
│   │   ├── HudOverlay.vue      # HUD(击杀/命中率/计时)
│   │   ├── SensitivitySetup.vue# 首次灵敏度设置引导
│   │   └── game.js             # ★ 游戏引擎包装器(全部 DOM 在此创建)
│   ├── engine.js           # Three.js 渲染器/场景/相机/灯光
│   ├── environment.js      # 3D 靶场环境(地板/墙壁/平台/掩体)
│   ├── player.js           # 玩家控制(移动/跳跃/射击/后坐力/抖动)
│   ├── targets.js          # 靶子系统(人形模型/碰撞盒/HP/伤害)
│   ├── collision.js        # AABB 碰撞检测
│   ├── gamemodes.js        # 6 种游戏模式(消灭/计时/浮空/移动)
│   ├── sensitivity.js      # 灵敏度换算(Valorant/CS2/OW2 等)
│   ├── settings.js         # 设置面板(DPI/灵敏度/准星/画质)
│   ├── audio.js            # Web Audio 程序化音效
│   ├── weapon.js           # 武器模型(已废弃，空壳)
│   └── textures.js         # Canvas 纹理生成(木质/金属)
```

## 关键架构决策

### 双层渲染

游戏使用两个独立的渲染层：
1. **主场景**：Three.js 3D 世界（engine/player/targets/environment）
2. **武器层**：已废弃，目前无武器模型

### Vue ↔ 游戏引擎通信

- `GameContainer.vue` 通过动态 `import('./game.js')` 按需加载游戏
- `game.js` 中的 `ValorantRange` 类通过 `document.createElement` 创建所有游戏 UI DOM
- 游戏引擎文件（engine/player/targets 等）是纯 vanilla JS 模块，不依赖 Vue
- 游戏内 HUD 数据通过直接 DOM 操作更新（`getElementById`）

### Pointer Lock 流程

1. 主菜单点击"启动" → `GameContainer` 挂载 → 动态加载 game.js
2. 首次启动弹出灵敏度设置 → 确认后调用 `requestPointerLock()`
3. 老用户直接显示点击拦截层 → 点击后锁定鼠标
4. ESC 释放锁定 → 显示 ESC 菜单
5. ESC 菜单 → "返回主菜单" → 清理游戏 → 回到主菜单

## 游戏机制

### 灵敏度

- Valorant m_yaw = 0.055，`cm/360° = (360×2.54)/(DPI×sens×0.055)`
- Pointer Lock API 提供原始 mouse delta
- 支持 cm/360° 反向输入 + 多游戏转换（CS2/OW2 等）

### 弹道（Vandal 狂徒）

固定查表弹道，21 发预设 + 随机扩散：
```
0-6 发: 垂直爬升 0→0.68°, 轻微右偏
7-15发: S 形水平震荡 ±0.35°, 左右对称
16-21发: 二次震荡循环
22+发: 最后一发附近随机 ±0.50°x, ±0.10°y
```
射速 0.1026s/发 (9.75 RPS)，停火 0.35s 弹道归零。移动时额外随机扩散(>0.15 移动量触发)。

### 命中区与伤害

| 部位 | 碰撞盒 | 伤害 | 致死数 |
|------|--------|------|--------|
| 头部 | 球体 r=0.14 | 160 | 1 |
| 脖子 | 圆柱 r=0.08 h=0.1 | 60 | 3 |
| 身体 | 圆柱 r=0.18 h=0.55 | 40 | 4 |
| 腿部 | 圆柱 r=0.16 h=0.68 | 32 | 5 |
- 基础 HP: 150
- 射线碰撞检测使用自定义球体/圆柱体算法

### 游戏模式

| 模式 | 同时靶子数 | 刷新方式 |
|------|-----------|----------|
| elim50/elim100 | 1 | 击杀后清除并随机刷新 |
| timed30/timed60 | 5 | 定时补充 |
| flying | 2 | 定时补充 |
| strafe | 3 | 定时补充 |

### 菜单层级

```
主菜单 (MainMenu.vue)
  ├─ 🎯 FPS射击 → 启动游戏
  ├─ 📝 记事本 (disabled)
  └─ 📖 小说阅读 (disabled)
      ↓ 启动 FPS
ESC 菜单 (EscMenu.vue)
  ├─ 🎯 FPS射击(折叠) → 6 种模式
  ├─ 📐 设置(折叠) → 游戏转换/快速灵敏度/老板键
  ├─ ← 返回主菜单
  └─ 返回游戏
```

## 开发注意事项

### 不能做的事

- **不要在游戏引擎中直接操作 Vue 组件的 DOM**：游戏引擎通过 `document.getElementById` 操作自己创建的 DOM
- **不要用 `npm run dev` 做穿透**：HMR WebSocket 会在穿透后卡死
- **武器模型不要再尝试**：用户已明确放弃，weapon.js 保持空壳

### 性能注意事项

- `player.js` 的 `_updateMovement` 每帧创建新向量对象，如需优化可预分配
- `collision.js` 每帧进行 3 次全量 AABB 遍历（碰撞X+碰撞Z+地面检测）
- `targets.js` 已移除描边层和 hitFlash 遍历以优化帧率
- 弹壳系统有内存管理（life 到期自动清理）
- 所有 `new THREE.Vector3()` 建议替换为 `.set()` + 预分配

### 已知问题

- Edge 浏览器可能因触摸/笔输入导致 Pointer Lock 失败
- serveo.net 穿透存在 HTTPS 上下文问题，Pointer Lock 可能不工作
- 远距离(30m)头部命中判定因浮点精度可能偶尔失败（已通过放大碰撞盒缓解）
