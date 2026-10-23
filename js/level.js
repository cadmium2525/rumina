// テストステージ（タイルマップ）。DOM に依存しないのでヘッドレスでテストできる。
import { SLOPE_SHAPE } from './smw_tables.js';
export const SCREEN_W = 256;
export const SCREEN_H = 224;
export const TILES_W = 256;
export const TILES_H = 27;
export const LEVEL_W = TILES_W * 16;
export const LEVEL_H = TILES_H * 16; // 432
export const GROUND_Y = 384; // 地面の上端
export const CAM_Y = LEVEL_H - SCREEN_H;

// 坂のタイルは SLOPE + k（k は SMW の坂の形番号 SLOPE_SHAPE / SLOPE_TYPE の index）
export const TILE = {
  EMPTY: 0, GROUND: 1, STONE: 2, TURN: 3, SPIN: 4, WATER: 5, VINE: 6,
  // 上からだけ乗れる足場（SMW の map16 0x100〜0x110 の段差。丘の頂上や坂の周り）
  LEDGE: 7,
  // ？ブロック（下から叩くと中身が出る）と、叩いた後のブロック
  QUESTION: 8, USED: 9,
  SLOPE: 16,
};
// 使っている坂：ゆるい右上がり (k8,k9)・ゆるい右下がり (k10,k11)・45°右上がり (k12)・45°右下がり (k13)
export const SLOPE_K = {
  UP_G1: 8, UP_G2: 9, DOWN_G1: 10, DOWN_G2: 11, UP_45: 12, DOWN_45: 13,
  // 天井の坂（形の値が負：タイルの上側が固い）。右へ下がる天井 / 右へ上がる天井
  CEIL_DOWN_45: 18, CEIL_UP_45: 19, CEIL_DOWN_G1: 20, CEIL_DOWN_G2: 21, CEIL_UP_G1: 22, CEIL_UP_G2: 23,
};
// ブロックとして固いか（坂は足元だけ特別扱いなので、横・頭・スプライトからは固くない）
const SOLID = [false, true, true, true, false, false, false, false, true, true];
// 足元だけ固い（上から乗れる）
const FLOOR = [false, true, true, true, false, false, false, true, true, true];
export const isSlope = (t) => t >= TILE.SLOPE && t < TILE.SLOPE + 32;
export const slopeK = (t) => t - TILE.SLOPE;
// 天井の坂か（SLOPE_K.CEIL_*）
export const isCeilingSlope = (t) => isSlope(t) && slopeK(t) >= 18 && slopeK(t) <= 23;

// ターンブロックを叩いたときの跳ね上がり（px、毎フレーム）。
// BounceSpr07_SpinningTurnBlock：初速 -64、加速 +0x13 で 8 フレーム
const BOUNCE_OFFSETS = [-4, -7, -8, -9, -8, -6, -3, 0];
// 叩かれてから元のブロックに戻るまで（bounce_spr07_spinning_turn_block_despawn_timer = 0xFF）
const SPIN_TIME = 256;

export class Level {
  constructor() {
    this.tiles = new Uint8Array(TILES_W * TILES_H);
    this.widthPx = LEVEL_W;
    this.bounces = []; // 叩かれたターンブロック {tx, ty, t}
    this.spawns = [];  // {type: 'gift' | 'shell' | 'spiker', x, y}
    this.contents = new Map(); // ？ブロックの中身 'tx,ty' → 'light'（光の玉）
    this.build();
  }

  set(tx, ty, v) { this.tiles[ty * TILES_W + tx] = v; }

