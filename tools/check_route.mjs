// ステージが（敵なしで）スタートからゴールまで通れるかを、操作の列を探して確かめる。
//   node tools/check_route.mjs 6-1 6-2 ...        ふつうのゴール（お城はボス扉）まで
//   node tools/check_route.mjs 6-2:secret         ひみつのゴールまで
//   node tools/check_route.mjs 1-3:secret@95,10   スタート位置を変える（x, 足もとの段。そこで ↑ を押してツタにつかまる）
//   node tools/check_route.mjs --enemies 5-4      敵・砲台も出して探す（ドローンを踏み台にする所など）
//   node tools/check_route.mjs --no-damage E-1    ダメージを受けずに通れる道を探す
// 8 フレームごとに操作（右・走る・B・左・↑…）を選ぶビームサーチ。敵・砲台・アイテムは出さず、
// ルミナは大きい状態。フレーム単位の操作は使わないので、見つかる道は人の操作でも再現できる程度のもの。
import { World } from '../js/world.js';
import { STAGES } from '../js/stages/index.js';
import { PAD, PAD2 } from '../js/player.js';

const MACRO = 8;
const R = PAD.RIGHT, L = PAD.LEFT, B = PAD.B, Y = PAD.Y;
const U = PAD.UP;
// ↑ は扉に入る・ツタやハシゴにつかまる・水面から跳び出す（↑+B）のに使う
// A（スピンジャンプ）は 2 つ目のパッドなので 0x100 で表す
const A = 0x100;
const ACTIONS = [R, R | Y, R | B, R | Y | B, 0, B, L, L | B, L | Y, U, U | R, U | B, U | R | B, R | A, A];
const BEAM = 400;
const PER = 4;

const prim = (o) => {
  if (!o) return null;
  const r = {};
  for (const [k, v] of Object.entries(o)) if (v === null || typeof v !== 'object') r[k] = v;
  return r;
};

function makeWorld(id, enemies) {
  const st = STAGES.find((s) => s.id === id);
  if (!st) throw new Error(`no stage ${id}`);
  const w = new World(st.make());
  w.introTimer = 0;
  w.enemies = enemies;
  if (enemies) {
    // 持てる物は出さない（持った物は状態を戻せないため）
    w.points = w.points.filter((pt) => pt.type !== 'gift' && pt.type !== 'shell');
  } else {
    w.points = [];
    w.shooters = [];
  }
  w.actors = w.actors.filter((a) => a.type === 'goal');
  w.player.powerUp = 1;
  // タイルの書きかえ（？ブロック・ターンブロック）を記録して、状態を戻せるようにする
  const lv = w.level;
  const base = lv.tiles.slice();
  w.changes = new Map();
  const set = lv.set.bind(lv);
  lv.set = (tx, ty, v) => {
    set(tx, ty, v);
    const i = ty * lv.width + tx;
    if (i >= 0 && i < base.length) w.changes.set(i, v);
  };
  w.baseTiles = base;
  return w;
}

// スプライトの写し（中の物への参照は持たない）
const copyActor = (a) => Object.assign(Object.create(Object.getPrototypeOf(a)), prim(a));

function snap(w) {
  const actors = w.enemies ? w.actors.map(copyActor) : null;
  return {
    actors,
    // 出ている敵がもう消えていたら「使った」にする（updateSpawns が次のフレームでするのと同じ）
    points: w.enemies ? w.points.map((pt) => {
      const i = pt.actor ? w.actors.indexOf(pt.actor) : -1;
      return { state: pt.state === 'live' && i < 0 ? 'used' : pt.state, i };
    }) : null,
    shooters: w.enemies ? w.shooters.map((sh) => sh.timer) : null,
    p: prim(w.player),
    changes: new Map(w.changes),
    notes: w.level.notes.map((n) => ({ ...n })),
    bounces: w.level.bounces.map((b) => ({ ...b })),
    cam: prim(w.camera),
    frame: w.frame,
    prev1: w._prev1 ?? 0,
    prev2: w._prev2 ?? 0,
    goal: prim(w.goal),
    sgoal: prim(w.secretGoal),
  };
}

function restore(w, s) {
  Object.assign(w.player, s.p);
  w.player.carrying = null;
  w.player.smokeRequests = [];
  const lv = w.level;
  for (const i of w.changes.keys()) lv.tiles[i] = w.baseTiles[i];
  for (const [i, v] of s.changes) lv.tiles[i] = v;
  w.changes = new Map(s.changes);
  lv.notes = s.notes.map((n) => ({ ...n }));
  lv.bounces = s.bounces.map((b) => ({ ...b }));
  Object.assign(w.camera, s.cam);
  w.frame = s.frame;
  w._prev1 = s.prev1;
  w._prev2 = s.prev2;
  if (w.goal) Object.assign(w.goal, s.goal);
  if (w.secretGoal) Object.assign(w.secretGoal, s.sgoal);
  if (w.enemies) {
    w.actors = s.actors.map((a) => (a.type === 'goal' ? (a.secret ? w.secretGoal : w.goal) : copyActor(a)));
    s.points.forEach((pt, i) => {
      w.points[i].state = pt.state;
      w.points[i].actor = pt.i >= 0 ? w.actors[pt.i] : null;
    });
    s.shooters.forEach((t, i) => { w.shooters[i].timer = t; });
  } else {
    w.actors = [w.goal, w.secretGoal].filter(Boolean);
  }
  w.events.length = 0;
  w.effects.length = 0;
  w.message = null;
  w.doorEntered = false;
  w.secretExit = false;
}

