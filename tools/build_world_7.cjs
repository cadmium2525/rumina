// ワールド 7（7-1〜7-5、ボス部屋、隠しコース 7-?）を
// ステージエディタを操作して作る: node tools/build_world_7.cjs
// マグマの山。新しい仕掛けは強制スクロール（7-2 遅い・7-4 と 7-? 速い）と、溶岩から跳び出す「ひのこ」。
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const BASALT = '火山岩';
const BLEDGE = '冷えた溶岩の足場（上からだけ乗れる）';
const EMBER = 'ひのこ（溶岩の中に置く。跳び出す・踏めない）';
const SECRET = 'ひみつのゴール（地図の隠し道が開く）';
const CANNON = '砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）';

const volcanoKit = (ed, width) => {
  const k = kit(ed, width);
  return {
    ...k,
    // 溶岩の中から立つ岩の柱（top 段から下まで）
    rocks: async (list) => { for (const [x0, x1, top] of list) await ed.fill(BASALT, x0, top, x1, 26); },
    rockLedges: (list) => k.ledges(BLEDGE, list),
    embers: (xs) => ed.place(EMBER, xs.map((x) => [x, G])),
    // 地面の上の壁（高さ h）
    wall: (x, h, w = 1) => ed.fill(BASALT, x, G - h, x + w - 1, G - 1),
  };
};

