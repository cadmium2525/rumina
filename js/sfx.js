// 効果音（WebAudio で合成。素材ファイル不要）と、音の出口（効果音・BGM それぞれの音量）
let ctx = null;
let seBus = null;  // 効果音の音量
let bgmBus = null; // BGM の音量
const unlockHooks = [];

// ---- 音量の設定（0〜10。localStorage に保存） ----
export const SOUND_KEY = 'rumina.sound';
const DEFAULT_VOL = { bgm: 7, se: 8 };
function loadVol() {
  try {
    const v = JSON.parse(localStorage.getItem(SOUND_KEY));
    const ok = (x) => Number.isInteger(x) && x >= 0 && x <= 10;
    return { bgm: ok(v?.bgm) ? v.bgm : DEFAULT_VOL.bgm, se: ok(v?.se) ? v.se : DEFAULT_VOL.se };
  } catch { return { ...DEFAULT_VOL }; }
}
const vol = loadVol();
export const getVolume = (kind) => vol[kind];
export function setVolume(kind, v) {
  vol[kind] = Math.max(0, Math.min(10, Math.round(v)));
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(vol)); } catch { /* 保存できなくても続ける */ }
  applyVol();
}
// 耳の感じ方に合わせて 2 乗。効果音は 8 で今までと同じ大きさ、BGM は 7 で効果音より少し小さく（約 -25 LUFS）
const seGain = () => (vol.se / 8) ** 2;
const bgmGain = () => 0.75 * (vol.bgm / 10) ** 2;
function applyVol() {
  if (!ctx) return;
  seBus.gain.setTargetAtTime(seGain(), ctx.currentTime, 0.02);
  bgmBus.gain.setTargetAtTime(bgmGain(), ctx.currentTime, 0.02);
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    seBus = ctx.createGain();
    bgmBus = ctx.createGain();
    seBus.gain.value = seGain();
    bgmBus.gain.value = bgmGain();
    seBus.connect(ctx.destination);
    bgmBus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  for (const f of unlockHooks.splice(0)) f();
}
// 音が出せるようになったら呼ぶ（BGM は最初のタップ・キーの後に鳴り始める）
export function onUnlock(f) {
  if (ctx) f();
  else unlockHooks.push(f);
}
export const audioCtx = () => ctx;
export const bgmOut = () => bgmBus;

// 別のアプリに切り替えた・画面を閉じた時は音を止める（スマホで鳴りっぱなしにならないように）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}

function tone(type, f0, f1, dur, vol = 0.12) {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(seBus);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur, vol) {
  if (!ctx || ctx.state !== 'running') return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(seBus);
  src.start();
}

export const sfx = {
  jump() { tone('square', 330, 990, 0.16, 0.08); },
  spin() {
    tone('square', 600, 1400, 0.08, 0.06);
    setTimeout(() => tone('triangle', 900, 1800, 0.12, 0.1), 40);
  },
  pause() { tone('square', 880, 880, 0.08, 0.06); },
  bump() { tone('square', 140, 90, 0.07, 0.1); },
  break() {
    noise(0.22, 0.14);
    tone('square', 220, 70, 0.18, 0.06);
  },
  shatter() {
    noise(0.2, 0.12);
    tone('triangle', 520, 160, 0.14, 0.06);
  },
  bounce() {
    tone('square', 260, 780, 0.12, 0.08);
    setTimeout(() => tone('triangle', 520, 1040, 0.1, 0.07), 50);
  },
  // 縮む：下がっていく音
  shrink() {
    [660, 520, 400, 300].forEach((f, i) => setTimeout(() => tone('square', f, f * 0.9, 0.09, 0.07), i * 90));
  },
  // 大きくなる：上がっていく音
  grow() {
    [300, 400, 520, 660, 800].forEach((f, i) => setTimeout(() => tone('square', f, f * 1.1, 0.08, 0.07), i * 80));
  },
  // ゴール：明るいファンファーレ
  goal() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => setTimeout(() => tone('square', f, f, i === notes.length - 1 ? 0.5 : 0.12, 0.07), i * 120));
  },
  reveal() { tone('triangle', 900, 1100, 0.05, 0.05); },
  door() { tone('square', 200, 100, 0.3, 0.08); },
  bossdown() {
    noise(0.5, 0.14);
    [400, 300, 220, 160].forEach((f, i) => setTimeout(() => tone('sawtooth', f, f * 0.7, 0.2, 0.08), i * 130));
  },
  cannon() {
    noise(0.15, 0.12);
    tone('square', 160, 60, 0.15, 0.08);
  },
  message() { tone('square', 880, 1320, 0.1, 0.06); },
  tape() { tone('triangle', 900, 1800, 0.25, 0.09); },
  powerup() { tone('square', 600, 1200, 0.15, 0.07); },
  sprout() { tone('triangle', 200, 600, 0.3, 0.08); },
  // ミス：やられた音だけ（そのあとのメロディは BGM の「ミス」のジングル）
  die() { tone('sawtooth', 420, 90, 0.35, 0.1); },
  grab() { tone('triangle', 500, 760, 0.08, 0.09); },
  throw() { tone('triangle', 700, 260, 0.14, 0.09); },
  kick() { tone('square', 300, 180, 0.08, 0.08); },
  swim() { tone('triangle', 260, 520, 0.12, 0.08); },
  splash() {
    noise(0.25, 0.1);
    tone('sine', 700, 200, 0.2, 0.05);
  },
  // 音符ブロックで跳ねた：ポーンと上がる音
  note() {
    tone('triangle', 392, 784, 0.12, 0.1);
    setTimeout(() => tone('square', 784, 1046, 0.1, 0.05), 60);
  },
  // グレイコインを取った：きらきら上がる音
  graycoin() {
    [988, 1319, 1568, 1976].forEach((f, i) => setTimeout(() => tone('square', f, f, 0.09, 0.06), i * 70));
    setTimeout(() => tone('triangle', 1976, 2637, 0.25, 0.07), 280);
  },
  // かざんの王：床が揺れる・火柱が噴き上がる
  rumble() {
    noise(0.35, 0.08);
    tone('sawtooth', 70, 50, 0.35, 0.06);
  },
  fire() {
    noise(0.3, 0.12);
    tone('sawtooth', 200, 600, 0.25, 0.05);
  },
  // ひのこが溶岩から跳び出す
  ember() { tone('triangle', 300, 700, 0.1, 0.04); },
  // ネオンの王の電撃
  shock() {
    noise(0.18, 0.1);
    tone('sawtooth', 1200, 300, 0.18, 0.06);
  },
};
