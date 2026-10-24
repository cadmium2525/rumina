// ステージエディタ。作ったステージは localStorage に自動保存し、テストプレイでゲームに渡す
import { Level, TILE, TILES_H, SLOPE_K, GROUND_Y, MIN_WIDTH, MAX_WIDTH } from './level.js';
import { LevelView } from './level_view.js';
import { ActorSprites, RuminaSprite, gridToCanvas } from './sprites.js';
import { LIGHT_ORB, PAL_OBJ } from './art.js';

const EDIT_KEY = 'rumina.edit'; // 編集中のステージ
const PLAY_KEY = 'rumina.play'; // テストプレイするステージ（main.js と同じ）
const LEVEL_PX_H = TILES_H * 16;
const UNDO_MAX = 100;

const view = new LevelView();
const actors = new ActorSprites();
const rumina = new RuminaSprite();
const orb = gridToCanvas(LIGHT_ORB, PAL_OBJ);

const $ = (id) => document.getElementById(id);
const canvas = $('map');
const g = canvas.getContext('2d');
const viewEl = $('view');
const statusEl = $('status');
const scrollEl = $('scroll');

// ---- パレット ----
const T = TILE;
const K = SLOPE_K;
const tile = (t, name, item) => ({ kind: 'tile', t, name, item });
const PALETTE = [
  ['基本', [
    tile(T.GROUND, '地面'), tile(T.LEDGE, '地面（上からだけ乗れる）'), tile(T.STONE, '石ブロック'),
    tile(T.TURN, '金のブロック（クルクル）'), tile(T.QUESTION, '？ブロック（光の玉）', 'light'),
    tile(T.QUESTION, '？ブロック（からっぽ）', null), tile(T.USED, '叩いた後のブロック'),
    tile(T.WATER, '水'), tile(T.VINE, 'ツタ'), tile(T.LADDER, 'ハシゴ'),
  ]],
  ['坂', [
    tile(T.SLOPE + K.UP_G1, 'ゆるい上り坂（下）'), tile(T.SLOPE + K.UP_G2, 'ゆるい上り坂（上）'),
    tile(T.SLOPE + K.DOWN_G1, 'ゆるい下り坂（上）'), tile(T.SLOPE + K.DOWN_G2, 'ゆるい下り坂（下）'),
    tile(T.SLOPE + K.UP_45, '45°の上り坂'), tile(T.SLOPE + K.DOWN_45, '45°の下り坂'),
  ]],
  ['天井の坂', [
    tile(T.SLOPE + K.CEIL_DOWN_45, '45°の天井（右へ下がる）'), tile(T.SLOPE + K.CEIL_UP_45, '45°の天井（右へ上がる）'),
    tile(T.SLOPE + K.CEIL_DOWN_G1, 'ゆるい天井（右へ下がる・1）'), tile(T.SLOPE + K.CEIL_DOWN_G2, 'ゆるい天井（右へ下がる・2）'),
    tile(T.SLOPE + K.CEIL_UP_G1, 'ゆるい天井（右へ上がる・1）'), tile(T.SLOPE + K.CEIL_UP_G2, 'ゆるい天井（右へ上がる・2）'),
  ]],
  ['洞窟', [
    tile(T.CAVE_ROCK, '岩'), tile(T.CAVE_LEDGE, '岩の棚（上からだけ乗れる）'),
    tile(T.CRYSTAL, '結晶（飾り）'), tile(T.STALACTITE, 'つらら石（飾り）'),
  ]],
  ['遺跡', [
    tile(T.RUIN_BRICK, '遺跡のレンガ'), tile(T.RUIN_BLOCK, '模様の石'),
    tile(T.RUIN_LEDGE, '石の板（上からだけ乗れる）'), tile(T.RUIN_PILLAR, '柱（飾り）'),
  ]],
  ['お城', [
    tile(T.CASTLE_BRICK, 'お城のレンガ'), tile(T.CASTLE_BLOCK, '鉄のブロック'),
    tile(T.CASTLE_LEDGE, '木の橋（上からだけ乗れる）'), tile(T.TORCH, 'たいまつ（飾り）'), tile(T.WINDOW, '窓（飾り）'),
  ]],
  ['仕掛け', [tile(T.SPIKE, 'トゲ（触れるとダメージ）'), tile(T.LAVA, 'マグマ（落ちるとミス）')]],
  ['敵・アイテム', [
    { kind: 'spawn', type: 'gift', name: 'ギフトボックス' },
    { kind: 'spawn', type: 'shell', name: '甲羅' },
    { kind: 'spawn', type: 'spiker', name: 'トゲムシ' },
  ]],
  ['その他', [
    { kind: 'start', name: 'スタート位置' }, { kind: 'goal', name: 'ゴール（もう一度置くと移動）' },
    { kind: 'erase', name: '消しゴム' },
  ]],
];
const ALL = PALETTE.flatMap(([, items]) => items);

