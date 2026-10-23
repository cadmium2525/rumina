// ブロック・アイテム・敵の挙動テスト: node tests/world.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, run, PAD, PAD2 } from './helpers.mjs';
import { GROUND_Y, TILE } from '../js/level.js';
import { GiftBox, Spiker } from '../js/actors.js';

const R = PAD.RIGHT, L = PAD.LEFT, Y = PAD.Y, B = PAD.B, U = PAD.UP;
const STAND_Y = GROUND_Y - 0x20;

// ---- 壁・段差 ----
{
  const w = makeWorld();
  w.level.fill(10, 23, 2, 1, TILE.STONE); // 高さ 1 タイルの段
  w.player.xpos = 100;
  run(w, 100, () => [R]);
  // 段（x=160）の手前で止まる：右の判定点(x+0xE)が段の最初のピクセルに触れる位置
  assert.equal(w.player.xpos, 160 - 0xe, 'blocked by 1-tile step');
  assert.ok(w.player.xspeed <= 3, 'pressing into the wall keeps speed tiny');
  // ジャンプで乗れる
  const log = run(w, 80, (f) => [R | (f < 12 ? B : 0)]);
  assert.ok(log.some((l) => l.y === 23 * 16 - 0x20 && l.x > 160 - 0xe), 'climbs on step and stands on it');
}

// ---- 頭突き：ターンブロックは跳ねるだけで壊れない ----
{
  const w = makeWorld();
  w.level.fill(5, 20, 1, 1, TILE.TURN); // 地面から 3 タイル上
  w.player.xpos = 5 * 16;
  const log = run(w, 40, (f) => [f >= 1 ? B : 0]);
  assert.equal(w.level.tileAt(5, 20), TILE.TURN, 'still there');
  assert.ok(w.events.includes('bump'), 'bump event');
  // 頭が天井で止まった（頭の判定点 y+3 がブロック下端の中）
  const minY = Math.min(...log.map((l) => l.y));
  assert.ok(minY + 3 <= 21 * 16 - 1 && minY + 3 >= 21 * 16 - 8, `head stopped at ${minY}`);
}

// ---- スピンジャンプでターンブロックの柱を壊しながら落ちる ----
{
  const w = makeWorld();
  w.level.fill(8, 21, 1, 3, TILE.TURN);
  const p = w.player;
  p.xpos = 8 * 16;
  p.ypos = 21 * 16 - 0x20 - 60; // 柱の上空
  p.inAir = 0x24;
  p.spin = 1;
  p.yspeed = 0;
  run(w, 150);
  assert.equal(w.level.tileAt(8, 21), TILE.EMPTY, 'top broken');
  assert.equal(w.level.tileAt(8, 22), TILE.EMPTY, 'middle broken');
  assert.equal(w.level.tileAt(8, 23), TILE.EMPTY, 'bottom broken');
  assert.equal(p.ypos, STAND_Y, 'fell to the ground');
  assert.ok(w.events.filter((e) => e === 'break').length === 3);
  assert.ok(w.effects.length >= 0);
}
// 壊した反動で跳ね返る。ジャンプボタンを押していると重力が弱いので高く跳ぶ
{
  const apex = (hold) => {
    const w = makeWorld();
    w.level.fill(8, 21, 1, 1, TILE.TURN);
    const p = w.player;
    p.xpos = 8 * 16;
    p.ypos = 21 * 16 - 0x20 - 40;
    p.inAir = 0x24;
    p.spin = 1;
    p.yspeed = 0;
    let broke = false;
    let top = Infinity;
    let y0 = null;
    for (let f = 0; f < 80; f++) {
      const l = run(w, 1, () => [hold ? B : 0])[0];
      if (!broke && w.events.includes('break')) { broke = true; y0 = l.y; }
      if (broke) top = Math.min(top, l.y);
    }
    assert.ok(broke, 'broke');
    return y0 - top;
  };
  const low = apex(false);
  const high = apex(true);
  console.log('break bounce height', low, high);
  assert.ok(low >= 8 && low <= 16, `small bounce ${low}`);
  assert.ok(high > low + 6, `higher with jump button ${high}`);
}
// スピンジャンプでなければ着地して壊れない
{
  const w = makeWorld();
  w.level.fill(8, 21, 1, 3, TILE.TURN);
  const p = w.player;
  p.xpos = 8 * 16;
  p.ypos = 21 * 16 - 0x20 - 60;
  p.inAir = 0x24;
  run(w, 60);
  assert.equal(w.level.tileAt(8, 21), TILE.TURN, 'normal landing does not break');
  assert.equal(p.ypos, 21 * 16 - 0x20, 'stands on top');
}
// 立ったままスピンしても（上昇中は）壊れない
{
  const w = makeWorld();
  w.level.fill(8, 21, 1, 3, TILE.TURN);
  const p = w.player;
  p.xpos = 8 * 16;
  p.ypos = 21 * 16 - 0x20;
  run(w, 1); // 乗る
  run(w, 90, (f) => [f >= 1 ? B : 0, f >= 1 ? PAD2.A : 0]);
  assert.equal(w.level.tileAt(8, 21), TILE.EMPTY, 'spin jump from top breaks it on the way down');
}

