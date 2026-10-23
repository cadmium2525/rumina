// ルミナ（プレイヤー）
// スーパーマリオワールドのプレイヤー処理（PlayerState00, 00CC68〜）を
// 8bit/16bit の演算挙動ごと移植している。速度は 1/16 px/frame 単位。
import {
  JUMP_HEIGHT, DECEL, ACCEL, MAX_SPEED, SLOPE_REST_SPEED, PMETER_DELTA,
  GRAVITY, MAX_FALL, ANIM_SPEED, WALK_POSE_COUNT, SPIN_POSES, SPIN_FACING,
} from './smw_tables.js';

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
  JUMP: AIR_JUMP, RUNJUMP: AIR_RUNJUMP, SKID: 0x0d, FACE: 0x0f,
  FALL: AIR_FALL, DUCK: 0x3c, BACK: 0x44, FRONT: 0x45,
};

export class Player {
  constructor(x, y) {
    this.xpos = x;          // 16bit 位置（スプライト左上）
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
    this.slope = 0;         // 平地のみなので常に 0
    this.animSpeedIndex = 0;
    this.walkFrame = 0;
    this.overrideWalk = 0;
    this.pose = POSE.STAND;
    // タイマー（毎フレーム 1 ずつ減る：$1496〜）
    this.animTimer = 0;
    this.runTakeoffTimer = 0;
    this.slideTurnTimer = 0;
    this.smokeRequests = [];
  }

  get xspeed16() { return (this.xspeed << 8) | this.subXspeed; }
  set xspeed16(v) { v = u16(v); this.xspeed = v >> 8; this.subXspeed = v & 0xff; }

  // 1 フレーム進める。in = {hold1, press1, hold2, press2}
  // world = {groundY, camX, frame}
  update(input, world) {
    this.in = input;
    this.world = world;
    // タイマー減算 (00C47E 内のループ)
    if (this.animTimer) this.animTimer--;
    if (this.runTakeoffTimer) this.runTakeoffTimer--;
    if (this.slideTurnTimer) this.slideTurnTimer--;

    // PlayerState00
    this.overrideWalk = 0;
    // 00CD24
    if ((this.yspeed & 0x80) && (this.blocked & 8)) this.yspeed = 0;
    this.updatePosition();
    this.levelCollision();
    // 00CD39
    this.turning = 0;
    this.handlePhysics();
    this.handleInAir();
    this.setPose();
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

  // HandlePlayerLevelCollision (00E92B) の平地版
  levelCollision() {
    this.animSpeedIndex = 0;
    this.blocked = 0;
    this.slope = 0;
    const ground = this.world.groundY;
    const feet = this.ypos + 0x20;
    if (feet >= ground && feet < ground + 16 && !(this.yspeed & 0x80)) {
      // RunPlayerBlockCode_00EED1 / 00EEE1（j=0x20：平らな地面）
      this.ypos = u16(this.ypos - (feet - ground));
      this.yspeed = 0; // StationaryYSpeed[0x20] = 0
      this.inAir = 0;
      this.spin = 0;
      this.blocked |= 4;
    } else if (!(this.inAir | (this.blocked & 4))) {
      this.inAir = AIR_FALL;
    }
    // 画面端 (00E98C)
    const camX = this.world.camX;
    const rel = (this.xpos - camX) << 16 >> 16;
    if (rel <= 232) {
      if (rel - 8 < 0) this.blocked |= 2;
    } else {
      this.blocked |= 1;
    }
    // 00EA0D
    if (this.blocked & 3) {
      const push = (this.blocked & 2) ? 1 : -1;
      this.xpos = u16(this.xpos + push);
      this.animSpeedIndex = 3;
      // 壁に向かって進んでいれば速度を 0 に（E90D の符号と比較）
      if (((push < 0 ? 0xff : 0x01) ^ this.xspeed) & 0x80) this.xspeed = 0;
    }
  }

  smoke() {
    // SpawnPlayerTurnAroundSmoke (00FE4A)
    if (this.inAir || (this.world.frame & 3)) return;
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
      if (hold1 & PAD.DOWN) this.ducking = 4;
      if ((this.blocked & 8) || !((press2 | press1) & 0x80)) {
        if (this.ducking) {
          if (this.xspeed) this.smoke();
          this.decelerate();
          return;
        }
      } else {
        let v1 = (abs8(this.xspeed) >> 2) & 0xfe;
        if (press2 & PAD2.A) {
          this.spin = 1;
          v1++;
          this.sfx = 'spin';
        } else {
          this.sfx = 'jump';
        }
        this.yspeed = JUMP_HEIGHT[v1];
        this.inAir = this.pmeter >= 0x70 ? AIR_RUNJUMP : AIR_JUMP;
      }
    }

    if (!(hold1 & 3)) {
      this.decelerate();
      return;
    }
    const dir = hold1 & 1;
    if (dir !== this.facing) this.facing = dir;
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
  friction() {
    const k = this.slope >> 2;
    let j = this.slope >> 1;
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

  // SetPlayerPose (00CEB1)
  setPose() {
    if (this.spin) {
      this.ducking = 0;
      const i = (this.world.frame & 6) + 1;
      this.facing = SPIN_FACING[i];
      this.pose = SPIN_POSES[i];
      return;
    }
    if (this.ducking) { this.pose = POSE.DUCK; return; }
    if (this.inAir) {
      if (!this.runTakeoffTimer) { this.pose = this.inAir; return; }
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
    this.pose = a >= 0x2f ? v + 4 : v;
  }
}
