import * as THREE from 'three';
import { generateWoodTexture, generateMetalTexture } from './textures.js';

// ─── Canvas 生成纹理 ───
const texWood  = generateWoodTexture(256, 128);
const texMetal = generateMetalTexture(256, 64);

// ─── AK 风格材质（带纹理） ───
const BLUED   = new THREE.MeshStandardMaterial({ map: texMetal, color: '#3a3a40', roughness: 0.35, metalness: 0.85 });
const PARKER  = new THREE.MeshStandardMaterial({ map: texMetal, color: '#3e3e3c', roughness: 0.45, metalness: 0.7 });
const WOOD    = new THREE.MeshStandardMaterial({ map: texWood,  color: '#7a4a30', roughness: 0.55, metalness: 0.02 });
const WOOD_D  = new THREE.MeshStandardMaterial({ map: texWood,  color: '#5a3018', roughness: 0.6,  metalness: 0.02 });
const IRON    = new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.5,  metalness: 0.55 });
const GOLDEN  = new THREE.MeshStandardMaterial({ color: '#d4a840', roughness: 0.15, metalness: 0.95 });
const GLOW    = new THREE.MeshStandardMaterial({ color: '#44ff88', roughness: 0.1,  metalness: 0.2,  emissive: '#114422', emissiveIntensity: 0.5 });
const FLASH   = new THREE.MeshBasicMaterial({ color: '#ffdd88', transparent: true, opacity: 0 });
const FLASH_R = new THREE.MeshBasicMaterial({ color: '#ffcc44', transparent: true, opacity: 0 });

function bx(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 3, 3, 3), m); }
function cy(rT, rB, h, s, m) { return new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, s || 16, 2), m); }

