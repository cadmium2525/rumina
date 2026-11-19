// ワールド 4（4-1〜4-5、ボス部屋、隠しコース 4-?）をステージエディタを操作して作る: node tools/build_world_4.cjs
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const ROCK = '岩', SHELF = '岩の棚（上からだけ乗れる）';
const SECRET = 'ひみつのゴール（地図の隠し道が開く）';

// 洞窟の天井（9〜10 段）とつらら石
async function caveCeiling(ed, width, from = 0) {
  await ed.fill(ROCK, from, 9, width - 1, 10);
  const xs = [];
  for (let x = from + 4; x < width - 2; x += 13 + (x % 3)) xs.push([x, 11]);
  await ed.place('つらら石（飾り）', xs);
}

// 低い天井：x0〜x1 の 11〜bottom 段を岩で埋め、bottom+1 段の両はしを天井の坂にする（45° か ゆるい坂）
async function lowCeiling(ed, x0, x1, bottom, gentle = false) {
  await ed.fill(ROCK, x0, 11, x1, bottom);
  if (gentle) {
    await ed.place('ゆるい天井（右へ下がる・1）', [[x0, bottom + 1]]);
    await ed.place('ゆるい天井（右へ下がる・2）', [[x0 + 1, bottom + 1]]);
    await ed.fill(ROCK, x0 + 2, bottom + 1, x1 - 2, bottom + 1);
    await ed.place('ゆるい天井（右へ上がる・1）', [[x1 - 1, bottom + 1]]);
    await ed.place('ゆるい天井（右へ上がる・2）', [[x1, bottom + 1]]);
  } else {
    await ed.place('45°の天井（右へ下がる）', [[x0, bottom + 1]]);
    await ed.fill(ROCK, x0 + 1, bottom + 1, x1 - 1, bottom + 1);
    await ed.place('45°の天井（右へ上がる）', [[x1, bottom + 1]]);
  }
}

// 地底湖：岸の岩の壁（21〜23 段）にはさまれた、21〜25 段の深い水
async function lake(ed, x0, x1) {
  await ed.fill(ROCK, x0, 21, x0, G - 1);
  await ed.fill(ROCK, x1, 21, x1, G - 1);
  await ed.fill('水', x0 + 1, 21, x1 - 1, 25);
}

// 天井から水面の上まで下がる岩（下にトゲ）
async function hangingRock(ed, x, bottom = 19) {
  await ed.fill(ROCK, x, 11, x + 1, bottom);
  await ed.fill(SPIKE_D, x, bottom + 1, x + 1, bottom + 1);
}

