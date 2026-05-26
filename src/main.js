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

    // 首次启动时设置面板会自行弹出（settings.js 检测 isFirstLaunch）
  }

  _setupEvents() {
    // 音频初始化
    document.addEventListener('click', () => {
      this.audio.init();
      this.audio.resume();
    }, { once: true });

    // ─── 设置相关回调 ───
    this.settings.onApply = (data) => {
      this.engine.updateFov(data.fov);
      this.engine.setQuality(data.quality);
      this.hud.drawCrosshair(
        data.crosshair.color,
        data.crosshair.size,
        data.crosshair.gap,
        data.crosshair.thickness
      );
      this._updateSensInfo();
    };

    // 首次灵敏度设置完成后的回调
    this.settings.onSetupComplete = (data) => {
      this._updateSensInfo();
      // 点击设置完成后再请求锁定鼠标
      setTimeout(() => this.engine.canvas.requestPointerLock(), 100);
    };

    // 灵敏度变化（[ ] 快捷键或滚轮）
    this.settings.onSensChange = () => {
      this._updateSensInfo();
      this.hud.showSensFlash();
    };

    // ─── 射击回调 ───
    this.player.onHit = (result) => {
      const isHeadshot = result.hitType === 'head';
      const killed = result.killed !== false; // undefined (old) or true
      const dist = this.engine.camera.position.distanceTo(result.position);

      this.audio.playGunshot();
      if (isHeadshot && killed) {
        this.audio.playHeadshot();
      } else {
        this.audio.playBodyshot();
      }

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

    this.player.onMiss = () => {
      this.audio.playGunshot();
      this.hud.showHitmarker(false);
      this.hud.updateAccuracy(this.player.accuracy);
    };

    // ─── 游戏模式 ───
    this.gameMode.onComplete = (result) => {
      this.hud.showModeComplete(result);
    };

    this.gameMode.onTick = (tick) => {
      if (tick.mode === 'timed30' || tick.mode === 'timed60') {
        this.hud.updateTimer(tick.timeLeft);
      } else {
        this.hud.updateTimer(tick.timeElapsed);
      }
    };

    // ─── 键盘快捷键 ───
    document.addEventListener('keydown', (e) => {
      if (!this.player.isLocked) return;

      switch (e.key.toLowerCase()) {
        case 'r':
          if (this.gameMode.mode) this._startMode(this.gameMode.mode);
          break;
        case '1': this._startMode('elim50'); break;
        case '2': this._startMode('elim100'); break;
        case '3': this._startMode('timed30'); break;
        case '4': this._startMode('timed60'); break;
        case '5': this._startMode('flying'); break;
        case '6': this._startMode('strafe'); break;
      }
    });

    // ─── ESC 菜单 ───
    this._setupEscMenu();
  }

  _setupEscMenu() {
    const escMenu = document.getElementById('esc-menu');
    const s = this.settings;

    // 填充游戏下拉
    const escGameSelect = document.getElementById('esc-game-select');
    if (escGameSelect) {
      Sensitivity.supportedGames.sort((a, b) => a.name.localeCompare(b.name, 'zh')).forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        escGameSelect.appendChild(opt);
      });
    }

    // 游戏转换
    const escGameSens = document.getElementById('esc-game-sens');
    const escConvertResult = document.getElementById('esc-convert-result');
    const escConvertBtn = document.getElementById('esc-convert-btn');
    const escApplyConverted = document.getElementById('esc-apply-converted');
    let escConvertedSens = null;

    if (escConvertBtn) {
      escConvertBtn.addEventListener('click', () => {
        const game = escGameSelect.value;
        const otherSens = parseFloat(escGameSens.value);
        if (!game || !otherSens || otherSens <= 0) return;
        try {
          const r = Sensitivity.convertFromGame(game, s.data.dpi, otherSens);
          escConvertedSens = r.valorantSens;
          escConvertResult.innerHTML = `Valorant: <strong>${r.valorantSens.toFixed(3)}</strong> | cm/360°: ${r.cm360.toFixed(1)}cm | eDPI: ${r.edpi}`;
          escApplyConverted.classList.remove('hidden');
        } catch { /* ignore */ }
      });
    }

    if (escApplyConverted) {
      escApplyConverted.addEventListener('click', () => {
        if (!escConvertedSens) return;
        s.data.inGameSens = escConvertedSens;
        s.sensitivity.update(s.data.dpi, s.data.inGameSens);
        s._save();

        document.getElementById('sens-input').value = s.data.inGameSens;
        document.getElementById('cm360-input').value = s.sensitivity.cmPer360.toFixed(2);
        this._updateSensInfo();
        this._updateEscSensDisplay();
        escApplyConverted.classList.add('hidden');
        escConvertResult.textContent = '✓ 已应用';
      });
    }

    // 灵敏度调整按钮
    escMenu.querySelectorAll('.esc-sens-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseFloat(btn.dataset.delta);
        s.sensitivity.adjust(delta);
        s.data.inGameSens = s.sensitivity.inGameSens;
        s._save();

        document.getElementById('sens-input').value = s.data.inGameSens;
        document.getElementById('cm360-input').value = s.sensitivity.cmPer360.toFixed(2);
        this._updateSensInfo();
        this._updateEscSensDisplay();
      });
    });

    // 模式选择按钮
    escMenu.querySelectorAll('.esc-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this._startMode(mode);
        escMenu.querySelectorAll('.esc-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 隐藏菜单，显示点击拦截层让用户重新锁定鼠标
        escMenu.classList.add('hidden');
        this.player.showBlocker();
      });
    });

    // 返回游戏按钮
    document.getElementById('esc-resume').addEventListener('click', () => {
      escMenu.classList.add('hidden');
      this.player.showBlocker();
    });

    // 点击菜单外部区域
    escMenu.addEventListener('click', (e) => {
      if (e.target === escMenu) {
        escMenu.classList.add('hidden');
        this.player.showBlocker();
      }
    });

    // 初始化显示
    this._updateEscSensDisplay();
  }

  _updateEscSensDisplay() {
    const s = this.settings.sensitivity;
    const escSensVal = document.getElementById('esc-sens-val');
    const escSensCm360 = document.getElementById('esc-sens-cm360');
    const escSensInfo = document.getElementById('esc-sens-info');
    if (escSensVal) escSensVal.textContent = s.inGameSens.toFixed(2);
    if (escSensCm360) escSensCm360.textContent = `= ${s.cmPer360.toFixed(1)} cm/360°`;
    if (escSensInfo) {
      escSensInfo.textContent = `${s.dpi} DPI | ${s.inGameSens.toFixed(2)} sens | ${s.cmPer360.toFixed(1)} cm/360°`;
    }
  }

  _startMode(mode) {
    this.player.resetStats();
    this.hud.updateScore(0);
    this.hud.updateAccuracy(100);
    this.gameMode.start(mode);

    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('open-settings').classList.remove('hidden');
    this.weaponModel.show(true);
    this._updateSensInfo();
  }

  _updateSensInfo() {
    const s = this.settings;
    const sens = s.sensitivity;

    this.hud.updateSensDisplay(sens.inGameSens, sens.cmPer360);

    const blockerInfo = document.getElementById('blocker-sens-info');
    if (blockerInfo) {
      blockerInfo.textContent =
        `${sens.dpi} DPI / ${sens.inGameSens.toFixed(2)} sens / ${sens.cmPer360.toFixed(1)}cm`;
    }

    this._updateEscSensDisplay();
  }

  _checkCombo(result) {
    const now = performance.now() / 1000;
    if (!this._lastKillTime) { this._lastKillTime = now; this._comboCount = 1; return; }

    const dt = now - this._lastKillTime;
    this._lastKillTime = now;

    if (dt < 1.5) {
      this._comboCount++;
      if (this._comboCount >= 3) {
        const text = result.hitType === 'head'
          ? `${this._comboCount}x 爆头连杀!`
          : `${this._comboCount}x 连杀!`;
        this.hud.showCombo(text);
      }
    } else {
      this._comboCount = 1;
    }
  }

  _spawnImpactParticles(position, isHeadshot) {
    const count = isHeadshot ? 12 : 6;
    const color = isHeadshot ? '#ff4655' : '#ffaa00';
    const group = new THREE.Group();
    group.position.copy(position);

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.02, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const particle = new THREE.Mesh(geo, mat);
      const speed = 1 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      particle.userData.velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle) * speed,
        Math.sin(phi) * Math.sin(angle) * speed + 1,
        Math.cos(phi) * speed
      );
      particle.userData.life = 0.3 + Math.random() * 0.3;
      group.add(particle);
    }

    this.engine.scene.add(group);
    if (!this._particles) this._particles = [];
    this._particles.push({ group, startTime: performance.now() / 1000 });
  }

  _updateParticles(delta) {
    if (!this._particles) return;
    const now = performance.now() / 1000;

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const { group, startTime } = this._particles[i];
      const elapsed = now - startTime;
      let allDead = true;

      group.children.forEach(particle => {
        if (particle.userData.life > 0) {
          allDead = false;
          particle.userData.life -= delta;
          const ratio = Math.max(0, particle.userData.life / 0.6);
          particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
          particle.userData.velocity.y -= 9.8 * delta;
          particle.material.opacity = ratio;
          particle.scale.setScalar(ratio);
        }
      });

      if (allDead || elapsed > 1) {
        group.children.forEach(p => { p.geometry.dispose(); p.material.dispose(); });
        this.engine.scene.remove(group);
        this._particles.splice(i, 1);
      }
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const delta = Math.min(this.engine.deltaTime, 0.1);

    this.player.update(delta);
    this.targetManager.update(delta);
    this.gameMode.update(delta);
    this._updateParticles(delta);
    this.engine.tick();
  }
}

new ValorantRange();
