// 坂・水中・ツタのテスト: node tests/terrain.test.mjs
import assert from 'node:assert/strict';
import { makeWorld, run, PAD, PAD2 } from './helpers.mjs';
import { GROUND_Y, TILE, SLOPE_K } from '../js/level.js';

const R = PAD.RIGHT, L = PAD.LEFT, Y = PAD.Y, B = PAD.B, U = PAD.UP, D = PAD.DOWN;
const STAND_Y = GROUND_Y - 0x20;
const s8 = (v) => ((v & 0xff) << 24) >> 24;

function place(w, x, y) {
  const p = w.player;
  p.xpos = x;
  p.ypos = y;
  w.camera.x = Math.max(0, x - 0x80);
}

// ---- 坂 ----
{
  // 小さな丘を歩いて越える：頂上 (タイル 88〜91, 上端 y=352) を歩き、反対側の地面に下りる
  const w = makeWorld({ flat: false });
  place(w, 82 * 16, STAND_Y);
  const log = run(w, 260, () => [R]);
  const onTop = log.filter((l) => l.x + 8 >= 88 * 16 && l.x + 8 < 92 * 16);
  assert.ok(onTop.length > 0, 'walked over the hill top');
  assert.ok(onTop.every((l) => l.y === 352 - 0x20), `stands on the hill top ${[...new Set(onTop.map((l) => l.y))]}`);
  // 坂の途中では足が坂の表面にある（ゆるい坂：2 タイルで 16px 上がる）
  const mid = log.find((l) => l.x + 8 === 86 * 16);
  assert.ok(mid && mid.y + 0x20 === 23 * 16 + 7, `gentle slope surface ${mid && mid.y + 0x20}`);
  assert.ok(log.every((l) => l.y <= STAND_Y), 'never sinks below the ground');
  assert.ok(log.every((l) => !l.air || l.y < STAND_Y), 'stays on the ground while walking');
  const after = log.filter((l) => l.x + 8 >= 95 * 16 + 4 && l.x + 8 < 98 * 16);
  assert.ok(after.length > 0 && after.every((l) => l.y === STAND_Y), 'back on the ground after the hill');
  // 坂を登り切る所で横から引っかからない（速度が落ちない）
  const climb = log.filter((l) => l.x + 8 >= 86 * 16 && l.x + 8 < 89 * 16);
  assert.ok(climb.every((l) => l.xs >= 12), `no wall bump at the top of the slope ${Math.min(...climb.map((l) => l.xs))}`);
}
{
  // 45°の坂に何も押さずに立つと、ゆっくり滑り落ちる（静止速度 -16）
  const w = makeWorld({ flat: false });
  place(w, 100 * 16 - 8, 21 * 16 - 0x20); // 大きな丘の右上がり斜面
  run(w, 2);
  const x0 = w.player.xpos;
  const log = run(w, 60, () => [0]);
  assert.ok(w.player.xpos < x0, 'slides down the 45 degree slope');
  // 何も押さないと速度が -16（静止速度）に近づき、そのまま滑り続ける
  const run16 = log.filter((l) => l.xs === -16).length;
  assert.ok(run16 >= 10, `rest speed on 45 slope is -16 (${run16} frames)`);
  assert.ok(Math.min(...log.map((l) => l.xs)) === -16, 'never faster than -16');
}
{
  // 坂でしゃがむと滑る。下り向きに速度 48 まで加速し、平地で止まる
  const w = makeWorld({ flat: false });
  place(w, 102 * 16, 20 * 16 - 0x20); // 丘の頂上
  run(w, 4);
  run(w, 30, () => [R]); // 右の下り坂へ
  const log = run(w, 60, () => [D]);
  assert.ok(log.some((l) => l.pose === 0x1c), 'slide pose');
  assert.ok(Math.max(...log.map((l) => l.xs)) >= 0x2f, `slides fast ${Math.max(...log.map((l) => l.xs))}`);
  run(w, 120, () => [0]);
  assert.equal(w.player.sliding, 0, 'slide ends on flat ground');
  assert.equal(w.player.xspeed, 0);
}
{
  // 坂を速く登ると、坂に沿って跳ね上がる速度になる（TowardsPeakYSpeed）
  const w = makeWorld();
  w.level.slope(60, 23, SLOPE_K.UP_45);
  w.level.fill(61, 23, 4, 1, TILE.LEDGE);
  w.level.slope(61, 22, SLOPE_K.UP_45);
  w.level.fill(62, 22, 3, 1, TILE.LEDGE);
  place(w, 0x40, STAND_Y);
  let peak = false;
  const p = w.player;
  for (let f = 0; f < 400; f++) {
    run(w, 1, () => [R | Y]);
    if (p.slope === 0x28 && s8(p.yspeed) < 0) peak = true;
  }
  assert.ok(peak, 'fast uphill gives an upward speed');
}

