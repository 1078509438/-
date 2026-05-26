/**
 * 音效系统
 *
 * 使用 Web Audio API 生成程序化音效
 * 无需外部音频文件
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.volume = 0.3;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 枪声
   */
  playGunshot() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // 噪声爆裂
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * decay * decay * 0.5;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // 低频咚
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.4 * this.volume, t);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    const gainOsc = this.ctx.createGain();
    gainOsc.gain.setValueAtTime(0.3 * this.volume, t);
    gainOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noise.connect(gainNoise).connect(this.ctx.destination);
    osc.connect(gainOsc).connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.15);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * 爆头击杀音效
   */
  playHeadshot() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // 清脆的"叮"声
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1800, t + 0.02);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * 身体击杀音效
   */
  playBodyshot() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    // 沉闷的"噗"声
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * 靶子出现音效
   */
  playSpawn() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15 * this.volume, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}