// ---- 状態 ----
let level = loadInitial();
let brush = ALL[0];
let tool = 'pen';
let showGrid = true;
let scrollX = 0;   // 表示している左端（px）
let scale = 1;     // 1 ドットの画面上の大きさ
let viewW = 256;   // 表示している幅（px）
let hover = null;  // {tx, ty}
let frame = 0;
const undo = [];
const redo = [];

function loadInitial() {
  try {
    const d = JSON.parse(localStorage.getItem(EDIT_KEY));
    if (d) return new Level(d);
  } catch { /* 壊れていたら標準のステージ */ }
  return new Level();
}

function save() {
  try { localStorage.setItem(EDIT_KEY, JSON.stringify(level.toData())); } catch { /* 容量オーバーなど */ }
}

function snapshot() { return JSON.stringify(level.toData()); }

function pushUndo(snap) {
  undo.push(snap);
  if (undo.length > UNDO_MAX) undo.shift();
  redo.length = 0;
  syncButtons();
}

function restore(snap) {
  level = new Level(JSON.parse(snap));
  syncFields();
  save();
}

function doUndo() {
  if (!undo.length) return;
  redo.push(snapshot());
  restore(undo.pop());
  syncButtons();
}

function doRedo() {
  if (!redo.length) return;
  undo.push(snapshot());
  restore(redo.pop());
  syncButtons();
}

// まとめて 1 回の操作にする
function edit(fn) {
  const before = snapshot();
  fn();
  if (snapshot() !== before) {
    pushUndo(before);
    save();
  }
}

// ---- 編集 ----
const key = (tx, ty) => `${tx},${ty}`;
const spawnAt = (tx, ty) => level.spawns.findIndex((s) => s.x === tx * 16 && s.y === ty * 16);
const inside = (tx, ty) => tx >= 0 && tx < level.width && ty >= 0 && ty < TILES_H;

function apply(tx, ty, b = brush) {
  if (!inside(tx, ty)) return;
  if (b.kind === 'tile') {
    level.set(tx, ty, b.t);
    if (b.t === T.QUESTION && b.item) level.contents.set(key(tx, ty), b.item);
    else level.contents.delete(key(tx, ty));
  } else if (b.kind === 'spawn') {
    const i = spawnAt(tx, ty);
    if (i >= 0) level.spawns.splice(i, 1);
    level.spawns.push({ type: b.type, x: tx * 16, y: ty * 16 });
  } else if (b.kind === 'start') {
    level.start = { tx, ty };
  } else if (b.kind === 'goal') {
    level.goal = { tx, ty };
  } else if (b.kind === 'erase') {
    if (level.goal && level.goal.tx === tx && level.goal.ty === ty) {
      level.goal = null;
      return;
    }
    const i = spawnAt(tx, ty);
    if (i >= 0) level.spawns.splice(i, 1);
    else {
      level.set(tx, ty, T.EMPTY);
      level.contents.delete(key(tx, ty));
    }
  }
}

