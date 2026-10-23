import { Player } from './player.js';
import { RuminaSprite, SmokeSprites } from './sprites.js';
import { Level, Camera, SCREEN_W, SCREEN_H, GROUND_Y } from './level.js';
import { Input } from './input.js';
import { sfx, unlockAudio } from './sfx.js';

const FRAME_MS = 1000 / 60.0988; // SNES (NTSC) のフレームレート

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;

const touchRoot = document.getElementById('touch');
const input = new Input(touchRoot);
const level = new Level();
const camera = new Camera();
const sprite = new RuminaSprite();
const smokeSprites = new SmokeSprites();
const debugEl = document.getElementById('debug');

let player = new Player(0x40, GROUND_Y - 0x20);
let smokes = [];
let frame = 0;
let paused = false;
let showDebug = false;

function step() {
  const pad = input.poll();
  if (pad.startPressed) {
    paused = !paused;
    sfx.pause();
  }
  if (paused) return;

  frame = (frame + 1) & 0xff;
  // SMW と同じく、カメラ → プレイヤーの順で処理
  camera.update(player);
  player.update(pad, { groundY: GROUND_Y, camX: camera.x, frame });
  if (player.sfx) {
    sfx[player.sfx]();
    player.sfx = null;
  }
  for (const s of player.smokeRequests) {
    if (smokes.length < 3) smokes.push({ x: s.x, y: s.y, t: 19 });
  }
  player.smokeRequests.length = 0;
  smokes = smokes.filter((s) => --s.t > 0);
}

function drawPMeter() {
  // P メーター（SMW には表示が無いが、操作感確認用に表示）
  const n = Math.floor(player.pmeter / 16); // 0..7
  for (let i = 0; i < 7; i++) {
    const on = i < n;
    g.fillStyle = '#24141c';
    g.fillRect(8 + i * 7, 8, 6, 6);
    g.fillStyle = on ? (n >= 7 ? (frame & 4 ? '#ffffff' : '#ff5050') : '#ffd040') : '#5a5070';
    g.fillRect(9 + i * 7, 9, 4, 4);
  }
  g.fillStyle = '#24141c';
  g.fillRect(58, 7, 11, 8);
  g.fillStyle = n >= 7 ? (frame & 4 ? '#ffffff' : '#ff5050') : '#8a80a0';
  // "P"
  const P = ['111.', '1..1', '111.', '1...', '1...'];
  P.forEach((row, y) => [...row].forEach((c, x) => c === '1' && g.fillRect(61 + x, 8 + y + 0, 1, 1)));
}

function render() {
  const camX = camera.x;
  const camY = camera.y;
  level.draw(g, camX, camY);
  for (const s of smokes) smokeSprites.draw(g, s.t, s.x - camX, s.y - camY);
  sprite.draw(g, player.pose, player.facing, player.xpos - camX, player.ypos - camY);
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
      `X ${player.xpos.toString().padStart(4)}  Y ${player.ypos}\n` +
      `Xspd ${hex(player.xspeed)} (${s8(player.xspeed)})  Yspd ${hex(player.yspeed)} (${s8(player.yspeed)})\n` +
      `P ${hex(player.pmeter)}  air ${hex(player.inAir)}  pose ${hex(player.pose)}\n` +
      `spin ${player.spin}  duck ${player.ducking ? 1 : 0}  cam ${camX}`;
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

document.getElementById('btn-debug').addEventListener('click', () => {
  showDebug = !showDebug;
  debugEl.hidden = !showDebug;
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'F2' || e.code === 'Backquote') {
    showDebug = !showDebug;
    debugEl.hidden = !showDebug;
  }
  if (e.code === 'KeyR') {
    player = new Player(0x40, GROUND_Y - 0x20);
    camera.x = 0;
  }
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
