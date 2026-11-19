// 暗やみ（ワールド 8）：画面を暗い幕でおおい、光る物のまわりだけ穴を開けて見えるようにする。
// 見た目だけ（ゲームの処理には関係しない）。
// 光る物：ルミナ（光の玉で大きくなると広く照らす）・光の玉・たいまつ・溶岩・ひのこ・火柱・電気・ゴール・ボスと玉・コウモリの目
import { SCREEN_W, SCREEN_H, TILE } from './level.js';

const DARK = 'rgba(4,2,12,0.94)';
// ルミナの光の半径（小さい・大きい）
export const RUMINA_LIGHT = [60, 88];

export class Darkness {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.g = this.canvas.getContext('2d');
  }

  // 穴（光）を 1 つ開ける。中心はほぼ透明、ふちに向かって暗くなる
  hole(x, y, r) {
    const g = this.g;
    const grad = g.createRadialGradient(x, y, r * 0.15, x, y, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.75)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 光る物を集める（画面の座標）
  lights(world, camX, camY, frame) {
    const out = [];
    const p = world.player;
    if (p.state !== 9) out.push([p.xpos + 8 - camX, p.ypos + (p.small ? 24 : 16) - camY, RUMINA_LIGHT[p.powerUp ? 1 : 0]]);
    const flick = (k) => Math.sin((frame + k * 37) / 5) * 3;
    for (const a of world.actors) {
      const x = a.x - camX;
      const y = a.y - camY;
      if (x < -80 || x > SCREEN_W + 80) continue;
      if (a.type === 'light') out.push([x + 8, y + 8, 40]);
      else if (a.type === 'ember' && a.jumping) out.push([x + 8, y + 8, 30 + flick(a.x)]);
      else if (a.type === 'pillar') out.push([x + 8, a.floorY - camY - Math.max(8, a.h / 2), a.h ? 40 : 18]);
      else if (a.type === 'shock' || a.type === 'spark') out.push([x + 8, y + 8, 22]);
      else if (a.type === 'boss') out.push([x + 8, y, 44]);
      else if (a.type === 'shadowball') out.push([x + 8, y + 8, 18]); // ボスの玉はかすかに光る
      else if (a.type === 'bat' && !a.dying) out.push([x + 8, y + 8, 10]); // コウモリの目が光る
      else if (a.type === 'goal') out.push([x, a.bottom - camY - 40, 56]);
      else if (a.type === 'graycoin') out.push([x + 8, y + 8, 20]); // グレイコインはかすかに光る
    }
    // 光るタイル：たいまつ・溶岩の表面・結晶・ネオン
    const lv = world.level;
    const tx0 = Math.floor(camX / 16) - 2;
    const ty0 = Math.max(0, Math.floor(camY / 16) - 2);
    for (let ty = ty0; ty < ty0 + 18; ty++) {
      for (let tx = tx0; tx < tx0 + 21; tx++) {
        const t = lv.tileAt(tx, ty);
        const x = tx * 16 + 8 - camX;
        const y = ty * 16 + 8 - camY;
        if (t === TILE.TORCH) out.push([x, y - 2, 48 + flick(tx)]);
        else if (t === TILE.LAVA && lv.tileAt(tx, ty - 1) !== TILE.LAVA) out.push([x, y - 4, 22]);
        else if (t === TILE.CRYSTAL || t === TILE.NEON) out.push([x, y, 20]);
        else if (t === TILE.OLD_DOOR) out.push([x, y - 8, 34]); // 古びたドアのすき間の光
      }
    }
    return out;
  }

  draw(g, world, camX, camY, frame) {
    const d = this.g;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, SCREEN_W, SCREEN_H);
    d.fillStyle = DARK;
    d.fillRect(0, 0, SCREEN_W, SCREEN_H);
    d.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of this.lights(world, camX, camY, frame)) this.hole(x, y, r);
    d.globalCompositeOperation = 'source-over';
    g.drawImage(this.canvas, 0, 0);
  }
}
