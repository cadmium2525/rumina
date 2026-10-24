// ゴールのテスト: node tests/goal.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, run, PAD } from './helpers.mjs';
import { GROUND_Y, Level } from '../js/level.js';
import { Goal, Spiker } from '../js/actors.js';
import { World } from '../js/world.js';

const R = PAD.RIGHT, B = PAD.B;
function goalWorld(power = 1) {
  const w = makeWorld({ power });
  w.goal = new Goal(20, GROUND_Y / 16 - 1);
  w.actors.push(w.goal);
  return w;
}
{
  // 柱の間を通るとゴール。ボタンが効かなくなり、右へ少し歩いて止まり、勝利ポーズ
  const w = goalWorld();
  const e = new Spiker(26 * 16, GROUND_Y - 16);
  w.actors.push(e);
  const p = w.player;
  p.xpos = 15 * 16;
  let at = -1;
  for (let f = 0; f < 200 && at < 0; f++) {
    run(w, 1, () => [R]);
    if (p.endTimer) at = f;
  }
  assert.ok(at >= 0, 'goal reached');
  assert.ok(w.events.includes('goal'));
  assert.ok(e.dead, 'enemies vanish');
  const x0 = p.xpos;
  // 左を押しても、ジャンプしても効かない
  const log = run(w, 300, (f) => [PAD.LEFT | (f & 1 ? B : 0)]);
  assert.ok(log.every((l) => l.air === 0), 'no jump');
  assert.ok(p.xpos > x0, 'walks right by itself');
  // 歩かされる間 xspeed は毎フレーム 5 に戻され、そこに加速が入る（6〜7）
  assert.ok(log.slice(10, 200).every((l) => l.xs >= 5 && l.xs <= 7), 'slow walk');
  let n = 0;
  while (!p.victory && n++ < 1000) run(w, 1, () => [0]);
  assert.ok(p.victory, 'victory pose');
  assert.equal(p.xspeed, 0);
  run(w, 1, () => [0]);
  assert.equal(p.pose, 0x26);
  assert.ok(!w.cleared);
  run(w, 64, () => [0]);
  assert.ok(w.cleared, 'course clear');
  console.log('goal walk: ok');
}
{
  // ゴールした後はダメージを受けない
  const w = goalWorld();
  w.player.xpos = 20 * 16 - 6; // 判定はテープの x-8 〜 x+8
  run(w, 2, () => [R]);
  assert.ok(w.player.endTimer);
  assert.equal(w.player.hurt(), false);
}
{
  // ゲートの上を飛び越えると……SMW と同じく、高さに関係なくテープの一番下より上ならゴール
  const w = goalWorld();
  const g = w.goal;
  assert.equal(g.base, GROUND_Y - 24);
  // テープは最初に上へ動く
  run(w, 10, () => [0]);
  assert.ok(g.y < g.base, 'tape moves up first');
}
{
  // テープに触れると切れて飛ぶ
  const w = goalWorld();
  const g = w.goal;
  g.y = GROUND_Y - 20; // ルミナの体の高さ
  g.timer = 100;
  g.dir = 0; // 下向き → 下で止める
  w.player.xpos = 17 * 16;
  for (let f = 0; f < 120 && !g.done; f++) {
    g.y = GROUND_Y - 20;
    run(w, 1, () => [R]);
  }
  assert.ok(g.cut, 'tape cut');
  assert.ok(w.events.includes('tape'));
}
{
  // 標準ステージとデータにゴールがある
  const lv = new Level();
  assert.ok(lv.goal);
  const w = new World(lv.toData());
  assert.ok(w.goal && w.actors.includes(w.goal));
  const d = lv.toData();
  d.goal = null;
  assert.equal(new World(d).goal, null);
}
console.log('goal: ok');
