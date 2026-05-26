import * as THREE from 'three';

/**
 * 无畏契约靶场环境 + 碰撞体注册
 *
 * 玩家位置 Z=0，面朝 -Z
 * 靶子距离: 5  10  15  20  25  30m
 *         -5 -10 -15 -20 -25 -30
 */
export class Environment {
  constructor(scene, collision) {
    this.scene = scene;
    this.collision = collision;
    this.build();
  }

  build() {
    this._buildFloor();
    this._buildBoundaryWalls();
    this._buildPlatforms();
    this._buildCover();
    this._buildLaneMarkers();
    this._buildCeiling();
  }

  _buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(60, 120);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#c8c0b8', roughness: 0.8, metalness: 0.02 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -25);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const mat = new THREE.LineBasicMaterial({ color: '#b0a89a' });
    for (let i = -30; i <= 30; i += 2.5) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i, 0.005, -85), new THREE.Vector3(i, 0.005, 35)]);
      this.scene.add(new THREE.Line(g, mat));
    }
    for (let j = -85; j <= 35; j += 2.5) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-30, 0.005, j), new THREE.Vector3(30, 0.005, j)]);
      this.scene.add(new THREE.Line(g, mat));
    }
  }

  _buildBoundaryWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#8a8a90', roughness: 0.7, metalness: 0.2 });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), wallMat);
    backWall.position.set(0, 10, -85); this.scene.add(backWall);
    this._collBox(new THREE.Vector3(0, 10, -85), new THREE.Vector3(30, 10, 0.1));

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), wallMat);
    frontWall.position.set(0, 10, 35); this.scene.add(frontWall);
    this._collBox(new THREE.Vector3(0, 10, 35), new THREE.Vector3(30, 10, 0.1));

    const sideGeo = new THREE.PlaneGeometry(120, 20);
    const left = new THREE.Mesh(sideGeo, wallMat);
    left.rotation.y = Math.PI / 2; left.position.set(-30, 10, -25); this.scene.add(left);
    this._collBox(new THREE.Vector3(-30, 10, -25), new THREE.Vector3(0.1, 10, 60));

    const right = new THREE.Mesh(sideGeo, wallMat);
    right.rotation.y = -Math.PI / 2; right.position.set(30, 10, -25); this.scene.add(right);
    this._collBox(new THREE.Vector3(30, 10, -25), new THREE.Vector3(0.1, 10, 60));
  }

  _buildPlatforms() {
    const platMat = new THREE.MeshStandardMaterial({ color: '#b0a898', roughness: 0.6, metalness: 0.08 });

    [
      { z: -5,  w: 24 },
      { z: -10, w: 24 },
      { z: -15, w: 22 },
      { z: -20, w: 20 },
      { z: -25, w: 16 },
      { z: -30, w: 12 },
    ].forEach(p => {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.25, 2.5), platMat);
      plat.position.set(0, 0.125, p.z);
      plat.receiveShadow = true; plat.castShadow = true;
      this.scene.add(plat);
      // 平台可作为站立面（碰撞检测中作为地面处理）
      this.collision.addBox(
        new THREE.Vector3(0, 0.25, p.z),
        new THREE.Vector3(p.w / 2, 0.125, 1.25)
      );

      // 侧边高台
      [-p.w / 2 - 1, p.w / 2 + 1].forEach(x => {
        if (Math.abs(x) > 12) return;
        const side = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 2.5), platMat);
        side.position.set(x, 0.125, p.z);
        side.receiveShadow = true;
        this.scene.add(side);
        this.collision.addBox(
          new THREE.Vector3(x, 0.25, p.z),
          new THREE.Vector3(0.75, 0.125, 1.25)
        );
      });
    });
  }

  /**
   * 无畏契约靶场前方掩体：
   * - 一道横向低矮掩体（齐腰高）
   * - 两端有竖板
   */
  _buildCover() {
    const coverMat = new THREE.MeshStandardMaterial({ color: '#6a6a68', roughness: 0.5, metalness: 0.3 });

    // 主掩体横梁
    const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 0.35), coverMat);
    bar.position.set(0, 0.9, -0.8);
    bar.castShadow = true; bar.receiveShadow = true;
    this.scene.add(bar);
    this._collBox(new THREE.Vector3(0, 0.9, -0.8), new THREE.Vector3(7, 0.4, 0.18));

    // 掩体支柱
    [-5, -2, 2, 5].forEach(x => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 0.35), coverMat);
      pillar.position.set(x, 0.65, -0.8);
      pillar.castShadow = true;
      this.scene.add(pillar);
      this._collBox(new THREE.Vector3(x, 0.65, -0.8), new THREE.Vector3(0.13, 0.65, 0.18));
    });

    // 两端竖板
    [-7.5, 7.5].forEach(x => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 1.2), coverMat);
      panel.position.set(x, 0.9, -0.6);
      panel.castShadow = true;
      this.scene.add(panel);
      this._collBox(new THREE.Vector3(x, 0.9, -0.6), new THREE.Vector3(0.1, 0.9, 0.6));
    });
  }

  /**
   * 无畏契约靶场前方掩体（低矮横梁 + 支柱）
   */
  _buildSideBarriers() {
    const mat = new THREE.MeshStandardMaterial({ color: '#6a6a68', roughness: 0.5, metalness: 0.3 });

    for (let z = -12; z >= -32; z -= 10) {
      [-8.5, 8.5].forEach(x => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 8), mat);
        panel.position.set(x, 0.75, z);
        panel.castShadow = true;
        this.scene.add(panel);
        this._collBox(new THREE.Vector3(x, 0.75, z), new THREE.Vector3(0.1, 0.75, 4));
      });
    }
  }

  /**
   * 射击道分隔线（低矮的 lane divider）
   */
  _buildLaneDividers() {
    const mat = new THREE.MeshStandardMaterial({ color: '#ff4655', roughness: 0.3, emissive: '#220000', emissiveIntensity: 0.25 });

    [-5, 5].forEach(x => {
      for (let z = -28; z <= -8; z += 8) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 4), mat);
        m.position.set(x, 0.008, z);
        this.scene.add(m);
      }
    });

    // 距离标线
    const dm = new THREE.MeshStandardMaterial({ color: '#999', roughness: 0.4 });
    [5, 10, 15, 20, 25, 30].forEach(d => {
      const z = -d;
      const line = new THREE.Mesh(new THREE.BoxGeometry(12, 0.008, 0.08), dm);
      line.position.set(0, 0.004, z);
      this.scene.add(line);
      for (let i = 0; i < Math.floor(d / 5); i++) {
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.006, 0.3), dm);
        dot.position.set(-7 - i * 0.5, 0.003, z);
        this.scene.add(dot);
      }
    });
  }

  _buildLaneMarkers() {
    // 射击道标线
    const laneMat = new THREE.MeshStandardMaterial({ color: '#ff4655', roughness: 0.3, emissive: '#220000', emissiveIntensity: 0.25 });
    [-5, 5].forEach(x => {
      for (let z = -28; z <= -8; z += 8) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 4), laneMat);
        m.position.set(x, 0.008, z);
        this.scene.add(m);
      }
    });

    // 距离标线
    const dm = new THREE.MeshStandardMaterial({ color: '#999', roughness: 0.4 });
    [5, 10, 15, 20, 25, 30].forEach(d => {
      const z = -d;
      const line = new THREE.Mesh(new THREE.BoxGeometry(12, 0.008, 0.08), dm);
      line.position.set(0, 0.004, z);
      this.scene.add(line);
      for (let i = 0; i < Math.floor(d / 5); i++) {
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.006, 0.3), dm);
        dot.position.set(-7 - i * 0.5, 0.003, z);
        this.scene.add(dot);
      }
    });
  }

  _buildCeiling() {
    const beamMat = new THREE.MeshStandardMaterial({ color: '#707070', roughness: 0.5, metalness: 0.5 });
    for (let z = -75; z <= 25; z += 10) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 0.4), beamMat);
      beam.position.set(0, 18, z); beam.castShadow = true;
      this.scene.add(beam);
    }
    for (let z = -70; z <= 20; z += 15) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.12, 1.2),
        new THREE.MeshStandardMaterial({ color: '#ffe8c0', roughness: 0.3, emissive: '#ffe8c0', emissiveIntensity: 0.5 })
      );
      box.position.set(0, 17.5, z); this.scene.add(box);
      const light = new THREE.PointLight('#ffe8c0', 20, 35);
      light.position.set(0, 16, z); this.scene.add(light);
    }
  }

  _collBox(center, halfSize) {
    this.collision.addBox(center, halfSize);
  }
}
