// ワールド 2（2-1〜2-5 とボス部屋）をステージエディタを操作して作る: node tools/build_world_2.cjs
const { build } = require('./editor_driver.cjs');
const G = 24; // 地面の一番上の段

// よく使う形。ed はエディタの操作（place / fill）
const kit = (ed, width) => {
  const { place, fill } = ed;
  const k = {
    ground: () => fill('地面', 0, G, width - 1, 26),
    pit: (x0, x1) => fill('消しゴム', x0, G, x1, 26),
    lava: (x0, x1) => fill('マグマ（落ちるとミス）', x0, G, x1, 26),
    pool: (x0, x1) => fill('水', x0, G, x1, 25),
    // 足場をまとめて置く：[x0, x1, y] の並び
    ledges: async (name, list) => { for (const [x0, x1, y] of list) await fill(name, x0, y, x1, y); },
    // 45°の丘：h 段登って、平らな頂上 top マス、下る
    hill: async (x0, h, top) => {
      for (let i = 0; i < h; i++) {
        const xr = x0 + 2 * h + top - 1 - i;
        await place('45°の上り坂', [[x0 + i, G - 1 - i]]);
        await place('45°の下り坂', [[xr, G - 1 - i]]);
        if (i) {
          await fill('地面（上からだけ乗れる）', x0 + i, G - i, x0 + i, G - 1);
          await fill('地面（上からだけ乗れる）', xr, G - i, xr, G - 1);
        }
      }
      await fill('地面（上からだけ乗れる）', x0 + h, G - h, x0 + h + top - 1, G - 1);
    },
    // 右へ登る階段（h 段）
    stairs: async (name, x0, h) => { for (let i = 0; i < h; i++) await fill(name, x0 + i, G - 1 - i, x0 + h - 1, G - 1 - i); },
    // 砲台：土台 base 段の上に砲台 n 個
    cannon: async (baseName, x, base, n) => {
      if (base) await fill(baseName, x, G - base, x, G - 1);
      await fill('砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）', x, G - base - n, x, G - base - 1);
    },
    message: async (x, y, text) => { ed.nextPrompt = text; await place('メッセージブロック（置くと文を入力）', [[x, y]]); },
    light: (x, y) => place('？ブロック（光の玉）', [[x, y]]),
    foes: (name, xs, y = G - 1) => place(name, xs.map((x) => (Array.isArray(x) ? x : [x, y]))),
    start: (x = 3) => place('スタート位置', [[x, G - 1]]),
    goal: (x) => place('ゴール（もう一度置くと移動）', [[x, G - 1]]),
  };
  return k;
};
const SPIKER = 'トゲムシ', CAPS = 'ガチャカプセル（転がる・踏める）', ROBO = '警備ロボ（跳ねる・3 回踏むと倒れる）';
const DRONE = 'ドローン（左右にふわふわ・踏める）', SPARK = '電気スパーク（跳ね上がる・踏めない）';
const SPIKE = 'トゲ（触れるとダメージ）', SPIKE_D = '下向きのトゲ（触れるとダメージ）', TURN = '金のブロック（クルクル）';

