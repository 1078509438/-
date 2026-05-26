import * as THREE from 'three';

const SPRAY = [
  { x: 0.00, y: 0.00 },{ x: 0.02, y: 0.22 },{ x: 0.04, y: 0.40 },
  { x: 0.07, y: 0.55 },{ x: 0.11, y: 0.65 },{ x: 0.18, y: 0.70 },
  { x: 0.28, y: 0.68 },{ x: 0.40, y: 0.60 },{ x: 0.50, y: 0.50 },
  { x: 0.42, y: 0.42 },{ x: 0.25, y: 0.36 },{ x: 0.05, y: 0.32 },
  { x:-0.15, y: 0.30 },{ x:-0.35, y: 0.29 },{ x:-0.20, y: 0.28 },
  { x: 0.02, y: 0.28 },{ x: 0.22, y: 0.28 },{ x: 0.38, y: 0.28 },
  { x: 0.22, y: 0.28 },{ x:-0.05, y: 0.28 },{ x:-0.25, y: 0.28 },
  { x: 0.05, y: 0.28 },
];
const MAX = SPRAY.length - 1;
function sprayAt(i) {
  if (i <= MAX) return SPRAY[i];
  const s = SPRAY[MAX];
  return { x: s.x + (Math.random() - 0.5) * 0.50, y: s.y + (Math.random() - 0.5) * 0.10 };
}

class TracerManager {
  constructor(scene) { this.scene = scene; this.tracers = []; }
  spawn(from, to, color) {
    const len = from.distanceTo(to);
    if (len < 0.01) return;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from).normalize();
    const geo = new THREE.CylinderGeometry(0.012, 0.004, len, 5, 1);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.userData = { life: 0.7, maxLife: 0.7 };
    this.scene.add(mesh);
    this.tracers.push(mesh);
  }
  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.userData.life -= dt;
      if (t.userData.life <= 0) { this.scene.remove(t); t.geometry.dispose(); t.material.dispose(); this.tracers.splice(i, 1); }
      else { const r = t.userData.life / t.userData.maxLife; t.material.opacity = r * 0.9; t.scale.set(1, 0.3 + r * 0.7, 1); }
    }
  }
}

export class Player {
  constructor(engine, sensitivity, targetManager, weaponModel, collision) {
    this.engine = engine;
    this.sensitivity = sensitivity;
    this.targetManager = targetManager;
    this.weaponModel = weaponModel;
    this.collision = collision;
    this.camera = engine.camera;
    this.raycaster = new THREE.Raycaster();
    this.tracers = new TracerManager(engine.scene);

    this.moveSpeed = 5.0;
    this.moveDir = new THREE.Vector3();
    this.keys = { w: false, a: false, s: false, d: false, shift: false, control: false, space: false };
    this.headBobPhase = 0; this.headBobAmount = 0;
    this.baseHeight = 1.6;
    this.playerRadius = 0.3;

    // 跳跃
    this.velocityY = 0;
    this.isGrounded = true;
    this.jumpVelocity = 5.5;
    this.gravity = 15;
    this.jumpCooldown = 0;

    this.isLocked = false;
    this.shooting = false;
    this.fireRate = 0.1026;
    this.lastFireTime = 0;
    this.sprayIndex = 0;
    this.lastShotTime = 0;

    this.shakePos = new THREE.Vector3();
    this.shakeRot = new THREE.Euler();
    this.shakeIntensity = 0;
    this.shakeSeed = 0;

    this.shotsFired = 0; this.shotsHit = 0;
    this.onHit = null; this.onMiss = null;

    this._setupPointerLock();
    this._setupInput();
    this._setupShooting();
  }

  _setupPointerLock() {
    const blocker = document.getElementById('blocker');
    const esc = document.getElementById('esc-menu');
    const canvas = this.engine.canvas;

    const tryLock = () => canvas.requestPointerLock();

    // 整个拦截层任意位置点击都触发
    blocker.addEventListener('click', tryLock);

    // Pointer Lock 状态变化
    document.addEventListener('pointerlockchange', () => {
      const was = this.isLocked;
      this.isLocked = document.pointerLockElement === canvas;
      if (this.isLocked) {
        blocker.classList.add('hidden');
        esc.classList.add('hidden');
      } else if (was) {
        esc.classList.remove('hidden');
        blocker.classList.add('hidden');
      }
    });
  }

  _setupInput() {
    const h = (e, d) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') { this.keys[k] = d; e.preventDefault(); }
      if (k === 'shift') { this.keys.shift = d; e.preventDefault(); }
      if (k === 'control') { this.keys.control = d; e.preventDefault(); }
      if (k === ' ') { this.keys.space = d; e.preventDefault(); }
    };
    window.addEventListener('keydown', e => h(e, true));
    window.addEventListener('keyup', e => h(e, false));

