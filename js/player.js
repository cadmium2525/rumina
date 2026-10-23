// ルミナ（プレイヤー）
// スーパーマリオワールドのプレイヤー処理（PlayerState00, 00CC68〜）を
// 8bit/16bit の演算挙動ごと移植している。速度は 1/16 px/frame 単位。
import {
  JUMP_HEIGHT, DECEL, ACCEL, MAX_SPEED, SLOPE_REST_SPEED, PMETER_DELTA,
  GRAVITY, MAX_FALL, ANIM_SPEED, WALK_POSE_COUNT, SPIN_POSES, SPIN_FACING,
  BOOST_HOLD_B, BOOST_NORMAL,
  SLOPE_SHAPE, SLOPE_TYPE, SLOPE_PLAYER, SLOPE_STATIONARY_YSPEED, SLOPE_TOWARDS_PEAK_YSPEED,
  SLOPE_SNAP, SLOPE_FLAT, SLIDE_START,
  SWIM_POSES, SWIM_YSPEED, WATER_JUMP_OUT, CLIMB_SPEED, JUMP_FROM_VINE, CLIMB_POSE,
} from './smw_tables.js';
import { TILE, isSlope, slopeK } from './level.js';

const u8 = (v) => v & 0xff;
const s8 = (v) => ((v & 0xff) << 24) >> 24;
const u16 = (v) => v & 0xffff;
const abs8 = (v) => (v & 0x80 ? u8(-v) : u8(v));

// コントローラビット（SMW の $15/$16 と $17/$18 と同じ並び）
export const PAD = {
  B: 0x80, Y: 0x40, SELECT: 0x20, START: 0x10, UP: 0x08, DOWN: 0x04, LEFT: 0x02, RIGHT: 0x01,
};
export const PAD2 = { A: 0x80, X: 0x40, L: 0x20, R: 0x10 };

// 空中フラグ（SMW の $72 と同値。ポーズ番号としても使われる）
const AIR_JUMP = 0x0b;
const AIR_RUNJUMP = 0x0c;
const AIR_FALL = 0x24;

export const POSE = {
  STAND: 0x00, WALK1: 0x01, WALK2: 0x02, LOOKUP: 0x03,
  RUN0: 0x04, RUN1: 0x05, RUN2: 0x06,
  CARRY0: 0x07, CARRY1: 0x08, CARRY2: 0x09, CARRY_UP: 0x0a,
  JUMP: AIR_JUMP, RUNJUMP: AIR_RUNJUMP, SKID: 0x0d, KICK: 0x0e, FACE: 0x0f,
  CLIMB: 0x15, SWIM_A: 0x16, SWIM_A_CARRY: 0x17, SWIM: 0x18, SWIM_CARRY: 0x19,
  SWIM_B: 0x1a, SWIM_B_CARRY: 0x1b, SLIDE: 0x1c,
  PICKUP: 0x1d, CARRY_JUMP: 0x1e,
  FALL: AIR_FALL, DUCK: 0x3c, BACK: 0x44, FRONT: 0x45,
};

export const HURT_TIME = 0x7f;

export class Player {
  constructor(x, y) {
    this.xpos = x;          // 16bit 位置（当たり判定 16x32 の左上）
    this.ypos = y;
    this.subX = 0;          // サブピクセル
    this.subY = 0;
    this.xspeed = 0;        // u8（符号付きとして解釈）
    this.subXspeed = 0;     // u8
    this.yspeed = 0;        // u8
    this.inAir = 0;
    this.spin = 0;
    this.facing = 1;        // 0=左 1=右
    this.ducking = 0;
    this.pmeter = 0;
    this.turning = 0;
    this.blocked = 0;
    this.slope = 0;         // 乗っている坂の番号 ($13EE)。平地・空中は 0
    this.slope2 = 0;        // 乗っている坂の向きと傾き ($13EF)
    this.sliding = 0;       // しゃがみ滑り ($13ED)
    this.swimming = 0;      // 泳いでいる ($75)
    this.canJumpOut = 0;    // 水面にいて飛び出せる ($13FA)
    this.climbing = 0;      // ツタにつかまっている ($74)
    this.var8a = 0;         // 水に入っている判定点 (bit0 中心, bit1 頭, bit2 足)
    this.var8b = 0;         // ツタに触れている判定点 (bit0,3,4 中心, bit1 頭, bit2 足, bit3 横上, bit4 横下)
    this.onGround = 0;      // 地面・坂に触れた回数 ($13EF 系 player_on_ground_flag)
    this.animSpeedIndex = 0;
    this.walkFrame = 0;
    this.overrideWalk = 0;
    this.pose = POSE.STAND;
    this.carrying = null;   // 持っているスプライト
    // タイマー（毎フレーム 1 ずつ減る）
    this.animTimer = 0;
    this.runTakeoffTimer = 0;
    this.slideTurnTimer = 0;
    this.facePoseTimer = 0;   // 持ち替え中の正面向きポーズ ($1498)
    this.kickPoseTimer = 0;   // 投げ/蹴りポーズ ($149C)
    this.pickPoseTimer = 0;   // 持ち上げポーズ ($149B)
    this.hurtTimer = 0;       // ダメージ後の無敵 ($1497)
    this.stompCount = 0;      // 連続で踏んだ数 ($1697)。着地で 0 に戻る
    this.smokeRequests = [];
  }

