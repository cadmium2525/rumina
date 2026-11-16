// 1-1 アキハバラのテスト: node tests/akihabara.test.mjs
import assert from 'node:assert/strict';
import { run, PAD } from './helpers.mjs';
import { Level, TILE, TILES_H, isHurtBlock } from '../js/level.js';
import { World } from '../js/world.js';
import { makeAkihabara } from '../js/stages/akihabara.js';
import { Capsule, Robo, Drone, Spark } from '../js/actors.js';

const R = PAD.RIGHT, B = PAD.B;
const data = makeAkihabara();
const lv = new Level(data);
{
  // データとして読み書きできる
  const again = new Level(JSON.parse(JSON.stringify(data)));
  assert.deepEqual([...again.tiles], [...lv.tiles]);
  assert.equal(again.title, '1-1 アキハバラ');
  assert.equal(again.theme, 'akiba');
  assert.ok(again.messages.get('7,20').includes('アキハバラ'));
  // スタートとゴールの足元は地面、体の位置は空いている
  for (const p of [lv.start, lv.goal]) {
    assert.equal(lv.tileAt(p.tx, p.ty + 1), TILE.GROUND, 'stands on ground');
    assert.equal(lv.tileAt(p.tx, p.ty), TILE.EMPTY);
  }
  // 敵は固いブロックの中に置かれていない
  for (const s of lv.spawns) {
    assert.ok(!lv.solidPx(s.x + 8, s.y + 8), `${s.type} at ${s.x / 16},${s.y / 16} is free`);
  }
  console.log('stage data: ok');
}
{
  // ステージ名を出している間はゲームが止まる。そのあと動ける
  const w = new World(data);
  const x0 = w.player.xpos;
  run(w, 50, () => [R]);
  assert.equal(w.player.xpos, x0, 'frozen during intro');
  run(w, 120, () => [R]);
  assert.ok(w.player.xpos > x0, 'moves after intro');
}
{
  // メッセージブロックを叩くと文が出て、その間ゲームは止まる。ボタンで閉じる
  const w = new World(data);
  w.introTimer = 0;
  const p = w.player;
  p.xpos = 7 * 16;
  for (let f = 0; f < 40 && !w.message; f++) run(w, 1, () => [f < 10 ? B : 0]);
  assert.ok(w.message && w.message.includes('ようこそ'), 'message shown');
  const y = p.ypos;
  run(w, 30, () => [0]);
  assert.equal(p.ypos, y, 'game frozen');
  run(w, 2, (f) => [f === 1 ? B : 0]);
  assert.equal(w.message, null, 'closed with B');
  console.log('message: ok');
}
{
  // 砲台：192 フレームごとに、ルミナのいる側へ砲弾を撃つ (ShooterSpr01_BulletBillShooter)
  const w = new World(data);
  w.introTimer = 0;
  w.points = [];
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.level.fill(0, 0, w.level.width, 24, TILE.EMPTY);
  w.level.set(12, 22, TILE.CANNON);
  w.shooters = [{ x: 12 * 16, y: 22 * 16, timer: 0 }];
  const p = w.player;
  p.xpos = 3 * 16;
  const shots = [];
  for (let f = 0; f < 400; f++) {
    w.events.length = 0;
    run(w, 1, () => [0]);
    if (w.events.includes('cannon')) shots.push(f);
  }
  assert.ok(shots.length >= 2, `fired ${shots}`);
  assert.equal(shots[1] - shots[0], 192, 'every 192 frames');
  const b = w.actors.find((a) => a.type === 'bullet');
  assert.ok(b, 'bullet exists');
  assert.equal(b.xs, -0x20, 'flies toward Rumina (left) at 2px/frame');
  // すぐ横（17px 未満）にいると撃たない
  const w2 = new World(data);
  w2.introTimer = 0;
  w2.points = [];
  w2.actors = [];
  w2.shooters = [{ x: 6 * 16, y: 22 * 16, timer: 0 }];
  w2.player.xpos = 6 * 16 + 8;
  run(w2, 400, () => [0]);
  assert.ok(!w2.actors.some((a) => a.type === 'bullet'), 'no shot when close');
  // 右にいれば右へ
  const w3 = new World(data);
  w3.introTimer = 0;
  w3.points = [];
  w3.actors = [];
  w3.shooters = [{ x: 4 * 16, y: 22 * 16, timer: 0 }];
  w3.player.xpos = 10 * 16;
  run(w3, 2, () => [0]);
  const b3 = w3.actors.find((a) => a.type === 'bullet');
  assert.equal(b3.xs, 0x20, 'right');
  // 砲弾は上から踏める（踏むと落ちる）
  const p3 = w3.player;
  for (let f = 0; f < 3; f++) run(w3, 1, () => [0]);
  p3.xpos = b3.x + 8;
  p3.ypos = b3.y - 36;
  p3.inAir = 0x24;
  p3.yspeed = 0x20;
  let bounced = false;
  for (let f = 0; f < 10 && !bounced; f++) bounced = run(w3, 1, () => [0])[0].ys < -20;
  assert.ok(bounced && b3.dying, 'stomped bullet');
  assert.equal(p3.hurtTimer, 0);
  console.log('cannon: ok');
}
{
  // ガチャカプセル：地面を転がり、壁で向きを変える
  const w = new World(data);
  w.introTimer = 0;
  w.points = [];
  w.actors = [];
  w.shooters = [];
  w.level.set(6, 23, TILE.CONCRETE);
  const c = new Capsule(9 * 16, 23 * 16);
  w.actors.push(c);
  w.player.xpos = 20 * 16;
  run(w, 120, () => [0]);
  assert.equal(c.facing, 1, 'turned at the wall');
  assert.equal(c.y, 23 * 16, 'on the ground');
}
{
  // 警備ロボ：3 回踏むと倒れる
  const w = new World(data);
  w.introTimer = 0;
  w.points = [];
  w.shooters = [];
  const r = new Robo(10 * 16, 23 * 16);
  r.timer = 999;
  w.actors.push(r);
  const p = w.player;
  for (let i = 0; i < 3; i++) {
    assert.ok(!r.dying, `alive before stomp ${i + 1}`);
    assert.equal(r.hp, 3 - i);
    p.xpos = r.x;
    p.ypos = r.y - 60;
    p.inAir = 0x24;
    p.yspeed = 0x30;
    r.contactTimer = 0;
    for (let f = 0; f < 40 && r.hp === 3 - i; f++) run(w, 1, () => [0]);
    assert.equal(r.hp, 2 - i, `stomp ${i + 1}`);
    p.xpos = r.x - 48; // いったん離れる
    p.ypos = r.y - 16;
    p.yspeed = 0;
  }
  assert.ok(r.dying, 'down after 3 stomps');
  assert.equal(p.hurtTimer, 0);
  assert.equal(p.state, 0);
  console.log('robo: ok');
}
{
  // ドローンは行き来する。電気スパークは跳ね上がって戻る
  const w = new World(data);
  w.introTimer = 0;
  w.points = [];
  w.shooters = [];
  const d = new Drone(10 * 16, 15 * 16);
  const s = new Spark(14 * 16, 18 * 16);
  s.timer = 1;
  w.actors.push(d, s);
  const xs = [];
  let top = s.y;
  // ドローンは 0.5px/フレームで ±48px を往復する
  for (let f = 0; f < 320; f++) {
    run(w, 1, () => [0]);
    xs.push(d.x);
    top = Math.min(top, s.y);
  }
  assert.ok(Math.max(...xs) - Math.min(...xs) >= 90, 'drone patrols');
  assert.ok(s.y0 - top >= 56, `spark jumps ${s.y0 - top}`);
  for (let f = 0; f < 120 && s.jumping; f++) run(w, 1, () => [0]);
  assert.equal(s.y, s.y0, 'spark back');
  console.log('drone/spark: ok');
}
{
  // 下向きのトゲに頭をぶつけるとダメージ
  const w = new World(data);
  w.introTimer = 0;
  w.points = [];
  w.actors = [];
  w.shooters = [];
  const l = w.level;
  l.fill(4, 19, 3, 1, TILE.SPIKE_DOWN);
  assert.ok(isHurtBlock(TILE.SPIKE_DOWN));
  const p = w.player;
  p.powerUp = 1;
  p.xpos = 4 * 16;
  let st = 0;
  for (let f = 0; f < 40 && !st; f++) { run(w, 1, () => [B]); st = p.state; }
  assert.equal(st, 1, 'hurt by ceiling spikes');
}
{
  // 1-1 は起動時のステージ（?level=test で今までのテストステージ）
  const src = (await import('node:fs')).readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert.ok(src.includes('STAGES[stageIndex].make()'));
}
console.log('akihabara: ok');
