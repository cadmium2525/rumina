import { World } from './world.js';
import { RuminaSprite, SmokeSprites, ActorSprites } from './sprites.js';
import { LevelView } from './level_view.js';
import { SCREEN_W, SCREEN_H } from './level.js';
import { Input } from './input.js';
import { sfx, unlockAudio } from './sfx.js';
import { haptic, isHapticsOn, setHaptics } from './haptics.js';

const FRAME_MS = 1000 / 60.0988; // SNES (NTSC) のフレームレート

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;

const touchRoot = document.getElementById('touch');
const input = new Input(touchRoot);
const view = new LevelView();
const sprite = new RuminaSprite();
const smokeSprites = new SmokeSprites();
const actorSprites = new ActorSprites();
const debugEl = document.getElementById('debug');

let world = new World();
let paused = false;
let showDebug = false;

// ゲーム内イベント → 効果音と触覚フィードバック
const HAPTIC_OF = {
  break: 'medium', shatter: 'medium', bounce: 'medium', hurt: 'heavy',
  bump: 'light', grab: 'light', throw: 'light', kick: 'light',
};

function step() {
  const pad = input.poll();
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

function render() {
  const camX = Math.floor(world.camera.x);
  const camY = world.camera.y;
  const p = world.player;
  view.drawBackground(g, camX, camY);
  view.drawTiles(g, world.level, camX, camY, world.frame);

  for (const e of world.effects) {
    if (e.kind === 'smoke') smokeSprites.draw(g, e.t, e.x - camX, e.y - camY);
  }
  for (const a of world.actors) {
    if (a.state === 'carried') continue; // 手前に描く
    actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  // ダメージ後の無敵中は点滅
  if (!(p.hurtTimer && (p.hurtTimer >> 1) & 1)) {
    sprite.draw(g, p.pose, p.facing, p.xpos - camX, p.ypos - camY);
  }
  for (const a of world.actors) {
    if (a.state === 'carried') actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  for (const e of world.effects) {
    if (e.kind === 'piece') actorSprites.drawPiece(g, e, world.frame, e.x - camX, e.y - camY);
    else if (e.kind === 'star') actorSprites.drawStar(g, e, e.x - camX, e.y - camY);
  }

  drawPMeter();
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
      `spin ${p.spin}  duck ${p.ducking ? 1 : 0}  hold ${p.carrying ? 1 : 0}  cam ${camX}`;
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
  world = new World();
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

// デバッグ・自動テスト用
window.rumina = { get world() { return world; } };
