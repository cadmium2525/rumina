// ステージの描画（背景・タイル）
import { gridToCanvas } from './sprites.js';
import { PAL_OBJ, TURN, STONE, QUESTION, USED } from './art.js';
import { SCREEN_W, SCREEN_H, GROUND_Y, TILE, isSlope, slopeK, isCeilingSlope } from './level.js';
import { SLOPE_SHAPE } from './smw_tables.js';

const TILE_PAL = {
  K: '#2a1c14', G: '#58c048', g: '#2f8a34', l: '#a8ec70',
  D: '#c88a48', d: '#9a5e2c', e: '#e8b070', x: '#6e3e1c',
  W: '#fff8e0', B: '#4470d0',
};
const GRASS = [
  'llllllllllllllll',
  'GGlGGGGGlGGGGlGG',
  'GGGGGGGGGGGGGGGG',
  'GgGGGGgGGGGgGGGG',
  'gKgGGgKgGGgKgGGg',
  'KDKgGKDKggKDKgGK',
  'DDDKgKDDKKDDDKgK',
  'DeDDKDDeDDDeDDKD',
  'DDDDDDDDDDDDDDDD',
  'DDdDDDDDDDdDDDDD',
  'DDDDDDeDDDDDDDDD',
  'DDDDDDDDDdDDDDDD',
  'DdDDDDDDDDDDDeDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDeDDDDDDdDDDD',
  'DDDDDDDDDDDDDDDD',
];
const DIRT = [
  'DDDDDDDDDDDDDDDD',
  'DDdDDDDDDDdDDDDD',
  'DDDDDDeDDDDDDDDD',
  'DDDDDDDDDdDDDDDD',
  'DdDDDDDDDDDDDeDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDeDDDDDDdDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDDDDDdDDDDDDD',
  'DeDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDdDD',
  'DDDDDDdDDDDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDdDDDDDDeDDDDD',
  'DDDDDDDDDDDDDDDD',
];
const BUSH = [
  '......KKKK......',
  '....KKlGGGKK....',
  '...KlGGGGGGGK...',
  '..KlGGGGGGgGGK..',
  '.KGGGGGGGGGgGGK.',
  'KlGGGgGGGGGGgGGK',
  'KGGGGGGGgGGGGGgK',
  'KGgGGGGGGGGgGGgK',
];
const CLOUD = [
  '..........KKKK..........',
  '.....KKK.KWWWWK.........',
  '....KWWWKWWWWWWK.KKK....',
  '...KWWWWWWWWWWWWKWWWK...',
  '.KKWWWWWWWWWWWWWWWWWWK..',
  'KWWWWWWWWWWWWWWWWWWWWWK.',
  'KWWwWWWWWWWWWWWWWWWwWWWK',
  '.KwwwWWWwwWWWWwwWWwwwwK.',
  '..KKKwwwKKwwwwKKwwwKKK..',
  '.....KKK..KKKK..KKK.....',
];
const CLOUD_PAL = { K: '#7890c8', W: '#ffffff', w: '#d6e4f8' };
// ツタ（上の端と途中）
const VINE_TOP = [
  '......KKKK......',
  '.....KgGGgK.....',
  '....KgGllGgK....',
  '....KGlKKlGK....',
  '.....KGKKGK.....',
  '......KGgK......',
  '......KGgK......',
  '..KK..KGgK......',
  '.KlGKKGGgK......',
  '.KGgGGGgK.......',
  '..KKKGGgK..KK...',
  '......KGgKKlGK..',
  '......KGgGGGgK..',
  '......KGgKKKK...',
  '......KGgK......',
  '......KGgK......',
];
const VINE = [
  '......KGgK......',
  '......KGgK......',
  '..KK..KGgK......',
  '.KlGKKGGgK......',
  '.KGgGGGgK.......',
  '..KKKGGgK.......',
  '......KGgK......',
  '......KGgK......',
  '......KGgK......',
  '......KGgK..KK..',
  '......KGgKKlGK..',
  '.......KgGGGgK..',
  '.......KGgKKK...',
  '......KGgK......',
  '......KGgK......',
  '......KGgK......',
];
const WATER_ALPHA = 0.42;
// 100px ごとの目印の杭（速度感の確認用）
const POST = [
  '.KKKK.', 'KWWWWK', 'KWBBWK', 'KWWWWK', '.KKKK.',
  '..Kx..', '..Kx..', '..Kx..', '..Kx..', '..Kx..', '..Kx..',
];

