// 1-3「ゆうやけの遺跡」をステージエディタ（editor.html）を操作して作り、js/stages/stage1_3.js に書き出す。
// 使い方: リポジトリの直下で `python3 -m http.server 8123` を動かしてから
//   node tools/build_stage_1_3.cjs
// （Playwright が必要。パレットを選んでマスに置く、というエディタの操作をそのまま自動で行う）
const { createRequire } = require('module');
const fs = require('fs');
const path = require('path');
const r = createRequire(process.env.PLAYWRIGHT_ROOT || '/opt/node22/lib/node_modules/');
const { chromium } = r('playwright');

const G = 24; // 地面の一番上の段

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  let nextPrompt = '';
  pg.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(nextPrompt) : d.accept()));
  await pg.goto('http://localhost:8123/editor.html');
  await pg.waitForTimeout(500);

  // ☰ → 新しいステージ、テーマ・名前・幅
  await pg.click('#menu-btn');
  await pg.click('#new');
  await pg.selectOption('#theme', 'ruins');
  await pg.fill('#title', '1-3 ゆうやけの遺跡');
  await pg.dispatchEvent('#title', 'change');
  await pg.fill('#width', '208');
  await pg.dispatchEvent('#width', 'change');

  // パレットで選んで、マスに置く
  const pick = (name) => pg.click(`#palette button[title="${name}"]`);
  const put = (cells) => pg.evaluate((cs) => { for (const [x, y] of cs) window.editor.apply(x, y); }, cells);
  const rect = (x0, y0, x1, y1) => {
    const cs = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cs.push([x, y]);
    return put(cs);
  };
  const place = async (name, cells) => { await pick(name); await put(cells); };
  const fill = async (name, x0, y0, x1, y1) => { await pick(name); await rect(x0, y0, x1, y1); };
  const pillar = (x, y0) => fill('柱（飾り）', x, y0, x, G - 1);

  await fill('地面', 0, G, 207, 26);

  // ---- A. 入口：メッセージ、柱、光の玉、ギフト ----
  nextPrompt = '1-3 ゆうやけの遺跡/坂で ↓ を押すと、すべって敵をたおせるよ。/神殿の屋根にはハシゴで登れる。';
  await place('メッセージブロック（置くと文を入力）', [[6, 20]]);
  await pillar(9, 20);
  await pillar(11, 21);
  await place('？ブロック（光の玉）', [[14, 20]]);
  await place('ギフトボックス', [[17, G - 1]]);

  // ---- B. レンガの階段と、穴の上の石の板 ----
  for (let i = 0; i < 4; i++) await fill('遺跡のレンガ', 22 + i, G - 1 - i, 25, G - 1 - i);
  await fill('消しゴム', 26, G, 33, 26);
  await fill('遺跡のレンガ', 26, 20, 26, 26);
  await fill('石の板（上からだけ乗れる）', 28, 20, 29, 20);
  await fill('石の板（上からだけ乗れる）', 31, 21, 32, 21);
  await fill('遺跡のレンガ', 34, 22, 34, 26);
  await fill('遺跡のレンガ', 35, 23, 35, 23);

  // ---- C. 地上：甲羅、トゲムシ、金のブロックの橋 ----
  await place('甲羅', [[40, G - 1]]);
  await place('トゲムシ', [[44, G - 1], [48, G - 1]]);
  await fill('金のブロック（クルクル）', 51, 20, 55, 20);
  await place('？ブロック（からっぽ）', [[53, 16]]);
  await place('ガチャカプセル（転がる・踏める）', [[58, G - 1]]);
  await pillar(46, 19);

  // ---- D. 大きな穴：石の板を渡る ----
  await fill('消しゴム', 62, G, 75, 26);
  await fill('石の板（上からだけ乗れる）', 63, 22, 64, 22);
  await fill('石の板（上からだけ乗れる）', 67, 20, 68, 20);
  await fill('石の板（上からだけ乗れる）', 71, 22, 72, 22);
  await place('ドローン（左右にふわふわ・踏める）', [[67, 15]]);
  await place('電気スパーク（跳ね上がる・踏めない）', [[69, G]]);

  // ---- E. 神殿：屋根の下にロボとトゲ、ハシゴで屋根へ ----
  await fill('遺跡のレンガ', 80, 17, 100, 17);
  await fill('模様の石', 80, 16, 80, 16);
  await fill('模様の石', 100, 16, 100, 16);
  for (const x of [82, 90, 98]) await pillar(x, 18);
  await place('下向きのトゲ（触れるとダメージ）', [[87, 18], [88, 18]]);
  await place('警備ロボ（跳ねる・3 回踏むと倒れる）', [[86, G - 1]]);
  await place('トゲ（触れるとダメージ）', [[93, G - 1], [94, G - 1]]);
  await fill('ハシゴ', 101, 15, 101, G - 1);
  await place('？ブロック（光の玉）', [[90, 12]]);
  await place('トゲムシ', [[85, 16]]);

  // ---- 寄り道：屋根の上のツタから空の道へ。その先の浮き島に、ひみつのゴール ----
  await fill('ツタ', 95, 6, 95, 16);
  for (const [x0, x1, y] of [[97, 99, 7], [103, 104, 6], [108, 110, 7], [114, 115, 6], [119, 121, 7],
    [125, 126, 8], [130, 132, 7], [136, 137, 6], [141, 143, 7]]) await fill('石の板（上からだけ乗れる）', x0, y, x1, y);
  await place('ドローン（左右にふわふわ・踏める）', [[106, 3], [123, 4], [134, 3]]);
  await place('？ブロック（光の玉）', [[120, 3]]);
  await fill('遺跡のレンガ', 147, 8, 158, 9);
  await fill('模様の石', 147, 7, 147, 7);
  await place('ひみつのゴール（地図の隠し道が開く）', [[154, 7]]);

  // ---- F. 45°の大きな丘：すべってトゲムシをたおす ----
  for (let i = 0; i < 4; i++) {
    await place('45°の上り坂', [[112 + i, G - 1 - i]]);
    await place('45°の下り坂', [[123 - i, G - 1 - i]]);
    if (i) {
      await fill('地面（上からだけ乗れる）', 112 + i, G - i, 112 + i, G - 1);
      await fill('地面（上からだけ乗れる）', 123 - i, G - i, 123 - i, G - 1);
    }
  }
  await fill('地面（上からだけ乗れる）', 116, G - 4, 119, G - 1);
  await place('トゲムシ', [[126, G - 1], [129, G - 1]]);
  await place('模様の石', [[136, G - 1]]);
  await place('砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）', [[136, G - 2]]);

  // ---- G. 沈んだ遺跡の池 ----
  await fill('水', 143, G, 160, 25);
  await fill('石の板（上からだけ乗れる）', 150, 21, 152, 21);
  await pillar(146, 20);
  await pillar(157, 20);
  await place('ギフトボックス', [[151, 20]]);

  // ---- H. 出口 ----
  for (let i = 0; i < 3; i++) await fill('遺跡のレンガ', 168 + i, G - 1 - i, 170, G - 1 - i);
  await fill('遺跡のレンガ', 171, G - 3, 172, G - 1);
  await place('ガチャカプセル（転がる・踏める）', [[180, G - 1]]);
  await pillar(188, 19);
  await pillar(200, 19);
  await place('スタート位置', [[3, G - 1]]);
  await place('ゴール（もう一度置くと移動）', [[194, G - 1]]);

  const data = await pg.evaluate(() => window.editor.level.toData());
  const out = path.join(__dirname, '..', 'js', 'stages', 'stage1_3.js');
  fs.writeFileSync(out,
    '// 1-3 ゆうやけの遺跡。ステージエディタで作ったデータ（tools/build_stage_1_3.cjs がエディタを操作して書き出す）。\n'
    + '// エディタの ☰ →「1-3 ゆうやけの遺跡を読み込む」で編集できる。\n'
    + `export const STAGE_1_3 = ${JSON.stringify(data)};\n`);
  await pg.screenshot({ path: process.argv[2] || '/dev/null' }).catch(() => {});
  console.log(errs.join('\n') || `wrote ${out} (${data.width} マス, 敵・物 ${data.spawns.length})`);
  await b.close();
})();
