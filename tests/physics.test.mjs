// SMW の既知の挙動と照合する簡易テスト: node tests/physics.test.mjs
import { Player, PAD, PAD2 } from '../js/player.js';
import assert from 'node:assert/strict';

const G = 384;
function sim(frames, inputFn, p = new Player(0x40, G - 0x20)) {
  let prev1 = 0, prev2 = 0, camX = 0;
  const log = [];
  for (let f = 0; f < frames; f++) {
    const [h1, h2 = 0] = inputFn(f);
    const inp = { hold1: h1, press1: h1 & ~prev1, hold2: h2, press2: h2 & ~prev2 };
    prev1 = h1; prev2 = h2;
    // カメラ追従（簡易：常にプレイヤー中心）
    camX = Math.max(0, p.xpos - 0x80);
    p.update(inp, { groundY: G, camX, frame: f & 0xff });
    log.push({ x: p.xpos, y: p.ypos, xs: (p.xspeed << 24) >> 24, ys: (p.yspeed << 24) >> 24, air: p.inAir, pose: p.pose, pm: p.pmeter });
  }
  return { p, log };
}
const R = PAD.RIGHT, Y = PAD.Y, B = PAD.B;

// 歩き最高速 0x14
// SMW 同様、最高速付近では加速と減速が交互にかかり速度が振動する
const tail = (r, n = 8) => r.log.slice(-n).map((l) => l.xs);
let r = sim(60, () => [R]);
console.log('walk tail speeds', tail(r));
assert.ok(tail(r).every((v) => v >= 0x13 && v <= 0x15), 'walk max');
console.log('walk: frames to max =', r.log.findIndex((l) => l.xs >= 0x13) + 1);
// ダッシュ最高速 0x24、P メーター満タンで 0x30
r = sim(50, () => [R | Y]);
console.log('run tail speeds', tail(r));
assert.ok(tail(r).every((v) => v >= 0x23 && v <= 0x25), 'run max');
r = sim(200, () => [R | Y]);
console.log('p-speed tail speeds', tail(r));
assert.ok(tail(r).every((v) => v >= 0x2f && v <= 0x31), 'p-speed');
console.log('run: frames to P-speed =', r.log.findIndex((l) => l.xs >= 0x2f) + 1);
// 立ちジャンプ（B 押しっぱなし）
r = sim(120, (f) => [f >= 1 ? B : 0]);
let minY = Math.min(...r.log.map((l) => l.y));
console.log('standing full jump height px =', G - 0x20 - minY, ' airtime frames =', r.log.filter((l) => l.air).length);
// 小ジャンプ（1 フレームだけ）
r = sim(120, (f) => [f === 1 ? B : 0]);
minY = Math.min(...r.log.map((l) => l.y));
console.log('tap jump height px =', G - 0x20 - minY);
// P スピードジャンプ
r = sim(300, (f) => [f < 200 ? R | Y : (R | Y | B)]);
minY = Math.min(...r.log.map((l) => l.y));
console.log('P-speed jump height px =', G - 0x20 - minY, ' air flag =', r.log[201].air.toString(16));
// スピンジャンプ
r = sim(120, (f) => [f >= 1 ? B : 0, f >= 1 ? PAD2.A : 0]);
minY = Math.min(...r.log.map((l) => l.y));
console.log('spin jump height px =', G - 0x20 - minY);
// 止まれる（摩擦）
r = sim(120, (f) => [f < 60 ? R : 0]);
assert.equal(r.p.xspeed, 0, 'stops');
assert.equal(r.p.inAir, 0);
// 切り返しでスキッドポーズ
r = sim(80, (f) => [f < 60 ? R | Y : PAD.LEFT]);
assert.ok(r.log.slice(60, 70).some((l) => l.pose === 0x0d), 'skid pose');
// 着地後は地面に立っている
assert.equal(r.p.ypos, G - 0x20);
console.log('all assertions passed');