  get xspeed16() { return (this.xspeed << 8) | this.subXspeed; }
  set xspeed16(v) { v = u16(v); this.xspeed = v >> 8; this.subXspeed = v & 0xff; }

  // 当たり判定の矩形（スプライトとの接触用）
  get hitbox() {
    const top = this.ypos + (this.ducking ? 0x14 : 0x06);
    return { x: this.xpos + 2, y: top, w: 12, h: this.ypos + 0x20 - top };
  }

  // 1 フレーム進める。input = {hold1, press1, hold2, press2}
  // env = {level, camX, frame, emit(name), breakTile(tx,ty), bumpTile(tx,ty)}
  update(input, env) {
    this.in = input;
    this.env = env;
    // タイマー減算 (00C47E 内のループ)
    if (this.animTimer) this.animTimer--;
    if (this.runTakeoffTimer) this.runTakeoffTimer--;
    if (this.slideTurnTimer) this.slideTurnTimer--;
    if (this.facePoseTimer) this.facePoseTimer--;
    if (this.kickPoseTimer) this.kickPoseTimer--;
    if (this.pickPoseTimer) this.pickPoseTimer--;
    if (this.hurtTimer) this.hurtTimer--;

    // PlayerState00
    this.overrideWalk = 0;
    // 00CD24
    if ((this.yspeed & 0x80) && (this.blocked & 8)) this.yspeed = 0;
    this.updatePosition();
    this.levelCollision();
    // 00CD39
    this.turning = 0;
    const h = input.hold1;
    if (this.climbing || (!this.carrying && (this.var8b & 0x1b) === 0x1b && (h & 0x0c) &&
        (this.inAir || (h & PAD.UP) || (this.var8b & 4)))) {
      // ツタにつかまる／つかまっている
      this.climbing = this.var8b;
      this.climb();
    } else if (this.swimming) {
      this.swim();
    } else {
      this.handlePhysics();
      this.handleInAir();
      this.setPose();
    }
  }

  // UpdatePlayerSpritePosition (00DC2D)
  updatePosition() {
    const tx = this.subX + u8(this.xspeed * 16);
    this.subX = tx & 0xff;
    this.xpos = u16(this.xpos + (s8(this.xspeed) >> 4) + (tx >> 8));
    const ty = this.subY + u8(this.yspeed * 16);
    this.subY = ty & 0xff;
    this.ypos = u16(this.ypos + (s8(this.yspeed) >> 4) + (ty >> 8));
  }

  // HandlePlayerLevelCollision (00E92B)
  levelCollision() {
    // ResetPlayerLevelCollisionRAM (00EAA6)
    this.animSpeedIndex = 0;
    this.blocked = 0;
    this.slope = 0;
    this.slope2 = 0;
    this.var8a = 0;
    this.var8b = 0;
    const temp8d = this.onGround * 2; // 前のフレームに地面にいたか
    this.onGround = 0;
    this.tileCollision(temp8d);
    // 画面端 (00E98C)
    const rel = (this.xpos - this.env.camX) << 16 >> 16;
    if (rel <= 232) {
      if (rel - 8 < 0) this.blocked |= 2;
    } else {
      this.blocked |= 1;
    }
    // 00EA0D：壁に埋まっていたら 1px ずつ押し戻す
    if (this.blocked & 3) {
      const push = (this.blocked & 2) ? 1 : -1;
      this.xpos = u16(this.xpos + push);
      this.animSpeedIndex = 3;
      // 壁に向かって進んでいれば速度を 0 に（E90D の符号と比較）
      if (((push < 0 ? 0xff : 0x01) ^ this.xspeed) & 0x80) this.xspeed = 0;
    }
    this.waterCheck();
  }

