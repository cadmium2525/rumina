// ルミナの家（家の中）と、古びたドアの先の最終コース「ひかりのみなもと」（3 区間・最恐難易度）を
// ステージエディタを操作して作る: node tools/build_final.cjs
// 最終コースは古びたドアでつながった 3 区間：
//   1. 1 マスの足場と電気スパーク、天井のトゲの下の音符ブロック、ひのこの突き抜ける金のブロックの橋
//   2. 暗やみの溶岩の塔（ハシゴ・1 マスの足場・コウモリ）、トゲの廊下、トゲの床の上の足場
//   3. 速い強制スクロールで、溶岩の上の小さな岩とひのこの群れを走りぬける
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const STAR = 'ほしのブロック';
const SLEDGE = 'ほしの足場（上からだけ乗れる）';
const NOTE = '音符ブロック（乗ると跳ねる。B を押していると高く跳ぶ）';
const EMBER = 'ひのこ（溶岩の中に置く。跳び出す・踏めない）';
const BLOCK = 'やみの石';
const DLEDGE = 'やみの足場（上からだけ乗れる）';
const BAT = 'コウモリ（天井の下に置く。近づくと急降下・踏める）';
const TORCH = 'たいまつ（飾り）';
const LADDER = 'ハシゴ';
const BASALT = '火山岩';
const CANNON = '砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）';
const OLD_TOP = '古びたドア（上）';
const OLD = '古びたドア（下。置くと行き先を入力。↑で入る）';

const fk = (ed, width) => {
  const k = kit(ed, width);
  return {
    ...k,
    notes: (cells) => ed.place(NOTE, cells),
    embers: (xs) => ed.place(EMBER, xs.map((x) => [x, G])),
    bats: (cells) => ed.place(BAT, cells),
    pillars: async (name, list) => { for (const [x, top] of list) await ed.fill(name, x, top, x, 26); },
    singles: (name, list) => ed.place(name, list),
    spikesDown: (x0, x1, y) => ed.fill(SPIKE_D, x0, y, x1, y),
    // 古びたドア（x と x+1、足もとは地面の上）。to は行き先
    oldDoor: async (x, to) => {
      await ed.place(OLD_TOP, [[x, G - 2], [x + 1, G - 2]]);
      ed.nextPrompt = to;
      await ed.place(OLD, [[x, G - 1], [x + 1, G - 1]]);
    },
  };
};

