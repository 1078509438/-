import * as THREE from 'three';
import { Engine } from './engine.js';
import { Environment } from './environment.js';
import { TargetManager } from './targets.js';
import { Player } from './player.js';
import { GameModeManager } from './gamemodes.js';
import { HUD } from './hud.js';
import { AudioManager } from './audio.js';
import { Settings } from './settings.js';
import { Sensitivity } from './sensitivity.js';
import { WeaponModel } from './weapon.js';
import { CollisionManager } from './collision.js';

class ValorantRange {
  constructor() {
    this._initialized = false;
    this._animId = null;
    this._particles = [];
    this._setupMainMenu();
    this._setupBossKey();
  }

  // ═══════════ 主菜单 ═══════════
  _setupMainMenu() {
    const launchBtn = document.getElementById('launch-module');
    const modules = document.querySelectorAll('.menu-module');

    modules.forEach(m => {
      m.addEventListener('click', () => {
        if (m.classList.contains('disabled')) return;
        modules.forEach(x => x.classList.remove('active'));
        m.classList.add('active');
        launchBtn.textContent = `启动 ${m.querySelector('.module-name').textContent}`;
      });
    });

    launchBtn.addEventListener('click', () => this._launchFPS());
  }

  _launchFPS() {
    if (this._initialized) return;
    this._initialized = true;

    // 隐藏主菜单，显示 canvas 和点击拦截层
    document.getElementById('main-menu').classList.add('hidden');
    const canvas = document.getElementById('game-canvas');
    canvas.style.display = 'block';
    document.getElementById('blocker').classList.remove('hidden');

    // 初始化游戏组件
    this.settings = new Settings();
    this.engine = new Engine();
    this.collision = new CollisionManager();
    this.environment = new Environment(this.engine.scene, this.collision);
    this.targetManager = new TargetManager(this.engine.scene);
    this.weaponModel = new WeaponModel(this.engine.scene, this.engine.camera);
    this.player = new Player(this.engine, this.settings.sensitivity, this.targetManager, this.weaponModel, this.collision);
    this.gameMode = new GameModeManager(this.targetManager);
    this.hud = new HUD();
    this.audio = new AudioManager();

    this._setupEvents();
    this._animate();
  }

  _backToMenu() {
    // 停掉游戏
    if (this._animId) cancelAnimationFrame(this._animId);
    this._animId = null;
    if (this.gameMode) this.gameMode.stop();
    if (this.player && this.player.isLocked) document.exitPointerLock();

    // 显示主菜单，隐藏游戏相关 UI
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-canvas').style.display = 'none';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('blocker').classList.add('hidden');
    document.getElementById('esc-menu').classList.add('hidden');
    document.getElementById('open-settings').classList.add('hidden');
    document.getElementById('sens-setup-overlay').classList.add('hidden');
    if (this.weaponModel) this.weaponModel.hide();

    this._initialized = false;
  }

