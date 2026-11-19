// ワールド 5 のテスト: node tests/world5.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';

const get = (id) => STAGES.find((s) => s.id === id);
const titles = { '5-1': '5-1 くものうえ', '5-2': '5-2 にじのはし', '5-2B': '5-2 くものしたの部屋', '5-3': '5-3 そらの神殿',
  '5-4': '5-4 ながれぼしの道', '5-5': '5-5 そらの城', '5-5B': 'そらの王', '5-S': '5-? にじのくも' };
for (const [id, title] of Object.entries(titles)) {
  const st = get(id);
  assert.ok(st, id);
  const lv = new Level(st.make());
  assert.equal(lv.title, title);
  if (id === '5-5') {
    assert.equal(lv.doorTo, '5-5B');
  } else if (id === '5-5B') {
    assert.ok(st.hidden && st.credit === '5-5');
    assert.deepEqual(lv.spawns.map((s) => s.type), ['boss5']);
  } else if (id === '5-2B') {
    assert.ok(st.hidden && st.credit === '5-2');
    assert.ok(lv.secretGoal && !lv.goal, 'secret room has only the secret goal');
  } else {
    assert.ok(lv.goal && lv.floorPx(lv.goal.tx * 16 + 8, (lv.goal.ty + 1) * 16 + 4), `${id} goal`);
  }
  assert.ok(lv.floorPx(lv.start.tx * 16 + 8, (lv.start.ty + 1) * 16 + 4), `${id} start`);
  for (const s of lv.spawns) assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${id}: ${s.type} at ${s.x / 16},${s.y / 16}`);
  const w = new World(st.make());
  w.introTimer = 0;
  run(w, 30, () => [PAD.RIGHT]);
  assert.ok(w.player.xpos > lv.start.tx * 16, `${id} can walk`);
}
{
  // 空のステージ：下に落ちるとミス
  const w = new World(get('5-1').make());
  w.introTimer = 0;
  w.points = [];
  const p = w.player;
  p.xpos = 20 * 16;
  p.ypos = 10 * 16;
  p.inAir = 0x24;
  let st = 0;
  for (let f = 0; f < 300 && st !== 9; f++) { run(w, 1, () => [0]); st = p.state; }
  assert.equal(st, 9, 'falls into the sky');
}
{
  // 5-2：穴に飛びこむと底の雲に着地。右へ進むと扉。↑ で入ると、行き先は 5-2B
  const w = new World(get('5-2').make());
  w.introTimer = 0;
  w.points = [];
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.shooters = [];
  assert.equal(w.level.doorTo, '5-2B');
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 96 * 16;
  p.ypos = 15 * 16;
  p.inAir = 0x24;
  run(w, 120, () => [0]);
  assert.equal(p.state, 0, 'not dead');
  assert.equal(p.ypos + 32, 25 * 16, 'landed on the hidden cloud');
  // 底の雲を右へ歩いて、扉（128〜129 マス）の前で止まる
  for (let f = 0; f < 800 && p.xpos < 128 * 16 - 6; f++) run(w, 1, () => [PAD.RIGHT]);
  run(w, 30, () => [0]);
  run(w, 2, () => [PAD.UP]);
  assert.ok(w.doorEntered, 'entered the door');
  // 小部屋のひみつのゴール
  const room = new World(get('5-2B').make());
  room.introTimer = 0;
  room.points = [];
  room.actors = room.actors.filter((a) => a.type === 'goal');
  let done = false;
  for (let f = 0; f < 600 && !done; f++) {
    run(room, 1, () => [PAD.RIGHT]);
    done = !!room.player.endTimer;
  }
  assert.ok(done && room.secretExit, 'secret exit in the room');
  console.log('5-2 secret: ok');
}
{
  // そらの王：飛ぶ・玉の雨・急降下して床で休む。休んでいる時に踏める。6 回で倒れる
  const w = new World(get('5-5B').make());
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss && boss.variant === 5 && boss.hp === 6);
  const floorY = boss.y;
  let flew = false, rain = false, rested = false;
  for (let f = 0; f < 600; f++) {
    p.hurtTimer = 100;
    p.xpos = 3 * 16;
    p.ypos = 20 * 16 - 32;
    run(w, 1, () => [0]);
    if (boss.y < floorY - 48) flew = true;
    if (w.actors.some((a) => a.type === 'shadowball' && a.ys > 0)) rain = true;
    if (boss.state === 'rest') rested = true;
  }
  assert.ok(flew, 'flies');
  assert.ok(rain, 'rains balls');
  assert.ok(rested, 'dives and rests on the floor');
  let stomps = 0;
  while (!boss.dying && stomps < 12) {
    boss.inv = 0;
    boss.state = 'rest';
    boss.timer = 60;
    boss.y = floorY;
    boss.contactTimer = 0;
    p.hurtTimer = 0;
    p.xpos = boss.x;
    p.ypos = boss.y - 60;
    p.inAir = 0x24;
    p.yspeed = 0x30;
    const hp = boss.hp;
    for (let f = 0; f < 30 && boss.hp === hp; f++) run(w, 1, () => [0]);
    stomps++;
  }
  assert.ok(boss.dying);
  assert.equal(stomps, 6, '6 stomps');
  p.hurtTimer = 300;
  for (let f = 0; f < 200 && !p.endTimer; f++) run(w, 1, () => [0]);
  assert.ok(p.endTimer, 'course clear');
  console.log('boss 5: ok');
}
console.log('world 5: ok');
