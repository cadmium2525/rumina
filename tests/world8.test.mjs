// ワールド 8 のテスト: node tests/world8.test.mjs
import assert from 'node:assert/strict';
import { run, PAD, makeWorld } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { Darkness, RUMINA_LIGHT } from '../js/darkness.js';
import { BOSS8_HP } from '../js/actors.js';
import { findRoute } from '../tools/check_route.mjs';

const get = (id) => STAGES.find((s) => s.id === id);
const titles = { '8-1': '8-1 やみのいりぐち', '8-2': '8-2 くらやみのもり', '8-3': '8-3 ほしのとう', '8-4': '8-4 やみのかいろう',
  '8-5': '8-5 やみの城', '8-5B': 'やみの大王', '8-S': '8-? ほしくずのみち' };
const darkIds = ['8-2', '8-4', '8-5', '8-5B'];
const autoKinds = { '8-4': 1, '8-S': 2 };
for (const [id, title] of Object.entries(titles)) {
  const st = get(id);
  assert.ok(st, id);
  const lv = new Level(st.make());
  assert.equal(lv.title, title);
  assert.equal(lv.dark, darkIds.includes(id), `${id} darkness`);
  assert.equal(lv.autoScroll, autoKinds[id] ?? 0, `${id} auto scroll`);
  if (id === '8-5') {
    assert.equal(lv.doorTo, '8-5B');
  } else if (id === '8-5B') {
    assert.ok(st.hidden && st.credit === '8-5' && st.ending, 'final boss room');
    assert.deepEqual(lv.spawns.map((s) => s.type), ['boss8']);
  } else {
    assert.ok(lv.goal && lv.floorPx(lv.goal.tx * 16 + 8, (lv.goal.ty + 1) * 16 + 4), `${id} goal`);
    if (lv.autoScroll) assert.ok(lv.goal.tx * 16 >= lv.widthPx - 256, `${id} goal in the last screen`);
  }
  // 暗いステージには、たいまつ（明かり）がある
  if (lv.dark) assert.ok([...lv.tiles].filter((t) => t === TILE.TORCH).length >= 4, `${id} has torches`);
  assert.ok(lv.floorPx(lv.start.tx * 16 + 8, (lv.start.ty + 1) * 16 + 4), `${id} start`);
  for (const s of lv.spawns) {
    assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${id}: ${s.type} at ${s.x / 16},${s.y / 16}`);
    if (s.type === 'ember') assert.equal(lv.tileAtPx(s.x + 8, s.y + 8), TILE.LAVA, `${id}: ember in lava`);
  }
  const w = new World(st.make());
  w.introTimer = 0;
  run(w, 30, () => [PAD.RIGHT]);
  assert.ok(w.player.xpos > lv.start.tx * 16, `${id} can walk`);
}
{
  // 暗やみ：設定はステージのデータに残る。光る物のまわりに穴を開ける（見た目だけ）
  const lv = new Level(get('8-2').make());
  assert.equal(new Level(lv.toData()).dark, true);
  const w = new World(get('8-2').make());
  w.introTimer = 0;
  const lights = (world) => Darkness.prototype.lights.call(null, world, world.camera.x, world.camera.y, 0);
  const p = w.player;
  p.powerUp = 0;
  assert.equal(lights(w)[0][2], RUMINA_LIGHT[0], 'small Rumina: small light');
  p.powerUp = 1;
  assert.equal(lights(w)[0][2], RUMINA_LIGHT[1], 'big Rumina (light orb): wider light');
  assert.ok(RUMINA_LIGHT[1] > RUMINA_LIGHT[0]);
  // たいまつの所
  p.xpos = 40 * 16;
  w.camera.x = 30 * 16;
  assert.ok(lights(w).length >= 2, 'torch light');
  // 暗やみでも、ゲームの動きは同じ（明るいステージと同じ入力で同じ位置）
  const a = new World(get('8-2').make());
  const b = new World({ ...get('8-2').make(), dark: false });
  for (const x of [a, b]) {
    x.introTimer = 0;
    x.points = [];
    run(x, 200, (f) => [PAD.RIGHT | (f % 40 < 20 ? PAD.B : 0)]);
  }
  assert.equal(a.player.xpos, b.player.xpos);
  assert.equal(a.player.ypos, b.player.ypos);
  console.log('darkness: ok');
}
{
  // コウモリ：ルミナが近くの下に来るまでぶら下がっている。来ると急降下して横へ飛ぶ。踏める
  const w = makeWorld();
  w.points = [{ type: 'bat', x: 22 * 16, y: 18 * 16, state: 'idle', actor: null }]; // 画面に入る所
  const p = w.player;
  p.xpos = 14 * 16;
  run(w, 2, () => [0]);
  const bat = w.actors.find((a) => a.type === 'bat');
  assert.ok(bat && bat.mode === 'hang');
  run(w, 30, () => [0]);
  assert.equal(bat.mode, 'hang', 'waits while Rumina is far');
  assert.equal(bat.y, 18 * 16);
  p.xpos = 18 * 16;
  run(w, 1, () => [0]);
  assert.equal(bat.mode, 'swoop', 'swoops when Rumina comes near');
  assert.ok(bat.xs < 0, 'toward Rumina');
  const y0 = bat.y;
  run(w, 30, () => [0]);
  assert.ok(bat.y > y0 + 32, 'dives down');
  // 踏む
  const t = makeWorld();
  t.points = [];
  t.actors = t.actors.filter((a) => a.type === 'goal');
  const q = t.player;
  q.xpos = 20 * 16;
  q.ypos = 14 * 16;
  q.inAir = 0x24;
  q.yspeed = 0x30;
  const b2 = new (bat.constructor)(20 * 16, 17 * 16);
  t.actors.push(b2);
  for (let f = 0; f < 30 && !b2.dying; f++) run(t, 1, () => [0]);
  assert.ok(b2.dying && q.powerUp === 1, 'stomped');
  console.log('bat: ok');
}
{
  // やみの大王：前半は地上で玉を 3 つ・大ジャンプの着地で電撃。体力が半分になると後半：
  // 空を飛んで玉の雨（5 つ）と急降下、着地で火柱。10 回踏むと倒れる
  const w = new World(get('8-5B').make());
  w.introTimer = 0;
  const p = w.player;
  p.powerUp = 1;
  run(w, 2, () => [0]);
  const boss = w.actors.find((a) => a.type === 'boss');
  assert.ok(boss && boss.variant === 8 && boss.hp === BOSS8_HP && BOSS8_HP === 10);
  const hold = () => { p.hurtTimer = 100; p.xpos = 7 * 16; p.ypos = 13 * 16 - 32; p.yspeed = 0; };
  let shocks = false, balls = 0;
  for (let f = 0; f < 600; f++) {
    hold();
    run(w, 1, () => [0]);
    if (w.actors.some((a) => a.type === 'shock')) shocks = true;
    balls = Math.max(balls, w.actors.filter((a) => a.type === 'shadowball').length);
  }
  assert.ok(shocks, 'phase 1: shocks');
  assert.ok(balls >= 3, `phase 1: 3 balls (${balls})`);
  assert.ok(!boss.phase2);
  // 5 回踏んで後半へ
  const stomp = () => {
    boss.inv = 0;
    if (!boss.phase2) boss.state = 'walk';
    else { boss.state = 'rest'; boss.timer = 60; boss.y = boss.floorY ?? boss.y; }
    boss.contactTimer = 0;
    boss.ys = 0;
    p.hurtTimer = 0;
    p.xpos = boss.x;
    p.ypos = boss.y - 60;
    p.inAir = 0x24;
    p.yspeed = 0x30;
    const hp = boss.hp;
    for (let f = 0; f < 30 && boss.hp === hp; f++) run(w, 1, () => [0]);
  };
  boss.hp = BOSS8_HP;
  let stomps = 0;
  while (boss.hp > BOSS8_HP / 2 && stomps < 10) { stomp(); stomps++; }
  assert.equal(stomps, 5);
  let flew = false, rain = 0, pillars = false;
  const floorY = 23 * 16;
  for (let f = 0; f < 900; f++) {
    hold();
    run(w, 1, () => [0]);
    if (boss.y < floorY - 48) flew = true;
    rain = Math.max(rain, w.actors.filter((a) => a.type === 'shadowball' && a.ys > 0).length);
    if (w.actors.some((a) => a.type === 'pillar')) pillars = true;
  }
  assert.ok(boss.phase2, 'phase 2');
  assert.ok(flew, 'phase 2: flies');
  assert.ok(rain >= 5, `phase 2: rain of 5 balls (${rain})`);
  assert.ok(pillars, 'phase 2: fire pillars when landing');
  while (!boss.dying && stomps < 20) { stomp(); stomps++; }
  assert.ok(boss.dying);
  assert.equal(stomps, 10, `10 stomps (${stomps})`);
  p.hurtTimer = 300;
  for (let f = 0; f < 200 && !p.endTimer; f++) run(w, 1, () => [0]);
  assert.ok(p.endTimer, 'course clear');
  console.log('final boss: ok');
}
{
  // 敵なしで、どのコースもスタートからゴール（お城はボス扉）まで通れる操作の列がある
  for (const id of ['8-1', '8-2', '8-2:secret', '8-3', '8-4', '8-5', '8-S']) {
    const [sid, kind] = id.split(':');
    const r = findRoute(sid, { want: kind === 'secret' ? 'secret' : 'goal' });
    assert.ok(r.ok, `${id} route (best x ${r.best})`);
  }
  console.log('routes: ok');
}
console.log('world 8: ok');
