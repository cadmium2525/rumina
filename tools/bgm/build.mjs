#!/usr/bin/env node
// BGM を作る：songs.mjs の曲を「かなでる」（cadmium2525/mp4mp3 の daw）のエンジンで音にして、bgm/*.mp3 と js/bgm_list.js を書き出す
//
//   node tools/bgm/build.mjs [--daw ../mp4mp3/daw] [--only title,map] [--sheet 出力フォルダ] [--json]
//
// - ループする曲は、最後の余韻（リバーブ・のびた音）を曲の頭に重ねて、継ぎ目なくくり返せるようにする。
//   MP3 は頭に少し無音が入ることがあるので、ループの後ろに頭の 1 秒をつけ足し、ループ区間は 0.5 秒目から 1 周分にする
//   （どこで区切っても同じ音が続くので、無音の長さが分からなくても継ぎ目が出ない）
// - 低音が大きくなり過ぎていないかを調べる（基準：バランスのよいポップスより低域が軽いこと・スマホのスピーカーでの聞こえ方）
// - --json で tools/bgm/json に曲の JSON も書く（かなでる の「JSON を貼り付け」で開いて直せる）
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name, def = null) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const bool = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const dawArg = flag('--daw');
const only = flag('--only')?.split(',');
const sheetDir = flag('--sheet');
const writeJson = bool('--json');
const noWrite = bool('--dry');

const DAW = [dawArg, process.env.KANADERU_DAW, join(ROOT, '../mp4mp3/daw'), join(ROOT, '../cadmium2525/mp4mp3/daw')].find((p) => p && existsSync(join(p, 'js/engine/mix.js')));
if (!DAW) {
  console.error('かなでる（cadmium2525/mp4mp3 の daw フォルダ）が見つかりません。--daw でフォルダを指定してください');
  process.exit(1);
}
const eng = (f) => import(pathToFileURL(join(DAW, 'js/engine', f)).href);
const { renderSong } = await eng('mix.js');
const { analyzeAudio, THIRD_OCT } = await eng('analyze.js');
const { validateSong } = await eng('validate.js');
const { encodeWav } = await eng('wav.js');
const { SONGS } = await import('./songs.mjs');

// ---- 低音の基準 ----
// 帯域のエネルギー（dB）：低域（60〜250Hz）−中域（500〜2kHz）。バランスのよいポップスの基準は約 +5dB。
// ゲームの BGM なので、それより 3dB 以上軽い +2dB 以下にする。超低域（〜60Hz）は中域より 10dB 以上小さく。
// スマホのスピーカーでの減り（phoneLoss）は 7dB 以下
const LIMIT = { bassMinusMid: 2, subMinusMid: -10, phoneLoss: 7 };

const HEAD = 1.0; // ループの後ろにつけ足す秒数
const LOOP_START = 0.5;

const list = {};
const listPath = join(ROOT, 'js/bgm_list.js');
// 一部だけ作り直す時は、ほかの曲の情報を残す
if (only && existsSync(listPath)) {
  const m = /export const BGM = (\{[\s\S]*\});/.exec(readFileSync(listPath, 'utf8'));
  if (m) Object.assign(list, JSON.parse(m[1]));
}
mkdirSync(join(ROOT, 'bgm'), { recursive: true });
if (writeJson) mkdirSync(join(ROOT, 'tools/bgm/json'), { recursive: true });
if (sheetDir) mkdirSync(sheetDir, { recursive: true });

