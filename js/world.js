// ゲーム世界：レベル・プレイヤー・スプライト・エフェクトをまとめて 1 フレーム進める。
// DOM に依存しない（描画は main.js / *_view.js）。
import { Player } from './player.js';
import { Level, Camera, GROUND_Y, SCREEN_W, LEVEL_H, TILE, CAM_Y, NOTE_YACCEL, NOTE_LAUNCH } from './level.js';
import { GiftBox, Shell, Spiker, LightOrb, Goal, Capsule, Robo, Drone, Spark, Bullet, Boss, Boss2, Boss3, Boss4, Boss5, Boss6, Boss7, Ember } from './actors.js';
import { SHOOTER_TIME, SHOOTER_NEAR } from './smw_tables.js';
import { BRICK_X, BRICK_Y, BRICK_XSPEED, BRICK_YSPEED } from './smw_tables.js';

const INTRO_TIME = 100;

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
    // 砲台：砲台のタイル 1 つが 1 つの発射台 (shooter sprite)
    this.shooters = [];
    for (let ty = 0; ty < this.level.tiles.length / this.level.width; ty++) {
      for (let tx = 0; tx < this.level.width; tx++) {
        if (this.level.tileAt(tx, ty) === TILE.CANNON) this.shooters.push({ x: tx * 16, y: ty * 16, timer: 0 });
      }
    }
    this.goal = this.level.goal ? new Goal(this.level.goal.tx, this.level.goal.ty) : null;
    if (this.goal) this.actors.push(this.goal);
    const sg = this.level.secretGoal;
    this.secretGoal = sg ? new Goal(sg.tx, sg.ty, true) : null;
    if (this.secretGoal) this.actors.push(this.secretGoal);
    this.secretExit = false; // ひみつのゴールでクリアした
    this.cleared = false;
    this.doorEntered = false; // ボス扉に入った（main.js が行き先のステージへ切り替える）
    this.message = null;  // 表示中のメッセージ（その間ゲームは止まる）
    this.messageTimer = 0;
    // 始まる時にステージ名を出す（その間ゲームは止まる）
    this.introTimer = this.level.title ? INTRO_TIME : 0;
    this.env = {
      level: this.level,
      camX: 0,
      camY: this.camera.y,
      frame: 0,
      emit: (n) => this.emit(n),
      breakTile: (tx, ty) => this.breakTile(tx, ty),
      bumpTile: (tx, ty) => { this.hitTile(tx, ty); this.emit('bump'); },
      noteBlock: (tx, ty, dir) => this.level.noteHit(tx, ty, dir),
      autoScroll: this.level.autoScroll ? this.camera : null, // 強制スクロールの速さ（画面端でルミナを合わせる）
    };
  }

  emit(name) { this.events.push(name); }

  // ブロックを叩いた（下から頭で・横から甲羅で）。？ブロックなら中身が出る
  hitTile(tx, ty) {
    if (this.level.tileAt(tx, ty) === TILE.NOTE) {
      // 音符ブロック：下から叩くと上に跳ねる（ルミナの速さは変わらない）
      this.level.noteHit(tx, ty, 0);
      return;
    }
    if (this.level.tileAt(tx, ty) === TILE.MESSAGE) {
      // メッセージブロック：跳ねて文字が出る
      this.level.bounceTile(tx, ty);
      const text = this.level.messages.get(`${tx},${ty}`);
      if (text) {
        this.message = text;
        this.messageTimer = 0;
        this.emit('message');
      }
      return;
    }
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

  // ゴールした：画面の敵や持っている物は星になって消える（SMW ではコインになる）
  reachGoal(secret = false) {
    if (this.player.endTimer) return;
    this.secretExit = secret;
    this.player.goal();
    for (const a of this.actors) {
      if (a.type === 'goal') continue;
      this.star(a.x, a.y);
      a.dead = true;
    }
    this.player.carrying = null;
    for (const p of this.points) p.state = 'used';
    this.emit('goal');
  }

  // ダメージを受けた（縮む・ミス）。持っている物は落とす（SMW: 状態が 0 でなくなると status 9 になる）
  onPlayerHurt() {
    const p = this.player;
    if (p.carrying) {
      p.carrying.drop();
      p.carrying = null;
    }
  }

  step(pad) {
    if (this.doorEntered) return;
    if (this.introTimer) {
      this.introTimer--;
      return;
    }
    if (this.message) {
      // ボタンを押すと閉じる（出てすぐは閉じない）
      this.messageTimer++;
      const pressed = (pad.press1 & 0xc0) || (pad.press2 & 0x80);
      if (this.messageTimer > 20 && pressed) this.message = null;
      return;
    }
    this.frame = (this.frame + 1) & 0xff;
    const env = this.env;
    env.camX = this.camera.x;
    env.frame = this.frame;

    env.camY = this.camera.y;
    // 縮む・大きくなる・ミスの演出中はゲームが止まる (flag_sprites_locked)
    if (this.player.locked) {
      this.player.update(pad, env);
      // 止まっている間も 00C47E の終わりと ProcessNormalSprites は動くので、フラグは毎フレーム 0 に戻る
      this.player.noteFlag = 0;
      this.player.onSolidSprite = 0;
      return;
    }

    // SMW と同じく、カメラ → プレイヤー → スプライトの順
    if (this.level.autoScroll) this.camera.updateAuto(this.player, this.level.widthPx, this.level.autoScroll);
    else this.camera.update(this.player, this.level.widthPx);
    env.camX = this.camera.x;
    this.player.update(pad, env);
    this.player.noteFlag = 0; // GameMode14_InLevel_00C47E の終わり
    if (this.player.locked && this.player.carrying) this.onPlayerHurt();
    if (this.player.entering) {
      this.doorEntered = true;
      return;
    }

    for (const s of this.player.smokeRequests) this.effects.push({ kind: 'smoke', x: s.x, y: s.y, t: 19 });
    this.player.smokeRequests.length = 0;
    this.waterEffects();

    this.player.onSolidSprite = 0; // ProcessNormalSprites の始め
    this.updateSpawns();
    this.updateShooters();
    for (const a of this.actors) {
      a.update(this);
      // マグマに落ちたスプライトは消える
      // （ひのこは溶岩にひそむので消えない）
      if (a.type !== 'goal' && a.type !== 'ember' && a.state !== 'carried' && this.level.tileAtPx(a.x + 8, a.y + 12) === TILE.LAVA) a.dead = true;
    }
    this.actors = this.actors.filter((a) => !a.dead);

    this.updateNotes();
    this.updateEffects();
    this.level.update();
    if (this.player.cleared) this.cleared = true;
  }

  // 音符ブロックの跳ね (ProcessBounceAndSmokeSprites → BounceSpr01_TurnBlock)。
  // 上に乗った時 (向き 3)：8 フレームの間ブロックと一緒に沈んで戻り、その間ルミナはブロックの上に固定される。
  // 最後に上向きの速さ -96 で跳ね上げる（B を押していると重力が弱いので高く跳ぶ）
  updateNotes() {
    const p = this.player;
    for (const n of this.level.notes) {
      if (n.timer) n.timer--;
      if (!n.status) {
        n.status = 1;
        if (n.dir === 3) p.yspeed = 0; // kBounceSpr01_TurnBlock_DATA_0290D6[3] = 0
      }
      n.off += n.ys >> 4; // UpdateBounceSpritePosition_Y（速さは 16 の倍数なので端数は出ない）
      n.ys += NOTE_YACCEL[n.dir];
      if (n.dir === 3 && p.state === 0) {
        p.ypos = (n.ty * 16 + n.off - 32) & 0xffff;
        p.onSolidSprite = 1;
        p.noteFlag = 1;
        p.yspeed = 0;
      }
      if (!n.timer) {
        if (n.dir === 3) {
          p.yspeed = NOTE_LAUNCH & 0xff;
          p.ypos = (p.ypos - 2) & 0xffff;
          this.emit('note');
        }
        n.done = true;
      }
    }
    this.level.notes = this.level.notes.filter((n) => !n.done);
  }

  // ProcessShooterSprites (02B387) → ShooterSpr01_BulletBillShooter (02B466)。
  // タイマーは 2 フレームに 1 減り、0 になったら 96 に戻して、条件が合えば撃つ：
  // 砲台が画面の中（右端 16px は除く）にあり、ルミナが横に 17px 以上離れている
  updateShooters() {
    if (this.player.endTimer) return;
    const cx = this.camera.x;
    const cy = this.camera.y;
    for (const s of this.shooters) {
      if (s.timer && (this.frame & 1)) s.timer--;
      if (s.timer) continue;
      s.timer = SHOOTER_TIME;
      const sx = s.x - cx;
      const sy = s.y - cy;
      if (sx < 0 || sx >= 0xf0 || sy < 0 || sy >= 224) continue;
      const dx = this.player.xpos - s.x;
      if (Math.abs(dx) < SHOOTER_NEAR) continue;
      // 撃った時にルミナのいる側へ飛ぶ (Spr01C_BulletBill_Init)
      this.actors.push(new Bullet(s.x, s.y - 1, dx > 0 ? 1 : -1));
      this.effects.push({ kind: 'smoke', x: s.x + (dx > 0 ? 12 : -12), y: s.y - 4, t: 19 });
      this.emit('cannon');
    }
  }

  // 画面の端に近づいたらスプライトを出す。遠ざかるまでは再出現しない
  updateSpawns() {
    if (this.player.endTimer) return; // ゴールした後は出ない
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
        const make = { gift: GiftBox, shell: Shell, spiker: Spiker, capsule: Capsule, robo: Robo, drone: Drone, spark: Spark, boss: Boss, boss2: Boss2, boss3: Boss3, boss4: Boss4, boss5: Boss5, boss6: Boss6, boss7: Boss7, ember: Ember }[p.type];
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
