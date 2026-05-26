import * as THREE from 'three';

/**
 * AABB 碰撞检测系统
 * 用于玩家与场景障碍物之间的碰撞
 */
export class CollisionManager {
  constructor() {
    this.boxes = [];
  }

  /** 添加一个轴对齐碰撞盒 */
  addBox(center, halfSize) {
    this.boxes.push({
      min: center.clone().sub(halfSize),
      max: center.clone().add(halfSize),
    });
  }

  /**
   * 检测圆柱体（玩家）是否与碰撞盒相交
   * @param {THREE.Vector3} pos - 玩家底部中心位置
   * @param {number} radius - 玩家半径
   * @param {number} height - 玩家高度
   * @returns {{ collides: boolean, push: THREE.Vector3 }}
   */
  checkCollision(pos, radius = 0.3, height = 1.6) {
    const push = new THREE.Vector3();
    let collides = false;

    for (const box of this.boxes) {
      // AABB vs 竖直圆柱体
      const playerMin = pos.y;
      const playerMax = pos.y + height;

      // Y 轴重叠检测
      if (playerMax <= box.min.y || playerMin >= box.max.y) continue;

      // 找到盒子在 XZ 平面内距离圆柱中心最近的点
      const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));

      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        collides = true;
        const dist = Math.sqrt(distSq);
        if (dist < 0.0001) {
          push.x += radius;
        } else {
          const overlap = radius - dist;
          push.x += (dx / dist) * overlap;
          push.z += (dz / dist) * overlap;
        }
      }
    }

    return { collides, push };
  }

  /** 检查玩家是否站在某个表面上（地面/平台） */
  findGround(pos, radius = 0.3) {
    let groundY = -Infinity;

    for (const box of this.boxes) {
      // 玩家 XZ 与盒子顶面重叠？
      const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      if (dx * dx + dz * dz > radius * radius) continue;

      // 玩家底部低于盒子顶面 → 站在上面
      const topY = box.max.y;
      if (topY > groundY && pos.y >= topY - 0.15) {
        groundY = topY;
      }
    }

    return groundY;
  }
}
