// 1-3 ゆうやけの遺跡のテスト: node tests/stage1_3.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { STAGE_1_3 } from '../js/stages/stage1_3.js';

assert.deepEqual(STAGES.map((s) => s.id), ['1-1', '1-2', '1-3', '1-4', '1-5', '1-5B', '1-S', '2-1', '2-2', '2-3', '2-4', '2-5', '2-5B', '2-S',
    '3-1', '3-2', '3-3', '3-4', '3-5', '3-5B', '3-S', '4-1', '4-2', '4-3', '4-4', '4-5', '4-5B', '4-S',
    '5-1', '5-2', '5-2B', '5-3', '5-4', '5-5', '5-5B', '5-S',
    '6-1', '6-2', '6-3', '6-4', '6-5', '6-5B', '6-S', '7-1', '7-2', '7-3', '7-4', '7-5', '7-5B', '7-S',
    '8-1', '8-2', '8-3', '8-4', '8-5', '8-5B', '8-S',
    'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9', 'E-10']);
const lv = new Level(STAGE_1_3);
assert.equal(lv.title, '1-3 ゆうやけの遺跡');
assert.equal(lv.theme, 'ruins');
assert.equal(lv.width, 208);
assert.ok(lv.goal && lv.messages.size === 1 && lv.contents.size === 3 && lv.secretGoal);
for (const p of [lv.start, lv.goal]) {
  assert.equal(lv.tileAt(p.tx, p.ty + 1), TILE.GROUND);
  assert.equal(lv.tileAt(p.tx, p.ty), TILE.EMPTY);
}
for (const s of lv.spawns) assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${s.type} at ${s.x / 16},${s.y / 16}`);
{
  // 穴に落ちるとミス
  const w = new World(STAGE_1_3);
  w.introTimer = 0;
  w.points = [];
  const p = w.player;
  p.xpos = 66 * 16;
  p.ypos = 20 * 16;
  p.inAir = 0x24;
  let st = 0;
  for (let f = 0; f < 200 && st !== 9; f++) { run(w, 1, () => [0]); st = p.state; }
  assert.equal(st, 9, 'pit');
}
{
  // ハシゴで神殿の屋根へ登れる。大きな丘ではしゃがむとすべる。池で泳げる
  const w = new World(STAGE_1_3);
  w.introTimer = 0;
  w.points = [];
  w.shooters = [];
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 101 * 16;
  run(w, 220, () => [PAD.UP]);
  run(w, 40, (f) => [PAD.LEFT | (f < 20 ? PAD.B : 0)]);
  run(w, 60, () => [0]);
  assert.equal(p.ypos + 0x20, 17 * 16, 'standing on the temple roof');
  p.xpos = 121 * 16;
  p.ypos = 19 * 16;
  run(w, 60, () => [PAD.DOWN]);
  assert.ok(p.sliding && p.xpos > 122 * 16, 'slides down the hill');
  p.xpos = 150 * 16;
  p.ypos = 23 * 16;
  p.sliding = 0;
  run(w, 40, () => [0]);
  assert.ok(p.swimming, 'swimming');
}
console.log('stage 1-3: ok');
