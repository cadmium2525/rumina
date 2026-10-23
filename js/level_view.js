// ステージの描画（背景・タイル）
import { gridToCanvas } from './sprites.js';
import { PAL_OBJ, TURN, STONE } from './art.js';
import { SCREEN_W, SCREEN_H, GROUND_Y, TILE } from './level.js';

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
    this.stone = gridToCanvas(STONE, PAL_OBJ);
    this.hills = this.makeHills();
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

  drawTiles(g, level, camX, camY) {
    const sx = Math.floor(camX);
    const tx0 = Math.floor(sx / 16);
    const ty0 = Math.max(0, Math.floor(camY / 16));
    const ty1 = Math.ceil((camY + SCREEN_H) / 16);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx0 + 17; tx++) {
        const t = level.tileAt(tx, ty);
        if (t === TILE.EMPTY) continue;
        let img;
        if (t === TILE.GROUND) img = level.tileAt(tx, ty - 1) === TILE.EMPTY ? this.grass : this.dirt;
        else if (t === TILE.STONE) img = this.stone;
        else img = this.turn;
        g.drawImage(img, tx * 16 - sx, ty * 16 - camY + level.bounceOffset(tx, ty));
      }
    }
  }
}
