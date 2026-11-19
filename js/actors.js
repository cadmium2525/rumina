// ブロック・敵などのスプライト。SMW のスプライト処理（bank 01）を移植している。
// 速度は 1/16 px/frame、座標は 1px 単位（左上）。DOM に依存しない。
import { LEVEL_H, SCREEN_W, TILE, isSlope, slopeK, isCeilingSlope } from './level.js';
import { PAD } from './player.js';
import {
  SHELL_X_SPEED, PLACED_X_OFFSET, PLACED_X_SPEED, CARRIED_X_OFFSET,
  SPR_GRAVITY, SPR_MAX_FALL, STUN_BOUNCE, SLOPE_SHAPE, GOAL_TAPE_YSPEED, GOAL_TAPE_TIME,
  BULLET_XSPEED, BULLET_EMERGE,
} from './smw_tables.js';

const u8 = (v) => v & 0xff;
const s8 = (v) => ((v & 0xff) << 24) >> 24;

export function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// プレイヤーとスプライトの接触 (StandardSpriteToSpriteCollisionChecks_CheckContact, 03B72B)。
// 端がちょうど触れている場合も接触とみなす
export function touchesPlayer(p, b) {
  const a = p.hitbox;
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

// 上から踏んだか (01A80F)。次のどれかならダメージ側になる：
//  ・プレイヤーの y が「スプライトの当たり判定の上端 - 20」より下（足が上端 +12 より下）
//  ・上昇中で、まだ何も踏んでいない（連続踏み中は上昇中でも踏める）
//  ・スプライトが床にいて、プレイヤーも地上にいる
export function stompsFromAbove(p, hb, spriteOnFloor) {
  if (p.ypos > hb.y - 20) return false;
  if ((p.yspeed & 0x80) && !p.stompCount) return false;
  if (spriteOnFloor && !p.inAir) return false;
  return true;
}

class Sprite {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.subX = 0;
    this.subY = 0;
    this.xs = 0; // 符号付き
    this.ys = 0;
    this.facing = 1;
    this.contactTimer = 0; // $154C：プレイヤーとの接触判定の間隔
    this.dead = false;
  }

  // UpdateNormalSpritePosition_Y / _X (018022)
  moveY() {
    const t = this.subY + u8(this.ys * 16);
    this.subY = t & 0xff;
    this.y += (this.ys >> 4) + (t >> 8);
  }

  moveX() {
    // 水中では横の速さが 3/4 になる (019032)
    const xs = this.inWater ? (this.xs >> 1) + (this.xs >> 2) : this.xs;
    const t = this.subX + u8(xs * 16);
    this.subX = t & 0xff;
    this.x += (xs >> 4) + (t >> 8);
  }

  // HandleNormalSpriteGravity (019032) の加速部分
  gravity() {
    // 水中は重力 1・落下の上限 0x10 (kHandleNormalSpriteGravity_YAcceleration/MaxYSpeed[1])
    if (this.inWater && this.ys <= -25) this.ys = -24;
    const v = this.ys + (this.inWater ? 1 : SPR_GRAVITY);
    const max = this.inWater ? 0x10 : SPR_MAX_FALL;
    this.ys = v >= max ? max : v;
  }

  // 足元の坂の表面の y（坂でなければ null）。坂の真下の地面にいる時は上の坂を見る
  slopeSurface(level) {
    const cx = this.x + 8;
    const by = this.y + 16;
    let tx = Math.floor(cx / 16);
    let ty = Math.floor(by / 16);
    let t = level.tileAt(tx, ty);
    if (!isSlope(t) || isCeilingSlope(t)) {
      const up = level.tileAt(tx, ty - 1);
      if (isSlope(up) && !isCeilingSlope(up)) {
        t = up;
        ty--;
      } else {
        return null;
      }
    }
    return ty * 16 + SLOPE_SHAPE[16 * slopeK(t) + (cx & 15)];
  }

  // 壁・床・天井との接触。床は押し戻して ys を変えない（呼び出し側で扱う）
  collide(level) {
    const f = { floor: false, wall: false, ceiling: false, tx: 0, ty: 0 };
    if (this.xs !== 0) {
      const px = this.xs > 0 ? this.x + 14 : this.x + 1;
      for (const py of [this.y + 4, this.y + 12]) {
        if (!level.solidPx(px, py)) continue;
        f.wall = true;
        f.tx = Math.floor(px / 16);
        f.ty = Math.floor(py / 16);
        this.x = this.xs > 0 ? f.tx * 16 - 15 : (f.tx + 1) * 16 - 1;
        break;
      }
    }
    const surf = this.slopeSurface(level);
    if (surf !== null) {
      // 坂：表面に沿って歩く（下り坂でも離れないよう、床にいたら少し下まで吸い付く）
      const by = this.y + 16;
      if (this.ys >= 0 && by >= surf - (this.onFloor ? 6 : 0) && by - surf < 12) {
        f.floor = true;
        this.y = surf - 16;
      }
    } else if (this.ys >= 0) {
      const fy = this.y + 16;
      for (const px of [this.x + 4, this.x + 11]) {
        if (level.floorPx(px, fy) && (fy & 15) < 8 && !isSlope(level.tileAtPx(px, fy - 16))) {
          f.floor = true;
          this.y = Math.floor(fy / 16) * 16 - 16;
          break;
        }
      }
    } else if (level.ceilingPx(this.x + 8, this.y)) {
      f.ceiling = true;
      f.tx = Math.floor((this.x + 8) / 16);
      f.ty = Math.floor(this.y / 16);
      this.y = (f.ty + 1) * 16;
    }
    this.onFloor = f.floor;
    this.inWater = level.tileAtPx(this.x + 8, this.y + 8) === TILE.WATER;
    return f;
  }

  // プレイヤーが自分の左にいれば 1（CheckPlayerPositionRelativeToSprite_Bank01_X）
  playerIsLeft(p) { return p.xpos + 8 < this.x + 8 ? 1 : 0; }

  offscreen(w, margin) {
    const cx = w.camera.x;
    return this.x < cx - margin || this.x > cx + SCREEN_W + margin || this.y > LEVEL_H + 64;
  }
}

