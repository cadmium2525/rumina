import { World } from './world.js';
import { Level } from './level.js';
import { STAGES } from './stages/index.js';
import { RuminaSprite, SmokeSprites, ActorSprites } from './sprites.js';
import { LevelView } from './level_view.js';
import { Darkness } from './darkness.js';
import { SCREEN_W, SCREEN_H } from './level.js';
import { Input } from './input.js';
import { sfx, unlockAudio } from './sfx.js';
import { haptic, isHapticsOn, setHaptics } from './haptics.js';
import { Overworld, loadSave, SAVE_KEY } from './overworld/overworld.js';
import { OverworldView } from './overworld/overworld_view.js';

const FRAME_MS = 1000 / 60.0988; // SNES (NTSC) のフレームレート

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;

const touchRoot = document.getElementById('touch');
const input = new Input(touchRoot);
const view = new LevelView();
const darkness = new Darkness();
const sprite = new RuminaSprite();
const smokeSprites = new SmokeSprites();
const actorSprites = new ActorSprites();
const debugEl = document.getElementById('debug');

// ふだんは地図（オーバーワールド）から始まる。
// ?level=1-2 のように書くと、地図を通さずにそのステージを直接遊ぶ（クリアすると次のステージへ）。
// ?level=custom ならエディタで作ったステージ（localStorage）、?level=test なら操作確認用のテストステージ
export const PLAY_KEY = 'rumina.play';
const DIRECT = new URLSearchParams(location.search).get('level');
function chooseLevel() {
  const which = DIRECT;
  if (which === 'custom') {
    try {
      const d = JSON.parse(localStorage.getItem(PLAY_KEY));
      if (d) return d;
    } catch { /* 壊れていたら 1-1 */ }
  }
  if (which === 'test') return new Level().toData();
  const i = STAGES.findIndex((s) => s.id === which);
  stageIndex = i >= 0 ? i : 0;
  return STAGES[stageIndex].make();
}
let stageIndex = -1; // STAGES の何番目か（custom・test は -1）
let levelData = DIRECT ? chooseLevel() : null;
let world = DIRECT ? new World(levelData) : null;

// ---- 地図 ----
// 地図から入れるステージ（ふつうのステージと、地図の点から入る隠しステージ＝ルミナの家）
const PLAYABLE = STAGES.filter((s) => !s.hidden || s.onMap).map((s) => s.id);
const TITLES = Object.fromEntries(STAGES.filter((s) => !s.hidden).map((s) => [s.id, s.make().title || s.id]));
const owView = new OverworldView(sprite);
function makeOverworld() {
  const o = new Overworld(loadSave(), PLAYABLE);
  o.titles = TITLES;
  return o;
}
let ow = DIRECT ? null : makeOverworld();
let mode = DIRECT ? 'level' : 'map'; // 'map'（地図）または 'level'（ステージ）
const fromMap = !DIRECT;

// 暗転して切り替える：暗くなりきった所で fn を呼び、また明るくする
const FADE = 18;
let trans = null;
function fadeTo(fn, { outOnly = false } = {}) {
  trans = { t: outOnly ? FADE : 0, fn };
}
function stepTrans() {
  trans.t++;
  if (trans.t === FADE && trans.fn) {
    trans.fn();
    trans.fn = null;
  }
  if (trans.t >= FADE * 2) trans = null;
}
const fadeAlpha = () => (trans ? (trans.t < FADE ? trans.t / FADE : 2 - trans.t / FADE) : 0);

function playStage(id) {
  stageIndex = STAGES.findIndex((s) => s.id === id);
  levelData = STAGES[stageIndex].make();
  world = new World(levelData);
  world.player.powerUp = ow ? ow.save.power : 0;
  clearTimer = 0;
  doorTimer = 0;
  paused = false;
  mode = 'level';
  syncMapBtn();
}

function backToMap() {
  mode = 'map';
  paused = false;
  syncMapBtn();
}
let paused = false;
let clearTimer = 0;
let doorTimer = 0;
const DOOR_TIME = 40;
// 次のステージ（ボス部屋など、扉からしか入らない所は飛ばす。最後の次は最初）
function nextStage(i) {
  do { i = (i + 1) % STAGES.length; } while (STAGES[i].hidden);
  return i;
}
const CLEAR_TIME = 240;
let showDebug = false;

// ゲーム内イベント → 効果音と触覚フィードバック
const HAPTIC_OF = {
  break: 'medium', shatter: 'medium', bounce: 'medium', shrink: 'heavy', die: 'heavy', grow: 'medium',
  goal: 'heavy', tape: 'medium', bossdown: 'heavy', door: 'medium', message: 'light', cannon: 'light', bump: 'light', grab: 'light', throw: 'light', kick: 'light', splash: 'light', note: 'light', shock: 'medium', rumble: 'light', fire: 'medium',
};

