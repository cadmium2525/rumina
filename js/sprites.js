// ドット絵の読み込みとキャンバス化
import { RUMINA_FRAMES_TEXT } from './rumina_frames.js';
import { POSE } from './player.js';

export const PALETTE = {
  K: '#24141c', // 輪郭
  H: '#f6d480', L: '#fff4c4', h: '#d6a050', d: '#a06830', // 髪
  S: '#fce0c4', s: '#eeb088', P: '#f08c8c', // 肌・頬
  E: '#4068c4', e: '#1c2868', i: '#ffffff', // 目
  W: '#faf8ec', w: '#c8c4dc', v: '#9090b0', // ワンピース
  B: '#4470d0', b: '#284898', // リボン・帯
  O: '#96522e', o: '#5c2c18', // 靴
};

export function parseFrames(text) {
  const frames = {};
  let name = null;
  let mirror = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const parts = line.slice(1).trim().split(/\s+/);
      name = parts[0];
      mirror = parts.includes('!mirror');
      frames[name] = [];
      continue;
    }
    if (name) frames[name].push(mirror ? line + [...line].reverse().join('') : line);
  }
  return frames;
}

export function gridToCanvas(rows, palette = PALETTE, flip = false) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = palette[ch];
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    });
  });
  return c;
}

// ポーズ番号 → フレーム名
const POSE_FRAME = {
  [POSE.STAND]: 'stand', [POSE.WALK1]: 'walk1', [POSE.WALK2]: 'walk2',
  [POSE.LOOKUP]: 'lookup',
  [POSE.RUN0]: 'run1', [POSE.RUN1]: 'run2', [POSE.RUN2]: 'run3',
  [POSE.JUMP]: 'jump', [POSE.RUNJUMP]: 'runjump', [POSE.FALL]: 'fall',
  [POSE.SKID]: 'skid', [POSE.DUCK]: 'duck',
  [POSE.FACE]: 'front', [POSE.FRONT]: 'front', [POSE.BACK]: 'back',
};

export class RuminaSprite {
  constructor() {
    const frames = parseFrames(RUMINA_FRAMES_TEXT);
    this.right = {};
    this.left = {};
    for (const [name, rows] of Object.entries(frames)) {
      this.right[name] = gridToCanvas(rows, PALETTE, false);
      this.left[name] = gridToCanvas(rows, PALETTE, true);
    }
  }

  // (x, y) はプレイヤー座標（16x32 の当たり判定の左上）を画面座標にしたもの
  draw(g, pose, facing, x, y) {
    const name = POSE_FRAME[pose] ?? 'stand';
    const img = (facing ? this.right : this.left)[name];
    g.drawImage(img, x - 4, y);
  }
}

// 切り返しの土煙（SMW のスモークスプライト 3 番相当、19 フレーム）
const SMOKE = [
  ['..KK....', '.KWWK...', 'KWWWWK..', 'KWWwWK..', '.KWWK...', '..KK....'],
  ['...KK...', '..KWWK..', '.KWwwWK.', '.KWwwWK.', '..KWWK..', '...KK...'],
  ['........', '...KK...', '..KwwK..', '..KwwK..', '...KK...', '........'],
];
const SMOKE_PAL = { K: '#7a6a70', W: '#ffffff', w: '#d8d4e4' };
export class SmokeSprites {
  constructor() {
    this.frames = SMOKE.map((f) => gridToCanvas(f, SMOKE_PAL));
  }
  draw(g, timer, x, y) {
    const i = timer > 12 ? 0 : timer > 6 ? 1 : 2;
    g.drawImage(this.frames[i], x, y + 1);
  }
}
