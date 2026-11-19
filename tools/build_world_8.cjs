// ワールド 8（8-1〜8-5、最後のボス部屋、隠しコース 8-?）を
// ステージエディタを操作して作る: node tools/build_world_8.cjs
// やみの国。新しい仕掛けは「暗やみ」（ルミナのまわりと、光る物のまわりだけ見える）と、天井から急降下するコウモリ。
// これまでのワールドの仕掛け（音符ブロック・ひのこ・強制スクロール・ハシゴ・雲）もまとめて使う。
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const BLOCK = 'やみの石';
const SLEDGE = 'やみの足場（上からだけ乗れる）';
const BAT = 'コウモリ（天井の下に置く。近づくと急降下・踏める）';
const NOTE = '音符ブロック（乗ると跳ねる。B を押していると高く跳ぶ）';
const EMBER = 'ひのこ（溶岩の中に置く。跳び出す・踏めない）';
const CLOUD = '雲（上からだけ乗れる）';
const TORCH = 'たいまつ（飾り）';
const SECRET = 'ひみつのゴール（地図の隠し道が開く）';

const darkKit = (ed, width) => {
  const k = kit(ed, width);
  return {
    ...k,
    bats: (cells) => ed.place(BAT, cells),
    notes: (cells) => ed.place(NOTE, cells),
    embers: (xs) => ed.place(EMBER, xs.map((x) => [x, G])),
    shadowLedges: (list) => k.ledges(SLEDGE, list),
    torches: (cells) => ed.place(TORCH, cells),
    wall: (x, h, w = 1) => ed.fill(BLOCK, x, G - h, x + w - 1, G - 1),
  };
};