function pick(tx, ty) {
  const i = spawnAt(tx, ty);
  let b = null;
  if (i >= 0) b = ALL.find((p) => p.kind === 'spawn' && p.type === level.spawns[i].type);
  else if (level.start.tx === tx && level.start.ty === ty) b = ALL.find((p) => p.kind === 'start');
  else if (level.goal && level.goal.tx === tx && level.goal.ty === ty) b = ALL.find((p) => p.kind === 'goal');
  else {
    const t = level.tileAt(tx, ty);
    if (t === T.EMPTY) b = ALL.find((p) => p.kind === 'erase');
    else if (t === T.QUESTION) b = ALL.find((p) => p.t === t && (p.item ?? null) === (level.contents.get(key(tx, ty)) ?? null));
    else b = ALL.find((p) => p.kind === 'tile' && p.t === t);
  }
  if (b) selectBrush(b);
}

// 四角の範囲を埋める（スポーン・スタートは最後のマスだけ）
function fillRect(a, b) {
  const x0 = Math.min(a.tx, b.tx), x1 = Math.max(a.tx, b.tx);
  const y0 = Math.min(a.ty, b.ty), y1 = Math.max(a.ty, b.ty);
  if (brush.kind === 'tile' || brush.kind === 'erase') {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) apply(x, y);
  } else {
    apply(b.tx, b.ty);
  }
}

// 2 点の間のマスをすべて塗る（速く動かしても途切れない）
function line(a, b, fn) {
  const n = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty));
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    fn(Math.round(a.tx + (b.tx - a.tx) * t), Math.round(a.ty + (b.ty - a.ty) * t));
  }
}

// ---- 表示 ----
function layout() {
  const w = viewEl.clientWidth;
  const h = viewEl.clientHeight;
  // 高さ（27 マス）がちょうど収まる大きさ。整数倍に近ければ整数倍にしてドットをそろえる
  scale = h / LEVEL_PX_H;
  if (scale >= 1 && scale - Math.floor(scale) < 0.08) scale = Math.floor(scale);
  viewW = Math.ceil(w / scale);
  canvas.width = viewW;
  canvas.height = LEVEL_PX_H;
  canvas.style.width = `${viewW * scale}px`;
  canvas.style.height = `${LEVEL_PX_H * scale}px`;
  g.imageSmoothingEnabled = false;
  setScroll(scrollX);
}

function maxScroll() { return Math.max(0, level.widthPx + 32 - viewW); }

function setScroll(x) {
  scrollX = Math.round(Math.max(0, Math.min(maxScroll(), x)));
  scrollEl.max = String(maxScroll());
  scrollEl.value = String(scrollX);
}

