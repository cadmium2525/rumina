// ワールド 2 のテスト: node tests/world2.test.mjs
import assert from 'node:assert/strict';
import { run } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';

assert.deepEqual(STAGES.map((s) => s.id),
  ['1-1', '1-2', '1-3', '1-4', '1-5', '1-5B', '1-S', '2-1', '2-2', '2-3', '2-4', '2-5', '2-5B', '2-S',
    '3-1', '3-2', '3-3', '3-4', '3-5', '3-5B', '3-S']);
const titles = { '2-1': '2-1 すなあらしの遺跡', '2-2': '2-2 みずの洞窟', '2-3': '2-3 よるのアキハバラ',
  '2-4': '2-4 そらのツタ', '2-5': '2-5 ほのおの城', '2-5B': 'ほのおの王', '2-S': '2-? すなの地下神殿' };
for (const st of STAGES.filter((s) => s.id.startsWith('2-'))) {
  const lv = new Level(st.make());
  assert.equal(lv.title, titles[st.id]);
  // ふつうのステージはゴール、2-5 はボス扉、ボス部屋はボス
  if (st.id === '2-5') {
    assert.equal(lv.doorTo, '2-5B');
    assert.ok([...lv.tiles].includes(TILE.BOSS_DOOR));
    assert.equal(lv.goal, null);
  } else if (st.id === '2-5B') {
    assert.ok(st.hidden);
    assert.deepEqual(lv.spawns.map((s) => s.type), ['boss2']);
  } else {
    assert.ok(lv.goal, `${st.id} has a goal`);
    assert.ok(lv.floorPx(lv.goal.tx * 16 + 8, (lv.goal.ty + 1) * 16 + 4), `${st.id} goal on the floor`);
  }
  assert.ok(lv.floorPx(lv.start.tx * 16 + 8, (lv.start.ty + 1) * 16 + 4), `${st.id} start on the floor`);
  for (const s of lv.spawns) assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${st.id}: ${s.type} at ${s.x / 16},${s.y / 16}`);
  // 始まって少し歩ける
  const w = new World(st.make());
  w.introTimer = 0;
  run(w, 30, () => [1]);
  assert.ok(w.player.xpos > lv.start.tx * 16, `${st.id} can walk`);
}
{
  // ほのおの王：5 回踏むと倒れる。玉を 2 つ投げる
  const w = new World(STAGES.find((s) => s.id === '2-5B').make());
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss && boss.variant === 2 && boss.hp === 5);
  p.xpos = 3 * 16;
  p.ypos = 20 * 16 - 32;
  let most = 0;
  for (let f = 0; f < 300; f++) {
    p.hurtTimer = 100;
    run(w, 1, () => [0]);
    most = Math.max(most, w.actors.filter((a) => a.type === 'shadowball').length);
  }
  assert.ok(most >= 2, 'throws two balls');
  let stomps = 0;
  while (!boss.dying && stomps < 10) {
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
    stomps++;
  }
  assert.ok(boss.dying, 'defeated');
  assert.equal(stomps, 5, '5 stomps');
  console.log('boss 2: ok');
}
console.log('world 2: ok');
