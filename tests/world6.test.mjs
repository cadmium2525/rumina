// ワールド 6 のテスト: node tests/world6.test.mjs
import assert from 'node:assert/strict';
import { run, PAD, makeWorld } from './helpers.mjs';
import { Level, TILE, NOTE_TIME } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { findRoute } from '../tools/check_route.mjs';

const get = (id) => STAGES.find((s) => s.id === id);
const titles = { '6-1': '6-1 ネオンどおり', '6-2': '6-2 おんぷのビル', '6-3': '6-3 ネオンのこうか', '6-4': '6-4 ちかてつ',
  '6-5': '6-5 ネオンの城', '6-5B': 'ネオンの王', '6-S': '6-? おんぷのそら' };
for (const [id, title] of Object.entries(titles)) {
  const st = get(id);
  assert.ok(st, id);
  const lv = new Level(st.make());
  assert.equal(lv.title, title);
  if (id === '6-5') {
    assert.equal(lv.doorTo, '6-5B');
  } else if (id === '6-5B') {
    assert.ok(st.hidden && st.credit === '6-5');
    assert.deepEqual(lv.spawns.map((s) => s.type), ['boss6']);
  } else {
    assert.ok(lv.goal && lv.floorPx(lv.goal.tx * 16 + 8, (lv.goal.ty + 1) * 16 + 4), `${id} goal`);
  }
  if (id !== '6-5B' && id !== '6-5') assert.ok([...lv.tiles].includes(TILE.NOTE), `${id} uses note blocks`);
  assert.ok(lv.floorPx(lv.start.tx * 16 + 8, (lv.start.ty + 1) * 16 + 4), `${id} start`);
  for (const s of lv.spawns) assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${id}: ${s.type} at ${s.x / 16},${s.y / 16}`);
  const w = new World(st.make());
  w.introTimer = 0;
  run(w, 30, () => [PAD.RIGHT]);
  assert.ok(w.player.xpos > lv.start.tx * 16, `${id} can walk`);
}
const sg = new Level(get('6-2').make()).secretGoal;
assert.ok(sg && sg.ty <= 13, '6-2 has a secret goal on a rooftop');

// 音符ブロックに上から落ちる。B を押していれば hold
function noteDrop(holdB, power = 1) {
  const w = makeWorld({ power });
  w.level.set(20, 20, TILE.NOTE);
  const p = w.player;
  p.xpos = 20 * 16;
  p.ypos = 15 * 16;
  p.inAir = 0x24;
  const rows = [];
  let launch = -1;
  let peak = 1e9;
  for (let f = 0; f < 90; f++) {
    run(w, 1, () => [holdB ? PAD.B : 0]);
    const n = w.level.notes[0];
    rows.push({ f, y: p.ypos, ys: (p.yspeed << 24) >> 24, off: n ? n.off : null, air: p.inAir });
    if (launch < 0 && w.events.includes('note')) launch = f;
    if (launch >= 0) peak = Math.min(peak, p.ypos);
    w.events.length = 0;
    if (launch >= 0 && f > launch + 50) break;
  }
  return { rows, launch, height: 20 * 16 - (peak + 32), p, w };
}
{
  // SMW の BounceSpr01_TurnBlock（向き 3）：乗ると 8 フレームのあいだブロックと一緒に沈んで戻り、
  // 最後に player_yspeed = -96、ypos -= 2。B を押していると重力が弱いので高く跳ぶ
  const { rows, launch, height } = noteDrop(false);
  // 8 フレーム目（タイマーが 0）で跳ね上げて、ブロックは元に戻る
  const hold = rows.filter((r) => r.off !== null && r.f < launch); // 1 回目の跳ね
  assert.equal(hold.length, NOTE_TIME - 1, 'on the block for 7 frames, launched on the 8th');
  assert.deepEqual(hold.map((r) => r.off), [4, 7, 9, 10, 10, 9, 7], 'block sinks and comes back');
  for (const r of hold) {
    assert.equal(r.y, 20 * 16 + r.off - 32, 'player rides the block');
    assert.equal(r.ys, 0);
    assert.equal(r.air, 0, 'standing (misc_player_on_solid_sprite)');
  }
  const last = rows[launch];
  assert.equal(last.f, hold[hold.length - 1].f + 1);
  assert.equal(last.ys, -96, 'launch speed');
  assert.equal(last.y, 20 * 16 + 4 - 32 - 2, 'launch position');
  assert.ok(height >= 45 && height <= 52, `bounce height without B: ${height}`);
  const hi = noteDrop(true);
  assert.ok(hi.height >= 92 && hi.height <= 100, `bounce height holding B: ${hi.height}`);
  assert.ok(hi.height > 86, 'higher than a running jump');
  // 小さいルミナも同じ
  assert.equal(noteDrop(false, 0).height, height, 'small Rumina bounces the same');
  // 跳ねている間に B を押して跳んでも、ブロックの上に戻されて最後に -96
  {
    const w = makeWorld();
    w.level.set(20, 20, TILE.NOTE);
    const p = w.player;
    p.xpos = 20 * 16;
    p.ypos = 15 * 16;
    p.inAir = 0x24;
    let f0 = -1;
    for (let f = 0; f < 60 && f0 < 0; f++) {
      run(w, 1, () => [0]);
      if (w.level.notes.length) f0 = f;
    }
    run(w, 3, (f) => [f === 1 ? PAD.B : 0]);
    assert.equal(p.ypos, 20 * 16 + w.level.notes[0].off - 32, 'pinned after pressing B');
    for (let f = 0; f < 10 && w.level.notes.length; f++) run(w, 1, () => [0]);
    assert.equal(w.level.notes.length, 0);
  }
  // 下から叩くと上に跳ねる（ルミナの速さは変えない）
  {
    const w = makeWorld();
    w.level.set(20, 20, TILE.NOTE);
    const p = w.player;
    p.xpos = 20 * 16;
    p.ypos = 24 * 16 - 32;
    run(w, 3, () => [0]);
    const offs = [];
    for (let f = 0; f < 40; f++) {
      run(w, 1, () => [f < 10 ? PAD.B : 0]);
      if (w.level.notes.length) offs.push(w.level.notes[0].off);
    }
    assert.deepEqual(offs, [-4, -7, -9, -10, -10, -9, -7], 'bumped from below (back in place on the 8th frame)');
    assert.equal(w.level.tileAt(20, 20), TILE.NOTE);
  }
  console.log('note block: ok');
}
{
  // 6-2 のひみつの道：地面の音符ブロック（B を押したまま）→ 足場 → もう 1 つの音符ブロック → 屋上
  const start = () => {
    const w = new World(get('6-2').make());
    w.introTimer = 0;
    w.points = [];
    w.actors = w.actors.filter((a) => a.type === 'goal');
    w.shooters = [];
    w.player.powerUp = 1;
    w.player.xpos = 47 * 16;
    run(w, 5, () => [0]);
    return w;
  };
  // B を一瞬だけ押すと、低くしか跳ねず足場に届かない
  {
    const w = start();
    const log = run(w, 120, (f) => [PAD.RIGHT | (f < 6 ? PAD.B : 0)]);
    assert.ok(Math.min(...log.map((l) => l.y + 32)) > 18 * 16, 'short bounce does not reach the ledge');
  }
  const w = start();
  const p = w.player;
  run(w, 120, () => [PAD.RIGHT | PAD.B]);
  assert.equal(p.ypos + 32, 18 * 16, 'on the ledge');
  run(w, 3, () => [PAD.RIGHT]);
  run(w, 160, () => [PAD.RIGHT | PAD.B]);
  assert.equal(p.ypos + 32, 12 * 16, 'on the rooftop');
  // 屋上を走って、端で跳ぶ
  const lv = w.level;
  let hold = 0;
  for (let f = 0; f < 900 && !p.endTimer; f++) {
    if (!p.inAir && !lv.floorPx(p.xpos + 8 + 20, p.ypos + 36)) hold = 30;
    const b = hold-- > 0 ? PAD.B : 0;
    run(w, 1, () => [PAD.RIGHT | PAD.Y | b]);
    assert.ok(p.ypos + 32 <= 14 * 16, 'stays on the rooftops');
  }
  assert.ok(p.endTimer && w.secretExit, 'secret exit');
  console.log('6-2 secret: ok');
}
{
  // ネオンの王：大ジャンプの着地で床を走る電撃を左右に出す。電撃に触れるとダメージ。7 回踏むと倒れる
  const w = new World(get('6-5B').make());
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss && boss.variant === 6 && boss.hp === 7);
  let shocks = 0;
  let dirs = new Set();
  for (let f = 0; f < 600; f++) {
    p.hurtTimer = 100;
    p.xpos = 7 * 16;
    p.ypos = 15 * 16 - 32; // ボスの跳ぶ高さより上（宙に止めておく）
    run(w, 1, () => [0]);
    for (const a of w.actors) if (a.type === 'shock') dirs.add(Math.sign(a.xs));
    shocks = Math.max(shocks, w.actors.filter((a) => a.type === 'shock').length);
  }
  assert.ok(shocks >= 2 && dirs.has(1) && dirs.has(-1), `sends shocks both ways (${shocks})`);
  // 電撃は壁で消える
  for (let f = 0; f < 200 && w.actors.some((a) => a.type === 'shock'); f++) run(w, 1, () => [0]);
  assert.ok(!w.actors.some((a) => a.type === 'shock'), 'shocks vanish at the walls');
  // 電撃に触れるとダメージ
  {
    const t = new World(get('6-5B').make());
    t.introTimer = 0;
    t.points = [];
    t.actors = [];
    const q = t.player;
    q.powerUp = 1;
    run(t, 2, () => [0]);
    const b = new (boss.constructor)(11 * 16, 23 * 16);
    b.sendShock(t);
    q.xpos = 6 * 16;
    let hurt = false;
    for (let f = 0; f < 120 && !hurt; f++) {
      run(t, 1, () => [0]);
      hurt = q.state !== 0 || q.hurtTimer > 0 || q.powerUp === 0;
    }
    assert.ok(hurt, 'shock hurts');
  }
  boss.hp = 7; // 上で宙に止めていたルミナに、跳んだボスが当たることがあるので戻す
  let stomps = 0;
  while (!boss.dying && stomps < 14) {
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
  assert.equal(stomps, 7, `7 stomps (${stomps}, hp ${boss.hp})`);
  p.hurtTimer = 300;
  for (let f = 0; f < 200 && !p.endTimer; f++) run(w, 1, () => [0]);
  assert.ok(p.endTimer, 'course clear');
  console.log('boss 6: ok');
}
{
  // 敵なしで、どのコースもスタートからゴール（お城はボス扉）まで通れる操作の列がある
  for (const id of ['6-1', '6-2', '6-2:secret', '6-3', '6-4', '6-5', '6-S']) {
    const [sid, kind] = id.split(':');
    const r = findRoute(sid, { want: kind === 'secret' ? 'secret' : 'goal' });
    assert.ok(r.ok, `${id} route (best x ${r.best})`);
  }
  console.log('routes: ok');
}
console.log('world 6: ok');
