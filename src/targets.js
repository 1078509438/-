import * as THREE from 'three';

/**
 * Valorant 风格训练机器人模型
 *
 * 人形轮廓：头部(球) + 躯干(圆柱) + 双臂(圆柱) + 双腿(圆柱) + 底座
 * 材质：深灰主体 + 红色护甲板点缀
 */

const BODY_DARK   = new THREE.MeshStandardMaterial({ color: '#2c2c30', roughness: 0.45, metalness: 0.35 });
const BODY_LIGHT  = new THREE.MeshStandardMaterial({ color: '#3e3e44', roughness: 0.5, metalness: 0.3 });
const RED_ACCENT  = new THREE.MeshStandardMaterial({ color: '#cc3333', roughness: 0.3, metalness: 0.4, emissive: '#330000', emissiveIntensity: 0.4 });
const BASE_MAT    = new THREE.MeshStandardMaterial({ color: '#4a4a4e', roughness: 0.4, metalness: 0.6 });

function cyl(rT, rB, h, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, 12, 1), mat); }
function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), mat); }
function sph(r, mat) { return new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); }

function buildBotGroup() {
  const g = new THREE.Group();
  const hitbox = [];

  // ─── 底座 ───
  const base = cyl(0.18, 0.22, 0.10, BASE_MAT);
  base.position.y = 0.05;
  base.castShadow = true; base.receiveShadow = true;
  g.add(base);

  // ─── 腿 ───
  const lLeg = cyl(0.04, 0.045, 0.65, BODY_DARK);
  lLeg.position.set(-0.08, 0.38, 0);
  lLeg.castShadow = true;
  g.add(lLeg);

  const rLeg = cyl(0.04, 0.045, 0.65, BODY_DARK);
  rLeg.position.set(0.08, 0.38, 0);
  rLeg.castShadow = true;
  g.add(rLeg);

  // ─── 胯部 ───
  const hip = box(0.2, 0.08, 0.1, BODY_LIGHT);
  hip.position.set(0, 0.68, 0);
  hip.castShadow = true;
  g.add(hip);

  // ─── 躯干 ───
  const torso = cyl(0.12, 0.09, 0.55, BODY_DARK);
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  g.add(torso);
  // 碰撞盒（稍微放大以确保远距离命中判定，符合 FPS 游戏惯例）
  hitbox.push({ type: 'body', radius: 0.15, height: 0.58, centerY: 1.05 });

  // 胸部护甲
  const chestPlate = box(0.2, 0.16, 0.08, RED_ACCENT);
  chestPlate.position.set(0, 1.15, 0.08);
  g.add(chestPlate);

  // ─── 肩膀 ───
  const lShoulder = sph(0.05, BODY_LIGHT);
  lShoulder.position.set(-0.16, 1.28, 0);
  g.add(lShoulder);
  const rShoulder = sph(0.05, BODY_LIGHT);
  rShoulder.position.set(0.16, 1.28, 0);
  g.add(rShoulder);

  // ─── 手臂 ───
  const lArm = cyl(0.03, 0.035, 0.45, BODY_DARK);
  lArm.position.set(-0.16, 1.03, 0);
  lArm.castShadow = true;
  g.add(lArm);

  const rArm = cyl(0.03, 0.035, 0.45, BODY_DARK);
  rArm.position.set(0.16, 1.03, 0);
  rArm.castShadow = true;
  g.add(rArm);

  // ─── 脖子 ───
  const neck = cyl(0.035, 0.04, 0.06, BODY_LIGHT);
  neck.position.set(0, 1.34, 0);
  g.add(neck);

  // 头部
  const head = sph(0.09, BODY_DARK);
  head.position.set(0, 1.42, 0);
  head.castShadow = true;
  g.add(head);
  hitbox.push({ type: 'head', radius: 0.12, centerY: 1.42 });

  // 腿部碰撞盒（合成一个宽圆柱覆盖双腿）
  hitbox.push({ type: 'legs', radius: 0.16, height: 0.68, centerY: 0.38 });

  // 头部护甲/面罩
  const facePlate = box(0.085, 0.06, 0.04, RED_ACCENT);
  facePlate.position.set(0, 1.43, 0.08);
  g.add(facePlate);

  // 头顶指示器（小红灯）
  const indicator = sph(0.015, new THREE.MeshStandardMaterial({ color: '#ff3333', roughness: 0.2, emissive: '#ff0000', emissiveIntensity: 0.8 }));
  indicator.position.set(0, 1.52, 0);
  g.add(indicator);

  // ─── 高亮描边层 ───
  const outlineMat = new THREE.MeshBasicMaterial({
    color: '#ff4455',
    transparent: true,
    opacity: 0.6,
    depthTest: true,
    depthWrite: false,
    side: THREE.BackSide,
  });

  const outlineGroup = new THREE.Group();
  outlineGroup.name = 'outline';
  outlineGroup.visible = true;
  g.add(outlineGroup);

  // 为每个主要部件创建描边副本（放大 8%）
  g.children.forEach(child => {
    if (child === outlineGroup || !child.isMesh || !child.geometry) return;
    const outlineMesh = new THREE.Mesh(child.geometry, outlineMat);
    outlineMesh.position.copy(child.position);
    outlineMesh.rotation.copy(child.rotation);
    outlineMesh.scale.copy(child.scale).multiplyScalar(1.08);
    outlineMesh.userData._isOutline = true;
    outlineGroup.add(outlineMesh);
  });

  return { group: g, hitbox };
}

