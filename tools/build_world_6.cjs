// ワールド 6（6-1〜6-5、ボス部屋、隠しコース 6-?）を
// ステージエディタを操作して作る: node tools/build_world_6.cjs
// 夜のネオン街。新しい仕掛けの音符ブロック（乗ると跳ねる。B を押したままだと高く跳ぶ）を使う。
const { build, G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN } = require('./editor_driver.cjs');

const NOTE = '音符ブロック（乗ると跳ねる。B を押していると高く跳ぶ）';
const NLEDGE = 'ネオンの足場（上からだけ乗れる）';
const CONC = 'コンクリート';
const RAIL = '高架の線路（上からだけ乗れる）';
const NEON = 'ネオン看板（飾り）';
const SECRET = 'ひみつのゴール（地図の隠し道が開く）';

const neonKit = (ed, width) => {
  const k = kit(ed, width);
  return {
    ...k,
    notes: (cells) => ed.place(NOTE, cells),
    neonLedges: (list) => k.ledges(NLEDGE, list),
    // ビル：x0〜x1 の top 段から地面の上まで。tunnel なら下の 3 段を通り抜けられる
    building: async (x0, x1, top, tunnel = false) => {
      await ed.fill(CONC, x0, top, x1, tunnel ? G - 4 : G - 1);
    },
    signs: (cells) => ed.place(NEON, cells),
  };
};

