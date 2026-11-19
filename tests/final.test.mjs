// ルミナの家と最終コースのテスト: node tests/final.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE, isDoor } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { OW_MAPS } from '../js/overworld/maps.js';
import { Overworld, loadSave } from '../js/overworld/overworld.js';
import { findRoute } from '../tools/check_route.mjs';

const get = (id) => STAGES.find((s) => s.id === id);
// 地図に渡すステージ（main.js の PLAYABLE と同じ）
const playable = STAGES.filter((s) => !s.hidden || s.onMap).map((s) => s.id);
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
{
  // 地図：ルミナの家は E-10 をクリアするまで入れない。クリアすると入れて、家の中（HOME）が始まる
  const S = OW_MAPS.w1.nodes.S;
  assert.ok(S.start && S.home === 'HOME' && S.unlock === 'E-10' && S.last === 'LAST');
  const st = memory();
  const save = loadSave(st);
  save.map = 'w1';
  save.node = 'S';
  const before = new Overworld({ ...save, cleared: ['1-1'] }, playable, st);
  assert.ok(!before.homeOpen());
  assert.equal(before.enter(), null, 'house is closed before E-10');
  const after = new Overworld({ ...save, cleared: ['E-10'] }, playable, st);
  assert.ok(after.homeOpen());
  assert.deepEqual(after.enter(), { play: 'HOME' }, 'enter the house after E-10');
  // 最終コースのクリア（LAST）も出口の数に入る
  const p0 = after.progress();
  const done = new Overworld({ ...save, cleared: ['E-10', 'LAST'] }, playable, st).progress();
  assert.equal(done.done, p0.done + 1);
  console.log('house unlock: ok');
}
{
  // 家の中：古びたドアの前で ↑ を押すと、最終コース 1 へ。1 → 2 → 3 と古びたドアでつながる
  const chain = { HOME: 'LAST-1', 'LAST-1': 'LAST-2', 'LAST-2': 'LAST-3' };
  for (const [id, to] of Object.entries(chain)) {
    const st = get(id);
    assert.ok(st && st.hidden, id);
    const lv = new Level(st.make());
    assert.equal(lv.doorTo, to, `${id} → ${to}`);
    assert.ok([...lv.tiles].includes(TILE.OLD_DOOR) && isDoor(TILE.OLD_DOOR) && isDoor(TILE.OLD_DOOR_TOP), `${id} has the old door`);
    assert.ok(!lv.goal, `${id} has no goal (the door leads on)`);
  }
  const home = new Level(get('HOME').make());
  assert.equal(home.theme, 'house');
  assert.equal(home.title, 'ルミナの家');
  const w = new World(get('HOME').make());
  w.introTimer = 0;
  w.message = null;
  const p = w.player;
  for (let f = 0; f < 300 && p.xpos < 12 * 16 + 4; f++) {
    run(w, 1, () => [PAD.RIGHT]);
    w.message = null;
  }
  run(w, 20, () => [0]);
  run(w, 2, () => [PAD.UP]);
  assert.ok(w.doorEntered, 'enters the old door');
  // 最後の区間はゴールで終わり、クリアの記録は LAST、本当のエンディングの文が出る
  const last = get('LAST-3');
  assert.equal(last.credit, 'LAST');
  assert.equal(last.ending.length, 3);
  const lv3 = new Level(last.make());
  assert.ok(lv3.goal && lv3.autoScroll === 2);
  assert.ok(new Level(get('LAST-2').make()).dark, 'part 2 is dark');
  for (const id of ['LAST-1', 'LAST-2', 'LAST-3']) {
    const lv = new Level(get(id).make());
    for (const s of lv.spawns) {
      assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${id}: ${s.type} at ${s.x / 16},${s.y / 16}`);
      if (s.type === 'ember') assert.equal(lv.tileAtPx(s.x + 8, s.y + 8), TILE.LAVA, `${id}: ember in lava`);
    }
  }
  console.log('old doors: ok');
}
{
  // 敵なしで、どの区間もダメージを受けずに通れる操作の列がある
  for (const id of ['HOME', 'LAST-1', 'LAST-2', 'LAST-3']) {
    const r = findRoute(id, { noDamage: true });
    assert.ok(r.ok, `${id} route (best x ${r.best})`);
  }
  console.log('routes: ok');
}
console.log('final: ok');
