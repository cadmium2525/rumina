// BGM づくりの部品（かなでる の曲 JSON を組み立てる）。曲の中身は songs.mjs
// 形式は cadmium2525/mp4mp3 の daw/FORMAT.md を参照

// ---- 和音の進行 ----
// 'C Am | F G' のように書く。| で小節を区切り、1 小節の中の和音は等分（4/4 なら 2 つで 2 拍ずつ）。
// 「.」はひとつ前の和音をのばす（'C . . G' = C を 3 拍、G を 1 拍）
export function prog(str, beatsPerBar = 4, at = 0) {
  const out = [];
  const bars = str.split('|').map((b) => b.trim()).filter(Boolean);
  bars.forEach((bar, i) => {
    const cs = bar.split(/\s+/);
    const step = beatsPerBar / cs.length;
    cs.forEach((c, k) => {
      if (c !== '.') out.push([at + i * beatsPerBar + k * step, c]);
    });
  });
  return out;
}
export const barsOf = (str) => str.split('|').map((b) => b.trim()).filter(Boolean).length;

// ---- メロディ ----
// 'E5:.5 G5 C6:1 r:1 B5:.5' … 音名:長さ（拍）。長さを省くとひとつ前と同じ。
// r は休み、[C5,E5] は和音、! を付けると強く、~ を付けると弱く、> は同じ高さでつなぐ前の音をのばす
// 3 連は 1/3 のように分数で書ける
export function mel(str, { at = 0, vel = 0.72, oct = 0, bar = 4 } = {}) {
  const notes = [];
  let t = at;
  let d = 1;
  // 小節の長さの確かめ（| で区切った 1 小節ぶんが bar 拍になっているか）
  let barStart = at;
  let barNo = 1;
  const checkBar = () => {
    if (Math.abs(t - barStart - bar) > 1e-6) throw new Error(`${barNo} 小節目が ${round(t - barStart)} 拍（${bar} 拍のはず）: ${str.trim().slice(0, 40)}…`);
    barStart = t;
    barNo++;
  };
  for (const tok0 of str.split(/\s+/).filter(Boolean)) {
    if (tok0 === '|') { checkBar(); continue; }
    let tok = tok0;
    let v = vel;
    if (tok.endsWith('!')) { v = Math.min(1, vel + 0.14); tok = tok.slice(0, -1); }
    if (tok.endsWith('~')) { v = vel - 0.18; tok = tok.slice(0, -1); }
    const [name, len] = tok.split(':');
    if (len) d = len.includes('/') ? Number(len.split('/')[0]) / Number(len.split('/')[1]) : Number(len);
    if (!Number.isFinite(d)) throw new Error(`長さが読めない: ${tok0}`);
    if (name === '>') {
      notes[notes.length - 1][2] += d;
    } else if (name !== 'r') {
      const ns = name.startsWith('[') ? name.slice(1, -1).split(',') : [name];
      for (const n of ns) notes.push([round(t), shift(n, oct), round(d * 0.95), round(v)]);
    }
    t += d;
  }
  if (str.includes('|') && t > barStart + 1e-6) checkBar();
  return notes;
}

