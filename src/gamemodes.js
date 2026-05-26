import * as THREE from 'three';

/**
 * 游戏模式管理
 *
 * - elim50 / elim100: 单靶逐个击杀模式（打掉一个刷新下一个）
 * - timed30 / timed60: 多靶限时模式
 * - flying / strafe: 特殊靶模式
 */
export class GameModeManager {
  constructor(targetManager) {
    this.targetManager = targetManager;
    this.mode = null;
    this.active = false;
    this.killCount = 0;
    this.timeLeft = 0;
    this.timeElapsed = 0;
    this.startTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.5;
    this.maxActiveTargets = 5;
    this.spawnPositions = [];
    this._lastSpawnIdx = -1;

    this.onComplete = null;
    this.onKill = null;
    this.onTick = null;

    this._generateSpawnPositions();
  }

  _generateSpawnPositions() {
    const add = (x, z) => this.spawnPositions.push(new THREE.Vector3(x, 0.13, z));

    // ─── 无畏契约靶场实际站位分布 ───
    // 5m (近距，横排全覆盖)
    for (let x = -10; x <= 10; x += 2) add(x, -5);
    // 8m
    for (let x = -9; x <= 9; x += 3) add(x, -8);
    // 10m
    for (let x = -10; x <= 10; x += 2.5) add(x, -10);
    // 12m
    for (let x = -8; x <= 8; x += 4) add(x, -12);
    // 15m
    for (let x = -10; x <= 10; x += 4) add(x, -15);
    // 18m
    for (let x = -7; x <= 7; x += 3.5) add(x, -18);
    // 20m
    for (let x = -8; x <= 8; x += 4) add(x, -20);
    // 22m
    for (let x = -6; x <= 6; x += 4) add(x, -22);
    // 25m
    for (let x = -6; x <= 6; x += 4) add(x, -25);
    // 28m
    for (let x = -5; x <= 5; x += 5) add(x, -28);
    // 30m
    for (let x = -4; x <= 4; x += 4) add(x, -30);
  }

  start(mode) {
    this.mode = mode;
    this.active = true;
    this.killCount = 0;
    this.timeElapsed = 0;
    this.spawnTimer = 0;
    this._lastSpawnIdx = -1;
    this.startTime = performance.now() / 1000;
    this.targetManager.clearAll();

    const isElim = mode === 'elim50' || mode === 'elim100';
    const isTimed = mode === 'timed30' || mode === 'timed60';

    if (isElim) {
      this.maxActiveTargets = 1;
      this.timeLeft = Infinity;
      this._spawnNext();
    } else if (isTimed) {
      this.maxActiveTargets = mode === 'timed30' ? 5 : 5;
      this.spawnInterval = 0.35;
      this.timeLeft = mode === 'timed30' ? 30 : 60;
      this._spawnBurst(3);
    } else if (mode === 'flying') {
      this.maxActiveTargets = 2;
      this.spawnInterval = 1.8;
      this.timeLeft = Infinity;
      this._spawnBurst(2);
    } else if (mode === 'strafe') {
      this.maxActiveTargets = 3;
      this.spawnInterval = 0.7;
      this.timeLeft = Infinity;
      this._spawnBurst(3);
    }
  }

  stop() {
    this.active = false;
    this.targetManager.clearAll();
    this.mode = null;
  }

  _spawnBurst(count) {
    for (let i = 0; i < count; i++) this._spawnRandom();
  }

  /** 随机选一个位置生成靶子，避免与上一个位置相同 */
  _spawnRandom() {
    const pool = this.spawnPositions;
    let idx;
    do { idx = Math.floor(Math.random() * pool.length); }
    while (idx === this._lastSpawnIdx && pool.length > 1);
    this._lastSpawnIdx = idx;

    const pos = pool[idx].clone();
    pos.x += (Math.random() - 0.5) * 1.5;
    pos.z += (Math.random() - 0.5) * 1.5;

    let type = 'standard';
    if (this.mode === 'flying') type = 'flying';
    else if (this.mode === 'strafe') type = 'strafe';

    const target = this.targetManager.createTarget(pos, type);
    target.userData.spawnAnim = 0;
    return target;
  }

  /** 击杀模式专用：清掉旧靶子，刷新一个新靶子 */
  _spawnNext() {
    // 移除场上所有靶子（含已死亡尚未清除的）
    this.targetManager.clearAll();
    this._spawnRandom();
  }

  registerKill() {
    this.killCount++;

    if (this.onKill) this.onKill({ total: this.killCount, mode: this.mode });

    // 消灭模式完成检查
    const isElim = this.mode === 'elim50' || this.mode === 'elim100';
    const target = this.mode === 'elim50' ? 50 : this.mode === 'elim100' ? 100 : -1;

    if (isElim && this.killCount >= target) {
      this.active = false;
      if (this.onComplete) {
        this.onComplete({ kills: this.killCount, time: this.timeElapsed, mode: this.mode });
      }
      return;
    }

    // 单靶模式：击杀后立即刷新下一个
    if (isElim) {
      this._spawnNext();
    }
  }

  update(delta) {
    if (!this.active) return;

    this.timeElapsed = performance.now() / 1000 - this.startTime;

    // 限时模式倒计时
    if (this.mode === 'timed30' || this.mode === 'timed60') {
      this.timeLeft -= delta;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.active = false;
        if (this.onComplete) {
          this.onComplete({ kills: this.killCount, time: this.mode === 'timed30' ? 30 : 60, mode: this.mode });
        }
        return;
      }
    }

    // 非单靶模式：自动补充靶子
    const isElim = this.mode === 'elim50' || this.mode === 'elim100';
    if (!isElim) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const aliveCount = this.targetManager.targets.filter(t => t.userData.alive).length;
        if (aliveCount < this.maxActiveTargets) {
          this._spawnBurst(Math.min(2, this.maxActiveTargets - aliveCount));
        }
      }
    }

    if (this.onTick) {
      this.onTick({ kills: this.killCount, timeLeft: this.timeLeft, timeElapsed: this.timeElapsed, mode: this.mode });
    }
  }
}
