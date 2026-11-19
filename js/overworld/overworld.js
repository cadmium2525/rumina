// オーバーワールド（地図）の動き。DOM に依存しない（描画は overworld_view.js）。
// SMW の地図と同じく、点（ステージ）から点へ道を歩き、点の上で B/A を押すとステージに入る。
import { OW_MAPS, OW_ORDER, OW_START } from './maps.js';

export const TILE = 16;
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
const PAD_DIR = [[0x08, 'U'], [0x04, 'D'], [0x02, 'L'], [0x01, 'R']];
const WALK_SPEED = 2;   // px/フレーム（1 マス 8 フレーム）
const REVEAL_TIME = 5;  // 新しい道が 1 マス現れる間かく（フレーム）
export const SAVE_KEY = 'rumina.save';

// その文字が dir の向きへ道をのばしているか
function linksTo(ch, dir, nodes) {
  if (ch === '-') return dir === 'L' || dir === 'R';
  if (ch === '|') return dir === 'U' || dir === 'D';
  if (ch === '+') return true;
  return !!nodes[ch];
}

// 地図の文字から、点の位置と、点どうしをつなぐ道（向きごと）を作る
export function buildGraph(map) {
  const { rows, nodes } = map;
  const h = rows.length;
  const w = rows[0].length;
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] : ' ');
  const linked = (x, y, dir) => {
    const [dx, dy] = DIRS[dir];
    return linksTo(at(x, y), dir, nodes) && linksTo(at(x + dx, y + dy), OPP[dir], nodes)
      && (at(x + dx, y + dy) in nodes || '-|+'.includes(at(x + dx, y + dy)));
  };
  const pos = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (nodes[at(x, y)]) pos[at(x, y)] = { x, y };
  // edges[点][向き] = { to, tiles: [[x,y]...（行き先の点まで）], id }
  const edges = {};
  const chains = {};
  for (const [key, p] of Object.entries(pos)) {
    edges[key] = {};
    for (const dir of Object.keys(DIRS)) {
      if (!linked(p.x, p.y, dir)) continue;
      const tiles = [];
      let x = p.x, y = p.y, d = dir;
      for (let guard = 0; guard < w * h; guard++) {
        x += DIRS[d][0];
        y += DIRS[d][1];
        tiles.push([x, y]);
        if (nodes[at(x, y)]) break;
        // 来た向き以外でつながっている向きへ（まっすぐを優先）
        const next = [d, ...Object.keys(DIRS).filter((e) => e !== d && e !== OPP[d])].find((e) => linked(x, y, e));
        if (!next) { tiles.length = 0; break; } // 行き止まり（地図の書きまちがい）
        d = next;
      }
      if (!tiles.length) continue;
      const to = at(...tiles[tiles.length - 1]);
      // 同じ道は両はしの点から 1 本として数える（中のマスで見分ける）
      const id = [key, to].sort().join('') + ':' + (tiles.slice(0, -1).map((t) => t.join(',')).sort()[0] ?? '');
      edges[key][dir] = { to, tiles, id };
      chains[id] = { a: key, b: to, tiles: tiles.slice(0, -1) };
    }
  }
  return { w, h, pos, edges, chains };
}

const GRAPHS = {};
export const graphOf = (mapId) => (GRAPHS[mapId] ??= buildGraph(OW_MAPS[mapId]));

// ---- セーブ ----
export function loadSave(storage = globalThis.localStorage) {
  try {
    const d = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
    if (d && OW_MAPS[d.map] && OW_MAPS[d.map].nodes[d.node]) {
      return { cleared: [...new Set(d.cleared ?? [])], map: d.map, node: d.node, power: d.power | 0 };
    }
  } catch { /* 壊れていたら最初から */ }
  return { cleared: [], ...OW_START, power: 0 };
}

export function writeSave(save, storage = globalThis.localStorage) {
  try { storage?.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* 保存できなくても遊べる */ }
}

export class Overworld {
  // stageIds：遊べるステージの id（STAGES のうち hidden でないもの）
  constructor(save, stageIds, storage = globalThis.localStorage) {
    this.save = save;
    this.stageIds = new Set(stageIds);
    this.storage = storage;
    this.frame = 0;
    this.events = [];
    this.enterMap(save.map, save.node);
  }

  get map() { return OW_MAPS[this.mapId]; }
  get graph() { return graphOf(this.mapId); }
  get worldNo() { return OW_ORDER.indexOf(this.mapId) + 1; }
  node(key = this.nodeKey) { return this.map.nodes[key]; }
  isCleared(stage) { return this.save.cleared.includes(stage); }
  // まだ作っていないステージ
  isSoon(n) { return !!n.stage && !this.stageIds.has(n.stage); }

  // その点から道が開くか
  isOpenNode(key) {
    const n = this.node(key);
    return !!(n.start || n.entry || (n.stage && this.isCleared(n.stage)));
  }

  // 道が開いているか。隠しコースにつながる道は、隠しコースをクリアした時か、
  // つながっている点を「ひみつのゴール」でクリアした時（'1-3*'）だけ開く
  isOpenChain(c) {
    const na = this.node(c.a);
    const nb = this.node(c.b);
    if (na.hidden || nb.hidden) {
      const [hk, ok] = na.hidden ? [c.a, c.b] : [c.b, c.a];
      const h = this.node(hk);
      if (this.isCleared(h.stage)) return true;
      return h.from === ok && this.isCleared(`${this.node(ok).stage}*`);
    }
    return this.isOpenNode(c.a) || this.isOpenNode(c.b);
  }

  // ひみつのゴールがある点（赤い点）か
  hasSecret(key = this.nodeKey) {
    return Object.values(this.map.nodes).some((n) => n.hidden && n.from === key);
  }

