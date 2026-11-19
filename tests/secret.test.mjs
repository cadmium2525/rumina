// 隠しゴールと隠しコースのテスト: node tests/secret.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { OW_MAPS } from '../js/overworld/maps.js';

const get = (id) => STAGES.find((s) => s.id === id);
// ひみつのゴールがあるステージ = 地図で隠しコースの from になっているステージ
const sources = Object.values(OW_MAPS).flatMap((m) => Object.values(m.nodes).filter((n) => n.hidden).map((n) => [m.nodes[n.from].stage, n.stage]));
const ready = sources.filter(([src, h]) => get(src) && get(h));
assert.deepEqual(ready, [['1-3', '1-S'], ['2-2', '2-S'], ['3-4', '3-S'], ['4-3', '4-S'], ['5-2', '5-S']]);

for (const [src, hid] of ready) {
  const main = new Level(get(src).make());
  assert.ok(main.goal, `${src} still has the normal goal`);
  // ひみつのゴールはコースの中か、コースの扉の先の隠し部屋（credit が元のコース）にある
  let lv = main;
  if (!main.secretGoal) {
    const room = get(main.doorTo);
    assert.ok(room && room.hidden && room.credit === src, `${src} has a secret room behind a door`);
    lv = new Level(room.make());
  }
  const sg = lv.secretGoal;
  assert.ok(sg, `${src} has a secret goal`);
  // ゲートは足場の上に立っている
  assert.ok(lv.floorPx(sg.tx * 16 + 8, (sg.ty + 1) * 16 + 4), `${src} secret gate on a floor`);
  // 寄り道にあり、ふつうのゴールとは離れている（上の方か、別の部屋）
  assert.ok(lv !== main || sg.ty < main.goal.ty - 8, `${src} secret gate is off the main route`);
  // 隠しコースはふつうのゴールで終わる
  const h = new Level(get(hid).make());
  assert.ok(h.goal && !h.secretGoal, `${hid} has a goal`);
  assert.ok(h.title.startsWith(`${hid[0]}-?`), h.title);
  for (const s of h.spawns) assert.ok(!h.solidPx(s.x + 8, s.y + 8), `${hid}: ${s.type} at ${s.x / 16},${s.y / 16}`);
}
{
  // ひみつのゴールを通ると secretExit。ふつうのゴールは false
  for (const secret of [true, false]) {
    const w = new World(get('1-3').make());
    w.introTimer = 0;
    w.points = [];
    w.actors = w.actors.filter((a) => a.type === 'goal');
    const gate = secret ? w.secretGoal : w.goal;
    const p = w.player;
    p.xpos = gate.x - 40;
    p.ypos = gate.bottom - 32;
    p.yspeed = 0;
    let done = false;
    for (let f = 0; f < 120 && !done; f++) {
      run(w, 1, () => [PAD.RIGHT]);
      done = !!p.endTimer;
    }
    assert.ok(done, `reached ${secret ? 'secret' : 'normal'} goal`);
    assert.equal(w.secretExit, secret);
    // もう片方のゴールは反応しない
    const other = secret ? w.goal : w.secretGoal;
    assert.ok(!other.done);
  }
  console.log('secret exit: ok');
}
{
  // 寄り道の入口：1-3 は神殿の屋根のツタ、2-2 は天井を突き抜けるハシゴ、3-4 はビルのハシゴを登ると、ひみつのゴールの高さまで行ける
  for (const [src, tx, fromTy] of [['1-3', 95, 16], ['2-2', 75, 23], ['3-4', 46, 23]]) {
    const w = new World(get(src).make());
    w.introTimer = 0;
    w.points = [];
    w.actors = [];
    w.shooters = [];
    const p = w.player;
    p.powerUp = 1;
    p.xpos = tx * 16;
    p.ypos = (fromTy + 1) * 16 - 32;
    run(w, 400, () => [PAD.UP]);
    const sg = w.level.secretGoal;
    assert.ok(p.climbing, `${src} climbing`);
    assert.ok(p.ypos + 32 <= (sg.ty + 2) * 16, `${src}: climbed up to row ${(p.ypos + 32) / 16} (gate row ${sg.ty})`);
  }
  console.log('detours: ok');
}
console.log('secret: ok');
