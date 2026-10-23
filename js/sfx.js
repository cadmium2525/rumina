// 効果音（WebAudio で合成。素材ファイル不要）
let ctx = null;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
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
  o.connect(g).connect(ctx.destination);
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
  src.connect(g).connect(ctx.destination);
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
  powerup() { tone('square', 600, 1200, 0.15, 0.07); },
  sprout() { tone('triangle', 200, 600, 0.3, 0.08); },
  die() {
    tone('sawtooth', 420, 90, 0.35, 0.1);
    [520, 440, 370, 300, 250].forEach((f, i) => setTimeout(() => tone('square', f, f * 0.95, 0.16, 0.07), 500 + i * 180));
  },
  grab() { tone('triangle', 500, 760, 0.08, 0.09); },
  throw() { tone('triangle', 700, 260, 0.14, 0.09); },
  kick() { tone('square', 300, 180, 0.08, 0.08); },
  swim() { tone('triangle', 260, 520, 0.12, 0.08); },
  splash() {
    noise(0.25, 0.1);
    tone('sine', 700, 200, 0.2, 0.05);
  },
};