// 持てる物の共通部分（SMW で status 9 気絶 / 10 蹴られ / 11 持たれ を使うスプライト）
class Throwable extends Sprite {
  constructor(x, y) {
    super(x, y);
    this.state = 'idle'; // idle(=気絶, status 9) / kicked(10) / carried(11)
  }

  get hitbox() { return { x: this.x + 1, y: this.y + 1, w: 14, h: 15 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.state === 'carried') this.updateCarried(w);
    else if (this.state === 'dying') this.updateDying(w);
    else if (this.state === 'kicked') this.updateKicked(w);
    else this.updateIdle(w);
    if (!this.dead && this.state !== 'carried' && this.offscreen(w, 192)) this.dead = true;
  }

  // SprStatus09_Stunned_01956A：置かれている / 落ちている
  updateIdle(w) {
    this.moveY();
    this.gravity();
    this.moveX();
    const f = this.collide(w.level);
    if (f.floor) {
      // MakeStunnedSpriteBounceOrSlowDownOnGround (0197D5)
      const sign = this.xs < 0 ? -1 : 1;
      this.xs = sign * (Math.abs(this.xs) >> 1);
      const prev = this.ys;
      this.ys = s8(STUN_BOUNCE[prev >> 2]);
    }
    if (f.ceiling) {
      this.ys = 16;
      w.hitTile(f.tx, f.ty);
    }
    if (f.wall) {
      this.rebound(w, f);
      return;
    }
    // 敵との接触 (01A4BA)：空中にある間は敵を倒す (sub_1A642 → 1A685/1A64A)。
    // 床の上では倒さず、お互いに離れる向きへ向き直る (LABEL_41)
    for (const a of w.actors) {
      if (!a.enemy || a.dead || a.dying || !overlap(this.hitbox, a.hitbox)) continue;
      if (!this.onFloor) {
        a.kill(this.xs < 0 ? -1 : 1);
        w.emit('kick');
      } else {
        a.facing = a.x >= this.x ? 1 : 0;
      }
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      const p = w.player;
      if (this.spinKillable && p.spin && !(p.yspeed & 0x80)) {
        // 01AA42：スピンジャンプで踏むと消える
        this.spinKill(w);
      } else if ((p.in.hold1 & PAD.Y) && !p.carrying) {
        // 持ち上げる (01AA42)
        this.state = 'carried';
        p.carrying = this;
        p.pickPoseTimer = 8;
        w.emit('grab');
      } else {
        // 蹴り飛ばす（01AB46：連続踏みの数も増える）
        p.stompCount++;
        this.state = 'kicked';
        this.xs = s8(SHELL_X_SPEED[this.playerIsLeft(p) ? 1 : 0]);
        this.contactTimer = 16;
        w.emit('kick');
      }
    }
  }

  // SprStatus0A_Kicked (019913)：まっすぐ滑る。壁に当たると rebound()
  updateKicked(w) {
    if (this.xs) this.facing = this.xs < 0 ? 0 : 1;
    this.moveY();
    this.gravity();
    this.moveX();
    const f = this.collide(w.level);
    if (f.floor) this.ys = 0;
    if (f.ceiling) this.ys = 0;
    if (f.wall) {
      this.rebound(w, f);
      return;
    }
    // 敵を倒す
    for (const a of w.actors) {
      if (a.enemy && !a.dead && !a.dying && overlap(this.hitbox, a.hitbox)) {
        a.kill(this.xs < 0 ? -1 : 1);
        w.emit('kick');
      }
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      this.touchPlayerKicked(w);
    }
  }

  // 蹴られて動いている時にプレイヤーが触れた（種類ごとに上書き）
  touchPlayerKicked() {}

  spinKill(w) {
    const p = w.player;
    p.yspeed = 0xf8; // -8
    p.stompCount++;
    w.star(p.xpos + 4, p.ypos + 0x1c);
    w.effects.push({ kind: 'smoke', x: this.x + 4, y: this.y + 4, t: 19 });
    w.emit('bounce');
    this.dead = true;
  }

  // SprStatus0B_Carried (019F71)
  updateCarried(w) {
    const p = w.player;
    if ((p.in.hold1 & PAD.Y)) {
      this.followPlayer(p);
      // 持っている物が敵に触れると、敵も持っている物もやられる (01A4BA → sub_1A685)
      const e = w.actors.find((a) => a.enemy && !a.dead && !a.dying && overlap(this.hitbox, a.hitbox));
      if (e) this.clash(w, e);
      return;
    }
    // Y を離した：投げる / ↓で置く / ↑で真上に投げる (019FDC〜)
    p.carrying = null;
    const h = p.in.hold1;
    this.contactTimer = 16;
    p.kickPoseTimer = 12;
    if (h & PAD.UP) {
      this.state = 'idle';
      this.ys = -0x70;
      this.xs = s8(p.xspeed) >> 1;
      w.emit('throw');
    } else if (h & PAD.DOWN) {
      // 下を押しながら離すとそっと置く（甲羅など sprite < 0x15 の規則）
      this.state = 'idle';
      this.x = p.xpos + PLACED_X_OFFSET[p.facing];
      this.xs = s8(p.xspeed) + s8(PLACED_X_SPEED[this.playerIsLeft(p) ? 1 : 0]);
      this.ys = 0;
      w.emit('grab');
    } else {
      this.state = 'kicked';
      this.xs = s8(SHELL_X_SPEED[p.facing]);
      if (!((s8(p.xspeed) ^ this.xs) & 0x80)) this.xs += s8(p.xspeed) >> 1;
      this.ys = 0;
      w.emit('throw');
    }
  }