// よく使う編成：旋律・重ね・伴奏・パッド・アルペジオ・ベース・ドラム
// どれも省ける。len は拍。低音はひかえめ（ベース -8dB 前後、ほかは低いところを切る）
export function band({ len, melody, lead, double, chords, pad, arp, bass, drums, extra = [] }) {
  const g = (type, o) => ({ at: 0, len, gen: { type, seed: 1, ...o } });
  const t = [];
  if (lead) t.push({ id: 'lead', name: '旋律', inst: lead.inst, volume: lead.vol ?? 0, pan: lead.pan ?? 0, sends: { reverb: lead.reverb ?? 0.22, delay: lead.delay ?? 0.1 }, fx: [LOWCUT(lead.cut ?? 200), ...(lead.fx || [])], ...(lead.humanize ? { humanize: lead.humanize } : {}), clips: [{ at: 0, notes: lead.notes ?? melody }] });
  if (double) t.push({ id: 'double', name: '旋律の重ね', inst: double.inst, volume: double.vol ?? -11, pan: double.pan ?? 0.2, transpose: double.transpose ?? 0, sends: { reverb: double.reverb ?? 0.3, delay: double.delay ?? 0.05 }, fx: [LOWCUT(250)], clips: [{ at: 0, notes: double.notes ?? melody }] });
  if (chords) t.push({ id: 'chords', name: '伴奏', inst: chords.inst, volume: chords.vol ?? -7, pan: chords.pan ?? -0.15, sends: { reverb: chords.reverb ?? 0.2 }, fx: [LOWCUT(chords.cut ?? 170), ...(chords.fx || [])], ...(chords.strum ? { strum: chords.strum } : {}), clips: [g('chords', { style: chords.style ?? 'piano8', voicing: chords.voicing ?? 'close', register: chords.register ?? 'C4' })] });
  if (pad) t.push({ id: 'pad', name: 'パッド', inst: pad.inst, volume: pad.vol ?? -14, pan: 0, sends: { reverb: pad.reverb ?? 0.35 }, fx: [LOWCUT(pad.cut ?? 220)], clips: [g('chords', { style: 'pad', voicing: pad.voicing ?? 'open', register: pad.register ?? 'G3' })] });
  if (arp) t.push({ id: 'arp', name: 'アルペジオ', inst: arp.inst, volume: arp.vol ?? -12, pan: arp.pan ?? 0.25, sends: { reverb: arp.reverb ?? 0.2, delay: arp.delay ?? 0.12 }, fx: [LOWCUT(arp.cut ?? 250)], clips: [g('arp', { pattern: arp.pattern ?? 'up', rate: arp.rate ?? '1/8', octaves: arp.octaves ?? 1, register: arp.register ?? 'C5' })] });
  if (bass) t.push({ id: 'bass', name: 'ベース', inst: bass.inst ?? 'pluckbass', volume: bass.vol ?? -8, fx: [LOWCUT_BASS], clips: [g('bass', { style: bass.style ?? 'half', lo: bass.lo ?? 'C2', hi: bass.hi ?? 'C3' })] });
  if (drums) t.push({ id: 'drums', name: 'ドラム', type: 'drums', kit: drums.kit ?? 'acoustic', volume: drums.vol ?? -6, tune: { ...LIGHT_KICK, ...(drums.tune || {}) }, sends: { reverb: drums.reverb ?? 0.1 }, fx: [{ type: 'eq', bands: [{ type: 'hp', freq: 50, slope: 24 }] }], clips: drums.clips ?? [g('drums', { style: drums.style ?? 'pop', intensity: drums.intensity ?? 0.5, fill: drums.fill ?? 8 })] });
  return t.concat(extra);
}
const round = (x) => Math.round(x * 1000) / 1000;
// 音名をオクターブずらす（'C5' → 'C6'）
export function shift(n, oct) {
  if (!oct) return n;
  return n.replace(/(-?\d+)$/, (o) => String(Number(o) + oct));
}
// 音名を半音ずらす
const PCS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
export function midi(n) {
  const m = /^([A-G][#b]?)(-?\d+)$/.exec(n);
  if (!m) throw new Error(`音名が読めない: ${n}`);
  const pc = PCS.indexOf(FLAT[m[1]] || m[1]);
  return pc + (Number(m[2]) + 1) * 12;
}
export const nameOf = (m) => `${PCS[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export function transpose(notes, semis) {
  return notes.map(([t, n, d, v]) => [t, nameOf(midi(n) + semis), d, v]);
}
// 拍をずらす
export const at = (notes, t0) => notes.map(([t, n, d, v]) => [round(t + t0), n, d, v]);
// 長さを繰り返す
export function loopNotes(notes, len, times) {
  const out = [];
  for (let k = 0; k < times; k++) out.push(...at(notes, k * len));
  return out;
}

// ---- ドラムの譜面（16 分の文字列。| は読みやすさのためだけ） ----
export function grid(len, parts, res = 0.25) {
  return { at: 0, len, grid: parts, res };
}

// ---- トラック ----
// 低音（ベース）は 45Hz より下を切り、音量も控えめに。小さなスピーカーでも聞こえるよう倍音のある音色を使う
export const LOWCUT_BASS = { type: 'eq', bands: [{ type: 'hp', freq: 45, slope: 24 }, { type: 'peak', freq: 90, gain: -2, q: 0.9 }] };
// ベース以外は 120Hz より下をすっきりさせる（低音がたまらないように）
export const LOWCUT = (f = 140) => ({ type: 'eq', bands: [{ type: 'hp', freq: f }] });

// キックを軽く（胴鳴りを短く・低音を少なく）
export const LIGHT_KICK = { kick: { tone: 0.25, length: 0.7 } };

// ---- 曲 ----
// master：-16 LUFS にそろえる。40Hz より下を急峻に切り、100Hz 付近を少し下げて、低音が大きくなり過ぎないようにする
export function song({ id, name, bpm, key, bars, chords, tracks, loop = true, tail = 3, sends, sig = [4, 4], master = {} }) {
  return {
    id,
    loop,
    json: {
      name,
      bpm,
      sig,
      bars,
      key,
      tail,
      ...(chords ? { chords } : {}),
      sends: sends ?? {
        reverb: { size: 1.1, decay: 1.8, damp: 6500, predelay: 0.02, volume: 0 },
        delay: { time: '1/8d', feedback: 0.3, tone: 4500, volume: 0 },
      },
      master: {
        loudness: -16,
        ceiling: -1.5,
        fx: [
          { type: 'eq', bands: [{ type: 'hp', freq: 40, slope: 24 }, { type: 'lowshelf', freq: 110, gain: -2 }] },
          { type: 'comp', threshold: -18, ratio: 2, attack: 0.02, release: 0.2, knee: 8, makeup: 0 },
        ],
        ...master,
      },
      tracks,
    },
  };
}
