// ブロック・アイテム・敵の挙動テスト: node tests/world.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, run, PAD, PAD2 } from './helpers.mjs';
import { GROUND_Y, TILE } from '../js/level.js';
import { GiftBox, Shell, Spiker } from '../js/actors.js';

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

// ---- 頭の判定は足元から 24px 上 (y+8)：ブロック下端との間が 24px あれば頭はぶつからない ----
{
  const w = makeWorld();
  w.level.fill(4, 22, 3, 1, TILE.STONE); // 下端 y=368、地面まで 16px
  w.player.xpos = 100;
  run(w, 10, () => [0]);
  // 頭上に石。ジャンプすると y+8 が 367 に止まる
  w.player.xpos = 5 * 16;
  const log = run(w, 30, (f) => [f >= 1 ? B : 0]);
  const minY = Math.min(...log.map((l) => l.y));
  assert.equal(minY, STAND_Y, 'cannot rise: block bottom is only 16px above the head point');
}

// ---- 頭突き：クルクルブロック（叩くと回転してすり抜けられ、約 4.3 秒で戻る） ----
{
  const w = makeWorld();
  w.level.fill(5, 20, 1, 1, TILE.TURN); // 地面から 3 タイル上
  w.player.xpos = 5 * 16;
  let hitFrame = -1;
  const log = [];
  for (let f = 0; f < 40; f++) {
    log.push(run(w, 1, () => [f >= 1 ? B : 0])[0]);
    if (hitFrame < 0 && w.events.includes('bump')) hitFrame = f;
  }
  assert.ok(hitFrame >= 0, 'bump event');
  // 頭が天井で止まった（頭の判定点 y+8 がブロック下端の 1px 内側まで）
  const minY = Math.min(...log.map((l) => l.y));
  assert.ok(minY + 8 <= 21 * 16 - 1 && minY + 8 >= 21 * 16 - 6, `head stopped at ${minY}`);
  // 跳ね終わると回転を始める（壊れはしない）
  assert.equal(w.level.tileAt(5, 20), TILE.SPIN, 'spinning');
  assert.ok(!w.level.solidPx(5 * 16 + 8, 20 * 16 + 8), 'spinning block is passable');
  // 回っている間にもう一度跳ぶと、すり抜けて上に出られる
  run(w, 30, () => [0]);
  const log2 = run(w, 50, (f) => [f >= 1 ? B : 0]);
  assert.ok(Math.min(...log2.map((l) => l.y)) < 20 * 16 - 0x10, 'jumped through the spinning block');
  // 叩いてから 256 フレームで元に戻る
  run(w, 256 - (40 - hitFrame) - 80 - 2, () => [0]);
  assert.equal(w.level.tileAt(5, 20), TILE.SPIN, 'still spinning just before');
  run(w, 4, () => [0]);
  assert.equal(w.level.tileAt(5, 20), TILE.TURN, 'back to a solid block');
}
// 回転中のブロックはスピンジャンプでも壊れない（すり抜ける）。蹴った甲羅が横から当たっても回る
{
  const w = makeWorld();
  w.level.fill(14, 23, 1, 1, TILE.TURN);
  const sh = new Shell(100, GROUND_Y - 16);
  sh.state = 'kicked';
  sh.xs = 0x2e;
  w.actors.push(sh);
  w.player.xpos = 20;
  for (let i = 0; i < 60 && sh.xs > 0; i++) run(w, 1, () => [0]);
  assert.ok(sh.xs < 0, 'shell rebounded off the turn block');
  run(w, 10, () => [0]);
  assert.equal(w.level.tileAt(14, 23), TILE.SPIN, 'shell made it spin');
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
  // 何も押さずに Y を離しても投げる（SMW の甲羅と同じ）
  const { w, g } = setupGift();
  run(w, 40, () => [R | Y]);
  run(w, 60, () => [Y]); // 止まる
  assert.equal(w.player.xspeed, 0);
  run(w, 1, () => [0]);
  assert.equal(g.state, 'kicked', 'thrown without direction');
  assert.equal(g.xs, 0x2e, 'thrown forward at shell speed');
}
{
  // 持ったまま ↓ でしゃがむ。箱は足元で抱える
  const { w, g } = setupGift();
  run(w, 40, () => [R | Y]);
  run(w, 60, () => [Y]);
  run(w, 3, () => [Y | PAD.DOWN]);
  const p = w.player;
  assert.ok(p.ducking, 'ducking while carrying');
  assert.equal(p.pose, 0x1d, 'duck-carry pose');
  assert.equal(g.y, p.ypos + 15, 'box held low (SMW +15)');
  // ↓ を押しながら Y を離すとそっと置く（その場に残る）
  run(w, 1, () => [PAD.DOWN]);
  assert.equal(g.state, 'idle', 'placed');
  run(w, 60, () => [0]);
  assert.ok(!g.dead, 'placed box stays');
  assert.equal(g.y, GROUND_Y - 16);
  assert.ok(Math.abs(g.xs) <= 1, 'resting');
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
  assert.ok(p.hurtTimer > 0 || w.events.includes('shrink'), 'hurt');
}
{
  // 横から触れてもダメージ
  const w = makeWorld();
  const e = new Spiker(120, GROUND_Y - 16);
  w.actors.push(e);
  w.player.xpos = 90;
  run(w, 60, () => [R]);
  assert.ok(w.events.includes('shrink'), 'hurt from the side');
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
// ---- 甲羅 ----
{
  // 蹴ると滑り、壁で跳ね返る（砕けない）
  const w = makeWorld();
  w.level.fill(14, 21, 1, 3, TILE.STONE);
  const sh = new Shell(100, GROUND_Y - 16);
  w.actors.push(sh);
  w.player.xpos = 70;
  let i = 0;
  while (sh.state !== 'kicked' && i++ < 60) run(w, 1, () => [R]);
  assert.equal(sh.state, 'kicked', 'kicked by touching');
  assert.ok(sh.xs > 0);
  run(w, 1, () => [0]);
  w.player.xpos = 20; // 戻ってくる甲羅に当たらないよう離れる
  let rebounded = false;
  for (let f = 0; f < 120 && !rebounded; f++) {
    run(w, 1, () => [0]);
    if (sh.xs < 0) rebounded = true;
  }
  assert.ok(rebounded, 'rebounded off the wall');
  assert.ok(!sh.dead, 'shell survives the wall');
  assert.equal(sh.xs, -0x2e, 'same speed after rebound');
}
{
  // 蹴られた甲羅に横から当たるとダメージ
  const w = makeWorld();
  const sh = new Shell(200, GROUND_Y - 16);
  sh.state = 'kicked';
  sh.xs = -0x2e;
  w.actors.push(sh);
  w.player.xpos = 100;
  // 歩きながら当たっても、ノックバックせずそのまま進む（SMW にノックバックは無い）
  let hurtAt = -1;
  for (let f = 0; f < 60 && hurtAt < 0; f++) {
    run(w, 1, () => [R]);
    if (w.events.includes('shrink')) hurtAt = f;
  }
  assert.ok(hurtAt >= 0, 'hurt by moving shell');
  const p = w.player;
  // 縮む演出の間（47 フレーム）はゲームが止まり、終わると無敵になる
  assert.equal(p.state, 1, 'power down animation');
  const xs0 = p.xpos;
  run(w, 48, () => [R]);
  assert.equal(p.xpos, xs0, 'frozen while shrinking');
  assert.equal(p.powerUp, 0, 'became small');
  assert.equal(p.state, 0);
  assert.ok(p.hurtTimer > 0, 'invincible after hurt');
  assert.ok(((p.xspeed << 24) >> 24) > 0, 'keeps walking forward (no knockback)');
  assert.equal(p.inAir, 0, 'not knocked into the air');
}
{
  // 蹴られた甲羅を上から踏むと止まり、ルミナは跳ねる
  const w = makeWorld();
  const sh = new Shell(150, GROUND_Y - 16);
  sh.state = 'kicked';
  sh.xs = -0x2e;
  w.actors.push(sh);
  const p = w.player;
  p.xpos = 120;
  p.ypos = GROUND_Y - 0x20 - 30;
  p.inAir = 0x24;
  p.yspeed = 0x20;
  let bounced = false;
  for (let f = 0; f < 30 && !bounced; f++) {
    const l = run(w, 1, () => [0])[0];
    if (l.ys <= -40) bounced = true;
  }
  assert.ok(bounced, 'player bounced');
  assert.equal(sh.state, 'idle', 'shell stopped being kicked');
  // 横に逃げて、甲羅が止まるのを見る（真下に落ちるとまた蹴ってしまう）
  run(w, 20, () => [L]);
  assert.equal(sh.xs, 0, 'shell came to rest');
  assert.equal(p.hurtTimer, 0);
}
{
  // スピンジャンプで踏むと甲羅は消える
  const w = makeWorld();
  const sh = new Shell(150, GROUND_Y - 16);
  w.actors.push(sh);
  const p = w.player;
  p.xpos = 148;
  p.ypos = GROUND_Y - 0x20 - 30;
  p.inAir = 0x24;
  p.spin = 1;
  p.yspeed = 0x20;
  run(w, 20, () => [0]);
  assert.ok(sh.dead, 'spin-killed');
}
{
  // 持って投げると蹴られた甲羅になり、敵を倒す
  const w = makeWorld();
  const sh = new Shell(100, GROUND_Y - 16);
  w.actors.push(sh);
  const e = new Spiker(260, GROUND_Y - 16);
  w.actors.push(e);
  w.player.xpos = 70;
  for (let i = 0; i < 60 && sh.state !== 'carried'; i++) run(w, 1, () => [R | Y]);
  assert.equal(sh.state, 'carried');
  run(w, 1, () => [R]);
  assert.equal(sh.state, 'kicked');
  run(w, 60, () => [0]);
  assert.ok(e.dying || e.dead, 'enemy killed by shell');
}

// 出現・再出現
{
  const w = makeWorld({ flat: false, spawns: true });
  run(w, 2);
  assert.ok(w.actors.some((a) => a.type === 'gift'), 'gift spawned near start');
}

console.log('world: ok');
{
  // 置いた甲羅 (status 9)：空中にある間は敵を倒し、床の上では敵が向きを変えるだけ (01A4BA)
  const w = makeWorld();
  const sh = new Shell(160, GROUND_Y - 16 - 40);
  w.actors.push(sh);
  const e = new Spiker(160, GROUND_Y - 16);
  w.actors.push(e);
  w.player.xpos = 40;
  run(w, 30, () => [0]);
  assert.ok(e.dying || e.dead, 'shell falling from above kills');
  const w2 = makeWorld();
  const sh2 = new Shell(160, GROUND_Y - 16);
  sh2.xs = 4;
  w2.actors.push(sh2);
  const e2 = new Spiker(180, GROUND_Y - 16);
  e2.facing = 0;
  w2.actors.push(e2);
  w2.player.xpos = 40;
  run(w2, 30, () => [0]);
  assert.ok(!e2.dying && !e2.dead, 'shell on the floor does not kill');
  assert.equal(e2.facing, 1, 'enemy turned away');
  console.log('placed shell: ok');
}