    document.addEventListener('mousemove', e => {
      if (!this.isLocked) return;
      this.camera.rotation.y -= this.sensitivity.countsToRadians(e.movementX || 0);
      this.camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.camera.rotation.x - this.sensitivity.countsToRadians(e.movementY || 0)));
    });
  }

  _setupShooting() {
    document.addEventListener('mousedown', e => { if (!this.isLocked || e.button !== 0) return; this.shooting = true; this._tryFire(); });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.shooting = false; });
  }

  // ═══════════ 移动 + 碰撞 + 跳跃 ═══════════
  _updateMovement(dt) {
    if (!this.isLocked) return;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion); right.y = 0; right.normalize();
    this.moveDir.set(0, 0, 0);
    if (this.keys.w) this.moveDir.add(fwd);
    if (this.keys.s) this.moveDir.sub(fwd);
    if (this.keys.d) this.moveDir.add(right);
    if (this.keys.a) this.moveDir.sub(right);
    if (this.moveDir.length() > 0) this.moveDir.normalize();

    let speed = this.moveSpeed;
    if (this.keys.shift) speed *= 1.3;
    if (this.keys.control) speed *= 0.4;

    const moveXZ = this.moveDir.clone().multiplyScalar(speed * dt);

    // 玩家圆柱体底部Y（脚底）
    const footY = this.camera.position.y - 1.55;

    // ─── 跳跃 ───
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);
    if (this.keys.space && this.isGrounded && this.jumpCooldown <= 0) {
      this.velocityY = this.jumpVelocity;
      this.isGrounded = false;
      this.jumpCooldown = 0.2;
    }

    // 重力
    if (!this.isGrounded) {
      this.velocityY -= this.gravity * dt;
    }

    // ─── XZ 碰撞检测 ───
    const testX = this.camera.position.clone().add(new THREE.Vector3(moveXZ.x, 0, 0));
    const testZ = this.camera.position.clone().add(new THREE.Vector3(0, 0, moveXZ.z));

    const colX = this.collision.checkCollision(
      new THREE.Vector3(testX.x, footY + 0.1, testX.z),
      this.playerRadius, 1.5
    );
    if (!colX.collides) {
      this.camera.position.x = testX.x;
    }

    const colZ = this.collision.checkCollision(
      new THREE.Vector3(testZ.x, footY + 0.1, testZ.z),
      this.playerRadius, 1.5
    );
    if (!colZ.collides) {
      this.camera.position.z = testZ.z;
    }

    // ─── Y (跳跃+重力) ───
    const newY = this.camera.position.y + this.velocityY * dt;

    // 地面/平台检测
    const groundY = this.collision.findGround(
      new THREE.Vector3(this.camera.position.x, footY, this.camera.position.z),
      this.playerRadius
    );

    if (groundY > -Infinity && newY <= groundY + 0.05 && this.velocityY <= 0) {
      this.camera.position.y = Math.max(this.baseHeight, groundY);
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.camera.position.y = Math.max(this.baseHeight, newY);
      if (this.camera.position.y <= this.baseHeight + 0.01) {
        this.camera.position.y = this.baseHeight;
        this.velocityY = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }

    // 头部摆动
    this.headBobAmount = this.isGrounded ? this.headBobAmount : 0;
    const moving = this.moveDir.length() > 0;
    if (moving && this.isGrounded) { this.headBobPhase += dt * 8; this.headBobAmount = 0.04; }
    else { this.headBobAmount *= 0.9; }
    this.camera.position.y += moving && this.isGrounded ? Math.sin(this.headBobPhase) * this.headBobAmount : 0;
  }

  // ═══════════ 射击 ═══════════
  _tryFire() {
    const now = performance.now() / 1000;
    if (now - this.lastFireTime < this.fireRate) return;
    this.lastFireTime = now;
    if (now - this.lastShotTime > 0.35) this.sprayIndex = 0;
    this.lastShotTime = now;

    const spray = sprayAt(this.sprayIndex);
    this.sprayIndex++;
    this.shotsFired++;

    this.shakeIntensity = Math.min(1, this.shakeIntensity + 0.25);
    this.shakeSeed += 0.73;

    if (this.weaponModel) { this.weaponModel.fire(); this.weaponModel.applyRecoilKick(0.06 + spray.y * 0.015); }

    const aimDir = this.camera.getWorldDirection(new THREE.Vector3());
    const bulletDir = aimDir.clone();
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    bulletDir.applyAxisAngle(camUp, -spray.x * (Math.PI / 180));
    bulletDir.applyAxisAngle(camRight, spray.y * (Math.PI / 180));

    // ─── 移动开火弹道偏移 ───
    // 移动速度越快偏移越大，静步/蹲下减小
    const moveAmount = this.moveDir.length(); // 0~1
    if (moveAmount > 0.01) {
      let moveSpreadDeg = 3.5; // 基础移动偏移角度
      if (this.keys.shift) moveSpreadDeg *= 1.4;     // 跑步更飘
      if (this.keys.control) moveSpreadDeg *= 0.25;  // 蹲下很稳
      if (!this.isGrounded) moveSpreadDeg *= 2.0;    // 跳起来最飘

      const spreadRad = moveAmount * moveSpreadDeg * (Math.PI / 180);
      bulletDir.applyAxisAngle(camRight, (Math.random() - 0.5) * spreadRad * 2);
      bulletDir.applyAxisAngle(camUp,    (Math.random() - 0.5) * spreadRad * 2);
    }

    const muzzlePos = this.camera.position.clone().add(aimDir.clone().multiplyScalar(0.42)).add(camRight.clone().multiplyScalar(0.24)).add(camUp.clone().multiplyScalar(-0.19));

    this.raycaster.set(this.camera.position, bulletDir);
    const hit = this.targetManager.raycast(this.raycaster);
    const traceEnd = hit ? hit.position.clone() : muzzlePos.clone().add(bulletDir.clone().multiplyScalar(200));
    this.tracers.spawn(muzzlePos, traceEnd, hit ? (hit.hitType === 'head' ? '#ff4444' : '#ffdd66') : '#ffaa33');

    if (hit) {
      const result = this.targetManager.damageTarget(hit.target, hit.hitType);
      if (result.killed) { this.shotsHit++; if (this.onHit) this.onHit({ ...hit, damage: result.damage, shotsFired: this.shotsFired, shotsHit: this.shotsHit }); }
      else { this.shotsHit++; if (this.onHit) this.onHit({ ...hit, damage: result.damage, killed: false, shotsFired: this.shotsFired, shotsHit: this.shotsHit }); }
    } else {
      if (this.onMiss) this.onMiss({ shotsFired: this.shotsFired, shotsHit: this.shotsHit });
    }
  }

  update(dt) {
    this.camera.position.sub(this.shakePos);
    this.camera.rotation.x -= this.shakeRot.x;
    this.camera.rotation.y -= this.shakeRot.y;

    this._updateMovement(dt);
    if (this.shooting) this._tryFire();

    const now = performance.now() / 1000;
    if (!this.shooting && now - this.lastShotTime > 0.35) this.sprayIndex = 0;

    if (!this.shooting) this.shakeIntensity *= Math.pow(0.0001, dt);
    else this.shakeIntensity *= Math.pow(0.06, dt);
    if (this.shakeIntensity < 0.001) this.shakeIntensity = 0;

    if (this.shakeIntensity > 0.001) {
      const sp = this.shakeIntensity * 0.08;
      const sr = this.shakeIntensity * 0.012;
      this.shakePos.set(Math.sin(this.shakeSeed * 13.7) * sp * 0.5, Math.sin(this.shakeSeed * 17.3 + 1.5) * sp, Math.sin(this.shakeSeed * 11.1 + 3.0) * sp * 0.4);
      this.shakeRot.set(Math.sin(this.shakeSeed * 19.1 + 2.0) * sr * 0.7, Math.cos(this.shakeSeed * 15.7 + 0.5) * sr, 0);
    } else { this.shakePos.set(0, 0, 0); this.shakeRot.set(0, 0, 0); }

    this.camera.position.add(this.shakePos);
    this.camera.rotation.x += this.shakeRot.x;
    this.camera.rotation.y += this.shakeRot.y;

    this.tracers.update(dt);
    if (this.weaponModel) this.weaponModel.update(dt);
  }

  showBlocker() {
    const el = document.getElementById('blocker-action');
    if (el) el.textContent = '点击返回游戏';
    document.getElementById('blocker').classList.remove('hidden');
  }

  resetStats() {
    this.shotsFired = 0; this.shotsHit = 0;
    this.lastFireTime = 0; this.sprayIndex = 0;
    this.shakeIntensity = 0; this.shakePos.set(0, 0, 0); this.shakeRot.set(0, 0, 0);
  }

  get accuracy() {
    if (this.shotsFired === 0) return 100;
    return Math.round((this.shotsHit / this.shotsFired) * 100);
  }
}