export class WeaponModel {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.visible = false;
    this._recoilKick = 0;
    this.muzzleTimer = 0;
    this._casings = [];
    this._build();
    this.scene.add(this.group);
  }

  _build() {
    const g = this.group;

    // ═══════════ 枪管 + 导气管 ═══════════
    const barrel = cy(0.007, 0.007, 0.55, 16, BLUED);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.48);
    g.add(barrel);

    // 导气管（AK 标志性特征）
    const gasTube = cy(0.006, 0.007, 0.30, 12, PARKER);
    gasTube.rotation.z = Math.PI / 2;
    gasTube.position.set(0, 0.062, -0.30);
    g.add(gasTube);

    // 导气箍
    const gasBlock = bx(0.016, 0.014, 0.025, IRON);
    gasBlock.position.set(0, 0.05, -0.42);
    g.add(gasBlock);

    // 通条（AK 枪管下方细杆）
    const rod = cy(0.002, 0.002, 0.35, 8, IRON);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 0.026, -0.48);
    g.add(rod);

    // 准星座
    const sightBlock = bx(0.014, 0.018, 0.02, PARKER);
    sightBlock.position.set(0, 0.055, -0.65);
    g.add(sightBlock);

    // 准星护圈（AK 环形准星）
    const hoodRing = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 8, 12), IRON);
    hoodRing.position.set(0, 0.07, -0.66);
    g.add(hoodRing);

    // 准星柱
    const post = cy(0.0015, 0.0015, 0.01, 6, GLOW);
    post.position.set(0, 0.063, -0.66);
    g.add(post);

    // 枪口装置（斜切制退器）
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.08, 8, 1), PARKER);
    brake.rotation.z = Math.PI / 2;
    brake.position.set(0, 0.042, -0.76);
    g.add(brake);

    // 制退器切面
    const slant = bx(0.014, 0.012, 0.015, IRON);
    slant.position.set(0, 0.048, -0.80);
    slant.rotation.x = 0.3;
    g.add(slant);

    // ═══════════ 护木（木质） ═══════════
    const hgUpper = bx(0.024, 0.018, 0.22, WOOD);
    hgUpper.position.set(0, 0.055, -0.35);
    g.add(hgUpper);

    const hgLower = bx(0.026, 0.015, 0.22, WOOD_D);
    hgLower.position.set(0, 0.035, -0.35);
    g.add(hgLower);

    // 护木散热孔（金色装饰环）
    for (let i = 0; i < 4; i++) {
      const hole = bx(0.016, 0.003, 0.008, IRON);
      hole.position.set(0, 0.046, -0.42 + i * 0.05);
      g.add(hole);
    }

    // 护木金箍（首尾各一）
    [-0.45, -0.25].forEach(z => {
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0025, 8, 12), GOLDEN);
      clamp.rotation.x = Math.PI / 2;
      clamp.position.set(0, 0.044, z);
      g.add(clamp);
    });

    // ═══════════ 机匣 ═══════════
    // 机匣主体（AK 标志性铣削机匣 —— 上方半圆，不是纯方形）
    const receiver = bx(0.032, 0.04, 0.28, PARKER);
    receiver.position.set(0, 0.055, -0.08);
    g.add(receiver);

    // 机匣盖（dust cover）
    const dustCover = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.22, 12, 1, false, 0, Math.PI), PARKER);
    dustCover.rotation.z = Math.PI / 2;
    dustCover.position.set(0, 0.076, -0.06);
    g.add(dustCover);

    // 机匣铆钉
    [[-0.02, -0.03], [0.06, -0.03], [-0.02, 0.14], [0.06, 0.14]].forEach(([z, yOff]) => {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 4), IRON);
      rivet.position.set(0.017, 0.055 + yOff, z);
      g.add(rivet);
    });

    // 照门座
    const rearBlock = bx(0.018, 0.012, 0.025, PARKER);
    rearBlock.position.set(0, 0.076, 0.12);
    g.add(rearBlock);

    // 照门缺口
    const rearNotch = bx(0.004, 0.008, 0.006, IRON);
    rearNotch.position.set(0, 0.083, 0.12);
    g.add(rearNotch);

    // 拉机柄（AK 右侧标志性大拉机柄）
    const chHandle = bx(0.008, 0.008, 0.04, IRON);
    chHandle.position.set(0.022, 0.06, 0.02);
    g.add(chHandle);
    const chKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 8), IRON);
    chKnob.rotation.z = Math.PI / 2;
    chKnob.position.set(0.03, 0.06, 0.02);
    g.add(chKnob);

    // ═══════════ 弹匣（AK 标志性弧形） ═══════════
    const magGroup = new THREE.Group();
    magGroup.position.set(0, 0.02, -0.05);
    magGroup.rotation.x = -0.18;

    // 弹匣主体（模拟弧度用多段BOX）
    for (let i = 0; i < 5; i++) {
      const seg = bx(0.018, 0.028, 0.03, IRON);
      seg.position.set(0, -0.085 + i * 0.028, i * 0.012);
      seg.rotation.x = i * 0.06;
      magGroup.add(seg);
    }

    // 弹匣加强筋
    for (let i = 0; i < 4; i++) {
      const rib = bx(0.02, 0.004, 0.032, GOLDEN);
      rib.position.set(0, -0.072 + i * 0.028, i * 0.012 + 0.015);
      magGroup.add(rib);
    }

    // 弹匣底板
    const magFloor = bx(0.022, 0.008, 0.035, PARKER);
    magFloor.position.set(0, 0.055, 0.065);
    magGroup.add(magFloor);

    g.add(magGroup);

    // ═══════════ 握把（木质手枪握把） ═══════════
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.1, 0.035, 3, 5, 3), WOOD);
    grip.position.set(0, -0.01, 0.07);
    grip.rotation.x = 0.35;
    g.add(grip);

    // 握把金环
    const gripRing = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.002, 8, 12), GOLDEN);
    gripRing.rotation.x = Math.PI / 2;
    gripRing.position.set(0, 0.035, 0.04);
    g.add(gripRing);

    // 握把底板
    const gripPlate = bx(0.025, 0.008, 0.04, GOLDEN);
    gripPlate.position.set(0, -0.05, 0.1);
    gripPlate.rotation.x = 0.35;
    g.add(gripPlate);

    // 扳机护圈（AK 大护圈）
    const tGuard = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 12, Math.PI * 1.2), PARKER);
    tGuard.position.set(0, 0.015, 0.025);
    tGuard.rotation.x = Math.PI / 2;
    tGuard.rotation.z = Math.PI;
    g.add(tGuard);

    // 扳机
    const trigger = bx(0.005, 0.016, 0.005, GOLDEN);
    trigger.position.set(0, 0.022, 0.048);
    g.add(trigger);

    // 快慢机/保险（AK 右侧大拨片）
    const safety = bx(0.003, 0.035, 0.018, PARKER);
    safety.position.set(0.022, 0.05, -0.02);
    g.add(safety);

    // ═══════════ 枪托（木质） ═══════════
    // 上梁
    const stockTop = bx(0.014, 0.02, 0.22, WOOD);
    stockTop.position.set(0, 0.06, 0.22);
    g.add(stockTop);

    // 下梁
    const stockBot = bx(0.012, 0.016, 0.22, WOOD_D);
    stockBot.position.set(0, 0.04, 0.22);
    g.add(stockBot);

    // 枪托金环
    [0.14, 0.21, 0.28].forEach(z => {
      const sRing = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.002, 8, 12), GOLDEN);
      sRing.rotation.y = Math.PI / 2;
      sRing.position.set(0, 0.05, z);
      g.add(sRing);
    });

    // 枪托底板（金属 buttplate）
    const butt = bx(0.026, 0.04, 0.01, PARKER);
    butt.position.set(0, 0.05, 0.34);
    g.add(butt);

    // ═══════════ 枪口火焰 ═══════════
    const fGeo = new THREE.SphereGeometry(0.018, 8, 6);
    this.muzzleFlash = new THREE.Mesh(fGeo, FLASH);
    this.muzzleFlash.position.set(0, 0.044, -0.82);
    g.add(this.muzzleFlash);

    const rGeo = new THREE.CylinderGeometry(0.005, 0.014, 0.14, 6);
    this.muzzleFlashRay = new THREE.Mesh(rGeo, FLASH_R);
    this.muzzleFlashRay.rotation.x = Math.PI / 2;
    this.muzzleFlashRay.position.set(0, 0.044, -0.88);
    g.add(this.muzzleFlashRay);
  }

  show(v = true) { this.group.visible = v; if (v) this._updateTransform(); }
  hide() { this.group.visible = false; }

  fire() {
    if (this.muzzleFlash) { this.muzzleFlash.material.opacity = 1; this.muzzleFlash.scale.setScalar(1.6); this.muzzleTimer = 0.06; }
    if (this.muzzleFlashRay) this.muzzleFlashRay.material.opacity = 0.9;
    this._spawnCasing();
  }

  applyRecoilKick(k) { this._recoilKick = Math.min(1, this._recoilKick + k); }

  _spawnCasing() {
    const geo = new THREE.CylinderGeometry(0.004, 0.005, 0.024, 8);
    const mat = new THREE.MeshStandardMaterial({ color: '#ccaa44', roughness: 0.3, metalness: 0.9, emissive: '#220000', emissiveIntensity: 0.4 });
    const c = new THREE.Mesh(geo, mat);
    const pos = this.group.position.clone();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    c.position.copy(pos).add(right.clone().multiplyScalar(0.04));
    c.userData = { life: 1.2, vel: right.clone().multiplyScalar(0.8 + Math.random()).add(up.clone().multiplyScalar(0.4 + Math.random())), rotSpeed: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12) };
    this.scene.add(c);
    this._casings.push(c);
  }

  update(delta) {
    if (!this.group.visible) return;
    this._updateTransform();

    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= delta;
      const t = Math.max(0, this.muzzleTimer / 0.06);
      this.muzzleFlash.material.opacity = t;
      this.muzzleFlash.scale.setScalar(1 + t * 0.6);
      this.muzzleFlashRay.material.opacity = t * 0.9;
    }

    this._recoilKick *= Math.pow(0.004, delta);

    for (let i = this._casings.length - 1; i >= 0; i--) {
      const c = this._casings[i];
      c.userData.life -= delta;
      if (c.userData.life <= 0) { this.scene.remove(c); c.geometry.dispose(); c.material.dispose(); this._casings.splice(i, 1); continue; }
      c.userData.vel.y -= 9.8 * delta;
      c.position.add(c.userData.vel.clone().multiplyScalar(delta));
      c.rotation.x += c.userData.rotSpeed.x * delta;
      c.rotation.y += c.userData.rotSpeed.y * delta;
      c.rotation.z += c.userData.rotSpeed.z * delta;
    }
  }

  _updateTransform() {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const pos = this.camera.position.clone().add(dir.clone().multiplyScalar(0.42)).add(right.clone().multiplyScalar(0.24)).add(up.clone().multiplyScalar(-0.19));
    if (this._recoilKick > 0.002) { pos.sub(dir.clone().multiplyScalar(this._recoilKick * 0.08)); pos.add(up.clone().multiplyScalar(this._recoilKick * 0.04)); }
    this.group.position.copy(pos);
    this.group.quaternion.copy(this.camera.quaternion);
  }
}