const MAP_SOUND = { bump: 'bump', enter: 'door', warp: 'door', reveal: 'reveal' };

function step() {
  const pad = input.poll();
  if (trans) {
    stepTrans();
    return;
  }
  if (mode === 'map') {
    const r = ow.step(pad);
    for (const ev of ow.events) {
      if (MAP_SOUND[ev] && sfx[MAP_SOUND[ev]]) sfx[MAP_SOUND[ev]]();
      if (ev === 'enter' || ev === 'warp') haptic('medium');
    }
    ow.events.length = 0;
    if (r && r.play) fadeTo(() => playStage(r.play));
    if (r && r.warp) fadeTo(() => ow.warpTo(r));
    return;
  }
  if (pad.startPressed) {
    paused = !paused;
    sfx.pause();
  }
  if (paused) return;
  world.step(pad);
  for (const ev of world.events) {
    if (sfx[ev]) sfx[ev]();
    if (HAPTIC_OF[ev]) haptic(HAPTIC_OF[ev]);
  }
  world.events.length = 0;
  // ミスの演出が終わったら：地図から来た時は地図へ戻る（小さくなる）。直接遊んでいる時はやり直し
  if (world.player.dead) {
    if (fromMap) {
      ow.setPower(0);
      fadeTo(backToMap);
    } else {
      reset();
    }
    return;
  }
  // コースクリア：文字を出してしばらくしたらやり直し
  // ボス扉に入った：行き先のステージへ（無ければクリア扱い）。大きさは引き継ぐ
  if (world.doorEntered && ++doorTimer > DOOR_TIME) {
    const i = STAGES.findIndex((s) => s.id === world.level.doorTo);
    const power = world.player.powerUp;
    if (i >= 0) {
      stageIndex = i;
      levelData = STAGES[i].make();
    } else if (stageIndex >= 0) {
      stageIndex = nextStage(stageIndex);
      levelData = STAGES[stageIndex].make();
    }
    reset();
    world.player.powerUp = power;
  }
  if (world.cleared && ++clearTimer > CLEAR_TIME && fromMap) {
    // 地図へ戻って、クリアした点から道が開く（ボス部屋はお城のクリアになる）。
    // ひみつのゴールなら「1-3*」のように * を付けて記録し、隠し道が開く
    const st = STAGES[stageIndex];
    const exit = (st.credit || st.id) + (world.secretExit ? '*' : '');
    const power = world.player.powerUp;
    fadeTo(() => {
      backToMap();
      ow.markCleared(exit, power);
    });
    return;
  }
  if (world.cleared && clearTimer > CLEAR_TIME) {
    // 次のステージへ（custom・test は同じステージをもう一度）
    const power = world.player.powerUp;
    if (stageIndex >= 0) {
      stageIndex = nextStage(stageIndex);
      levelData = STAGES[stageIndex].make();
    }
    reset();
    world.player.powerUp = power; // クリアした時の大きさは次のステージへ引き継ぐ
  }
}

function drawPMeter() {
  // P メーター（SMW には表示が無いが、操作感確認用に表示）
  const p = world.player;
  const blink = world.frame & 4;
  const n = Math.floor(p.pmeter / 16); // 0..7
  for (let i = 0; i < 7; i++) {
    const on = i < n;
    g.fillStyle = '#24141c';
    g.fillRect(8 + i * 7, 8, 6, 6);
    g.fillStyle = on ? (n >= 7 ? (blink ? '#ffffff' : '#ff5050') : '#ffd040') : '#5a5070';
    g.fillRect(9 + i * 7, 9, 4, 4);
  }
  g.fillStyle = '#24141c';
  g.fillRect(58, 7, 11, 8);
  g.fillStyle = n >= 7 ? (blink ? '#ffffff' : '#ff5050') : '#8a80a0';
  const P = ['111.', '1..1', '111.', '1...', '1...'];
  P.forEach((row, y) => [...row].forEach((c, x) => c === '1' && g.fillRect(61 + x, 8 + y, 1, 1)));
}

// ステージの始まり：黒い画面にステージ名
function drawIntro() {
  g.fillStyle = '#000';
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.save();
  g.globalAlpha = Math.min(1, world.introTimer / 20);
  g.font = 'bold 16px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = '#ffe070';
  g.fillText(world.level.title, SCREEN_W / 2, SCREEN_H / 2);
  g.restore();
}

