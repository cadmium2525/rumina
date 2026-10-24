// テスト用ヘルパー：ボタン入力から World を進める
import { World } from '../js/world.js';
import { PAD, PAD2 } from '../js/player.js';
import { GROUND_Y, TILES_W, TILES_H, TILE } from '../js/level.js';

export { PAD, PAD2 };

// flat: 地面だけの平坦なステージにする / spawns: ステージ上の敵・アイテムを出す
// power: 0=小さい 1=大きい（既存のテストは大きい状態が前提）
export function makeWorld({ spawns = false, flat = true, power = 1 } = {}) {
  const w = new World();
  w.player.powerUp = power;
  if (flat) {
    const lv = w.level;
    lv.tiles.fill(0);
    lv.fill(0, GROUND_Y / 16, lv.width, TILES_H - GROUND_Y / 16, TILE.GROUND);
  }
  if (!spawns) w.points = [];
  return w;
}

// 入力関数 fn(frame) -> [hold1, hold2]。press は前フレームとの差分から作る
export function run(w, frames, fn = () => [0, 0]) {
  let prev1 = w._prev1 ?? 0;
  let prev2 = w._prev2 ?? 0;
  const log = [];
  for (let f = 0; f < frames; f++) {
    const [h1, h2 = 0] = fn(f);
    const pad = { hold1: h1, press1: h1 & ~prev1, hold2: h2, press2: h2 & ~prev2 };
    prev1 = h1;
    prev2 = h2;
    w.step(pad);
    const p = w.player;
    log.push({ x: p.xpos, y: p.ypos, xs: (p.xspeed << 24) >> 24, ys: (p.yspeed << 24) >> 24, air: p.inAir, pose: p.pose, pm: p.pmeter });
  }
  w._prev1 = prev1;
  w._prev2 = prev2;
  return log;
}