(async () => {
  // ================= 6-1 ネオンどおり =================
  await build({ theme: 'neon', title: '6-1 ネオンどおり', width: 208, file: 'stage6_1.js', name: 'STAGE_6_1' }, async (ed) => {
    const k = neonKit(ed, 208);
    await k.ground();
    await k.message(6, 20, '6-1 ネオンどおり/音符ブロックに乗ると 跳ねるよ。/B を押したままだと 高く跳ぶ！');
    await k.light(10, 20);
    // はじめの音符ブロックと、その上の足場
    await k.notes([[18, 23]]);
    await k.neonLedges([[20, 23, 19]]);
    await k.foes(CAPS, [[22, 18]]);
    await k.foes(CAPS, [30]);
    await k.foes(DRONE, [[36, 18]]);
    // 穴の上の音符ブロック
    await k.pit(42, 48);
    await k.notes([[45, 22]]);
    await k.foes(ROBO, [56]);
    await k.cannon(CONC, 64, 1, 2);
    // 高い壁：音符ブロックで高く跳ぶ（走って跳んでもよい）
    await k.notes([[70, 23]]);
    await k.building(73, 76, 19);
    await k.signs([[74, 17], [75, 17]]);
    await k.pit(80, 92);
    await k.neonLedges([[82, 84, 21], [87, 89, 20]]);
    await k.foes(DRONE, [[86, 16]]);
    await k.foes(SPIKER, [98, 104]);
    // 音符ブロックの橋
    await k.pit(112, 126);
    await k.notes([[114, 22], [118, 22], [122, 22]]);
    await k.foes(SPARK, [132]);
    await k.foes(CAPS, [140, 146]);
    await k.cannon(CONC, 152, 1, 2);
    // 音符ブロックで上の足場へ。足場の上に光の玉
    await k.notes([[160, 23]]);
    await k.neonLedges([[162, 165, 18]]);
    await k.light(163, 14);
    await k.foes(ROBO, [172]);
    await k.stairs(CONC, 180, 4);
    await k.signs([[185, 18], [186, 18]]);
    await k.start();
    await k.goal(196);
  });

  // ================= 6-2 おんぷのビル（ひみつのゴール） =================
  // ふつうの道はビルの下の通り。音符ブロックで B を押したまま跳ねると、足場 → もう 1 つの音符ブロック → 屋上へ。
  // 屋上を渡った先にひみつのゴール
  await build({ theme: 'neon', title: '6-2 おんぷのビル', width: 224, file: 'stage6_2.js', name: 'STAGE_6_2' }, async (ed) => {
    const k = neonKit(ed, 224);
    await k.ground();
    await k.message(6, 20, '6-2 おんぷのビル/ビルの下の 通りを進もう。/屋上には 何があるのかな…');
    await k.light(10, 20);
    await k.pit(18, 28);
    await k.notes([[20, 22], [24, 22]]);
    await k.foes(DRONE, [[32, 17]]);
    await k.foes(CAPS, [38]);
    await k.cannon(CONC, 44, 0, 2);
    // 屋上への入口：地面の音符ブロック（B で高く跳ねる）→ 足場 → 足場の上の音符ブロック → 屋上
    await k.notes([[51, 23]]);
    await k.neonLedges([[54, 58, 18]]);
    await k.notes([[59, 17]]); // ビルの壁にくっついているので、跳び越えずに乗れる
    // ビル A（下は通り抜けられる）
    await k.building(60, 98, 12, true);
    await k.signs([[64, 11], [65, 11], [80, 11], [81, 11], [94, 11], [95, 11]]); // 屋上の看板
    await k.foes(CAPS, [70, 84]);
    await k.foes(ROBO, [92]);
    await k.foes(SPIKER, [[72, 11], [88, 11]]);
    // ビルの間：穴と音符ブロック
    await k.pit(101, 105);
    await k.notes([[103, 22]]);
    await k.neonLedges([[102, 104, 12]]); // 屋上どうしの間の足場（通りの音符ブロックからは届かない高さ）
    await k.foes(DRONE, [[103, 8]]);
    // ビル B
    await k.building(108, 132, 12, true);
    await k.signs([[112, 11], [113, 11], [126, 11], [127, 11]]);
    await k.foes(CAPS, [118]);
    await k.foes(ROBO, [128]);
    await k.foes(SPIKER, [[120, 11]]);
    // 屋上の先：ビル C（低いビルの屋上にひみつのゴール）
    await k.neonLedges([[134, 137, 12]]);
    await k.building(140, 158, 14, true);
    await k.signs([[144, 13], [145, 13]]);
    await ed.place(SECRET, [[152, 13]]);
    await k.foes(DRONE, [[146, 9]]);
    await k.foes(SPARK, [136]);
    await k.foes(CAPS, [150]);
    await k.foes(CAPS, [164, 170]);
    await k.pit(176, 184);
    await k.notes([[178, 22], [182, 22]]);
    await k.cannon(CONC, 190, 1, 2);
    await k.foes(ROBO, [198]);
    await k.light(204, 20);
    await k.start();
    await k.goal(214);
  });

  // ================= 6-3 ネオンのこうか =================
  // 高架の線路で大きな穴を渡る。線路の柱の上に砲台、電気スパーク
  await build({ theme: 'neon', title: '6-3 ネオンのこうか', width: 216, file: 'stage6_3.js', name: 'STAGE_6_3' }, async (ed) => {
    const k = neonKit(ed, 216);
    await k.ground();
    await k.message(6, 20, '6-3 ネオンのこうか/高架の線路を 渡っていこう。/下は 深い穴だよ。');
    await k.light(10, 20);
    await k.foes(CAPS, [20]);
    await k.pit(26, 70);
    await k.ledges(RAIL, [[24, 34, 20], [38, 46, 18], [50, 58, 20], [62, 72, 19]]);
    await ed.fill(CONC, 36, 21, 36, 26);
    await ed.fill(CONC, 48, 21, 48, 26);
    await ed.fill(CONC, 60, 21, 60, 26);
    await k.foes(DRONE, [[36, 14], [56, 15]]);
    await k.foes(SPARK, [[42, 17], [54, 19]]);
    await k.foes(CAPS, [[66, 18]]);
    await k.foes(ROBO, [80]);
    await k.notes([[86, 23], [87, 23]]);
    await k.building(90, 93, 18);
    await k.cannon(CONC, 92, 6, 1);
    await k.pit(96, 140);
    await k.notes([[98, 22]]);
    await k.ledges(RAIL, [[102, 110, 19], [116, 124, 17], [130, 138, 19]]);
    await ed.fill(CONC, 106, 20, 106, 26);
    await ed.fill(CONC, 120, 18, 120, 26);
    await ed.fill(CONC, 134, 20, 134, 26);
    await k.notes([[113, 20], [127, 20]]);
    await k.foes(DRONE, [[112, 13], [128, 13]]);
    await k.foes(SPARK, [[120, 16]]);
    await k.foes(SPIKER, [[108, 18], [136, 18]]);
    await k.foes(CAPS, [146, 152]);
    await k.cannon(CONC, 158, 1, 2);
    await k.light(164, 20);
    await k.pit(168, 186);
    await k.ledges(RAIL, [[170, 176, 20], [180, 186, 18]]);
    await ed.fill(CONC, 173, 21, 173, 26);
    await k.foes(SPARK, [[178, 22]]);
    await k.foes(ROBO, [192]);
    await k.stairs(CONC, 194, 3);
    await k.start();
    await k.goal(206);
  });

  // ================= 6-4 ちかてつ =================
  // 天井のある地下鉄の駅。低い天井の下の音符ブロック（高く跳ぶと頭をぶつける）、
  // ホームの穴（線路）を音符ブロックで渡る
  await build({ theme: 'neon', title: '6-4 ちかてつ', width: 216, file: 'stage6_4.js', name: 'STAGE_6_4' }, async (ed) => {
    const k = neonKit(ed, 216);
    await k.ground();
    await ed.fill(CONC, 0, 0, 215, 14);
    await k.signs([[12, 16], [13, 16], [28, 16], [29, 16], [96, 16], [97, 16], [150, 16], [151, 16], [190, 16], [191, 16]]);
    await k.message(6, 20, '6-4 ちかてつ/天井が 低いところでは/高く跳ぶと 頭をぶつけるよ。');
    await k.light(10, 20);
    await k.foes(CAPS, [22, 28]);
    // 低い天井と音符ブロック
    await ed.fill(CONC, 34, 15, 50, 19);
    await k.notes([[38, 23], [44, 23]]);
    await k.foes(SPARK, [41, 47]);
    await k.foes(ROBO, [58]);
    // ホームの穴（線路）
    await k.pit(64, 80);
    await k.notes([[67, 22], [71, 22], [75, 22]]);
    await k.foes(DRONE, [[72, 18]]);
    await k.cannon(CONC, 86, 1, 2);
    await k.foes(SPIKER, [92, 100]);
    await ed.fill(CONC, 104, 15, 118, 20);
    await k.foes(CAPS, [108, 114]);
    await k.light(100, 20);
    await k.pit(122, 142);
    await k.ledges(NLEDGE, [[124, 126, 21], [136, 138, 21]]);
    await k.notes([[131, 22]]);
    await k.foes(SPARK, [[125, 20], [137, 20]]);
    await k.foes(ROBO, [150]);
    await ed.fill(CONC, 156, 15, 170, 19);
    await k.notes([[160, 23], [166, 23]]);
    await k.foes(DRONE, [[163, 21]]);
    await k.cannon(CONC, 176, 0, 2);
    await k.foes(CAPS, [182]);
    await k.pit(186, 194);
    await k.notes([[188, 22], [192, 22]]);
    await k.start();
    await k.goal(204);
  });

  // ================= 6-5 ネオンの城 =================
  await build({ theme: 'castle', title: '6-5 ネオンの城', width: 216, file: 'stage6_5.js', name: 'STAGE_6_5' }, async (ed) => {
    const { place, fill } = ed;
    const k = neonKit(ed, 216);
    const BRIDGE = '木の橋（上からだけ乗れる）', BRICK = 'お城のレンガ', IRON = '鉄のブロック';
    await k.ground();
    await fill(BRICK, 0, 8, 215, 9);
    await place('たいまつ（飾り）', [8, 40, 70, 100, 130, 160, 190].map((x) => [x, 19]));
    await place('窓（飾り）', [16, 56, 116, 146, 176].map((x) => [x, 15]));
    await k.message(6, 20, '6-5 ネオンの城/マグマの上の 音符ブロックに 気をつけて。/ネオンの王は 床を走る電撃を 出すよ。');
    await k.light(10, 20);
    await k.lava(16, 34);
    await k.notes([[19, 22], [24, 21], [29, 22]]);
    await k.foes(DRONE, [[26, 16]]);
    await k.foes(ROBO, [40]);
    await k.cannon(IRON, 46, 1, 2);
    await fill(BRICK, 52, 10, 70, 19);
    await place(SPIKE_D, [[55, 20], [56, 20], [61, 20], [62, 20], [67, 20]]);
    await place(SPIKE, [[58, G - 1], [64, G - 1]]);
    await k.foes(SPARK, [60, 66]);
    await k.lava(76, 110);
    await k.ledges(BRIDGE, [[78, 80, 21], [92, 94, 20], [106, 108, 21]]);
    await k.notes([[85, 22], [99, 22]]);
    await k.foes(DRONE, [[86, 16], [100, 15]]);
    await k.foes(SPIKER, [[93, 19]]);
    await k.foes('ギフトボックス', [116]);
    await k.foes(ROBO, [122, 130]);
    await k.cannon(IRON, 136, 2, 2);
    await k.lava(142, 168);
    await k.notes([[145, 22], [150, 20], [155, 18]]);
    await k.ledges(BRIDGE, [[159, 162, 18]]);
    await k.notes([[166, 22]]);
    await k.foes(SPARK, [[160, 17]]);
    await k.light(176, 20);
    await k.foes(ROBO, [184]);
    await k.stairs(BRICK, 188, 3);
    await fill(BRICK, 206, 10, 215, G - 1);
    await place('ボス扉（上）', [[202, G - 2], [203, G - 2]]);
    ed.nextPrompt = '6-5B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[202, G - 1], [203, G - 1]]);
    await place('たいまつ（飾り）', [[200, G - 2], [205, G - 2]]);
    await k.start();
  });

  // ================= ボス部屋：ネオンの王 =================
  await build({ theme: 'castle', title: 'ネオンの王', width: 16, file: 'stage6_5b.js', name: 'STAGE_6_5B' }, async (ed) => {
    const { place, fill } = ed;
    await fill('地面', 0, G, 15, 26);
    await fill('お城のレンガ', 0, 11, 0, G - 1);
    await fill('お城のレンガ', 15, 11, 15, G - 1);
    await fill('お城のレンガ', 0, 10, 15, 11);
    await place('たいまつ（飾り）', [[3, 16], [12, 16]]);
    await place(NEON, [[7, 14], [8, 14]]);
    await fill('木の橋（上からだけ乗れる）', 2, 20, 4, 20);
    await fill('木の橋（上からだけ乗れる）', 11, 20, 13, 20);
    await place('ボス：ネオンの王（7 回踏むと倒れてクリア。床を走る電撃）', [[11, G - 1]]);
    await place('スタート位置', [[2, G - 1]]);
  });

  // ================= 隠しコース 6-? おんぷのそら =================
  // 足もとがずっと穴。音符ブロックだけを跳ね渡っていく
  await build({ theme: 'neon', title: '6-? おんぷのそら', width: 176, file: 'stage6_s.js', name: 'STAGE_6_S' }, async (ed) => {
    const k = neonKit(ed, 176);
    await k.ground();
    await k.pit(14, 160);
    await k.message(6, 20, 'ひみつの おんぷのそら/音符ブロックを 跳ね渡ろう。/ゴールすると お城への近道が開く。');
    await k.light(9, 20);
    await k.light(11, 20);
    await k.notes([[17, 22], [22, 21], [27, 22], [32, 20], [37, 22]]);
    await k.neonLedges([[41, 45, 20]]);
    await k.foes(CAPS, [[44, 19]]);
    await k.notes([[49, 22], [54, 20], [59, 18], [64, 20], [69, 22]]);
    await k.foes(DRONE, [[57, 13], [67, 15]]);
    await k.neonLedges([[73, 78, 21]]);
    await k.foes(SPIKER, [[76, 20]]);
    await k.notes([[82, 22], [87, 22], [92, 22], [97, 22]]);
    await k.foes(DRONE, [[90, 16]]);
    await k.neonLedges([[101, 105, 19]]);
    await k.light(103, 15);
    await k.notes([[109, 21], [114, 19], [119, 21], [124, 23], [129, 21]]);
    await k.foes(SPARK, [[121, 18]]);
    await k.neonLedges([[133, 138, 20]]);
    await k.foes(ROBO, [[136, 19]]);
    await k.notes([[142, 22], [147, 21], [152, 22], [157, 21]]);
    await k.start();
    await k.goal(168);
  });
})();