  // 01A0B1：プレイヤーの手元に置く
  followPlayer(p) {
    let v1 = p.facing === 0 ? 1 : 0;
    if (p.facePoseTimer) {
      v1 += 2;
      if (p.facePoseTimer >= 5) v1++;
    }
    // 高さは SMW と同じ +13（小さい状態・しゃがみ・持ち上げ中は +15）。
    // しゃがみ中だけ、ルミナの顔が隠れないよう横位置を 4px 前に出している（見た目のみ）
    const low = p.ducking || p.pickPoseTimer;
    this.x = p.xpos + (low && v1 < 2 ? (v1 ? -15 : 15) : CARRIED_X_OFFSET[v1]);
    this.y = p.ypos + (low || !p.powerUp ? 15 : 13);
    this.xs = 0;
    this.ys = 0;
    this.subX = 0;
    this.subY = 0;
  }

  // sub_1A685：敵と相打ち。どちらも上へ跳ねて画面の下へ落ちていく
  clash(w, e) {
    const p = w.player;
    const exs = e.xs < 0 ? 16 : -16; // 敵は進んでいた向きと逆へ飛ぶ
    e.kill(1);
    e.ys = -48;
    e.xs = exs;
    this.state = 'dying';
    this.ys = -48;
    this.xs = -e.xs;
    if (p.carrying === this) p.carrying = null;
    w.star(e.x, e.y);
    w.emit('kick');
  }

  // SprStatus02：やられて落ちていく（地形には当たらない）
  updateDying(w) {
    this.moveY();
    this.ys = Math.min(this.ys + SPR_GRAVITY, SPR_MAX_FALL);
    this.moveX();
    if (this.y > LEVEL_H + 32) this.dead = true;
  }

  // ダメージを受けて落とした
  drop() {
    this.state = 'idle';
    this.xs = 0;
    this.ys = 0;
    this.contactTimer = 16;
  }
}

// 持ち運べるギフトボックス（SMW のスローブロック, sprite 0x53）。壁に当たると砕ける
export class GiftBox extends Throwable {
  constructor(x, y) {
    super(x, y);
    this.type = 'gift';
  }

  // MakeNormalSpriteReboundOffWall (01999E)：壁のブロックを叩き、自分は砕ける (BreakThrowBlock)
  rebound(w, f) {
    w.hitTile(f.tx, f.ty);
    this.shatter(w);
  }

  shatter(w) {
    this.dead = true;
    w.addPieces(this.x, this.y, 'gift');
    w.emit('shatter');
  }
}

// 甲羅（SMW のノコノコの甲羅）。壁に当たると跳ね返る。蹴られている甲羅は敵を倒し、横から当たると痛い
export class Shell extends Throwable {
  constructor(x, y) {
    super(x, y);
    this.type = 'shell';
    this.spinKillable = true;
  }

  // SMW のスプライト当たり判定 0 番 (SprClippingDispX/Y, Width/Height)
  get hitbox() { return { x: this.x + 2, y: this.y + 3, w: 12, h: 10 }; }

  // MakeNormalSpriteReboundOffWall (01999E)：向きを反転し、壁のブロックを叩く
  rebound(w, f) {
    this.xs = -this.xs;
    this.facing ^= 1;
    w.hitTile(f.tx, f.ty);
    w.emit('bump');
  }

  // CheckPlayerToNormalSpriteColl_01A80F：上から踏むと止まる（スピンなら消える）。横からはダメージ
  touchPlayerKicked(w) {
    const p = w.player;
    const above = stompsFromAbove(p, this.hitbox, this.onFloor);
    if (above && p.spin) {
      this.spinKill(w);
      return;
    }
    if (above) {
      p.boost(); // 01A8D8
      p.stompCount++; // 01AB46
      w.star(p.xpos + 4, p.ypos + 0x1c);
      w.emit('kick');
      this.state = 'idle'; // 01AA0B：気絶状態に戻る（床で速度が半分ずつになり止まる）
      return;
    }
    if (p.sliding) {
      // 滑っているルミナに当たると消える (01A847)
      w.star(this.x, this.y);
      w.effects.push({ kind: 'smoke', x: this.x + 4, y: this.y + 4, t: 19 });
      w.emit('kick');
      this.dead = true;
      return;
    }
    if (p.hurt()) w.onPlayerHurt();
  }
}

// トゲムシ（SMW の Spiny 相当）。普通に踏むとダメージ、スピンジャンプで踏むと跳ね返る
export class Spiker extends Sprite {
  constructor(x, y) {
    super(x, y);
    this.type = 'spiker';
    this.enemy = true;
    this.dying = false;
    this.facing = 0;
    this.xs = -8;
  }

  // SMW のスプライト当たり判定 0 番 (SprClippingDispX/Y, Width/Height)
  get hitbox() { return { x: this.x + 2, y: this.y + 3, w: 12, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.dying) {
      this.moveY();
      this.gravity();
      this.moveX();
      if (this.y > LEVEL_H + 64 || this.offscreen(w, 192)) this.dead = true;
      return;
    }
    this.xs = this.facing ? 8 : -8;
    this.moveY();
    this.gravity();
    this.moveX();
    const f = this.collide(w.level);
    if (f.floor) this.ys = 0;
    if (f.ceiling) this.ys = 0;
    if (f.wall || this.x < 8 || this.x > w.level.widthPx - 24) {
      this.facing ^= 1;
      this.xs = this.facing ? 8 : -8;
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      this.touchPlayer(w);
    }
    if (this.offscreen(w, 192)) this.dead = true;
  }

  // CheckPlayerToNormalSpriteColl_01A80F：上からスピンジャンプなら跳ね返る。それ以外はダメージ
  touchPlayer(w) {
    const p = w.player;
    const above = stompsFromAbove(p, this.hitbox, this.onFloor);
    if (above && p.spin) {
      p.boost(); // 01A8D8
      w.star(p.xpos + 4, p.ypos + 0x1c);
      w.emit('bounce');
      return;
    }
    if (!above && p.sliding) {
      // 滑っているルミナに当たると倒れる (01A847)
      this.kill(this.playerIsLeft(p) ? 1 : -1);
      w.star(this.x, this.y);
      w.emit('kick');
      return;
    }
    if (p.hurt()) w.onPlayerHurt();
  }

