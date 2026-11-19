// オーバーワールド（地図）のテスト: node tests/overworld.test.mjs
import assert from 'node:assert/strict';
import { Overworld, graphOf, loadSave, SAVE_KEY } from '../js/overworld/overworld.js';
import { OW_MAPS, OW_ORDER } from '../js/overworld/maps.js';
import { STAGES } from '../js/stages/index.js';

const playable = STAGES.filter((s) => !s.hidden).map((s) => s.id);
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};
const pad = (hold1 = 0, press1 = 0, press2 = 0) => ({ hold1, press1, hold2: 0, press2 });
const U = 0x08, D = 0x04, L = 0x02, R = 0x01, B = 0x80;
// 歩き終わる（または動けない）まで十字キーを押し続ける
function go(ow, bit) {
  ow.step(pad(bit, bit));
  for (let f = 0; f < 400 && ow.walk; f++) ow.step(pad(bit));
  for (let f = 0; f < 3; f++) ow.step(pad());
}
const finishReveal = (ow) => { for (let f = 0; f < 2000 && ow.reveal.length; f++) ow.step(pad()); };

{
  // 地図の形：全部 16x14、ワールド 1〜8 は 1〜4 とお城、エクストラは 10 ステージ
  assert.deepEqual(OW_ORDER, ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'ex']);
  let stages = 0;
  for (const id of OW_ORDER) {
    const m = OW_MAPS[id];
    assert.equal(m.rows.length, 14, id);
    assert.ok(m.rows.every((r) => r.length === 16), id);
    const g = graphOf(id);
    for (const k of Object.keys(m.nodes)) {
      assert.ok(g.pos[k], `${id}: node ${k} placed`);
      assert.ok(Object.keys(g.edges[k]).length, `${id}: node ${k} connected`);
    }
    stages += Object.values(m.nodes).filter((n) => n.stage).length;
  }
  assert.equal(stages, 8 * 6 + 10, '8-5 + hidden course per world + extra 10');
  // 今あるステージ（1-1〜3-5）は全部地図にある
  const onMap = new Set(Object.values(OW_MAPS).flatMap((m) => Object.values(m.nodes)).map((n) => n.stage));
  for (const id of playable) assert.ok(onMap.has(id), `${id} is on the map`);
  // ボス部屋はお城のクリアになる
  for (const s of STAGES.filter((s) => s.hidden)) assert.equal(s.credit, s.id.replace('B', ''));
}
{
  // はじめ：ルミナの家。道は家と 1-1 の間だけ。1-1 に入れる
  const st = memory();
  const ow = new Overworld(loadSave(st), playable, st);
  assert.equal(ow.mapId, 'w1');
  assert.equal(ow.nodeKey, 'S');
  go(ow, D); // 下には道が無い
  assert.equal(ow.nodeKey, 'S');
  go(ow, R);
  assert.equal(ow.nodeKey, '1');
  go(ow, D); // 1-1 をクリアしていないので、先へは行けない
  assert.equal(ow.nodeKey, '1');
  const r = ow.step(pad(0, B));
  assert.deepEqual(r, { play: '1-1' });
  // クリアすると次の道が少しずつ現れ、現れ終わると進める
  ow.markCleared('1-1', 1);
  assert.ok(ow.reveal.length > 0);
  ow.step(pad(D, D));
  assert.equal(ow.walk, null, 'cannot move while the path appears');
  finishReveal(ow);
  go(ow, D);
  assert.equal(ow.nodeKey, '2');
  // 戻れる（1 から 2 へは下→右に曲がる道なので、帰りは左）
  go(ow, L);
  assert.equal(ow.nodeKey, '1');
  // セーブされている
  const again = new Overworld(loadSave(st), playable, st);
  assert.equal(again.nodeKey, '1');
  assert.deepEqual(again.save.cleared, ['1-1']);
  assert.equal(again.save.power, 1);
  assert.ok(JSON.parse(st.m.get(SAVE_KEY)).cleared.includes('1-1'));
  console.log('walk & unlock: ok');
}
{
  // ワールド 1 を全部クリア → ワールド 2 へのワープ → 2-1 へ
  const st = memory();
  const ow = new Overworld(loadSave(st), playable, st);
  for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5']) ow.markCleared(id, 0);
  finishReveal(ow);
  for (const bit of [R, D, R, D, R, D, D, R]) go(ow, bit);
  assert.equal(ow.nodeKey, 'N');
  const r = ow.step(pad(0, B));
  assert.deepEqual(r, { warp: 'w2', at: 'P' });
  ow.warpTo(r);
  assert.equal(ow.mapId, 'w2');
  assert.equal(ow.nodeKey, 'P');
  go(ow, R);
  assert.equal(ow.nodeKey, '1');
  assert.deepEqual(ow.step(pad(0, B)), { play: '2-1' });
  // 入口から前のワールドに戻れる
  go(ow, L);
  const back = ow.step(pad(0, B));
  assert.deepEqual(back, { warp: 'w1', at: 'N' });
  ow.warpTo(back);
  assert.equal(ow.mapId, 'w1');
  assert.equal(ow.nodeKey, 'N');
  console.log('warp: ok');
}
{
  // まだ作っていないステージ（8-1）：歩いて行けるが、入れず、先の道も開かない
  const st = memory();
  const save = loadSave(st);
  save.cleared = playable.slice();
  save.map = 'w8';
  save.node = 'P';
  const ow = new Overworld(save, playable, st);
  go(ow, R);
  assert.equal(ow.nodeKey, '1');
  assert.ok(ow.isSoon(ow.node()));
  assert.equal(ow.step(pad(0, B)), null);
  go(ow, R);
  assert.equal(ow.nodeKey, '1', 'path beyond is closed');
  // ほしの道の門（8-5 のあと）は、まだ開かない
  const ow8 = new Overworld({ ...save, map: 'w8', node: 'P' }, playable, st);
  const c = Object.values(ow8.graph.chains).find((ch) => [ch.a, ch.b].includes('X'));
  assert.ok(!ow8.isOpenChain(c));
  console.log('soon: ok');
}
{
  // 壊れたセーブは最初から
  const st = memory();
  st.setItem(SAVE_KEY, '{oops');
  assert.deepEqual(loadSave(st), { cleared: [], map: 'w1', node: 'S', power: 0 });
  st.setItem(SAVE_KEY, JSON.stringify({ map: 'w9', node: 'Q' }));
  assert.equal(loadSave(st).map, 'w1');
}
{
  // 隠しコース：ひみつのゴール（'1-3*'）でだけ隠し道が開く。ふつうのゴールでは開かない
  const st = memory();
  const ow = new Overworld(loadSave(st), playable, st);
  for (const id of ['1-1', '1-2', '1-3']) ow.markCleared(id, 0);
  finishReveal(ow);
  for (const bit of [R, D, R, D]) go(ow, bit);
  assert.equal(ow.nodeKey, '3');
  assert.ok(ow.hasSecret(), '1-3 has a secret exit (red dot)');
  go(ow, D);
  assert.equal(ow.nodeKey, '3', 'secret path closed after the normal goal');
  // 1-4・1-5 をクリアしても（お城の側からも）開かない
  ow.markCleared('1-4', 0);
  ow.markCleared('1-5', 0);
  finishReveal(ow);
  const hc = Object.values(ow.graph.chains).filter((c) => c.a === 'H' || c.b === 'H');
  assert.equal(hc.length, 2);
  assert.ok(hc.every((c) => !ow.isOpenChain(c)), 'not opened from the castle side');
  const before = ow.progress();
  ow.markCleared('1-3*', 0);
  assert.ok(ow.reveal.length > 0, 'secret path appears');
  finishReveal(ow);
  assert.equal(ow.progress().done, before.done + 1, 'secret exit counts');
  go(ow, D);
  assert.equal(ow.nodeKey, 'H');
  assert.deepEqual(ow.step(pad(0, B)), { play: '1-S' });
  // 隠しコースのクリアで、お城への近道が開く
  ow.markCleared('1-S', 0);
  finishReveal(ow);
  go(ow, R);
  assert.equal(ow.nodeKey, 'C');
  go(ow, L);
  go(ow, U);
  assert.equal(ow.nodeKey, '3');
  console.log('secret: ok');
}
console.log('overworld: ok');
