/**
 * 无畏契约灵敏度换算核心
 *
 * 原理：
 * - 浏览器 Pointer Lock API 提供原始 mouse delta
 * - Valorant 每 mouse count 旋转 = sensitivity × m_yaw (≈0.055°)
 * - cm/360° = (360 × 2.54) / (DPI × sensitivity × 0.055)
 */

const VALORANT_M_YAW = 0.055;

/**
 * 各游戏 → Valorant 转换系数
 * Valorant_sens = Other_sens / ratio  (ratio > 1 表示原游戏灵敏度数值更大)
 */
const GAME_RATIOS = {
  valorant:  1.0,
  cs2:       3.18,
  csgo:      3.18,
  cs16:      3.18,
  cssource:  3.18,
  apex:      3.18,
  tf2:       3.18,
  titanfall2:3.18,
  quake:     3.18,
  quake_live:3.18,
  splitgate: 3.18,
  finvals:   3.18,
  xdefiant:  3.18,
  halo:      3.18,
  destiny2:  3.18,
  fortnite:  3.18,
  ow2:       10.6,
  paladins:  10.6,
  r6:        0.274,
  cod:       3.33,
  cod_warzone:3.33,
  battlefield:2.65,
  pubg:      0.24,
  tarkov:    0.53,
  rust:      3.18,
  dayz:      3.18,
  arma3:     3.18,
  insurgency:3.18,
  squad:     2.0,
  hellletloose:2.0,
};

const GAME_NAMES = {
  valorant:  '无畏契约 (Valorant)',
  cs2:       'CS2 / CS:GO',
  csgo:      'CS:GO',
  cs16:      'CS 1.6',
  cssource:  'CS: Source',
  apex:      'Apex Legends',
  tf2:       '军团要塞 2',
  titanfall2:'Titanfall 2',
  quake:     'Quake 系列',
  quake_live:'Quake Live',
  splitgate: 'Splitgate',
  finvals:   'THE FINALS',
  xdefiant:  '不羁联盟',
  halo:      '光环 无限',
  destiny2:  '命运 2',
  fortnite:  '堡垒之夜',
  ow2:       '守望先锋 2',
  paladins:  '枪火游侠',
  r6:        '彩虹六号：围攻',
  cod:       '使命召唤',
  cod_warzone:'使命召唤：战区',
  battlefield:'战地风云 2042/V',
  pubg:      '绝地求生',
  tarkov:    '逃离塔科夫',
  rust:      'Rust',
  dayz:      'DayZ',
  arma3:     '武装突袭 3',
  insurgency:'叛乱：沙漠风暴',
  squad:     '战术小队',
  hellletloose:'人间地狱',
};

// 游戏分组（用于 UI 展示）
const GAME_GROUPS = [
  {
    label: 'Valve / Source 引擎',
    games: ['cs2', 'csgo', 'cs16', 'cssource', 'tf2', 'portal', 'l4d2', 'half_life'],
    ratio: 3.18,
  },
  {
    label: '热门竞技 FPS',
    games: ['apex', 'titanfall2', 'ow2', 'paladins', 'r6', 'cod', 'cod_warzone', 'xdefiant', 'finvals', 'splitgate'],
    ratio: null,
  },
  {
    label: '战术射击',
    games: ['pubg', 'tarkov', 'battlefield', 'squad', 'hellletloose', 'insurgency', 'arma3'],
    ratio: null,
  },
  {
    label: '生存 / 其他',
    games: ['rust', 'dayz', 'halo', 'destiny2', 'fortnite', 'quake', 'quake_live'],
    ratio: null,
  },
];

// 为没有单独 ratio 的游戏补上默认值（都在组里声明过了）
GAME_GROUPS.forEach(group => {
  group.games.forEach(id => {
    if (!GAME_RATIOS[id] && group.ratio) {
      GAME_RATIOS[id] = group.ratio;
    }
    if (!GAME_NAMES[id]) {
      GAME_NAMES[id] = id;
    }
  });
});

export { VALORANT_M_YAW, GAME_RATIOS, GAME_NAMES, GAME_GROUPS };

export class Sensitivity {
  constructor(dpi = 800, inGameSens = 0.5) {
    this.dpi = dpi;
    this.inGameSens = inGameSens;
  }

  get edpi() {
    return Math.round(this.dpi * this.inGameSens);
  }

  get cmPer360() {
    const countsPerDegree = 1 / (this.inGameSens * VALORANT_M_YAW);
    const countsPer360 = countsPerDegree * 360;
    const inchesPer360 = countsPer360 / this.dpi;
    return inchesPer360 * 2.54;
  }

  countsToRadians(counts) {
    const degrees = counts * this.inGameSens * VALORANT_M_YAW;
    return degrees * (Math.PI / 180);
  }

  update(dpi, inGameSens) {
    this.dpi = dpi;
    this.inGameSens = inGameSens;
  }

  adjust(delta) {
    const newSens = Math.max(0.01, Math.min(10, this.inGameSens + delta));
    this.inGameSens = Math.round(newSens * 100) / 100;
    return this.inGameSens;
  }

  static calcSensFromCm360(dpi, cm360) {
    const inches360 = cm360 / 2.54;
    const countsPer360 = inches360 * dpi;
    const sens = 360 / (countsPer360 * VALORANT_M_YAW);
    return Math.round(sens * 1000) / 1000;
  }

  static fromCm360(dpi, cm360) {
    return new Sensitivity(dpi, Sensitivity.calcSensFromCm360(dpi, cm360));
  }

  static convertFromGame(game, dpi, otherSens) {
    const ratio = GAME_RATIOS[game];
    if (!ratio) throw new Error(`Unknown game: ${game}`);
    const valorantSens = Math.round((otherSens / ratio) * 1000) / 1000;
    const sens = new Sensitivity(dpi, valorantSens);
    return { valorantSens, cm360: sens.cmPer360, edpi: sens.edpi };
  }

  static get supportedGames() {
    return Object.entries(GAME_RATIOS).map(([id, ratio]) => ({
      id,
      name: GAME_NAMES[id] || id,
      ratio,
    }));
  }
}