(async () => {
  // ================= 4-1 いわのいりぐち =================
  await build({ theme: 'cave', title: '4-1 いわのいりぐち', width: 216, file: 'stage4_1.js', name: 'STAGE_4_1' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 216);
    await k.ground();
    await caveCeiling(ed, 216);
    await place('結晶（飾り）', [7, 15, 47, 63, 99, 133, 175, 199].map((x) => [x, G - 1]));
    await k.message(6, 20, '4-1 いわのいりぐち/ワールド4 どうくつの国へ ようこそ。/ななめの天井に 頭をぶつけないようにね。');
    await k.light(10, 20);
    await lowCeiling(ed, 18, 34, 17);
    await k.foes(SPIKER, [24, 29]);
    await k.hill(40, 3, 3);
    await k.lava(52, 60);
    await k.ledges(SHELF, [[54, 55, 21], [58, 59, 22]]);
    await k.foes(SPARK, [[56, G]]);
    await lowCeiling(ed, 66, 80, 18, true);
    await k.foes(CAPS, [72]);
    await k.cannon(ROCK, 86, 1, 2);
    await k.foes('甲羅', [90]);
    await k.foes(SPIKER, [93, 97]);
    await k.pit(102, 110);
    await k.ledges(SHELF, [[104, 105, 21], [108, 109, 22]]);
    await k.foes(DRONE, [[106, 16]]);
    await fill(ROCK, 118, 11, 130, 18);
    await place(SPIKE_D, [[122, 19], [123, 19], [127, 19]]);
    await k.foes(ROBO, [125]);
    await k.hill(136, 4, 2);
    await k.foes(SPIKER, [150, 153]);
    await k.lava(158, 170);
    await k.ledges(SHELF, [[160, 161, 22], [164, 165, 20], [168, 169, 22]]);
    await k.foes(SPARK, [[163, G], [167, G]]);
    await k.light(176, 20);
    await lowCeiling(ed, 180, 192, 19);
    await k.foes(SPIKER, [186]);
    await k.stairs(ROCK, 196, 3);
    await k.start();
    await k.goal(208);
  });

  // ================= 4-2 ちていこ =================
  await build({ theme: 'cave', title: '4-2 ちていこ', width: 216, file: 'stage4_2.js', name: 'STAGE_4_2' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 216);
    await k.ground();
    await caveCeiling(ed, 216);
    await place('結晶（飾り）', [9, 64, 77, 134, 146, 186, 199].map((x) => [x, G - 1]));
    await k.message(6, 20, '4-2 ちていこ/大きな地底の湖。/天井から下がる岩のトゲに 気をつけて泳ごう。');
    await k.light(10, 20);
    // 1 つ目の湖：下がる岩の下をもぐって通る
    await lake(ed, 14, 60);
    for (const x of [22, 34, 46]) await hangingRock(ed, x);
    await place(SPIKE, [[28, 25], [40, 25], [52, 25]]);
    await k.foes(DRONE, [[29, 17], [41, 17]]);
    await k.foes(SPIKER, [66, 70]);
    await k.foes(CAPS, [74]);
    // 2 つ目の湖：もっと長い
    await lake(ed, 82, 130);
    for (const x of [90, 100, 110, 120]) await hangingRock(ed, x);
    await place(SPIKE, [[95, 25], [105, 25], [115, 25], [125, 25]]);
    await k.ledges(SHELF, [[96, 97, 18], [116, 117, 18]]);
    await k.foes('ギフトボックス', [[96, 17]]);
    await k.light(136, 20);
    await k.foes(ROBO, [142]);
    await k.cannon(ROCK, 148, 1, 2);
    // 3 つ目の湖
    await lake(ed, 156, 180);
    await hangingRock(ed, 165);
    await hangingRock(ed, 173);
    await k.foes(DRONE, [[169, 17]]);
    await k.foes(SPIKER, [186]);
    await k.stairs(ROCK, 192, 3);
    await k.start();
    await k.goal(206);
  });

  // ================= 4-3 すいしょうのどうくつ（ひみつのゴール） =================
  await build({ theme: 'cave', title: '4-3 すいしょうのどうくつ', width: 224, file: 'stage4_3.js', name: 'STAGE_4_3' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 224);
    await k.ground();
    await caveCeiling(ed, 224);
    await place('結晶（飾り）', [5, 12, 20, 33, 52, 68, 79, 86, 121, 134, 156, 177, 200, 212].map((x) => [x, G - 1]));
    await k.message(6, 20, '4-3 すいしょうのどうくつ/金のブロックは 下から叩くと/しばらく すり抜けられるよ。');
    await k.light(10, 20);
    await fill(ROCK, 24, 15, 28, G - 1); // 岩の壁
    await fill('ハシゴ', 23, 14, 23, G - 1);
    await k.foes(SPIKER, [[26, 14]]);
    await k.ledges(SHELF, [[29, 30, 18]]);
    await k.lava(36, 48);
    await k.ledges(SHELF, [[38, 39, 22], [42, 43, 20], [46, 47, 22]]);
    await k.foes(SPARK, [[41, G], [45, G]]);
    // 金のブロックの橋（スピンジャンプで壊すと落ちる）
    await k.pit(56, 66);
    await fill(TURN, 56, G - 1, 66, G - 1);
    await k.foes('甲羅', [70]);
    await k.foes(SPIKER, [73, 76]);
    // ---- 低いトンネル。天井の金のブロックを叩いて回し、すり抜けて上の部屋へ（寄り道） ----
    await fill(ROCK, 92, 11, 116, 20);
    await fill('消しゴム', 104, 9, 105, 19);
    await fill('ハシゴ', 104, 3, 104, 19);
    await fill(TURN, 104, 20, 105, 20);
    await k.foes(CAPS, [110]);
    // 上の部屋（天井の上）：奥に、ひみつのゴール
    await fill(ROCK, 92, 0, 140, 1);
    await fill(ROCK, 92, 2, 92, 8);
    await fill(ROCK, 140, 2, 140, 8);
    await fill('マグマ（落ちるとミス）', 120, 9, 123, 9);
    await k.ledges(SHELF, [[121, 122, 6]]);
    await k.foes(SPIKER, [[114, 8]]);
    await k.foes(SPARK, [[122, 9]]);
    await place('結晶（飾り）', [[97, 8], [108, 8], [128, 8], [137, 8]]);
    await k.light(110, 5);
    await place(SECRET, [[134, 8]]);
    // ふつうの道のつづき
    await k.hill(124, 3, 2);
    await k.foes(ROBO, [140]);
    await k.cannon(ROCK, 150, 1, 2);
    await k.pit(158, 172);
    await k.ledges(SHELF, [[160, 161, 22], [164, 165, 20], [168, 169, 22]]);
    await k.foes(DRONE, [[165, 15]]);
    await lowCeiling(ed, 180, 196, 18, true);
    await k.foes(SPIKER, [186, 190]);
    await k.light(200, 20);
    await k.stairs(ROCK, 204, 3);
    await k.start();
    await k.goal(216);
  });

  // ================= 4-4 ちかの遺跡 =================
  await build({ theme: 'ruins', title: '4-4 ちかの遺跡', width: 216, file: 'stage4_4.js', name: 'STAGE_4_4' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 216);
    const SLAB = '石の板（上からだけ乗れる）', BRICK = '遺跡のレンガ';
    await k.ground();
    await fill(BRICK, 0, 6, 215, 7); // 地下の天井
    for (const x of [12, 40, 76, 102, 134, 160, 182, 200]) await fill('柱（飾り）', x, 8, x, G - 1);
    await k.message(6, 20, '4-4 ちかの遺跡/地下にねむる 古い遺跡。/砲弾とスパークに 気をつけて。');
    await k.light(9, 20);
    await k.cannon('模様の石', 16, 0, 3);
    await k.pit(22, 36);
    await k.ledges(SLAB, [[23, 24, 21], [27, 28, 19], [31, 32, 21], [34, 35, 20]]);
    await k.foes(SPARK, [[26, G], [30, G]]);
    await k.foes(ROBO, [42]);
    await place(SPIKE, [[46, G - 1], [47, G - 1]]);
    // 二階建ての神殿
    await fill(BRICK, 52, 16, 72, 16);
    await place(SPIKE_D, [[58, 17], [59, 17], [65, 17], [66, 17]]);
    await k.foes(ROBO, [62]);
    await fill('ハシゴ', 73, 15, 73, G - 1);
    await k.foes(SPIKER, [[56, 15], [68, 15]]);
    await k.light(62, 12);
    await k.pit(78, 100);
    await k.ledges(SLAB, [[80, 81, 22], [84, 85, 20], [88, 89, 18], [92, 93, 20], [96, 97, 22]]);
    await k.foes(DRONE, [[86, 13], [94, 13]]);
    await k.foes(SPARK, [[83, G], [91, G], [99, G]]);
    await k.foes('甲羅', [104]);
    await k.foes(SPIKER, [108, 111]);
    await fill(TURN, 115, 21, 115, G - 1);
    await k.cannon('模様の石', 122, 1, 2);
    await k.cannon('模様の石', 130, 2, 2);
    // トゲの廊下
    await fill(BRICK, 136, 8, 156, 18);
    await place(SPIKE_D, [[140, 19], [141, 19], [146, 19], [147, 19], [152, 19]]);
    await place(SPIKE, [[143, G - 1], [149, G - 1]]);
    await k.foes(CAPS, [154]);
    await k.pit(162, 178);
    await k.ledges(SLAB, [[164, 165, 21], [168, 171, 20], [175, 176, 21]]);
    await k.foes(ROBO, [[170, 19]]);
    await k.light(184, 20);
    await k.stairs(BRICK, 188, 3);
    await k.start();
    await k.goal(204);
  });

  // ================= 4-5 いわの城 =================
  await build({ theme: 'castle', title: '4-5 いわの城', width: 216, file: 'stage4_5.js', name: 'STAGE_4_5' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 216);
    const BRIDGE = '木の橋（上からだけ乗れる）', BRICK = 'お城のレンガ', IRON = '鉄のブロック';
    await k.ground();
    await fill(BRICK, 0, 8, 215, 9);
    await place('たいまつ（飾り）', [8, 38, 52, 82, 96, 138, 148, 164, 178, 192].map((x) => [x, 19]));
    await place('窓（飾り）', [14, 48, 90, 142, 174].map((x) => [x, 15]));
    await k.message(6, 20, '4-5 いわの城/奥の扉の先に いわの王。/着地すると 天井から岩が落ちてくる！');
    await k.light(10, 20);
    await k.lava(15, 35);
    await k.ledges(BRIDGE, [[17, 18, 22], [21, 22, 20], [25, 26, 22], [29, 30, 20], [33, 34, 22]]);
    await k.foes(SPARK, [[20, G - 1], [28, G - 1]]);
    await fill(IRON, 42, 15, 45, G - 1);
    await fill('ハシゴ', 41, 14, 41, G - 1);
    await k.foes(ROBO, [[43, 14]]);
    await k.ledges(BRIDGE, [[46, 47, 18], [49, 50, 21]]);
    await fill(BRICK, 56, 10, 78, 19);
    await place(SPIKE_D, [[59, 20], [60, 20], [65, 20], [66, 20], [71, 20], [72, 20]]);
    await place(SPIKE, [[62, G - 1], [68, G - 1]]);
    await k.foes(ROBO, [76]);
    await k.cannon(IRON, 84, 1, 3);
    await k.foes(SPIKER, [88]);
    await k.light(88, 19);
    await k.cannon(IRON, 92, 2, 2);
    await k.lava(98, 136);
    await k.ledges(BRIDGE, [[100, 101, 22], [104, 105, 20], [108, 109, 22], [112, 113, 19], [116, 117, 21],
      [120, 121, 22], [124, 125, 20], [128, 129, 22], [132, 133, 21]]);
    await k.foes(DRONE, [[106, 15], [118, 14], [127, 15]]);
    await k.foes(SPARK, [[103, G - 1], [111, G - 1], [119, G - 1], [127, G - 1], [135, G - 1]]);
    await k.foes('ギフトボックス', [140]);
    await fill(TURN, 144, 21, 145, G - 1);
    await k.foes(ROBO, [150, 156, 162]);
    await place(SPIKE, [[153, G - 1], [159, G - 1]]);
    await fill(IRON, 168, 16, 171, G - 1);
    await fill('ハシゴ', 167, 15, 167, G - 1);
    await k.ledges(BRIDGE, [[172, 173, 19]]);
    await k.light(180, 20);
    await k.stairs(BRICK, 184, 3);
    await fill(BRICK, 206, 10, 215, G - 1);
    await place('ボス扉（上）', [[202, G - 2], [203, G - 2]]);
    ed.nextPrompt = '4-5B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[202, G - 1], [203, G - 1]]);
    await place('たいまつ（飾り）', [[200, G - 2], [205, G - 2]]);
    await k.start();
  });

  // ================= ボス部屋：いわの王 =================
  await build({ theme: 'castle', title: 'いわの王', width: 16, file: 'stage4_5b.js', name: 'STAGE_4_5B' }, async (ed) => {
    const { place, fill } = ed;
    await fill('地面', 0, G, 15, 26);
    await fill('お城のレンガ', 0, 11, 0, G - 1);
    await fill('お城のレンガ', 15, 11, 15, G - 1);
    await fill('お城のレンガ', 0, 10, 15, 11);
    await place('たいまつ（飾り）', [[3, 16], [12, 16]]);
    await place('窓（飾り）', [[7, 13], [8, 13]]);
    await fill('木の橋（上からだけ乗れる）', 2, 20, 4, 20);
    await fill('木の橋（上からだけ乗れる）', 11, 20, 13, 20);
    await fill('木の橋（上からだけ乗れる）', 6, 17, 9, 17);
    await place('ボス：いわの王（6 回踏むと倒れてクリア。落石を降らせる）', [[11, G - 1]]);
    await place('スタート位置', [[2, G - 1]]);
  });

  // ================= 隠しコース 4-? すいしょうの川 =================
  await build({ theme: 'cave', title: '4-? すいしょうの川', width: 160, file: 'stage4_s.js', name: 'STAGE_4_S' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 160);
    await k.ground();
    await caveCeiling(ed, 160);
    await place('結晶（飾り）', [7, 44, 62, 100, 122, 143, 150].map((x) => [x, G - 1]));
    await k.message(6, 20, 'ひみつの すいしょうの川/マグマと水が ながれる川。/ゴールすると お城への近道が開く。');
    await k.light(10, 20);
    await k.light(13, 20);
    await lake(ed, 16, 40);
    await hangingRock(ed, 24);
    await hangingRock(ed, 32);
    await k.lava(46, 58);
    await k.ledges(SHELF, [[48, 49, 22], [52, 53, 20], [56, 57, 22]]);
    await k.foes(SPARK, [[51, G], [55, G]]);
    await k.hill(64, 3, 2);
    await k.foes(SPIKER, [72]);
    await k.lava(76, 96);
    await k.ledges(SHELF, [[78, 79, 22], [82, 83, 20], [86, 87, 18], [90, 91, 20], [94, 95, 22]]);
    await k.foes(DRONE, [[84, 14], [92, 14]]);
    await k.light(86, 15);
    await lowCeiling(ed, 104, 118, 18);
    await k.foes(SPIKER, [109, 113]);
    await lake(ed, 124, 140);
    await hangingRock(ed, 131);
    await k.stairs(ROCK, 146, 3);
    await k.start();
    await k.goal(154);
  });
})();
