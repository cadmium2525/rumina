// タイトル画面：ロゴ・ルミナ・グレイコインの回収率・クリア数と、メニュー（つづきから・はじめから・あそびかた・ステージエディタ・振動）
import { SCREEN_W, SCREEN_H, TILE, CAM_Y } from './level.js';
import { PAD } from './player.js';
import { POSE } from './player.js';
import { gridToCanvas } from './sprites.js';
import { GRAYCOIN, PAL_GRAYCOIN } from './graycoin_art.js';

const MENU_X = 124;
const MENU_W = 60; // 枠の半分の幅
const MENU_Y = 120;
const ROW = 15;

export class TitleScreen {
  constructor(sprite, view) {
    this.sprite = sprite; // RuminaSprite
    this.view = view;     // LevelView（背景と地面）
    this.coin = gridToCanvas(GRAYCOIN, PAL_GRAYCOIN);
    this.cursor = 0;
    this.frame = 0;
    this.items = [];
  }

  // メニューの中身（セーブの有無と振動の設定で変わる）
  setItems({ hasSave, haptics }) {
    this.items = [
      { id: 'continue', text: hasSave ? 'つづきから' : 'はじめる' },
      ...(hasSave ? [{ id: 'new', text: 'はじめから' }] : []),
      { id: 'help', text: 'あそびかた' },
      { id: 'editor', text: 'ステージエディタ' },
      { id: 'haptic', text: `振動：${haptics ? 'オン' : 'オフ'}` },
    ];
    this.cursor = Math.min(this.cursor, this.items.length - 1);
  }

  // 1 フレーム進める。決めた項目の id を返す
  step(pad) {
    this.frame++;
    const n = this.items.length;
    if (pad.press1 & PAD.UP) this.cursor = (this.cursor + n - 1) % n;
    if (pad.press1 & PAD.DOWN) this.cursor = (this.cursor + 1) % n;
    if ((pad.press1 & PAD.UP) || (pad.press1 & PAD.DOWN)) this.moved = true;
    if ((pad.press1 & 0xc0) || (pad.press2 & 0x80) || pad.startPressed) return this.items[this.cursor].id;
    return null;
  }

  // 画面の座標（256x224）でタップされた項目
  hit(x, y) {
    const i = Math.floor((y - (MENU_Y - 11)) / ROW);
    if (x < MENU_X - MENU_W || x > MENU_X + MENU_W || i < 0 || i >= this.items.length) return null;
    this.cursor = i;
    return this.items[i].id;
  }

  draw(g, { coins, coinTotal, clears, clearTotal }) {
    const f = this.frame;
    // 背景：ゆっくり流れる草原と、地面
    this.view.drawBackground(g, f * 0.4, CAM_Y, 'grass');
    const grass = this.view.tileImage(TILE.GROUND, 'grass', TILE.EMPTY);
    const dirt = this.view.tileImage(TILE.GROUND, 'grass', TILE.GROUND);
    const gx = -Math.floor(f * 0.4) % 16;
    for (let x = gx - 16; x < SCREEN_W + 16; x += 16) {
      g.drawImage(grass, x, 192);
      g.drawImage(dirt, x, 208);
    }
    // ロゴ
    g.save();
    g.textAlign = 'center';
    g.font = 'bold 40px system-ui, sans-serif';
    const glow = 0.5 + 0.5 * Math.sin(f / 30);
    g.shadowColor = `rgba(255,240,160,${0.5 + glow * 0.4})`;
    g.shadowBlur = 10;
    g.lineWidth = 6;
    g.strokeStyle = '#24141c';
    g.strokeText('ルミナ', SCREEN_W / 2, 58);
    g.shadowBlur = 0;
    const grad = g.createLinearGradient(0, 24, 0, 60);
    grad.addColorStop(0, '#fff8c8');
    grad.addColorStop(0.5, '#ffe070');
    grad.addColorStop(1, '#f0a830');
    g.fillStyle = grad;
    g.fillText('ルミナ', SCREEN_W / 2, 58);
    g.font = 'bold 10px system-ui, sans-serif';
    g.lineWidth = 3;
    g.strokeText('ひかりの少女の だいぼうけん', SCREEN_W / 2, 76);
    g.fillStyle = '#ffffff';
    g.fillText('ひかりの少女の だいぼうけん', SCREEN_W / 2, 76);
    g.restore();
    // ルミナ（地面の上で、ときどき向きを変える）
    this.sprite.draw(g, POSE.STAND, (f >> 7) & 1, 22, 160, 1);
    // メニュー
    g.fillStyle = 'rgba(28,20,36,0.78)';
    g.fillRect(MENU_X - MENU_W, MENU_Y - 14, MENU_W * 2, this.items.length * ROW + 8);
    g.strokeStyle = '#ffe070';
    g.lineWidth = 1;
    g.strokeRect(MENU_X - MENU_W + 0.5, MENU_Y - 13.5, MENU_W * 2 - 1, this.items.length * ROW + 7);
    g.font = 'bold 11px system-ui, sans-serif';
    g.textAlign = 'center';
    this.items.forEach((it, i) => {
      const y = MENU_Y + i * ROW;
      const on = i === this.cursor;
      g.fillStyle = on ? '#ffe070' : '#ffffff';
      g.fillText(it.text, MENU_X, y);
      if (on && (f >> 4) & 1) {
        g.fillText('▶', MENU_X - MENU_W + 9, y);
      }
    });
    // グレイコインの回収率とクリア数（右下）
    g.textAlign = 'left';
    g.drawImage(this.coin, 192, 168);
    g.font = 'bold 9px system-ui, sans-serif';
    g.lineWidth = 3;
    g.strokeStyle = '#24141c';
    const pct = coinTotal ? Math.floor((coins / coinTotal) * 100) : 0;
    const lines = [[`${coins} / ${coinTotal}`, 219, 178, '#ffffff'], [`${pct}%`, 219, 189, '#ffe070'],
      [`クリア ${clears} / ${clearTotal}`, 190, 205, '#ffffff']];
    for (const [t, x, y, c] of lines) {
      g.strokeText(t, x, y);
      g.fillStyle = c;
      g.fillText(t, x, y);
    }
    g.font = 'bold 8px system-ui, sans-serif';
    g.strokeText('グレイコイン', 192, 165);
    g.fillStyle = '#c8ccd8';
    g.fillText('グレイコイン', 192, 165);
  }
}