  // 飛んできたブロックに倒される
  kill(dir) {
    this.dying = true;
    this.ys = -0x20;
    this.xs = dir * 8;
    this.contactTimer = 0;
  }
}

// 光の玉（パワーアップ）。動きは SMW のスーパーキノコ (sprite 0x74 / SprXXX_PowerUps_StarEntry 01C353) と同じ：
// ？ブロックから 62 フレームかけて出てきて、1px/フレームで転がる。壁で向きを変える
export class LightOrb extends Sprite {
  constructor(x, y) {
    super(x, y);
    this.type = 'light';
    this.emerge = 62;        // $1540：ブロックから出てくる途中
    this.contactTimer = 44;  // $154C：出てすぐは取れない
    this.facing = 1;
  }

  get hitbox() { return { x: this.x + 2, y: this.y + 2, w: 12, h: 12 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.emerge) {
      this.emerge--;
      this.ys = -4;
      this.moveY();
    } else {
      this.xs = this.facing ? 16 : -16;
      this.moveY();
      this.gravity();
      if (w.frame & 3) this.ys--;
      this.moveX();
      const f = this.collide(w.level);
      if (f.floor) this.ys = 0;
      if (f.ceiling) this.ys = 0;
      if (f.wall) this.facing ^= 1;
    }
    // 01C4AC
    const p = w.player;
    if (!this.contactTimer && this.emerge < 0x18 && touchesPlayer(p, this.hitbox)) {
      this.dead = true;
      p.givePowerUp();
      return;
    }
    if (this.offscreen(w, 64)) this.dead = true;
  }
}

// ゴール（SMW のゴールテープ, sprite 0x7B）。2 本の柱の間をテープが上下する。
// 柱の間を通るとゴール。テープに触れると、テープが切れて飛んでいく（ボーナス）
// secret なら「ひみつのゴール」（色ちがいのゲート）：通ると地図の隠し道が開く（SMW の隠しゴール）
export const GOAL_POST_H = 144;
export class Goal extends Sprite {
  // tx, ty：ゲートの足元のタイル
  constructor(tx, ty, secret = false) {
    super(tx * 16, (ty + 1) * 16);
    this.type = 'goal';
    this.secret = secret;
    this.bottom = (ty + 1) * 16;      // 地面の高さ
    this.base = this.bottom - 24;     // テープの一番下 ($1528)
    this.y = this.base;               // テープの高さ
    this.timer = 0;                   // $1540
    this.dir = 0;                     // $1588
    this.done = false;                // $1602：通った
    this.cut = false;                 // $160E：テープに触れた
  }

  update(w) {
    if (this.cut) {
      // 切れたテープは飛んでいく
      this.moveX();
      this.moveY();
      this.ys = Math.min(this.ys + 1, 0x20);
      return;
    }
    if (this.done) return;
    // Spr07B_GoalTape (01C098)
    if (!this.timer) {
      this.timer = GOAL_TAPE_TIME;
      this.dir++;
    }
    this.timer--;
    this.ys = GOAL_TAPE_YSPEED[this.dir & 1];
    this.moveY();
    const p = w.player;
    // 柱の間を、テープの一番下より上・柱のてっぺんより下で通る（柱より上を通った時は反応しない。
    // 洞窟の中のゴールの真上を歩いても反応しないように。SMW のゴールは上が空いた所にしか無いので上の判定は無い）
    if (((p.xpos - (this.x - 8)) & 0xffff) < 0x10 && p.ypos <= this.base && p.ypos + 0x20 > this.bottom - GOAL_POST_H) {
      this.done = true;
      if (touchesPlayer(p, this.hitbox)) {
        this.cut = true;
        this.x0 = this.x;
        this.xs = 16;
        this.ys = -16;
        w.emit('tape');
      }
      w.reachGoal(this.secret);
    }
  }

  get hitbox() { return { x: this.x - 8, y: this.y, w: 16, h: 4 }; }
}

// ---- 電気街の敵（1-1 アキハバラ）。動きはオリジナル（ルミナ側の処理は SMW のまま） ----

// 踏まれた時の共通処理。踏めたら true（呼び出し側で倒す・弱らせる）
function stompCheck(w, a) {
  const p = w.player;
  const above = stompsFromAbove(p, a.hitbox, a.onFloor);
  if (above) {
    p.boost();
    p.stompCount++;
    w.star(p.xpos + 4, p.ypos + 0x1c);
    w.emit('kick');
    return true;
  }
  if (p.sliding) {
    a.kill(a.playerIsLeft(p) ? 1 : -1);
    w.star(a.x, a.y);
    w.emit('kick');
    return false;
  }
  if (p.hurt()) w.onPlayerHurt();
  return false;
}

// やられて落ちていく（共通）
function updateDying(a) {
  a.moveY();
  a.ys = Math.min(a.ys + SPR_GRAVITY, SPR_MAX_FALL);
  a.moveX();
  if (a.y > LEVEL_H + 64) a.dead = true;
}

class Enemy extends Sprite {
  constructor(x, y) {
    super(x, y);
    this.enemy = true;
    this.dying = false;
  }

  kill(dir) {
    this.dying = true;
    this.ys = -0x20;
    this.xs = dir * 8;
  }

  touch(w) {
    if (this.contactTimer || !touchesPlayer(w.player, this.hitbox)) return;
    this.contactTimer = 8;
    if (stompCheck(w, this)) this.stomped(w);
  }

  stomped(w) { this.kill(w.player.xpos < this.x ? 1 : -1); }
}

// ガチャカプセル：地面をころころ転がる。壁で向きを変え、段差からは落ちる。上から踏める
export class Capsule extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'capsule';
    this.facing = 0;
  }

  get hitbox() { return { x: this.x + 1, y: this.y + 2, w: 14, h: 14 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.dying) return updateDying(this);
    this.xs = this.facing ? 6 : -6;
    this.moveY();
    this.gravity();
    this.moveX();
    const f = this.collide(w.level);
    if (f.floor) this.ys = 0;
    if (f.ceiling) this.ys = 0;
    if (f.wall) this.facing ^= 1;
    this.touch(w);
    if (this.offscreen(w, 192)) this.dead = true;
  }
}