function render() {
  frame = (frame + 1) & 0xff;
  const sx = scrollX;
  view.drawBackground(g, sx, 0, level.theme, viewW, LEVEL_PX_H);
  view.drawTiles(g, level, sx, 0, frame, viewW, LEVEL_PX_H);
  // ？ブロックの中身
  for (const [k] of level.contents) {
    const [tx, ty] = k.split(',').map(Number);
    if (level.tileAt(tx, ty) === T.QUESTION) g.drawImage(orb, tx * 16 - sx + 8, ty * 16 - 2, 9, 9);
  }
  for (const s of level.spawns) {
    actors.drawActor(g, { type: s.type, state: 'idle', facing: 0, emerge: 0 }, 0, s.x - sx, s.y);
  }
  const st = level.start;
  rumina.draw(g, 0, 1, st.tx * 16 - sx, (st.ty + 1) * 16 - 32, 0);
  if (level.goal) {
    const gl = { x: level.goal.tx * 16, bottom: (level.goal.ty + 1) * 16, y: (level.goal.ty + 1) * 16 - 24 };
    actors.drawGoalBack(g, gl, frame, sx, 0);
    actors.drawGoalFront(g, gl, frame, sx, 0);
    // 置いた場所（足元のマス）
    g.strokeStyle = 'rgba(255,224,112,0.8)';
    g.strokeRect(gl.x - sx + 0.5, level.goal.ty * 16 + 0.5, 15, 15);
  }
  view.drawWater(g, level, sx, 0, frame, viewW, LEVEL_PX_H);

  // ステージの外
  g.fillStyle = 'rgba(0,0,0,0.55)';
  const end = level.widthPx - sx;
  if (end < viewW) g.fillRect(end, 0, viewW - end, LEVEL_PX_H);
  // マス目
  if (showGrid) {
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = -(sx % 16); x < Math.min(viewW, end); x += 16) g.fillRect(x, 0, 1, LEVEL_PX_H);
    for (let y = 0; y < LEVEL_PX_H; y += 16) g.fillRect(0, y, Math.min(viewW, end), 1);
    // 画面 1 枚分（256px）の目安
    g.fillStyle = 'rgba(255,220,120,0.35)';
    for (let x = -(sx % 256); x < Math.min(viewW, end); x += 256) if (x + sx > 0) g.fillRect(x, 0, 1, LEVEL_PX_H);
  }
  // カーソル・四角の範囲
  const box = rectStart && hover ? rectBox(rectStart, hover) : hover ? { ...hover, w: 1, h: 1 } : null;
  if (box) {
    g.strokeStyle = brush.kind === 'erase' ? '#ff6060' : '#ffd060';
    g.lineWidth = 1;
    g.strokeRect(box.tx * 16 - sx + 0.5, box.ty * 16 + 0.5, box.w * 16 - 1, box.h * 16 - 1);
  }
  requestAnimationFrame(render);
}

function rectBox(a, b) {
  const tx = Math.min(a.tx, b.tx), ty = Math.min(a.ty, b.ty);
  return { tx, ty, w: Math.abs(a.tx - b.tx) + 1, h: Math.abs(a.ty - b.ty) + 1 };
}

function showStatus() {
  if (!hover) {
    statusEl.textContent = `${brush.name}　｜　幅 ${level.width} マス`;
    return;
  }
  const { tx, ty } = hover;
  statusEl.textContent = `${brush.name}　｜　x ${tx}, y ${ty}　｜　幅 ${level.width} マス`;
}

// ---- 入力 ----
const pointers = new Map();
let stroke = null;    // {before, last}
let rectStart = null;
let pan = null;       // {x, scroll}

function cellOf(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / scale + scrollX;
  const y = (e.clientY - r.top) / scale;
  return { tx: Math.floor(x / 16), ty: Math.floor(y / 16) };
}

function cancelStroke() {
  if (stroke) restore(stroke.before);
  stroke = null;
  rectStart = null;
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, e);
  closeMenu();
  if (pointers.size >= 2) {
    // 2 本指：スクロール（描きかけは取り消す）
    cancelStroke();
    pan = { x: avgX(), scroll: scrollX };
    return;
  }
  const c = cellOf(e);
  hover = c;
  if (tool === 'hand' || e.button === 1 || e.button === 2) {
    pan = { x: e.clientX, scroll: scrollX };
    return;
  }
  if (tool === 'pick') {
    pick(c.tx, c.ty);
    return;
  }
  stroke = { before: snapshot(), last: c };
  if (tool === 'rect') rectStart = c;
  else apply(c.tx, c.ty);
});

canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
  const c = cellOf(e);
  hover = c;
  showStatus();
  if (pan) {
    const x = pointers.size >= 2 ? avgX() : e.clientX;
    setScroll(pan.scroll - (x - pan.x) / scale);
    return;
  }
  if (stroke && tool === 'pen' && (c.tx !== stroke.last.tx || c.ty !== stroke.last.ty)) {
    if (brush.kind === 'tile' || brush.kind === 'erase') line(stroke.last, c, (x, y) => apply(x, y));
    else apply(c.tx, c.ty);
    stroke.last = c;
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pan) {
    if (pointers.size === 0) pan = null;
    return;
  }
  if (!stroke) return;
  if (rectStart) {
    fillRect(rectStart, cellOf(e));
    rectStart = null;
  }
  if (snapshot() !== stroke.before) {
    pushUndo(stroke.before);
    save();
  }
  stroke = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId);
  cancelStroke();
  pan = null;
});
canvas.addEventListener('pointerleave', () => {
  if (!stroke) hover = null;
  showStatus();
});

