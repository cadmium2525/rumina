// ワールド 5（5-1〜5-5、5-2 の扉の先の小部屋、ボス部屋、隠しコース 5-?）を
// ステージエディタを操作して作る: node tools/build_world_5.cjs
// 空のステージは地面が無く、空中に浮かぶ島（20〜21 段）と雲を渡っていく。下に落ちるとミス。
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const CLOUD = '雲（上からだけ乗れる）';
const SECRET = 'ひみつのゴール（地図の隠し道が開く）';
const CANNON = '砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）';
const TOP = 20; // 島の一番上の段（立つ所は 19 段）

// 空のステージ用の道具：島・雲・島の上の敵・スタート・ゴール
const skyKit = (ed, width) => {
  const k = kit(ed, width);
  return {
    ...k,
    // 「新しいステージ」は地面つきで始まるので、空のステージは最初に地面を消す
    clearGround: () => ed.fill('消しゴム', 0, G, width - 1, 26),
    island: (x0, x1, top = TOP, name = '地面') => ed.fill(name, x0, top, x1, top + 1),
    clouds: (list) => k.ledges(CLOUD, list),
    on: (name, xs, top = TOP) => k.foes(name, xs.map((x) => [x, top - 1])),
    cannonOn: (x, n = 2, top = TOP) => ed.fill(CANNON, x, top - n, x, top - 1),
    start: (x = 3) => ed.place('スタート位置', [[x, TOP - 1]]),
    goal: (x) => ed.place('ゴール（もう一度置くと移動）', [[x, TOP - 1]]),
  };
};

