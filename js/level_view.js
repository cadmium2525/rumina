// ステージの描画（背景・タイル）
import { gridToCanvas } from './sprites.js';
import * as ART from './art.js';
import { PAL_OBJ, TURN, STONE, QUESTION, USED, PAL_STAGE } from './art.js';
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
// テーマごとの地面の色（草地の絵の色を差し替える）
const THEME_PAL = {
  grass: TILE_PAL,
  cave: { ...TILE_PAL, l: '#a898c8', G: '#7a6aa0', g: '#54467a', D: '#43385c', d: '#2e2642', e: '#5c4e7e' },
  ruins: { ...TILE_PAL, l: '#fff0c0', G: '#e0c484', g: '#b49458', D: '#c8a466', d: '#9c7c44', e: '#e2c68a' },
  castle: { ...TILE_PAL, l: '#d8d8e8', G: '#a4a4bc', g: '#76768e', D: '#5c5c74', d: '#44445a', e: '#70708a' },
};
// テーマごとの背景
const SKY = {
  grass: ['#5c94fc', '#a8d0ff'],
  cave: ['#120c1e', '#2c2240'],
  ruins: ['#f0905c', '#ffd8a0'],
  castle: ['#18141e', '#302838'],
};
// 1 枚絵のタイル（テーマによらない）
const STAGE_TILES = {
  [TILE.LADDER]: 'LADDER', [TILE.CAVE_ROCK]: 'CAVE_ROCK', [TILE.CAVE_LEDGE]: 'CAVE_LEDGE',
  [TILE.CRYSTAL]: 'CRYSTAL', [TILE.STALACTITE]: 'STALACTITE',
  [TILE.RUIN_BRICK]: 'RUIN_BRICK', [TILE.RUIN_BLOCK]: 'RUIN_BLOCK', [TILE.RUIN_PILLAR]: 'RUIN_PILLAR',
  [TILE.RUIN_LEDGE]: 'RUIN_LEDGE', [TILE.CASTLE_BRICK]: 'CASTLE_BRICK', [TILE.CASTLE_BLOCK]: 'CASTLE_BLOCK',
  [TILE.CASTLE_LEDGE]: 'CASTLE_LEDGE', [TILE.SPIKE]: 'SPIKE', [TILE.WINDOW]: 'WINDOW',
};
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
    this.themes = {};
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
    this.stage = {};
    for (const [t, name] of Object.entries(STAGE_TILES)) this.stage[t] = gridToCanvas(ART[name], PAL_STAGE);
    this.torch = [ART.TORCH_A, ART.TORCH_B].map((f) => gridToCanvas(f, PAL_STAGE));
    this.lavaTop = gridToCanvas(ART.LAVA_TOP, PAL_STAGE);
    this.lava = gridToCanvas(ART.LAVA, PAL_STAGE);
    this.hills = this.makeHills();
    this.backdrops = {};
    this.theme('grass');
  }

  // テーマごとの地面・坂の絵（初めて使う時に作る）
  theme(name) {
    if (!this.themes[name]) {
      const pal = THEME_PAL[name] ?? TILE_PAL;
      const slopes = {};
      for (let k = 0; k < 32; k++) slopes[k] = this.makeSlope(k, pal);
      this.themes[name] = { grass: gridToCanvas(GRASS, pal), dirt: gridToCanvas(DIRT, pal), slopes };
    }
    return this.themes[name];
  }

  // タイル 1 枚の絵。up = 上のタイル（草の有無・ツタの先・マグマの表面）
  tileImage(t, themeName = 'grass', up = TILE.EMPTY, frame = 0) {
    const th = this.theme(themeName);
    if (t === TILE.GROUND || t === TILE.LEDGE) {
      return up === TILE.EMPTY || up === TILE.VINE || up === TILE.WATER || up === TILE.LADDER ? th.grass : th.dirt;
    }
    if (t === TILE.STONE) return this.stone;
    if (t === TILE.SPIN) return this.turnSpin[(frame >> 2) & 3];
    if (t === TILE.TURN) return this.turn;
    if (t === TILE.QUESTION) return this.question;
    if (t === TILE.USED) return this.used;
    if (t === TILE.VINE) return up === TILE.VINE ? this.vine : this.vineTop;
    if (t === TILE.TORCH) return this.torch[(frame >> 3) & 1];
    if (t === TILE.LAVA) return up === TILE.LAVA ? this.lava : this.lavaTop;
    if (isSlope(t)) return th.slopes[slopeK(t)];
    return this.stage[t] ?? null;
  }

  // 坂のタイル：表面の形 (SLOPE_SHAPE) に沿って草と土を描く
  makeSlope(k, pal = TILE_PAL) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const g = c.getContext('2d');
    const col = (ch) => pal[ch];
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

  // テーマの遠景（512px 幅でループ）
  backdrop(name) {
    if (this.backdrops[name]) return this.backdrops[name];
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 224;
    const g = c.getContext('2d');
    const rnd = ((seed) => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff))(7);
    if (name === 'cave') {
      // 鍾乳石の垂れた天井と、奥の岩
      for (let x = 0; x < 512; x++) {
        const t = (x / 512) * Math.PI * 2;
        const top = 18 + Math.abs(Math.sin(t * 5)) * 22 + Math.sin(t * 13) * 5;
        g.fillStyle = '#2a2040';
        g.fillRect(x, 0, 1, top);
        const bot = 150 + Math.sin(t * 3) * 18 + Math.abs(Math.sin(t * 9)) * 10;
        g.fillStyle = '#251c38';
        g.fillRect(x, bot, 1, 224 - bot);
      }
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rnd() < 0.5 ? '#6ad0e8' : '#b090f0';
        g.globalAlpha = 0.5;
        g.fillRect(Math.floor(rnd() * 512), Math.floor(40 + rnd() * 110), 1, 1);
      }
      g.globalAlpha = 1;
    } else if (name === 'ruins') {
      // 夕焼けの砂丘と崩れた柱の影
      for (let x = 0; x < 512; x++) {
        const t = (x / 512) * Math.PI * 2;
        const y = 150 + Math.sin(t * 2) * 12 + Math.sin(t * 5) * 4;
        g.fillStyle = '#c87850';
        g.fillRect(x, y, 1, 224 - y);
      }
      g.fillStyle = '#a86048';
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 85 + Math.floor(rnd() * 20);
        const h = 40 + Math.floor(rnd() * 50);
        g.fillRect(x, 160 - h, 14, h);
        g.fillRect(x - 3, 160 - h, 20, 5);
        if (i % 2 === 0) g.fillRect(x + 14, 160 - h, 50, 6);
      }
    } else if (name === 'castle') {
      // 奥のレンガの壁と、柱
      g.fillStyle = '#2a2430';
      g.fillRect(0, 0, 512, 224);
      g.fillStyle = '#221c28';
      for (let y = 0; y < 224; y += 8) {
        g.fillRect(0, y, 512, 1);
        for (let x = (y / 8) % 2 ? 0 : 8; x < 512; x += 16) g.fillRect(x, y, 1, 8);
      }
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 128;
        g.fillStyle = '#3a3242';
        g.fillRect(x, 0, 20, 224);
        g.fillStyle = '#463e50';
        g.fillRect(x + 2, 0, 4, 224);
      }
    }
    this.backdrops[name] = c;
    return c;
  }

  drawBackground(g, camX, camY, theme = 'grass', w = SCREEN_W, h = SCREEN_H) {
    const [top, bottom] = SKY[theme] ?? SKY.grass;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    if (theme !== 'grass') {
      const img = this.backdrop(theme);
      const by = h - SCREEN_H; // 遠景は画面の下に合わせる
      for (let x = -(Math.floor(camX / 3) % 512); x < w; x += 512) g.drawImage(img, x, by);
      return;
    }

    // 雲（1/4 スクロール）
    const cx = Math.floor(camX / 4);
    for (let i = -1; i < Math.ceil(w / 128) + 2; i++) {
      const base = Math.floor(cx / 128) * 128 + i * 128;
      const seed = ((base / 128) * 7919) & 0xff;
      g.drawImage(this.cloud, base - cx + (seed % 40), 20 + (seed % 50));
    }
    // 丘（1/2 スクロール）
    const hx = Math.floor(camX / 2) % 512;
    const hy = GROUND_Y - camY - 110;
    for (let x = -hx; x < w; x += 512) g.drawImage(this.hills, x, hy);

    // 茂み・目印
    const sx = Math.floor(camX);
    for (let x = Math.floor((sx - 64) / 160) * 160; x < sx + w + 64; x += 160) {
      if (x < 0) continue;
      g.drawImage(this.bush, x + 40 - sx, GROUND_Y - camY - 8);
    }
    for (let x = Math.floor(sx / 100) * 100; x < sx + w + 8; x += 100) {
      g.drawImage(this.post, x - 3 - sx, GROUND_Y - camY - 11);
    }
  }

  // w, h：描く範囲（エディタでは画面より大きい）
  drawTiles(g, level, camX, camY, frame = 0, w = SCREEN_W, h = SCREEN_H) {
    this.frame = frame;
    const sx = Math.floor(camX);
    const tx0 = Math.floor(sx / 16);
    const ty0 = Math.max(0, Math.floor(camY / 16));
    const ty1 = Math.ceil((camY + h) / 16);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx0 + Math.ceil(w / 16) + 1; tx++) {
        const t = level.tileAt(tx, ty);
        if (t === TILE.EMPTY) continue;
        if (t === TILE.WATER) continue; // 水はスプライトの手前に描く (drawWater)
        const up = level.tileAt(tx, ty - 1);
        const img = this.tileImage(t, level.theme, up, frame);
        if (!img) continue;
        const x = tx * 16 - sx;
        const y = ty * 16 - camY + level.bounceOffset(tx, ty);
        if (t === TILE.LAVA) {
          // マグマはゆっくり流れる
          const o = (frame >> 3) & 15;
          g.drawImage(img, o, 0, 16 - o, 16, x, y, 16 - o, 16);
          if (o) g.drawImage(img, 0, 0, o, 16, x + 16 - o, y, o, 16);
          continue;
        }
        g.drawImage(img, x, y);
      }
    }
  }

  // 水：半透明でスプライトの手前に重ねる。水面は波打つ
  drawWater(g, level, camX, camY, frame = 0, w = SCREEN_W, h = SCREEN_H) {
    const sx = Math.floor(camX);
    const tx0 = Math.floor(sx / 16);
    const ty0 = Math.max(0, Math.floor(camY / 16));
    const ty1 = Math.ceil((camY + h) / 16);
    g.save();
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx0 + Math.ceil(w / 16) + 1; tx++) {
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