// メッセージの枠（ゲームは止まっている）
function drawMessage(text) {
  const lines = text.split('\n');
  const lh = 13;
  const h = lines.length * lh + 16;
  const x = 24;
  const y = 40;
  const w = SCREEN_W - 48;
  g.fillStyle = '#1c1424';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#ff78c8';
  g.lineWidth = 2;
  g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = '#ffffff';
  g.font = '10px system-ui, sans-serif';
  g.textAlign = 'center';
  lines.forEach((ln, i) => g.fillText(ln, SCREEN_W / 2, y + 16 + i * lh));
  g.textAlign = 'left';
}

// 「コースクリア！」
function drawClear() {
  const t = Math.min(clearTimer, 30) / 30;
  g.save();
  g.globalAlpha = 0.35 * t;
  g.fillStyle = '#fff8d0';
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.globalAlpha = t;
  g.font = 'bold 20px system-ui, sans-serif';
  g.textAlign = 'center';
  g.lineWidth = 4;
  g.strokeStyle = '#24141c';
  g.strokeText('コースクリア！', SCREEN_W / 2, 80);
  g.fillStyle = '#ffe070';
  g.fillText('コースクリア！', SCREEN_W / 2, 80);
  const ending = STAGES[stageIndex]?.ending;
  if (ending) {
    // 最後のボスを倒した・ほしの道を走りきった：エンディングの文（最後の行は水色）
    g.font = 'bold 13px system-ui, sans-serif';
    g.lineWidth = 3;
    ending.forEach((text, i) => {
      const y = 112 + i * 20 + (i === ending.length - 1 ? 8 : 0);
      g.strokeText(text, SCREEN_W / 2, y);
      g.fillStyle = i === ending.length - 1 ? '#c8d8ff' : '#ffffff';
      g.fillText(text, SCREEN_W / 2, y);
    });
  }
  g.restore();
}