// ---- 水中 ----
{
  // プールに落ちると泳ぎ状態になり、ゆっくり沈む
  const w = makeWorld({ flat: false });
  place(w, 119 * 16, 17 * 16);
  let swimAt = -1;
  for (let f = 0; f < 80; f++) {
    run(w, 1, () => [0]);
    if (swimAt < 0 && w.player.swimming) swimAt = f;
  }
  assert.ok(swimAt >= 0, 'started swimming');
  assert.ok(w.events.includes('splash'), 'splash');
  // 水中の落下は 4 フレームに +2、最大 0x40
  const p = w.player;
  place(w, 119 * 16, 21 * 16);
  p.yspeed = 0;
  run(w, 1, () => [0]);
  const ys = run(w, 28, () => [0]).map((l) => l.ys); // 底に着く前まで
  assert.ok(ys.every((v, i) => i === 0 || (v - ys[i - 1] === 0 || v - ys[i - 1] === 2)), 'sinks +2 per 4 frames');
  assert.equal(ys.filter((v, i) => i > 0 && v !== ys[i - 1]).length, 7, `accelerates 7 times in 28 frames ${ys}`);
}
{
  // B で水をかくと上がる。上昇は -24 まで（↑ で -48、↓ で -8）
  const w = makeWorld({ flat: false });
  const p = w.player;
  place(w, 119 * 16, 23 * 16 - 0x20 + 8);
  p.swimming = 1;
  p.inAir = 0x24;
  run(w, 2, () => [0]);
  let min = 0;
  for (let i = 0; i < 6; i++) {
    const l = run(w, 6, (f) => [f === 0 ? B : 0]);
    min = Math.min(min, ...l.map((e) => e.ys));
  }
  assert.equal(min, -24, `swim stroke speed cap ${min}`);
  // ↑ を押しながら水をかく（水面に着くと ↑+B で飛び出すので、泳いでいる間だけ見る）
  place(w, 119 * 16, 23 * 16 - 0x20 + 8);
  p.swimming = 1;
  p.inAir = 0x24;
  p.yspeed = 0;
  p.canJumpOut = 0;
  let minUp = 0;
  for (let f = 0; f < 40 && p.swimming && !p.canJumpOut; f++) {
    const l = run(w, 1, () => [U | (f % 6 === 0 ? B : 0)])[0];
    if (p.swimming && !p.canJumpOut) minUp = Math.min(minUp, l.ys);
  }
  assert.equal(minUp, -48, `holding up gives -48 ${minUp}`);
}
{
  // 水面では B だけでは出られない。↑ を押しながら B で飛び出す
  const w = makeWorld({ flat: false });
  const p = w.player;
  place(w, 119 * 16, 23 * 16 - 0x20);
  p.swimming = 1;
  let surfaced = false;
  for (let f = 0; f < 240; f++) {
    run(w, 1, () => [f % 8 === 0 ? B : 0]);
    assert.ok(p.swimming, 'B alone never leaves the water');
    if (p.canJumpOut) surfaced = true;
  }
  assert.ok(surfaced, 'reached the surface');
  // 水面にいる時に ↑+B
  for (let f = 0; f < 60 && !p.canJumpOut; f++) run(w, 1, () => [f % 8 === 0 ? B : 0]);
  assert.ok(p.canJumpOut > 0, 'at the surface');
  run(w, 1, () => [U | B]);
  assert.equal(p.swimming, 0, 'jumped out');
  assert.ok(s8(p.yspeed) <= -80, `jump out speed ${s8(p.yspeed)}`);
}

// ---- ツタ ----
{
  // ツタの前で ↑ を押すとつかまって登る。頭がツタの上に出ると止まる
  const w = makeWorld({ flat: false });
  const p = w.player;
  place(w, 131 * 16, STAND_Y);
  run(w, 2);
  const log = run(w, 200, () => [U]);
  assert.ok(log.some((l) => l.pose === 0x15), 'climb pose');
  assert.ok(p.climbing, 'climbing');
  // 頭の判定点 (y+8) がツタの一番上のタイル (14 段目, y=224) にある間だけ登る（最後に 1px はみ出て止まる）
  assert.equal(p.ypos + 8, 14 * 16 - 1, `stops at the top ${p.ypos}`);
  // 登る速さは 1px/フレーム
  const ys = log.slice(5, 15).map((l) => l.y);
  assert.ok(ys.every((v, i) => i === 0 || ys[i - 1] - v === 1), 'climbs 1px per frame');
  // B で飛び降りる（-80）
  run(w, 1, () => [B]);
  assert.equal(p.climbing, 0);
  assert.equal(s8(p.yspeed), -80, 'jump from vine (-80)');
}
{
  // 1 本のツタで左右を押すと、中心が外れたところで手を離す。3 本並んだツタでは横に動ける
  const w = makeWorld({ flat: false });
  const p = w.player;
  place(w, 131 * 16, STAND_Y);
  run(w, 30, () => [U]);
  assert.ok(p.climbing);
  // 1 本のツタ：横を押すと少し横に動き、体の中心がツタから外れると手を離す
  const x0 = p.xpos;
  let letGo = -1;
  for (let f = 0; f < 30 && letGo < 0; f++) {
    run(w, 1, () => [R]);
    if (!p.climbing) letGo = f;
  }
  assert.ok(letGo > 0, 'let go after sliding off a single vine');
  assert.ok(p.xpos > x0 && p.xpos + 8 >= 132 * 16, `center left the vine ${p.xpos}`);
  const w2 = makeWorld({ flat: false });
  const p2 = w2.player;
  place(w2, 141 * 16, STAND_Y - 40);
  p2.inAir = 0x24;
  run(w2, 2, () => [U]);
  assert.ok(p2.climbing, 'grabbed the wide vine');
  const wx0 = p2.xpos;
  run(w2, 8, () => [R]);
  assert.ok(p2.climbing && p2.xpos > wx0, 'moves sideways on a wide vine');
}

console.log('terrain: ok');
