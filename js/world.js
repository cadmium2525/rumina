// ゲーム世界：レベル・プレイヤー・スプライト・エフェクトをまとめて 1 フレーム進める。
// DOM に依存しない（描画は main.js / *_view.js）。
import { Player } from './player.js';
import { Level, Camera, GROUND_Y, SCREEN_W, LEVEL_H } from './level.js';
import { GiftBox, Shell, Spiker } from './actors.js';
import { BRICK_X, BRICK_Y, BRICK_XSPEED, BRICK_YSPEED } from './smw_tables.js';

export class World {
  constructor() {
    this.level = new Level();
    this.camera = new Camera();
    this.player = new Player(0x40, GROUND_Y - 0x20);
    this.actors = [];
    this.effects = [];
    this.events = [];
    this.frame = 0;
    this.points = this.level.spawns.map((s) => ({ ...s, state: 'idle', actor: null }));
    this.env = {
      level: this.level,
      camX: 0,
      frame: 0,
      emit: (n) => this.emit(n),
      breakTile: (tx, ty) => this.breakTile(tx, ty),
      bumpTile: (tx, ty) => { this.level.bounceTile(tx, ty); this.emit('bump'); },
    };
  }

  emit(name) { this.events.push(name); }

  // スプライトがブロックを叩いた（見た目だけ跳ねる）
  hitTile(tx, ty) { this.level.bounceTile(tx, ty); }

  // スピンジャンプでターンブロックが壊れる
  breakTile(tx, ty) {
    if (!this.level.breakTurn(tx, ty)) return;
    this.addPieces(tx * 16, ty * 16, 'gold');
    this.emit('break');
  }

  // SpawnBrickPieces (028663)
  addPieces(x, y, pal) {
    for (let i = 0; i < 4; i++) {
      this.effects.push({
        kind: 'piece', pal, slot: i,
        x: x + BRICK_X[i], y: y + BRICK_Y[i], xs: BRICK_XSPEED[i], ys: BRICK_YSPEED[i],
      });
    }
  }

  // 接触エフェクト（SpawnContactEffectFromAbove）
  star(x, y) { this.effects.push({ kind: 'star', x, y, t: 8 }); }

  onPlayerHurt() {
    this.emit('hurt');
    const p = this.player;
    if (p.carrying) {
      p.carrying.drop();
      p.carrying = null;
    }
  }

  step(pad) {
    this.frame = (this.frame + 1) & 0xff;
    const env = this.env;
    env.camX = this.camera.x;
    env.frame = this.frame;

    // SMW と同じく、カメラ → プレイヤー → スプライトの順
    this.camera.update(this.player);
    env.camX = this.camera.x;
    this.player.update(pad, env);

    for (const s of this.player.smokeRequests) this.effects.push({ kind: 'smoke', x: s.x, y: s.y, t: 19 });
    this.player.smokeRequests.length = 0;

    this.updateSpawns();
    for (const a of this.actors) a.update(this);
    this.actors = this.actors.filter((a) => !a.dead);

    this.updateEffects();
    this.level.update();
  }

  // 画面の端に近づいたらスプライトを出す。遠ざかるまでは再出現しない
  updateSpawns() {
    const cx = this.camera.x;
    for (const p of this.points) {
      const near = p.x > cx - 32 && p.x < cx + SCREEN_W + 32;
      const far = p.x < cx - 160 || p.x > cx + SCREEN_W + 160;
      if (p.state === 'live' && p.actor.dead) {
        p.state = 'used';
        p.actor = null;
      }
      if (p.state === 'used' && far) p.state = 'idle';
      if (p.state === 'idle' && near) {
        const make = { gift: GiftBox, shell: Shell, spiker: Spiker }[p.type];
        const a = new make(p.x, p.y);
        if (a.type === 'spiker') a.facing = this.player.xpos > p.x ? 1 : 0;
        this.actors.push(a);
        p.actor = a;
        p.state = 'live';
      }
    }
  }

  updateEffects() {
    const cx = this.camera.x;
    for (const e of this.effects) {
      if (e.kind === 'piece') {
        // MExtSpr01_BrickPiece (028F8B)
        if (this.frame & 3) e.x += e.xs;
        e.y += e.ys;
        if (!(this.frame & 3)) e.ys++;
        if (e.y > LEVEL_H + 16 || e.x < cx - 16 || e.x > cx + SCREEN_W + 16) e.t = 0;
        else e.t = 1;
      } else {
        e.t--;
      }
    }
    this.effects = this.effects.filter((e) => e.t > 0);
  }
}