(async () => {
  // ================= 2-1 すなあらしの遺跡 =================
  await build({ theme: 'ruins', title: '2-1 すなあらしの遺跡', width: 200, file: 'stage2_1.js', name: 'STAGE_2_1' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 200);
    const SLAB = '石の板（上からだけ乗れる）', BRICK = '遺跡のレンガ';
    await k.ground();
    for (const x of [8, 34, 57, 99, 118, 150, 184, 196]) await fill('柱（飾り）', x, 19, x, G - 1);
    await k.message(6, 20, '2-1 すなあらしの遺跡/ワールド 2 のはじまり。/穴と、砲台の砲弾に気をつけて！');
    await k.light(11, 20);
    await k.stairs(BRICK, 18, 4);
    await k.pit(22, 26);
    await k.ledges(SLAB, [[23, 24, 21]]);
    await k.foes('甲羅', [30]);
    await k.foes(SPIKER, [33, 37]);
    await k.foes(CAPS, [41]);
    await k.hill(44, 3, 2);
    await k.foes(SPIKER, [55]);
    await k.cannon('模様の石', 61, 1, 2);
    await k.pit(66, 78);
    await k.ledges(SLAB, [[67, 68, 22], [71, 72, 21], [75, 76, 22]]);
    await k.foes(DRONE, [[72, 16]]);
    await k.foes(SPARK, [[70, G]]);
    await fill(BRICK, 84, 18, 96, 18); // 神殿の屋根
    await place(SPIKE_D, [[88, 19], [89, 19]]);
    await k.foes(ROBO, [91]);
    await place(SPIKE, [[94, G - 1]]);
    await k.pool(102, 115);
    await k.ledges(SLAB, [[107, 109, 21]]);
    await k.foes('ギフトボックス', [[108, 20]]);
    await fill(TURN, 121, 21, 121, G - 1);
    await k.light(125, 20);
    await k.foes(SPIKER, [128, 131]);
    await k.foes(ROBO, [136]);
    await k.hill(140, 4, 3);
    await k.foes(CAPS, [155]);
    await k.pit(160, 164);
    await k.pit(169, 173);
    await k.foes(DRONE, [[167, 19]]);
    await k.stairs(BRICK, 178, 3);
    await k.start();
    await k.goal(190);
  });

  // ================= 2-2 みずの洞窟 =================
  await build({ theme: 'cave', title: '2-2 みずの洞窟', width: 200, file: 'stage2_2.js', name: 'STAGE_2_2' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 200);
    const SHELF = '岩の棚（上からだけ乗れる）', ROCK = '岩';
    await k.ground();
    await fill(ROCK, 0, 9, 199, 10); // 天井
    await place('つらら石（飾り）', [5, 18, 29, 44, 57, 71, 86, 99, 113, 126, 140, 151, 170, 183, 194].map((x) => [x, 11]));
    await place('結晶（飾り）', [9, 43, 54, 72, 113, 124, 147, 169, 181, 195].map((x) => [x, G - 1]));
    await k.message(6, 20, '2-2 みずの洞窟/水の中では B で泳げるよ。/水面で ↑ と B を押すと とび出せる。');
    await k.light(11, 20);
    await k.pool(16, 40);
    await k.ledges(SHELF, [[20, 21, 21], [26, 27, 21], [32, 33, 21], [37, 38, 22]]);
    await k.foes(SPARK, [[24, G - 1], [30, G - 1]]);
    await k.foes(SPIKER, [46]);
    await k.foes('甲羅', [49]);
    await fill(TURN, 53, 21, 53, G - 1);
    await k.lava(58, 68);
    await k.ledges(SHELF, [[60, 61, 22], [64, 65, 21]]);
    await k.foes(DRONE, [[63, 16]]);
    await fill(ROCK, 76, 16, 79, G - 1); // 岩の壁
    await fill('ハシゴ', 75, 15, 75, G - 1);
    await k.foes(CAPS, [[77, 15]]);
    await k.ledges(SHELF, [[80, 81, 19]]);
    await k.pool(88, 110);
    await fill(ROCK, 95, 18, 98, 19);
    await place(SPIKE_D, [[96, 20], [97, 20]]);
    await k.ledges(SHELF, [[103, 105, 21]]);
    await k.foes('ギフトボックス', [[104, 20]]);
    await k.cannon(ROCK, 116, 1, 2);
    await k.foes(ROBO, [122]);
    await k.lava(128, 142);
    await k.ledges(SHELF, [[130, 131, 22], [134, 135, 21], [138, 139, 22]]);
    await k.foes(SPARK, [[133, G - 1], [137, G - 1]]);
    await k.light(149, 20);
    await fill(ROCK, 156, 11, 166, 20); // 低い天井
    await place(SPIKE_D, [[160, 21], [161, 21]]);
    await k.foes(SPIKER, [164]);
    await k.stairs(ROCK, 174, 3);
    await k.start();
    await k.goal(187);
  });

  // ================= 2-3 よるのアキハバラ =================
  await build({ theme: 'akiba', title: '2-3 よるのアキハバラ', width: 208, file: 'stage2_3.js', name: 'STAGE_2_3' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 208);
    const RAIL = '高架の線路（上からだけ乗れる）', CON = 'コンクリート', USED = '叩いた後のブロック';
    const duct = async (x) => {
      await place('ダクトの口（左）', [[x, 22]]);
      await place('ダクトの口（右）', [[x + 1, 22]]);
      await place('ダクト（左）', [[x, 23]]);
      await place('ダクト（右）', [[x + 1, 23]]);
      await k.foes(SPARK, [[x, 21]]);
    };
    await k.ground();
    await k.message(6, 20, '2-3 よるのアキハバラ/空中のブロックでは、大ジャンプに注意。/上にトゲがあるよ。');
    await k.light(10, 20);
    await k.cannon(CON, 16, 0, 4);
    await k.pit(24, 36);
    await k.ledges(RAIL, [[26, 27, 22], [30, 31, 21], [34, 35, 22]]);
    await k.cannon(CON, 39, 0, 3);
    await k.foes(CAPS, [45]);
    await k.foes(ROBO, [51]);
    await place(SPIKE, [[55, G - 1]]);
    await k.foes(DRONE, [[59, 18]]);
    await k.foes(SPIKER, [63]);
    await duct(67);
    // 空中のブロック地帯（下は穴）
    await k.pit(73, 100);
    await place(USED, [[75, 21], [79, 20], [80, 20], [84, 21], [88, 19], [89, 19], [93, 21], [97, 20], [98, 20]]);
    await fill(CON, 85, 12, 92, 13);
    await fill(SPIKE_D, 85, 14, 92, 14);
    await place('ネオン看板（飾り）', [[88, 12], [89, 12]]);
    await k.foes(DRONE, [[82, 16]]);
    await k.foes(ROBO, [[98, 19]]);
    // H 字の柱
    await fill(CON, 110, 12, 110, 20);
    await fill(CON, 113, 12, 113, 20);
    await fill(CON, 104, 11, 119, 11);
    await place(SPIKE_D, [[110, 21], [113, 21]]);
    await k.foes(ROBO, [111]);
    await duct(120);
    await k.foes(SPIKER, [126, 129]);
    await k.foes('ギフトボックス', [131]);
    await fill(TURN, 135, 21, 135, G - 1);
    // 線路の橋（切れ目からスパーク）
    await k.pit(141, 170);
    await k.ledges(RAIL, [[141, 150, G], [154, 160, G], [164, 170, G]]);
    await k.foes(SPARK, [[152, G], [162, G]]);
    await k.foes(DRONE, [[157, 19]]);
    await k.foes(CAPS, [146]);
    await k.light(175, 20);
    await k.stairs(CON, 180, 3);
    await k.start();
    await k.goal(196);
  });

  // ================= 2-4 そらのツタ =================
  await build({ theme: 'grass', title: '2-4 そらのツタ', width: 200, file: 'stage2_4.js', name: 'STAGE_2_4' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 200);
    const SKY = '地面（上からだけ乗れる）', STONE = '石ブロック';
    await k.ground();
    await k.message(6, 20, '2-4 そらのツタ/ツタを登ると 空の道。/下の道は 敵がいっぱい。');
    await k.light(10, 20);
    await k.hill(14, 3, 2);
    await k.foes(SPIKER, [26]);
    // 空の道（ツタで登る）と、下の道
    await fill('ツタ', 32, 10, 32, G - 1);
    await fill(STONE, 33, 10, 37, 10);
    await k.foes('ギフトボックス', [[35, 9]]);
    await k.ledges(SKY, [[40, 44, 12], [48, 52, 13], [56, 60, 12]]);
    await k.light(50, 9);
    await k.foes(SPIKER, [40, 46, 52]);
    await k.foes(ROBO, [58]);
    await k.pit(64, 70);
    await k.ledges(STONE, [[65, 66, 22], [68, 69, 21]]);
    await k.pool(76, 92);
    await k.ledges(STONE, [[83, 85, 21]]);
    await k.foes(DRONE, [[84, 17]]);
    await k.hill(96, 5, 2);
    await k.foes(SPIKER, [112, 115]);
    await k.foes(CAPS, [118]);
    await k.foes('甲羅', [121]);
    await fill(TURN, 123, 20, 128, 20);
    await place('？ブロック（からっぽ）', [[125, 16]]);
    // 谷：ツタで登って、空の足場を下っていく
    await fill('ツタ', 134, 11, 134, G - 1);
    await fill(STONE, 135, 11, 138, 11);
    await k.pit(140, 162);
    await k.ledges(SKY, [[142, 145, 13], [149, 152, 15], [156, 159, 17]]);
    await k.ledges(STONE, [[147, 148, 22], [154, 155, 22]]);
    await k.foes(DRONE, [[153, 11]]);
    await k.cannon(STONE, 168, 1, 2);
    await k.foes(ROBO, [174]);
    await k.hill(178, 2, 3);
    await k.start();
    await k.goal(192);
  });

  // ================= 2-5 ほのおの城 =================
  await build({ theme: 'castle', title: '2-5 ほのおの城', width: 200, file: 'stage2_5.js', name: 'STAGE_2_5' }, async (ed) => {
    const { place, fill } = ed;
    const k = kit(ed, 200);
    const BRIDGE = '木の橋（上からだけ乗れる）', BRICK = 'お城のレンガ', IRON = '鉄のブロック';
    await k.ground();
    await fill(BRICK, 0, 8, 199, 9); // 天井
    await place('たいまつ（飾り）', [8, 34, 48, 74, 88, 124, 150, 164, 178].map((x) => [x, 19]));
    await place('窓（飾り）', [14, 46, 82, 126, 162].map((x) => [x, 15]));
    await k.message(6, 20, '2-5 ほのおの城/奥の扉の先に ほのおの王がいる。/5 回ふまないと たおせない！');
    await k.light(10, 20);
    await k.lava(16, 30);
    await k.ledges(BRIDGE, [[18, 19, 22], [22, 23, 21], [26, 27, 22]]);
    await k.foes(SPARK, [[21, G - 1], [25, G - 1]]);
    await fill(IRON, 38, 15, 41, G - 1); // 鉄の塔
    await fill('ハシゴ', 37, 14, 37, G - 1);
    await k.foes(CAPS, [[39, 14]]);
    await k.ledges(BRIDGE, [[42, 43, 18], [45, 46, 21]]);
    await k.foes('甲羅', [50]);
    await fill(BRICK, 53, 10, 70, 19); // トゲの廊下
    await place(SPIKE_D, [[56, 20], [57, 20], [62, 20], [63, 20], [67, 20]]);
    await place(SPIKE, [[60, G - 1], [65, G - 1]]);
    await k.foes(ROBO, [69]);
    await k.cannon(IRON, 76, 1, 2);
    await k.foes(SPIKER, [80]);
    await k.light(80, 19);
    await k.cannon(IRON, 84, 2, 2);
    await k.lava(92, 120);
    await k.ledges(BRIDGE, [[94, 95, 22], [98, 99, 21], [102, 103, 22], [106, 107, 20], [110, 111, 22], [114, 115, 21], [118, 119, 22]]);
    await k.foes(DRONE, [[100, 16], [112, 16]]);
    await k.foes(SPARK, [[97, G - 1], [105, G - 1], [113, G - 1]]);
    await k.foes('ギフトボックス', [125]);
    await fill(TURN, 129, 21, 130, G - 1);
    await k.foes(ROBO, [135, 141, 147]);
    await place(SPIKE, [[138, G - 1], [144, G - 1]]);
    await fill(IRON, 154, 16, 157, G - 1); // 2 つ目の塔
    await fill('ハシゴ', 153, 15, 153, G - 1);
    await k.ledges(BRIDGE, [[158, 159, 19]]);
    await k.light(166, 20);
    await k.stairs(BRICK, 170, 3);
    await fill(BRICK, 190, 10, 199, G - 1); // 行き止まりの壁
    await place('ボス扉（上）', [[186, G - 2], [187, G - 2]]);
    ed.nextPrompt = '2-5B';
    await place('ボス扉（下。置くと行き先を入力。↑で入る）', [[186, G - 1], [187, G - 1]]);
    await place('たいまつ（飾り）', [[184, G - 2], [189, G - 2]]);
    await k.start();
  });

  // ================= ボス部屋：ほのおの王 =================
  await build({ theme: 'castle', title: 'ほのおの王', width: 16, file: 'stage2_5b.js', name: 'STAGE_2_5B' }, async (ed) => {
    const { place, fill } = ed;
    await fill('地面', 0, G, 15, 26);
    await fill('お城のレンガ', 0, 11, 0, G - 1);
    await fill('お城のレンガ', 15, 11, 15, G - 1);
    await fill('お城のレンガ', 0, 10, 15, 11);
    await place('たいまつ（飾り）', [[3, 17], [12, 17]]);
    await place('窓（飾り）', [[7, 14], [8, 14]]);
    await fill('木の橋（上からだけ乗れる）', 2, 20, 4, 20); // 逃げ場（左右）
    await fill('木の橋（上からだけ乗れる）', 11, 20, 13, 20);
    await place('ボス：ほのおの王（5 回踏むと倒れてクリア）', [[11, G - 1]]);
    await place('スタート位置', [[2, G - 1]]);
  });
})();
