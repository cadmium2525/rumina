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

export const sfx = {
  jump() { tone('square', 330, 990, 0.16, 0.08); },
  spin() {
    tone('square', 600, 1400, 0.08, 0.06);
    setTimeout(() => tone('triangle', 900, 1800, 0.12, 0.1), 40);
  },
  pause() { tone('square', 880, 880, 0.08, 0.06); },
};
