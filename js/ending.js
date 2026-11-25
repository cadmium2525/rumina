// エンディング：星空の下をルミナが歩き、クリアしたステージ（ぼうけんの記録）が流れていく。
// エンディングの曲（約 70 秒）に合わせて流れ、最後の和音のあたりで「おわり」。
// START で最後まで飛ばせる。「おわり」が出たら A・B・START で地図へ
import { SCREEN_W, SCREEN_H, TILE } from './level.js';
import { POSE } from './player.js';

const FPS = 60.0988;
const ROLL_FRAMES = Math.round(64 * FPS); // 文字が流れ終わるまで（曲の最後の和音の少し前）
const GROUND_Y = 192;

export class EndingScreen {
  constructor(sprite, view) {
    this.sprite = sprite;
    this.view = view;
    this.items = [];
    this.frame = 0;
    // 星（毎回同じ位置）
    let s = 7;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    this.stars = Array.from({ length: 70 }, () => ({ x: rnd() * SCREEN_W, y: rnd() * 170, p: rnd() * 6.28, big: rnd() < 0.15 }));
  }

  // items：{ text, kind }（kind：title・sub・head・line・gap・end）
  start(items, power) {
    this.power = power;
    this.items = [];
    let y = 0;
    for (const it of items) {
      const h = it.kind === 'title' ? 34 : it.kind === 'gap' ? 14 : it.kind === 'head' ? 22 : 14;
      if (it.kind === 'head') y += 8;
      this.items.push({ ...it, y });
      y += h;
    }
    this.height = y;
    // 最後の行が画面のまん中を過ぎるまでを ROLL_FRAMES にする
    this.speed = (this.height + SCREEN_H / 2) / ROLL_FRAMES;
    this.frame = 0;
    this.endAt = ROLL_FRAMES;
  }

  get finished() { return this.frame >= this.endAt; }

  // 1 フレーム進める。地図へ戻る時に 'exit' を返す
  step(pad) {
    this.frame++;
    if (!this.finished && pad.startPressed && this.frame > 90) this.endAt = this.frame; // 飛ばす
    const any = (pad.press1 & 0xc0) || (pad.press2 & 0x80) || pad.startPressed;
    if (this.finished && this.frame > this.endAt + 90 && any) return 'exit';
    return null;
  }

  draw(g) {
    const f = this.frame;
    // 夜空
    const sky = g.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#0a0820');
    sky.addColorStop(0.6, '#1c1844');
    sky.addColorStop(1, '#3a2a5a');
    g.fillStyle = sky;
    g.fillRect(0, 0, SCREEN_W, GROUND_Y);
    for (const st of this.stars) {
      const a = 0.45 + 0.55 * Math.abs(Math.sin(st.p + f / 40));
      g.fillStyle = `rgba(255,248,220,${a})`;
      const x = (st.x - f * 0.05 + SCREEN_W) % SCREEN_W;
      g.fillRect(Math.floor(x), Math.floor(st.y), st.big ? 2 : 1, st.big ? 2 : 1);
    }
    // 地面（ゆっくり流れる）とルミナ（歩く）
    const grass = this.view.tileImage(TILE.GROUND, 'grass', TILE.EMPTY);
    const dirt = this.view.tileImage(TILE.GROUND, 'grass', TILE.GROUND);
    const scroll = this.finished ? Math.floor(this.endAt * 0.5) : Math.floor(f * 0.5);
    const gx = -scroll % 16;
    for (let x = gx - 16; x < SCREEN_W + 16; x += 16) {
      g.drawImage(grass, x, GROUND_Y);
      g.drawImage(dirt, x, GROUND_Y + 16);
    }
    g.save();
    g.fillStyle = 'rgba(10,8,32,0.35)';
    g.fillRect(0, GROUND_Y, SCREEN_W, SCREEN_H - GROUND_Y);
    g.restore();
    const ry = GROUND_Y - 32; // 大きさによらず 32（小さいルミナは下半分に描かれる）
    if (this.finished) this.sprite.draw(g, f - this.endAt > 40 ? POSE.WIN : POSE.STAND, 1, 30, ry, this.power);
    else this.sprite.draw(g, (f >> 3) & 1 ? POSE.WALK1 : POSE.WALK2, 1, 30, ry, this.power);

    // 流れる文字
    g.save();
    g.beginPath();
    g.rect(0, 0, SCREEN_W, GROUND_Y - 2);
    g.clip();
    g.textAlign = 'center';
    g.strokeStyle = '#0a0820';
    const top = SCREEN_H - f * this.speed;
    if (!this.finished) {
      for (const it of this.items) {
        const y = Math.round(top + it.y);
        if (y < -40 || y > SCREEN_H + 20) continue;
        if (it.kind === 'gap') continue;
        const style = {
          title: ['bold 28px system-ui, sans-serif', '#ffe070', 5],
          sub: ['bold 10px system-ui, sans-serif', '#ffffff', 3],
          head: ['bold 11px system-ui, sans-serif', '#ffd0f0', 3],
          line: ['10px system-ui, sans-serif', '#ffffff', 3],
          end: ['bold 12px system-ui, sans-serif', '#c8d8ff', 3],
        }[it.kind] ?? ['10px system-ui, sans-serif', '#ffffff', 3];
        g.font = style[0];
        g.lineWidth = style[2];
        // 画面の上と下では少しうすく
        const fade = Math.min(1, Math.max(0, (y + 10) / 40), Math.max(0, (GROUND_Y - y) / 30));
        g.globalAlpha = fade;
        g.strokeText(it.text, SCREEN_W / 2, y);
        g.fillStyle = style[1];
        g.fillText(it.text, SCREEN_W / 2, y);
      }
    } else {
      // おわり
      const t = Math.min(1, (f - this.endAt) / 60);
      g.globalAlpha = t;
      g.font = 'bold 30px system-ui, sans-serif';
      g.lineWidth = 5;
      g.shadowColor = 'rgba(255,240,160,0.8)';
      g.shadowBlur = 12;
      g.strokeText('おわり', SCREEN_W / 2, 100);
      g.shadowBlur = 0;
      g.fillStyle = '#ffe070';
      g.fillText('おわり', SCREEN_W / 2, 100);
      if (f - this.endAt > 90 && (f >> 5) & 1) {
        g.font = 'bold 9px system-ui, sans-serif';
        g.lineWidth = 3;
        g.strokeText('ボタンで ちずへ', SCREEN_W / 2, 140);
        g.fillStyle = '#ffffff';
        g.fillText('ボタンで ちずへ', SCREEN_W / 2, 140);
      }
    }
    g.restore();
  }
}