  // 00EA34：水に入る・泳ぐ・水面から飛び出す
  waterCheck() {
    this.canJumpOut = 0;
    let a = this.var8a;
    if (!(a & 1)) {
      // 体の中心が水の外
      this.swimming = 0;
      return;
    }
    a >>= 1;
    if (!this.swimming && !(this.yspeed & 0x80)) {
      // 頭まで水に入ったら泳ぎ始める
      if (!(a & 1)) return;
      this.env.emit('splash');
      this.yspeed = 0;
      this.swimming = 1;
      return;
    }
    const head = a & 1;
    if (head) {
      this.swimming = 1;
      return;
    }
    if (!this.swimming) return;
    // 水面：上向きの速さは -4 まで。↑ を押しながら B で飛び出す
    if (s8(0xfc - this.yspeed) >= 0) this.yspeed = 0xfc;
    this.canJumpOut++;
    if ((this.in.hold1 & 0x88) !== 0x88) return;
    if ((this.in.hold2 & PAD2.A) && !this.carrying) {
      this.spin = 1;
      this.env.emit('spin');
    }
    if (this.blocked & 8) return;
    this.env.emit('splash');
    this.inAir = AIR_JUMP;
    this.yspeed = WATER_JUMP_OUT;
    this.swimming = 0;
  }

  // RunPlayerBlockCode (00EADB〜)：体の 6 点でタイルを調べる (kGetPlayerLevelCollisionMap16ID_DATA_00E832/E89C)。
  // 立ち：中心=y+0x12 横(下)=y+0x1A 横(上)=y+0x0F 頭=y+0x08 足=y+0x20（x は体の左右で切り替え）
  // しゃがみ：中心=y+0x18 横=y+0x1A/0x16 頭=y+0x10
  tileCollision(temp8d) {
    const { level } = this.env;
    const wasAir = this.inAir; // temp8f
    const duck = this.ducking;
    const center = duck ? 0x18 : 0x12;
    const sideLo = 0x1a;
    const sideHi = duck ? 0x16 : 0x0f;
    const headOff = duck ? 0x10 : 0x08;
    const x = this.xpos;
    const y = this.ypos;
    const hd = (x & 0xf) >= 8 ? 1 : 0; // タイル内の左右どちらにいるか

    const ct = level.tileAtPx(x + 8, y + center);
    if (level.solidPx(x + 8, y + center)) {
      // 体の中心がブロックに埋まっている：左へ押し出す (00EB9B〜, E90A[v4])
      this.blocked |= ct === TILE.TURN ? 0x01 : 0x11;
    } else {
      // 中心が水・ツタの中 (00F28C → 00F2C2(j, 1))
      this.touchTile(ct, 1);
      // 横：タイル内の位置に応じて片側だけ調べる (00EBF0 付近)
      const sx = x + (hd ? 2 : 0xe);
      let hit = level.solidPx(sx, y + sideLo);
      if (!hit) {
        this.touchVine(level.tileAtPx(sx, y + sideLo), 0x10);
        hit = level.solidPx(sx, y + sideHi);
        if (!hit) this.touchVine(level.tileAtPx(sx, y + sideHi), 0x08);
      }
      if (hit) {
        this.animSpeedIndex = 3;
        if ((x & 0xf) !== (hd ? 0xd : 2)) this.blocked |= hd ? 2 : 1;
      }
    }

    // 頭 (00EC4E 付近)
    const hx = x + 8;
    const hy = y + headOff;
    if (!level.solidPx(hx, hy)) {
      this.touchTile(level.tileAtPx(hx, hy), 2);
    } else {
      const p = hy & 0xf;
      if (level.tileAtPx(hx, hy) !== TILE.TURN) {
        if (this.inAir || p >= 9) {
          if (this.inAir) this.ypos = u16(this.ypos + (15 - p));
          this.blocked |= 8;
        } else {
          // 立ったまま頭が埋まっている
          this.blocked = (this.blocked & 0xf4) | 9;
          this.xspeed = 0;
        }
      }
      if (this.yspeed & 0x80) {
        this.yspeed = 0;
        this.env.bumpTile(Math.floor(hx / 16), Math.floor(hy / 16));
      }
    }

    // 足 (00ED8A 付近)。坂は 1 つ目の足（体の中心と同じタイルにある足）でだけ調べる
    const fy = this.ypos + 0x20;
    const f1 = hd ? x + 0xb : x + 5;
    const f2 = hd ? x + 5 : x + 0xb;
    const t1 = level.tileAtPx(f1, fy);
    const above1 = level.tileAtPx(f1, fy - 16);
    if (isSlope(t1) || (level.floorPx(f1, fy) && isSlope(above1))) {
      // 坂。坂の真下の地面にいる時は、上の坂のタイルとして扱う（SMW の D8〜 のタイル）
      const k = isSlope(t1) ? slopeK(t1) : slopeK(above1);
      const yib = (fy & 0xf) + (isSlope(t1) ? 0 : 16);
      const xin = ((x & 0xf) + 8) & 0xf;
      const v22 = u8(yib - SLOPE_SHAPE[16 * k + xin]);
      if (v22 & 0x80) this.onGround++;
      if (v22 < SLOPE_SNAP[k]) {
        // 00EE85：上昇中でも、前のフレームに地面にいれば坂に沿って乗る
        if (!(this.yspeed & 0x80) || temp8d >= 2) {
          this.onGround++;
          this.ypos = u16(this.ypos - v22);
          this.landed(k);
        }
        return;
      }
    } else if (level.floorPx(f1, fy)) {
      this.landOnBlock(f1, fy, wasAir);
      return;
    } else {
      // 足が水・ツタの中 (00F2C2(j, 4))
      this.touchTile(t1, 4);
    }
    // 2 つ目の足：ふつうのブロックだけ（坂・坂の下の地面は見ない）
    if (level.floorPx(f2, fy) && !isSlope(level.tileAtPx(f2, fy - 16))) {
      this.landOnBlock(f2, fy, wasAir);
      return;
    }
    this.airCheck();
  }

