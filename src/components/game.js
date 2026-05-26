import { Engine } from '../engine.js';
import { Environment } from '../environment.js';
import { TargetManager } from '../targets.js';
import { Player } from '../player.js';
import { GameModeManager } from '../gamemodes.js';
import { AudioManager } from '../audio.js';
import { Settings } from '../settings.js';
import { Sensitivity } from '../sensitivity.js';
import { WeaponModel } from '../weapon.js';
import { CollisionManager } from '../collision.js';
import * as THREE from 'three';

function drawCrosshair(color, size, gap, thickness) {
  const c = document.getElementById('crosshair'); if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color; ctx.lineWidth = thickness;
  ctx.shadowColor = color; ctx.shadowBlur = 4;
  const cx = c.width / 2, cy = c.height / 2, g = gap / 2;
  ctx.beginPath(); ctx.moveTo(cx, cy - g); ctx.lineTo(cx, cy - g - size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + g); ctx.lineTo(cx, cy + g + size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - g, cy); ctx.lineTo(cx - g - size, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + g, cy); ctx.lineTo(cx + g + size, cy); ctx.stroke();
  ctx.fillStyle = color; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(cx, cy, thickness * 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function loadOldStyle() {
  if (document.getElementById('old-style')) return;
  const style = document.createElement('style');
  style.id = 'old-style';
  style.textContent = `
    #blocker{position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:100;cursor:pointer;}
    #instructions{text-align:center;color:#fff;padding:40px;border:2px solid #ff4655;background:rgba(20,20,20,0.9);border-radius:4px;}
    #instructions h1{font-size:2rem;color:#ff4655;margin-bottom:20px;}
    #instructions p{font-size:1rem;color:#ccc;margin:10px 0;}
    #instructions kbd{background:#333;border:1px solid #555;border-radius:3px;padding:2px 8px;}
    #blocker-sens-info{color:#ff4655;font-weight:bold;margin-top:20px;display:block;}
    #esc-menu{position:absolute;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:150;}
    .esc-panel{width:500px;max-height:85vh;background:rgba(15,15,20,0.97);border:2px solid #ff4655;border-radius:8px;padding:20px 24px;overflow-y:auto;pointer-events:all;}
    .esc-hdr{text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #222;}
    .esc-hdr h1{font-size:1.4rem;color:#ff4655;}
    .esc-sec{margin-bottom:10px;}
    .esc-cat{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#1a1a1a;border:1px solid #333;border-radius:5px;cursor:pointer;}
    .esc-cat.act{border-color:#ff4655;background:#1f1a1a;border-radius:5px 5px 0 0;}
    .esc-cat:hover:not(.act){border-color:#555;background:#222;}
    .esc-cat h3{font-size:0.9rem;color:#ddd;margin:0;}
    .esc-cat-body{border:1px solid #333;border-top:none;border-radius:0 0 5px 5px;padding:10px;background:#141414;}
    .esc-modes{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;}
    .esc-modes button{display:flex;flex-direction:column;align-items:center;padding:10px 6px;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#ccc;cursor:pointer;}
    .esc-modes button:hover{background:#2a1a1a;border-color:#ff4655;color:#fff;}
    .esc-modes .mi{font-size:1.2rem;font-weight:bold;}
    .esc-modes .mn{font-size:0.7rem;}
    .esc-sub{padding:8px 0;}
    .esc-sl{font-size:0.72rem;color:#888;margin-bottom:4px;text-transform:uppercase;}
    .esc-cr{display:flex;gap:4px;margin-bottom:6px;}
    .esc-cr select,.esc-cr input{padding:4px 6px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#fff;font-size:0.75rem;}
    .esc-cr select{flex:1}
    .esc-cr input{width:70px;text-align:center}
    .esc-cv{font-size:0.75rem;color:#aaa;margin:4px 0;}
    .esc-sr{display:flex;align-items:center;justify-content:center;gap:4px;}
    .esc-sr button{padding:4px 8px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#ccc;font-size:0.75rem;cursor:pointer;}
    .esc-sr button:hover{border-color:#ff4655;color:#fff;}
    .esc-sr .sv{min-width:50px;text-align:center;font-size:0.95rem;font-weight:bold;color:#fff;}
    .esc-sm{font-size:0.72rem;color:#666;margin-top:4px;text-align:center;}
    .esc-br{display:flex;justify-content:space-between;align-items:center;}
    .esc-bk{display:block;width:100%;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:4px;color:#999;font-size:0.85rem;cursor:pointer;margin:10px 0 6px;}
    .esc-bk:hover{background:#2a2a2a;color:#fff;}
    .esc-rs{display:block;width:100%;padding:12px;background:#ff4655;border:none;border-radius:4px;color:#fff;font-size:0.95rem;font-weight:bold;cursor:pointer;}
    .esc-rs:hover{background:#e03d4a;}
    .hud{position:absolute;inset:0;pointer-events:none;z-index:10;font-family:'Segoe UI',sans-serif;}
    .hud-score{position:absolute;top:20px;left:50%;transform:translateX(-50%);text-align:center;}
    .hud-score .v{display:block;font-size:3rem;font-weight:bold;color:#fff;text-shadow:0 0 10px rgba(255,70,85,0.5);}
    .hud .lbl{display:block;font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:2px;}
    .hud-acc{position:absolute;top:20px;right:20px;text-align:right;}
    .hud-acc .v{display:block;font-size:1.3rem;font-weight:bold;color:#0f0;}
    .hud-time{position:absolute;top:20px;left:20px;}
    .hud-time .v{display:block;font-size:1.3rem;font-weight:bold;color:#fff;}
    .hud-sens{position:absolute;bottom:110px;left:20px;background:rgba(0,0,0,0.5);padding:6px 12px;border-radius:4px;border-left:2px solid #ff4655;}
    .hud-sens .sr{display:flex;align-items:baseline;gap:4px;font-size:0.85rem;color:#fff;}
    .hud-kf{position:absolute;top:80px;right:20px;display:flex;flex-direction:column;gap:3px;}
    .hud-kf .ke{font-size:0.78rem;color:#fff;background:rgba(0,0,0,0.6);padding:3px 8px;border-radius:2px;border-left:3px solid #ff4655;}
    #crosshair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:5;}
    #settings-panel{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:480px;max-height:85vh;background:rgba(15,15,15,0.97);border:1px solid #333;border-radius:6px;color:#ddd;z-index:200;overflow-y:auto;pointer-events:all;}
    .settings-hdr{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #333;}
    .settings-hdr h2{font-size:1.1rem;color:#ff4655;}
    .settings-sc{padding:16px;}
    .sg{margin-bottom:16px;}
    .sg h3{font-size:0.85rem;color:#ff4655;margin-bottom:10px;border-bottom:1px solid #222;padding-bottom:4px;}
    .sr{display:flex;justify-content:space-between;align-items:center;margin:6px 0;}
    .sr label{font-size:0.82rem;color:#aaa;}
    .sr input[type=number],.sr input[type=text]{width:120px;padding:5px 6px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#fff;font-size:0.8rem;text-align:center;}
    .sr input[readonly]{background:#111;color:#666;}
    .sr select{width:120px;padding:5px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#fff;font-size:0.8rem;}
    .sr input[type=range]{width:120px;accent-color:#ff4655;}
    .sr input[type=color]{width:40px;height:28px;border:1px solid #444;border-radius:3px;}
    #apply-settings{display:block;width:calc(100%-32px);margin:0 16px 16px;padding:10px;background:#ff4655;border:none;border-radius:3px;color:#fff;font-size:0.9rem;cursor:pointer;font-weight:bold;}
    #open-settings{position:absolute;top:15px;right:15px;width:40px;height:40px;background:rgba(0,0,0,0.5);border:1px solid #444;border-radius:4px;color:#888;font-size:1.2rem;cursor:pointer;z-index:50;pointer-events:all;}
    #open-settings:hover{color:#fff;border-color:#ff4655;}
    #sens-setup-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:300;}
    #sens-setup{width:440px;max-height:90vh;overflow-y:auto;}
    .hidden{display:none!important;}
  `;
  document.head.appendChild(style);
}

// 构建所有 DOM 元素
function buildGameDOM(container) {
  loadOldStyle();

  // Blocker
  const blocker = document.createElement('div'); blocker.id = 'blocker';
  blocker.innerHTML = `<div id="instructions"><h1>VALORANT 靶场训练</h1><p id="blocker-action">点击开始，鼠标将被锁定到窗口</p><p>按 <kbd>ESC</kbd> 打开菜单 · <kbd>[ ]</kbd> 调灵敏度</p><p style="color:#ff4655;margin-top:20px;">当前: <span id="blocker-sens-info">800 DPI / 0.50 sens / 41.6cm</span></p></div>`;
  container.appendChild(blocker);

  // ESC Menu
  const esc = document.createElement('div'); esc.id = 'esc-menu'; esc.className = 'hidden';
  esc.innerHTML = `
    <div class="esc-panel">
      <div class="esc-hdr"><h1>VALORANT 靶场训练</h1><p id="esc-sens-info">800 DPI | 0.50 sens | 41.6 cm/360°</p></div>
      <div class="esc-sec"><div class="esc-cat act" id="esc-cat-fps"><h3>🎯 FPS射击</h3></div>
        <div class="esc-cat-body" id="esc-body-fps"><div class="esc-modes" id="esc-modes"></div></div>
      </div>
      <div class="esc-sec"><div class="esc-cat" id="esc-cat-set"><h3>📐 设置</h3></div>
        <div class="esc-cat-body hidden" id="esc-body-set">
          <div class="esc-sub"><div class="esc-sl">游戏转换</div><div class="esc-cr"><select id="esc-game-select"><option value="">-- 选择原游戏 --</option></select><input type="number" id="esc-game-sens" placeholder="灵敏度" step="0.01"><button class="esc-sr-btn" id="esc-convert-btn" style="padding:4px 8px;background:#333;border:1px solid #555;border-radius:3px;color:#ccc;font-size:0.7rem;cursor:pointer;">转换</button></div><div id="esc-convert-result" class="esc-cv"></div><button id="esc-apply-converted" class="hidden" style="display:block;width:100%;padding:5px;background:#333;border:1px solid #555;border-radius:3px;color:#ccc;font-size:0.75rem;cursor:pointer;margin-top:4px;">应用</button></div>
          <div class="esc-sub"><div class="esc-sl">快速调整</div><div class="esc-sr"><button class="esc-sens-btn" data-delta="-0.05">-0.05</button><button class="esc-sens-btn" data-delta="-0.01">-0.01</button><span class="sv" id="esc-sens-val">0.50</span><button class="esc-sens-btn" data-delta="0.01">+0.01</button><button class="esc-sens-btn" data-delta="0.05">+0.05</button></div><div class="esc-sm" id="esc-sens-cm360">= 41.6 cm/360°</div></div>
          <div class="esc-sub"><div class="esc-sl">🕶 老板键</div><div class="esc-br"><label class="toggle-label" style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#ccc;cursor:pointer;"><input type="checkbox" id="boss-key-toggle" checked style="display:none;"><span class="tog" style="width:34px;height:18px;background:#ff4655;border-radius:9px;display:inline-block;position:relative;" id="boss-tog-track"><span style="position:absolute;width:14px;height:14px;top:2px;right:2px;background:#fff;border-radius:50%;" id="boss-tog-thumb"></span></span> 启用</label><span style="font-size:0.7rem;color:#666;">按 <kbd style="background:#222;border:1px solid #444;border-radius:2px;padding:1px 4px;color:#ff4655;">F8</kbd></span></div></div>
        </div>
      </div>
      <button class="esc-bk" id="esc-back-menu">← 返回主菜单</button>
      <button class="esc-rs" id="esc-resume">返回游戏</button>
    </div>`;
  container.appendChild(esc);

  // HUD
  const hud = document.createElement('div'); hud.id = 'hud'; hud.className = 'hidden';
  hud.innerHTML = `
    <div class="hud-score"><span class="v" id="score">0</span><span class="lbl">击杀</span></div>
    <div class="hud-acc"><span class="v" id="accuracy">100%</span><span class="lbl">命中率</span></div>
    <div class="hud-time"><span class="v" id="timer">00:00</span><span class="lbl">时间</span></div>
    <div class="hud-sens"><div class="sr"><span id="sens-hud-val">0.50</span><span class="lbl">灵敏度</span></div><div class="sr"><span id="sens-hud-cm">41.6cm</span><span class="lbl">/360°</span></div></div>
    <div class="hud-kf" id="killfeed"></div>`;
  container.appendChild(hud);

  // Settings Panel
  const sp = document.createElement('div'); sp.id = 'settings-panel'; sp.className = 'hidden';
  sp.innerHTML = `
    <div class="settings-hdr"><h2>设置</h2><button id="close-settings" style="background:none;border:none;color:#888;font-size:1.5rem;cursor:pointer;">×</button></div>
    <div class="settings-sc">
      <div class="sg"><h3>鼠标灵敏度</h3>
        <div class="sr"><label>鼠标 DPI</label><input type="number" id="dpi-input" value="800" min="100" max="32000" step="50"></div>
        <div class="sr"><label>游戏内灵敏度</label><input type="number" id="sens-input" value="0.5" min="0.01" max="10" step="0.01"></div>
        <div class="sr"><label>cm/360°</label><input type="number" id="cm360-input" value="41.56" min="1" max="200" step="0.01"><span style="font-size:0.7rem;color:#555;margin-left:4px;">可反向计算</span></div>
        <div class="sr"><label>快速预设</label><div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="sens-preset" data-dpi="400" data-sens="0.5" style="padding:3px 8px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#aaa;font-size:0.7rem;cursor:pointer;">400×0.5</button>
          <button class="sens-preset" data-dpi="800" data-sens="0.35" style="padding:3px 8px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#aaa;font-size:0.7rem;cursor:pointer;">800×0.35</button>
          <button class="sens-preset" data-dpi="800" data-sens="0.5" style="padding:3px 8px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#aaa;font-size:0.7rem;cursor:pointer;">800×0.5</button>
          <button class="sens-preset" data-dpi="1600" data-sens="0.2" style="padding:3px 8px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#aaa;font-size:0.7rem;cursor:pointer;">1600×0.2</button>
        </div></div>
        <div class="sr"><label>cm/360° <small>(计算)</small></label><input type="text" id="cm360-display" value="41.56" readonly></div>
        <div class="sr"><label>eDPI</label><input type="text" id="edpi-display" value="400" readonly></div>
      </div>
      <div class="sg"><h3>从其他游戏转换</h3><p style="font-size:0.75rem;color:#666;">选择你常玩的游戏并输入灵敏度</p>
        <div id="quick-games" style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0;"></div>
        <div class="sr"><label>或选择游戏</label><select id="game-select"><option value="">-- 选择游戏 --</option></select></div>
        <div class="sr"><label>原游戏灵敏度</label><input type="number" id="game-sens-input" value="1.0" min="0.01" max="100" step="0.01"></div>
        <div id="convert-result" style="font-size:0.78rem;color:#aaa;text-align:right;padding:4px 0;"></div>
        <button id="apply-converted" style="display:block;width:100%;padding:6px;background:#333;border:1px solid #555;border-radius:3px;color:#ccc;font-size:0.8rem;cursor:pointer;">应用转换结果</button>
      </div>
      <div class="sg"><h3>画面设置</h3>
        <div class="sr"><label>水平视野(FOV)</label><input type="number" id="fov-input" value="103" min="60" max="120" step="1"></div>
        <div class="sr"><label>画面质量</label><select id="quality-select"><option value="low">低</option><option value="medium" selected>中</option><option value="high">高</option></select></div>
      </div>
      <div class="sg"><h3>准星设置</h3>
        <div class="sr"><label>准星颜色</label><input type="color" id="crosshair-color" value="#00ff00"></div>
        <div class="sr"><label>准星大小</label><input type="range" id="crosshair-size" value="4" min="1" max="20" step="1"></div>
        <div class="sr"><label>准星间隙</label><input type="range" id="crosshair-gap" value="8" min="0" max="30" step="1"></div>
        <div class="sr"><label>准星粗细</label><input type="range" id="crosshair-thickness" value="2" min="1" max="10" step="1"></div>
      </div>
    </div>
    <button id="apply-settings">应用设置</button>`;
  container.appendChild(sp);

  // Settings button
  const obtn = document.createElement('button'); obtn.id = 'open-settings'; obtn.className = 'hidden'; obtn.textContent = '⚙';
    container.appendChild(obtn);

  // Crosshair canvas
  const ch = document.createElement('canvas');
  ch.id = 'crosshair'; ch.width = 80; ch.height = 80;
  ch.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:5;';
  container.appendChild(ch);
  drawCrosshair('#00ff00', 4, 8, 2);

  // Sensitivity setup overlay - full HTML
  const so = document.createElement('div'); so.id = 'sens-setup-overlay'; so.className = 'hidden';
  so.innerHTML = `<div id="sens-setup" style="width:440px;background:rgba(18,18,24,0.98);border:2px solid #ff4655;border-radius:8px;overflow:hidden;">
    <div style="padding:24px 24px 16px;text-align:center;"><h1 style="font-size:1.5rem;color:#ff4655;">设置你的灵敏度</h1><p style="font-size:0.82rem;color:#888;">输入你在无畏契约中的鼠标设置</p></div>
    <div style="padding:0 24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><label style="width:120px;font-size:0.82rem;color:#aaa;text-align:right;">鼠标 DPI</label><input type="number" id="setup-dpi-input" value="800" min="100" max="32000" step="50" style="width:110px;padding:7px 8px;background:#1a1a1a;border:1px solid #444;border-radius:4px;color:#fff;font-size:0.9rem;text-align:center;font-weight:bold;"><span style="font-size:0.7rem;color:#555;">鼠标驱动中查看</span></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><label style="width:120px;font-size:0.82rem;color:#aaa;text-align:right;">游戏内灵敏度</label><input type="number" id="setup-sens-input" value="0.5" min="0.01" max="10" step="0.01" style="width:110px;padding:7px 8px;background:#1a1a1a;border:1px solid #444;border-radius:4px;color:#fff;font-size:0.9rem;text-align:center;font-weight:bold;"><span style="font-size:0.7rem;color:#555;">Valorant 设置 → 灵敏度</span></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><label style="width:120px;font-size:0.82rem;color:#aaa;text-align:right;">或输入 cm/360°</label><input type="number" id="setup-cm360" placeholder="例如 41.5" step="0.1" style="width:110px;padding:7px 8px;background:#1a1a1a;border:1px dashed #555;border-radius:4px;color:#fff;font-size:0.9rem;text-align:center;font-weight:bold;"><span style="font-size:0.7rem;color:#555;">自动反算灵敏度</span></div>
      <div style="display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(255,70,85,0.05);border-radius:6px;margin:8px 0 12px;"><div style="display:flex;flex-direction:column;align-items:center;padding:0 18px;"><span id="setup-cm-val" style="font-size:1.4rem;font-weight:bold;color:#ff4655;">41.6</span><span style="font-size:0.65rem;color:#888;">cm / 360°</span></div><div style="width:1px;height:36px;background:#333;"></div><div style="display:flex;flex-direction:column;align-items:center;padding:0 18px;"><span id="setup-edpi-val" style="font-size:1.4rem;font-weight:bold;color:#ff4655;">400</span><span style="font-size:0.65rem;color:#888;">eDPI</span></div></div>
      <div style="padding:10px;background:rgba(255,70,85,0.04);border-radius:4px;margin-bottom:8px;">
        <p style="font-size:0.78rem;color:#999;margin-bottom:4px;">🔄 从其他游戏转过来？</p>
        <div style="display:flex;gap:4px;"><select id="setup-game-select"><option value="">-- 原游戏 --</option></select><input type="number" id="setup-game-sens" placeholder="原灵敏度" step="0.01" style="width:70px;padding:4px;background:#1a1a1a;border:1px solid #444;border-radius:3px;color:#fff;font-size:0.74rem;text-align:center;"><button id="setup-convert-btn" style="padding:4px 8px;background:#333;border:1px solid #555;border-radius:3px;color:#ccc;font-size:0.72rem;cursor:pointer;">转换</button></div>
      </div>
    </div>
    <button id="confirm-sensitivity" style="display:block;width:100%;padding:13px;background:#ff4655;border:none;color:#fff;font-size:0.95rem;font-weight:bold;cursor:pointer;">确认并开始训练</button></div>`;
  container.appendChild(so);
}

export class ValorantRange {
  constructor(onBack) {
    this.onBack = onBack;
    const root = document.querySelector('.game-root');
    if (!document.getElementById('blocker')) buildGameDOM(root);

    this.settings = new Settings();
    this.engine = new Engine();
    this.collision = new CollisionManager();
    this.environment = new Environment(this.engine.scene, this.collision);
    this.targetManager = new TargetManager(this.engine.scene);
    this.weaponModel = new WeaponModel();
    this.player = new Player(this.engine, this.settings.sensitivity, this.targetManager, this.weaponModel, this.collision);
    this.gameMode = new GameModeManager(this.targetManager);
    this.audio = new AudioManager();
    this._particles = [];

    this._setupEvents();
    this._animate();
  }

  _setupEvents() {
    document.addEventListener('click', () => { this.audio.init(); this.audio.resume(); }, { once: true });
    this.settings.onApply = d => {
      this.engine.updateFov(d.fov); this.engine.setQuality(d.quality);
      drawCrosshair(d.crosshair.color, d.crosshair.size, d.crosshair.gap, d.crosshair.thickness);
    };
    this.settings.onSensChange = () => this._updateSensInfo();
    this.settings.onSetupComplete = () => { this._updateSensInfo(); setTimeout(() => this.engine.canvas.requestPointerLock(), 100); };

    this.player.onHit = r => {
      this.audio.playGunshot();
      if (r.hitType === 'head' && r.killed !== false) this.audio.playHeadshot(); else this.audio.playBodyshot();
      if (r.killed !== false) { this.gameMode.registerKill(); document.getElementById('score').textContent = this.gameMode.killCount; }
      document.getElementById('accuracy').textContent = this.player.accuracy + '%';
      document.getElementById('accuracy').style.color = this.player.accuracy >= 80 ? '#0f0' : this.player.accuracy >= 50 ? '#ff0' : '#f00';
    };
    this.player.onMiss = () => { this.audio.playGunshot(); document.getElementById('accuracy').textContent = this.player.accuracy + '%'; };

    this.gameMode.onComplete = r => alert(`完成! 击杀:${r.kills} 用时:${r.time.toFixed(1)}s`);
    this.gameMode.onTick = t => {
      const sec = t.mode === 'timed30' || t.mode === 'timed60' ? t.timeLeft : t.timeElapsed;
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      document.getElementById('timer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    this._setupEscMenu();
    this._updateSensInfo();
  }

  _setupEscMenu() {
    // ESC 模式按钮
    const modes = [
      { id: 'elim50', icon: '50', name: '消灭50' }, { id: 'elim100', icon: '100', name: '消灭100' },
      { id: 'timed30', icon: '30s', name: '计时30s' }, { id: 'timed60', icon: '60s', name: '计时60s' },
      { id: 'flying', icon: '✈', name: '浮空靶' }, { id: 'strafe', icon: '↔', name: '移动靶' },
    ];
    const mg = document.getElementById('esc-modes');
    if (mg) modes.forEach(m => {
      const b = document.createElement('button'); b.innerHTML = `<span class="mi">${m.icon}</span><span class="mn">${m.name}</span>`;
      b.addEventListener('click', () => {
        this._startMode(m.id);
        document.getElementById('esc-menu').classList.add('hidden');
        this.player.showBlocker();
      });
      mg.appendChild(b);
    });

    // 折叠
    document.getElementById('esc-cat-fps').addEventListener('click', () => {
      const cat = document.getElementById('esc-cat-fps');
      const body = document.getElementById('esc-body-fps');
      cat.classList.toggle('act'); body.classList.toggle('hidden');
    });
    document.getElementById('esc-cat-set').addEventListener('click', () => {
      const cat = document.getElementById('esc-cat-set');
      const body = document.getElementById('esc-body-set');
      cat.classList.toggle('act'); body.classList.toggle('hidden');
    });

    // 游戏转换 + 灵敏度调整 (复用 settings.js 中的逻辑)
    document.getElementById('esc-back-menu').addEventListener('click', () => {
      document.getElementById('esc-menu').classList.add('hidden');
      document.exitPointerLock();
      if (this.onBack) this.onBack();
    });
    document.getElementById('esc-resume').addEventListener('click', () => {
      document.getElementById('esc-menu').classList.add('hidden');
      this.player.showBlocker();
    });

    // 老板键开关
    const tgl = document.getElementById('boss-key-toggle');
    const track = document.getElementById('boss-tog-track');
    const thumb = document.getElementById('boss-tog-thumb');
    let on = true;
    const updateTog = () => {
      if (track) { track.style.background = on ? '#ff4655' : '#333'; thumb.style.right = on ? '2px' : ''; thumb.style.left = on ? '' : '2px'; }
    };
    tgl?.addEventListener('change', () => { on = tgl.checked; updateTog(); localStorage.setItem('valorant-boss-key', String(on)); });
    updateTog();
  }

  _startMode(mode) {
    this.player.resetStats();
    document.getElementById('score').textContent = '0';
    document.getElementById('accuracy').textContent = '100%';
    document.getElementById('accuracy').style.color = '#0f0';
    this.gameMode.start(mode);
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('open-settings').classList.remove('hidden');
    this.weaponModel.show(true);
    this._updateSensInfo();
  }

  _updateSensInfo() {
    const s = this.settings.sensitivity;
    const bi = document.getElementById('blocker-sens-info');
    if (bi) bi.textContent = `${s.dpi} DPI / ${s.inGameSens.toFixed(2)} sens / ${s.cmPer360.toFixed(1)}cm`;
    const shv = document.getElementById('sens-hud-val');
    const shc = document.getElementById('sens-hud-cm');
    if (shv) shv.textContent = s.inGameSens.toFixed(2);
    if (shc) shc.textContent = s.cmPer360.toFixed(1) + 'cm';
    const esv = document.getElementById('esc-sens-val');
    const esc = document.getElementById('esc-sens-cm360');
    const esi = document.getElementById('esc-sens-info');
    if (esv) esv.textContent = s.inGameSens.toFixed(2);
    if (esc) esc.textContent = `= ${s.cmPer360.toFixed(1)} cm/360°`;
    if (esi) esi.textContent = `${s.dpi} DPI | ${s.inGameSens.toFixed(2)} sens | ${s.cmPer360.toFixed(1)} cm/360°`;
  }

  toggleBoss(on) {
    if (on) { document.exitPointerLock(); if (this.audio?.ctx) this.audio.ctx.suspend(); }
    else { this.engine.canvas.requestPointerLock(); if (this.audio?.ctx) this.audio.ctx.resume(); }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const d = Math.min(this.engine.deltaTime, 0.1);
    this.player.update(d);
    this.targetManager.update(d);
    this.gameMode.update(d);
    this.engine.tick();
    this.weaponModel.update(d);
  }
}
