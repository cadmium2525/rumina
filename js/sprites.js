// ドット絵の読み込みとキャンバス化
import { RUMINA_FRAMES_TEXT } from './rumina_frames.js';
import { POSE } from './player.js';
import {
  PAL_OBJ, GIFT, SPIKER_A, SPIKER_B, PIECE_GOLD, PIECE_GIFT, STAR_A, STAR_B,
  SHELL_SIDE, SHELL_FRONT, SHELL_EDGE, LIGHT_ORB,
} from './art.js';

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
  [POSE.CARRY0]: 'carry', [POSE.CARRY1]: 'carry_walk1', [POSE.CARRY2]: 'carry_walk2',
  [POSE.CARRY_UP]: 'carry', [POSE.PICKUP]: 'duck_carry', [POSE.CARRY_JUMP]: 'carry_jump',
  [POSE.KICK]: 'kick',
  [POSE.CLIMB]: 'climb', [POSE.SLIDE]: 'slide',
  // 泳ぎ：水をかく 2 コマと、浮いているコマ（持っている時は持ったまま）
  [POSE.SWIM_A]: 'swim_a', [POSE.SWIM_B]: 'swim_b', [POSE.SWIM]: 'swim',
  [POSE.SWIM_A_CARRY]: 'swim_a_carry', [POSE.SWIM_B_CARRY]: 'swim_b_carry', [POSE.SWIM_CARRY]: 'carry_jump',
};

// 小さい状態（チビルミナ）のポーズ → フレーム名
const SMALL_FRAME = {
  [POSE.STAND]: 'c_stand', [POSE.WALK1]: 'c_walk', [POSE.WALK2]: 'c_walk',
  [POSE.LOOKUP]: 'c_lookup',
  [POSE.RUN0]: 'c_run1', [POSE.RUN1]: 'c_run2', [POSE.RUN2]: 'c_run1',
  [POSE.JUMP]: 'c_jump', [POSE.RUNJUMP]: 'c_jump', [POSE.FALL]: 'c_fall',
  [POSE.SKID]: 'c_skid', [POSE.DUCK]: 'c_duck',
  [POSE.FACE]: 'c_front', [POSE.FRONT]: 'c_front', [POSE.BACK]: 'c_back',
  [POSE.CARRY0]: 'c_carry', [POSE.CARRY1]: 'c_carry_walk', [POSE.CARRY2]: 'c_carry_walk',
  [POSE.CARRY_UP]: 'c_carry', [POSE.PICKUP]: 'c_duck_carry', [POSE.CARRY_JUMP]: 'c_carry_jump',
  [POSE.KICK]: 'c_kick',
  [POSE.CLIMB]: 'c_climb', [POSE.SLIDE]: 'c_slide',
  [POSE.SWIM_A]: 'c_swim_a', [POSE.SWIM_B]: 'c_swim_b', [POSE.SWIM]: 'c_swim',
  [POSE.SWIM_A_CARRY]: 'c_swim_a_carry', [POSE.SWIM_B_CARRY]: 'c_swim_b_carry', [POSE.SWIM_CARRY]: 'c_carry_jump',
  [POSE.DEAD]: 'c_dead',
};

// 大きさが変わる途中の中くらいの絵（大きい立ちポーズを縦に縮める）
function medium(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 8, img.width, img.height - 8);
  return c;
}

export class RuminaSprite {
  constructor() {
    const frames = parseFrames(RUMINA_FRAMES_TEXT);
    this.right = {};
    this.left = {};
    for (const [name, rows] of Object.entries(frames)) {
      this.right[name] = gridToCanvas(rows, PALETTE, false);
      this.left[name] = gridToCanvas(rows, PALETTE, true);
    }
    this.right.medium = medium(this.right.stand);
    this.left.medium = medium(this.left.stand);
  }

