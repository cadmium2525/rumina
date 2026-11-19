// ワールド 4 のテスト: node tests/world4.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';

const get = (id) => STAGES.find((s) => s.id === id);
const titles = { '4-1': '4-1 いわのいりぐち', '4-2': '4-2 ちていこ', '4-3': '4-3 すいしょうのどうくつ', '4-4': '4-4 ちかの遺跡',
  '4-5': '4-5 いわの城', '4-5B': 'いわの王', '4-S': '4-? すいしょうの川' };
for (const [id, title] of Object.entries(titles)) {
  const st = get(id);
  assert.ok(st, id);
  const lv = new Level(st.make());
  assert.equal(lv.title, title);
  if (id === '4-5') {
    assert.equal(lv.doorTo, '4-5B');
    assert.ok([...lv.tiles].includes(TILE.BOSS_DOOR));
  } else if (id === '4-5B') {
    assert.ok(st.hidden && st.credit === '4-5');
    assert.deepEqual(lv.spawns.map((s) => s.type), ['boss4']);
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
assert.ok(new Level(get('4-3').make()).secretGoal, '4-3 has a secret goal');
{
  // 4-3 の寄り道：トンネルの天井の金のブロックを下から叩いて回し、すり抜けてハシゴで上の部屋へ
  const w = new World(get('4-3').make());
  w.introTimer = 0;
  w.points = [];
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.shooters = [];
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 104 * 16 + 4;
  run(w, 4, () => [0]);
  assert.equal(w.level.tileAt(104, 20), TILE.TURN);
  run(w, 30, (f) => [f < 4 ? PAD.B : 0]); // 小さく跳んで頭で叩く
  assert.equal(w.level.tileAt(104, 20), TILE.SPIN, 'turn block spins');
  run(w, 40, (f) => [(f < 25 ? PAD.B : 0) | PAD.UP]); // 大きく跳んで、すり抜けながら ↑ でつかまる
  assert.ok(p.climbing, 'grabbed the ladder above');
  run(w, 300, () => [PAD.UP]);
  const sg = w.level.secretGoal;
  assert.ok(p.ypos + 32 <= (sg.ty + 2) * 16, `climbed to the upper room (row ${(p.ypos + 32) / 16})`);
  console.log('4-3 detour: ok');
}
{
  // 4-2 の地底湖：泳いで、↑+B で岸の壁を越えて上がれる
  const w = new World(get('4-2').make());
  w.introTimer = 0;
  w.points = [];
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.shooters = [];
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 57 * 16;
  p.ypos = 22 * 16;
  run(w, 60, () => [0]);
  assert.ok(p.swimming, 'swimming');
  let out = false;
  for (let f = 0; f < 240 && !out; f++) {
    run(w, 1, () => [PAD.RIGHT | PAD.UP | (f & 8 ? PAD.B : 0)]);
    out = p.xpos > 61 * 16 && !p.swimming && !p.inAir;
  }
  assert.ok(out, `climbed out of the lake (x ${p.xpos / 16})`);
  console.log('4-2 lake: ok');
}
{
  // いわの王：大ジャンプの着地で落石を 3 つ。6 回踏むと倒れる
  const w = new World(get('4-5B').make());
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss && boss.variant === 4 && boss.hp === 6);
  p.xpos = 7 * 16;
  p.ypos = 17 * 16 - 32;
  let rocks = 0;
  for (let f = 0; f < 500; f++) {
    p.hurtTimer = 100;
    run(w, 1, () => [0]);
    rocks = Math.max(rocks, w.actors.filter((a) => a.type === 'rock').length);
  }
  assert.ok(rocks >= 3, `drops rocks (${rocks})`);
  // 落石は床で砕ける
  for (let f = 0; f < 200 && w.actors.some((a) => a.type === 'rock'); f++) run(w, 1, () => [0]);
  assert.ok(!w.actors.some((a) => a.type === 'rock'), 'rocks shatter');
  let stomps = 0;
  while (!boss.dying && stomps < 12) {
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
  assert.ok(boss.dying);
  assert.equal(stomps, 6, '6 stomps');
  console.log('boss 4: ok');
}
console.log('world 4: ok');