export class TargetManager {
  constructor(scene) {
    this.scene = scene;
    this.targets = [];
    this.parent = new THREE.Group();
    this.scene.add(this.parent);
  }

  createTarget(position, type = 'standard') {
    const { group, hitbox } = buildBotGroup();
    group.userData = {
      type,
      alive: true,
      hp: 150,
      maxHp: 150,
      hitbox: [],
      spawnAnim: 0,
      spawnDuration: 0.3,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeSpeed: 2 + Math.random() * 2,
      strafeBounds: 5,
      flySpeed: 3 + Math.random() * 4,
      flyHeight: 2 + Math.random() * 3,
      flyPhase: Math.random() * Math.PI * 2,
      points: type === 'flying' ? 3 : 1,
      hitFlash: 0, // 受击闪烁计时器
      _origColors: null,
    };

    hitbox.forEach(hb => {
      group.userData.hitbox.push({
        type: hb.type,
        radius: hb.radius,
        height: hb.height || hb.radius * 2,
        centerY: hb.centerY,
      });
    });

    group.position.copy(position);
    group.scale.set(0.01, 0.01, 0.01);
    this.parent.add(group);
    this.targets.push(group);
    return group;
  }

  raycast(raycaster) {
    let best = null;
    let bestDist = Infinity;

    for (const target of this.targets) {
      if (!target.userData.alive) continue;
      for (const hb of target.userData.hitbox) {
        const worldY = target.position.y + hb.centerY;
        const center = new THREE.Vector3(target.position.x, worldY, target.position.z);

        const hit = hb.type === 'head'
          ? this._raySphere(raycaster.ray, center, hb.radius)
          : this._rayCylinder(raycaster.ray, center, hb.radius, hb.height);

        if (hit && hit.distance < bestDist) {
          bestDist = hit.distance;
          best = { target, hitType: hb.type, position: hit.point.clone() };
        }
      }
    }
    return best;
  }

  /** 对靶子造成伤害，返回 { damage, killed, hitType } */
  damageTarget(target, hitType) {
    const DAMAGE = { head: 160, body: 40, legs: 32 };
    const dmg = DAMAGE[hitType] || 40;

    target.userData.hp = Math.max(0, target.userData.hp - dmg);
    target.userData.hitFlash = 0.12; // 受击闪烁

    const killed = target.userData.hp <= 0;
    if (killed) {
      target.userData.alive = false;
      target.userData.deathTime = performance.now() / 1000;
    }
    return { damage: dmg, killed, hitType };
  }

  _raySphere(ray, center, radius) {
    const oc = ray.origin.clone().sub(center);
    const a = ray.direction.lengthSq();
    const b = 2 * oc.dot(ray.direction);
    const c = oc.lengthSq() - radius * radius;
    const d = b * b - 4 * a * c;
    if (d < 0) return null;
    const t = (-b - Math.sqrt(d)) / (2 * a);
    if (t <= 0) return null;
    return { distance: t, point: ray.origin.clone().addScaledVector(ray.direction, t) };
  }

