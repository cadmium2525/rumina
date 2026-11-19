// 1-4・1-5・ボス扉・ボスのテスト: node tests/boss.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { STAGE_1_4 } from '../js/stages/stage1_4.js';
import { STAGE_1_5 } from '../js/stages/stage1_5.js';
import { STAGE_1_5B } from '../js/stages/stage1_5b.js';

assert.deepEqual(STAGES.map((s) => s.id), ['1-1', '1-2', '1-3', '1-4', '1-5', '1-5B', '1-S', '2-1', '2-2', '2-3', '2-4', '2-5', '2-5B', '2-S',
    '3-1', '3-2', '3-3', '3-4', '3-5', '3-5B', '3-S', '4-1', '4-2', '4-3', '4-4', '4-5', '4-5B', '4-S',
    '5-1', '5-2', '5-2B', '5-3', '5-4', '5-5', '5-5B', '5-S',
    '6-1', '6-2', '6-3', '6-4', '6-5', '6-5B', '6-S']);
assert.ok(STAGES[5].hidden);
for (const [d, title, goal] of [[STAGE_1_4, '1-4 そよかぜの丘', true], [STAGE_1_5, '1-5 かげの城', false], [STAGE_1_5B, 'かげの王', false]]) {
  const lv = new Level(d);
  assert.equal(lv.title, title);
  assert.equal(!!lv.goal, goal);
  assert.equal(lv.tileAt(lv.start.tx, lv.start.ty + 1), TILE.GROUND);
  for (const s of lv.spawns) assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${title}: ${s.type} at ${s.x / 16},${s.y / 16}`);
}
{
  // ボス扉：地上で ↑ を押すと入る。空中では入れない。行き先は 1-5B
  const w = new World(STAGE_1_5);
  w.introTimer = 0;
  w.points = [];
  w.shooters = [];
  assert.equal(w.level.doorTo, '1-5B');
  assert.equal(w.level.tileAt(174, 23), TILE.BOSS_DOOR);
  assert.equal(w.level.tileAt(174, 22), TILE.BOSS_DOOR_TOP);
  const p = w.player;
  p.xpos = 174 * 16;
  run(w, 5, () => [0]);
  run(w, 20, (f) => [f < 10 ? PAD.B : 0]); // 跳ぶ
  run(w, 3, () => [PAD.UP]);
  assert.ok(!w.doorEntered, 'not in the air');
  run(w, 60, () => [0]);
  run(w, 2, () => [PAD.UP]);
  assert.ok(w.doorEntered, 'entered');
  assert.ok(w.events.includes('door'));
  const x = p.xpos;
  run(w, 10, () => [PAD.RIGHT]);
  assert.equal(p.xpos, x, 'world stops');
  console.log('door: ok');
}
{
  // ボス：歩く・玉を投げる・跳ぶ。3 回踏むと倒れてコースクリア
  const w = new World(STAGE_1_5B);
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss, 'boss spawned');
  // ルミナを安全な所（上の橋）に置いて、動きを見る
  p.xpos = 7 * 16;
  p.ypos = 19 * 16 - 32;
  let balls = 0, jumped = false;
  for (let f = 0; f < 400; f++) {
    p.hurtTimer = 100;
    run(w, 1, () => [0]);
    if (w.actors.some((a) => a.type === 'shadowball')) balls++;
    if (boss.ys < -0x20) jumped = true;
  }
  assert.ok(balls > 0, 'throws shadow balls');
  assert.ok(jumped, 'jumps');
  const stomp = () => {
    boss.inv = 0;
    boss.state = 'walk';
    boss.contactTimer = 0;
    boss.ys = 0;
    p.hurtTimer = 0;
    p.xpos = boss.x;
    p.ypos = boss.y - 60;
    p.inAir = 0x24;
    p.yspeed = 0x30;
    const hp = boss.hp;
    for (let f = 0; f < 30 && boss.hp === hp; f++) run(w, 1, () => [0]);
    assert.equal(boss.hp, hp - 1, 'stomp hurts the boss');
  };
  stomp();
  assert.equal(boss.state, 'shell', 'turns into a spike ball');
  assert.equal(p.state, 0, 'Rumina not hurt by stomping');
  // トゲの球に触れるとダメージ
  p.hurtTimer = 0;
  p.xpos = boss.x;
  p.ypos = boss.y - 16;
  boss.contactTimer = 0;
  run(w, 3, () => [0]);
  assert.equal(p.state, 1, 'spike ball hurts');
  // 縮む演出が終わるまで待つ（上の橋に逃がしておく）
  p.xpos = 7 * 16;
  p.ypos = 19 * 16 - 32;
  for (let f = 0; f < 60; f++) { run(w, 1, () => [0]); p.hurtTimer = 100; }
  // （待っている間に、跳んだボスがルミナの足にぶつかって踏まれることもある）
  p.powerUp = 1;
  while (!boss.dying) stomp();
  assert.ok(boss.dying, 'defeated after 3 stomps');
  p.hurtTimer = 200;
  for (let f = 0; f < 200 && !p.endTimer; f++) run(w, 1, () => [0]);
  assert.ok(p.endTimer, 'course clear sequence starts');
  assert.ok(w.events.includes('goal'));
  let n = 0;
  while (!w.cleared && n++ < 1500) run(w, 1, () => [0]);
  assert.ok(w.cleared, 'cleared (walks into the wall, then victory pose)');
  console.log('boss: ok');
}
console.log('stages 1-4, 1-5: ok');
