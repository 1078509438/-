import { Sensitivity } from './sensitivity.js';

const DEFAULT_SETTINGS = {
  dpi: 800,
  inGameSens: 0.5,
  fov: 103,
  quality: 'medium',
  crosshair: {
    color: '#00ff00',
    size: 4,
    gap: 8,
    thickness: 2,
  },
};

export class Settings {
  constructor() {
    this.data = this._load();
    this.sensitivity = new Sensitivity(this.data.dpi, this.data.inGameSens);
    this._sensitivitySetupDone = !!this._loadRaw();
    this._bindUI();
  }

  _loadRaw() {
    try {
      return localStorage.getItem('valorant-range-settings');
    } catch { return null; }
  }

  _load() {
    try {
      const saved = this._loadRaw();
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  _save() {
    try {
      localStorage.setItem('valorant-range-settings', JSON.stringify(this.data));
    } catch { /* ignore */ }
  }

  get isFirstLaunch() {
    return !this._sensitivitySetupDone;
  }

  _bindUI() {
    this._bindSensitivityInputs();
    this._bindGameConversion();
    this._bindSettingsPanel();
    this._bindSensitivityOverlay();
    this._bindKeyboardAdjust();
  }

  // ─── DPI + 灵敏度 + cm/360 双向联动 ───
  _bindSensitivityInputs() {
    const dpiInput = document.getElementById('dpi-input');
    const sensInput = document.getElementById('sens-input');
    const cm360Input = document.getElementById('cm360-input');
    const cm360Display = document.getElementById('cm360-display');
    const edpiDisplay = document.getElementById('edpi-display');

    dpiInput.value = this.data.dpi;
    sensInput.value = this.data.inGameSens;
    cm360Input.value = this.sensitivity.cmPer360.toFixed(2);
    this._updateSensDisplay(cm360Display, edpiDisplay);

    const syncFromDpiSens = () => {
      this.data.dpi = parseInt(dpiInput.value) || 800;
      this.data.inGameSens = parseFloat(sensInput.value) || 0.5;
      this.sensitivity.update(this.data.dpi, this.data.inGameSens);
      cm360Input.value = this.sensitivity.cmPer360.toFixed(2);
      this._updateSensDisplay(cm360Display, edpiDisplay);
      this._notifySensChange();
    };

    const syncFromCm360 = () => {
      const cm360 = parseFloat(cm360Input.value);
      if (!cm360 || cm360 <= 0) return;
      this.data.dpi = parseInt(dpiInput.value) || 800;
      this.data.inGameSens = Sensitivity.calcSensFromCm360(this.data.dpi, cm360);
      sensInput.value = this.data.inGameSens;
      this.sensitivity.update(this.data.dpi, this.data.inGameSens);
      this._updateSensDisplay(cm360Display, edpiDisplay);
      this._notifySensChange();
    };

    dpiInput.addEventListener('input', syncFromDpiSens);
    sensInput.addEventListener('input', syncFromDpiSens);
    cm360Input.addEventListener('input', syncFromCm360);

    // 鼠标滚轮精调灵敏度
    [sensInput, cm360Input].forEach(el => {
      el.addEventListener('wheel', (e) => {
        if (document.activeElement !== el) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.01;
        const sign = e.deltaY > 0 ? -1 : 1;
        if (el === sensInput) {
          this.data.inGameSens = Math.max(0.01, Math.min(10, this.data.inGameSens + step * sign));
          sensInput.value = Math.round(this.data.inGameSens * 100) / 100;
          this.sensitivity.update(this.data.dpi, this.data.inGameSens);
          cm360Input.value = this.sensitivity.cmPer360.toFixed(2);
          this._updateSensDisplay(cm360Display, edpiDisplay);
          this._notifySensChange();
        } else {
          const val = parseFloat(cm360Input.value) + step * sign;
          if (val > 0) {
            cm360Input.value = Math.round(val * 100) / 100;
            syncFromCm360();
          }
        }
      });
    });

    // 灵敏度预设按钮
    document.querySelectorAll('.sens-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const dpi = parseInt(btn.dataset.dpi);
        const sens = parseFloat(btn.dataset.sens);
        if (dpi) dpiInput.value = dpi;
        if (sens) sensInput.value = sens;
        syncFromDpiSens();
      });
    });
  }

  _notifySensChange() {
    if (this.onSensChange) {
      this.onSensChange({
        dpi: this.data.dpi,
        inGameSens: this.data.inGameSens,
        cm360: this.sensitivity.cmPer360,
        edpi: this.sensitivity.edpi,
      });
    }
  }

  // ─── 游戏转换 ───
  _bindGameConversion() {
    const gameSelect = document.getElementById('game-select');
    const gameSensInput = document.getElementById('game-sens-input');
    const convertResult = document.getElementById('convert-result');
    const applyConverted = document.getElementById('apply-converted');
    const quickGames = document.getElementById('quick-games');

    if (!gameSelect) return;

    // 按游戏名排序
    const games = Sensitivity.supportedGames.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

    // 填充下拉框
    games.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.name}  (÷${g.ratio.toFixed(1)})`;
      gameSelect.appendChild(opt);
    });

    // 热门游戏快捷按钮
    const POPULAR_IDS = ['valorant', 'cs2', 'apex', 'ow2', 'r6', 'cod', 'pubg', 'fortnite', 'tarkov', 'battlefield', 'finvals'];
    if (quickGames) {
      POPULAR_IDS.forEach(id => {
        const btn = document.createElement('button');
        const g = games.find(g => g.id === id);
        if (!g) return;
        btn.className = 'quick-game-btn';
        btn.textContent = g.name;
        btn.dataset.gameId = id;
        btn.addEventListener('click', () => {
          gameSelect.value = id;
          gameSelect.dispatchEvent(new Event('change'));
          gameSensInput.focus();
        });
        quickGames.appendChild(btn);
      });
    }

    const doConvert = () => {
      const game = gameSelect.value;
      const otherSens = parseFloat(gameSensInput.value);
      if (!game || !otherSens || otherSens <= 0) {
        convertResult.textContent = '';
        return;
      }
      try {
        const r = Sensitivity.convertFromGame(game, this.data.dpi, otherSens);
        convertResult.innerHTML = `
          Valorant: <strong>${r.valorantSens.toFixed(3)}</strong>  |
          cm/360°: ${r.cm360.toFixed(1)}cm  |
          eDPI: ${r.edpi}
        `;
        convertResult.dataset.valorantSens = r.valorantSens;
      } catch {
        convertResult.textContent = '—';
      }
    };

    gameSelect.addEventListener('change', doConvert);
    gameSensInput.addEventListener('input', doConvert);
    document.getElementById('dpi-input').addEventListener('input', doConvert);

    applyConverted.addEventListener('click', () => {
      const vs = parseFloat(convertResult.dataset.valorantSens);
      if (!vs) return;
      const sensInput = document.getElementById('sens-input');
      sensInput.value = vs;
      sensInput.dispatchEvent(new Event('input'));
      convertResult.textContent = '✓ 已应用';
    });
  }

  // ─── 设置面板开关 ───
  _bindSettingsPanel() {
    document.getElementById('open-settings').addEventListener('click', () => {
      document.getElementById('settings-panel').classList.remove('hidden');
      document.getElementById('open-settings').classList.add('hidden');
    });

    document.getElementById('close-settings').addEventListener('click', () => {
      document.getElementById('settings-panel').classList.add('hidden');
      document.getElementById('open-settings').classList.remove('hidden');
    });

    document.getElementById('apply-settings').addEventListener('click', () => {
      const fovInput = document.getElementById('fov-input');
      const qualitySelect = document.getElementById('quality-select');
      const crosshairColor = document.getElementById('crosshair-color');
      const crosshairSize = document.getElementById('crosshair-size');
      const crosshairGap = document.getElementById('crosshair-gap');
      const crosshairThickness = document.getElementById('crosshair-thickness');

      this.data.fov = parseInt(fovInput.value) || 103;
      this.data.quality = qualitySelect.value;
      this.data.crosshair = {
        color: crosshairColor.value,
        size: parseInt(crosshairSize.value),
        gap: parseInt(crosshairGap.value),
        thickness: parseInt(crosshairThickness.value),
      };
      this._save();
      this._sensitivitySetupDone = true;

      document.getElementById('settings-panel').classList.add('hidden');
      document.getElementById('open-settings').classList.remove('hidden');

      if (this.onApply) this.onApply(this.data);
    });
  }

  // ─── 首次启动灵敏度设置引导 ───
  _bindSensitivityOverlay() {
    const overlay = document.getElementById('sens-setup-overlay');
    const setupSens = document.getElementById('setup-sens-input');
    const setupDpi = document.getElementById('setup-dpi-input');
    const setupCm360 = document.getElementById('setup-cm360');
    const setupCmVal = document.getElementById('setup-cm-val');
    const setupEdpi = document.getElementById('setup-edpi-val');
    const confirmBtn = document.getElementById('confirm-sensitivity');

    if (!overlay) return;

    setupDpi.value = this.data.dpi;
    setupSens.value = this.data.inGameSens;
    setupCmVal.textContent = this.sensitivity.cmPer360.toFixed(1);
    setupEdpi.textContent = this.sensitivity.edpi;

    const updateSetup = () => {
      const dpi = parseInt(setupDpi.value) || 800;
      const sens = parseFloat(setupSens.value) || 0.5;
      const temp = new Sensitivity(dpi, sens);
      setupCmVal.textContent = temp.cmPer360.toFixed(1);
      setupEdpi.textContent = temp.edpi;
    };

    setupDpi.addEventListener('input', updateSetup);
    setupSens.addEventListener('input', updateSetup);

    // cm/360 反向输入
    setupCm360.addEventListener('input', () => {
      const cm = parseFloat(setupCm360.value);
      if (cm && cm > 0) {
        const sens = Sensitivity.calcSensFromCm360(parseInt(setupDpi.value) || 800, cm);
        setupSens.value = sens;
        updateSetup();
      }
    });

    confirmBtn.addEventListener('click', () => {
      this.data.dpi = parseInt(setupDpi.value) || 800;
      this.data.inGameSens = parseFloat(setupSens.value) || 0.5;
      this.sensitivity.update(this.data.dpi, this.data.inGameSens);

      document.getElementById('dpi-input').value = this.data.dpi;
      document.getElementById('sens-input').value = this.data.inGameSens;

      this._save();
      this._sensitivitySetupDone = true;
      overlay.classList.add('hidden');

      if (this.onSetupComplete) this.onSetupComplete(this.data);
    });

    // 引导页的游戏转换
    const setupGameSelect = document.getElementById('setup-game-select');
    const setupGameSens = document.getElementById('setup-game-sens');
    const setupConvertBtn = document.getElementById('setup-convert-btn');

    if (setupGameSelect) {
      Sensitivity.supportedGames.sort((a, b) => a.name.localeCompare(b.name, 'zh')).forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        setupGameSelect.appendChild(opt);
      });

      setupConvertBtn.addEventListener('click', () => {
        const game = setupGameSelect.value;
        const otherSens = parseFloat(setupGameSens.value);
        if (!game || !otherSens || otherSens <= 0) return;
        try {
          const r = Sensitivity.convertFromGame(game, parseInt(setupDpi.value) || 800, otherSens);
          setupSens.value = r.valorantSens;
          setupSens.dispatchEvent(new Event('input'));
          updateSetup();
        } catch { /* ignore */ }
      });
    }

    // 显示首次启动引导
    if (this.isFirstLaunch) {
      overlay.classList.remove('hidden');
    }
  }

  // ─── 键盘快捷键 [+]/[-] 实时调灵敏度 ───
  _bindKeyboardAdjust() {
    document.addEventListener('keydown', (e) => {
      // 只在游戏锁定状态且无输入框聚焦时触发
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      const bracket = e.key === '[' ? -0.01 : e.key === ']' ? 0.01 : null;
      if (bracket === null) return;

      e.preventDefault();
      const newSens = this.sensitivity.adjust(bracket);
      this.data.inGameSens = newSens;

      // 同步 UI
      const sensInput = document.getElementById('sens-input');
      const cm360Input = document.getElementById('cm360-input');
      const cm360Display = document.getElementById('cm360-display');
      const edpiDisplay = document.getElementById('edpi-display');
      if (sensInput) sensInput.value = newSens;
      if (cm360Input) cm360Input.value = this.sensitivity.cmPer360.toFixed(2);
      this._updateSensDisplay(cm360Display, edpiDisplay);

      this._save();
      this._notifySensChange();
    });
  }

  _updateSensDisplay(cm360Display, edpiDisplay) {
    if (cm360Display) cm360Display.value = this.sensitivity.cmPer360.toFixed(2);
    if (edpiDisplay) edpiDisplay.value = this.sensitivity.edpi.toString();
  }

  onApply = null;
  onSetupComplete = null;
  onSensChange = null;
}