  // ═══════════ 事件绑定 ═══════════
  _setupEvents() {
    document.addEventListener('click', () => { this.audio.init(); this.audio.resume(); }, { once: true });

    this.settings.onApply = (data) => {
      this.engine.updateFov(data.fov);
      this.engine.setQuality(data.quality);
      this.hud.drawCrosshair(data.crosshair.color, data.crosshair.size, data.crosshair.gap, data.crosshair.thickness);
      this._updateSensInfo();
    };

    this.settings.onSetupComplete = (data) => {
      this._updateSensInfo();
      setTimeout(() => this.engine.canvas.requestPointerLock(), 100);
    };

    this.settings.onSensChange = () => { this._updateSensInfo(); this.hud.showSensFlash(); };

    this.player.onHit = (result) => {
      const isHeadshot = result.hitType === 'head';
      const killed = result.killed !== false;
      const dist = this.engine.camera.position.distanceTo(result.position);
      this.audio.playGunshot();
      if (isHeadshot && killed) this.audio.playHeadshot();
      else this.audio.playBodyshot();

      if (killed) {
        this.hud.showHitmarker(true);
        this._spawnImpactParticles(result.position, isHeadshot);
        this._checkCombo(result);
        this.gameMode.registerKill();
        this.hud.updateScore(this.gameMode.killCount);
      } else {
        this.hud.showHitmarker(false);
      }
      this.hud.addKillfeed(result.hitType, dist, result.damage || 0, killed);
      this.hud.updateAccuracy(this.player.accuracy);
    };

    this.player.onMiss = () => { this.audio.playGunshot(); this.hud.showHitmarker(false); this.hud.updateAccuracy(this.player.accuracy); };
    this.gameMode.onComplete = (result) => { this.hud.showModeComplete(result); };
    this.gameMode.onTick = (tick) => {
      if (tick.mode === 'timed30' || tick.mode === 'timed60') this.hud.updateTimer(tick.timeLeft);
      else this.hud.updateTimer(tick.timeElapsed);
    };

    // ESC 菜单
    this._setupEscMenu();

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (!this.player.isLocked) return;
      switch (e.key.toLowerCase()) {
        case 'r': if (this.gameMode.mode) this._startMode(this.gameMode.mode); break;
        case '1': this._startMode('elim50'); break;
        case '2': this._startMode('elim100'); break;
        case '3': this._startMode('timed30'); break;
        case '4': this._startMode('timed60'); break;
        case '5': this._startMode('flying'); break;
        case '6': this._startMode('strafe'); break;
      }
    });
  }

  _setupEscMenu() {
    const escMenu = document.getElementById('esc-menu');
    const s = this.settings;

    // 折叠
    document.querySelectorAll('.esc-category').forEach(cat => {
      cat.addEventListener('click', () => {
        const body = document.getElementById('cat-' + cat.dataset.category);
        const isOpen = cat.classList.toggle('active');
        if (body) body.classList.toggle('hidden', !isOpen);
      });
    });

    // 游戏下拉
    const escGameSelect = document.getElementById('esc-game-select');
    if (escGameSelect) {
      Sensitivity.supportedGames.sort((a, b) => a.name.localeCompare(b.name, 'zh')).forEach(g => {
        const opt = document.createElement('option'); opt.value = g.id; opt.textContent = g.name;
        escGameSelect.appendChild(opt);
      });
    }

    // 游戏转换
    const escGameSens = document.getElementById('esc-game-sens');
    const escConvertResult = document.getElementById('esc-convert-result');
    let escConvertedSens = null;
    document.getElementById('esc-convert-btn').addEventListener('click', () => {
      const game = escGameSelect.value;
      const otherSens = parseFloat(escGameSens.value);
      if (!game || !otherSens || otherSens <= 0) return;
      try {
        const r = Sensitivity.convertFromGame(game, s.data.dpi, otherSens);
        escConvertedSens = r.valorantSens;
        escConvertResult.innerHTML = `Valorant: <strong>${r.valorantSens.toFixed(3)}</strong> | cm/360°: ${r.cm360.toFixed(1)}cm`;
        document.getElementById('esc-apply-converted').classList.remove('hidden');
      } catch { /* */ }
    });

    document.getElementById('esc-apply-converted').addEventListener('click', () => {
      if (!escConvertedSens) return;
      s.data.inGameSens = escConvertedSens;
      s.sensitivity.update(s.data.dpi, s.data.inGameSens);
      s._save();
      document.getElementById('sens-input').value = s.data.inGameSens;
      document.getElementById('cm360-input').value = s.sensitivity.cmPer360.toFixed(2);
      this._updateSensInfo(); this._updateEscSensDisplay();
      document.getElementById('esc-apply-converted').classList.add('hidden');
      escConvertResult.textContent = '✓ 已应用';
    });

    // 灵敏度按钮
    escMenu.querySelectorAll('.esc-sens-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        s.sensitivity.adjust(parseFloat(btn.dataset.delta));
        s.data.inGameSens = s.sensitivity.inGameSens; s._save();
        document.getElementById('sens-input').value = s.data.inGameSens;
        document.getElementById('cm360-input').value = s.sensitivity.cmPer360.toFixed(2);
        this._updateSensInfo(); this._updateEscSensDisplay();
      });
    });

    // 模式按钮
    escMenu.querySelectorAll('.esc-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._startMode(btn.dataset.mode);
        escMenu.querySelectorAll('.esc-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        escMenu.classList.add('hidden');
        this.player.showBlocker();
      });
    });

    // 返回游戏
    document.getElementById('esc-resume').addEventListener('click', () => {
      escMenu.classList.add('hidden'); this.player.showBlocker();
    });

    // 返回主菜单
    document.getElementById('esc-back-menu').addEventListener('click', () => {
      escMenu.classList.add('hidden');
      document.exitPointerLock();
      this._backToMenu();
    });

    escMenu.addEventListener('click', (e) => {
      if (e.target === escMenu) { escMenu.classList.add('hidden'); this.player.showBlocker(); }
    });

    this._updateEscSensDisplay();
  }

  // ═══════════ 老板键 ═══════════
  _setupBossKey() {
    this._bossEnabled = true;
    try { const s = localStorage.getItem('valorant-boss-key'); if (s !== null) this._bossEnabled = s === 'true'; } catch { /* */ }
    const toggleEl = document.getElementById('boss-key-toggle');
    if (toggleEl) toggleEl.checked = this._bossEnabled;
    if (toggleEl) toggleEl.addEventListener('change', () => {
      this._bossEnabled = toggleEl.checked;
      try { localStorage.setItem('valorant-boss-key', String(this._bossEnabled)); } catch { /* */ }
    });
    window.addEventListener('keydown', (e) => {
      if (!this._bossEnabled || !this._initialized) return;
      if (e.key === 'F8' || e.key === 'F1') { e.preventDefault(); this._toggleBoss(); }
    });
  }

  _toggleBoss() {
    this._bossActive = !this._bossActive;
    const bs = document.getElementById('boss-screen');
    if (this._bossActive) { document.exitPointerLock(); bs.classList.remove('hidden'); if (this.audio?.ctx) this.audio.ctx.suspend(); }
    else { bs.classList.add('hidden'); this.engine.canvas.requestPointerLock(); if (this.audio?.ctx) this.audio.ctx.resume(); }
  }

  // ═══════════ 游戏运行 ═══════════
  _startMode(mode) {
    this.player.resetStats();
    this.hud.updateScore(0); this.hud.updateAccuracy(100);
    this.gameMode.start(mode);
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('open-settings').classList.remove('hidden');
    this.weaponModel.show(true);
    this._updateSensInfo();
  }

  _updateSensInfo() {
    const sens = this.settings.sensitivity;
    this.hud.updateSensDisplay(sens.inGameSens, sens.cmPer360);
    const el = document.getElementById('blocker-sens-info');
    if (el) el.textContent = `${sens.dpi} DPI / ${sens.inGameSens.toFixed(2)} sens / ${sens.cmPer360.toFixed(1)}cm`;
    this._updateEscSensDisplay();
  }

  _updateEscSensDisplay() {
    const sens = this.settings.sensitivity;
    document.getElementById('esc-sens-val').textContent = sens.inGameSens.toFixed(2);
    document.getElementById('esc-sens-cm360').textContent = `= ${sens.cmPer360.toFixed(1)} cm/360°`;
    document.getElementById('esc-sens-info').textContent = `${sens.dpi} DPI | ${sens.inGameSens.toFixed(2)} sens | ${sens.cmPer360.toFixed(1)} cm/360°`;
  }

  _checkCombo(result) {
    const now = performance.now() / 1000;
    if (!this._lastKillTime) { this._lastKillTime = now; this._comboCount = 1; return; }
    const dt = now - this._lastKillTime; this._lastKillTime = now;
    if (dt < 1.5) { this._comboCount++; if (this._comboCount >= 3) { this.hud.showCombo(`${this._comboCount}x 连杀!`); } }
    else this._comboCount = 1;
  }

  _spawnImpactParticles(position, isHeadshot) {
    const count = isHeadshot ? 12 : 6;
    const color = isHeadshot ? '#ff4655' : '#ffaa00';
    const group = new THREE.Group(); group.position.copy(position);
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.02, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const p = new THREE.Mesh(geo, mat);
      const speed = 1 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      p.userData.velocity = new THREE.Vector3(Math.sin(phi) * Math.cos(angle) * speed, Math.sin(phi) * Math.sin(angle) * speed + 1, Math.cos(phi) * speed);
      p.userData.life = 0.3 + Math.random() * 0.3;
      group.add(p);
    }
    this.engine.scene.add(group);
    this._particles.push({ group, startTime: performance.now() / 1000 });
  }

  _updateParticles(delta) {
    const now = performance.now() / 1000;
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const { group, startTime } = this._particles[i];
      let allDead = true;
      group.children.forEach(p => {
        if (p.userData.life > 0) { allDead = false; p.userData.life -= delta; const r = Math.max(0, p.userData.life / 0.6); p.position.add(p.userData.velocity.clone().multiplyScalar(delta)); p.userData.velocity.y -= 9.8 * delta; p.material.opacity = r; p.scale.setScalar(r); }
      });
      if (allDead || now - startTime > 1) {
        group.children.forEach(p => { p.geometry.dispose(); p.material.dispose(); });
        this.engine.scene.remove(group); this._particles.splice(i, 1);
      }
    }
  }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate());
    const delta = Math.min(this.engine.deltaTime, 0.1);
    this.player.update(delta);
    this.targetManager.update(delta);
    this.gameMode.update(delta);
    this._updateParticles(delta);
    this.engine.tick();
  }
}

new ValorantRange();
