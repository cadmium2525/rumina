// BGM（bgm/*.mp3。曲は tools/bgm で「かなでる」を使って作ったもの）
// - 曲は使う時に読み込む。ループは bgm_list.js の区間（秒）で、継ぎ目なくくり返す
// - 切り替えは前の曲を小さくしてから。読み込み中に別の曲に変わったら、古い方は鳴らさない
// - 最初のタップ・キーで音が出せるようになるまでは、鳴らしたい曲を覚えておく
import { BGM } from './bgm_list.js';
import { audioCtx, bgmOut, onUnlock } from './sfx.js';

// ステージの曲：テーマごと。ボス部屋はボスの曲（やみの大王だけ別）、最終コースは「ひかりのみなもと」
export const THEME_BGM = { grass: 'grass', akiba: 'akiba', cave: 'cave', ruins: 'ruins', castle: 'castle', sky: 'sky', neon: 'neon', volcano: 'volcano', dark: 'dark', space: 'space', house: 'house' };
export function musicFor(stageId, levelData) {
  if (stageId && /^LAST-/.test(stageId)) return 'final';
  const boss = levelData?.spawns?.find((p) => /^boss/.test(p.type));
  if (boss) return boss.type === 'boss8' ? 'lastboss' : 'boss';
  return THEME_BGM[levelData?.theme] ?? 'grass';
}

const KEEP = 3;              // 覚えておく曲（デコードした音）の数。スマホのメモリを使いすぎないように
const buffers = new Map();   // 名前 → AudioBuffer（新しく使った順に後ろ）
const loading = new Map();   // 名前 → Promise<AudioBuffer>
let cur = null;              // 鳴っている曲 { name, src, gain, loop }
let want = null;             // 鳴らしたい曲 { name, loop, delay }
let duckGain = null;         // ポーズ中に小さくする
let ducked = false;

function out() {
  const ctx = audioCtx();
  if (!duckGain) {
    duckGain = ctx.createGain();
    duckGain.connect(bgmOut());
  }
  duckGain.gain.setTargetAtTime(ducked ? 0.3 : 1, ctx.currentTime, 0.05);
  return duckGain;
}

function load(name) {
  if (buffers.has(name)) {
    const b = buffers.get(name);
    buffers.delete(name);
    buffers.set(name, b);
    return Promise.resolve(b);
  }
  if (loading.has(name)) return loading.get(name);
  const info = BGM[name];
  if (!info) return Promise.reject(new Error(`BGM が無い: ${name}`));
  const p = fetch(info.file)
    .then((r) => {
      if (!r.ok) throw new Error(`${info.file}: ${r.status}`);
      return r.arrayBuffer();
    })
    .then((ab) => new Promise((ok, ng) => audioCtx().decodeAudioData(ab, ok, ng)))
    .then((buf) => {
      if (info.loop) smoothSeam(buf, info.loop);
      buffers.set(name, buf);
      // 古いものから捨てる（鳴っている曲と、いま読んだ曲は残す）
      while (buffers.size > KEEP) {
        const old = [...buffers.keys()].find((k) => k !== cur?.name && k !== name);
        if (!old) break;
        buffers.delete(old);
      }
      return buf;
    })
    .finally(() => loading.delete(name));
  loading.set(name, p);
  return p;
}

// ループのつなぎ目をなめらかに：ループの終わりの手前 50ms を、ループの始まりの手前（同じ音楽）へ少しずつ置きかえる。
// MP3 は同じ音でも場所ごとに少しずつちがう音になるので、そのままだと飛んだ瞬間に小さな段差ができる
function smoothSeam(buf, [ls, le]) {
  const sr = buf.sampleRate;
  const a = Math.round(ls * sr);
  const e = Math.min(Math.round(le * sr), buf.length);
  const m = Math.min(Math.round(0.05 * sr), a);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < m; i++) {
      const w = (i + 1) / m;
      d[e - m + i] = d[e - m + i] * (1 - w) + d[a - m + i] * w;
    }
  }
}

function fadeOut(c, sec) {
  if (!c) return;
  const ctx = audioCtx();
  const t = ctx.currentTime;
  c.gain.gain.cancelScheduledValues(t);
  c.gain.gain.setValueAtTime(c.gain.gain.value, t);
  c.gain.gain.linearRampToValueAtTime(0, t + Math.max(0.01, sec));
  try { c.src.stop(t + Math.max(0.01, sec) + 0.02); } catch { /* もう止まっている */ }
}

function start() {
  const w = want;
  if (!w || w.started || !audioCtx()) return;
  w.started = true;
  load(w.name).then((buf) => {
    if (want !== w) return; // 読み込んでいる間に別の曲になった
    const ctx = audioCtx();
    const info = BGM[w.name];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain).connect(out());
    if (w.loop && info.loop) {
      src.loop = true;
      src.loopStart = info.loop[0];
      src.loopEnd = Math.min(info.loop[1], buf.duration);
    }
    src.start(ctx.currentTime + (w.delay || 0));
    const c = { name: w.name, src, gain, loop: w.loop };
    src.onended = () => { if (cur === c) cur = null; };
    cur = c;
  }).catch((e) => console.warn(e));
}

export const bgm = {
  // ループする曲を鳴らす（同じ曲が鳴っていればそのまま）
  play(name, { fade = 0.4 } = {}) {
    if (!BGM[name]) return this.stop(fade);
    if (want && want.name === name && want.loop) return;
    fadeOut(cur, fade);
    cur = null;
    want = { name, loop: true };
    onUnlock(start);
  },
  // 1 回だけの曲（ゴール・ミス・エンディング）。delay 秒後に鳴らす
  jingle(name, { delay = 0, fade = 0.08 } = {}) {
    fadeOut(cur, fade);
    cur = null;
    want = { name, loop: false, delay };
    if (audioCtx()) start();
  },
  stop(fade = 0.4) {
    fadeOut(cur, fade);
    cur = null;
    want = null;
  },
  // ポーズ中は小さく
  duck(on) {
    ducked = on;
    if (audioCtx() && duckGain) out();
  },
  // 次に使う曲を先に読み込んでおく
  prefetch(name) {
    if (audioCtx() && BGM[name]) load(name).catch(() => {});
  },
  get playing() { return cur?.name ?? null; },
  get wanted() { return want?.name ?? null; },
};
