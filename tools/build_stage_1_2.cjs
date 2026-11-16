// 1-2「ひかりの洞窟」をステージエディタ（editor.html）を操作して作り、js/stages/stage1_2.js に書き出す。
// 使い方: リポジトリの直下で `python3 -m http.server 8123` を動かしてから
//   node tools/build_stage_1_2.cjs
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
  await pg.selectOption('#theme', 'cave');
  await pg.fill('#title', '1-2 ひかりの洞窟');
  await pg.dispatchEvent('#title', 'change');
  await pg.fill('#width', '192');
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

  // ---- 地面と天井 ----
  await fill('地面', 0, G, 191, 26);
  await fill('岩', 0, 9, 191, 10);
  await place('つらら石（飾り）', [3, 9, 14, 21, 33, 47, 52, 66, 79, 85, 96, 108, 115, 127, 138, 159, 166, 175, 186].map((x) => [x, 11]));
  await place('結晶（飾り）', [5, 19, 48, 69, 93, 111, 137, 160, 183].map((x) => [x, G - 1]));

  // ---- A. 入口：メッセージ、光の玉、ゆるい丘 ----
  nextPrompt = '1-2 ひかりの洞窟/マグマに落ちるとミスだよ。/岩の棚は下からすり抜けられる。/ハシゴやツタは ↑ でつかまろう。';
  await place('メッセージブロック（置くと文を入力）', [[7, 20]]);
  await place('？ブロック（光の玉）', [[11, 20]]);
  await place('ゆるい上り坂（下）', [[22, G - 1]]);
  await place('ゆるい上り坂（上）', [[23, G - 1]]);
  await fill('地面（上からだけ乗れる）', 24, G - 1, 27, G - 1);
  await place('ゆるい下り坂（上）', [[28, G - 1]]);
  await place('ゆるい下り坂（下）', [[29, G - 1]]);
  await place('トゲムシ', [[26, G - 2], [31, G - 1]]);

  // ---- B. マグマの池と岩の棚 ----
  await fill('マグマ（落ちるとミス）', 35, G, 45, 26);
  await fill('岩の棚（上からだけ乗れる）', 37, 22, 38, 22);
  await fill('岩の棚（上からだけ乗れる）', 42, 21, 43, 21);
  await place('ドローン（左右にふわふわ・踏める）', [[40, 17]]);

  // ---- C. 甲羅と金のブロックの壁 ----
  await place('甲羅', [[50, G - 1]]);
  await place('トゲムシ', [[56, G - 1], [59, G - 1]]);
  await fill('金のブロック（クルクル）', 63, 21, 64, G - 1); // 跳び越す・スピンで壊す・甲羅で回す
  await place('ガチャカプセル（転がる・踏める）', [[68, G - 1]]);

  // ---- D. 地底の池（泳ぐ） ----
  await fill('岩', 73, G, 73, 26);
  await fill('岩', 88, G, 88, 26);
  await fill('水', 74, G - 1, 87, 25);
  await fill('岩', 73, G - 1, 73, G - 1);
  await fill('岩', 88, G - 1, 88, G - 1);
  await fill('岩', 79, 18, 82, 19); // 池の上の岩（水面から飛び出す時に頭をぶつける）
  await place('下向きのトゲ（触れるとダメージ）', [[80, 20], [81, 20]]);

  // ---- E. 岩の壁：ハシゴで登る ----
  await place('ギフトボックス', [[94, G - 1]]);
  await fill('岩', 100, 16, 104, G - 1);
  await fill('ハシゴ', 99, 15, 99, G - 1);
  await place('トゲムシ', [[102, 15]]);
  await fill('岩の棚（上からだけ乗れる）', 105, 19, 106, 19);
  await fill('ツタ', 107, 12, 107, 17); // 上へ続くツタ（寄り道）
  await place('？ブロック（光の玉）', [[110, 14]]);
  await fill('岩の棚（上からだけ乗れる）', 109, 17, 111, 17);

  // ---- F. マグマの谷と砲台 ----
  await fill('マグマ（落ちるとミス）', 116, G, 126, 26);
  await fill('岩の棚（上からだけ乗れる）', 118, 22, 119, 22);
  await fill('岩の棚（上からだけ乗れる）', 123, 22, 124, 22);
  await fill('砲台（約 3 秒ごとにルミナのいる側へ砲弾を撃つ）', 131, 20, 131, 21);
  await fill('岩', 131, 22, 131, G - 1);
  await place('電気スパーク（跳ね上がる・踏めない）', [[121, G - 1]]);

  // ---- G. 低い天井：しゃがみ滑り・小さいままなら楽 ----
  await place('45°の上り坂', [[138, G - 1], [139, G - 2]]);
  await fill('地面（上からだけ乗れる）', 139, G - 1, 141, G - 1);
  await fill('地面（上からだけ乗れる）', 140, G - 2, 141, G - 2);
  await place('45°の下り坂', [[142, G - 2], [143, G - 1]]);
  await fill('地面（上からだけ乗れる）', 142, G - 1, 142, G - 1);
  await fill('岩', 146, 14, 156, 20);
  await place('下向きのトゲ（触れるとダメージ）', [[150, 21], [151, 21]]);
  await place('警備ロボ（跳ねる・3 回踏むと倒れる）', [[154, G - 1]]);
  await place('トゲ（触れるとダメージ）', [[158, G - 1]]);

  // ---- H. 出口：岩の階段とゴール ----
  for (let i = 0; i < 3; i++) await fill('岩', 164 + i, G - 1 - i, 166, G - 1 - i);
  await place('ガチャカプセル（転がる・踏める）', [[171, G - 1]]);
  await place('スタート位置', [[3, G - 1]]);
  await place('ゴール（もう一度置くと移動）', [[180, G - 1]]);

  const data = await pg.evaluate(() => window.editor.level.toData());
  const out = path.join(__dirname, '..', 'js', 'stages', 'stage1_2.js');
  fs.writeFileSync(out,
    '// 1-2 ひかりの洞窟。ステージエディタで作ったデータ（tools/build_stage_1_2.cjs がエディタを操作して書き出す）。\n'
    + '// エディタの ☰ →「1-2 ひかりの洞窟を読み込む」で編集できる。\n'
    + `export const STAGE_1_2 = ${JSON.stringify(data)};\n`);
  await pg.screenshot({ path: process.argv[2] || '/dev/null' }).catch(() => {});
  console.log(errs.join('\n') || `wrote ${out} (${data.width} マス, 敵・物 ${data.spawns.length})`);
  await b.close();
})();
