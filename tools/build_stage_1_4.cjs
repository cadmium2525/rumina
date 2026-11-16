// 1-4「そよかぜの丘」をステージエディタを操作して作る: node tools/build_stage_1_4.cjs
const { build } = require('./editor_driver.cjs');
const G = 24;

build({ theme: 'grass', title: '1-4 そよかぜの丘', width: 216, file: 'stage1_4.js', name: 'STAGE_1_4' }, async (ed) => {
  const { place, fill } = ed;
  await fill('地面', 0, G, 215, 26);
  // 丘：x0 から 45°で h 段登り、平らな頂上 top マス、45°で下る
  const hill = async (x0, h, top) => {
    for (let i = 0; i < h; i++) {
      await place('45°の上り坂', [[x0 + i, G - 1 - i]]);
      await place('45°の下り坂', [[x0 + 2 * h + top - 1 - i, G - 1 - i]]);
      if (i) {
        await fill('地面（上からだけ乗れる）', x0 + i, G - i, x0 + i, G - 1);
        await fill('地面（上からだけ乗れる）', x0 + 2 * h + top - 1 - i, G - i, x0 + 2 * h + top - 1 - i, G - 1);
      }
    }
    await fill('地面（上からだけ乗れる）', x0 + h, G - h, x0 + h + top - 1, G - 1);
  };

  // ---- A. 入口 ----
  ed.nextPrompt = '1-4 そよかぜの丘/丘がつづくよ。坂でしゃがんですべろう。/ツタを登ると、空の道がある。';
  await place('メッセージブロック（置くと文を入力）', [[6, 20]]);
  await place('？ブロック（光の玉）', [[10, 20]]);
  await place('トゲムシ', [[15, G - 1]]);

  // ---- B. 丘が 2 つ。間にトゲムシ ----
  await hill(19, 3, 3);
  await place('トゲムシ', [[30, G - 1], [33, G - 1]]);
  await hill(36, 4, 2);
  await place('ガチャカプセル（転がる・踏める）', [[49, G - 1]]);

  // ---- C. 金のブロックと甲羅 ----
  await place('甲羅', [[53, G - 1]]);
  await fill('金のブロック（クルクル）', 57, 20, 61, 20);
  await place('？ブロック（からっぽ）', [[59, 16]]);
  await fill('金のブロック（クルクル）', 65, 21, 65, G - 1);
  await place('トゲムシ', [[68, G - 1], [71, G - 1]]);

  // ---- D. 谷：ツタで空の道へ。下は石の足場 ----
  await fill('消しゴム', 76, G, 97, 26);
  await fill('ツタ', 75, 12, 75, G - 1);
  await fill('石ブロック', 76, 12, 80, 12);
  await fill('地面（上からだけ乗れる）', 84, 13, 88, 13);
  await fill('地面（上からだけ乗れる）', 92, 14, 96, 14);
  await place('？ブロック（光の玉）', [[86, 9]]);
  await place('ギフトボックス', [[78, 11]]);
  await fill('石ブロック', 79, 22, 80, 22);
  await fill('石ブロック', 84, 21, 85, 21);
  await fill('石ブロック', 89, 22, 90, 22);
  await fill('石ブロック', 94, 21, 95, 21);
  await place('ドローン（左右にふわふわ・踏める）', [[87, 17]]);

  // ---- E. 池 ----
  await fill('水', 104, G, 119, 25);
  await fill('石ブロック', 110, 21, 113, 21);
  await place('電気スパーク（跳ね上がる・踏めない）', [[116, G - 1]]);

  // ---- F. 砲台の丘 ----
  await hill(124, 2, 6);
  await fill('砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）', 129, 19, 129, 21);
  await place('警備ロボ（跳ねる・3 回踏むと倒れる）', [[138, G - 1]]);
  await place('トゲ（触れるとダメージ）', [[142, G - 1], [143, G - 1]]);

  // ---- G. ゆるい坂の登り下りと、穴 ----
  await place('ゆるい上り坂（下）', [[148, G - 1]]);
  await place('ゆるい上り坂（上）', [[149, G - 1]]);
  await fill('地面（上からだけ乗れる）', 150, G - 1, 155, G - 1);
  await place('ゆるい下り坂（上）', [[156, G - 1]]);
  await place('ゆるい下り坂（下）', [[157, G - 1]]);
  await place('トゲムシ', [[152, G - 2]]);
  await fill('消しゴム', 161, G, 165, 26);
  await fill('消しゴム', 170, G, 174, 26);
  await place('ドローン（左右にふわふわ・踏める）', [[168, 19]]);

  // ---- H. 大きな丘を越えてゴール ----
  await hill(180, 5, 3);
  await place('ガチャカプセル（転がる・踏める）', [[197, G - 1]]);
  await place('スタート位置', [[3, G - 1]]);
  await place('ゴール（もう一度置くと移動）', [[204, G - 1]]);
});