function avgX() {
  let s = 0;
  for (const p of pointers.values()) s += p.clientX;
  return s / pointers.size;
}

viewEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  setScroll(scrollX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / scale);
}, { passive: false });
scrollEl.addEventListener('input', () => setScroll(+scrollEl.value));

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'KeyZ') {
    e.preventDefault();
    if (e.shiftKey) doRedo(); else doUndo();
  } else if (mod && e.code === 'KeyY') {
    e.preventDefault();
    doRedo();
  } else if (e.code === 'ArrowRight') setScroll(scrollX + 64);
  else if (e.code === 'ArrowLeft') setScroll(scrollX - 64);
  else if (e.code === 'KeyG') toggleGrid();
});

// ---- パレット ----
function iconFor(p) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ig = c.getContext('2d');
  ig.imageSmoothingEnabled = false;
  if (p.kind === 'tile') {
    if (p.t === T.WATER) {
      ig.fillStyle = 'rgba(60,120,216,0.7)';
      ig.fillRect(0, 0, 16, 16);
      ig.fillStyle = '#d8ecff';
      ig.fillRect(0, 0, 16, 1);
    } else {
      const img = view.tileImage(p.t, level.theme, p.t === T.VINE ? T.EMPTY : T.EMPTY, 0);
      if (img) ig.drawImage(img, 0, 0);
    }
    if (p.t === T.QUESTION && p.item) ig.drawImage(orb, 8, 0, 8, 8);
    if (p.t === T.QUESTION && !p.item) {
      ig.fillStyle = '#ff6060';
      ig.fillRect(10, 2, 4, 1);
    }
  } else if (p.kind === 'spawn') {
    actors.drawActor(ig, { type: p.type, state: 'idle', facing: 0, emerge: 0 }, 0, 0, 0);
  } else if (p.kind === 'start') {
    const t = document.createElement('canvas');
    t.width = 24;
    t.height = 32;
    rumina.draw(t.getContext('2d'), 0, 1, 4, 0, 0);
    ig.drawImage(t, 1, 11, 22, 21, 0, 1, 16, 15);
  } else if (p.kind === 'goal') {
    ig.fillStyle = '#24141c';
    ig.fillRect(2, 2, 4, 14);
    ig.fillRect(10, 2, 4, 14);
    ig.fillStyle = '#f6d480';
    ig.fillRect(3, 3, 2, 13);
    ig.fillRect(11, 3, 2, 13);
    ig.fillStyle = '#fff8e0';
    ig.fillRect(4, 8, 8, 2);
    ig.drawImage(orb, 0, 0, 8, 8);
    ig.drawImage(orb, 8, 0, 8, 8);
  } else if (p.kind === 'erase') {
    ig.strokeStyle = '#ff6060';
    ig.lineWidth = 2;
    ig.beginPath();
    ig.moveTo(3, 3); ig.lineTo(13, 13); ig.moveTo(13, 3); ig.lineTo(3, 13);
    ig.stroke();
  }
  return c;
}

const paletteEl = $('palette');
const buttons = new Map();
function buildPalette() {
  paletteEl.textContent = '';
  buttons.clear();
  for (const [cat, items] of PALETTE) {
    const box = document.createElement('div');
    box.className = 'cat';
    const label = document.createElement('span');
    label.textContent = cat;
    const row = document.createElement('div');
    row.className = 'items';
    for (const p of items) {
      const b = document.createElement('button');
      b.title = p.name;
      b.setAttribute('aria-label', p.name);
      b.appendChild(iconFor(p));
      b.addEventListener('click', () => selectBrush(p));
      row.appendChild(b);
      buttons.set(p, b);
    }
    box.append(label, row);
    paletteEl.appendChild(box);
  }
  syncPalette();
}