export class LevelView {
  constructor() {
    this.grass = gridToCanvas(GRASS, TILE_PAL);
    this.dirt = gridToCanvas(DIRT, TILE_PAL);
    this.bush = gridToCanvas(BUSH, TILE_PAL);
    this.cloud = gridToCanvas(CLOUD, CLOUD_PAL);
    this.post = gridToCanvas(POST, TILE_PAL);
    this.turn = gridToCanvas(TURN, PAL_OBJ);
    // 回転中のターンブロック：正面 → 細い → 真横 → 細い（4 フレームごと）
    this.turnSpin = [16, 10, 4, 10].map((w) => this.squeeze(this.turn, w));
    this.stone = gridToCanvas(STONE, PAL_OBJ);
    this.question = gridToCanvas(QUESTION, PAL_OBJ);
    this.used = gridToCanvas(USED, PAL_OBJ);
    this.vineTop = gridToCanvas(VINE_TOP, TILE_PAL);
    this.vine = gridToCanvas(VINE, TILE_PAL);
    this.slopes = {};
    for (let k = 0; k < 32; k++) this.slopes[k] = this.makeSlope(k);
    this.hills = this.makeHills();
  }

  // 坂のタイル：表面の形 (SLOPE_SHAPE) に沿って草と土を描く
  makeSlope(k) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const g = c.getContext('2d');
    const col = (ch) => TILE_PAL[ch];
    if (isCeilingSlope(TILE.SLOPE + k)) {
      // 天井の坂：上側が石。形の値 (負) の分だけ固い
      for (let x = 0; x < 16; x++) {
        const n = -(((SLOPE_SHAPE[16 * k + x] & 0xff) << 24) >> 24);
        for (let y = 0; y < n; y++) {
          const ch = y >= n - 1 ? 'K' : y >= n - 2 ? 'z' : STONE[Math.min(y, 13)][x] === 'K' ? 'S' : STONE[Math.min(y, 13)][x];
          g.fillStyle = PAL_OBJ[ch];
          g.fillRect(x, y, 1, 1);
        }
      }
      return c;
    }
    for (let x = 0; x < 16; x++) {
      const top = SLOPE_SHAPE[16 * k + x];
      if (top > 15) continue;
      for (let y = top; y < 16; y++) {
        const d = y - top;
        let ch;
        if (d === 0) ch = 'K';
        else if (d === 1) ch = 'l';
        else if (d <= 3) ch = 'G';
        else if (d === 4) ch = 'g';
        else ch = DIRT[y][x];
        g.fillStyle = col(ch);
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  // 横幅を縮めた絵（回転して見せる用）
  squeeze(img, w) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, (16 - w) >> 1, 0, w, 16);
    return c;
  }

  makeHills() {
    // 遠景の丘（512px 幅でループ）
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 120;
    const g = c.getContext('2d');
    const layers = [
      { col: '#9fd8a0', edge: '#78b880', base: 70, amp: 26, f: 2 },
      { col: '#6cbc78', edge: '#4c9a5c', base: 90, amp: 18, f: 3 },
    ];
    for (const L of layers) {
      for (let x = 0; x < 512; x++) {
        const t = (x / 512) * Math.PI * 2;
        const y = Math.round(L.base - Math.abs(Math.sin(t * L.f)) * L.amp - Math.sin(t * L.f * 2.3) * 4);
        g.fillStyle = L.edge;
        g.fillRect(x, y, 1, 2);
        g.fillStyle = L.col;
        g.fillRect(x, y + 2, 1, 120 - y);
      }
    }
    return c;
  }