  // 水 (var8a) とツタ (var8b) の判定点 (00F2C2)
  touchTile(t, bit) {
    if (t === TILE.WATER) this.var8a |= bit;
    else this.touchVine(t, bit === 1 ? 0x19 : bit);
  }

  // ツタ (00F2C9)
  touchVine(t, bits) {
    if (t === TILE.VINE) this.var8b |= bits;
  }

  // ふつうのブロックに着地 (LABEL_99 → 00EE3A → 00EE85)
  landOnBlock(fx, fy, wasAir) {
    const { level } = this.env;
    if (this.yspeed & 0x80) return; // 上昇中は着地しない
    const pib = fy & 0xf;
    if (pib >= 8) {
      this.airCheck();
      return;
    }
    const tx = Math.floor(fx / 16);
    const ty = Math.floor(fy / 16);
    // 00EE3A：空中でスピンジャンプ中にターンブロックへ着地すると壊れる（着地はしない）
    // 壊したブロックの反動で少し跳ね返る (SpawnBounceSprite: player_yspeed = -48)
    if (level.tileAt(tx, ty) === TILE.TURN && wasAir && this.spin) {
      this.env.breakTile(tx, ty);
      this.yspeed = BOOST_NORMAL;
      this.airCheck();
      return;
    }
    // 00EED1
    this.onGround++;
    this.ypos = u16(this.ypos - pib);
    this.landed(SLOPE_FLAT);
  }

