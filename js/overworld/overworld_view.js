// オーバーワールド（地図）の描画
import { OW_MAPS } from './maps.js';
import { TILE } from './overworld.js';
import { POSE } from '../player.js';
import { SCREEN_W, SCREEN_H } from '../level.js';
import { gridToCanvas } from '../sprites.js';
import { GRAYCOIN_SMALL, PAL_GRAYCOIN_SMALL } from '../graycoin_art.js';

const K = '#24141c';

// テーマごとの色：地面 2 色・道・水（と波）・山・木・飾り
const THEMES = {
  meadow: { land: ['#78c850', '#6cbc48'], spot: '#94d868', path: ['#f6e0a0', '#b08850'], water: ['#4888e8', '#a8d0ff'],
    mount: ['#a07a50', '#d8b080', '#6a4a30'], tree: ['#2f8a34', '#58c048', '#7a4a20'], deco: ['#ff8ac0', '#ffe060'] },
  desert: { land: ['#ecc87c', '#e2bc6c'], spot: '#f6dc98', path: ['#fff2c8', '#b08850'], water: ['#3aa8e0', '#b0e8ff'],
    mount: ['#c89850', '#f0c878', '#8a6030'], tree: ['#3c9a40', '#78c850', '#8a5a28'], deco: ['#3c9a40', '#78c850'] },
  lake: { land: ['#88d070', '#7cc464'], spot: '#a4e088', path: ['#f6e0a0', '#b08850'], water: ['#3890e0', '#98d0ff'],
    mount: ['#8a9a6a', '#c0d098', '#5a6a40'], tree: ['#2f8a34', '#58c048', '#7a4a20'], deco: ['#ffffff', '#ffe060'] },
  cave: { land: ['#5a4a78', '#52426e'], spot: '#6a5a8a', path: ['#c8b8e8', '#3a2c50'], water: ['#2a5aa0', '#70a8f0'],
    mount: ['#3a3050', '#6a5a8a', '#241c34'], tree: ['#3a3050', '#6a5a8a', '#241c34'], deco: ['#70f4ff', '#d0ffff'] },
  sky: { land: ['#f4f8ff', '#e6eefc'], spot: '#ffffff', path: ['#ffe8a0', '#c09040'], water: ['#78b0f8', '#a8d0ff'],
    mount: ['#ffffff', '#ffffff', '#b8c8e8'], tree: ['#ffffff', '#ffffff', '#b8c8e8'], deco: ['#ffe070', '#ffffff'] },
  city: { land: ['#4a4460', '#443e58'], spot: '#56506c', path: ['#ffd0f0', '#8a3a7a'], water: ['#304890', '#6080d0'],
    mount: ['#3a2c6a', '#ffe8a0', '#241c44'], tree: ['#3a2c6a', '#ffe8a0', '#241c44'], deco: ['#ff6ec7', '#6ef0ff'] },
  volcano: { land: ['#5a3a34', '#52342e'], spot: '#6a4840', path: ['#ffc890', '#7a3020'], water: ['#f06020', '#ffd040'],
    mount: ['#3a2420', '#7a4a3a', '#241410'], tree: ['#3a2420', '#7a4a3a', '#241410'], deco: ['#ffb030', '#ff6020'] },
  dark: { land: ['#3a3050', '#342a48'], spot: '#463a5e', path: ['#d0b8ff', '#5a3a8a'], water: ['#6a3a8a', '#b070e0'],
    mount: ['#241c34', '#5a4a78', '#140c1c'], tree: ['#4a3a30', '#6a5a4a', '#241c14'], deco: ['#b070ff', '#e0c0ff'] },
  space: { land: ['#3a3070', '#342a66'], spot: '#4a4088', path: ['#fff0a0', '#a07020'], water: ['#0c0a24', '#2a2860'],
    mount: ['#3a3070', '#6a60b0', '#1a1440'], tree: ['#3a3070', '#6a60b0', '#1a1440'], deco: ['#ffe070', '#ffffff'] },
};