(async () => {
  // ================= 5-1 くものうえ =================
  await build({ theme: 'sky', title: '5-1 くものうえ', width: 208, file: 'stage5_1.js', name: 'STAGE_5_1' }, async (ed) => {
    const k = skyKit(ed, 208);
    await k.clearGround();
    await k.island(0, 14);
    await k.message(6, 16, '5-1 くものうえ/ワールド5 そらの国へ ようこそ。/雲は 上からだけ乗れるよ。落ちないでね。');
    await k.light(10, 16);
    await k.clouds([[17, 19, 19], [22, 24, 18]]);
    await k.island(27, 40);
    await k.on(SPIKER, [31, 36]);
    await k.clouds([[43, 45, 19], [48, 50, 17], [53, 55, 19]]);
    await k.foes(DRONE, [[49, 13]]);
    await k.island(58, 72);
    await k.on(CAPS, [62]);
    await k.cannonOn(70);
    await k.clouds([[75, 77, 20], [80, 82, 18], [85, 87, 16], [90, 92, 18], [95, 97, 20]]);
    await k.foes(DRONE, [[84, 12], [93, 12]]);
    await k.island(100, 118);
    await k.on(ROBO, [108]);
    await k.light(112, 16);
    await k.island(122, 130, 22);
    await k.on('ギフトボックス', [126], 22);
    await k.clouds([[133, 135, 20], [138, 140, 18], [143, 145, 20]]);
    await k.island(148, 160);
    await k.on('甲羅', [150]);
    await k.on(SPIKER, [153, 157]);
    await k.clouds([[163, 165, 19], [168, 170, 17], [173, 175, 19]]);
    await k.foes(DRONE, [[169, 12]]);
    await k.island(178, 207);
    await k.light(184, 16);
    await k.start();
    await k.goal(198);
  });

  // ================= 5-2 にじのはし（ひみつ：穴の底の雲から扉へ） =================
  await build({ theme: 'sky', title: '5-2 にじのはし', width: 216, file: 'stage5_2.js', name: 'STAGE_5_2' }, async (ed) => {
    const { place } = ed;
    const k = skyKit(ed, 216);
    await k.clearGround();
    await k.island(0, 14);
    await k.message(6, 16, '5-2 にじのはし/雲の道が つづくよ。/ときには とびこむ勇気も たいせつ。');
    await k.light(10, 16);
    await k.clouds([[17, 20, 19], [24, 26, 17], [29, 31, 19]]);
    await k.island(34, 50);
    await k.on(SPIKER, [38, 44]);
    await k.on(CAPS, [48]);
    await k.clouds([[53, 55, 18], [58, 60, 16], [63, 65, 18]]);
    await k.foes(DRONE, [[59, 12]]);
    await k.island(68, 88);
    await k.on(ROBO, [76]);
    await k.cannonOn(84);
    // 穴：上の雲を渡るのがふつうの道。下は見えないが、いちばん下に雲がある
    await k.clouds([[92, 94, 19], [98, 100, 19]]);
    // ---- 寄り道：穴の底の雲（25 段）を右へ。島の下の通路の奥に扉（行き先は 5-2B の小部屋） ----
    await k.clouds([[88, 134, 25]]);
    await k.foes(SPIKER, [[112, 24]]);
    await place('ボス扉（上）', [[128, 23], [129, 23]]);
    ed.nextPrompt = '5-2B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[128, 24], [129, 24]]);
    // ふつうの道のつづき
    await k.island(105, 130);
    await k.on(SPIKER, [112, 120]);
    await k.foes(DRONE, [[117, 14]]);
    await k.clouds([[133, 135, 19], [138, 140, 17], [143, 145, 19]]);
    await k.island(148, 165);
    await k.on(ROBO, [156]);
    await k.light(160, 16);
    await k.clouds([[168, 170, 18], [173, 175, 16], [178, 180, 18]]);
    await k.foes(DRONE, [[174, 11]]);
    await k.island(183, 215);
    await k.on(CAPS, [190]);
    await k.start();
    await k.goal(205);
  });

  // ================= 5-2 の扉の先：くものしたの部屋（ひみつのゴール） =================
  await build({ theme: 'sky', title: '5-2 くものしたの部屋', width: 40, file: 'stage5_2b.js', name: 'STAGE_5_2B' }, async (ed) => {
    const k = skyKit(ed, 40);
    await k.ground();
    await k.clouds([[8, 10, 20], [14, 16, 18], [20, 22, 20]]);
    await k.foes(DRONE, [[15, 14]]);
    await k.foes(SPIKER, [12, 25]);
    await k.light(5, 20);
    await ed.place('スタート位置', [[2, G - 1]]);
    await ed.place(SECRET, [[32, G - 1]]);
  });

  // ================= 5-3 そらの神殿 =================
  await build({ theme: 'sky', title: '5-3 そらの神殿', width: 216, file: 'stage5_3.js', name: 'STAGE_5_3' }, async (ed) => {
    const { place, fill } = ed;
    const k = skyKit(ed, 216);
    await k.clearGround();
    const BRICK = '遺跡のレンガ', SLAB = '石の板（上からだけ乗れる）';
    const pillar = (x) => fill('柱（飾り）', x, 17, x, 19);
    await k.island(0, 14, TOP, BRICK);
    await pillar(4);
    await pillar(12);
    await k.message(6, 16, '5-3 そらの神殿/雲の上に 浮かぶ 神殿。/石の板は 上からだけ乗れるよ。');
    await k.light(9, 16);
    await k.ledges(SLAB, [[17, 18, 19], [21, 22, 17], [25, 26, 19]]);
    await k.island(29, 48, TOP, BRICK);
    await fill(BRICK, 31, 15, 46, 15); // 神殿の屋根
    await place(SPIKE_D, [[35, 16], [36, 16], [42, 16]]);
    await k.on(ROBO, [39]);
    await k.cannonOn(47);
    await k.ledges(SLAB, [[51, 52, 19], [55, 56, 17], [59, 60, 15], [63, 64, 17], [67, 68, 19]]);
    await k.foes(DRONE, [[58, 11], [66, 12]]);
    await k.island(71, 92, TOP, BRICK);
    await fill('ハシゴ', 74, 12, 74, 19);
    await fill(BRICK, 75, 12, 90, 12); // 上の階
    await k.foes(SPIKER, [[80, 11], [86, 11]]);
    await k.light(83, 8);
    await k.on(CAPS, [82]);
    await place(SPIKE, [[88, 19]]);
    await k.ledges(SLAB, [[95, 96, 19], [99, 100, 18], [103, 104, 19]]);
    await k.island(107, 120, TOP, BRICK);
    await pillar(109);
    await k.on('甲羅', [111]);
    await k.on(SPIKER, [114, 118]);
    await k.ledges(SLAB, [[123, 124, 20], [127, 128, 18], [131, 132, 16], [135, 136, 18], [139, 140, 20]]);
    await k.foes(DRONE, [[130, 11], [138, 12]]);
    await k.island(143, 160, TOP, BRICK);
    await k.cannonOn(145);
    await k.on(ROBO, [150, 156]);
    await k.ledges(SLAB, [[163, 164, 19], [167, 168, 17], [171, 172, 19]]);
    await k.island(175, 215, TOP, BRICK);
    await pillar(178);
    await pillar(194);
    await k.light(182, 16);
    await k.start();
    await k.goal(204);
  });

  // ================= 5-4 ながれぼしの道 =================
  await build({ theme: 'sky', title: '5-4 ながれぼしの道', width: 224, file: 'stage5_4.js', name: 'STAGE_5_4' }, async (ed) => {
    const k = skyKit(ed, 224);
    await k.clearGround();
    await k.island(0, 14);
    await k.message(6, 16, '5-4 ながれぼしの道/ドローンや 砲弾を ふみ台にして/遠くの雲へ とんでいこう。');
    await k.light(9, 16);
    await k.clouds([[17, 18, 19], [27, 28, 21], [33, 34, 21]]);
    await k.foes(DRONE, [[24, 17], [30, 15], [36, 17]]);
    await k.island(41, 54);
    await k.on(SPIKER, [46]);
    await k.cannonOn(54, 3);
    await k.clouds([[57, 58, 19], [61, 62, 17], [65, 66, 15], [69, 70, 17], [73, 74, 19]]);
    await k.foes(DRONE, [[63, 10], [71, 11]]);
    await k.island(77, 90);
    await k.on(ROBO, [84]);
    await k.light(88, 16);
    // 長い空：ドローンを踏んで渡る（下に低い雲が少し）
    await k.foes(DRONE, [[96, 17], [102, 15], [108, 17], [114, 15], [120, 17], [126, 16]]);
    await k.clouds([[99, 100, 21], [111, 112, 21], [123, 124, 21]]);
    await k.island(131, 148);
    await k.cannonOn(147, 3);
    await k.on(SPIKER, [136, 140]);
    await k.clouds([[151, 153, 19], [156, 158, 17], [161, 163, 19], [166, 168, 17]]);
    await k.island(171, 184);
    await k.on(CAPS, [176]);
    await k.clouds([[187, 189, 19], [192, 194, 17]]);
    await k.island(197, 223);
    await k.light(203, 16);
    await k.start();
    await k.goal(214);
  });

  // ================= 5-5 そらの城 =================
  await build({ theme: 'castle', title: '5-5 そらの城', width: 216, file: 'stage5_5.js', name: 'STAGE_5_5' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 216);
    const BRIDGE = '木の橋（上からだけ乗れる）', BRICK = 'お城のレンガ', IRON = '鉄のブロック';
    await k.ground();
    await fill(BRICK, 0, 8, 215, 9);
    await place('たいまつ（飾り）', [8, 38, 52, 82, 96, 140, 150, 166, 180, 192].map((x) => [x, 19]));
    await place('窓（飾り）', [14, 48, 90, 144, 174].map((x) => [x, 15]));
    await k.message(6, 20, '5-5 そらの城/床の穴の下は 空。落ちないでね。/そらの王は 床におりた時が チャンス！');
    await k.light(10, 20);
    await k.pit(15, 33);
    await k.ledges(BRIDGE, [[17, 18, 22], [21, 22, 20], [25, 26, 22], [29, 30, 20]]);
    await k.foes(DRONE, [[24, 16]]);
    await fill(IRON, 40, 15, 43, G - 1);
    await fill('ハシゴ', 39, 14, 39, G - 1);
    await k.foes(ROBO, [[41, 14]]);
    await k.ledges(BRIDGE, [[44, 45, 18], [47, 48, 21]]);
    await fill(BRICK, 54, 10, 76, 19);
    await place(SPIKE_D, [[57, 20], [58, 20], [63, 20], [64, 20], [69, 20], [70, 20]]);
    await place(SPIKE, [[60, G - 1], [66, G - 1]]);
    await k.foes(ROBO, [74]);
    await k.cannon(IRON, 82, 1, 3);
    await k.foes(SPIKER, [86]);
    await k.light(86, 19);
    await k.cannon(IRON, 90, 2, 2);
    await k.pit(96, 136);
    await k.ledges(BRIDGE, [[98, 99, 22], [102, 103, 20], [106, 107, 22], [110, 111, 19], [114, 115, 21],
      [118, 119, 22], [122, 123, 20], [126, 127, 22], [130, 131, 21], [134, 135, 22]]);
    await k.foes(DRONE, [[104, 15], [116, 14], [128, 15]]);
    await k.foes('ギフトボックス', [140]);
    await fill(TURN, 144, 21, 145, G - 1);
    await k.foes(ROBO, [150, 158]);
    await place(SPIKE, [[154, G - 1]]);
    await k.pit(162, 168);
    await k.ledges(BRIDGE, [[164, 165, 21]]);
    await fill(IRON, 172, 16, 175, G - 1);
    await fill('ハシゴ', 171, 15, 171, G - 1);
    await k.ledges(BRIDGE, [[176, 177, 19]]);
    await k.light(182, 20);
    await k.stairs(BRICK, 186, 3);
    await fill(BRICK, 206, 10, 215, G - 1);
    await place('ボス扉（上）', [[202, G - 2], [203, G - 2]]);
    ed.nextPrompt = '5-5B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[202, G - 1], [203, G - 1]]);
    await place('たいまつ（飾り）', [[200, G - 2], [205, G - 2]]);
    await k.start();
  });

  // ================= ボス部屋：そらの王 =================
  await build({ theme: 'castle', title: 'そらの王', width: 16, file: 'stage5_5b.js', name: 'STAGE_5_5B' }, async (ed) => {
    const { place, fill } = ed;
    await fill('地面', 0, G, 15, 26);
    await fill('お城のレンガ', 0, 11, 0, G - 1);
    await fill('お城のレンガ', 15, 11, 15, G - 1);
    await fill('お城のレンガ', 0, 10, 15, 11);
    await place('たいまつ（飾り）', [[3, 16], [12, 16]]);
    await place('窓（飾り）', [[7, 13], [8, 13]]);
    await fill('木の橋（上からだけ乗れる）', 2, 20, 4, 20);
    await fill('木の橋（上からだけ乗れる）', 11, 20, 13, 20);
    await place('ボス：そらの王（6 回踏むと倒れてクリア。空を飛ぶ）', [[11, G - 1]]);
    await place('スタート位置', [[2, G - 1]]);
  });

  // ================= 隠しコース 5-? にじのくも =================
  await build({ theme: 'sky', title: '5-? にじのくも', width: 176, file: 'stage5_s.js', name: 'STAGE_5_S' }, async (ed) => {
    const k = skyKit(ed, 176);
    await k.clearGround();
    await k.island(0, 12);
    await k.message(6, 16, 'ひみつの にじのくも/小さな雲を 渡っていこう。/ゴールすると お城への近道が開く。');
    await k.light(9, 16);
    await k.light(11, 16);
    await k.clouds([[15, 16, 19], [19, 20, 18], [23, 24, 17], [27, 28, 18], [31, 32, 19]]);
    await k.island(35, 44);
    await k.on(SPIKER, [40]);
    await k.clouds([[47, 48, 18], [51, 52, 16], [55, 56, 14], [59, 60, 16], [63, 64, 18]]);
    await k.foes(DRONE, [[53, 10]]);
    await k.island(67, 80);
    await k.on(ROBO, [74]);
    await k.light(78, 16);
    await k.foes(DRONE, [[86, 17], [92, 15], [98, 17], [104, 15]]);
    await k.clouds([[89, 90, 21], [101, 102, 21]]);
    await k.island(111, 124);
    await k.cannonOn(123, 3);
    await k.clouds([[127, 128, 19], [131, 132, 17], [135, 136, 19], [139, 140, 17], [143, 144, 19]]);
    await k.island(147, 175);
    await k.light(152, 16);
    await k.start();
    await k.goal(166);
  });
})();
