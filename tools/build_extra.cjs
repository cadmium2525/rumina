// エクストラ「ほしの道」E-1〜E-10（高難易度）を、ステージエディタを操作して作る: node tools/build_extra.cjs
// ルミナの動きは変えず、地形と仕掛けの組み合わせで難しくする：
// 1 マスの足場・長い穴・音符ブロックの B の使い分け（天井のトゲの下では離す）・ひのこの群れ・強制スクロール・暗やみ・水中の迷路。
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const STAR = 'ほしのブロック';
const SLEDGE = 'ほしの足場（上からだけ乗れる）';
const NOTE = '音符ブロック（乗ると跳ねる。B を押していると高く跳ぶ）';
const NLEDGE = 'ネオンの足場（上からだけ乗れる）';
const CONC = 'コンクリート';
const RAIL = '高架の線路（上からだけ乗れる）';
const CANNON = '砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）';
const BASALT = '火山岩';
const EMBER = 'ひのこ（溶岩の中に置く。跳び出す・踏めない）';
const BLOCK = 'やみの石';
const DLEDGE = 'やみの足場（上からだけ乗れる）';
const BAT = 'コウモリ（天井の下に置く。近づくと急降下・踏める）';
const TORCH = 'たいまつ（飾り）';
const CLOUD = '雲（上からだけ乗れる）';
const CRYSTAL = '結晶（飾り）';
const LADDER = 'ハシゴ';
const LAVA = 'マグマ（落ちるとミス）';

const exKit = (ed, width) => {
  const k = kit(ed, width);
  return {
    ...k,
    notes: (cells) => ed.place(NOTE, cells),
    embers: (xs) => ed.place(EMBER, xs.map((x) => [x, G])),
    bats: (cells) => ed.place(BAT, cells),
    // 下まで続く 1 本の柱（x, top）
    pillars: async (name, list) => { for (const [x, top] of list) await ed.fill(name, x, top, x, 26); },
    spikesDown: (x0, x1, y) => ed.fill(SPIKE_D, x0, y, x1, y),
    groundAt: (x0, x1) => ed.fill('地面', x0, G, x1, 26),
  };
};