// 1 つの操作を MACRO フレーム続ける。結果：'dead' | 'goal' | 'secret' | 'door' | null
function act(w, hold) {
  for (let f = 0; f < MACRO; f++) {
    const h1 = hold & 0xff;
    const h2 = hold & A ? PAD2.A : 0;
    const p1 = w._prev1 ?? 0;
    const p2 = w._prev2 ?? 0;
    w.step({ hold1: h1, press1: h1 & ~p1, hold2: h2, press2: h2 & ~p2 });
    w._prev1 = h1;
    w._prev2 = h2;
    w.message = null;
    if (!w.enemies) w.actors = w.actors.filter((a) => a.type === 'goal');
    else w.actors = w.actors.filter((a) => a.type !== 'light'); // 光の玉は取らない（大きいまま）
    w.events.length = 0;
    const p = w.player;
    if (p.state === 9 || p.dead) return 'dead';
    if (w.doorEntered) return 'door';
    if (p.endTimer) return w.secretExit ? 'secret' : 'goal';
  }
  return null;
}

// noDamage：ダメージを受けた候補も捨てる（ダメージを受けずに通れるかを調べる）
export function findRoute(id, { want = 'goal', maxDepth = 900, beam = BEAM, log = false, from = null, enemies = false, noDamage = false } = {}) {
  const w = makeWorld(id, enemies);
  if (from) {
    // 途中から：その場所に置いて、ツタ・ハシゴがあればつかまる
    const p = w.player;
    p.xpos = from[0] * 16;
    p.ypos = from[1] * 16 - 32;
    p.inAir = 0x24;
    act(w, PAD.UP);
  }
  let front = [{ s: snap(w), path: [] }];
  let best = 0;
  for (let depth = 0; depth < maxDepth && front.length; depth++) {
    const next = new Map();
    for (const node of front) {
      for (const a of ACTIONS) {
        restore(w, node.s);
        const r = act(w, a);
        if (r === 'dead') continue;
        if (noDamage && (!w.player.powerUp || w.player.hurtTimer)) continue;
        const path = node.path.concat(a);
        if (r && (r === want || (want === 'goal' && r === 'door'))) return { ok: true, depth, frames: path.length * MACRO, path };
        if (r) continue; // 目的と違うゴール
        const p = w.player;
        // 敵がいる時は、ダメージを受けたかも区別する
        const key = `${p.xpos >> 2},${p.ypos >> 2},${(p.xspeed << 24) >> 26},${(p.yspeed << 24) >> 27},${p.inAir ? 1 : 0},${p.powerUp}`;
        if (next.has(key)) continue;
        // 目的に近いほど良い：ひみつのゴールは高さも見る
        const sg = w.level.secretGoal;
        let score = p.xpos - (p.powerUp ? 0 : 64); // 小さくなった候補は少し後回し
        // ひみつのゴールはゴールの場所までの近さ（横 + 縦×4）。上の屋上や下の洞窟など、横だけ見ても近づけない所にあるため
        if (want === 'secret' && sg) score = -(Math.abs(p.xpos - sg.tx * 16) + 4 * Math.abs(p.ypos + 32 - (sg.ty + 1) * 16)) - (p.powerUp ? 0 : 64);
        next.set(key, { s: snap(w), path, score });
        best = Math.max(best, p.xpos);
      }
    }
    // 候補の幅を保つ：同じマス（横・縦）と空中/地上の組ごとに PER 個まで。
    // 先へ進んだ空中の候補（もう助からないものも多い）ばかりで埋まらないようにする
    const sorted = [...next.values()].sort((a, b) => b.score - a.score);
    const per = new Map();
    front = [];
    for (const n of sorted) {
      const p = n.s.p;
      const k = `${p.xpos >> 4},${p.ypos >> 4},${p.inAir ? 1 : 0}`;
      const c = per.get(k) ?? 0;
      if (c >= PER) continue;
      per.set(k, c + 1);
      front.push(n);
      if (front.length >= beam) break;
    }
    if (log && depth % 20 === 0) console.log(`  depth ${depth} best x ${(best / 16).toFixed(1)} front ${front.length}`);
  }
  return { ok: false, best: best / 16 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const enemies = process.argv.includes('--enemies');
  const noDamage = process.argv.includes('--no-damage');
  for (const arg of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
    const [id, rest = ''] = arg.split(':');
    const [kind, at] = rest.split('@');
    const t0 = Date.now();
    const from = at ? at.split(',').map(Number) : null;
    const r = findRoute(id, { want: kind === 'secret' ? 'secret' : 'goal', log: !!process.env.LOG, from, enemies, noDamage });
    console.log(`${arg}: ${r.ok ? `ok (${r.frames} フレーム)` : `通れない？ 最も進んだ x=${r.best.toFixed(1)}`} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
