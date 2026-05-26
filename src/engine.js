import * as THREE from 'three';

export class Engine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.deltaTime = 0;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._setupResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#d5d5dc');
    this.scene.fog = new THREE.Fog('#d5d5dc', 80, 250);
  }

  _initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const hFov = 103; // Valorant default horizontal FOV
    const vFov = 2 * Math.atan(Math.tan((hFov * Math.PI) / 360) / aspect) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(vFov, aspect, 0.1, 500);
    this.camera.position.set(0, 1.6, 0);
    this.camera.rotation.order = 'YXZ'; // Yaw first, then pitch
  }

  _initLights() {
    // 天空光 + 地面光（模拟自然光照）
    const hemi = new THREE.HemisphereLight('#b1c8e0', '#887766', 1.2);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight('#ffffff', 1.0);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight('#fff8e8', 4.5);
    sun.position.set(15, 25, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 120;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight('#c8d0ff', 1.2);
    fill.position.set(-15, 8, -5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight('#ffe0c0', 0.8);
    rim.position.set(0, 4, 15);
    this.scene.add(rim);
  }

  _setupResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.renderer.setSize(w, h);
      const aspect = w / h;
      const hFov = 103;
      const vFov = 2 * Math.atan(Math.tan((hFov * Math.PI) / 360) / aspect) * (180 / Math.PI);
      this.camera.fov = vFov;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    });
  }

  updateFov(hFov) {
    const aspect = window.innerWidth / window.innerHeight;
    const vFov = 2 * Math.atan(Math.tan((hFov * Math.PI) / 360) / aspect) * (180 / Math.PI);
    this.camera.fov = vFov;
    this.camera.updateProjectionMatrix();
  }

  setQuality(level) {
    const map = {
      low: { shadows: false, pixelRatio: 1, antialias: false },
      medium: { shadows: true, pixelRatio: 1.5, antialias: true },
      high: { shadows: true, pixelRatio: 2, antialias: true },
    };
    const s = map[level] || map.medium;
    this.renderer.shadowMap.enabled = s.shadows;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.pixelRatio));
  }

  tick() {
    this.deltaTime = this.clock.getDelta();
    this.renderer.render(this.scene, this.camera);
  }
}