// 砲弾 (Spr01C_BulletBill)：砲台から撃たれ、ルミナのいた側へ 2px/フレームでまっすぐ飛ぶ。
// 地形はすり抜ける。上から踏める（踏むと落ちる）
export class Bullet extends Enemy {
  constructor(x, y, dir) {
    super(x, y);
    this.type = 'bullet';
    this.facing = dir > 0 ? 1 : 0;
    this.xs = dir > 0 ? BULLET_XSPEED : -BULLET_XSPEED;
    this.emerge = BULLET_EMERGE; // 出てすぐは砲台の後ろに描く ($1540)
  }

  get hitbox() { return { x: this.x + 1, y: this.y + 3, w: 14, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.emerge) this.emerge--;
    if (this.dying) return updateDying(this);
    this.moveX();
    this.touch(w);
    if (this.offscreen(w, 32)) this.dead = true;
  }

  stomped(w) {
    // 踏まれると真下へ落ちる
    this.dying = true;
    this.xs = 0;
    this.ys = 0;
  }
}

// 警備ロボ：その場でときどき跳ねる。3 回踏むと倒れる
export class Robo extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'robo';
    this.hp = 3;
    this.timer = 40;
    this.flash = 0;
  }

  // 体は 16x24（足元の 16x16 が地形との判定）
  get hitbox() { return { x: this.x + 2, y: this.y - 6, w: 12, h: 22 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.flash) this.flash--;
    if (this.dying) return updateDying(this);
    this.facing = w.player.xpos > this.x ? 1 : 0;
    this.xs = 0;
    this.moveY();
    this.gravity();
    const f = this.collide(w.level);
    if (f.floor) {
      this.ys = 0;
      if (--this.timer <= 0) {
        this.ys = -0x38;
        this.timer = 72;
      }
    }
    if (f.ceiling) this.ys = 0;
    this.touch(w);
    if (this.offscreen(w, 192)) this.dead = true;
  }

  stomped(w) {
    this.contactTimer = 16;
    this.flash = 24;
    if (--this.hp <= 0) this.kill(w.player.xpos < this.x ? 1 : -1);
  }
}

// ドローン：左右に行き来しながら、ふわふわ上下する。踏むと落ちる
export class Drone extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'drone';
    this.x0 = x;
    this.y0 = y;
    this.t = 0;
    this.facing = 0;
  }

  get hitbox() { return { x: this.x + 2, y: this.y + 4, w: 12, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.dying) return updateDying(this);
    this.t++;
    this.xs = this.facing ? 8 : -8;
    this.moveX();
    if (this.x < this.x0 - 48) this.facing = 1;
    if (this.x > this.x0 + 48) this.facing = 0;
    this.y = this.y0 + Math.round(Math.sin(this.t / 16) * 6);
    this.touch(w);
    if (this.offscreen(w, 192)) this.dead = true;
  }
}

// 電気スパーク：一定の間かくで真上に跳ね上がり、元の場所へ落ちてくる。
// 触れるとダメージ。スピンジャンプで上から踏むと跳ね返れる（トゲムシと同じ）
export class Spark extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'spark';
    this.y0 = y;
    this.timer = 30;
    this.jumping = false;
  }

  get hitbox() { return { x: this.x + 3, y: this.y + 3, w: 10, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.dying) return updateDying(this);
    if (!this.jumping) {
      if (--this.timer <= 0) {
        this.jumping = true;
        this.ys = -0x40;
      }
    } else {
      this.moveY();
      this.ys += 2;
      if (this.ys > 0 && this.y >= this.y0) {
        this.y = this.y0;
        this.ys = 0;
        this.jumping = false;
        this.timer = 48;
      }
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      const p = w.player;
      const above = stompsFromAbove(p, this.hitbox, false);
      if (above && p.spin) {
        p.boost();
        w.star(p.xpos + 4, p.ypos + 0x1c);
        w.emit('bounce');
      } else if (p.hurt()) {
        w.onPlayerHurt();
      }
    }
    if (this.offscreen(w, 192)) this.dead = true;
  }
}