  // 00EEE1：着地。j は坂の形番号（平地は 0x20）
  landed(j) {
    const type = SLOPE_TYPE[j];
    if (type || this.sliding) {
      if (!type && !this.xspeed) {
        this.sliding = 0; // 平地で止まったら滑り終わり
      } else {
        this.slope2 = type;
        // 坂でしゃがむと滑り始める
        if ((this.in.hold1 & PAD.DOWN) && !(this.sliding || this.carrying)) this.sliding = SLIDE_START;
      }
    }
    const v2 = SLOPE_PLAYER[j];
    this.slope = v2;
    let ys;
    if (j >= 0x1c) {
      ys = SLOPE_STATIONARY_YSPEED[j];
    } else {
      let jj = j;
      ys = -1;
      if (this.xspeed && type && ((this.xspeed ^ type) & 0x80)) {
        // 坂を登っている
        this.animSpeedIndex = v2;
        if (abs8(this.xspeed) >= 0x28) ys = SLOPE_TOWARDS_PEAK_YSPEED[j];
        else jj = SLOPE_FLAT;
      }
      if (ys < 0) {
        ys = this.yspeed;
        if (this.yspeed >= SLOPE_STATIONARY_YSPEED[jj]) ys = SLOPE_STATIONARY_YSPEED[jj];
      }
    }
    this.yspeed = u8(ys);
    if (s8(ys) < 0) this.onGround++;
    this.inAir = 0;
    this.climbing = 0;
    this.spin = 0;
    this.blocked |= 4;
    this.stompCount = 0; // counter_consecutive_enemies_stomped
  }

  // 00EE1D：足場がなければ落下状態にする
  airCheck() {
    if (!(this.inAir | (this.blocked & 4))) this.inAir = AIR_FALL;
  }

  smoke() {
    // SpawnPlayerTurnAroundSmoke (00FE4A)
    if (this.inAir || (this.env.frame & 3)) return;
    if ((this.in.hold1 & PAD.DOWN) && u8(this.xspeed + 8) < 0x10) return;
    this.smokeRequests.push({ x: this.xpos + 4, y: this.ypos + 26 });
  }

  updatePMeter(j) {
    // 00D96A
    let v = s8(PMETER_DELTA[j] + this.pmeter);
    if (v < 0) v = 0;
    if (u8(v) >= 0x70) { j += 1; v = 0x70; }
    this.pmeter = u8(v);
    return j;
  }

  // HandlePlayerPhysics (00D5F2)
  handlePhysics() {
    const { hold1, press1, press2 } = this.in;
    if (!this.inAir) {
      this.ducking = 0;
      if (!this.sliding && (hold1 & PAD.DOWN)) this.ducking = 4;
      if ((this.blocked & 8) || !((press2 | press1) & 0x80)) {
        if (this.ducking) {
          if (this.xspeed) this.smoke();
          this.decelerate();
          return;
        }
      } else {
        let v1 = (abs8(this.xspeed) >> 2) & 0xfe;
        if (!(press2 & PAD2.A) || this.carrying) {
          this.env.emit('jump');
        } else {
          this.spin = 1;
          v1++;
          this.env.emit('spin');
        }
        this.yspeed = JUMP_HEIGHT[v1];
        this.inAir = this.pmeter >= 0x70 ? AIR_RUNJUMP : AIR_JUMP;
        this.sliding = 0;
      }
    }

    if (!(hold1 & 3)) {
      if (!this.sliding) {
        this.decelerate();
        return;
      }
      // LABEL_28：しゃがみ滑り。坂の上では坂を下る向きに加速する
      this.smoke();
      if (!this.slope2) {
        this.decelerate();
        return;
      }
      this.updatePMeter(0);
      const sl = this.slope;
      this.accelerate(u8(((sl & 2) ? 1 : 0) + (sl >> 2) + 118), u8(((sl & 4) ? 1 : 0) + (sl >> 3) - 121));
      return;
    }
    this.sliding = 0;
    const dir = hold1 & 1;
    if (dir !== this.facing) {
      // 物を持っている間は、向きを変えるとき一瞬こちらを向く (00D63B)
      if (!this.carrying) this.facing = dir;
      else if (!this.facePoseTimer) {
        this.facePoseTimer = 8;
        this.facing = dir;
      }
    }
    const r1 = dir;
    let k = u8(this.slope | (4 * dir));
    const accelHi = ACCEL[k >> 1] >> 8;
    if (this.xspeed && ((accelHi ^ this.xspeed) & 0x80) && !this.slideTurnTimer) {
      this.turning = 13;
      this.smoke();
      k = u8(k - 112);
    }
    let mode = 0;
    if (hold1 & PAD.Y) {
      k = u8(k + 2);
      mode = 1;
      if (abs8(this.xspeed) >= 35) {
        if (!this.inAir) {
          this.runTakeoffTimer = 16;
          mode = 2;
        } else if (this.inAir === AIR_RUNJUMP) {
          mode = 2;
        }
      }
    }
    mode = this.updatePMeter(mode);
    this.accelerate(k, r1 | this.slope | (2 * mode));
  }

