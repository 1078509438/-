import * as THREE from 'three';

/**
 * 程序化纹理生成器
 * 生成 AK 风格的木质纹理、金属纹理，无需外部图片
 */
export function generateWoodTexture(width = 256, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 底色
  ctx.fillStyle = '#6b3a20';
  ctx.fillRect(0, 0, width, height);

  // 木纹线
  for (let i = 0; i < 80; i++) {
    const y = Math.random() * height;
    const alpha = 0.08 + Math.random() * 0.12;
    ctx.strokeStyle = `rgba(30,10,0,${alpha})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + Math.sin(x * 0.05) * 1.5);
    }
    ctx.stroke();
  }

  // 亮纹
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * height;
    ctx.strokeStyle = `rgba(180,140,100,${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < width; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 2);
    }
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

export function generateMetalTexture(width = 256, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 底色（发蓝钢）
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(0, 0, width, height);

  // 金属拉丝纹
  for (let i = 0; i < 120; i++) {
    const y = Math.random() * height;
    ctx.strokeStyle = `rgba(60,60,70,${0.05 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }

  // 轻微磨损斑点
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 2 + Math.random() * 6;
    ctx.fillStyle = `rgba(80,80,90,${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 暗色氧化斑
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = `rgba(10,10,15,${0.05 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, 3 + Math.random() * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * 生成武器整体贴图（512x128 长条，从左到右：枪管→护木→机匣→枪托）
 */
export function generateWeaponAtlas() {
  const w = 512, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  // ── 枪管段 (0-100) ──
  ctx.fillStyle = '#222228';
  ctx.fillRect(0, 20, 100, 88);
  // 金属拉丝
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(80,80,90,0.06)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(i * 3, 20); ctx.lineTo(i * 3, h); ctx.stroke();
  }

  // ── 护木段 (100-230) 木质 ──
  ctx.fillStyle = '#6b3a20';
  ctx.fillRect(100, 15, 130, 98);
  for (let i = 0; i < 60; i++) {
    const y = 15 + Math.random() * 98;
    ctx.strokeStyle = `rgba(30,10,0,${0.06 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.5;
    ctx.beginPath(); ctx.moveTo(100, y);
    for (let x = 100; x <= 230; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 2.5);
    ctx.stroke();
  }
  // 金色散热孔
  for (let x = 120; x < 220; x += 22) {
    ctx.fillStyle = '#c8a840';
    ctx.fillRect(x, 50, 10, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 1, 51, 8, 6);
  }

  // ── 机匣段 (230-380) 金属 ──
  ctx.fillStyle = '#282830';
  ctx.fillRect(230, 10, 150, 108);
  for (let i = 0; i < 50; i++) {
    ctx.strokeStyle = `rgba(70,70,80,0.05)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(230 + i * 3, 10); ctx.lineTo(230 + i * 3, 118); ctx.stroke();
  }
  // 铆钉
  [[250, 30], [350, 30], [250, 90], [350, 90]].forEach(([rx, ry]) => {
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#777';
    ctx.beginPath(); ctx.arc(rx - 1, ry - 1, 2, 0, Math.PI * 2); ctx.fill();
  });

  // ── 弹匣段 (380-450) 黑铁 ──
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(380, 30, 70, 70);
  // 加强筋
  for (let y = 40; y < 90; y += 12) {
    ctx.fillStyle = '#d4a840';
    ctx.fillRect(382, y, 66, 3);
  }

  // ── 枪托段 (450-512) 木质 ──
  ctx.fillStyle = '#5a3018';
  ctx.fillRect(450, 25, 62, 78);
  for (let i = 0; i < 30; i++) {
    const y = 25 + Math.random() * 78;
    ctx.strokeStyle = `rgba(20,8,0,0.08)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(450, y);
    for (let x = 450; x <= 512; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 1.8);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