  fill(tx, ty, w, h, v) {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) this.set(x, y, v);
  }

  build() {
    const groundRow = GROUND_Y / 16; // 24
    this.fill(0, groundRow, TILES_W, TILES_H - groundRow, TILE.GROUND);

    // 頭突きテスト：ターンブロック 5 個（地面の 3 タイル上）
    this.fill(14, 20, 5, 1, TILE.TURN);
    // スピンジャンプ破壊テスト：ターンブロックの柱（3 段 × 2 列）
    this.fill(24, 21, 2, 3, TILE.TURN);
    // 投げブロックを当てる石の壁（3 段）
    this.fill(40, 21, 2, 3, TILE.STONE);
    // 石の階段
    for (let i = 0; i < 4; i++) this.fill(46 + i, groundRow - 1 - i, 1, i + 1, TILE.STONE);
    // 空中のターンブロックの橋（高いジャンプ向け）
    this.fill(60, 19, 6, 1, TILE.TURN);
    this.fill(70, 22, 3, 2, TILE.TURN);

    this.buildTerrainTest(groundRow);
    // スタート近くの ？ブロック（光の玉）
    this.question(8, 20, 'light');
    this.question(55, 20, 'light');

    const at = (tx, type, dy = 0) => this.spawns.push({ type, x: tx * 16, y: GROUND_Y - 16 + dy });
    at(12, 'gift');
    at(20, 'shell');
    at(44, 'shell');
    at(28, 'gift');
    at(52, 'gift');
    at(32, 'spiker');
    at(37, 'spiker');
    at(56, 'spiker');
    at(66, 'spiker');
    at(75, 'spiker');
    at(77, 'gift');
  }

  slope(tx, ty, k) { this.set(tx, ty, TILE.SLOPE + k); }

  question(tx, ty, item) {
    this.set(tx, ty, TILE.QUESTION);
    this.contents.set(`${tx},${ty}`, item);
  }

  // ？ブロックが叩かれた：叩いた後のブロックになり、中身を返す
  hitQuestion(tx, ty) {
    if (this.tileAt(tx, ty) !== TILE.QUESTION) return null;
    this.set(tx, ty, TILE.USED);
    if (!this.bounces.some((b) => b.tx === tx && b.ty === ty)) this.bounces.push({ tx, ty, t: 0 });
    const item = this.contents.get(`${tx},${ty}`) ?? null;
    this.contents.delete(`${tx},${ty}`);
    return item;
  }

  // 坂・水・ツタの試験エリア（x = タイル 85〜）
  buildTerrainTest(g) {
    const K = SLOPE_K;
    // 小さな丘：ゆるい坂で 1 段、45°で 1 段登り、平らな頂上から同じ形で下る
    // 丘の頂上と中身は上からだけ乗れる足場（SMW と同じく、坂を登り切る所で横から引っかからない）
    this.slope(85, g - 1, K.UP_G1);
    this.slope(86, g - 1, K.UP_G2);
    this.fill(87, g - 1, 6, 1, TILE.LEDGE);
    this.slope(87, g - 2, K.UP_45);
    this.fill(88, g - 2, 4, 1, TILE.LEDGE);
    this.slope(92, g - 2, K.DOWN_45);
    this.slope(93, g - 1, K.DOWN_G1);
    this.slope(94, g - 1, K.DOWN_G2);
    // 45°の大きな丘（しゃがんで滑る用）：4 段登って 4 段下る
    for (let i = 0; i < 4; i++) {
      this.slope(98 + i, g - 1 - i, K.UP_45);
      this.fill(98 + i, g - i, 1, i, TILE.LEDGE);
      this.slope(107 - i, g - 1 - i, K.DOWN_45);
      this.fill(107 - i, g - i, 1, i, TILE.LEDGE);
    }
    this.fill(102, g - 4, 2, 4, TILE.LEDGE);
    // プール：石の縁（3 段）に囲まれた水（深さ 3 タイル）
    this.fill(113, g - 3, 1, 3, TILE.STONE);
    this.fill(126, g - 3, 1, 3, TILE.STONE);
    this.fill(114, g - 3, 12, 3, TILE.WATER);
    // ツタ：1 本のツタ（高い足場へ）と、3 本並んだツタ（左右にも動ける）
    this.fill(132, 13, 5, 1, TILE.STONE);
    this.fill(131, 14, 1, g - 14, TILE.VINE);
    this.fill(140, 16, 3, g - 16, TILE.VINE);
    this.fill(139, 15, 5, 1, TILE.STONE);
    // 天井の坂：45° で下がって低い天井になり、45° で上がる。続いてゆるい天井の坂
    this.fill(150, 18, 16, 1, TILE.STONE);
    this.slope(150, 19, K.CEIL_DOWN_45);
    this.fill(151, 19, 13, 1, TILE.STONE);
    this.slope(164, 19, K.CEIL_UP_45);
    this.fill(168, 20, 8, 1, TILE.STONE);
    this.slope(168, 21, K.CEIL_DOWN_G1);
    this.slope(169, 21, K.CEIL_DOWN_G2);
    this.fill(170, 21, 4, 1, TILE.STONE);
    this.slope(174, 21, K.CEIL_UP_G1);
    this.slope(175, 21, K.CEIL_UP_G2);
    // 落とし穴（落ちるとミス）
    this.fill(184, g, 3, TILES_H - g, TILE.EMPTY);
  }

  tileAt(tx, ty) {
    if (tx < 0 || tx >= TILES_W) return TILE.EMPTY;
    if (ty < 0) return TILE.EMPTY;
    if (ty >= TILES_H) return TILE.EMPTY;
    return this.tiles[ty * TILES_W + tx];
  }

  tileAtPx(x, y) { return this.tileAt(Math.floor(x / 16), Math.floor(y / 16)); }

  solidPx(x, y) { return SOLID[this.tileAtPx(x, y)] === true; }

  // 足元として乗れるか（固いブロック＋上からだけ乗れる足場）
  floorPx(x, y) { return FLOOR[this.tileAtPx(x, y)] === true; }

  // 天井として固いか（ふつうのブロックと、天井の坂の固い部分）。スプライト用
  ceilingPx(x, y) {
    const t = this.tileAtPx(x, y);
    if (SOLID[t] === true) return true;
    return isCeilingSlope(t) && (y & 15) < -(((SLOPE_SHAPE[16 * slopeK(t) + (x & 15)] & 0xff) << 24) >> 24);
  }

  // スピンジャンプなどでターンブロックを壊す。壊れたら true
  breakTurn(tx, ty) {
    if (this.tileAt(tx, ty) !== TILE.TURN) return false;
    this.set(tx, ty, TILE.EMPTY);
    return true;
  }

  // ターンブロックが下や横から叩かれた（クルクルブロック）。
  // 8 フレーム跳ねたあと回転を始め、回っている間はすり抜けられる。約 4.3 秒で元に戻る
  bounceTile(tx, ty) {
    if (this.tileAt(tx, ty) !== TILE.TURN) return;
    if (this.bounces.some((b) => b.tx === tx && b.ty === ty)) return;
    this.bounces.push({ tx, ty, t: 0 });
  }

  bounceOffset(tx, ty) {
    const b = this.bounces.find((e) => e.tx === tx && e.ty === ty);
    return b && b.t < BOUNCE_OFFSETS.length ? BOUNCE_OFFSETS[b.t] : 0;
  }

  update() {
    for (const b of this.bounces) {
      b.t++;
      // 跳ね終わったら回転するブロック（すり抜けられる）になる
      if (b.t === BOUNCE_OFFSETS.length && this.tileAt(b.tx, b.ty) === TILE.TURN) this.set(b.tx, b.ty, TILE.SPIN);
      // 時間が来たら、ルミナが中にいても元のブロックに戻る
      if (b.t >= SPIN_TIME && this.tileAt(b.tx, b.ty) === TILE.SPIN) this.set(b.tx, b.ty, TILE.TURN);
    }
    this.bounces = this.bounces.filter((b) => b.t < SPIN_TIME);
  }
}

// HandleStandardLevelCameraScroll (00F6DB) の横スクロール部分
export class Camera {
  constructor() {
    this.x = 0;
    this.y = CAM_Y;
    this.relPos = 0x80; // $142A
  }
  update(player) {
    const scroll = [this.relPos - 12, this.relPos + 12];
    const r0 = player.xpos - this.x;
    const v = r0 - this.relPos < 0 ? 0 : 1;
    let r2 = r0 - scroll[v];
    if (r2 !== 0 && (v === 0 ? r2 < 0 : r2 > 0)) {
      // 00F8AB：向いている方向へのスクロールは 1px 先行させる
      if (player.facing === 1 && r2 > 0) r2 += 1;
      else if (player.facing === 0 && r2 < 0) r2 -= 1;
      this.x = Math.max(0, Math.min(LEVEL_W - SCREEN_W, this.x + r2));
    }
  }
}