// ---- ボス：かげの王 ----
// 歩いて近づき、ときどき跳ぶ・かげの玉を投げる。上から踏む（か物を当てる）とダメージで、
// トゲの球になって部屋を転がる（その間は踏めない）。3 回で倒れ、コースクリアになる
export class Boss extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'boss';
    this.hp = 3;
    this.maxHp = 3;
    this.variant = 1;  // 1 かげの王 / 2 ほのおの王 / 3 やみの王 / 4 いわの王
    this.balls = 1;    // 一度に投げる玉の数
    this.baseRage = 0; // はじめの速さ（弱るほど速くなる）
    this.rocks = false; // 大ジャンプの着地で天井から落石を降らせる
    this.shock = false; // 大ジャンプの着地で床を走る電撃を左右に出す
    this.pillars = false; // 大ジャンプの着地で床から火柱を噴き上げる
    this.state = 'walk';
    this.timer = 90;
    this.inv = 0;      // ダメージ後の無敵
    this.moves = 0;
    this.dir = -1;
  }

  // 絵は 32x32（地形との判定は足元の 16x16）
  get hitbox() { return { x: this.x - 6, y: this.y - 12, w: 28, h: 28 }; }

  update(w) {
    this.w = w;
    if (this.contactTimer) this.contactTimer--;
    if (this.inv) this.inv--;
    if (this.dying) {
      // やられた：星をまき散らして消え、クリア
      if ((this.timer & 7) === 0) w.star(this.x - 8 + ((this.timer * 7) % 28), this.y - 14 + ((this.timer * 5) % 26));
      if (--this.timer <= 0) {
        this.dead = true;
        w.reachGoal();
      }
      return;
    }
    const p = w.player;
    const rage = Math.min(4, this.maxHp - this.hp + this.baseRage); // 弱るほど速い
    if (this.state === 'shell') {
      this.xs = this.dir * (0x1c + rage * 4);
    } else {
      this.facing = p.xpos > this.x ? 1 : 0;
      if (this.onFloor) this.xs = (this.facing ? 1 : -1) * (5 + rage * 3);
    }
    this.moveY();
    this.gravity();
    this.moveX();
    const f = this.collide(w.level);
    if (f.floor) this.ys = 0;
    if (f.ceiling) this.ys = 0;
    if (f.floor && this.jumped) {
      // 大ジャンプの着地
      this.jumped = false;
      if (this.rocks && !this.dying) this.dropRocks(w);
      if (this.shock && !this.dying && this.state !== 'shell') this.sendShock(w);
      if (this.pillars && !this.dying && this.state !== 'shell') this.raisePillars(w);
    }
    if (this.state === 'shell') {
      if (f.wall) {
        this.dir = -this.dir;
        w.emit('bump');
      }
      if (--this.timer <= 0) {
        this.state = 'walk';
        this.timer = 50;
      }
    } else if (f.floor && --this.timer <= 0) {
      this.timer = 96 - rage * 16;
      if (this.moves++ & 1) {
        this.ys = -0x50; // 大ジャンプ
        this.xs = (this.facing ? 1 : -1) * 0x10;
        this.jumped = true;
      } else {
        w.actors.push(new ShadowBall(this.x + (this.facing ? 14 : -14), this.y - 6, this.facing ? 1 : -1));
        // ほのおの王・いわの王は高さの違う玉を 2 つ、やみの王は 3 つ投げる
        for (let i = 1; i < this.balls; i++) {
          w.actors.push(new ShadowBall(this.x + (this.facing ? 14 : -14), this.y - 6 - 24 * i, this.facing ? 1 : -1));
        }
        w.emit('throw');
      }
    }
    if (!this.contactTimer && touchesPlayer(p, this.hitbox)) {
      this.contactTimer = 8;
      if (this.state !== 'shell' && !this.inv && stompsFromAbove(p, this.hitbox, this.onFloor)) {
        p.boost();
        w.star(p.xpos + 4, p.ypos + 0x1c);
        this.damage();
      } else if (!this.inv || this.state === 'shell') {
        if (p.hurt()) w.onPlayerHurt();
      }
    }
  }

  // 踏まれた・物を当てられた
  damage() {
    if (this.inv || this.dying) return;
    const w = this.w;
    this.hp--;
    this.inv = 40;
    w.emit('kick');
    if (this.hp <= 0) {
      this.dying = true;
      this.timer = 110;
      this.xs = 0;
      w.emit('bossdown');
      return;
    }
    this.state = 'shell';
    this.timer = 150;
    this.dir = w.player.xpos > this.x ? 1 : -1;
  }

  kill() { if (this.w) this.damage(); }

  // 床から火柱を 3 本（ルミナの足もと・少し前・少し後ろ）。少しの間、床が光ってから噴き上がる
  raisePillars(w) {
    const lv = w.level;
    const px = w.player.xpos + 8;
    for (const dx of [-40, 0, 40]) {
      const tx = Math.max(1, Math.min(lv.width - 2, Math.floor((px + dx) / 16)));
      // ボスの足もとの高さの床から
      w.actors.push(new FirePillar(tx * 16, this.y + 16));
    }
    w.emit('rumble');
  }

  // 床を走る電撃を左右に 1 つずつ（弱るほど速い）
  sendShock(w) {
    const rage = Math.min(4, this.maxHp - this.hp + this.baseRage);
    for (const dir of [-1, 1]) w.actors.push(new Shock(this.x + dir * 12, this.y, dir, 0x18 + rage * 4));
    w.emit('shock');
  }

  // 天井から落石を 3 つ（ルミナのまわり。真上・少し前・少し後ろ）
  dropRocks(w) {
    const p = w.player;
    const lv = w.level;
    for (const dx of [-28, 4, 36]) {
      const x = Math.max(16, Math.min(lv.widthPx - 32, p.xpos + dx));
      // 天井（固いブロック）のすぐ下から落とす
      let y = this.y;
      while (y > 0 && !lv.solidPx(x + 8, y - 1)) y -= 16;
      w.actors.push(new FallingRock(x, Math.floor(y / 16) * 16, Math.abs(dx) * 0.8));
    }
    w.emit('bump');
  }
}

// ネオンの王の電撃：床に沿って左右へ走る。壁や床の切れ目で消える。触れるとダメージ。
// スピンジャンプで上から踏むと跳ね返れる（電気スパークと同じ）
export class Shock extends Sprite {
  constructor(x, y, dir, speed) {
    super(x, y);
    this.type = 'shock';
    this.xs = dir * speed;
    this.facing = dir > 0 ? 1 : 0;
  }

  get hitbox() { return { x: this.x + 2, y: this.y + 6, w: 12, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    this.moveX();
    const lv = w.level;
    const front = this.x + (this.xs > 0 ? 15 : 0);
    if (lv.solidPx(front, this.y + 8) || !lv.floorPx(this.x + 8, this.y + 16) || this.offscreen(w, 32)) {
      this.dead = true;
      return;
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      const p = w.player;
      if (p.spin && stompsFromAbove(p, this.hitbox, false)) {
        p.boost();
        w.star(p.xpos + 4, p.ypos + 0x1c);
        w.emit('bounce');
      } else if (p.hurt()) {
        w.onPlayerHurt();
      }
    }
  }
}

// かざんの王の火柱：床が光って煙が出たあと (warn)、火柱が噴き上がり (up)、しばらくして引っこむ。
// 噴き上がっている間は触れるとダメージ。高さは 3 マス半（橋の上には届かない）
export const PILLAR_H = 56;
export class FirePillar extends Sprite {
  constructor(x, floorY) {
    super(x, floorY - 16);
    this.type = 'pillar';
    this.floorY = floorY;
    this.t = 0;
    this.h = 0;
  }

