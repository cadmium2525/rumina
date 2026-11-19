// 地図にある全ステージにグレイコインを 1 枚ずつ置く: node tools/place_coins.mjs [id …]
// 置く場所は、通しの確認（tools/check_route.mjs）で見つけた「ダメージを受けずにゴールまで行く操作」を再生し、
// ステージの中ほど（幅の 35〜75%）で、ルミナが立った（足もとから 24px 以内に床がある）所のうち、いちばん高い所。
// 高い足場まで登れば歩いて取れて、取った後もゴールまで行ける場所になる。js/stages/*.js のデータの spawns に graycoin を書き足す（前のものは置きかえる）。
// お城はお城のステージ（ボス部屋ではない）、最終コースは 2 区間目（LAST-2）に置く。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRoute } from './check_route.mjs';
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { OW_MAPS } from '../js/overworld/maps.js';
import { PAD2 } from '../js/player.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = fs.readFileSync(path.join(ROOT, 'js/stages/index.js'), 'utf8');
// id → ステージのファイル
const fileOf = {};
const constFile = Object.fromEntries([...INDEX.matchAll(/import \{ (\w+) \} from '\.\/([\w.]+)';/g)].map((m) => [m[1], m[2]]));
for (const m of INDEX.matchAll(/id: '([^']+)', make: \(\) => (\w+)/g)) fileOf[m[1]] = constFile[m[2]];
// 1-1 はプログラムで作るステージ（akihabara.js の return の前に spawn('graycoin', …) を書く）
fileOf['1-1'] = 'akihabara.js';

// コインを置くステージ：地図の点のステージと、最終コース（2 区間目）
const ids = new Set();
for (const m of Object.values(OW_MAPS)) {
  for (const n of Object.values(m.nodes)) {
    if (n.stage && fileOf[n.stage]) ids.add(n.stage);
    if (n.home) ids.add('LAST-2');
  }
}
const only = process.argv.slice(2);
const targets = only.length ? only : [...ids];

// 見つけた操作を再生して、毎フレームの位置を集める（enemies：敵も出して探した道。check_route.mjs と同じ出し方）
function replay(id, route, enemies) {
  const w = new World(STAGES.find((s) => s.id === id).make());
  w.introTimer = 0;
  if (enemies) w.points = w.points.filter((pt) => pt.type !== 'gift' && pt.type !== 'shell');
  else {
    w.points = [];
    w.shooters = [];
  }
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.player.powerUp = 1;
  let p1 = 0, p2 = 0;
  const pos = [];
  for (const a of route.path) {
    for (let i = 0; i < 8; i++) {
      const h1 = a & 0xff, h2 = a & 0x100 ? PAD2.A : 0;
      w.step({ hold1: h1, press1: h1 & ~p1, hold2: h2, press2: h2 & ~p2 });
      p1 = h1;
      p2 = h2;
      w.message = null;
      w.actors = enemies ? w.actors.filter((x) => x.type !== 'light') : w.actors.filter((x) => x.type === 'goal');
      // 足もとから床までの高さ
      const p = w.player;
      let fd = 999;
      for (let d = 0; d <= 24; d += 4) if (w.level.floorPx(p.xpos + 8, p.ypos + 32 + d)) { fd = d; break; }
      pos.push({ x: p.xpos, y: p.ypos, ok: p.state === 0 && !p.endTimer && !p.swimming, nearFloor: fd <= 24,
        floorRow: fd <= 24 ? Math.floor((p.ypos + 32 + fd) / 16) : null });
    }
  }
  return { w, pos };
}

for (const id of targets) {
  const t0 = Date.now();
  // 5-2 などの扉は寄り道なので、ふつうのゴールまでの道で探す（お城の扉はボス部屋への道）
  const st = STAGES.find((s) => s.id === id);
  const lv0 = st.make();
  const castle = /-5$/.test(id) || id.startsWith('LAST');
  const doorOk = castle || !lv0.goal;
  let enemies = false;
  let route = findRoute(id, { noDamage: true, doorOk });
  if (!route.ok) route = findRoute(id, { doorOk });
  // ドローンを踏み台にする所があるステージ（5-4・5-? など）は、敵も出して探す
  if (!route.ok) {
    enemies = true;
    route = findRoute(id, { doorOk, enemies });
  }
  if (!route.ok) {
    console.log(`${id}: 道が見つからない`);
    continue;
  }
  const { w, pos } = replay(id, route, enemies);
  const W = w.level.widthPx;
  const lo = W * 0.35, hi = W * 0.75;
  let best = null;
  for (const p of pos) {
    if (!p.ok || !p.nearFloor || p.x < lo || p.x > hi) continue;
    if (!best || p.y < best.y) best = p;
  }
  // 床の近くが無い（泳ぐ・空を渡るだけ）なら、中ほどのいちばん高い所
  if (!best) for (const p of pos) if (p.ok && p.x >= lo && p.x <= hi && (!best || p.y < best.y)) best = p;
  if (!best) best = pos[Math.floor(pos.length / 2)];
  let tx = Math.floor((best.x + 8) / 16);
  // 床の近くなら、その床のすぐ上のマス（立ったまま・歩いて取れる）。そうでなければ体の高さ
  let ty = best.nearFloor ? best.floorRow - 1 : Math.floor((best.y + 14) / 16);
  const lv = w.level;
  if (lv.solidPx(tx * 16 + 8, ty * 16 + 8)) ty--;
  // ステージのデータを書きかえる
  const file = path.join(ROOT, 'js/stages', fileOf[id]);
  const src = fs.readFileSync(file, 'utf8');
  if (fileOf[id] === 'akihabara.js') {
    const line = `  spawn('graycoin', ${tx}, ${ty}); // グレイコイン（tools/place_coins.mjs）\n`;
    const out = src.replace(/  spawn\('graycoin'.*\n/, '').replace(/(  return l\.toData\(\);)/, `${line}$1`);
    fs.writeFileSync(file, out);
    console.log(`${id}: (${tx}, ${ty})  幅 ${lv.width}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    continue;
  }
  const m = src.match(/^([\s\S]*?export const \w+ = )(\{[\s\S]*\});\s*$/);
  const data = JSON.parse(m[2]);
  data.spawns = (data.spawns ?? []).filter((s) => s.type !== 'graycoin');
  data.spawns.push({ type: 'graycoin', tx, ty });
  fs.writeFileSync(file, `${m[1]}${JSON.stringify(data)};\n`);
  console.log(`${id}: (${tx}, ${ty})  幅 ${lv.width}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
