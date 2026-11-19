// ステージエディタ（editor.html）を自動で操作してステージを作るための共通部分。
// リポジトリの直下で `python3 -m http.server 8123` を動かしてから、各 build_stage_*.cjs を実行する。
const { createRequire } = require('module');
const fs = require('fs');
const path = require('path');
const r = createRequire(process.env.PLAYWRIGHT_ROOT || '/opt/node22/lib/node_modules/');
const { chromium } = r('playwright');

// opt: {theme, title, width, file, name, autoScroll}。design(ed) の中で ed.place / ed.fill などを呼ぶ
exports.build = async (opt, design) => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const ed = { nextPrompt: '' };
  pg.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(ed.nextPrompt) : d.accept()));
  await pg.goto('http://localhost:8123/editor.html');
  await pg.waitForTimeout(500);
  // ☰ → 新しいステージ、テーマ・名前・幅
  await pg.click('#menu-btn');
  await pg.click('#new');
  await pg.selectOption('#theme', opt.theme);
  // 強制スクロール（opt.autoScroll：1 遅い / 2 速い）
  if (opt.autoScroll) await pg.selectOption('#autoscroll', String(opt.autoScroll));
  await pg.fill('#title', opt.title);
  await pg.dispatchEvent('#title', 'change');
  await pg.fill('#width', String(opt.width));
  await pg.dispatchEvent('#width', 'change');
  await pg.evaluate(() => document.activeElement && document.activeElement.blur());
  // パレットで選んで、マスに置く
  const pick = (name) => pg.click(`#palette button[title="${name}"]`);
  const put = (cells) => pg.evaluate((cs) => { for (const [x, y] of cs) window.editor.apply(x, y); }, cells);
  ed.place = async (name, cells) => { await pick(name); await put(cells); };
  ed.fill = async (name, x0, y0, x1, y1) => {
    const cs = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cs.push([x, y]);
    await pick(name);
    await put(cs);
  };
  await design(ed);
  const data = await pg.evaluate(() => window.editor.level.toData());
  const out = path.join(__dirname, '..', 'js', 'stages', opt.file);
  fs.writeFileSync(out,
    `// ${opt.title}。ステージエディタで作ったデータ（tools/ の build_stage_*.cjs がエディタを操作して書き出す）。\n`
    + `export const ${opt.name} = ${JSON.stringify(data)};\n`);
  console.log(errs.join('\n') || `wrote ${opt.file} (${data.width} マス, 敵・物 ${data.spawns.length})`);
  await b.close();
};

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

Object.assign(exports, { G, kit, SPIKER, CAPS, ROBO, DRONE, SPARK, SPIKE, SPIKE_D, TURN });