  drawBackground(g, camX, camY) {
    const sky = g.createLinearGradient(0, 0, 0, SCREEN_H);
    sky.addColorStop(0, '#5c94fc');
    sky.addColorStop(1, '#a8d0ff');
    g.fillStyle = sky;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // 雲（1/4 スクロール）
    const cx = Math.floor(camX / 4);
    for (let i = -1; i < 4; i++) {
      const base = Math.floor(cx / 128) * 128 + i * 128;
      const seed = ((base / 128) * 7919) & 0xff;
      g.drawImage(this.cloud, base - cx + (seed % 40), 20 + (seed % 50));
    }
    // 丘（1/2 スクロール）
    const hx = Math.floor(camX / 2) % 512;
    const hy = GROUND_Y - camY - 110;
    g.drawImage(this.hills, -hx, hy);
    g.drawImage(this.hills, 512 - hx, hy);

    // 茂み・目印
    const sx = Math.floor(camX);
    for (let x = Math.floor((sx - 64) / 160) * 160; x < sx + SCREEN_W + 64; x += 160) {
      if (x < 0) continue;
      g.drawImage(this.bush, x + 40 - sx, GROUND_Y - camY - 8);
    }
    for (let x = Math.floor(sx / 100) * 100; x < sx + SCREEN_W + 8; x += 100) {
      g.drawImage(this.post, x - 3 - sx, GROUND_Y - camY - 11);
    }
  }

  drawTiles(g, level, camX, camY, frame = 0) {
    this.frame = frame;
    const sx = Math.floor(camX);
    const tx0 = Math.floor(sx / 16);
    const ty0 = Math.max(0, Math.floor(camY / 16));
    const ty1 = Math.ceil((camY + SCREEN_H) / 16);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx0 + 17; tx++) {
        const t = level.tileAt(tx, ty);
        if (t === TILE.EMPTY) continue;
        if (t === TILE.WATER) continue; // 水はスプライトの手前に描く (drawWater)
        let img;
        const up = level.tileAt(tx, ty - 1);
        if (t === TILE.GROUND || t === TILE.LEDGE) img = up === TILE.EMPTY || up === TILE.VINE || up === TILE.WATER ? this.grass : this.dirt;
        else if (t === TILE.STONE) img = this.stone;
        else if (t === TILE.SPIN) img = this.turnSpin[(this.frame >> 2) & 3];
        else if (t === TILE.TURN) img = this.turn;
        else if (t === TILE.QUESTION) img = this.question;
        else if (t === TILE.USED) img = this.used;
        else if (t === TILE.VINE) img = up === TILE.VINE ? this.vine : this.vineTop;
        else if (isSlope(t)) img = this.slopes[slopeK(t)];
        else continue;
        g.drawImage(img, tx * 16 - sx, ty * 16 - camY + level.bounceOffset(tx, ty));
      }
    }
  }

  // 水：半透明でスプライトの手前に重ねる。水面は波打つ
  drawWater(g, level, camX, camY, frame = 0) {
    const sx = Math.floor(camX);
    const tx0 = Math.floor(sx / 16);
    const ty0 = Math.max(0, Math.floor(camY / 16));
    const ty1 = Math.ceil((camY + SCREEN_H) / 16);
    g.save();
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx0 + 17; tx++) {
        if (level.tileAt(tx, ty) !== TILE.WATER) continue;
        const x = tx * 16 - sx;
        const y = ty * 16 - camY;
        g.globalAlpha = WATER_ALPHA;
        g.fillStyle = '#3c78d8';
        g.fillRect(x, y, 16, 16);
        if (level.tileAt(tx, ty - 1) !== TILE.WATER) {
          // 水面
          g.globalAlpha = 0.9;
          for (let i = 0; i < 16; i++) {
            const wave = ((tx * 16 + i + (frame >> 2)) & 15) < 8 ? 0 : 1;
            g.fillStyle = '#d8ecff';
            g.fillRect(x + i, y + wave, 1, 1);
            g.fillStyle = '#7fb0f0';
            g.fillRect(x + i, y + wave + 1, 1, 1);
          }
        }
      }
    }
    g.restore();
  }
}