  get hitbox() { return { x: this.x + 3, y: this.floorY - this.h, w: 10, h: this.h }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    this.t++;
    const WARN = 44, UP = 8, STAY = 34;
    if (this.t < WARN) this.h = 0;
    else if (this.t < WARN + UP) this.h = Math.round((PILLAR_H * (this.t - WARN + 1)) / UP);
    else if (this.t < WARN + UP + STAY) this.h = PILLAR_H;
    else this.h = Math.max(0, this.h - 7);
    if (this.t === WARN) w.emit('fire');
    if (this.t > WARN + UP + STAY && !this.h) {
      this.dead = true;
      return;
    }
    if (this.h && !this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      if (w.player.hurt()) w.onPlayerHurt();
    }
  }
}

// コウモリ：天井にぶら下がっていて、ルミナが近くの下に来ると、斜めに急降下してから横へ飛んでいく。
// 地形はすり抜ける。上から踏める
export class Bat extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'bat';
    this.mode = 'hang';
    this.t = 0;
  }

  get hitbox() { return { x: this.x + 2, y: this.y + 3, w: 12, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.dying) return updateDying(this);
    this.t++;
    const p = w.player;
    if (this.mode === 'hang') {
      if (Math.abs(p.xpos - this.x) < 80 && p.ypos > this.y) {
        this.mode = 'swoop';
        this.facing = p.xpos > this.x ? 1 : 0;
        this.xs = this.facing ? 0x10 : -0x10;
        this.ys = 0x30;
      }
    } else {
      this.moveX();
      this.moveY();
      if (this.ys > 0) this.ys--; // 下りながら横向きの飛び方に変わる
      if (this.offscreen(w, 64)) this.dead = true;
    }
    this.touch(w);
    if (this.mode === 'hang' && this.offscreen(w, 192)) this.dead = true;
  }
}

// ひのこ：溶岩の中にひそんでいて、ときどき高く跳び出しては元の場所へ落ちてくる。
// 跳んでいる間だけ見えて、触れるとダメージ。スピンジャンプで上から踏むと跳ね返れる
export class Ember extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'ember';
    this.y0 = y;
    this.timer = 30 + ((x >> 4) % 4) * 22; // 並んでいる時は少しずつずらす
    this.jumping = false;
  }

  get hitbox() { return { x: this.x + 3, y: this.y + 2, w: 10, h: 12 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.dying) return;
    if (!this.jumping) {
      if (--this.timer <= 0) {
        this.jumping = true;
        this.ys = -0x48;
        if (this.x > w.camera.x - 16 && this.x < w.camera.x + 256) w.emit('ember');
      }
      return;
    }
    this.moveY();
    this.ys += 2;
    if (this.ys > 0 && this.y >= this.y0) {
      this.y = this.y0;
      this.ys = 0;
      this.jumping = false;
      this.timer = 96;
      return;
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      const p = w.player;
      if (p.spin && stompsFromAbove(p, this.hitbox, false)) {
        p.boost();
        w.star(p.xpos + 4, p.ypos + 0x1c);
        w.emit('bounce');
      } else if (p.hurt()) {
        w.onPlayerHurt();
      }
    }
    if (this.offscreen(w, 192)) this.dead = true;
  }
}

// 落石（いわの王）：少し揺れてから落ちてくる。触れるとダメージ。床に当たると砕ける
export class FallingRock extends Sprite {
  constructor(x, y, wait = 0) {
    super(x, y);
    this.type = 'rock';
    this.wait = 24 + Math.round(wait); // 落ちる前に揺れる時間
  }

  get hitbox() { return { x: this.x + 2, y: this.y + 2, w: 12, h: 12 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.wait) {
      this.wait--;
    } else {
      this.moveY();
      this.ys = Math.min(this.ys + SPR_GRAVITY, SPR_MAX_FALL);
      if (w.level.solidPx(this.x + 8, this.y + 15)) {
        this.dead = true;
        w.addPieces(this.x, this.y, 'gold');
        w.emit('shatter');
        return;
      }
    }
    if (this.y > LEVEL_H) this.dead = true;
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      if (w.player.hurt()) w.onPlayerHurt();
    }
  }
}

// ほのおの王（ワールド 2 のボス）：かげの王より速く、5 回踏まないと倒れない。玉を 2 つ投げる
export class Boss2 extends Boss {
  constructor(x, y) {
    super(x, y);
    this.hp = 5;
    this.maxHp = 5;
    this.variant = 2;
    this.balls = 2;
    this.baseRage = 1;
  }
}

// やみの王（ワールド 3 のボス）：7 回踏まないと倒れない。玉を 3 つ投げる
export class Boss3 extends Boss {
  constructor(x, y) {
    super(x, y);
    this.hp = 7;
    this.maxHp = 7;
    this.variant = 3;
    this.balls = 3;
    this.baseRage = 2;
  }
}

// いわの王（ワールド 4 のボス）：6 回踏まないと倒れない。玉を 2 つ投げ、大ジャンプの着地で天井から落石を降らせる
export class Boss4 extends Boss {
  constructor(x, y) {
    super(x, y);
    this.hp = 6;
    this.maxHp = 6;
    this.variant = 4;
    this.balls = 2;
    this.baseRage = 2;
    this.rocks = true;
  }
}

// かざんの王（ワールド 7 のボス）：8 回踏まないと倒れない。玉を 2 つ投げ、
// 大ジャンプの着地でルミナのまわりの床から火柱を噴き上げる（床が光ったら離れるか、橋の上へ）
export class Boss7 extends Boss {
  constructor(x, y) {
    super(x, y);
    this.hp = 8;
    this.maxHp = 8;
    this.variant = 7;
    this.balls = 2;
    this.baseRage = 2;
    this.pillars = true;
  }
}

