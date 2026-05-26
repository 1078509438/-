/**
 * HUD 管理器
 *
 * 管理计分板、准星、命中标记、击杀信息等
 */
export class HUD {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.accuracyEl = document.getElementById('accuracy');
    this.timerEl = document.getElementById('timer');
    this.comboText = document.getElementById('combo-text');
    this.hitmarker = document.getElementById('hitmarker');
    this.killfeed = document.getElementById('killfeed');
    this.hudRoot = document.getElementById('hud');
    this.modeSelect = document.getElementById('mode-select');
    this.sensHudVal = document.getElementById('sens-hud-val');
    this.sensHudCm = document.getElementById('sens-hud-cm');
    this.crosshairCanvas = null;
    this.crosshairCtx = null;

    this.comboCount = 0;
    this.comboTimer = null;
    this.killfeedTimeout = null;
    this.sensFlashTimer = null;

    this._createCrosshair();
  }

  _createCrosshair() {
    const canvas = document.createElement('canvas');
    canvas.id = 'crosshair';
    canvas.width = 80;
    canvas.height = 80;
    document.getElementById('app').appendChild(canvas);
    this.crosshairCanvas = canvas;
    this.crosshairCtx = canvas.getContext('2d');

    this.drawCrosshair('#00ff00', 4, 8, 2);
  }

  drawCrosshair(color, size, gap, thickness) {
    const ctx = this.crosshairCtx;
    const w = this.crosshairCanvas.width;
    const h = this.crosshairCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    const cx = w / 2;
    const cy = h / 2;
    const g = gap / 2;

    // 上
    this._drawLine(ctx, cx, cy - g, cx, cy - g - size);
    // 下
    this._drawLine(ctx, cx, cy + g, cx, cy + g + size);
    // 左
    this._drawLine(ctx, cx - g, cy, cx - g - size, cy);
    // 右
    this._drawLine(ctx, cx + g, cy, cx + g + size, cy);

    // 中心点
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, thickness * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  _drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  show() {
    this.hudRoot.classList.remove('hidden');
    this.modeSelect.classList.remove('hidden');
  }

  hide() {
    this.hudRoot.classList.add('hidden');
    this.modeSelect.classList.add('hidden');
  }

  updateScore(kills) {
    this.scoreEl.textContent = kills;
  }

  updateAccuracy(accuracy) {
    this.accuracyEl.textContent = `${accuracy}%`;
    // 颜色根据命中率变化
    if (accuracy >= 80) this.accuracyEl.style.color = '#0f0';
    else if (accuracy >= 50) this.accuracyEl.style.color = '#ff0';
    else this.accuracyEl.style.color = '#f00';
  }

  updateTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // 时间快到了变红
    if (seconds <= 10 && seconds > 0) {
      this.timerEl.style.color = '#ff4655';
    } else {
      this.timerEl.style.color = '#fff';
    }
  }

  showHitmarker(isKill) {
    this.hitmarker.className = '';
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add(isKill ? 'kill' : 'show');
  }

  showCombo(text) {
    this.comboText.textContent = text;
    this.comboText.className = '';
    void this.comboText.offsetWidth;
    this.comboText.classList.add('show');

    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.comboText.classList.remove('show');
    }, 1000);
  }

  addKillfeed(hitType, distance, damage, killed = true) {
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    const distStr = distance ? `${Math.round(distance)}m` : '';
    const dmgStr = damage ? `-${damage}` : '';
    const typeText = hitType === 'head' ? '💀爆头' : hitType === 'legs' ? '🦵腿部' : '🔫身体';
    entry.innerHTML = `${typeText} ${dmgStr} ${distStr}`;
    if (!killed) entry.style.borderLeftColor = '#ffaa00';
    this.killfeed.appendChild(entry);

    // 限制数量
    while (this.killfeed.children.length > 5) {
      this.killfeed.firstChild.remove();
    }

    clearTimeout(this.killfeedTimeout);
    this.killfeedTimeout = setTimeout(() => {
      if (entry.parentNode) entry.remove();
    }, 3000);
  }

  showModeComplete(result) {
    // 简单的完成提示
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 300;
    `;
    overlay.innerHTML = `
      <div style="text-align:center; color:#fff; background:rgba(20,20,20,0.95); padding:40px; border:2px solid #ff4655; border-radius:4px;">
        <h1 style="color:#ff4655; font-size:2rem; margin-bottom:15px;">完成!</h1>
        <p style="font-size:1.2rem;">击杀: <span style="color:#ff4655;">${result.kills}</span></p>
        <p style="font-size:1.2rem;">用时: <span style="color:#ff4655;">${result.time.toFixed(1)}s</span></p>
        <button id="restart-btn" style="margin-top:20px; padding:10px 30px; background:#ff4655; border:none; color:#fff; font-size:1rem; cursor:pointer; border-radius:3px;">再来一次</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#restart-btn').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  updateSensDisplay(sens, cm360) {
    if (this.sensHudVal) {
      this.sensHudVal.textContent = sens.toFixed(2);
    }
    if (this.sensHudCm) {
      this.sensHudCm.textContent = cm360.toFixed(1) + 'cm';
    }
  }

  showSensFlash() {
    if (!this.sensHudVal) return;
    this.sensHudVal.className = '';
    void this.sensHudVal.offsetWidth;
    this.sensHudVal.classList.add('sens-flash');
    clearTimeout(this.sensFlashTimer);
    this.sensFlashTimer = setTimeout(() => {
      this.sensHudVal.classList.remove('sens-flash');
    }, 500);
  }
}