  _rayCylinder(ray, center, radius, height) {
    const halfH = height / 2;
    const top = center.y + halfH;
    const bottom = center.y - halfH;

    let bestT = Infinity, bestPt = null;

    // 顶球 + 底球
    for (const cy of [top, bottom]) {
      const pt = new THREE.Vector3(center.x, cy, center.z);
      const r = this._raySphere(ray, pt, radius);
      if (r && r.distance < bestT) { bestT = r.distance; bestPt = r.point; }
    }

    // 侧面
    const d = ray.direction;
    const o = ray.origin;
    const dxzLen = Math.sqrt(d.x * d.x + d.z * d.z);
    if (dxzLen > 0.0001) {
      const dirXZ = new THREE.Vector2(d.x / dxzLen, d.z / dxzLen);
      const offXZ = new THREE.Vector2(o.x - center.x, o.z - center.z);
      const tProj = -offXZ.dot(dirXZ);
      const closestXZ = new THREE.Vector2(offXZ.x + tProj * dirXZ.x, offXZ.y + tProj * dirXZ.y);
      const distXZ = closestXZ.length();
      if (distXZ <= radius + 0.001) {
        const chordHalf = Math.sqrt(Math.max(0, radius * radius - distXZ * distXZ));
        const tEntry = (tProj - chordHalf) / dxzLen;
        if (tEntry > 0) {
          const yHit = o.y + tEntry * d.y;
          if (yHit >= bottom && yHit <= top && tEntry < bestT) {
            bestT = tEntry;
            bestPt = new THREE.Vector3(o.x + tEntry * d.x, yHit, o.z + tEntry * d.z);
          }
        }
      }
    }

    if (!bestPt) return null;
    return { distance: bestT, point: bestPt };
  }

  killTarget(target) {
    if (!target.userData.alive) return;
    target.userData.alive = false;
    target.userData.deathTime = performance.now() / 1000;
  }

  clearAll() {
    for (const t of this.targets) this.parent.remove(t);
    this.targets = [];
  }

  update(delta) {
    const now = performance.now() / 1000;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];

      // 出生缩放
      if (t.userData.spawnAnim < t.userData.spawnDuration) {
        t.userData.spawnAnim += delta;
        t.scale.setScalar(Math.min(1, 1 - Math.pow(1 - t.userData.spawnAnim / t.userData.spawnDuration, 3)));
      } else {
        t.scale.setScalar(1);
      }

      // 死亡
      if (!t.userData.alive) {
        const dt = now - t.userData.deathTime;
        if (dt > 0.7) { this.parent.remove(t); this.targets.splice(i, 1); continue; }
        t.rotation.x = Math.min(dt / 0.4, 1) * Math.PI * 0.5;
        t.position.y = -Math.min(dt / 0.4, 1) * 0.4;
        continue;
      }

      // 受击闪烁
      if (t.userData.hitFlash > 0) {
        t.userData.hitFlash -= delta;
        // 简单闪烁：整体变亮
        const flash = t.userData.hitFlash > 0 ? 1.5 : 1;
        t.children.forEach(child => {
          if (child.material && child.material.emissive && !child.userData?._isIndicator) {
            child.material.emissiveIntensity = (child.material.emissiveIntensity || 0.3) * flash;
          }
        });
      }

      // 移动
      if (t.userData.type === 'strafe') {
        if (!t.userData._originX) t.userData._originX = t.position.x;
        t.position.x += t.userData.strafeDir * t.userData.strafeSpeed * delta;
        if (Math.abs(t.position.x - t.userData._originX) > t.userData.strafeBounds) t.userData.strafeDir *= -1;
      }
      if (t.userData.type === 'flying') {
        t.userData.flyPhase += delta * t.userData.flySpeed;
        t.position.y = t.userData.flyHeight + Math.sin(t.userData.flyPhase) * 2;
        t.position.x += Math.cos(t.userData.flyPhase * 0.7) * delta * 3;
        t.position.z += Math.sin(t.userData.flyPhase * 0.5) * delta * 2;
      }
    }
  }

  get aliveCount() { return this.targets.filter(t => t.userData.alive).length; }
}