// 決まった並びの「ばらつき」（毎回同じ絵になるように）
const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export class OverworldView {
  constructor(sprite) {
    this.sprite = sprite; // RuminaSprite
    this.cache = {};
    // グレイコインのバッジ（取った・まだ）
    this.coinBadge = gridToCanvas(GRAYCOIN_SMALL, PAL_GRAYCOIN_SMALL);
    const shadow = Object.fromEntries(Object.keys(PAL_GRAYCOIN_SMALL).map((k) => [k, k === 'K' ? '#000000' : '#5a5868']));
    this.coinShadow = gridToCanvas(GRAYCOIN_SMALL, shadow);
  }

  // 地形（道・点を除く、動かない部分）を 1 枚の絵にしておく
  terrain(mapId) {
    if (this.cache[mapId]) return this.cache[mapId];
    const m = OW_MAPS[mapId];
    const th = THEMES[m.theme];
    const h = m.rows.length;
    const w = m.rows[0].length;
    const c = document.createElement('canvas');
    c.width = w * TILE;
    c.height = h * TILE;
    const g = c.getContext('2d');
    const px = (x, y, col, ww = 1, hh = 1) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    const ch = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? m.rows[y][x] : '~');
    // 道と点のマスは、まわりの地形の多い方（水か地面か）で下を描く。水の上の道は、開くと橋のように現れる
    const isRoute = (c) => '-|+'.includes(c) || c in m.nodes;
    const waterCache = {};
    const isWater = (x, y) => {
      const k = `${x},${y}`;
      if (k in waterCache) return waterCache[k];
      const c = ch(x, y);
      // 空・宇宙の地図の飾り（星）は、空中に浮かべる
      let r = c === '~' || (c === '*' && (m.theme === 'space' || m.theme === 'sky'));
      if (isRoute(c)) {
        let wtr = 0, land = 0;
        for (let d = 1; d <= 3 && wtr + land === 0; d++) {
          for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
            const n = ch(x + dx, y + dy);
            if (isRoute(n)) continue;
            if (n === '~') wtr++;
            else land++;
          }
        }
        r = wtr > land;
      }
      return (waterCache[k] = r);
    };
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const t = ch(tx, ty);
        const X = tx * TILE;
        const Y = ty * TILE;
        if (isWater(tx, ty)) {
          px(X, Y, th.water[0], TILE, TILE);
          // 岸：となりが地面なら、明るい縁
          if (!isWater(tx, ty - 1)) px(X, Y, th.water[1], TILE, 2);
          if (!isWater(tx - 1, ty)) px(X, Y, th.water[1], 1, TILE);
          if (!isWater(tx + 1, ty)) px(X + TILE - 1, Y, th.water[1], 1, TILE);
          if (t === '*') this.deco(g, X, Y, th, m.theme, hash(tx, ty));
          if (m.theme === 'space') {
            if (hash(tx, ty) < 0.35) px(X + Math.floor(hash(ty, tx) * 14) + 1, Y + Math.floor(hash(tx + 7, ty) * 14) + 1, '#ffffff');
            if (hash(tx + 3, ty) < 0.2) px(X + Math.floor(hash(ty + 5, tx) * 14) + 1, Y + Math.floor(hash(tx, ty + 9) * 14) + 1, '#a8a0ff');
          }
          continue;
        }
        // 地面（市松のばらつき）
        px(X, Y, th.land[0], TILE, TILE);
        for (let i = 0; i < 10; i++) {
          const a = hash(tx * 31 + i, ty * 17 + i);
          px(X + Math.floor(a * 16), Y + Math.floor(hash(ty * 13 + i, tx * 7 + i) * 16), th.land[1], 2, 1);
        }
        if (t === ',') {
          g.fillStyle = th.spot;
          g.beginPath();
          g.ellipse(X + 8, Y + 9, 6, 4, 0, 0, Math.PI * 2);
          g.fill();
        }
        // 水ぎわの影
        if (isWater(tx, ty + 1)) px(X, Y + TILE - 2, th.land[1], TILE, 2);
        if (t === '^') this.mountain(g, X, Y, th, m.theme, hash(tx, ty));
        else if (t === 'T') this.tree(g, X, Y, th, m.theme);
        else if (t === '*') this.deco(g, X, Y, th, m.theme, hash(tx, ty));
        else if (t === 'B') this.building(g, X, Y, tx, ty);
      }
    }
    this.cache[mapId] = c;
    return c;
  }

  mountain(g, X, Y, th, theme, r) {
    const [body, light, dark] = th.mount;
    if (theme === 'sky') {
      // 雲の国は大きな雲
      g.fillStyle = dark;
      for (const [cx, cy, rr] of [[5, 10, 5], [10, 8, 6], [13, 11, 3]]) {
        g.beginPath();
        g.arc(X + cx, Y + cy + 1, rr, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = body;
      for (const [cx, cy, rr] of [[5, 10, 4], [10, 8, 5], [13, 11, 2]]) {
        g.beginPath();
        g.arc(X + cx, Y + cy, rr, 0, Math.PI * 2);
        g.fill();
      }
      return;
    }
    // 三角の山（火山は口が赤い）
    const top = Y + 1 + Math.floor(r * 3);
    g.fillStyle = K;
    g.beginPath();
    g.moveTo(X, Y + 15);
    g.lineTo(X + 8, top);
    g.lineTo(X + 16, Y + 15);
    g.closePath();
    g.fill();
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(X + 2, Y + 14);
    g.lineTo(X + 8, top + 2);
    g.lineTo(X + 14, Y + 14);
    g.closePath();
    g.fill();
    g.fillStyle = light;
    g.fillRect(X + 7, top + 4, 2, 3);
    g.fillStyle = dark;
    g.fillRect(X + 9, Y + 10, 4, 4);
    if (theme === 'volcano' && r > 0.5) {
      g.fillStyle = '#ff6020';
      g.fillRect(X + 7, top + 2, 2, 2);
    }
  }

  tree(g, X, Y, th, theme) {
    const [dark, light, trunk] = th.tree;
    if (theme === 'dark') {
      // 枯れ木
      g.fillStyle = trunk;
      g.fillRect(X + 7, Y + 4, 2, 11);
      g.fillRect(X + 4, Y + 6, 3, 1);
      g.fillRect(X + 9, Y + 4, 3, 1);
      g.fillRect(X + 3, Y + 5, 1, 1);
      g.fillRect(X + 12, Y + 3, 1, 1);
      return;
    }
    if (theme === 'desert') {
      // ヤシの木
      g.fillStyle = trunk;
      g.fillRect(X + 7, Y + 6, 2, 9);
      g.fillStyle = light;
      g.fillRect(X + 2, Y + 4, 12, 2);
      g.fillRect(X + 5, Y + 2, 6, 2);
      g.fillStyle = dark;
      g.fillRect(X + 2, Y + 6, 2, 2);
      g.fillRect(X + 12, Y + 6, 2, 2);
      return;
    }
    g.fillStyle = trunk;
    g.fillRect(X + 7, Y + 11, 2, 4);
    g.fillStyle = K;
    g.beginPath();
    g.arc(X + 8, Y + 7, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = dark;
    g.beginPath();
    g.arc(X + 8, Y + 7, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = light;
    g.fillRect(X + 5, Y + 4, 3, 2);
  }

  deco(g, X, Y, th, theme, r) {
    const [a, b] = th.deco;
    const ox = X + 3 + Math.floor(r * 8);
    const oy = Y + 4 + Math.floor(hash(X, Y) * 7);
    if (theme === 'desert') {
      // サボテン
      g.fillStyle = K;
      g.fillRect(ox + 1, oy - 1, 4, 10);
      g.fillStyle = a;
      g.fillRect(ox + 2, oy, 2, 8);
      g.fillRect(ox, oy + 3, 2, 1);
      g.fillRect(ox + 4, oy + 2, 2, 1);
      return;
    }
    if (theme === 'cave' || theme === 'dark' || theme === 'space' || theme === 'sky') {
      // 結晶・星・ひかり
      g.fillStyle = a;
      g.fillRect(ox + 2, oy, 1, 5);
      g.fillRect(ox, oy + 2, 5, 1);
      g.fillStyle = b;
      g.fillRect(ox + 2, oy + 2, 1, 1);
      return;
    }
    if (theme === 'city') {
      // ネオン看板
      g.fillStyle = K;
      g.fillRect(ox - 1, oy - 1, 8, 7);
      g.fillStyle = r > 0.5 ? a : b;
      g.fillRect(ox, oy, 6, 5);
      g.fillStyle = K;
      g.fillRect(ox + 1, oy + 2, 4, 1);
      return;
    }
    if (theme === 'volcano') {
      g.fillStyle = a;
      g.fillRect(ox + 1, oy + 1, 2, 2);
      g.fillStyle = b;
      g.fillRect(ox + 4, oy + 3, 1, 1);
      return;
    }
    // 花
    g.fillStyle = a;
    g.fillRect(ox, oy + 1, 3, 1);
    g.fillRect(ox + 1, oy, 1, 3);
    g.fillStyle = b;
    g.fillRect(ox + 5, oy + 4, 3, 1);
    g.fillRect(ox + 6, oy + 3, 1, 3);
  }

  building(g, X, Y, tx, ty) {
    const hgt = 8 + Math.floor(hash(tx, ty) * 7);
    g.fillStyle = K;
    g.fillRect(X + 1, Y + 15 - hgt, 14, hgt + 1);
    g.fillStyle = ['#3a2c6a', '#43327a', '#33285c'][Math.floor(hash(ty, tx) * 3)];
    g.fillRect(X + 2, Y + 16 - hgt, 12, hgt - 1);
    for (let wy = Y + 18 - hgt; wy < Y + 14; wy += 3) {
      for (let wx = X + 3; wx < X + 13; wx += 3) {
        g.fillStyle = hash(wx, wy) < 0.55 ? '#ffe8a0' : '#2a2050';
        g.fillRect(wx, wy, 2, 2);
      }
    }
  }

  // 道のマス：つながっている向きへ帯をのばす
  drawPath(g, ow, tx, ty, X, Y, th) {
    const m = ow.map;
    const at = (x, y) => (y >= 0 && y < m.rows.length && x >= 0 && x < m.rows[0].length ? m.rows[y][x] : ' ');
    const t = at(tx, ty);
    const dirs = [];
    const ok = (dx, dy, needs) => {
      const n = at(tx + dx, ty + dy);
      return n in m.nodes || n === '+' || n === needs;
    };
    if (t === '-' || t === '+') {
      if ((t === '-' || ok(-1, 0, '-')) && (t === '-' || at(tx - 1, ty) !== '|')) dirs.push([-1, 0]);
      if ((t === '-' || ok(1, 0, '-')) && (t === '-' || at(tx + 1, ty) !== '|')) dirs.push([1, 0]);
    }
    if (t === '|' || t === '+') {
      if ((t === '|' || ok(0, -1, '|')) && (t === '|' || at(tx, ty - 1) !== '-')) dirs.push([0, -1]);
      if ((t === '|' || ok(0, 1, '|')) && (t === '|' || at(tx, ty + 1) !== '-')) dirs.push([0, 1]);
    }
    const [light, edge] = th.path;
    g.fillStyle = edge;
    g.fillRect(X + 5, Y + 5, 6, 6);
    for (const [dx, dy] of dirs) {
      if (dx) g.fillRect(dx < 0 ? X : X + 8, Y + 5, 8, 6);
      else g.fillRect(X + 5, dy < 0 ? Y : Y + 8, 6, 8);
    }
    // 点線（SMW の道のように）
    g.fillStyle = light;
    g.fillRect(X + 6, Y + 6, 4, 4);
    for (const [dx, dy] of dirs) {
      if (dx) g.fillRect(dx < 0 ? X + 1 : X + 11, Y + 6, 4, 4);
      else g.fillRect(X + 6, dy < 0 ? Y + 1 : Y + 11, 4, 4);
    }
  }

  drawNode(g, ow, key, X, Y, frame) {
    const n = ow.node(key);
    const open = ow.isOpenNode(key);
    if (n.start) {
      // ルミナの家
      g.fillStyle = K;
      g.fillRect(X + 2, Y + 6, 12, 9);
      g.beginPath();
      g.moveTo(X, Y + 7);
      g.lineTo(X + 8, Y);
      g.lineTo(X + 16, Y + 7);
      g.fill();
      g.fillStyle = '#4470d0';
      g.beginPath();
      g.moveTo(X + 2, Y + 6);
      g.lineTo(X + 8, Y + 1);
      g.lineTo(X + 14, Y + 6);
      g.fill();
      g.fillStyle = '#faf8ec';
      g.fillRect(X + 3, Y + 7, 10, 7);
      g.fillStyle = '#96522e';
      g.fillRect(X + 7, Y + 10, 3, 4);
      g.fillStyle = '#ffe070';
      g.fillRect(X + 4, Y + 8, 2, 2);
      if (ow.homeOpen?.(n)) {
        // 入れるようになった：古びたドアのすき間から光がもれる
        const a = 0.5 + 0.5 * Math.sin(frame / 8);
        g.save();
        g.globalAlpha = 0.35 + a * 0.5;
        g.fillStyle = '#fff4a0';
        g.fillRect(X + 6, Y + 9, 5, 6);
        g.globalAlpha = 0.25 * a;
        g.beginPath();
        g.arc(X + 8, Y + 12, 7, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      if (n.last && ow.isCleared(n.last)) {
        // 最終コースをクリアした：屋根の上に星
        g.fillStyle = '#ffe070';
        g.fillRect(X + 7, Y - 6, 2, 6);
        g.fillRect(X + 5, Y - 4, 6, 2);
        g.fillStyle = '#ffffff';
        g.fillRect(X + 7, Y - 4, 2, 2);
      }
      return;
    }
    if (n.warp) {
      // ワープ：回る星の輪（門は大きい）
      const r = n.gate ? 7 : 6;
      const lit = open || ow.isOpenChain(Object.values(ow.graph.chains).find((c) => c.a === key || c.b === key));
      g.fillStyle = K;
      g.beginPath();
      g.arc(X + 8, Y + 8, r + 1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = lit ? (n.gate ? '#ffe070' : '#b070ff') : '#5a5070';
      g.beginPath();
      g.arc(X + 8, Y + 8, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = lit ? '#ffffff' : '#8a80a0';
      for (let i = 0; i < 4; i++) {
        const a = frame / 12 + (i * Math.PI) / 2;
        g.fillRect(X + 7 + Math.round(Math.cos(a) * (r - 2)), Y + 7 + Math.round(Math.sin(a) * (r - 2)), 2, 2);
      }
      return;
    }
    const soon = ow.isSoon(n);
    const cleared = ow.isCleared(n.stage);
    if (n.castle) {
      // お城：クリアすると、ルミナの青い旗
      g.fillStyle = K;
      g.fillRect(X + 1, Y + 4, 14, 12);
      g.fillStyle = soon ? '#6a6a80' : '#a4a4bc';
      g.fillRect(X + 2, Y + 5, 12, 10);
      g.fillStyle = soon ? '#4a4a5a' : '#76768e';
      for (let i = 0; i < 3; i++) g.fillRect(X + 2 + i * 5, Y + 3, 2, 2);
      g.fillStyle = K;
      g.fillRect(X + 6, Y + 10, 4, 5);
      g.fillRect(X + 7, Y - 4, 1, 8);
      g.fillStyle = cleared ? '#4470d0' : soon ? '#5a5070' : '#c03048';
      g.fillRect(X + 8, Y - 4, 5, 3);
      return;
    }
    if (n.hidden) {
      // 隠しコース：桃色の星。クリアすると青い星
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i & 1 ? 3.2 : 7.5;
        pts.push([X + 8 + Math.cos(a) * r, Y + 8.5 + Math.sin(a) * r]);
      }
      const star = (grow) => {
        g.beginPath();
        pts.forEach(([x, y], i) => {
          const px = X + 8 + (x - X - 8) * grow;
          const py = Y + 8.5 + (y - Y - 8.5) * grow;
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        });
        g.closePath();
        g.fill();
      };
      g.fillStyle = K;
      star(1.18);
      g.fillStyle = soon ? '#7a7890' : cleared ? '#5ad0ff' : '#ff88d8';
      star(1);
      g.fillStyle = '#ffffff';
      g.fillRect(X + 7, Y + 6, 2, 2);
      return;
    }
    // ふつうのステージ：まだ = 黄色、クリア = 青く光る、準備中 = 灰色。
    // ひみつのゴールがあるステージは赤（SMW と同じ）。ひみつのゴールを見つけると、金色の輪がつく
    const secret = ow.hasSecret(key);
    const foundSecret = secret && ow.isCleared(`${n.stage}*`);
    g.fillStyle = foundSecret ? '#ffd040' : K;
    g.beginPath();
    g.arc(X + 8, Y + 8, foundSecret ? 7 : 6, 0, Math.PI * 2);
    g.fill();
    if (foundSecret) {
      g.fillStyle = K;
      g.beginPath();
      g.arc(X + 8, Y + 8, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = soon ? '#7a7890' : cleared ? '#5ad0ff' : secret ? '#f04858' : '#ffd040';
    g.beginPath();
    g.arc(X + 8, Y + 8, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = soon ? '#a8a6c0' : cleared ? '#e8faff' : secret ? '#ffb0b8' : '#fff2a0';
    g.fillRect(X + 5, Y + 5, 3, 2);
    if (cleared && secret && !foundSecret) {
      // クリアしたが、ひみつのゴールはまだ：赤い印
      g.fillStyle = '#f04858';
      g.fillRect(X + 10, Y + 10, 3, 3);
    }
    if (cleared && (frame >> 4) & 1) {
      g.fillStyle = '#ffffff';
      g.fillRect(X + 12, Y + 1, 1, 3);
      g.fillRect(X + 11, Y + 2, 3, 1);
    }
  }

  // ルミナ（地図の上）
  drawRumina(g, ow, sx, sy, frame, power) {
    let pose = POSE.FRONT;
    let facing = 1;
    const moving = !!ow.walk;
    if (ow.dir === 'U') pose = POSE.BACK;
    else if (ow.dir === 'L' || ow.dir === 'R') {
      pose = moving && (frame >> 3) & 1 ? POSE.WALK1 : POSE.STAND;
      facing = ow.dir === 'R' ? 1 : 0;
    }
    const bob = moving && (ow.dir === 'U' || ow.dir === 'D') && (frame >> 3) & 1 ? 1 : 0;
    // 足元の影
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(sx - 5, sy + 4, 10, 2);
    this.sprite.draw(g, pose, facing, sx - 8, sy + 6 - 32 - bob, power);
  }

  draw(g, ow, frame, power, fade = 0) {
    const m = ow.map;
    const th = THEMES[m.theme];
    const mw = m.rows[0].length * TILE;
    const mh = m.rows.length * TILE;
    // 地図が画面より大きい時はルミナについていく
    const camX = Math.max(0, Math.min(mw - SCREEN_W, Math.round(ow.x - SCREEN_W / 2)));
    const camY = Math.max(0, Math.min(mh - SCREEN_H, Math.round(ow.y - SCREEN_H / 2)));
    g.fillStyle = '#000';
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.drawImage(this.terrain(ow.mapId), -camX, -camY);
    // 水のきらめき
    if (m.theme !== 'space') {
      g.fillStyle = th.water[1];
      for (let ty = 0; ty < m.rows.length; ty++) {
        for (let tx = 0; tx < m.rows[0].length; tx++) {
          if (m.rows[ty][tx] !== '~' || hash(tx, ty) > 0.45) continue;
          const o = (frame >> 4) + Math.floor(hash(ty, tx) * 8);
          g.fillRect(tx * TILE + (o * 3) % 12 + 2 - camX, ty * TILE + 5 + (o % 2) * 5 - camY, 3, 1);
        }
      }
    }
    // 道（開いている所だけ）
    const vis = ow.visibleTiles();
    for (const k of vis) {
      const [tx, ty] = k.split(',').map(Number);
      if (m.rows[ty][tx] in m.nodes) continue;
      this.drawPath(g, ow, tx, ty, tx * TILE - camX, ty * TILE - camY, th);
    }
    // 点（道が届いている点だけ。家と入口はいつも）
    for (const [key, p] of Object.entries(ow.graph.pos)) {
      const reached = ow.isOpenNode(key) || Object.values(ow.graph.edges[key]).some((e) => vis.has(e.tiles[0].join(',')));
      if (!reached) continue;
      this.drawNode(g, ow, key, p.x * TILE - camX, p.y * TILE - camY, frame);
    }
    this.drawRumina(g, ow, ow.x - camX, ow.y - camY, frame, power);
    this.drawHud(g, ow);
    if (fade) {
      g.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }

  drawHud(g, ow) {
    // 左上：地図の名前とクリア数（右上は画面のボタンと重なるので空けておく）
    const { done, total } = ow.progress();
    g.font = 'bold 10px system-ui, sans-serif';
    const wName = g.measureText(ow.map.name).width;
    g.fillStyle = 'rgba(28,20,36,0.82)';
    g.fillRect(0, 0, Math.max(wName, 64) + 14, 28);
    g.textBaseline = 'middle';
    g.fillStyle = '#ffe070';
    g.textAlign = 'left';
    g.fillText(ow.map.name, 6, 8);
    g.font = '9px system-ui, sans-serif';
    g.fillStyle = '#c8f0ff';
    g.fillText(`クリア ${done}/${total}`, 6, 20);
    // 下：今いる点
    if (ow.walk || ow.reveal.length) {
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      return;
    }
    const n = ow.node();
    let text = ow.label();
    let sub = '';
    if (n.stage) {
      const title = ow.titles?.[n.stage];
      if (title) text = title;
      sub = ow.isSoon(n) ? '準備中' : ow.isCleared(n.stage) ? 'クリア！  B ではいる' : 'B ではいる';
    } else if (n.warp) {
      sub = ow.canWarp() ? 'B でワープ' : '';
    } else if (n.home && ow.homeOpen(n)) {
      sub = ow.isCleared(n.last) ? '★ クリア！  B ではいる' : '古びたドアが… B ではいる';
    }
    g.fillStyle = 'rgba(28,20,36,0.82)';
    g.fillRect(0, SCREEN_H - 20, SCREEN_W, 20);
    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.font = 'bold 11px system-ui, sans-serif';
    g.fillText(text, 8, SCREEN_H - 10);
    // グレイコインのバッジ：ステージ名の横。取った（取ってクリアした）コースは色つき、まだなら暗い影
    const coinId = n.stage && !ow.isSoon(n) ? n.stage : n.home && ow.homeOpen(n) ? n.last : null;
    if (coinId && ow.coinIds?.has(coinId)) {
      const bx = Math.round(8 + g.measureText(text).width + 5);
      const got = ow.hasCoin(coinId);
      g.save();
      if (!got) g.globalAlpha = 0.35;
      g.drawImage(got ? this.coinBadge : this.coinShadow, bx, SCREEN_H - 16);
      g.restore();
    }
    if (sub) {
      g.textAlign = 'right';
      g.font = '9px system-ui, sans-serif';
      g.fillStyle = sub === '準備中' ? '#a8a6c0' : '#ffe070';
      g.fillText(sub, SCREEN_W - 8, SCREEN_H - 10);
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }
}
