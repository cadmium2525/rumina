// テストステージ（タイルマップ）。DOM に依存しないのでヘッドレスでテストできる。
export const SCREEN_W = 256;
export const SCREEN_H = 224;
export const TILES_W = 256;
export const TILES_H = 27;
export const LEVEL_W = TILES_W * 16;
export const LEVEL_H = TILES_H * 16; // 432
export const GROUND_Y = 384; // 地面の上端
export const CAM_Y = LEVEL_H - SCREEN_H;

export const TILE = { EMPTY: 0, GROUND: 1, STONE: 2, TURN: 3 };

// ターンブロックを下から叩いたときの跳ね上がり（px、毎フレーム）
const BOUNCE_OFFSETS = [-2, -4, -6, -7, -6, -4, -2, 0];

export class Level {
  constructor() {
    this.tiles = new Uint8Array(TILES_W * TILES_H);
    this.widthPx = LEVEL_W;
    this.bounces = []; // {tx, ty, t}
    this.spawns = [];  // {type: 'gift' | 'shell' | 'spiker', x, y}
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

  tileAt(tx, ty) {
    if (tx < 0 || tx >= TILES_W) return TILE.EMPTY;
    if (ty < 0) return TILE.EMPTY;
    if (ty >= TILES_H) return TILE.GROUND;
    return this.tiles[ty * TILES_W + tx];
  }

  tileAtPx(x, y) { return this.tileAt(Math.floor(x / 16), Math.floor(y / 16)); }

  solidPx(x, y) { return this.tileAtPx(x, y) !== TILE.EMPTY; }

  // スピンジャンプなどでターンブロックを壊す。壊れたら true
  breakTurn(tx, ty) {
    if (this.tileAt(tx, ty) !== TILE.TURN) return false;
    this.set(tx, ty, TILE.EMPTY);
    return true;
  }

  // ターンブロックが叩かれて跳ねる（見た目だけ）
  bounceTile(tx, ty) {
    if (this.tileAt(tx, ty) !== TILE.TURN) return;
    if (this.bounces.some((b) => b.tx === tx && b.ty === ty)) return;
    this.bounces.push({ tx, ty, t: 0 });
  }

  bounceOffset(tx, ty) {
    const b = this.bounces.find((e) => e.tx === tx && e.ty === ty);
    return b ? BOUNCE_OFFSETS[b.t] : 0;
  }

  update() {
    for (const b of this.bounces) b.t++;
    this.bounces = this.bounces.filter((b) => b.t < BOUNCE_OFFSETS.length);
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
