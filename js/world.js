// ゲーム世界：レベル・プレイヤー・スプライト・エフェクトをまとめて 1 フレーム進める。
// DOM に依存しない（描画は main.js / *_view.js）。
import { Player } from './player.js';
import { Level, Camera, GROUND_Y, SCREEN_W, LEVEL_H, TILE, CAM_Y } from './level.js';
import { GiftBox, Shell, Spiker, LightOrb } from './actors.js';
import { BRICK_X, BRICK_Y, BRICK_XSPEED, BRICK_YSPEED } from './smw_tables.js';

export class World {
  // levelData: エディタで作ったステージ（無ければ標準のテストステージ）
  constructor(levelData = null) {
    this.level = new Level(levelData);
    this.camera = new Camera();
    const st = this.level.start;
    this.player = new Player(st.tx * 16, (st.ty + 1) * 16 - 0x20);
    // スタート位置が画面の右寄りなら、最初からそこが見えるようにする
    this.camera.x = Math.max(0, Math.min(this.level.widthPx - SCREEN_W, this.player.xpos - 0x80));
    this.camera.y = Math.max(0, Math.min(CAM_Y, this.player.ypos - 0x70));
    this.player.powerUp = 0; // SMW と同じく小さい状態で始まる
    this.actors = [];
    this.effects = [];
    this.events = [];
    this.frame = 0;
    this.points = this.level.spawns.map((s) => ({ ...s, state: 'idle', actor: null }));
    this.env = {
      level: this.level,
      camX: 0,
      camY: this.camera.y,
      frame: 0,
      emit: (n) => this.emit(n),
      breakTile: (tx, ty) => this.breakTile(tx, ty),
      bumpTile: (tx, ty) => { this.hitTile(tx, ty); this.emit('bump'); },
    };
  }

  emit(name) { this.events.push(name); }

  // ブロックを叩いた（下から頭で・横から甲羅で）。？ブロックなら中身が出る
  hitTile(tx, ty) {
    const item = this.level.hitQuestion(tx, ty);
    if (item === 'light') {
      this.actors.push(new LightOrb(tx * 16, ty * 16));
      this.emit('sprout');
      return;
    }
    this.level.bounceTile(tx, ty);
  }

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

  // ダメージを受けた（縮む・ミス）。持っている物は落とす（SMW: 状態が 0 でなくなると status 9 になる）
  onPlayerHurt() {
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

    env.camY = this.camera.y;
    // 縮む・大きくなる・ミスの演出中はゲームが止まる (flag_sprites_locked)
    if (this.player.locked) {
      this.player.update(pad, env);
      return;
    }

    // SMW と同じく、カメラ → プレイヤー → スプライトの順
    this.camera.update(this.player, this.level.widthPx);
    env.camX = this.camera.x;
    this.player.update(pad, env);
    if (this.player.locked && this.player.carrying) this.onPlayerHurt();

    for (const s of this.player.smokeRequests) this.effects.push({ kind: 'smoke', x: s.x, y: s.y, t: 19 });
    this.player.smokeRequests.length = 0;
    this.waterEffects();

    this.updateSpawns();
    for (const a of this.actors) {
      a.update(this);
      // マグマに落ちたスプライトは消える
      if (a.state !== 'carried' && this.level.tileAtPx(a.x + 8, a.y + 12) === TILE.LAVA) a.dead = true;
    }
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

  // 水しぶきと息の泡（見た目だけ）
  waterEffects() {
    const p = this.player;
    if (this.events.includes('splash') && !this._splashed) {
      // 水面の高さを探す
      const lv = this.level;
      const cx = p.xpos + 8;
      let ty = Math.floor((p.ypos + 0x12) / 16);
      while (ty > 0 && lv.tileAt(Math.floor(cx / 16), ty - 1) === TILE.WATER) ty--;
      this.effects.push({ kind: 'splash', x: p.xpos, y: ty * 16 - 12, t: 16 });
    }
    this._splashed = this.events.includes('splash');
    if (p.swimming && (p.var8a & 2) && (this.frame & 63) === 0) {
      this.effects.push({ kind: 'bubble', x: p.xpos + (p.facing ? 11 : 2), y: p.ypos + (p.small ? 12 : 4), t: 1 });
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
      } else if (e.kind === 'bubble') {
        // 水面まで上がって消える
        e.y -= 1;
        if (this.frame & 1) e.x += (this.frame & 16) ? 1 : -1;
        e.t = this.level.tileAtPx(e.x + 2, e.y + 2) === TILE.WATER ? 1 : 0;
      } else {
        e.t--;
      }
    }
    this.effects = this.effects.filter((e) => e.t > 0);
  }
}