(async () => {
  // ================= 7-1 かざんのふもと（ひみつのゴール） =================
  // 台地の上を進むふつうの道。台地の上の金のブロックをスピンジャンプで壊すと、下の洞窟へ。洞窟の奥にひみつのゴール
  await build({ theme: 'volcano', title: '7-1 かざんのふもと', width: 216, file: 'stage7_1.js', name: 'STAGE_7_1' }, async (ed) => {
    const k = volcanoKit(ed, 216);
    await k.ground();
    await k.message(6, 20, '7-1 かざんのふもと/溶岩から ひのこが 跳び出すよ。/跳んでいない時に 渡ろう。');
    await k.light(10, 20);
    await k.lava(18, 21);
    await k.embers([20]);
    await k.foes(CAPS, [30]);
    await k.stairs(BASALT, 36, 3);
    await k.rockLedges([[44, 47, 20]]);
    await k.foes(DRONE, [[46, 16]]);
    await k.lava(50, 60);
    await k.rockLedges([[52, 54, 21], [57, 58, 20]]);
    await k.embers([55, 60]);
    await k.foes(ROBO, [66]);
    await k.cannon(BASALT, 72, 1, 2);
    await k.foes(SPIKER, [80, 86]);
    await k.lava(92, 104);
    await k.rockLedges([[95, 97, 20], [100, 101, 19]]);
    await k.embers([98, 103]);
    await k.foes(CAPS, [[160, 11]]);
    // 台地：2 段ずつの岩の段で上がる。中は高い洞窟（入口は上の金のブロックだけ）
    for (let i = 0; i < 6; i++) await ed.fill(BASALT, 108 + i * 2, 22 - i * 2, 109 + i * 2, G - 1);
    await ed.fill(BASALT, 120, 12, 170, 26);
    await ed.fill('消しゴム', 123, 13, 167, 24);
    await ed.fill(TURN, 127, 12, 129, 12);
    await k.message(124, 8, '金のブロックは/大きい時に スピンジャンプで/上から 壊せるよ。');
    await k.foes(ROBO, [[136, 11]]);
    await k.foes(SPIKER, [[152, 11]]);
    await k.foes(DRONE, [[145, 7]]);
    // 洞窟の中：溶岩のくぼみと足場、奥にひみつのゴール
    await ed.fill('マグマ（落ちるとミス）', 139, 25, 141, 26);
    await ed.place(EMBER, [[140, 25]]);
    await k.rockLedges([[137, 143, 22], [130, 133, 19], [146, 149, 18]]);
    await k.foes(CAPS, [[152, 24]]);
    await k.light(157, 21);
    await ed.place(SECRET, [[163, 24]]);
    // 台地を下りる段
    for (let i = 0; i < 5; i++) await ed.fill(BASALT, 171 + i * 2, 14 + i * 2, 172 + i * 2, G - 1);
    await k.lava(184, 188);
    await k.rockLedges([[185, 187, 21]]);
    await k.embers([184, 188]);
    await k.light(192, 20);
    await k.foes(CAPS, [196]);
    await k.start();
    await k.goal(206);
  });

  // ================= 7-2 ようがんのかわ（遅い強制スクロール） =================
  await build({ theme: 'volcano', title: '7-2 ようがんのかわ', width: 160, autoScroll: 1, file: 'stage7_2.js', name: 'STAGE_7_2' }, async (ed) => {
    const k = volcanoKit(ed, 160);
    await k.ground();
    await k.message(6, 20, '7-2 ようがんのかわ/画面が ひとりでに 進むよ。/左のはしと 壁に はさまれないでね！');
    await k.light(10, 20);
    await k.lava(13, 145);
    await k.rocks([[16, 19, 21], [23, 25, 20], [28, 33, 21], [46, 52, 20], [57, 59, 21], [62, 65, 19], [69, 71, 21],
      [75, 84, 20], [97, 100, 19], [104, 106, 21], [110, 118, 20], [121, 123, 21], [127, 131, 20], [134, 137, 19], [140, 143, 20]]);
    await k.rockLedges([[36, 38, 19], [41, 43, 17], [87, 89, 18], [92, 94, 16]]);
    await ed.fill(BASALT, 114, 17, 114, 19); // 島の上の壁（はさまれないように越える）
    await k.embers([21, 26, 35, 40, 54, 55, 67, 73, 86, 88, 93, 102, 108, 125, 139]);
    await k.foes(SPIKER, [[31, 20]]);
    await ed.fill(CANNON, 52, 18, 52, 19);
    await k.foes(DRONE, [[63, 15], [135, 15]]);
    await k.foes(ROBO, [[80, 19]]);
    await k.foes(CAPS, [[129, 19]]);
    await k.start();
    await k.goal(154);
  });

  // ================= 7-3 かざんのどうくつ =================
  await build({ theme: 'volcano', title: '7-3 かざんのどうくつ', width: 208, file: 'stage7_3.js', name: 'STAGE_7_3' }, async (ed) => {
    const k = volcanoKit(ed, 208);
    await k.ground();
    await ed.fill(BASALT, 0, 0, 207, 12);
    await k.message(6, 20, '7-3 かざんのどうくつ/天井の低い 溶岩の どうくつ。/ひのこの 高さに 気をつけて。');
    await k.light(10, 20);
    await k.lava(16, 22);
    await k.embers([19]);
    await k.foes(CAPS, [28]);
    await ed.fill(BASALT, 34, 13, 44, 18);
    await ed.place(SPIKE_D, [[36, 19], [40, 19], [43, 19]]);
    await k.foes(SPIKER, [38, 42]);
    await k.lava(50, 62);
    await k.rockLedges([[52, 54, 21], [57, 59, 20]]);
    await k.embers([55, 61]);
    await k.foes(ROBO, [70]);
    await k.foes(SPARK, [78, 84]);
    await k.lava(90, 110);
    await k.rockLedges([[92, 94, 21], [98, 100, 19], [104, 106, 21]]);
    await k.embers([96, 102, 108]);
    await k.foes(DRONE, [[100, 15]]);
    await k.wall(116, 2);
    await k.cannon(BASALT, 122, 1, 2);
    await k.foes(CAPS, [130, 136]);
    await ed.fill(BASALT, 142, 13, 158, 19);
    await k.foes(SPARK, [148, 154]);
    await k.lava(164, 172);
    await k.rockLedges([[167, 169, 21]]);
    await k.embers([165, 171]);
    await k.light(178, 20);
    await k.foes(ROBO, [186]);
    await k.stairs(BASALT, 190, 3);
    await k.start();
    await k.goal(200);
  });

  // ================= 7-4 ふんかのみち（速い強制スクロール） =================
  await build({ theme: 'volcano', title: '7-4 ふんかのみち', width: 176, autoScroll: 2, file: 'stage7_4.js', name: 'STAGE_7_4' }, async (ed) => {
    const k = volcanoKit(ed, 176);
    await k.ground();
    await k.message(6, 20, '7-4 ふんかのみち/速い 強制スクロールだよ。/止まらずに 進もう！');
    await k.light(10, 20);
    await k.wall(20, 2);
    await k.lava(26, 29);
    await k.embers([28]);
    await k.wall(34, 3);
    await k.foes(CAPS, [40]);
    await k.lava(44, 50);
    await k.rockLedges([[46, 48, 21]]);
    await k.embers([45, 50]);
    await k.wall(54, 2);
    await k.wall(56, 4);
    await k.foes(ROBO, [62]);
    await k.lava(68, 76);
    await k.rockLedges([[70, 71, 21], [74, 75, 20]]);
    await k.embers([72, 76]);
    await ed.fill(BASALT, 82, 14, 92, 20); // 天井の低いトンネル
    await k.foes(CAPS, [88]);
    await k.wall(96, 3);
    await k.foes(SPARK, [100]);
    await k.lava(106, 118);
    await k.rockLedges([[108, 110, 21], [113, 115, 20]]);
    await k.embers([107, 112, 117]);
    await k.foes(DRONE, [[112, 16]]);
    await k.wall(124, 2);
    await k.wall(128, 3);
    await k.foes(CAPS, [134, 140]);
    await k.lava(146, 152);
    await k.rockLedges([[148, 150, 21]]);
    await k.embers([152]);
    await k.start();
    await k.goal(168);
  });

  // ================= 7-5 かざんの城 =================
  await build({ theme: 'castle', title: '7-5 かざんの城', width: 216, file: 'stage7_5.js', name: 'STAGE_7_5' }, async (ed) => {
    const { place, fill } = ed;
    const k = volcanoKit(ed, 216);
    const BRIDGE = '木の橋（上からだけ乗れる）', BRICK = 'お城のレンガ', IRON = '鉄のブロック';
    await k.ground();
    await fill(BRICK, 0, 8, 215, 9);
    await place('たいまつ（飾り）', [8, 40, 70, 104, 134, 160, 190].map((x) => [x, 19]));
    await place('窓（飾り）', [16, 46, 116, 146, 176].map((x) => [x, 15]));
    await k.message(6, 20, '7-5 かざんの城/溶岩の ひのこと 木の橋。/かざんの王は 床から 火柱を 出すよ。');
    await k.light(10, 20);
    await k.lava(16, 30);
    await k.ledges(BRIDGE, [[18, 20, 21], [24, 26, 20]]);
    await k.embers([22, 28]);
    await k.foes(ROBO, [38]);
    await k.cannon(IRON, 44, 1, 2);
    await fill(BRICK, 50, 10, 66, 19);
    await place(SPIKE_D, [[53, 20], [54, 20], [59, 20], [60, 20], [65, 20]]);
    await place(SPIKE, [[56, G - 1], [62, G - 1]]);
    await k.lava(72, 100);
    await k.ledges(BRIDGE, [[74, 76, 21], [81, 83, 19], [88, 90, 21], [95, 97, 20]]);
    await k.embers([78, 85, 92, 99]);
    await k.foes(DRONE, [[86, 15]]);
    await k.foes('ギフトボックス', [106]);
    await k.foes(ROBO, [112, 120]);
    await k.lava(126, 150);
    await fill(IRON, 130, 20, 131, 26);
    await fill(IRON, 138, 18, 139, 26);
    await fill(IRON, 146, 20, 147, 26);
    await k.embers([128, 134, 142, 149]);
    await k.light(156, 20);
    await k.foes(SPIKER, [162, 168]);
    await k.stairs(BRICK, 176, 3);
    await fill(BRICK, 206, 10, 215, G - 1);
    await place('ボス扉（上）', [[202, G - 2], [203, G - 2]]);
    ed.nextPrompt = '7-5B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[202, G - 1], [203, G - 1]]);
    await place('たいまつ（飾り）', [[200, G - 2], [205, G - 2]]);
    await k.start();
  });

  // ================= ボス部屋：かざんの王 =================
  await build({ theme: 'castle', title: 'かざんの王', width: 16, file: 'stage7_5b.js', name: 'STAGE_7_5B' }, async (ed) => {
    const { place, fill } = ed;
    await fill('地面', 0, G, 15, 26);
    await fill('お城のレンガ', 0, 11, 0, G - 1);
    await fill('お城のレンガ', 15, 11, 15, G - 1);
    await fill('お城のレンガ', 0, 10, 15, 11);
    await place('たいまつ（飾り）', [[3, 16], [12, 16], [7, 14], [8, 14]]);
    await fill('木の橋（上からだけ乗れる）', 2, 20, 4, 20);
    await fill('木の橋（上からだけ乗れる）', 11, 20, 13, 20);
    await place('ボス：かざんの王（8 回踏むと倒れてクリア。床から火柱）', [[11, G - 1]]);
    await place('スタート位置', [[2, G - 1]]);
  });

  // ================= 隠しコース 7-? ひのこのみち（速い強制スクロール） =================
  await build({ theme: 'volcano', title: '7-? ひのこのみち', width: 160, autoScroll: 2, file: 'stage7_s.js', name: 'STAGE_7_S' }, async (ed) => {
    const k = volcanoKit(ed, 160);
    await k.ground();
    await k.lava(12, 150);
    await k.message(6, 20, 'ひみつの ひのこのみち/速い 強制スクロールと ひのこの むれ。/ゴールすると お城への近道が開く。');
    await k.light(9, 20);
    await k.rocks([[14, 16, 21], [20, 21, 20], [25, 27, 21], [31, 32, 19], [36, 38, 20], [42, 43, 21], [47, 50, 19], [54, 55, 20],
      [59, 61, 21], [65, 66, 19], [70, 74, 20], [78, 79, 21], [83, 85, 19], [89, 90, 20], [94, 97, 21], [101, 102, 19],
      [106, 108, 20], [112, 113, 21], [117, 120, 19], [124, 125, 20], [129, 131, 21], [135, 136, 19], [140, 143, 20], [147, 149, 21]]);
    await k.embers([18, 23, 29, 34, 40, 45, 52, 57, 63, 68, 76, 81, 87, 92, 99, 104, 110, 115, 122, 127, 133, 138, 145]);
    await k.foes(DRONE, [[62, 14], [98, 13], [132, 14]]);
    await k.foes(SPIKER, [[72, 19]]);
    await k.light(118, 15);
    await k.start();
    await k.goal(155);
  });
})();