let bad = 0;
for (const s of SONGS) {
  if (only && !only.includes(s.id)) continue;
  const song = s.json;
  const chk = validateSong(song);
  for (const e of chk.errors) console.error(`✗ ${s.id}: ${e}`);
  for (const w of chk.warnings) console.error(`△ ${s.id}: ${w}`);
  if (chk.errors.length) { bad++; continue; }
  if (writeJson) writeFileSync(join(ROOT, `tools/bgm/json/${s.id}.json`), JSON.stringify(song, null, 1));
  const { L, R, sr } = renderSong(song, {});
  const secPerBeat = 60 / song.bpm;
  const loopN = Math.round(song.bars * song.sig[0] * secPerBeat * sr);
  let outL, outR, info;
  if (s.loop) {
    // 余韻を頭に重ねる
    const l = new Float32Array(loopN), r = new Float32Array(loopN);
    l.set(L.subarray(0, loopN));
    r.set(R.subarray(0, loopN));
    for (let i = loopN; i < L.length; i++) {
      l[(i - loopN) % loopN] += L[i];
      r[(i - loopN) % loopN] += R[i];
    }
    peakGuard(l, r, -1.5);
    // ループ＋頭の 1 秒
    const head = Math.round(HEAD * sr);
    outL = new Float32Array(loopN + head);
    outR = new Float32Array(loopN + head);
    for (let i = 0; i < outL.length; i++) { outL[i] = l[i % loopN]; outR[i] = r[i % loopN]; }
    info = { loop: [LOOP_START, round(LOOP_START + loopN / sr, 6)] };
  } else {
    // ジングル：後ろの無音を切って、最後をなめらかに消す
    let end = L.length;
    while (end > sr && Math.max(Math.abs(L[end - 1]), Math.abs(R[end - 1])) < 0.0005) end--;
    outL = L.slice(0, end);
    outR = R.slice(0, end);
    const fade = Math.round(0.08 * sr);
    for (let i = 0; i < fade; i++) { const g = i / fade; outL[end - 1 - i] *= g; outR[end - 1 - i] *= g; }
    info = { loop: null };
  }
  // 解析（ループはつなぎ目をまたいで調べる）
  const a = analyzeAudio(outL, outR, sr, { bpm: song.bpm, beatsPerBar: song.sig[0], targetLufs: -16 });
  const b = a.bands;
  const bassMid = round(b.bass - b.mid, 1);
  const subMid = round(b.sub - b.mid, 1);
  const ng = [];
  if (bassMid > LIMIT.bassMinusMid) ng.push(`低域が多い（低域−中域 ${bassMid}dB > ${LIMIT.bassMinusMid}）`);
  if (subMid > LIMIT.subMinusMid) ng.push(`超低域が多い（${subMid}dB > ${LIMIT.subMinusMid}）`);
  if (a.phoneLoss > LIMIT.phoneLoss) ng.push(`スマホのスピーカーで ${a.phoneLoss}dB 小さくなる（> ${LIMIT.phoneLoss}）`);
  if (a.clicks.length) ng.push(`クリックノイズの疑い ${a.clicks.slice(0, 4).join('s, ')}s`);
  if (a.truePeakDb > -1) ng.push(`トゥルーピーク ${a.truePeakDb}dBTP`);
  if (ng.length) bad++;
  const sec = (s.loop ? loopN : outL.length) / sr;
  console.log(`${ng.length ? '✗' : '✓'} ${s.id.padEnd(10)} ${sec.toFixed(1).padStart(5)}s  ${String(a.lufs).padStart(5)} LUFS  低域−中域 ${String(bassMid).padStart(5)}dB  超低域−中域 ${String(subMid).padStart(5)}dB  スマホ ${a.phoneLoss}dB  ${song.name}`);
  for (const m of ng) console.log(`    ${m}`);
  if (sheetDir) {
    const { drawSheet, sheetHeight, Raster, waveColumns } = await eng('viz.js');
    const { encodePng } = await import(pathToFileURL(join(DAW, 'tools/common.mjs')).href);
    const H = sheetHeight(a, song);
    const P = new Raster(1600, H);
    a._wave = waveColumns(outL, outR, 1600 - 90);
    drawSheet(P, a, { song, title: s.id, targetLufs: -16 });
    writeFileSync(join(sheetDir, `${s.id}.png`), encodePng(P.w, P.h, P.px));
  }
  if (noWrite) continue;
  // MP3（ステレオ 112kbps）
  const wav = join(ROOT, `bgm/${s.id}.tmp.wav`);
  const mp3 = join(ROOT, `bgm/${s.id}.mp3`);
  writeFileSync(wav, encodeWav(outL, outR, sr, 16));
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '112k', '-map_metadata', '-1', mp3], { stdio: 'inherit' });
  unlinkSync(wav);
  if (r.status !== 0) { console.error(`✗ ${s.id}: ffmpeg で MP3 にできません`); bad++; continue; }
  const hash = createHash('sha1').update(readFileSync(mp3)).digest('hex').slice(0, 8);
  list[s.id] = { file: `bgm/${s.id}.mp3?v=${hash}`, ...info, name: song.name };
}

if (!noWrite) {
  const order = SONGS.map((s) => s.id).filter((id) => list[id]);
  const sorted = Object.fromEntries(order.map((id) => [id, list[id]]));
  writeFileSync(listPath, `// tools/bgm/build.mjs が作るファイル（手で直さない）。BGM の場所とループ区間（秒）\nexport const BGM = ${JSON.stringify(sorted, null, 1)};\n`);
}
if (bad) {
  console.log(`\n${bad} 曲に注意があります`);
  process.exit(1);
}

function peakGuard(l, r, ceilDb) {
  let p = 0;
  for (let i = 0; i < l.length; i++) p = Math.max(p, Math.abs(l[i]), Math.abs(r[i]));
  const c = Math.pow(10, ceilDb / 20);
  if (p > c) {
    const g = c / p;
    for (let i = 0; i < l.length; i++) { l[i] *= g; r[i] *= g; }
  }
}
function round(x, k = 3) { const m = 10 ** k; return Math.round(x * m) / m; }
void THIRD_OCT;
