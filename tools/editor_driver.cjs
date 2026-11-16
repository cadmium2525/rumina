// ステージエディタ（editor.html）を自動で操作してステージを作るための共通部分。
// リポジトリの直下で `python3 -m http.server 8123` を動かしてから、各 build_stage_*.cjs を実行する。
const { createRequire } = require('module');
const fs = require('fs');
const path = require('path');
const r = createRequire(process.env.PLAYWRIGHT_ROOT || '/opt/node22/lib/node_modules/');
const { chromium } = r('playwright');

// opt: {theme, title, width, file, name}。design(ed) の中で ed.place / ed.fill などを呼ぶ
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
  await pg.fill('#title', opt.title);
  await pg.dispatchEvent('#title', 'change');
  await pg.fill('#width', String(opt.width));
  await pg.dispatchEvent('#width', 'change');
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
