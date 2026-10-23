// SMW の既知の挙動と照合する簡易テスト: node tests/physics.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, run, PAD, PAD2 } from './helpers.mjs';
import { GROUND_Y } from '../js/level.js';

const R = PAD.RIGHT, Y = PAD.Y, B = PAD.B;
const STAND_Y = GROUND_Y - 0x20;
const tail = (log, n = 8) => log.slice(-n).map((l) => l.xs);

// 歩き最高速 0x14 付近（加速と減速が交互にかかり ±1 で振動する）
let w = makeWorld();
let log = run(w, 60, () => [R]);
assert.ok(tail(log).every((v) => v >= 0x13 && v <= 0x15), 'walk max');
// ダッシュ最高速 0x24、P メーター満タンで 0x30
w = makeWorld();
log = run(w, 50, () => [R | Y]);
assert.ok(tail(log).every((v) => v >= 0x23 && v <= 0x25), 'run max');
w = makeWorld();
log = run(w, 200, () => [R | Y]);
assert.ok(tail(log).every((v) => v >= 0x2f && v <= 0x31), 'p-speed');
console.log('P-speed reached at frame', log.findIndex((l) => l.xs >= 0x2f) + 1);

// ジャンプの高さ
const height = (fn, n = 120) => {
  const ww = makeWorld();
  const l = run(ww, n, fn);
  return { h: STAND_Y - Math.min(...l.map((e) => e.y)), air: l.filter((e) => e.air).length };
};
const full = height((f) => [f >= 1 ? B : 0]);
const tap = height((f) => [f === 1 ? B : 0]);
const spin = height((f) => [f >= 1 ? B : 0, f >= 1 ? PAD2.A : 0]);
console.log('full jump', full, 'tap jump', tap.h, 'spin', spin.h);
assert.equal(full.h, 64);
assert.equal(tap.h, 33);
assert.equal(spin.h, 55);
w = makeWorld();
log = run(w, 300, (f) => [f < 200 ? R | Y : R | Y | B]);
console.log('P-speed jump', STAND_Y - Math.min(...log.slice(200).map((e) => e.y)));

// 止まれる・着地している
w = makeWorld();
log = run(w, 120, (f) => [f < 60 ? R : 0]);
assert.equal(w.player.xspeed, 0);
assert.equal(w.player.inAir, 0);
assert.equal(w.player.ypos, STAND_Y);
// 切り返しでスキッドポーズ
w = makeWorld();
log = run(w, 80, (f) => [f < 60 ? R | Y : PAD.LEFT]);
assert.ok(log.slice(60, 70).some((l) => l.pose === 0x0d), 'skid pose');
console.log('physics: ok');