(async () => {
  // ================= 8-1 やみのいりぐち =================
  await build({ theme: 'dark', title: '8-1 やみのいりぐち', width: 208, file: 'stage8_1.js', name: 'STAGE_8_1' }, async (ed) => {
    const k = darkKit(ed, 208);
    await k.ground();
    await k.message(6, 20, '8-1 やみのいりぐち/ここから やみの国。/コウモリは 近づくと 急降下してくるよ。');
    await k.light(10, 20);
    await k.bats([[20, 19]]);
    await k.pit(26, 30);
    await k.shadowLedges([[27, 29, 21]]);
    await k.foes(SPIKER, [36]);
    await k.stairs(BLOCK, 42, 3);
    await k.bats([[52, 18], [58, 19]]);
    await k.lava(62, 68);
    await k.embers([64, 67]);
    await k.pit(74, 84);
    await k.notes([[76, 22], [80, 22]]);
    await k.foes(ROBO, [90]);
    await ed.fill(TURN, 96, 20, 99, 20);
    await k.light(97, 16);
    await k.cannon(BLOCK, 104, 1, 2);
    await k.bats([[110, 19], [116, 18]]);
    await k.pit(122, 134);
    await k.shadowLedges([[124, 126, 21], [129, 131, 20]]);
    await k.foes(CAPS, [140, 146]);
    await k.foes(SPARK, [152]);
    await ed.fill(BLOCK, 160, 17, 163, G - 1);
    await ed.fill('ハシゴ', 159, 16, 159, G - 1);
    await k.bats([[170, 19]]);
    await k.light(178, 20);
    await k.stairs(BLOCK, 184, 3);
    await k.start();
    await k.goal(198);
  });

  // ================= 8-2 くらやみのもり（暗やみ・ひみつのゴール） =================
  // ふつうの道は地面。光の届かない所の音符ブロックで B を押したまま跳ねると足場 → ハシゴ → 上の道。上の道の先にひみつのゴール
  await build({ theme: 'dark', title: '8-2 くらやみのもり', width: 216, dark: true, file: 'stage8_2.js', name: 'STAGE_8_2' }, async (ed) => {
    const k = darkKit(ed, 216);
    await k.ground();
    await k.message(6, 20, '8-2 くらやみのもり/暗やみでは ルミナの光が たより。/光の届かない所にも 道が あるかも…');
    await k.light(10, 20);
    await k.torches([[16, 22], [40, 22], [76, 22], [100, 22], [130, 22], [160, 22], [190, 22]]);
    await k.pit(22, 26);
    await k.shadowLedges([[23, 25, 21]]);
    await k.bats([[32, 19]]);
    await k.foes(SPIKER, [38]);
    await k.pit(46, 52);
    await k.notes([[49, 22]]);
    // 上の道への入口（たいまつから離れた暗い所）
    await k.notes([[60, 23]]);
    await k.shadowLedges([[62, 65, 18]]);
    await ed.fill('ハシゴ', 66, 9, 66, 17);
    await k.shadowLedges([[67, 76, 10], [80, 87, 10], [91, 98, 10]]);
    await k.bats([[78, 6], [89, 6], [96, 6]]);
    await ed.fill(BLOCK, 102, 10, 116, 11);
    await k.foes(SPIKER, [[106, 9]]);
    await ed.place(SECRET, [[112, 9]]);
    // 下のふつうの道
    await k.foes(ROBO, [74]);
    await k.lava(84, 90);
    await k.embers([86, 89]);
    await k.foes(CAPS, [104]);
    await k.bats([[112, 19]]);
    await k.pit(126, 136);
    await k.shadowLedges([[128, 130, 21], [133, 134, 20]]);
    await k.bats([[140, 19], [150, 18]]);
    await k.foes(SPARK, [156]);
    await k.notes([[164, 23]]);
    await k.cannon(BLOCK, 170, 1, 2);
    await k.foes(ROBO, [178]);
    await k.light(184, 20);
    await k.stairs(BLOCK, 190, 3);
    await k.start();
    await k.goal(206);
  });

  // ================= 8-3 ほしのとう =================
  // 高い塔をハシゴで登り、雲を渡る。音符ブロックで高い塔の上へ、雲の橋で穴を越える
  await build({ theme: 'dark', title: '8-3 ほしのとう', width: 200, file: 'stage8_3.js', name: 'STAGE_8_3' }, async (ed) => {
    const k = darkKit(ed, 200);
    await k.ground();
    await k.message(6, 20, '8-3 ほしのとう/高い塔を 登って/雲の上を 渡ろう。');
    await k.light(10, 20);
    await ed.fill(BLOCK, 20, 12, 27, G - 1);
    await ed.fill('ハシゴ', 19, 11, 19, G - 1);
    await k.bats([[24, 8]]);
    await k.ledges(CLOUD, [[31, 33, 12], [37, 39, 11], [43, 45, 12]]);
    await ed.fill(BLOCK, 48, 10, 55, G - 1);
    await ed.fill('ハシゴ', 47, 9, 47, G - 1);
    await k.foes(SPIKER, [[52, 9]]);
    await k.ledges(CLOUD, [[59, 61, 10], [65, 67, 9], [71, 73, 11]]);
    await k.bats([[66, 4]]);
    await ed.fill(BLOCK, 76, 12, 83, G - 1);
    await ed.fill('ハシゴ', 84, 11, 84, G - 1);
    await k.foes(CAPS, [[80, 11]]);
    await k.lava(90, 100);
    await k.notes([[93, 22], [97, 22]]);
    await k.embers([91, 99]);
    await k.foes(ROBO, [106]);
    await k.notes([[110, 23]]);
    await ed.fill(BLOCK, 112, 18, 118, G - 1);
    await k.foes(CAPS, [[116, 17]]);
    await k.pit(120, 140);
    await k.ledges(CLOUD, [[122, 124, 17], [128, 130, 15], [134, 136, 17]]);
    await k.bats([[129, 10]]);
    await k.foes(SPARK, [146]);
    await k.light(152, 20);
    await k.stairs(BLOCK, 160, 4);
    await k.foes(SPIKER, [172, 178]);
    await k.start();
    await k.goal(190);
  });

  // ================= 8-4 やみのかいろう（暗やみ・遅い強制スクロール） =================
  await build({ theme: 'dark', title: '8-4 やみのかいろう', width: 160, autoScroll: 1, dark: true, file: 'stage8_4.js', name: 'STAGE_8_4' }, async (ed) => {
    const k = darkKit(ed, 160);
    await k.ground();
    await ed.fill(BLOCK, 0, 0, 159, 13);
    await k.torches(Array.from({ length: 13 }, (_, i) => [8 + i * 12, 17]));
    await k.message(6, 20, '8-4 やみのかいろう/暗い ろうかを 画面が 進む。/たいまつの 明かりを たよりに！');
    await k.light(10, 20);
    await k.pit(16, 19);
    await k.wall(24, 2);
    await k.bats([[30, 18]]);
    await k.pit(36, 42);
    await k.shadowLedges([[38, 40, 21]]);
    await ed.place(SPIKE, [[48, G - 1], [49, G - 1]]);
    await k.wall(54, 3);
    await k.bats([[60, 18], [66, 18]]);
    await k.lava(70, 78);
    await k.shadowLedges([[73, 75, 21]]);
    await k.embers([71, 77]);
    await ed.fill(BLOCK, 84, 14, 96, 20);
    await k.foes(CAPS, [90]);
    await k.pit(100, 106);
    await k.notes([[103, 22]]);
    await k.wall(112, 2);
    await k.wall(116, 3);
    await k.bats([[120, 18]]);
    await k.pit(126, 134);
    await k.shadowLedges([[128, 129, 21], [132, 133, 20]]);
    await k.foes(SPARK, [140]);
    await k.start();
    await k.goal(154);
  });

  // ================= 8-5 やみの城（暗やみ） =================
  await build({ theme: 'castle', title: '8-5 やみの城', width: 216, dark: true, file: 'stage8_5.js', name: 'STAGE_8_5' }, async (ed) => {
    const { place, fill } = ed;
    const k = darkKit(ed, 216);
    const BRIDGE = '木の橋（上からだけ乗れる）', BRICK = 'お城のレンガ', IRON = '鉄のブロック';
    await k.ground();
    await fill(BRICK, 0, 8, 215, 9);
    await k.torches(Array.from({ length: 17 }, (_, i) => [6 + i * 12, 19]).filter(([x]) => x < 46 || x > 62));
    await place('窓（飾り）', [16, 76, 116, 146, 176].map((x) => [x, 15]));
    await k.message(6, 20, '8-5 やみの城/いよいよ 最後の城。/やみの大王が 待っている！');
    await k.light(10, 20);
    await k.lava(16, 30);
    await k.notes([[19, 22], [24, 21]]);
    await k.embers([22, 28]);
    await k.bats([[36, 18]]);
    await k.foes(ROBO, [40]);
    await fill(BRICK, 46, 10, 62, 19);
    await place(SPIKE_D, [[49, 20], [50, 20], [55, 20], [56, 20], [61, 20]]);
    await place(SPIKE, [[52, G - 1], [58, G - 1]]);
    await k.lava(68, 96);
    await k.ledges(BRIDGE, [[70, 72, 21], [77, 79, 19], [84, 86, 21], [91, 93, 20]]);
    await k.embers([74, 81, 88, 95]);
    await k.bats([[82, 15]]);
    await k.foes('ギフトボックス', [102]);
    await k.foes(ROBO, [108, 116]);
    await k.cannon(IRON, 122, 1, 2);
    await k.lava(128, 150);
    await fill(IRON, 132, 20, 133, 26);
    await fill(IRON, 140, 18, 141, 26);
    await fill(IRON, 147, 20, 148, 26);
    await k.embers([130, 136, 144, 150]);
    await k.bats([[138, 14]]);
    await k.light(156, 20);
    await k.foes(SPIKER, [162, 168]);
    await k.stairs(BRICK, 176, 3);
    await fill(BRICK, 206, 10, 215, G - 1);
    await place('ボス扉（上）', [[202, G - 2], [203, G - 2]]);
    ed.nextPrompt = '8-5B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[202, G - 1], [203, G - 1]]);
    await k.torches([[200, G - 2], [205, G - 2]]);
    await k.start();
  });

  // ================= 最後のボス部屋：やみの大王（暗やみ） =================
  await build({ theme: 'castle', title: 'やみの大王', width: 16, dark: true, file: 'stage8_5b.js', name: 'STAGE_8_5B' }, async (ed) => {
    const { place, fill } = ed;
    await fill('地面', 0, G, 15, 26);
    await fill('お城のレンガ', 0, 11, 0, G - 1);
    await fill('お城のレンガ', 15, 11, 15, G - 1);
    await fill('お城のレンガ', 0, 10, 15, 11);
    await place(TORCH, [[2, 16], [13, 16], [5, 13], [10, 13], [7, 19], [8, 19]]);
    await fill('木の橋（上からだけ乗れる）', 2, 20, 4, 20);
    await fill('木の橋（上からだけ乗れる）', 11, 20, 13, 20);
    await place('ボス：やみの大王（10 回踏むと倒れてクリア。後半は空を飛ぶ）', [[11, G - 1]]);
    await place('スタート位置', [[2, G - 1]]);
  });

  // ================= 隠しコース 8-? ほしくずのみち（速い強制スクロール） =================
  await build({ theme: 'dark', title: '8-? ほしくずのみち', width: 160, autoScroll: 2, file: 'stage8_s.js', name: 'STAGE_8_S' }, async (ed) => {
    const k = darkKit(ed, 160);
    await k.ground();
    await k.pit(12, 150);
    await k.message(6, 20, 'ひみつの ほしくずのみち/速い 強制スクロールと/音符ブロック！');
    await k.light(9, 20);
    await k.notes([[15, 22], [20, 21], [25, 22], [30, 20]]);
    await k.shadowLedges([[34, 37, 20]]);
    await k.notes([[41, 22], [46, 21], [51, 22]]);
    await k.ledges(CLOUD, [[55, 58, 19]]);
    await k.notes([[62, 21], [67, 22], [72, 20]]);
    await k.shadowLedges([[76, 80, 20]]);
    await k.foes(SPIKER, [[78, 19]]);
    await k.notes([[84, 22], [89, 21], [94, 22], [99, 20]]);
    await k.shadowLedges([[103, 106, 19]]);
    await k.bats([[108, 14]]);
    await k.notes([[110, 21], [115, 22], [120, 21], [125, 20]]);
    await k.shadowLedges([[129, 133, 20]]);
    await k.notes([[137, 22], [142, 21], [147, 22]]);
    await k.start();
    await k.goal(155);
  });
})();
