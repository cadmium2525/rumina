// ブロック・敵などのスプライト。SMW のスプライト処理（bank 01）を移植している。
// 速度は 1/16 px/frame、座標は 1px 単位（左上）。DOM に依存しない。
import { LEVEL_H, SCREEN_W } from './level.js';
import { PAD } from './player.js';
import {
  SHELL_X_SPEED, PLACED_X_OFFSET, PLACED_X_SPEED, CARRIED_X_OFFSET,
  SPR_GRAVITY, SPR_MAX_FALL, STUN_BOUNCE,
} from './smw_tables.js';

const u8 = (v) => v & 0xff;
const s8 = (v) => ((v & 0xff) << 24) >> 24;

// 「つかむ」ボタンが押されているか。タッチ操作ではラッチされることがある（input.js）
export function grabHeld(pad) {
  return pad.grab !== undefined ? pad.grab : !!(pad.hold1 & PAD.Y);
}

export function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
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
    const t = this.subX + u8(this.xs * 16);
    this.subX = t & 0xff;
    this.x += (this.xs >> 4) + (t >> 8);
  }

  // HandleNormalSpriteGravity (019032) の加速部分
  gravity() {
    const v = this.ys + SPR_GRAVITY;
    this.ys = v >= SPR_MAX_FALL ? SPR_MAX_FALL : v;
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
    if (this.ys >= 0) {
      const fy = this.y + 16;
      for (const px of [this.x + 4, this.x + 11]) {
        if (level.solidPx(px, fy) && (fy & 15) < 8) {
          f.floor = true;
          this.y = Math.floor(fy / 16) * 16 - 16;
          break;
        }
      }
    } else if (level.solidPx(this.x + 8, this.y)) {
      f.ceiling = true;
      f.tx = Math.floor((this.x + 8) / 16);
      f.ty = Math.floor(this.y / 16);
      this.y = (f.ty + 1) * 16;
    }
    return f;
  }

  // プレイヤーが自分の左にいれば 1（CheckPlayerPositionRelativeToSprite_Bank01_X）
  playerIsLeft(p) { return p.xpos + 8 < this.x + 8 ? 1 : 0; }

  offscreen(w, margin) {
    const cx = w.camera.x;
    return this.x < cx - margin || this.x > cx + SCREEN_W + margin || this.y > LEVEL_H + 64;
  }
}

// 持ち運べるギフトボックス（SMW のスローブロック, sprite 0x53）
export class GiftBox extends Sprite {
  constructor(x, y) {
    super(x, y);
    this.type = 'gift';
    this.state = 'idle'; // idle(=気絶, status 9) / kicked(10) / carried(11)
  }

  get hitbox() { return { x: this.x + 1, y: this.y + 1, w: 14, h: 15 }; }

  update(w) {
    if (this.contactTimer) this.contactTimer--;
    if (this.state === 'carried') this.updateCarried(w);
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
    if (!this.contactTimer && overlap(w.player.hitbox, this.hitbox)) {
      this.contactTimer = 8;
      const p = w.player;
      if (grabHeld(p.in) && !p.carrying) {
        // 持ち上げる (01AA42)
        this.state = 'carried';
        p.carrying = this;
        p.pickPoseTimer = 8;
        w.emit('grab');
      } else {
        // 蹴り飛ばす
        this.state = 'kicked';
        this.xs = s8(SHELL_X_SPEED[this.playerIsLeft(p) ? 1 : 0]);
        this.contactTimer = 16;
        w.emit('kick');
      }
    }
  }

  // SprStatus0A_Kicked (019913)：まっすぐ滑る。壁で砕ける
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
      if (a.type === 'spiker' && !a.dead && !a.dying && overlap(this.hitbox, a.hitbox)) {
        a.kill(this.xs < 0 ? -1 : 1);
        w.emit('kick');
      }
    }
  }

  // MakeNormalSpriteReboundOffWall (01999E)：壁に当たってブロックを叩き、自分は砕ける
  rebound(w, f) {
    w.hitTile(f.tx, f.ty);
    this.shatter(w);
  }

  shatter(w) {
    this.dead = true;
    w.addPieces(this.x, this.y, 'gift');
    w.emit('shatter');
  }

  // SprStatus0B_Carried (019F71)
  updateCarried(w) {
    const p = w.player;
    if (grabHeld(p.in)) {
      this.followPlayer(p);
      return;
    }
    // Y を離した：投げる / 置く / 真上に投げる (019FDC〜)
    p.carrying = null;
    const h = p.in.hold1;
    this.contactTimer = 16;
    p.kickPoseTimer = 12;
    if (h & PAD.UP) {
      this.state = 'idle';
      this.ys = -0x70;
      this.xs = s8(p.xspeed) >> 1;
      w.emit('throw');
    } else if (!(h & 3)) {
      // 何も押していなければそっと置く
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
    this.x = p.xpos + CARRIED_X_OFFSET[v1];
    this.y = p.ypos + (p.ducking || p.pickPoseTimer ? 10 : 8);
    this.xs = 0;
    this.ys = 0;
    this.subX = 0;
    this.subY = 0;
  }

  // ダメージを受けて落とした
  drop() {
    this.state = 'idle';
    this.xs = 0;
    this.ys = 0;
    this.contactTimer = 16;
  }
}

// トゲムシ（SMW の Spiny 相当）。普通に踏むとダメージ、スピンジャンプで踏むと跳ね返る
export class Spiker extends Sprite {
  constructor(x, y) {
    super(x, y);
    this.type = 'spiker';
    this.dying = false;
    this.facing = 0;
    this.xs = -8;
  }

  get hitbox() { return { x: this.x + 2, y: this.y + 4, w: 12, h: 12 }; }

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
    if (!this.contactTimer && overlap(w.player.hitbox, this.hitbox)) {
      this.contactTimer = 8;
      this.touchPlayer(w);
    }
    if (this.offscreen(w, 192)) this.dead = true;
  }

  // CheckPlayerToNormalSpriteColl_01A80F：上からスピンジャンプなら跳ね返る。それ以外はダメージ
  touchPlayer(w) {
    const p = w.player;
    const hb = this.hitbox;
    const above = !(p.yspeed & 0x80) && p.ypos + 0x20 <= hb.y + 10;
    if (above && p.spin) {
      p.boost();
      w.star(p.xpos + 4, p.ypos + 0x1c);
      w.emit('bounce');
      return;
    }
    const dir = hb.x + 6 > p.xpos + 8 ? 1 : -1;
    if (p.hurt(dir)) w.onPlayerHurt();
  }

  // 飛んできたブロックに倒される
  kill(dir) {
    this.dying = true;
    this.ys = -0x20;
    this.xs = dir * 8;
    this.contactTimer = 0;
  }
}
