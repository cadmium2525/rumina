// 1-2 ひかりの洞窟のテスト: node tests/stage1_2.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { STAGE_1_2 } from '../js/stages/stage1_2.js';

assert.deepEqual(STAGES.map((s) => s.id), ['1-1', '1-2', '1-3', '1-4', '1-5', '1-5B', '2-1', '2-2', '2-3', '2-4', '2-5', '2-5B']);
const lv = new Level(STAGE_1_2);
assert.equal(lv.title, '1-2 ひかりの洞窟');
assert.equal(lv.theme, 'cave');
assert.equal(lv.width, 192);
assert.ok(lv.goal && lv.messages.size === 1 && lv.contents.size === 2);
for (const p of [lv.start, lv.goal]) {
  assert.equal(lv.tileAt(p.tx, p.ty + 1), TILE.GROUND);
  assert.equal(lv.tileAt(p.tx, p.ty), TILE.EMPTY);
}
for (const s of lv.spawns) assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${s.type} at ${s.x / 16},${s.y / 16}`);
{
  // 歩き出せる。マグマに落ちるとミス
  const w = new World(STAGE_1_2);
  w.introTimer = 0;
  w.points = [];
  const p = w.player;
  run(w, 60, () => [PAD.RIGHT]);
  assert.ok(p.xpos > 3 * 16 + 30);
  p.xpos = 36 * 16;
  p.xspeed = 0;
  p.ypos = 20 * 16;
  p.inAir = 0x24;
  let st = 0;
  for (let f = 0; f < 120 && st !== 9; f++) { run(w, 1, () => [0]); st = p.state; }
  assert.equal(st, 9, 'lava');
}
{
  // ハシゴで岩の壁を登れる
  const w = new World(STAGE_1_2);
  w.introTimer = 0;
  w.points = [];
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 99 * 16;
  run(w, 200, () => [PAD.UP]);
  assert.ok(p.climbing && p.ypos + 0x20 <= 17 * 16, `climbed to ${p.ypos}`);
  run(w, 40, (f) => [PAD.RIGHT | (f < 20 ? PAD.B : 0)]);
  run(w, 60, () => [0]);
  assert.equal(p.ypos + 0x20, 16 * 16, 'standing on the wall');
  // 池で泳げる
  p.xpos = 80 * 16;
  p.ypos = 23 * 16;
  run(w, 30, () => [0]);
  assert.ok(p.swimming, 'swimming in the pool');
}
console.log('stage 1-2: ok');
