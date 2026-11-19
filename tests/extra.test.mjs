// エクストラ「ほしの道」のテスト: node tests/extra.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { OW_MAPS } from '../js/overworld/maps.js';
import { findRoute } from '../tools/check_route.mjs';

const get = (id) => STAGES.find((s) => s.id === id);
const titles = ['ほしくずのがけ', 'おんぷのめいろ', 'ひのこのたき', 'くらやみのとう', 'きんのブロックのみち',
  'ほうだいのあらし', 'みずのそこのほし', 'そらのきりたち', 'はやぶさのみち', 'ほしのはて'];
// 地図の点 a〜j が E-1〜E-10
const ex = OW_MAPS.ex;
for (let i = 0; i < 10; i++) assert.equal(ex.nodes['abcdefghij'[i]].stage, `E-${i + 1}`);
for (let i = 1; i <= 10; i++) {
  const id = `E-${i}`;
  const st = get(id);
  assert.ok(st, id);
  const lv = new Level(st.make());
  assert.equal(lv.title, `${id} ${titles[i - 1]}`);
  assert.ok(lv.goal && lv.floorPx(lv.goal.tx * 16 + 8, (lv.goal.ty + 1) * 16 + 4), `${id} goal`);
  if (lv.autoScroll) assert.ok(lv.goal.tx * 16 >= lv.widthPx - 256, `${id} goal in the last screen`);
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
assert.equal(new Level(get('E-3').make()).autoScroll, 2);
assert.equal(new Level(get('E-9').make()).autoScroll, 2);
assert.ok(new Level(get('E-4').make()).dark && new Level(get('E-9').make()).dark);
assert.equal(get('E-10').ending.length, 3, 'E-10 has the ending text');
{
  // E-2：天井のトゲの下の音符ブロックで B を押したまま跳ねると、頭をぶつけてダメージ。離していれば大丈夫
  for (const holdB of [false, true]) {
    const w = new World(get('E-2').make());
    w.introTimer = 0;
    w.points = [];
    w.actors = w.actors.filter((a) => a.type === 'goal');
    const p = w.player;
    p.powerUp = 1;
    p.xpos = 20 * 16;
    p.ypos = 18 * 16;
    p.inAir = 0x24;
    for (let f = 0; f < 70; f++) {
      p.xpos = 20 * 16;
      run(w, 1, () => [holdB ? PAD.B : 0]);
    }
    assert.equal(p.powerUp === 0 || p.state !== 0, holdB, holdB ? 'B: hits the spikes' : 'no B: safe');
  }
  console.log('E-2 spikes: ok');
}
{
  // 敵なしで、どのコースもダメージを受けずにスタートからゴールまで通れる操作の列がある
  for (let i = 1; i <= 10; i++) {
    const r = findRoute(`E-${i}`, { noDamage: true });
    assert.ok(r.ok, `E-${i} route (best x ${r.best})`);
  }
  console.log('routes: ok');
}
console.log('extra: ok');