(async () => {
  // ================= ルミナの家 =================
  await build({ theme: 'house', title: 'ルミナの家', width: 16, file: 'stage_home.js', name: 'STAGE_HOME' }, async (ed) => {
    const k = fk(ed, 16);
    await ed.fill('木の床', 0, G, 15, 26);
    await ed.fill('木の壁', 0, 9, 0, G - 1);
    await ed.fill('木の壁', 15, 9, 15, G - 1);
    await ed.fill('木の壁', 0, 9, 15, 10);
    await k.message(4, 19, 'ルミナの家/古びたドアの すきまから/ふしぎな 光が もれている…');
    await k.light(7, 19);
    await k.oldDoor(12, 'LAST-1');
    await ed.place('スタート位置', [[2, G - 1]]);
  });

  // ================= 最終コース 1 =================
  await build({ theme: 'space', title: 'ひかりのみなもと 1', width: 176, file: 'stage_last1.js', name: 'STAGE_LAST1' }, async (ed) => {
    const k = fk(ed, 176);
    await k.ground();
    await k.message(6, 20, 'ひかりのみなもと/ここが 最後の 道。/ほんとうの ちからを 見せて！');
    await k.light(10, 20);
    // 1 マスの足場と、跳ぶ道の上の電気スパーク
    await k.pit(14, 44);
    await k.singles(SLEDGE, [[17, 21], [21, 19], [25, 17], [29, 19], [33, 21], [37, 19], [41, 20]]);
    await k.foes(SPARK, [[19, 15], [27, 13], [35, 15]]);
    await k.foes(DRONE, [[23, 12], [31, 13], [39, 14]]);
    // 天井のトゲの下の音符ブロック（B を離す）→ すぐ高い足場（B を押したまま）
    await k.pit(49, 74);
    await k.notes([[52, 22], [56, 21], [60, 22], [64, 21]]);
    await k.spikesDown(50, 66, 16);
    await k.notes([[68, 22]]);
    await k.ledges(SLEDGE, [[71, 73, 17]]);
    await k.foes(ROBO, [78]);
    // 溶岩の上の金のブロックの橋（スピンジャンプで乗ると壊れる）。下からひのこが突き抜ける
    await k.lava(81, 108);
    await ed.fill(TURN, 81, 22, 108, 22);
    await k.embers([84, 90, 96, 102, 107]);
    await k.foes(SPARK, [[88, 21], [100, 21]]);
    await k.cannon(STAR, 112, 0, 3);
    // 溶岩の上の金のブロック 1 つずつ
    await k.lava(113, 140);
    await k.singles(TURN, [[116, 21], [120, 19], [124, 20], [128, 18], [132, 20], [136, 21]]);
    await k.embers([118, 122, 126, 130, 134, 138]);
    await k.foes(DRONE, [[126, 13]]);
    await k.foes(SPIKER, [146, 150]);
    // 音符ブロックで越える壁の先に、次への古びたドア
    await k.notes([[156, 23]]);
    await ed.fill(STAR, 159, 18, 160, G - 1);
    await k.oldDoor(168, 'LAST-2');
    await k.start();
  });

  // ================= 最終コース 2（暗やみ） =================
  await build({ theme: 'dark', title: 'ひかりのみなもと 2', width: 160, dark: true, file: 'stage_last2.js', name: 'STAGE_LAST2' }, async (ed) => {
    const k = fk(ed, 160);
    await k.ground();
    await k.message(6, 20, 'ひかりのみなもと 2/暗やみの 溶岩の 塔。/光を たよりに 登れ！');
    await k.light(10, 20);
    await ed.place(TORCH, [[4, 21], [11, 21]]);
    // 溶岩の上の高い足場（1〜2 マス）とコウモリ
    await k.lava(14, 47);
    await ed.fill(LADDER, 13, 4, 13, G - 1);
    await k.ledges(DLEDGE, [[14, 15, 4], [19, 19, 5], [23, 24, 4], [28, 28, 6], [32, 33, 5], [37, 37, 4], [41, 42, 5], [46, 47, 5]]);
    await k.bats([[21, 1], [30, 2], [39, 1]]);
    await ed.place(TORCH, [[14, 2], [32, 3], [46, 3]]);
    await ed.fill(LADDER, 48, 6, 48, G - 1);
    // 天井のある暗い廊下：上下のトゲ、溶岩の上の 1 マスの足場とひのこ、コウモリ
    await ed.fill(BLOCK, 49, 0, 110, 13);
    await ed.place(TORCH, [52, 66, 80, 94, 108].map((x) => [x, 17]));
    await ed.fill(BLOCK, 54, 14, 64, 19);
    await ed.place(SPIKE_D, [[55, 20], [57, 20], [59, 20], [61, 20], [63, 20]]);
    await ed.place(SPIKE, [[58, G - 1], [62, G - 1]]);
    await k.lava(68, 90);
    await k.singles(DLEDGE, [[71, 21], [75, 20], [79, 21], [83, 19], [87, 21]]);
    await k.embers([73, 77, 81, 85, 89]);
    await k.bats([[78, 14], [86, 14]]);
    await k.foes(SPARK, [96]);
    await k.foes(ROBO, [102]);
    // トゲの床の上の 1 マスの足場
    await ed.fill(LADDER, 111, 9, 111, G - 1);
    await ed.place(SPIKE, Array.from({ length: 32 }, (_, i) => [112 + i, G - 1]));
    await k.ledges(DLEDGE, [[113, 114, 9], [118, 118, 10], [122, 122, 9], [126, 126, 10], [130, 130, 8], [134, 134, 10], [138, 138, 9], [142, 143, 9]]);
    await k.bats([[116, 5], [124, 5], [132, 5], [140, 5]]);
    await ed.place(TORCH, [[113, 7], [130, 6], [143, 7]]);
    await ed.fill(LADDER, 144, 10, 144, G - 1);
    await ed.place(TORCH, [[150, 21], [155, 21]]);
    await k.oldDoor(152, 'LAST-3');
    await k.start();
  });

  // ================= 最終コース 3（速い強制スクロール） =================
  await build({ theme: 'volcano', title: 'ひかりのみなもと 3', width: 192, autoScroll: 2, file: 'stage_last3.js', name: 'STAGE_LAST3' }, async (ed) => {
    const k = fk(ed, 192);
    await k.ground();
    await k.lava(12, 182);
    await k.message(6, 20, 'ひかりのみなもと 3/さいごの 強制スクロール。/走りぬけろ！');
    await k.light(9, 20);
    const rocks = [[14, 21], [19, 19], [24, 21], [29, 18], [34, 20], [39, 21], [44, 19], [49, 17], [54, 19], [59, 21],
      [64, 19], [69, 20], [74, 18], [79, 20], [84, 21], [89, 19], [94, 17], [99, 19], [104, 21], [109, 20], [114, 18],
      [119, 20], [124, 21], [129, 19], [134, 17], [139, 19], [144, 21], [149, 20], [154, 18], [159, 20], [164, 21],
      [169, 19], [174, 20], [179, 21]];
    for (const [x, top] of rocks) await ed.fill(BASALT, x, top, x + 1, 26);
    await k.embers(rocks.map(([x]) => x + 3).filter((x) => x <= 182));
    for (const x of [50, 95, 135]) await ed.fill(CANNON, x, rocks.find(([rx]) => rx + 1 === x)[1] - 2, x, rocks.find(([rx]) => rx + 1 === x)[1] - 1);
    await k.foes(DRONE, [[62, 12], [102, 12], [142, 12], [172, 12]]);
    await k.start();
    await k.goal(187);
  });
})();