// ネオンの王（ワールド 6 のボス）：7 回踏まないと倒れない。玉を 2 つ投げ、
// 大ジャンプの着地で床を走る電撃を左右に出す（跳んでよける）
export class Boss6 extends Boss {
  constructor(x, y) {
    super(x, y);
    this.hp = 7;
    this.maxHp = 7;
    this.variant = 6;
    this.balls = 2;
    this.baseRage = 2;
    this.shock = true;
  }
}

// そらの王（ワールド 5 のボス）：空を飛ぶ。ルミナの上を追いかけ、玉の雨を降らせるのと、
// 急降下して床に降りる（しばらく休む）のを交互に行う。上から踏める。6 回で倒れる
export class Boss5 extends Boss {
  constructor(x, y) {
    super(x, y);
    this.hp = 6;
    this.maxHp = 6;
    this.variant = 5;
    this.baseRage = 1;
    this.state = 'rise';
    this.t = 0;
    this.rain = 3; // 玉の雨の数
  }

  update(w) {
    this.w = w;
    if (this.contactTimer) this.contactTimer--;
    if (this.inv) this.inv--;
    if (this.dying || this.state === 'shell') {
      // やられた時・トゲの球の時は、ふつうの王と同じ（床を転がる）
      if (this.state === 'shell' && !this.dying && this.timer <= 1) {
        this.state = 'rise';
        this.timer = 0;
        return;
      }
      super.update(w);
      return;
    }
    const p = w.player;
    const rage = Math.min(4, this.maxHp - this.hp + this.baseRage);
    this.t++;
    // 飛ぶ高さ：床の上 4 マス半（床が見つからなければ今の高さ）
    if (this.floorY === undefined) this.floorY = this.y;
    const flyY = this.floorY - 72;
    if (this.state === 'rise') {
      this.y -= 2;
      if (this.y <= flyY) {
        this.y = flyY;
        this.state = 'fly';
        this.timer = 110 - rage * 15;
      }
    } else if (this.state === 'fly') {
      // ルミナの上へ寄っていく。ふわふわ上下
      this.facing = p.xpos > this.x ? 1 : 0;
      const dx = p.xpos - this.x;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), 1 + (rage >> 1));
      this.y = flyY + Math.round(Math.sin(this.t / 10) * 4);
      if (--this.timer <= 0) {
        if (this.moves++ & 1) {
          this.state = 'dive';
          this.ys = 0;
        } else {
          // 玉の雨：真下へ rain 個（24px おき）
          for (let i = 0; i < this.rain; i++) {
            const ox = (i - (this.rain - 1) / 2) * 24;
            const b = new ShadowBall(this.x + ox, this.y + 4, 0);
            b.xs = 0;
            b.ys = 0x18;
            w.actors.push(b);
          }
          w.emit('throw');
          this.timer = 90 - rage * 12;
        }
      }
    } else if (this.state === 'dive') {
      this.moveY();
      this.ys = Math.min(this.ys + 4, 0x40);
      const f = this.collide(w.level);
      if (f.floor) {
        this.floorY = this.y;
        this.ys = 0;
        this.state = 'rest';
        this.timer = 70 - rage * 8;
        w.emit('bump');
        if (this.pillars) this.raisePillars(w); // やみの大王：急降下の着地で火柱
      }
    } else if (this.state === 'rest') {
      // 床で休む（踏むチャンス）
      if (--this.timer <= 0) this.state = 'rise';
    }
    this.onFloor = this.state === 'rest';
    if (!this.contactTimer && touchesPlayer(p, this.hitbox)) {
      this.contactTimer = 8;
      if (!this.inv && stompsFromAbove(p, this.hitbox, this.onFloor)) {
        p.boost();
        w.star(p.xpos + 4, p.ypos + 0x1c);
        this.damage();
        if (this.state === 'shell') this.floorY ??= this.y;
      } else if (!this.inv) {
        if (p.hurt()) w.onPlayerHurt();
      }
    }
  }
}

// やみの大王（ワールド 8 の最後のボス）：10 回踏まないと倒れない。
// 前半（体力 6 以上）は地上で玉を 3 つ投げ、大ジャンプの着地で床を走る電撃を出す。
// 後半（体力 5 以下）は翼を広げて飛び、玉の雨（5 つ）と急降下。急降下の着地で火柱を噴き上げる
export const BOSS8_HP = 10;
export class Boss8 extends Boss5 {
  constructor(x, y) {
    super(x, y);
    this.hp = BOSS8_HP;
    this.maxHp = BOSS8_HP;
    this.variant = 8;
    this.balls = 3;
    this.baseRage = 2;
    this.rain = 5;
    this.shock = true;
    this.state = 'walk';
    this.timer = 90;
    this.phase2 = false;
  }

  update(w) {
    if (!this.phase2 && this.hp > BOSS8_HP / 2) {
      Boss.prototype.update.call(this, w);
      return;
    }
    if (!this.phase2) {
      // 後半へ：電撃をやめて、空を飛び、火柱を使う
      this.phase2 = true;
      this.shock = false;
      this.pillars = true;
      this.baseRage = 1;
      if (this.state !== 'shell') this.state = 'rise';
      w.emit('rumble');
    }
    super.update(w);
  }
}

// かげの玉：ボスが投げる。まっすぐ飛び、壁で消える。踏めない
export class ShadowBall extends Sprite {
  constructor(x, y, dir) {
    super(x, y);
    this.type = 'shadowball';
    this.xs = dir * 0x18;
  }

  get hitbox() { return { x: this.x + 3, y: this.y + 3, w: 10, h: 10 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    this.moveX();
    if (this.ys) this.moveY(); // そらの王の玉の雨は真下へ落ちる
    if (w.level.solidPx(this.x + 8, this.y + 8) || this.offscreen(w, 32)) {
      this.dead = true;
      return;
    }
    if (!this.contactTimer && touchesPlayer(w.player, this.hitbox)) {
      this.contactTimer = 8;
      if (w.player.hurt()) w.onPlayerHurt();
    }
  }
}
