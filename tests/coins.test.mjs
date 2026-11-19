// グレイコインのテスト: node tests/coins.test.mjs
import assert from 'node:assert/strict';
import { run, makeWorld } from './helpers.mjs';
import { Level } from '../js/level.js';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { OW_MAPS } from '../js/overworld/maps.js';
import { Overworld, loadSave, SAVE_KEY } from '../js/overworld/overworld.js';

const get = (id) => STAGES.find((s) => s.id === id);
const coinsOf = (st) => (st.make().spawns ?? []).filter((s) => s.type === 'graycoin');
{
  // 地図にある全ステージ（お城はお城のステージ、最終コースは 2 区間目）に 1 枚ずつ
  const ids = new Set();
  for (const m of Object.values(OW_MAPS)) {
    for (const n of Object.values(m.nodes)) {
      if (n.stage && get(n.stage)) ids.add(n.stage);
      if (n.home) ids.add('LAST-2');
    }
  }
  assert.equal(ids.size, 8 * 6 + 10 + 1, 'all stages on the map + the final course');
  for (const id of ids) {
    const c = coinsOf(get(id));
    assert.equal(c.length, 1, `${id} has one gray coin`);
    const lv = new Level(get(id).make());
    assert.ok(!lv.solidPx(c[0].tx * 16 + 8, c[0].ty * 16 + 8), `${id}: coin is not in a block`);
  }
  // ほかのステージ（ボス部屋・扉の先の部屋・家・最終コースの 1・3 区間目）には無い
  for (const st of STAGES) if (!ids.has(st.id)) assert.equal(coinsOf(st).length, 0, `${st.id} has no coin`);
  // 記録の id はクリアと同じ（最終コースは LAST）
  assert.equal(get('LAST-2').credit, 'LAST');
  console.log(`coins on the map: ${ids.size}: ok`);
}
{
  // 触れると取れる。出たり消えたりしない。ゴールしても取った記録は残る
  const w = makeWorld();
  w.level.spawns.push({ type: 'graycoin', x: 20 * 16, y: 22 * 16 });
  const lv = w.level;
  const w2 = new World({ ...lv.toData() });
  w2.introTimer = 0;
  w2.points = [];
  const coin = w2.grayCoin;
  assert.ok(coin && w2.actors.includes(coin));
  assert.ok(!w2.points.some((p) => p.type === 'graycoin'), 'coin is not a respawning spawn point');
  const p = w2.player;
  p.powerUp = 1;
  p.xpos = 20 * 16;
  p.ypos = 24 * 16 - 32;
  run(w2, 2, () => [0]);
  assert.ok(w2.coinTaken && coin.dead, 'taken');
  w2.reachGoal();
  assert.ok(w2.coinTaken, 'still taken after the goal');
  console.log('coin pickup: ok');
}
{
  // セーブ：coins に記録。前のセーブ（coins が無い）も読める
  const m = new Map();
  const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  m.set(SAVE_KEY, JSON.stringify({ cleared: ['1-1'], map: 'w1', node: '1', power: 1 }));
  const save = loadSave(st);
  assert.deepEqual(save.coins, []);
  const ow = new Overworld(save, STAGES.filter((s) => !s.hidden).map((s) => s.id), st);
  assert.ok(!ow.hasCoin('1-1'));
  ow.markCoin('1-1');
  ow.markCoin('1-1');
  assert.ok(ow.hasCoin('1-1'));
  assert.deepEqual(loadSave(st).coins, ['1-1']);
  console.log('coin save: ok');
}
console.log('coins: ok');
