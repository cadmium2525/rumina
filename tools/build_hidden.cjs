// 隠しコース（1-S・2-S・3-S）をステージエディタを操作して作る: node tools/build_hidden.cjs
// 地図では、各ワールドのひみつのゴールを見つけると行ける（js/overworld/maps.js の H）
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

(async () => {
  // ================= 1-? ひかりの花畑 =================
  await build({ theme: 'grass', title: '1-? ひかりの花畑', width: 144, file: 'stage1_s.js', name: 'STAGE_1_S' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 144);
    const SKY = '地面（上からだけ乗れる）', STONE = '石ブロック';
    await k.ground();
    await k.message(6, 20, 'ひみつの花畑を見つけたね！/光の玉が たくさんあるよ。/ゴールすると お城への近道が開く。');
    await k.light(10, 20);
    await k.light(13, 20);
    await k.hill(17, 2, 4);
    await k.foes(SPIKER, [28]);
    await fill(TURN, 32, 20, 38, 20);
    await k.light(35, 16);
    await k.foes('甲羅', [42]);
    await k.foes(SPIKER, [46, 49]);
    await fill('ツタ', 53, 12, 53, G - 1);
    await k.ledges(SKY, [[55, 59, 12], [63, 66, 13], [70, 74, 12]]);
    await k.light(57, 8);
    await k.light(72, 8);
    await k.foes('ギフトボックス', [[64, 12]]);
    await k.pit(60, 66);
    await k.ledges(STONE, [[62, 63, 21]]);
    await k.hill(78, 3, 3);
    await k.foes(CAPS, [92]);
    await k.light(96, 20);
    await k.pool(100, 110);
    await k.ledges(STONE, [[104, 106, 21]]);
    await k.foes(DRONE, [[105, 16]]);
    await k.light(116, 19);
    await k.foes(SPIKER, [120]);
    await k.start();
    await k.goal(132);
  });

  // ================= 2-? すなの地下神殿 =================
  await build({ theme: 'ruins', title: '2-? すなの地下神殿', width: 152, file: 'stage2_s.js', name: 'STAGE_2_S' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 152);
    const SLAB = '石の板（上からだけ乗れる）', BRICK = '遺跡のレンガ';
    await k.ground();
    await fill(BRICK, 0, 6, 151, 7); // 地下の天井
    for (const x of [12, 40, 70, 100, 130]) await fill('柱（飾り）', x, 8, x, G - 1);
    await k.message(6, 20, 'すなの地下神殿/ハシゴと石の板で 穴を越えよう。/ゴールすると お城への近道が開く。');
    await k.light(9, 20);
    await k.pit(16, 30);
    await k.ledges(SLAB, [[17, 18, 21], [21, 22, 19], [25, 26, 21], [28, 29, 20]]);
    await k.foes(SPARK, [[20, G], [27, G]]);
    await k.cannon('模様の石', 34, 1, 2);
    await k.foes(ROBO, [44]);
    await fill(BRICK, 50, 14, 54, G - 1); // 神殿の塔
    await fill('ハシゴ', 49, 13, 49, G - 1);
    await k.foes(SPIKER, [[52, 13]]);
    await k.ledges(SLAB, [[55, 56, 16], [59, 60, 19]]);
    await k.pit(57, 78);
    await k.ledges(SLAB, [[62, 63, 21], [66, 67, 19], [70, 71, 21], [74, 75, 20]]);
    await k.foes(DRONE, [[68, 14]]);
    await place(SPIKE_D, [[66, 8], [67, 8], [70, 8], [71, 8]]);
    await k.light(80, 20);
    await k.foes('甲羅', [84]);
    await k.foes(SPIKER, [88, 92]);
    await fill(TURN, 96, 21, 96, G - 1);
    await k.cannon('模様の石', 104, 0, 3);
    await k.pit(110, 126);
    await k.ledges(SLAB, [[112, 113, 22], [116, 117, 20], [120, 121, 22], [124, 125, 21]]);
    await k.foes(SPARK, [[115, G], [119, G], [123, G]]);
    await k.stairs(BRICK, 132, 3);
    await k.start();
    await k.goal(142);
  });

  // ================= 3-? くものうえのレール =================
  await build({ theme: 'akiba', title: '3-? くものうえのレール', width: 168, file: 'stage3_s.js', name: 'STAGE_3_S' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 168);
    const RAIL = '高架の線路（上からだけ乗れる）', CON = 'コンクリート', USED = '叩いた後のブロック';
    await k.ground();
    await k.message(6, 20, 'くものうえのレール/足もとは ずっと穴。/ゴールすると お城への近道が開く。');
    await k.light(10, 20);
    await k.pit(16, 152);
    await k.ledges(RAIL, [[16, 22, 22], [26, 29, 21], [33, 35, 20], [39, 42, 21], [46, 48, 22]]);
    await k.foes(DRONE, [[31, 16], [44, 15]]);
    await k.foes(SPARK, [[24, G], [37, G]]);
    await place(USED, [[52, 21], [55, 19], [58, 17], [62, 19], [66, 21]]);
    await k.foes(DRONE, [[60, 12]]);
    await k.ledges(RAIL, [[70, 76, 21]]);
    await k.cannon(CON, 76, 0, 2);
    await fill(CON, 76, 21, 76, 21);
    await k.ledges(RAIL, [[80, 83, 20], [87, 89, 18], [93, 96, 20], [100, 102, 22]]);
    await fill(CON, 86, 12, 90, 13);
    await fill(SPIKE_D, 86, 14, 90, 14);
    await k.foes(ROBO, [[95, 19]]);
    await place(USED, [[106, 20], [109, 18], [110, 18], [114, 20], [118, 22]]);
    await k.foes(DRONE, [[112, 13]]);
    await k.ledges(RAIL, [[122, 126, 21], [130, 133, 19], [137, 140, 21], [144, 151, 22]]);
    await k.foes(SPARK, [[128, G], [135, G], [142, G]]);
    await k.foes(CAPS, [[148, 21]]);
    await k.stairs(CON, 154, 3);
    await k.start();
    await k.goal(162);
  });
})();