  // 00D742
  accelerate(k, j) {
    const max = MAX_SPEED[j];
    if (this.xspeed === max || ((max ^ u8(this.xspeed - max)) & 0x80) === 0) {
      this.friction();
    } else {
      this.xspeed16 = this.xspeed16 + ACCEL[k >> 1];
    }
  }

  // 00D764
  decelerate() {
    this.updatePMeter(0);
    if (!this.inAir) this.friction();
  }

  // 00D76B / 00D772
  friction(k = this.slope >> 2, j = this.slope >> 1) {
    const rest = SLOPE_REST_SPEED[k >> 1] ?? 0;
    if (s8(this.xspeed - (rest >> 8)) < 0) j += 2;
    const d = DECEL[j >> 1];
    this.xspeed16 = this.xspeed16 + d;
    if (((d ^ u16(this.xspeed16 - rest)) & 0x8000) === 0) this.xspeed16 = rest;
  }

  // HandlePlayerPhysics_InAir (00D7E4) → 00D930（マント無し）
  handleInAir() {
    const j = (this.in.hold1 & PAD.B) ? 1 : 0;
    let v = this.yspeed;
    if (!(this.yspeed & 0x80)) {
      if (this.yspeed >= MAX_FALL[j]) v = MAX_FALL[j];
      if (this.inAir === AIR_JUMP) this.inAir = AIR_FALL;
    }
    this.yspeed = u8(GRAVITY[j] + v);
  }

  // 泳ぐ・水をかく (00DAA9)
  stroke() {
    this.env.emit('swim');
    this.animTimer |= 0x10;
  }

  // HandlePlayerPhysics_Swimming (00D988)
  swim() {
    const { hold1, press1, press2 } = this.in;
    this.sliding = 0;
    this.ducking = 0;
    this.spin = 0;
    let v0 = this.yspeed;
    if (this.carrying) {
      // 物を持っていると浮かんでいく
      let kick = true;
      if (this.inAir || !((press2 | press1) & 0x80)) {
        if (!(hold1 & PAD.DOWN)) kick = false;
      } else {
        this.inAir = AIR_JUMP;
        v0 = 0xf0;
      }
      if (kick) {
        this.stroke();
        v0 = u8(v0 + 8);
      }
      let v1 = s8(v0 + 1);
      if (!this.canJumpOut) {
        v1--;
        if ((this.env.frame & 3) === 0) v1 -= 2;
      }
      let v2 = u8(v1);
      if (v1 < 0) {
        if (u8(v1) < 0xf0) v2 = 0xf0;
      } else if (u8(v1) >= 0x10) {
        v2 = 0x10;
      }
      this.yspeed = v2;
      let v3 = 0x80;
      let v4 = hold1 & 3;
      if (!v4) {
        v4 = this.facing;
        v3 = 120;
      }
      this.swimMove(v3, v4);
    } else {
      if (((press2 | press1) & 0x80) && !this.canJumpOut) {
        // B で水をかく
        this.stroke();
        if (!this.inAir) {
          this.inAir = AIR_JUMP;
          v0 = 0xf0;
        }
        v0 = u8(v0 - 32);
      }
      if ((this.env.frame & 3) === 0) v0 = u8(v0 + 2);
      const v5 = (hold1 & 0x0c) >> 2;
      let v6 = v0;
      if (v0 & 0x80) {
        if (v0 < SWIM_YSPEED[v5]) v6 = SWIM_YSPEED[v5];
      } else if (v0 >= 0x40) {
        v6 = 0x40;
      }
      this.yspeed = v6;
      let moved = false;
      if (this.inAir || !(hold1 & PAD.DOWN)) {
        if (hold1 & 3) {
          this.swimMove(120, hold1 & 3);
          moved = true;
        }
      } else {
        this.ducking++;
      }
      if (!moved) this.friction(0, 0);
    }
    // LABEL_43
    this.setPose();
    if (this.inAir) {
      let v11 = SWIM_POSES[(this.animTimer >> 2) & 3];
      if (this.carrying) v11++;
      this.pose = v11;
    }
  }

  // 水中の左右移動（00D9F3 付近 LABEL_34）
  swimMove(v3, v4) {
    this.facing = v4 & 1;
    let j = v3 | (v4 & 1);
    if (this.inAir) j += 2;
    this.accelerate(4 * (v4 & 1), j);
  }

