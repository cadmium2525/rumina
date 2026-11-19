// ドット絵の読み込みとキャンバス化
import { RUMINA_FRAMES_TEXT } from './rumina_frames.js';
import { POSE } from './player.js';
import {
  PAL_OBJ, GIFT, SPIKER_A, SPIKER_B, PIECE_GOLD, PIECE_GIFT, STAR_A, STAR_B,
  SHELL_SIDE, SHELL_FRONT, SHELL_EDGE, LIGHT_ORB,
  PAL_BOSS, BOSS_A, BOSS_B,
  PAL_AKIBA, CAPSULE, ROBO_A, ROBO_B, DRONE_A, DRONE_B, SPARK_A, SPARK_B, SHELLBULLET,
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
  [POSE.KICK]: 'kick', [POSE.WIN]: 'win',
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
  [POSE.DEAD]: 'c_dead', [POSE.WIN]: 'c_win',
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
    // 電気街の敵（右向きと左向き）
    const both = (grid) => ({ right: gridToCanvas(grid, PAL_AKIBA, false), left: gridToCanvas(grid, PAL_AKIBA, true) });
    this.capsule = both(CAPSULE);
    this.bullet = both(SHELLBULLET);
    this.boss = [BOSS_A, BOSS_B].map((f) => gridToCanvas(f, PAL_BOSS));
    this.bossBall = this.makeSpikeBall(PAL_BOSS);
    // ほのおの王：赤い色ちがい
    const fire = { ...PAL_BOSS, p: '#ff8a50', P: '#d03a28', n: '#7a1420', c: '#fff0a0', r: '#ffd040' };
    this.boss2 = [BOSS_A, BOSS_B].map((f) => gridToCanvas(f, fire));
    this.boss2Ball = this.makeSpikeBall(fire);
    // やみの王：黒と緑の色ちがい
    const dark = { ...PAL_BOSS, p: '#5a6a78', P: '#28303c', n: '#10141c', c: '#80ff90', r: '#b060ff', y: '#d0d8e8', Y: '#8890a8' };
    // いわの王：岩の灰色と琥珀色の目
    const stone = { ...PAL_BOSS, p: '#b8b0a0', P: '#7a7064', n: '#463e36', c: '#ffb840', r: '#d07028', y: '#e0d8c8', Y: '#9a9080' };
    // そらの王：白と空色、金色の冠
    const sky = { ...PAL_BOSS, p: '#f4f8ff', P: '#a8c8f0', n: '#5a80c0', c: '#3a70e0', r: '#ff90c0', y: '#ffe070', Y: '#f0a830' };
    this.bossSets = [null, this.boss, this.boss2, [BOSS_A, BOSS_B].map((f) => gridToCanvas(f, dark)),
      [BOSS_A, BOSS_B].map((f) => gridToCanvas(f, stone)), [BOSS_A, BOSS_B].map((f) => gridToCanvas(f, sky))];
    this.bossBalls = [null, this.bossBall, this.boss2Ball, this.makeSpikeBall(dark), this.makeSpikeBall(stone), this.makeSpikeBall(sky)];
    this.robo = [both(ROBO_A), both(ROBO_B)];
    this.drone = [both(DRONE_A), both(DRONE_B)];
    this.spark = [both(SPARK_A), both(SPARK_B)];
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

  // ゴールの柱 1 本（8x144）。上に光の玉。ひみつのゴールは桃色と紫
  drawPost(g, x, bottom, frame, secret = false) {
    const top = bottom - 144;
    const [c1, c2, c3] = secret ? ['#ffd8f4', '#d878e0', '#9a48b0'] : ['#fff4c4', '#f6d480', '#d6a050'];
    g.fillStyle = '#24141c';
    g.fillRect(x, top + 8, 8, 136);
    for (let y = top + 9; y < bottom; y++) {
      const band = ((y - top) >> 3) & 1;
      g.fillStyle = band ? c1 : c2;
      g.fillRect(x + 1, y, 6, 1);
      g.fillStyle = band ? c2 : c3;
      g.fillRect(x + 6, y, 1, 1);
    }
    // 光の玉（ゆっくり明滅）
    g.save();
    g.globalAlpha = 0.3 + 0.15 * Math.sin(frame / 10);
    g.fillStyle = secret ? '#ffb0f0' : '#fff6b0';
    g.beginPath();
    g.arc(x + 4, top + 4, 8, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.drawImage(this.light, x - 4, top - 4);
    if (secret) {
      // ひみつのゴール：光の玉に星のきらめき
      g.fillStyle = '#ffffff';
      const s = (frame >> 3) & 1 ? 2 : 3;
      g.fillRect(x + 4, top + 4 - s - 2, 1, 2 * s + 5);
      g.fillRect(x + 4 - s - 2, top + 4, 2 * s + 5, 1);
    }
  }

  // ゴールの奥の柱とテープ。x はテープの位置（Goal.x）
  drawGoalBack(g, goal, frame, camX, camY) {
    const x = goal.x - camX;
    this.drawPost(g, x - 20, goal.bottom - camY, frame, goal.secret);
    if (goal.done && !goal.cut) return; // 通った後のテープは消える
    const ty = Math.round(goal.y) - camY;
    const tx = x - 12;
    g.fillStyle = '#24141c';
    g.fillRect(tx, ty - 1, 32, 6);
    g.fillStyle = goal.secret ? '#ffe8fa' : '#fff8e0';
    g.fillRect(tx + 1, ty, 30, 2);
    g.fillStyle = goal.secret ? '#e080e8' : '#ffd860';
    g.fillRect(tx + 1, ty + 2, 30, 2);
  }

  // ゴールの手前の柱（ルミナより手前に描く）
  drawGoalFront(g, goal, frame, camX, camY) {
    this.drawPost(g, goal.x - camX + 20, goal.bottom - camY, frame, goal.secret);
  }

  // かげの王がトゲの球になった時の絵（32x32）
  makeSpikeBall(pal) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d');
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - 15.5, dy = y - 15.5;
        const d = Math.sqrt(dx * dx + dy * dy);
        const a = Math.atan2(dy, dx);
        const spike = 11 + 4.5 * Math.max(0, Math.cos(a * 8)); // 8 本のトゲ
        if (d < 10) px(x, y, dx + dy < -6 ? pal.p : dx + dy > 8 ? pal.n : pal.P);
        else if (d < 11) px(x, y, pal.K);
        else if (d < spike - 1) px(x, y, pal.y);
        else if (d < spike) px(x, y, pal.K);
      }
    }
    return c;
  }

  // ボス（32x32。a.x, a.y は足元の 16x16 の左上）
  drawBoss(g, a, frame, x, y) {
    if (a.inv && (a.inv >> 1) & 1 && !a.dying) return;
    if (a.dying && (a.timer >> 1) & 1) return;
    if (a.state === 'shell' && !a.dying) {
      // 転がる
      g.save();
      g.translate(x + 8, y);
      g.rotate(((frame >> 1) & 7) * (Math.PI / 4) * (a.dir || 1));
      g.drawImage(this.bossBalls[a.variant || 1], -16, -16);
      g.restore();
      return;
    }
    if (a.variant === 5 && !a.onFloor && !a.dying) {
      // そらの王：飛んでいる時は白い翼がはばたく
      const up = (frame >> 3) & 1;
      for (const side of [-1, 1]) {
        const bx = side < 0 ? x - 14 : x + 22;
        g.fillStyle = '#24141c';
        g.fillRect(bx - 1, y - 10 + up * 3, 10, 7);
        g.fillStyle = '#ffffff';
        g.fillRect(bx, y - 9 + up * 3, 8, 5);
        g.fillStyle = '#a8c8f0';
        g.fillRect(side < 0 ? bx : bx + 4, y - 5 + up * 3, 4, 1);
      }
    }
    g.drawImage(this.bossSets[a.variant || 1][a.onFloor ? (frame >> 3) & 1 : 1], x - 8, y - 16);
  }

  // 上下逆さまに描く（やられた敵）
  drawFlipped(g, img, x, y) {
    g.save();
    g.translate(x, y + img.height);
    g.scale(1, -1);
    g.drawImage(img, 0, 0);
    g.restore();
  }

  drawActor(g, a, frame, x, y) {
    if (a.type === 'boss5') return this.drawBoss(g, { ...a, variant: 5, type: 'boss' }, frame, x, y);
    if (a.type === 'boss4') return this.drawBoss(g, { ...a, variant: 4, type: 'boss' }, frame, x, y);
    if (a.type === 'rock') {
      // 落石：落ちる前は揺れる
      const sx = a.wait ? ((frame >> 1) & 1) * 2 - 1 : 0;
      g.fillStyle = '#24141c';
      g.fillRect(x + 2 + sx, y + 3, 12, 11);
      g.fillRect(x + 3 + sx, y + 2, 10, 13);
      g.fillStyle = '#9a9080';
      g.fillRect(x + 3 + sx, y + 4, 10, 9);
      g.fillRect(x + 4 + sx, y + 3, 8, 11);
      g.fillStyle = '#c8c0b0';
      g.fillRect(x + 4 + sx, y + 4, 4, 3);
      g.fillStyle = '#6a6056';
      g.fillRect(x + 9 + sx, y + 9, 3, 3);
      return;
    }
    if (a.type === 'boss3') return this.drawBoss(g, { ...a, variant: 3, type: 'boss' }, frame, x, y);
    if (a.type === 'boss2') return this.drawBoss(g, { ...a, variant: 2, type: 'boss' }, frame, x, y); // エディタ用
    if (a.type === 'boss') return this.drawBoss(g, a, frame, x, y);
    if (a.type === 'shadowball') {
      // かげの玉：暗い玉と紫の光
      g.save();
      g.globalAlpha = 0.35;
      g.fillStyle = '#b070ff';
      g.beginPath();
      g.arc(x + 8, y + 8, 8 + ((frame >> 2) & 1), 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.fillStyle = '#140c1c';
      g.fillRect(x + 4, y + 3, 8, 10);
      g.fillRect(x + 3, y + 4, 10, 8);
      g.fillStyle = '#5430a0';
      g.fillRect(x + 5, y + 4, 6, 8);
      g.fillRect(x + 4, y + 5, 8, 6);
      g.fillStyle = '#d0a8ff';
      g.fillRect(x + 6, y + 5, 2, 2);
      return;
    }
    const ak = this.akibaImage(a, frame);
    if (ak) {
      const [img, dy] = ak;
      if (a.dying) this.drawFlipped(g, img, x, y + dy);
      else {
        if (a.flash && (a.flash >> 1) & 1) return; // 踏まれた直後は点滅
        g.drawImage(img, x, y + dy);
      }
      return;
    }
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
    if (a.type === 'gift' || a.type === 'shell') {
      let img = this.gift;
      if (a.type === 'shell') img = a.state === 'kicked' ? this.shellSpin[(frame >> 2) & 3] : this.shell;
      if (a.state === 'dying') {
        // やられた：上下逆さま
        g.save();
        g.translate(x, y + 16);
        g.scale(1, -1);
        g.drawImage(img, 0, 0);
        g.restore();
      } else {
        g.drawImage(img, x, y);
      }
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

  // 電気街の敵の絵と縦のずれ（無ければ null）
  akibaImage(a, frame) {
    const dir = (set) => (a.facing ? set.right : set.left);
    if (a.type === 'capsule') return [this.capsule.right, 0];
    // 砲弾の絵は左向き（右へ飛ぶ時は反転）
    if (a.type === 'bullet') return [a.facing ? this.bullet.left : this.bullet.right, 0];
    if (a.type === 'robo') return [dir(this.robo[!a.dying && a.onFloor && a.timer < 10 ? 1 : 0]), -8];
    if (a.type === 'drone') return [dir(this.drone[(frame >> 1) & 1]), 0];
    if (a.type === 'spark') return [this.spark[(frame >> 2) & 1].right, 0];
    return null;
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
