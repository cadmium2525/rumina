// チビルミナ・パワーアップ・ミス・天井の坂のテスト
import assert from 'node:assert';
import { makeWorld, run, PAD, PAD2 } from './helpers.mjs';
import { GROUND_Y, TILE, SLOPE_K } from '../js/level.js';
import { Spiker } from '../js/actors.js';
import { STATE } from '../js/player.js';

const { B, Y } = PAD;
const R = PAD.RIGHT, L = PAD.LEFT;

{
  // 新しいゲームは小さい状態で始まる
  const w = makeWorld({ flat: false, power: 0 });
  assert.equal(w.player.powerUp, 0);
  assert.equal(w.player.hitbox.y, w.player.ypos + 0x14, 'small hitbox');
}
{
  // ？ブロックを下から叩くと光の玉が出て、取ると大きくなる
  const w = makeWorld({ power: 0 });
  const lv = w.level;
  lv.question(6, 21, 'light'); // 地面の 3 段上（頭がちょうど届く）
  const p = w.player;
  p.xpos = 6 * 16;
  run(w, 30, (f) => [f < 10 ? B : 0]);
  assert.equal(lv.tileAt(6, 21), TILE.USED, 'block used');
  const m = w.actors.find((a) => a.type === 'light');
  assert.ok(m, 'light orb spawned');
  // 光の玉は右へ歩き、ブロックから落ちる。走って追いかけて取る
  run(w, 90, () => [0]);
  assert.ok(m.x > 7 * 16 && m.y === GROUND_Y - 16, `light orb walked off the block ${m.x},${m.y}`);
  let grewAt = -1;
  for (let f = 0; f < 300 && grewAt < 0; f++) {
    run(w, 1, () => [R | Y]);
    if (p.state === STATE.GROW) grewAt = f;
  }
  assert.ok(grewAt >= 0, 'touched light orb');
  assert.ok(w.events.includes('grow'));
  const x0 = p.xpos;
  run(w, 47, () => [R]);
  assert.equal(p.xpos, x0, 'game frozen while growing');
  assert.equal(p.powerUp, 0, 'still small during animation');
  run(w, 1, () => [R]);
  assert.equal(p.powerUp, 1, 'grew');
  assert.equal(p.state, STATE.NORMAL);
  assert.equal(p.hurtTimer, 0, 'no invincibility after growing');
}
{
  // 叩いた後のブロックはもう何も出ない
  const w = makeWorld({ power: 0 });
  w.level.question(6, 21, 'light');
  w.player.xpos = 6 * 16;
  run(w, 30, (f) => [f < 10 ? B : 0]);
  run(w, 30, (f) => [f < 10 ? B : 0]);
  assert.equal(w.actors.filter((a) => a.type === 'light').length, 1);
}
{
  // 小さい状態でダメージを受けるとミス：跳ね上がって落ち、終わるとやり直し
  const w = makeWorld({ power: 0 });
  const e = new Spiker(120, GROUND_Y - 16);
  w.actors.push(e);
  const p = w.player;
  p.xpos = 90;
  let diedAt = -1;
  for (let f = 0; f < 60 && diedAt < 0; f++) {
    run(w, 1, () => [R]);
    if (p.state === STATE.DEATH) diedAt = f;
  }
  assert.ok(diedAt >= 0, 'died');
  assert.equal(p.yspeed, 0x90, 'death jump -112');
  const y0 = p.ypos;
  const ex = e.x;
  const log = run(w, 40, () => [R]);
  assert.ok(log.every((l) => l.y === y0), 'frozen in the air first (0x30-0x26 steps of 4 frames)');
  assert.equal(e.x, ex, 'enemies frozen');
  const log2 = run(w, 100, () => [0]);
  assert.ok(Math.min(...log2.map((l) => l.y)) < y0 - 40, 'jumps up');
  assert.ok(log2.at(-1).y > y0, 'then falls through the floor');
  assert.equal(p.pose, 0x3e, 'death pose');
  run(w, 200, () => [0]);
  assert.equal(p.dead, 1, 'restart requested');
}
{
  // 穴に落ちるとミス
  const w = makeWorld({ power: 1 });
  w.level.fill(10, 24, 3, 3, TILE.EMPTY);
  const p = w.player;
  p.xpos = 9 * 16;
  let died = false;
  for (let f = 0; f < 200 && !died; f++) {
    run(w, 1, () => [R]);
    died = p.state === STATE.DEATH;
  }
  assert.ok(died, 'pit fall');
  assert.ok(p.ypos - w.camera.y >= 256);
  run(w, 1, () => [0]);
  assert.equal(p.powerUp, 0, 'PlayerState09 makes her small');
}
{
  // 大きい状態は低いすき間（地面の上 16px の天井）に入れない。小さいと入れる
  for (const power of [1, 0]) {
    const w = makeWorld({ power });
    w.level.fill(10, 22, 6, 1, TILE.STONE);
    const p = w.player;
    p.xpos = 7 * 16;
    run(w, 120, () => [R]);
    if (power) assert.ok(p.xpos < 10 * 16, `big blocked at ${p.xpos}`);
    else assert.ok(p.xpos > 13 * 16, `small passes ${p.xpos}`);
  }
}
{
  // 小さい状態のスピンジャンプではターンブロックは壊れない
  const w = makeWorld({ power: 0 });
  w.level.set(8, 23, TILE.TURN);
  const p = w.player;
  p.xpos = 8 * 16;
  p.ypos = GROUND_Y - 16 - 0x20 - 40;
  p.inAir = 0x24;
  p.spin = 1;
  run(w, 40, () => [0]);
  assert.equal(w.level.tileAt(8, 23), TILE.TURN, 'not broken');
  assert.equal(p.ypos, GROUND_Y - 16 - 0x20, 'stands on it');
}
{
  // 小さい状態の歩きは 2 コマ（大きいと 3 コマ）
  for (const [power, n] of [[0, 2], [1, 3]]) {
    const w = makeWorld({ power });
    const poses = new Set(run(w, 120, () => [R]).slice(20).map((l) => l.pose));
    assert.equal(poses.size, n, `power ${power} walk frames ${[...poses]}`);
  }
}
{
  // 天井の坂：45°。頭が坂の固い所に入らない
  for (const power of [1, 0]) {
    const w = makeWorld({ power });
    const lv = w.level;
    lv.fill(10, 18, 4, 1, TILE.STONE);
    lv.slope(10, 19, SLOPE_K.CEIL_DOWN_45);
    lv.fill(11, 19, 3, 1, TILE.STONE);
    const p = w.player;
    const head = power ? 8 : 0x10;
    for (const xin of [0, 4, 8, 12]) {
      p.xpos = 10 * 16 + xin - 8; // 頭の点 (x+8) が坂の中の xin
      p.ypos = GROUND_Y - 0x20;
      p.inAir = 0;
      p.yspeed = 0;
      const log = run(w, 50, (f) => [f < 30 ? B : 0]);
      const top = Math.min(...log.map((l) => l.y)) + head;
      // x=xin の列は上から xin+1 ドットが固い。SMW の押し戻し (~v15) は、ふつうのブロックと同じく
      // 頭の点を固い部分の一番下のドットに残す
      assert.equal(top, 19 * 16 + xin, `power ${power} xin ${xin}: head top ${top}`);
      assert.ok(Math.min(...log.map((l) => l.ys)) < 0);
      run(w, 60, () => [0]);
    }
  }
}
{
  // 天井の坂：ゆるい坂の下の地面を歩ける。頭が当たると頭打ち（上昇が止まる）
  const w = makeWorld({ power: 1 });
  const lv = w.level;
  lv.fill(10, 20, 6, 1, TILE.STONE);
  lv.slope(10, 21, SLOPE_K.CEIL_DOWN_G1);
  lv.slope(11, 21, SLOPE_K.CEIL_DOWN_G2);
  lv.fill(12, 21, 2, 1, TILE.STONE);
  lv.slope(14, 21, SLOPE_K.CEIL_UP_G1);
  lv.slope(15, 21, SLOPE_K.CEIL_UP_G2);
  const p = w.player;
  p.xpos = 6 * 16;
  run(w, 200, () => [R]);
  assert.ok(p.xpos > 17 * 16, 'walked under it');
  // 真ん中で跳ぶ：天井の下端 352 で止まる
  p.xpos = 12 * 16;
  run(w, 30, () => [0]);
  const log = run(w, 40, (f) => [f < 20 ? B : 0]);
  assert.equal(Math.min(...log.map((l) => l.y)) + 8, 351, 'head stops at ceiling');
}
{
  // ステージ：天井の坂と ？ブロックが置いてある
  const w = makeWorld({ flat: false });
  assert.equal(w.level.tileAt(150, 19), TILE.SLOPE + SLOPE_K.CEIL_DOWN_45);
  assert.equal(w.level.tileAt(8, 20), TILE.QUESTION);
  assert.equal(w.level.tileAt(185, 25), TILE.EMPTY, 'pit');
}
console.log('power: ok');