  // (x, y) はプレイヤー座標（16x32 の当たり判定の左上）を画面座標にしたもの
  // powerUp: 0=小さい 1=大きい。0x3D は中くらい、0x46 は大きい立ち（大きさが変わる演出）
  draw(g, pose, facing, x, y, powerUp = 1) {
    let name;
    if (pose === POSE.MEDIUM) name = 'medium';
    else if (pose === POSE.BIG_STAND) name = 'stand';
    else if (!powerUp) name = SMALL_FRAME[pose] ?? 'c_stand';
    else name = POSE_FRAME[pose] ?? 'stand';
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

// ブロック・敵・エフェクトの絵
export class ActorSprites {
  constructor() {
    this.gift = gridToCanvas(GIFT, PAL_OBJ);
    this.light = gridToCanvas(LIGHT_ORB, PAL_OBJ);
    this.spiker = [SPIKER_A, SPIKER_B].map((f) => ({
      right: gridToCanvas(f, PAL_OBJ, false),
      left: gridToCanvas(f, PAL_OBJ, true),
    }));
    this.pieces = { gold: gridToCanvas(PIECE_GOLD, PAL_OBJ), gift: gridToCanvas(PIECE_GIFT, PAL_OBJ) };
    this.stars = [STAR_A, STAR_B].map((f) => gridToCanvas(f, PAL_OBJ));
    // 蹴られた甲羅の回転：横 → 正面 → 真横 → 正面 (KickedShellDraw, 4 コマ)
    const side = gridToCanvas(SHELL_SIDE, PAL_OBJ);
    const front = gridToCanvas(SHELL_FRONT, PAL_OBJ);
    const edge = gridToCanvas(SHELL_EDGE, PAL_OBJ);
    this.shell = side;
    this.shellSpin = [side, front, edge, front];
  }

  drawActor(g, a, frame, x, y) {
    if (a.type === 'light') {
      // 出てくる最初の 8 フレームは描かない (1540 < 0x36)
      if (a.emerge >= 0x36) return;
      // まわりの光（脈打つ）と、きらめき
      const r = 9 + ((frame >> 3) & 1);
      g.save();
      g.globalAlpha = 0.28;
      g.fillStyle = '#fff6b0';
      g.beginPath();
      g.arc(x + 8, y + 8, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.drawImage(this.light, x, y);
      const t = (frame >> 2) & 7;
      if (t < 4) {
        const sx = x + [1, 13, 14, 2][(frame >> 5) & 3];
        const sy = y + [2, 1, 12, 13][(frame >> 5) & 3];
        g.fillStyle = '#ffffff';
        g.fillRect(sx, sy - (t >> 1), 1, 1 + t);
        g.fillRect(sx - (t >> 1), sy, 1 + t, 1);
      }
      return;
    }
    if (a.type === 'gift') {
      g.drawImage(this.gift, x, y);
      return;
    }
    if (a.type === 'shell') {
      const img = a.state === 'kicked' ? this.shellSpin[(frame >> 2) & 3] : this.shell;
      g.drawImage(img, x, y);
      return;
    }
    const img = this.spiker[(frame >> 3) & 1][a.facing ? 'right' : 'left'];
    if (a.dying) {
      g.save();
      g.translate(x, y + 16);
      g.scale(1, -1);
      g.drawImage(img, 0, 0);
      g.restore();
    } else {
      g.drawImage(img, x, y);
    }
  }

  // かけら：向きが 8 通りに回る (kMExtSpr01_BrickPiece_Flip)
  drawPiece(g, e, frame, x, y) {
    const flips = [0, 0, 2, 2, 2, 3, 1, 0]; // bit0 = 左右反転, bit1 = 上下反転
    const f = flips[(e.slot + (frame >> 1)) & 7];
    g.save();
    g.translate(x + 4, y + 4);
    g.scale(f & 1 ? -1 : 1, f & 2 ? -1 : 1);
    g.drawImage(this.pieces[e.pal], -4, -4);
    g.restore();
  }

  drawStar(g, e, x, y) {
    g.drawImage(this.stars[(e.t >> 1) & 1], x, y);
  }

  drawBubble(g, x, y) {
    g.fillStyle = '#ffffff';
    g.fillRect(x + 1, y, 2, 1);
    g.fillRect(x, y + 1, 1, 2);
    g.fillRect(x + 3, y + 1, 1, 2);
    g.fillRect(x + 1, y + 3, 2, 1);
  }

  // 水しぶき：左右に跳ねる白い粒
  drawSplash(g, e, x, y) {
    const t = 16 - e.t;
    g.fillStyle = '#ffffff';
    const h = Math.max(0, 8 - Math.abs(t - 6));
    for (const [dx, k] of [[-2, 1], [4, 0], [10, 1], [16, 0]]) {
      const yy = y + 12 - h - k * 2;
      g.fillRect(x + dx + (dx < 8 ? -t >> 2 : t >> 2), yy, 2, 2);
    }
  }
}