function selectBrush(p) {
  brush = p;
  if (tool === 'pick' || tool === 'hand') selectTool('pen');
  syncPalette();
  showStatus();
}

function syncPalette() {
  for (const [p, b] of buttons) b.classList.toggle('on', p === brush);
  buttons.get(brush)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ---- ツールバー ----
function selectTool(t) {
  tool = t;
  for (const b of document.querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.tool === t);
  canvas.style.cursor = t === 'hand' ? 'grab' : 'crosshair';
}
for (const b of document.querySelectorAll('.tool')) b.addEventListener('click', () => selectTool(b.dataset.tool));

function toggleGrid() {
  showGrid = !showGrid;
  $('grid').classList.toggle('on', showGrid);
}
$('grid').addEventListener('click', toggleGrid);
$('undo').addEventListener('click', doUndo);
$('redo').addEventListener('click', doRedo);

function syncButtons() {
  $('undo').disabled = !undo.length;
  $('redo').disabled = !redo.length;
}

function syncFields() {
  $('theme').value = level.theme;
  $('width').value = String(level.width);
  buildPalette();
  setScroll(scrollX);
  showStatus();
}

$('theme').addEventListener('change', (e) => {
  edit(() => { level.theme = e.target.value; });
  buildPalette();
});
$('width').addEventListener('change', (e) => {
  const n = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(+e.target.value) || level.width));
  if (n < level.width && !confirm(`幅を ${n} マスにすると、右側の ${level.width - n} マスが消えます。よろしいですか？`)) {
    e.target.value = String(level.width);
    return;
  }
  edit(() => level.resize(n));
  syncFields();
});

function closeMenu() { $('menu').hidden = true; }
$('menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('menu').hidden = !$('menu').hidden;
});
document.addEventListener('click', (e) => {
  if (!$('menu').contains(e.target) && e.target !== $('menu-btn')) closeMenu();
});

$('new').addEventListener('click', () => {
  closeMenu();
  if (!confirm('いまのステージを消して、地面だけの新しいステージにしますか？（元に戻すで戻せます）')) return;
  edit(() => {
    const theme = level.theme;
    level = new Level({
      format: 'rumina-level', version: 1, width: 128, height: TILES_H, theme,
      start: { tx: 3, ty: GROUND_Y / 16 - 1 }, tiles: [0, 128 * (GROUND_Y / 16), T.GROUND, 128 * (TILES_H - GROUND_Y / 16)],
    });
  });
  setScroll(0);
  syncFields();
});
$('default').addEventListener('click', () => {
  closeMenu();
  if (!confirm('いまのステージを消して、標準のテストステージを読み込みますか？（元に戻すで戻せます）')) return;
  edit(() => { level = new Level(); });
  syncFields();
});
$('export').addEventListener('click', () => {
  closeMenu();
  const blob = new Blob([JSON.stringify(level.toData())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rumina-stage.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('import').addEventListener('click', () => {
  closeMenu();
  $('file').click();
});
$('file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    const lv = new Level(d);
    edit(() => { level = lv; });
    setScroll(0);
    syncFields();
  } catch (err) {
    alert(`読み込めませんでした：${err.message}`);
  }
});

$('play').addEventListener('click', () => {
  save();
  try {
    localStorage.setItem(PLAY_KEY, JSON.stringify(level.toData()));
  } catch {
    alert('保存できませんでした（ブラウザの保存領域がいっぱいかもしれません）');
    return;
  }
  location.href = 'index.html?level=custom';
});

// ---- 開始 ----
window.addEventListener('resize', layout);
syncFields();
syncButtons();
$('grid').classList.toggle('on', showGrid);
layout();
// スタート位置が見えるように
setScroll(level.start.tx * 16 - viewW / 3);
requestAnimationFrame(render);

// 自動テスト用
window.editor = {
  get level() { return level; },
  apply, selectBrush, PALETTE: ALL, setScroll,
};