function render() {
  if (mode === 'map') {
    owView.draw(g, ow, ow.frame, ow.save.power, fadeAlpha());
    if (showDebug) debugEl.textContent = `map ${ow.mapId}  node ${ow.nodeKey}  ${ow.x},${ow.y}\ncleared ${ow.save.cleared.join(' ')}`;
    return;
  }
  renderLevel();
  const a = fadeAlpha();
  if (a) {
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}

function renderLevel() {
  const camX = Math.floor(world.camera.x);
  const camY = world.camera.y;
  const p = world.player;
  view.drawBackground(g, camX, camY, world.level.theme);
  // ブロックから出てくる途中の光の玉はブロックの後ろ
  for (const a of world.actors) {
    if ((a.type === 'light' || a.type === 'bullet') && a.emerge) actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  view.drawTiles(g, world.level, camX, camY, world.frame);

  for (const e of world.effects) {
    if (e.kind === 'smoke') smokeSprites.draw(g, e.t, e.x - camX, e.y - camY);
  }
  for (const a of world.actors) {
    if (a.state === 'carried') continue; // 手前に描く
    if ((a.type === 'light' || a.type === 'bullet') && a.emerge) continue;
    if (a.type === 'goal') {
      actorSprites.drawGoalBack(g, a, world.frame, camX, camY);
      continue;
    }
    actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  // ダメージ後の無敵中は点滅
  if (!(p.hurtTimer && (p.hurtTimer >> 1) & 1)) {
    sprite.draw(g, p.pose, p.facing, p.xpos - camX, p.ypos - camY, p.powerUp);
  }
  for (const a of world.actors) {
    if (a.state === 'carried') actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  if (world.goal) actorSprites.drawGoalFront(g, world.goal, world.frame, camX, camY);
  if (world.secretGoal) actorSprites.drawGoalFront(g, world.secretGoal, world.frame, camX, camY);
  for (const e of world.effects) {
    if (e.kind === 'piece') actorSprites.drawPiece(g, e, world.frame, e.x - camX, e.y - camY);
    else if (e.kind === 'star') actorSprites.drawStar(g, e, e.x - camX, e.y - camY);
    else if (e.kind === 'bubble') actorSprites.drawBubble(g, e.x - camX, e.y - camY);
    else if (e.kind === 'splash') actorSprites.drawSplash(g, e, e.x - camX, e.y - camY);
  }
  view.drawWater(g, world.level, camX, camY, world.frame);
  // 暗やみ：光る物のまわりだけ見える
  if (world.level.dark) darkness.draw(g, world, camX, camY, world.frame);

  drawPMeter();
  if (world.doorEntered) {
    // 扉に入る：暗くなる
    g.fillStyle = `rgba(0,0,0,${Math.min(1, doorTimer / 30)})`;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  if (world.message) drawMessage(world.message);
  if (world.introTimer) drawIntro();
  if (clearTimer) drawClear();
  if (paused) {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle = '#fff';
    g.font = 'bold 16px monospace';
    g.textAlign = 'center';
    g.fillText('PAUSE', SCREEN_W / 2, SCREEN_H / 2);
    g.textAlign = 'left';
  }
  if (showDebug) {
    const hex = (v) => v.toString(16).toUpperCase().padStart(2, '0');
    const s8 = (v) => ((v & 0xff) << 24) >> 24;
    debugEl.textContent =
      `X ${String(p.xpos).padStart(4)}  Y ${p.ypos}\n` +
      `Xspd ${hex(p.xspeed)} (${s8(p.xspeed)})  Yspd ${hex(p.yspeed)} (${s8(p.yspeed)})\n` +
      `P ${hex(p.pmeter)}  air ${hex(p.inAir)}  pose ${hex(p.pose)}\n` +
      `spin ${p.spin}  duck ${p.ducking ? 1 : 0}  hold ${p.carrying ? 1 : 0}  cam ${camX}\n` +
      `power ${p.powerUp}  state ${p.state}`;
  }
}

let acc = 0;
let last = performance.now();
function loop(now) {
  acc += Math.min(now - last, 100);
  last = now;
  let n = 0;
  while (acc >= FRAME_MS && n < 4) {
    step();
    acc -= FRAME_MS;
    n++;
  }
  if (n === 4) acc = 0;
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- 画面レイアウト ----
function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vh > vw;
  document.body.classList.toggle('portrait', portrait);
  let scale;
  if (portrait) {
    scale = vw / SCREEN_W;
    if (SCREEN_H * scale > vh * 0.6) scale = (vh * 0.6) / SCREEN_H;
  } else {
    scale = Math.min(vw / SCREEN_W, vh / SCREEN_H);
  }
  // 余裕があれば整数倍にしてドットを均一に
  if (scale >= 2 && Math.floor(scale) / scale > 0.9) scale = Math.floor(scale);
  canvas.style.width = `${Math.floor(SCREEN_W * scale)}px`;
  canvas.style.height = `${Math.floor(SCREEN_H * scale)}px`;
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 100));
layout();

// タッチ端末ならバーチャルパッドを表示
function enableTouchUI() {
  document.body.classList.add('touch');
}
if (window.matchMedia('(pointer: coarse)').matches) enableTouchUI();
window.addEventListener('touchstart', enableTouchUI, { once: true, passive: true });

// ---- 各種ボタン ----
const unlock = () => unlockAudio();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

function toggleDebug() {
  showDebug = !showDebug;
  debugEl.hidden = !showDebug;
}
function reset() {
  if (mode === 'map') return;
  world = new World(levelData);
  if (fromMap) world.player.powerUp = ow.save.power;
  clearTimer = 0;
  doorTimer = 0;
  paused = false;
}

document.getElementById('btn-debug').addEventListener('click', toggleDebug);
document.getElementById('btn-reset').addEventListener('click', reset);
const hapBtn = document.getElementById('btn-haptic');
function syncHapBtn() {
  hapBtn.classList.toggle('off', !isHapticsOn());
  hapBtn.setAttribute('aria-pressed', String(isHapticsOn()));
}
hapBtn.addEventListener('click', () => {
  setHaptics(!isHapticsOn());
  syncHapBtn();
  haptic('medium');
});
syncHapBtn();

window.addEventListener('keydown', (e) => {
  if (e.code === 'F2' || e.code === 'Backquote') toggleDebug();
  if (e.code === 'KeyR') reset();
});
document.getElementById('btn-full').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    }
  } catch { /* iOS Safari などは非対応 */ }
});
document.getElementById('btn-help').addEventListener('click', () => {
  document.getElementById('help').hidden = !document.getElementById('help').hidden;
});
document.getElementById('help').addEventListener('click', (e) => {
  e.currentTarget.hidden = true;
});

// ---- PWA ----
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// 地図へ戻る（ステージの途中でも。クリアにはならない）
const mapBtn = document.getElementById('btn-map');
function syncMapBtn() {
  mapBtn.hidden = !(fromMap && mode === 'level');
}
function exitToMap() {
  if (!fromMap || mode !== 'level' || trans) return;
  if (world.player.state === 0) ow.setPower(world.player.powerUp);
  fadeTo(backToMap);
}
mapBtn.addEventListener('click', exitToMap);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') exitToMap();
});
syncMapBtn();
// セーブデータを消す（ヘルプの中のボタン）
document.getElementById('btn-save-reset').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!confirm('進み具合（クリアしたステージ）をすべて消して、最初からにしますか？')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* 消せなくても続ける */ }
  if (fromMap) {
    ow = makeOverworld();
    backToMap();
  }
  document.getElementById('help').hidden = true;
});

// デバッグ・自動テスト用
window.rumina = { get world() { return world; }, get ow() { return ow; }, get mode() { return mode; } };