// ---- アイテムを持つ・投げる・置く ----
function setupGift() {
  const w = makeWorld();
  const g = new GiftBox(100, GROUND_Y - 16);
  w.actors.push(g);
  w.player.xpos = 70;
  return { w, g };
}
{
  const { w, g } = setupGift();
  // Y を押しながら近づくと持ち上げる
  run(w, 40, () => [R | Y]);
  assert.equal(g.state, 'carried');
  assert.equal(w.player.carrying, g);
  assert.ok(w.events.includes('grab'));
  // 持っている間は右前にある
  const p = w.player;
  assert.equal(g.x, p.xpos + 11);
  // 持っているとスピンジャンプできない
  run(w, 3, () => [Y | B, PAD2.A]);
  assert.equal(p.spin, 0, 'no spin while carrying');
  run(w, 80, () => [Y]);
  // Y を離して右を押すと投げる
  const before = p.xpos;
  run(w, 1, () => [R]);
  assert.equal(g.state, 'kicked');
  assert.equal(p.carrying, null);
  assert.ok(g.xs >= 0x2e, `thrown speed ${g.xs}`);
  assert.equal(p.kickPoseTimer > 0, true);
  // 壁にぶつかって砕ける
  w.level.fill(Math.floor(g.x / 16) + 4, 21, 1, 3, TILE.STONE);
  for (let i = 0; i < 200 && !g.dead; i++) run(w, 1, () => [0]);
  assert.ok(g.dead, 'shattered at wall');
  assert.ok(w.events.includes('shatter'));
  assert.ok(w.effects.some((e) => e.kind === 'piece'));
}
{
  // 何も押さずに Y を離すとそっと置く（その場に残る）
  const { w, g } = setupGift();
  run(w, 40, () => [R | Y]);
  run(w, 5, () => [Y]);
  run(w, 1, () => [0]);
  assert.equal(g.state, 'idle');
  run(w, 60, () => [0]);
  assert.ok(!g.dead, 'placed box stays');
  assert.equal(g.y, GROUND_Y - 16);
}
{
  // ↑ を押しながら離すと真上に投げる
  const { w, g } = setupGift();
  run(w, 40, () => [R | Y]);
  run(w, 5, () => [Y]);
  run(w, 1, () => [U]);
  assert.equal(g.state, 'idle');
  assert.ok(g.ys < 0, 'thrown upward');
  run(w, 120, () => [0]);
  assert.ok(!g.dead);
}
{
  // Y を押さずに触ると蹴り飛ばす
  const { w, g } = setupGift();
  run(w, 40, () => [R]);
  assert.equal(g.state === 'kicked' || g.dead, true);
}
{
  // 持ち物は、向きを変えると一瞬正面を向く
  const { w, g } = setupGift();
  run(w, 40, () => [R | Y]);
  run(w, 2, () => [L | Y]);
  assert.ok(w.player.facePoseTimer > 0);
  assert.equal(w.player.pose, 0x0f);
}

// ---- 敵 ----
{
  // スピンジャンプで上から踏むと跳ね返る（敵は倒れない）
  const w = makeWorld();
  const e = new Spiker(150, GROUND_Y - 16);
  e.facing = 0;
  w.actors.push(e);
  const p = w.player;
  p.xpos = 144 - 0;
  p.ypos = GROUND_Y - 0x20 - 50;
  p.inAir = 0x24;
  p.spin = 1;
  p.yspeed = 0x10;
  let bounced = false;
  run(w, 40, () => [0]).forEach((l) => { if (l.ys < -40) bounced = true; });
  assert.ok(bounced, 'bounced off');
  assert.ok(w.events.includes('bounce'));
  assert.equal(p.hurtTimer, 0, 'not hurt');
  assert.ok(!e.dead && !e.dying, 'enemy survives');
}
{
  // B を押していると高く跳ねる
  const w = makeWorld();
  const e = new Spiker(150, GROUND_Y - 16);
  e.facing = 0;
  w.actors.push(e);
  const p = w.player;
  p.xpos = 144;
  p.ypos = GROUND_Y - 0x20 - 50;
  p.inAir = 0x24;
  p.spin = 1;
  p.yspeed = 0x10;
  const log = run(w, 40, () => [B]);
  assert.ok(Math.min(...log.map((l) => l.ys)) <= -0x50, 'high bounce');
}
{
  // スピンなしで踏むとダメージ
  const w = makeWorld();
  const e = new Spiker(150, GROUND_Y - 16);
  w.actors.push(e);
  const p = w.player;
  p.xpos = 144;
  p.ypos = GROUND_Y - 0x20 - 50;
  p.inAir = 0x24;
  p.yspeed = 0x10;
  run(w, 40, () => [0]);
  assert.ok(p.hurtTimer > 0 || w.events.includes('hurt'), 'hurt');
}
{
  // 横から触れてもダメージ
  const w = makeWorld();
  const e = new Spiker(120, GROUND_Y - 16);
  w.actors.push(e);
  w.player.xpos = 90;
  run(w, 60, () => [R]);
  assert.ok(w.events.includes('hurt'), 'hurt from the side');
}
{
  // 飛んできたブロックで倒される
  const w = makeWorld();
  const e = new Spiker(200, GROUND_Y - 16);
  w.actors.push(e);
  const g = new GiftBox(100, GROUND_Y - 16);
  g.state = 'kicked';
  g.xs = 0x2e;
  w.actors.push(g);
  w.player.xpos = 20;
  run(w, 60, () => [0]);
  assert.ok(e.dying || e.dead, 'killed by thrown box');
}
// 敵は壁で向きを変える
{
  const w = makeWorld();
  w.level.fill(5, 23, 1, 1, TILE.STONE);
  const e = new Spiker(5 * 16 + 20, GROUND_Y - 16);
  e.facing = 0;
  w.actors.push(e);
  w.player.xpos = 400;
  run(w, 120);
  assert.equal(e.facing, 1, 'turned around');
}
// 出現・再出現
{
  const w = makeWorld({ flat: false, spawns: true });
  run(w, 2);
  assert.ok(w.actors.some((a) => a.type === 'gift'), 'gift spawned near start');
}

console.log('world: ok');