(async () => {
  // ================= E-1 ほしくずのがけ =================
  await build({ theme: 'space', title: 'E-1 ほしくずのがけ', width: 192, file: 'stage_e1.js', name: 'STAGE_E1' }, async (ed) => {
    const k = exKit(ed, 192);
    await k.ground();
    await k.message(6, 20, 'E-1 ほしくずのがけ/ここから先は むずかしいよ。/小さな足場を 正確に！');
    await k.light(10, 20);
    await k.pit(14, 40);
    await k.ledges(SLEDGE, [[17, 17, 21], [21, 21, 19], [25, 25, 20], [29, 29, 18], [33, 33, 21], [37, 37, 19]]);
    await k.foes(DRONE, [[23, 15], [31, 14]]);
    await k.foes(ROBO, [45]);
    await k.pit(49, 70);
    await k.pillars(STAR, [[52, 21], [56, 19], [60, 17], [64, 19], [68, 21]]);
    await k.foes(SPARK, [[58, 15], [62, 15]]);
    await k.foes(SPIKER, [74, 78]);
    await k.pit(81, 100);
    await k.ledges(SLEDGE, [[84, 85, 20], [90, 91, 20], [96, 97, 19]]);
    await k.foes(DRONE, [[88, 14], [94, 13]]);
    // トゲの天井の下の通路
    await ed.fill(STAR, 102, 15, 110, 18);
    await k.spikesDown(103, 109, 19);
    await k.foes(CAPS, [106]);
    // 天井のトゲの下の音符ブロック（B を押したままだと頭をぶつける）
    await k.pit(111, 130);
    await k.notes([[114, 22], [118, 21], [122, 22], [126, 21]]);
    await k.spikesDown(112, 128, 16);
    await k.cannon(STAR, 136, 1, 2);
    await k.foes(ROBO, [144]);
    await k.pit(151, 172);
    await k.ledges(SLEDGE, [[154, 154, 21], [158, 158, 20], [162, 162, 19], [166, 166, 20], [170, 170, 21]]);
    await k.foes(DRONE, [[164, 15]]);
    await k.light(176, 20);
    await k.start();
    await k.goal(184);
  });

  // ================= E-2 おんぷのめいろ =================
  // 天井のトゲの下では B を離して低く、高い足場へは B を押したまま高く
  await build({ theme: 'neon', title: 'E-2 おんぷのめいろ', width: 200, file: 'stage_e2.js', name: 'STAGE_E2' }, async (ed) => {
    const k = exKit(ed, 200);
    await k.ground();
    await k.message(6, 20, 'E-2 おんぷのめいろ/B を押す時と 押さない時を/見きわめて！');
    await k.light(9, 20);
    await k.pit(12, 74);
    await k.notes([[15, 22], [20, 22], [25, 22]]);
    await k.spikesDown(13, 28, 16);
    await k.notes([[30, 22]]);
    await k.ledges(NLEDGE, [[33, 36, 17]]);
    await k.notes([[41, 20], [46, 20]]);
    await k.spikesDown(38, 49, 12);
    await k.notes([[51, 20]]);
    await k.ledges(NLEDGE, [[54, 57, 15]]);
    await k.notes([[61, 21], [66, 22], [71, 21]]);
    await k.foes(ROBO, [79]);
    await k.pit(83, 109);
    await k.notes([[86, 22], [91, 21], [96, 20], [101, 21], [106, 22]]);
    await k.foes(DRONE, [[93, 15], [103, 15]]);
    await k.foes(CAPS, [116]);
    await k.notes([[125, 23]]);
    await ed.fill(CONC, 128, 19, 129, G - 1);
    await k.pit(131, 180);
    await k.notes([[134, 22], [139, 22]]);
    await k.spikesDown(132, 141, 16);
    await k.notes([[144, 21], [149, 19], [154, 17]]);
    await k.ledges(NLEDGE, [[158, 162, 13]]);
    await k.notes([[166, 17], [171, 20], [176, 22]]);
    await k.start(3);
    await k.goal(192);
  });

  // ================= E-3 ひのこのたき（速い強制スクロール） =================
  await build({ theme: 'volcano', title: 'E-3 ひのこのたき', width: 176, autoScroll: 2, file: 'stage_e3.js', name: 'STAGE_E3' }, async (ed) => {
    const k = exKit(ed, 176);
    await k.ground();
    await k.lava(12, 165);
    await k.message(6, 20, 'E-3 ひのこのたき/速い 強制スクロールと/ひのこの むれ！');
    await k.light(9, 20);
    const rocks = [[14, 21], [19, 19], [24, 21], [29, 20], [34, 18], [39, 20], [44, 21], [49, 19], [54, 21], [59, 19], [64, 17],
      [69, 19], [74, 21], [79, 20], [84, 18], [89, 20], [94, 21], [99, 19], [104, 21], [109, 20], [114, 18], [119, 20],
      [124, 21], [129, 19], [134, 21], [139, 20], [144, 18], [149, 20], [154, 21], [159, 20]];
    for (const [x, top] of rocks) await ed.fill(BASALT, x, top, x + 1, 26);
    await k.embers(rocks.map(([x]) => x + 3));
    await ed.fill(CANNON, 85, 16, 85, 17);
    await k.foes(DRONE, [[62, 13], [112, 12], [142, 13]]);
    await k.start();
    await k.goal(170);
  });

  // ================= E-4 くらやみのとう（暗やみ） =================
  await build({ theme: 'dark', title: 'E-4 くらやみのとう', width: 160, dark: true, file: 'stage_e4.js', name: 'STAGE_E4' }, async (ed) => {
    const k = exKit(ed, 160);
    await k.ground();
    await k.message(6, 20, 'E-4 くらやみのとう/暗やみの 高い所を 渡る。/落ちたら 溶岩だよ！');
    await k.light(10, 20);
    await ed.place(TORCH, [[4, 21], [11, 21]]);
    // A：溶岩の上の高い足場（ハシゴで上がって、ハシゴで下りる）
    await k.lava(14, 47);
    await ed.fill(LADDER, 13, 6, 13, G - 1);
    await k.ledges(DLEDGE, [[14, 16, 6], [20, 21, 6], [25, 26, 5], [30, 31, 6], [35, 36, 7], [40, 41, 6], [45, 47, 6]]);
    await k.bats([[23, 2], [33, 3], [43, 2]]);
    await ed.place(TORCH, [[15, 4], [30, 4], [46, 4]]);
    await ed.fill(LADDER, 48, 7, 48, G - 1);
    // B：天井のある暗い廊下
    await ed.fill(BLOCK, 49, 0, 110, 13);
    await ed.place(TORCH, [52, 64, 76, 88, 100].map((x) => [x, 17]));
    await ed.place(SPIKE, [[56, G - 1], [57, G - 1]]);
    await k.lava(62, 66);
    await k.embers([64]);
    await ed.fill(BLOCK, 70, 14, 80, 19);
    await ed.place(SPIKE_D, [[72, 20], [75, 20], [78, 20]]);
    await k.bats([[84, 14], [96, 14]]);
    await k.lava(90, 96);
    await k.ledges(DLEDGE, [[92, 94, 21]]);
    await k.embers([91, 95]);
    await k.foes(SPARK, [104]);
    // C：トゲの床の上の高い足場
    await ed.fill(LADDER, 111, 10, 111, G - 1);
    await ed.place(SPIKE, Array.from({ length: 29 }, (_, i) => [112 + i, G - 1]));
    await k.ledges(DLEDGE, [[112, 114, 10], [118, 119, 10], [123, 124, 9], [128, 129, 10], [133, 134, 11], [138, 140, 10]]);
    await k.bats([[121, 6], [131, 6]]);
    await ed.place(TORCH, [[113, 8], [139, 8]]);
    await ed.fill(LADDER, 141, 11, 141, G - 1);
    await ed.place(TORCH, [[150, 21]]);
    await k.start();
    await k.goal(154);
  });

  // ================= E-5 きんのブロックのみち =================
  // 溶岩の上の金のブロックの橋。スピンジャンプで乗ると壊れて落ちる。ひのこが橋を突き抜けて跳ぶ
  await build({ theme: 'space', title: 'E-5 きんのブロックのみち', width: 176, file: 'stage_e5.js', name: 'STAGE_E5' }, async (ed) => {
    const k = exKit(ed, 176);
    await k.ground();
    await k.message(6, 20, 'E-5 きんのブロックのみち/金のブロックの橋。/スピンジャンプで 乗ると こわれるよ！');
    await k.light(10, 20);
    await k.lava(14, 40);
    await ed.fill(TURN, 14, 22, 40, 22);
    await k.embers([17, 23, 29, 35]);
    await k.foes(SPARK, [[27, 21]]);
    await k.foes(ROBO, [46]);
    await k.lava(51, 80);
    for (const [x0, x1] of [[52, 56], [60, 63], [67, 70], [74, 79]]) await ed.fill(TURN, x0, 21, x1, 21);
    await k.embers([58, 65, 72]);
    await k.foes(DRONE, [[65, 16]]);
    await k.foes(SPIKER, [84, 88]);
    await k.lava(91, 120);
    await k.pillars(STAR, [[94, 21], [99, 20], [104, 19], [109, 20], [114, 21]]);
    await ed.place(TURN, [[99, 19], [109, 19]]);
    await k.embers([96, 101, 106, 111, 117]);
    await k.foes(CAPS, [124, 128]);
    await k.lava(131, 160);
    await ed.fill(TURN, 131, 22, 160, 22);
    await k.foes(SPARK, [[140, 21], [152, 21]]);
    await k.embers([136, 146, 156]);
    await k.foes(DRONE, [[145, 16]]);
    await k.light(164, 20);
    await k.start();
    await k.goal(170);
  });

  // ================= E-6 ほうだいのあらし =================
  await build({ theme: 'akiba', title: 'E-6 ほうだいのあらし', width: 192, file: 'stage_e6.js', name: 'STAGE_E6' }, async (ed) => {
    const k = exKit(ed, 192);
    await k.ground();
    await k.message(6, 20, 'E-6 ほうだいのあらし/砲弾の 雨の中を 進め！');
    await k.light(10, 20);
    await k.cannon(CONC, 18, 0, 2);
    await k.cannon(CONC, 30, 2, 2);
    await k.pit(36, 60);
    await k.ledges(RAIL, [[38, 42, 20], [46, 49, 18], [53, 57, 20]]);
    await ed.fill(CONC, 40, 21, 40, 26);
    await ed.fill(CONC, 55, 21, 55, 26);
    await ed.fill(CANNON, 50, 15, 50, 16);
    await k.foes(DRONE, [[51, 12]]);
    await k.foes(ROBO, [66, 72]);
    await k.cannon(CONC, 78, 1, 3);
    await k.pit(81, 110);
    await k.ledges(RAIL, [[83, 86, 21], [90, 93, 19], [97, 100, 17], [104, 107, 19]]);
    await ed.fill(CANNON, 95, 13, 95, 14);
    await ed.fill(CANNON, 109, 15, 109, 16);
    await k.foes(DRONE, [[92, 13]]);
    await k.foes(CAPS, [114, 120]);
    await k.foes(SPIKER, [118]);
    await k.cannon(CONC, 126, 2, 2);
    await k.stairs(CONC, 132, 4);
    await ed.fill(CONC, 136, 20, 140, G - 1);
    await ed.fill(CANNON, 140, 18, 140, 19);
    await k.pit(141, 170);
    await k.ledges(RAIL, [[143, 146, 20], [150, 153, 19], [157, 160, 20], [164, 167, 19]]);
    await ed.fill(CANNON, 155, 14, 155, 15);
    await k.foes(DRONE, [[162, 14]]);
    await k.foes(ROBO, [176]);
    await k.light(180, 20);
    await k.start();
    await k.goal(186);
  });

  // ================= E-7 みずのそこのほし =================
  // 天井の低い水中の迷路。トゲの間を泳いで抜ける
  await build({ theme: 'cave', title: 'E-7 みずのそこのほし', width: 176, file: 'stage_e7.js', name: 'STAGE_E7' }, async (ed) => {
    const k = exKit(ed, 176);
    const ROCK = '岩';
    await k.ground();
    await k.message(6, 20, 'E-7 みずのそこのほし/トゲの 迷路を 泳いで ぬけよう。');
    await k.light(10, 20);
    await ed.fill(ROCK, 14, 0, 160, 9);
    await ed.fill('水', 14, 10, 160, 23);
    await ed.fill(ROCK, 30, 14, 32, G - 1);
    await ed.place(SPIKE, [[30, 13], [31, 13], [32, 13]]);
    await ed.fill(ROCK, 50, 10, 52, 18);
    await ed.place(SPIKE, Array.from({ length: 7 }, (_, i) => [48 + i, G - 1]));
    await ed.fill(ROCK, 70, 14, 72, G - 1);
    await k.spikesDown(68, 74, 10);
    await ed.fill(ROCK, 90, 10, 92, 17);
    await ed.place(SPIKE, Array.from({ length: 7 }, (_, i) => [88 + i, G - 1]));
    await ed.fill(ROCK, 110, 14, 112, G - 1);
    await ed.fill(ROCK, 120, 10, 122, 19);
    await ed.fill(ROCK, 130, 14, 132, G - 1);
    await ed.place(SPIKE, [[116, G - 1], [117, G - 1], [126, G - 1], [127, G - 1]]);
    await k.spikesDown(114, 118, 10);
    await k.spikesDown(124, 128, 10);
    await k.foes(DRONE, [[40, 16], [61, 13], [80, 15], [100, 20], [140, 18]]);
    await k.light(150, 19);
    await k.start();
    await k.goal(170);
  });

  // ================= E-8 そらのきりたち =================
  await build({ theme: 'sky', title: 'E-8 そらのきりたち', width: 192, file: 'stage_e8.js', name: 'STAGE_E8' }, async (ed) => {
    const k = exKit(ed, 192);
    const TOP = 20;
    const island = (x0, x1) => ed.fill('地面', x0, TOP, x1, TOP + 1);
    const on = (name, xs) => k.foes(name, xs.map((x) => [x, TOP - 1]));
    await ed.fill('消しゴム', 0, G, 191, 26);
    await island(0, 12);
    await k.message(6, 16, 'E-8 そらのきりたち/小さな雲を 渡っていく。/下は 空だよ！');
    await k.light(9, 16);
    await k.ledges(CLOUD, [[16, 16, 19], [21, 21, 18], [26, 26, 19], [31, 31, 17], [36, 36, 19]]);
    await island(40, 44);
    await on(ROBO, [42]);
    await k.ledges(CLOUD, [[49, 50, 18], [56, 57, 18]]);
    await k.foes(DRONE, [[53, 14]]);
    await island(61, 64);
    await ed.fill(CANNON, 64, 17, 64, 19);
    await k.ledges(CLOUD, [[68, 68, 19], [73, 73, 17], [78, 78, 19], [83, 83, 16], [88, 88, 18]]);
    await k.foes(DRONE, [[75, 12], [85, 11]]);
    await island(92, 96);
    await on(SPIKER, [94]);
    await k.ledges(CLOUD, [[100, 100, 19], [104, 104, 18], [108, 108, 19]]);
    await k.foes(DRONE, [[102, 13], [106, 13]]);
    await island(112, 118);
    await on(ROBO, [115]);
    await ed.fill(CANNON, 118, 17, 118, 19);
    await k.ledges(CLOUD, [[122, 122, 19], [127, 127, 17], [132, 132, 15], [137, 137, 17], [142, 142, 19]]);
    await island(146, 150);
    await on(CAPS, [148]);
    await k.ledges(CLOUD, [[154, 155, 19], [160, 161, 18], [166, 167, 19]]);
    await k.foes(DRONE, [[158, 13], [164, 13]]);
    await island(171, 191);
    await k.light(175, 16);
    await ed.place('スタート位置', [[3, TOP - 1]]);
    await ed.place('ゴール（もう一度置くと移動）', [[185, TOP - 1]]);
  });

  // ================= E-9 はやぶさのみち（暗やみ・速い強制スクロール） =================
  // 暗やみの中、結晶の光をたよりに足場と音符ブロックを跳び移る
  await build({ theme: 'space', title: 'E-9 はやぶさのみち', width: 176, autoScroll: 2, dark: true, file: 'stage_e9.js', name: 'STAGE_E9' }, async (ed) => {
    const k = exKit(ed, 176);
    await k.ground();
    await k.pit(12, 165);
    await k.message(6, 20, 'E-9 はやぶさのみち/暗やみの 速い 強制スクロール。/結晶の 光を たよりに！');
    await k.light(9, 20);
    const plats = [[14, 16, 21, 'L'], [20, 21, 20, 'L'], [25, 27, 21, 'L'], [31, 31, 21, 'N'], [36, 36, 20, 'N'], [40, 42, 19, 'L'],
      [46, 46, 21, 'N'], [50, 53, 20, 'L'], [57, 58, 19, 'L'], [62, 62, 21, 'N'], [67, 67, 20, 'N'], [71, 74, 19, 'L'],
      [78, 79, 21, 'L'], [83, 83, 21, 'N'], [88, 90, 20, 'L'], [94, 94, 21, 'N'], [99, 99, 19, 'N'], [103, 106, 18, 'L'],
      [110, 111, 20, 'L'], [115, 115, 21, 'N'], [120, 122, 20, 'L'], [126, 126, 21, 'N'], [131, 131, 19, 'N'],
      [135, 138, 19, 'L'], [142, 143, 20, 'L'], [147, 147, 21, 'N'], [152, 154, 20, 'L'], [158, 159, 21, 'L'], [163, 164, 20, 'L']];
    for (const [x0, x1, top, t] of plats) {
      if (t === 'N') await k.notes([[x0, top]]);
      else await ed.fill(SLEDGE, x0, top, x1, top);
      await ed.place(CRYSTAL, [[x0, top - 3]]);
    }
    await k.foes(SPARK, [[52, 19], [137, 18]]);
    await k.foes(DRONE, [[85, 15], [118, 15]]);
    await ed.place(CRYSTAL, [[168, 20], [172, 20]]);
    await k.start();
    await k.goal(170);
  });

  // ================= E-10 ほしのはて =================
  await build({ theme: 'space', title: 'E-10 ほしのはて', width: 224, file: 'stage_e10.js', name: 'STAGE_E10' }, async (ed) => {
    const k = exKit(ed, 224);
    await k.ground();
    await k.message(6, 20, 'E-10 ほしのはて/ほしの道の さいご。/すべての ちからを 出しきろう！');
    await k.light(10, 20);
    // 溶岩の上の細い柱とひのこ
    await k.lava(14, 40);
    await k.pillars(STAR, [[17, 21], [21, 19], [25, 20], [29, 18], [33, 21], [37, 19]]);
    await k.embers([19, 23, 27, 31, 35, 39]);
    await k.foes(ROBO, [45]);
    // 穴の上の金のブロックの橋と電気スパーク
    await k.pit(51, 70);
    await ed.fill(TURN, 51, 22, 70, 22);
    await k.foes(SPARK, [[58, 21], [65, 21]]);
    await k.foes(CAPS, [74]);
    // 天井のトゲの下の音符ブロック
    await k.pit(79, 100);
    await k.notes([[82, 22], [86, 21], [90, 22], [94, 21], [98, 22]]);
    await k.spikesDown(80, 99, 16);
    // 音符ブロックで越える高い壁
    await k.notes([[105, 23]]);
    await ed.fill(STAR, 108, 18, 109, G - 1);
    // 1 マスの足場とコウモリ
    await k.pit(110, 140);
    await k.ledges(SLEDGE, [[113, 113, 20], [117, 117, 18], [121, 121, 19], [125, 125, 17], [129, 129, 19], [133, 133, 18], [137, 137, 20]]);
    await k.bats([[118, 13], [130, 13]]);
    await k.cannon(STAR, 146, 1, 2);
    await k.foes(SPIKER, [143]);
    // 溶岩の上の金のブロック 1 つずつ
    await k.lava(151, 178);
    await ed.place(TURN, [[154, 21], [158, 20], [162, 21], [166, 19], [170, 20], [174, 21]]);
    await k.embers([156, 160, 164, 168, 172, 176]);
    await k.foes(ROBO, [183]);
    // 雲の島
    await k.pit(187, 205);
    await k.ledges(CLOUD, [[190, 190, 19], [194, 194, 18], [198, 198, 19], [202, 202, 17]]);
    await k.foes(DRONE, [[196, 13]]);
    await k.light(210, 20);
    await k.start();
    await k.goal(216);
  });
})();
