// ワールド 7 のテスト: node tests/world7.test.mjs
import assert from 'node:assert/strict';
import { run, PAD, PAD2, makeWorld } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { findRoute } from '../tools/check_route.mjs';

const get = (id) => STAGES.find((s) => s.id === id);
const titles = { '7-1': '7-1 かざんのふもと', '7-2': '7-2 ようがんのかわ', '7-3': '7-3 かざんのどうくつ', '7-4': '7-4 ふんかのみち',
  '7-5': '7-5 かざんの城', '7-5B': 'かざんの王', '7-S': '7-? ひのこのみち' };
const autoKinds = { '7-2': 1, '7-4': 2, '7-S': 2 };
for (const [id, title] of Object.entries(titles)) {
  const st = get(id);
  assert.ok(st, id);
  const lv = new Level(st.make());
  assert.equal(lv.title, title);
  assert.equal(lv.autoScroll, autoKinds[id] ?? 0, `${id} auto scroll`);
  if (id === '7-5') {
    assert.equal(lv.doorTo, '7-5B');
  } else if (id === '7-5B') {
    assert.ok(st.hidden && st.credit === '7-5');
    assert.deepEqual(lv.spawns.map((s) => s.type), ['boss7']);
  } else {
    assert.ok(lv.goal && lv.floorPx(lv.goal.tx * 16 + 8, (lv.goal.ty + 1) * 16 + 4), `${id} goal`);
    // 強制スクロールのステージは、ゴールが最後の画面（スクロールが止まる所）にある
    if (lv.autoScroll) assert.ok(lv.goal.tx * 16 >= lv.widthPx - 256, `${id} goal in the last screen`);
  }
  assert.ok(lv.floorPx(lv.start.tx * 16 + 8, (lv.start.ty + 1) * 16 + 4), `${id} start`);
  for (const s of lv.spawns) {
    assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${id}: ${s.type} at ${s.x / 16},${s.y / 16}`);
    if (s.type === 'ember') assert.equal(lv.tileAtPx(s.x + 8, s.y + 8), TILE.LAVA, `${id}: ember in lava at ${s.x / 16}`);
  }
  const w = new World(st.make());
  w.introTimer = 0;
  run(w, 30, () => [PAD.RIGHT]);
  assert.ok(w.player.xpos > lv.start.tx * 16, `${id} can walk`);
}
{
  // 強制スクロール (Spr0F3)：速さは 1/256px ずつ上がって 0x80（遅い）/ 0x100（速い）で止まる。最後の画面で止まる
  for (const [kind, max] of [[1, 0x80], [2, 0x100]]) {
    const w = makeWorld();
    w.level.autoScroll = kind;
    w.env.autoScroll = w.camera;
    const p = w.player;
    p.xpos = 40;
    run(w, 1, () => [0]);
    assert.equal(w.camera.autoSpeed, 1);
    run(w, 300, () => [0]);
    assert.equal(w.camera.autoSpeed, max, 'max speed');
    // 128 フレームで 1+2+…+128 = 8256 / 256 ≈ 32px（遅い・速いとも同じ）
    const w2 = makeWorld();
    w2.level.autoScroll = kind;
    w2.env.autoScroll = w2.camera;
    w2.player.xpos = 40;
    run(w2, 128, () => [0]);
    assert.equal(w2.camera.x, 32);
    // 何もしないと左の端で押されて進む（スクロールと同じ速さ）
    assert.equal(p.state, 0);
    assert.ok(p.xpos - w.camera.x >= 7 && p.xpos - w.camera.x <= 9, `pushed at the left edge (${p.xpos - w.camera.x})`);
    // 最後の画面で止まる（標準のテストステージのゴールは消しておく）
    w.actors = w.actors.filter((a) => a.type !== 'goal');
    for (let f = 0; f < 20000 && w.camera.autoSpeed; f++) {
      p.xpos = w.camera.x + 100;
      run(w, 1, () => [0]);
    }
    assert.equal(w.camera.x, w.level.widthPx - 256, 'stops at the last screen');
  }
  // 壁と画面の左端にはさまれるとミス (00E98C: 画面の左の外へ出た)
  {
    const w = makeWorld();
    w.level.autoScroll = 2;
    w.env.autoScroll = w.camera;
    const p = w.player;
    p.xpos = 40;
    run(w, 200, () => [0]);
    const tx = Math.floor(w.camera.x / 16) + 3;
    w.level.fill(tx, 18, 1, 6, TILE.STONE);
    let f = 0;
    for (; f < 400 && p.state !== 9; f++) run(w, 1, () => [0]);
    assert.equal(p.state, 9, 'crushed');
    assert.ok(p.xpos < w.camera.x, 'pushed off the left edge');
  }
  // 壁を跳び越えれば大丈夫
  {
    const w = makeWorld();
    w.level.autoScroll = 2;
    w.env.autoScroll = w.camera;
    const p = w.player;
    p.xpos = 80;
    run(w, 200, () => [0]);
    const tx = Math.floor(p.xpos / 16) + 4;
    w.level.fill(tx, 21, 1, 3, TILE.STONE);
    run(w, 120, (f) => [PAD.RIGHT | (f > 10 && f < 40 ? PAD.B : 0)]);
    assert.ok(p.xpos > tx * 16 + 16 && p.state === 0, 'jumped over the wall');
  }
  // ふつうのステージ（強制スクロールなし）は今までどおり：画面の左端では止まるだけ
  {
    const w = makeWorld();
    const p = w.player;
    p.xpos = 30;
    run(w, 120, () => [PAD.LEFT]);
    assert.equal(p.state, 0);
    assert.ok(p.xpos >= 6 && p.xpos <= 9, `stops at the left edge (${p.xpos})`);
  }
  console.log('auto scroll: ok');
}
{
  // ひのこ：溶岩の中にひそみ（見えない・当たらない）、ときどき跳び出す。跳んでいる時に触れるとダメージ
  const w = makeWorld();
  w.level.fill(20, 24, 4, 3, TILE.LAVA);
  w.points = [{ type: 'ember', x: 21 * 16, y: 24 * 16, state: 'idle', actor: null }];
  const p = w.player;
  p.xpos = 16 * 16; // ひのこが画面に入る所
  run(w, 2, () => [0]);
  const e = w.actors.find((a) => a.type === 'ember');
  assert.ok(e && !e.jumping, 'ember waits in the lava');
  let top = e.y;
  for (let f = 0; f < 200; f++) {
    run(w, 1, () => [0]);
    top = Math.min(top, e.y);
  }
  assert.ok(!e.dead, 'ember survives in the lava');
  assert.ok(24 * 16 - top >= 64, `leaps out of the lava (${24 * 16 - top}px)`);
  // 跳んでいる所に触れるとダメージ
  p.xpos = 21 * 16;
  p.ypos = 19 * 16 - 32;
  p.inAir = 0x24;
  let hurt = false;
  for (let f = 0; f < 200 && !hurt; f++) {
    p.xpos = 21 * 16;
    p.ypos = 19 * 16 - 32;
    p.yspeed = 0;
    run(w, 1, () => [0]);
    hurt = p.powerUp === 0 || p.state !== 0;
  }
  assert.ok(hurt, 'ember hurts');
  console.log('ember: ok');
}
{
  // 7-1 のひみつの道：台地の上の金のブロックをスピンジャンプで壊して、下の洞窟へ
  const w = new World(get('7-1').make());
  w.introTimer = 0;
  w.points = [];
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.shooters = [];
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 125 * 16;
  p.ypos = 12 * 16 - 32;
  run(w, 10, () => [0]);
  // ふつうのジャンプでは壊れない
  run(w, 60, (f) => [PAD.RIGHT * (f < 6 ? 1 : 0) | (f < 20 ? PAD.B : 0)]);
  assert.equal(p.ypos + 32, 12 * 16, 'still on the plateau');
  // スピンジャンプで壊れて落ちる
  p.xpos = 127 * 16 + 8;
  run(w, 150, (f) => [0, f < 20 ? PAD2.A : 0]); // 壊すたびに少し跳ね返る (player_yspeed = -48)
  assert.ok([126, 127, 128, 129, 130].some((x) => w.level.tileAt(x, 12) === TILE.EMPTY), 'gold blocks broken');
  assert.ok(p.ypos + 32 > 20 * 16, 'fell into the cave');
  for (let f = 0; f < 1200 && !p.endTimer; f++) {
    // 溶岩のくぼみは跳び越える
    const b = p.xpos > 135 * 16 && p.xpos < 140 * 16 ? PAD.B : 0;
    run(w, 1, () => [PAD.RIGHT | b]);
  }
  assert.ok(p.endTimer && w.secretExit, 'secret exit in the cave');
  // ふつうの道（台地の上）を通っても、下の洞窟のひみつのゴールは反応しない
  const w2 = new World(get('7-1').make());
  w2.introTimer = 0;
  w2.points = [];
  w2.actors = w2.actors.filter((a) => a.type === 'goal');
  const q = w2.player;
  q.powerUp = 1;
  q.xpos = 150 * 16;
  q.ypos = 12 * 16 - 32;
  run(w2, 300, () => [PAD.RIGHT]);
  assert.ok(q.xpos > 166 * 16 && !q.endTimer, 'walks over the cave without the secret exit');
  console.log('7-1 secret: ok');
}
{
  // かざんの王：大ジャンプの着地で、ルミナのまわりの床から火柱を 3 本。床が光ってから噴き上がる。8 回踏むと倒れる
  const w = new World(get('7-5B').make());
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss && boss.variant === 7 && boss.hp === 8);
  let pillars = 0;
  let warned = false;
  let rose = 0;
  for (let f = 0; f < 600; f++) {
    p.hurtTimer = 100;
    p.xpos = 7 * 16;
    p.ypos = 15 * 16 - 32;
    run(w, 1, () => [0]);
    const ps = w.actors.filter((a) => a.type === 'pillar');
    pillars = Math.max(pillars, ps.length);
    if (ps.some((a) => a.h === 0)) warned = true;
    rose = Math.max(rose, ...ps.map((a) => a.h), 0);
  }
  assert.ok(pillars >= 3, `raises pillars (${pillars})`);
  assert.ok(warned && rose >= 48, `warns, then erupts (${rose}px)`);
  // 火柱は橋の上には届かない（橋の上の足もと 320 より下）
  assert.ok(23 * 16 + 16 - rose > 20 * 16, 'bridges are safe');
  // 火柱に触れるとダメージ
  {
    const t = new World(get('7-5B').make());
    t.introTimer = 0;
    t.points = [];
    t.actors = [];
    const q = t.player;
    q.powerUp = 1;
    run(t, 2, () => [0]);
    q.xpos = 6 * 16;
    const b = new (boss.constructor)(11 * 16, 23 * 16);
    b.raisePillars(t);
    let hurt = false;
    for (let f = 0; f < 120 && !hurt; f++) {
      run(t, 1, () => [0]);
      hurt = q.powerUp === 0 || q.state !== 0;
    }
    assert.ok(hurt, 'pillar hurts');
  }
  boss.hp = 8;
  let stomps = 0;
  while (!boss.dying && stomps < 16) {
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
  assert.equal(stomps, 8, `8 stomps (${stomps})`);
  p.hurtTimer = 300;
  for (let f = 0; f < 200 && !p.endTimer; f++) run(w, 1, () => [0]);
  assert.ok(p.endTimer, 'course clear');
  console.log('boss 7: ok');
}
{
  // 敵なしで、どのコースもスタートからゴール（お城はボス扉）まで通れる操作の列がある
  // 7-1 のひみつの道は、ふつうの道で通る台地の上（x=121）から
  for (const id of ['7-1', '7-1:secret@121,12', '7-2', '7-3', '7-4', '7-5', '7-S']) {
    const [sid, rest = ''] = id.split(':');
    const [kind, at] = rest.split('@');
    const from = at ? at.split(',').map(Number) : null;
    const r = findRoute(sid, { want: kind === 'secret' ? 'secret' : 'goal', from });
    assert.ok(r.ok, `${id} route (best x ${r.best})`);
  }
  console.log('routes: ok');
}
console.log('world 7: ok');
