// BGM のテスト: node tests/bgm.test.mjs
// - どのステージにも曲があり、ファイルがある（ボス部屋・最後のボス・最終コース・ルミナの家）
// - ループ区間が曲の中に収まっている。ジングル（ゴール・ミス・エンディング）はループしない
// - 曲の定義（tools/bgm/songs.mjs）と作ったもの（js/bgm_list.js）がそろっている
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { BGM } from '../js/bgm_list.js';
import { musicFor } from '../js/bgm.js';
import { STAGES } from '../js/stages/index.js';
import { SONGS } from '../tools/bgm/songs.mjs';

const root = new URL('../', import.meta.url);
for (const [name, info] of Object.entries(BGM)) {
  const path = new URL(info.file.replace(/\?.*$/, ''), root);
  assert.ok(existsSync(path), `${name}: ${info.file} が無い`);
  const kb = statSync(path).size / 1024;
  assert.ok(kb > 30 && kb < 1200, `${name}: ${Math.round(kb)}KB`);
  assert.match(info.file, /\?v=[0-9a-f]{8}$/, `${name}: 版の印が無い`);
  if (info.loop) {
    const [a, b] = info.loop;
    assert.equal(a, 0.5, `${name}: ループの始まり`);
    assert.ok(b - a > 15 && b - a < 60, `${name}: ループの長さ ${b - a}`);
  }
}
for (const j of ['clear', 'miss', 'ending']) assert.equal(BGM[j]?.loop, null, `${j} はループしない`);
for (const l of ['title', 'map', 'boss', 'lastboss', 'final', 'house']) assert.ok(BGM[l]?.loop, `${l} はループする`);
assert.deepEqual(Object.keys(BGM), SONGS.map((s) => s.id), 'songs.mjs と bgm_list.js がそろっていない（node tools/bgm/build.mjs で作り直す）');

// ステージごとの曲
const used = new Set();
for (const st of STAGES) {
  const m = musicFor(st.id, st.make());
  assert.ok(BGM[m]?.loop, `${st.id}: 曲 ${m} が無い`);
  used.add(m);
}
assert.equal(musicFor('1-1', STAGES.find((s) => s.id === '1-1').make()), 'akiba');
assert.equal(musicFor('1-5B', STAGES.find((s) => s.id === '1-5B').make()), 'boss');
assert.equal(musicFor('8-5B', STAGES.find((s) => s.id === '8-5B').make()), 'lastboss');
assert.equal(musicFor('LAST-2', STAGES.find((s) => s.id === 'LAST-2').make()), 'final');
assert.equal(musicFor('HOME', STAGES.find((s) => s.id === 'HOME').make()), 'house');
// エディタで作ったステージ（id なし）はテーマで決まる。知らないテーマは草原
assert.equal(musicFor(undefined, { theme: 'neon' }), 'neon');
assert.equal(musicFor(undefined, { theme: '???' }), 'grass');
// ステージの曲は、タイトル・地図・ジングル以外ぜんぶ使われている
for (const s of SONGS) {
  if (['title', 'map', 'clear', 'miss', 'ending'].includes(s.id)) continue;
  assert.ok(used.has(s.id), `${s.id} がどのステージでも使われていない`);
}
console.log('bgm ok');