  // HandlePlayerPhysics_Climbing (00DB17)：ツタ
  climb() {
    const { hold1, press1 } = this.in;
    this.inAir = 0;
    this.yspeed = 0;
    this.spin = 0;
    this.xspeed = 0;
    this.subXspeed = 0;
    let v9 = this.swimming ? 1 : 0;
    if (press1 & 0x80) {
      // B で飛び降りる
      this.inAir = AIR_JUMP;
      this.yspeed = JUMP_FROM_VINE[v9];
      this.env.emit('jump');
      this.climbing = 0;
      return;
    }
    this.pose = CLIMB_POSE;
    if (hold1 & 3) {
      const v10 = (hold1 & 3) >> 1;
      if ((this.var8b & 0x18) === 0x18) {
        this.xspeed = CLIMB_SPEED[v9 | (2 * v10)];
      } else {
        // 横がツタでなければ手を離す
        this.climbing = 0;
        return;
      }
    }
    let v11 = hold1 & 0x0c;
    if (v11) {
      if (!(hold1 & PAD.UP)) {
        // 下：体の中心がツタでなければ手を離す
        if (!(this.var8b & 1)) {
          this.climbing = 0;
          return;
        }
        this.xspeed = 0;
        v11 = CLIMB_SPEED[v9];
        this.yspeed = v11;
      } else {
        // 上：頭がツタにある間だけ登れる
        v9 += 2;
        v11 = this.var8b & 2;
        if (v11) {
          this.xspeed = 0;
          v11 = CLIMB_SPEED[v9];
          this.yspeed = v11;
        }
      }
    }
    if (this.xspeed | v11) {
      this.animTimer |= 8;
      if ((this.animTimer & 7) === 0) this.facing ^= 1;
    }
  }

  // 敵を踏んで跳ねる BoostMarioSpeed (01AA33)
  boost() {
    this.yspeed = (this.in.hold1 & PAD.B) ? BOOST_HOLD_B : BOOST_NORMAL;
  }

  // ダメージ (DamagePlayer_Hurt, 00F5B7)。受けたら true（無敵中は false）。
  // SMW にノックバックは無い。速度はそのままで、一定時間無敵になって点滅する。
  // （SMW では大きい状態だと縮むが、ルミナは今のところ縮まない）
  hurt() {
    if (this.hurtTimer) return false;
    this.hurtTimer = HURT_TIME;
    return true;
  }

  // SetPlayerPose (00CEB1)
  setPose() {
    if (this.spin) {
      this.ducking = 0;
      const i = (this.env.frame & 6) + 1;
      this.facing = SPIN_FACING[i];
      this.pose = SPIN_POSES[i];
      return;
    }
    if (this.sliding) {
      this.pose = this.sliding;
      return;
    }
    if (this.ducking) {
      this.pose = this.carrying ? POSE.PICKUP : POSE.DUCK;
      return;
    }
    if (this.kickPoseTimer) { this.pose = POSE.KICK; return; }
    if (this.pickPoseTimer) { this.pose = POSE.PICKUP; return; }
    if (this.facePoseTimer) { this.pose = POSE.FACE; return; }
    if (this.inAir) {
      if (!this.runTakeoffTimer) {
        this.pose = this.carrying ? POSE.CARRY_JUMP : this.inAir;
        return;
      }
      this.walkPose();
      return;
    }
    if (this.turning) { this.pose = POSE.SKID; return; }
    this.walkPose();
  }

  // SetPlayerPose_Entry2/3 (00CFBC)
  walkPose() {
    const a = abs8(this.xspeed);
    let frame;
    if (!a) {
      frame = 0;
      if (this.in.hold1 & PAD.UP) this.overrideWalk = 3;
    } else {
      frame = this.walkFrame;
      if (!this.animTimer) {
        frame = this.walkFrame - 1;
        if (frame < 0) frame = WALK_POSE_COUNT;
        this.animTimer = ANIM_SPEED[this.animSpeedIndex | (a >> 3)];
      }
    }
    this.walkFrame = frame;
    const v = this.overrideWalk + frame;
    if (this.carrying) this.pose = v + 7;
    else this.pose = a >= 0x2f ? v + 4 : v;
  }
}