  // 開いている道のマス（'x,y'）。表示中の新しい道（reveal）はまだ出ていない所を除く
  visibleTiles() {
    const set = new Set();
    for (const c of Object.values(this.graph.chains)) {
      if (!this.isOpenChain(c)) continue;
      for (const t of c.tiles) set.add(t.join(','));
    }
    for (const k of this.hidden) set.delete(k);
    return set;
  }

  enterMap(mapId, nodeKey) {
    this.mapId = mapId;
    this.nodeKey = nodeKey;
    const p = this.graph.pos[nodeKey];
    this.x = p.x * TILE + 8;
    this.y = p.y * TILE + 8;
    this.walk = null;
    this.dir = 'D';
    this.hidden = new Set();
    this.reveal = [];
    this.save.map = mapId;
    this.save.node = nodeKey;
  }

  // ステージをクリアした：記録して、新しく開いた道を少しずつ見せる
  markCleared(stage, power) {
    const before = new Set(Object.values(this.graph.chains).filter((c) => this.isOpenChain(c)));
    if (!this.isCleared(stage)) this.save.cleared.push(stage);
    this.save.power = power;
    this.persist();
    const p = this.graph.pos[this.nodeKey];
    for (const c of Object.values(this.graph.chains)) {
      if (before.has(c) || !this.isOpenChain(c)) continue;
      // 今いる点に近い方から順に現れる
      const tiles = c.a === this.nodeKey || (c.b !== this.nodeKey && this.near(c, p)) ? c.tiles : [...c.tiles].reverse();
      for (const t of tiles) {
        const k = t.join(',');
        this.hidden.add(k);
        this.reveal.push(k);
      }
    }
    this.revealTimer = REVEAL_TIME;
  }

  near(c, p) {
    const d = (t) => Math.abs(t[0] - p.x) + Math.abs(t[1] - p.y);
    return d(c.tiles[0]) <= d(c.tiles[c.tiles.length - 1]);
  }

  setPower(power) {
    this.save.power = power;
    this.persist();
  }

  persist() { writeSave(this.save, this.storage); }

  // 1 フレーム進める。戻り値：{ play: 'id' } でステージに入る、それ以外は null
  step(pad) {
    this.frame++;
    if (this.reveal.length) {
      // 新しい道が 1 マスずつ現れる（その間は動けない）
      if (--this.revealTimer <= 0) {
        this.hidden.delete(this.reveal.shift());
        this.revealTimer = REVEAL_TIME;
        this.events.push('reveal');
      }
      return null;
    }
    if (this.walk) {
      this.stepWalk();
      return null;
    }
    // 点の上：十字キーで歩き出す、B/A で入る
    for (const [bit, dir] of PAD_DIR) {
      if (!(pad.hold1 & bit)) continue;
      const e = this.graph.edges[this.nodeKey][dir];
      if (e && this.isOpenChain(this.graph.chains[e.id]) && !this.hidden.has(e.tiles[0].join(','))) {
        this.walk = { tiles: e.tiles, i: 0, to: e.to };
        this.dir = dir;
        return null;
      }
      if (pad.press1 & bit) this.events.push('bump');
    }
    if ((pad.press1 & 0x80) || (pad.press2 & 0x80)) return this.enter();
    return null;
  }

  stepWalk() {
    const [tx, ty] = this.walk.tiles[this.walk.i];
    const gx = tx * TILE + 8;
    const gy = ty * TILE + 8;
    const dx = Math.sign(gx - this.x);
    const dy = Math.sign(gy - this.y);
    if (dx) this.dir = dx > 0 ? 'R' : 'L';
    else if (dy) this.dir = dy > 0 ? 'D' : 'U';
    this.x += dx * Math.min(WALK_SPEED, Math.abs(gx - this.x));
    this.y += dy * Math.min(WALK_SPEED, Math.abs(gy - this.y));
    if (this.x === gx && this.y === gy && ++this.walk.i >= this.walk.tiles.length) {
      this.nodeKey = this.walk.to;
      this.walk = null;
      this.dir = 'D';
      this.save.node = this.nodeKey;
      this.persist();
      this.events.push('arrive');
    }
  }

  // 点に入る：ステージなら { play }、ワープなら別の地図へ
  enter() {
    const n = this.node();
    if (n.stage) {
      if (this.isSoon(n)) {
        this.events.push('bump');
        return null;
      }
      this.events.push('enter');
      return { play: n.stage };
    }
    if (n.warp && this.canWarp()) {
      this.events.push('warp');
      return { warp: n.warp, at: n.at };
    }
    return null;
  }

  // ワープの点へ道が来ているか（入口はいつも使える）
  canWarp(key = this.nodeKey) {
    return this.isOpenNode(key) || Object.values(this.graph.edges[key]).some((e) => this.isOpenChain(this.graph.chains[e.id]));
  }

  // ワープ先の地図へ
  warpTo({ warp, at }) {
    this.enterMap(warp, at);
    this.persist();
  }

  // 下の文字（地図の下に出す説明）
  label(key = this.nodeKey) {
    const n = this.node(key);
    if (n.label) return n.label;
    return n.stage;
  }

  // 地図全体の出口の数（SMW の「出口の数」）。遊べるステージのゴールと、
  // 隠しコースが遊べるワールドのひみつのゴールを 1 つずつ数える
  progress() {
    const exits = [];
    for (const m of Object.values(OW_MAPS)) {
      for (const n of Object.values(m.nodes)) {
        if (!n.stage || !this.stageIds.has(n.stage)) continue;
        exits.push(n.stage);
        if (n.hidden && this.stageIds.has(m.nodes[n.from].stage)) exits.push(`${m.nodes[n.from].stage}*`);
      }
    }
    return { done: exits.filter((e) => this.isCleared(e)).length, total: exits.length };
  }
}
