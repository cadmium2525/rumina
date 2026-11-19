// 1-1 アキハバラ（電気街）。
// 構成の流れは参考動画のステージ 1 に合わせ、敵・仕掛け・見た目はルミナの世界のものに置き換えている。
import { Level, TILE, TILES_H } from '../level.js';

const G = 24; // 地面の一番上の段

export function makeAkihabara() {
  const l = new Level();
  l.tiles.fill(0);
  l.spawns = [];
  l.contents.clear();
  l.goal = null;
  l.resize(264);
  l.theme = 'akiba';
  l.title = '1-1 アキハバラ';
  l.start = { tx: 3, ty: G - 1 };

  const ground = (x0, x1) => l.fill(x0, G, x1 - x0 + 1, TILES_H - G, TILE.GROUND);
  const spawn = (type, tx, ty) => l.spawns.push({ type, x: tx * 16, y: ty * 16 });
  const duct = (tx, ty, h = 2) => {
    l.set(tx, ty, TILE.DUCT_TL);
    l.set(tx + 1, ty, TILE.DUCT_TR);
    l.fill(tx, ty + 1, 1, h - 1, TILE.DUCT_L);
    l.fill(tx + 1, ty + 1, 1, h - 1, TILE.DUCT_R);
  };

  // ---- A. スタート：メッセージ、高い所の光の玉、砲台を積んだ柱 ----
  ground(0, 31);
  l.set(7, 20, TILE.MESSAGE);
  l.messages.set('7,20', '1-1 アキハバラ\nようこそ、電気街へ！\n\n砲台はときどき砲弾を撃ってくるよ。\n砲弾は上から踏めるから、足場にしてみよう。\nトゲにはさわらないでね。');
  l.question(11, 19, 'light');
  l.fill(17, 19, 1, 5, TILE.CANNON);

  // ---- B. 最初の谷：向こう岸の砲台から飛んでくる砲弾を踏み台に。線路の足場もある ----
  l.fill(47, 19, 1, 5, TILE.CANNON);
  l.fill(36, 23, 3, 1, TILE.RAIL);
  l.fill(41, 22, 2, 1, TILE.RAIL);

  // ---- C. 地上：トゲムシ、足元のトゲ、警備ロボ、ドローン ----
  ground(46, 80);
  spawn('spiker', 51, G - 1);
  spawn('capsule', 54, G - 1);
  l.set(58, G - 1, TILE.SPIKE);
  spawn('robo', 61, G - 1);
  l.set(64, G - 1, TILE.SPIKE);
  spawn('robo', 67, G - 1);
  l.fill(70, G - 1, 2, 1, TILE.SPIKE);
  spawn('capsule', 76, G - 1);
  spawn('drone', 74, 19);
  spawn('drone', 78, 17);

  // ---- D. 空中のブロック地帯：下は谷。天井と、下向きトゲの列 ----
  l.fill(84, 12, 41, 1, TILE.CONCRETE);
  // 大ジャンプだと刺さる・小ジャンプなら通れる高さ
  l.fill(84, 13, 4, 3, TILE.CONCRETE);
  l.fill(84, 16, 4, 1, TILE.SPIKE_DOWN);
  l.set(85, 14, TILE.NEON);
  l.fill(106, 13, 2, 1, TILE.CONCRETE);
  l.fill(108, 14, 13, 1, TILE.SPIKE_DOWN); // 大ジャンプすると刺さる
  for (const [tx, ty] of [[82, 21], [86, 22], [90, 20], [93, 22], [97, 20], [98, 20], [99, 20], [103, 21],
    [106, 19], [109, 21], [110, 21], [111, 21], [114, 21], [117, 22], [121, 21]]) l.set(tx, ty, TILE.USED);
  // 3 マスの足場の奥に警備ロボ（3 回踏むか、跳び越す）
  spawn('robo', 99, 19);
  spawn('robo', 111, 20);
  spawn('drone', 103, 16);

  // ---- E. 天井つきの地上：下向きトゲ、ブロックの囲いのロボ、ダクトのスパーク、H 字の柱 ----
  ground(125, 166);
  l.fill(128, 9, 33, 1, TILE.CONCRETE);
  l.fill(128, 10, 4, 6, TILE.CONCRETE);
  l.set(129, 12, TILE.NEON);
  l.set(130, 12, TILE.NEON);
  l.fill(128, 16, 4, 1, TILE.SPIKE_DOWN);
  l.set(127, G - 1, TILE.SPIKE);
  l.set(134, G - 1, TILE.SPIKE);
  l.fill(136, 22, 1, 2, TILE.USED);
  l.fill(140, 22, 1, 2, TILE.USED);
  spawn('robo', 138, G - 1);
  duct(143, 22);
  spawn('spark', 143, 21);
  l.fill(148, 10, 1, 11, TILE.CONCRETE);
  l.fill(151, 10, 1, 11, TILE.CONCRETE);
  l.set(148, 21, TILE.SPIKE_DOWN);
  l.set(151, 21, TILE.SPIKE_DOWN);
  spawn('robo', 149, G - 1);
  spawn('spiker', 155, G - 1);
  spawn('spiker', 158, G - 1);
  duct(162, 22);
  spawn('spark', 162, 21);

  // ---- F. 高い柱の区間：線路の床、上に天井と下向きトゲ、スパーク ----
  l.fill(167, G, 44, 1, TILE.RAIL);
  l.fill(186, G, 5, 1, TILE.TURN);
  l.fill(166, 6, 45, 1, TILE.CONCRETE);
  l.fill(182, 7, 1, 12, TILE.CONCRETE);
  l.set(182, 12, TILE.NEON);
  l.set(182, 19, TILE.SPIKE_DOWN);
  l.set(168, 21, TILE.USED);
  l.fill(170, 19, 3, TILES_H - 19, TILE.GROUND);
  l.fill(174, G, 2, 1, TILE.SPIKE);
  spawn('spark', 168, 17);
  spawn('spark', 176, 19);
  l.question(178, 19, 'light');
  l.set(194, 21, TILE.USED);
  l.fill(196, 19, 3, TILES_H - 19, TILE.GROUND);
  l.fill(192, G, 2, 1, TILE.SPIKE);
  spawn('spark', 193, 16);
  spawn('spark', 200, 18);
  spawn('drone', 205, 18);

  // ---- G. ゴール ----
  ground(211, 263);
  l.goal = { tx: 240, ty: G - 1 };

  spawn('graycoin', 106, 18); // グレイコイン（tools/place_coins.mjs）
  return l.toData();
}
