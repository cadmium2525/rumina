import { World } from './world.js';
import { Level } from './level.js';
import { STAGES } from './stages/index.js';
import { RuminaSprite, SmokeSprites, ActorSprites } from './sprites.js';
import { LevelView } from './level_view.js';
import { Darkness } from './darkness.js';
import { SCREEN_W, SCREEN_H } from './level.js';
import { Input } from './input.js';
import { sfx, unlockAudio, getVolume, setVolume } from './sfx.js';
import { bgm, musicFor } from './bgm.js';
import { EndingScreen } from './ending.js';
import { haptic, isHapticsOn, setHaptics } from './haptics.js';
import { Overworld, loadSave, SAVE_KEY } from './overworld/overworld.js';
import { OverworldView } from './overworld/overworld_view.js';
import { TitleScreen } from './title.js';

const FRAME_MS = 1000 / 60.0988; // SNES (NTSC) のフレームレート

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
// 画面の中身は 256x224 だが、キャンバスはその RES 倍の大きさで描く（文字がぼやけないように。ドット絵はそのまま拡大）
let RES = 1;

const touchRoot = document.getElementById('touch');
const input = new Input(touchRoot);
const view = new LevelView();
const darkness = new Darkness();
const sprite = new RuminaSprite();
const smokeSprites = new SmokeSprites();
const actorSprites = new ActorSprites();
const debugEl = document.getElementById('debug');

// ふだんは地図（オーバーワールド）から始まる。
// ?level=1-2 のように書くと、地図を通さずにそのステージを直接遊ぶ（クリアすると次のステージへ）。
// ?level=custom ならエディタで作ったステージ（localStorage）、?level=test なら操作確認用のテストステージ
export const PLAY_KEY = 'rumina.play';
const DIRECT = new URLSearchParams(location.search).get('level');
function chooseLevel() {
  const which = DIRECT;
  if (which === 'custom') {
    try {
      const d = JSON.parse(localStorage.getItem(PLAY_KEY));
      if (d) return d;
    } catch { /* 壊れていたら 1-1 */ }
  }
  if (which === 'test') return new Level().toData();
  const i = STAGES.findIndex((s) => s.id === which);
  stageIndex = i >= 0 ? i : 0;
  return STAGES[stageIndex].make();
}
let stageIndex = -1; // STAGES の何番目か（custom・test は -1）
// 開発用の表示（リセット・振動・エディタ・ヘルプ・デバッグのボタン、P メーター）は、
// 直接遊ぶ時（?level=…、エディタのテストプレイ）か ?debug=1 の時だけ出す
const DEV = !!DIRECT || new URLSearchParams(location.search).has('debug');
let levelData = DIRECT ? chooseLevel() : null;
let world = DIRECT ? new World(levelData) : null;

// ---- 地図 ----
// 地図から入れるステージ（ふつうのステージと、地図の点から入る隠しステージ＝ルミナの家）
const PLAYABLE = STAGES.filter((s) => !s.hidden || s.onMap).map((s) => s.id);
const TITLES = Object.fromEntries(STAGES.filter((s) => !s.hidden).map((s) => [s.id, s.make().title || s.id]));
const owView = new OverworldView(sprite);
// グレイコインがあるステージ（記録の id：ボス部屋はお城、最終コースは LAST）
const coinIdOf = (st) => st.credit || st.id;
const COIN_IDS = new Set(STAGES.filter((s) => s.make().spawns?.some((p) => p.type === 'graycoin')).map(coinIdOf));
function makeOverworld() {
  const o = new Overworld(loadSave(), PLAYABLE);
  o.titles = TITLES;
  o.coinIds = COIN_IDS;
  return o;
}
let ow = DIRECT ? null : makeOverworld();

// ステージの曲（custom・test はテーマで決まる）
const levelMusic = () => musicFor(STAGES[stageIndex]?.id, levelData);
// 'title'（タイトル）・'map'（地図）・'level'（ステージ）
let mode = DIRECT ? 'level' : 'title';
const fromMap = !DIRECT;
const title = new TitleScreen(sprite, view);
let coinCarry = false; // このステージ（扉の先の部屋もふくめて）でグレイコインを取った

// 暗転して切り替える：暗くなりきった所で fn を呼び、また明るくする
const FADE = 18;
let trans = null;
function fadeTo(fn, { outOnly = false } = {}) {
  trans = { t: outOnly ? FADE : 0, fn };
}
function stepTrans() {
  trans.t++;
  if (trans.t === FADE && trans.fn) {
    trans.fn();
    trans.fn = null;
  }
  if (trans.t >= FADE * 2) trans = null;
}
const fadeAlpha = () => (trans ? (trans.t < FADE ? trans.t / FADE : 2 - trans.t / FADE) : 0);

function playStage(id) {
  stageIndex = STAGES.findIndex((s) => s.id === id);
  levelData = STAGES[stageIndex].make();
  coinCarry = false;
  newWorld();
  world.player.powerUp = ow ? ow.save.power : 0;
  clearTimer = 0;
  doorTimer = 0;
  paused = false;
  mode = 'level';
  syncMapBtn();
}

// ステージを作る。もう記録されているグレイコインはうすく描く
function newWorld() {
  world = new World(levelData);
  bgm.duck(false);
  bgm.play(levelMusic());
  const st = STAGES[stageIndex];
  if (world.grayCoin && ow && st && ow.hasCoin(coinIdOf(st))) world.grayCoin.ghost = true;
}

// エンディング（地図に戻る前に。記録はもう済んでいる）
const ending = new EndingScreen(sprite, view);
function startEnding(st, power) {
  mode = 'ending';
  ending.start(endingItems(st), power);
  bgm.jingle('ending', { delay: 0.3 });
  syncMapBtn();
}
// 流れる文字：タイトル・ステージのエンディングの文・ぼうけんの記録（クリアしたステージ、★はグレイコイン）・おわりのあいさつ
const WORLD_NAME = { E: 'エクストラ', HOME: 'ルミナの家', LAST: 'ひかりのみなもと' };
function endingItems(st) {
  const it = [{ text: 'ルミナ', kind: 'title' }, { text: 'ひかりの少女の だいぼうけん', kind: 'sub' }, { kind: 'gap', text: '' }];
  for (const line of st.ending) it.push({ text: line, kind: 'line' });
  it.push({ kind: 'gap', text: '' }, { text: '― ぼうけんの きろく ―', kind: 'head' });
  let curWorld = null;
  for (const s of STAGES) {
    const cleared = ow.isCleared(s.credit || s.id) || ow.isCleared(`${s.credit || s.id}*`);
    if (!cleared || s.id === 'HOME') continue;
    const d = s.make();
    const boss = d.spawns?.some((p) => /^boss/.test(p.type));
    if (s.hidden && !boss && !/^LAST-/.test(s.id)) continue; // 扉の先の小部屋などは書かない
    const w = s.id.split('-')[0];
    if (w !== curWorld) {
      curWorld = w;
      it.push({ text: WORLD_NAME[w] ?? `ワールド${w}`, kind: 'head' });
    }
    const coin = !s.hidden && COIN_IDS.has(coinIdOf(s)) && ow.hasCoin(coinIdOf(s)) ? ' ★' : '';
    it.push({ text: boss ? `${d.title} を たおした` : `${d.title || s.id}${coin}`, kind: 'line' });
  }
  const coins = (ow.save.coins ?? []).filter((id) => COIN_IDS.has(id)).length;
  const pr = ow.progress();
  it.push({ kind: 'gap', text: '' }, { text: '― きろく ―', kind: 'head' },
    { text: `クリア ${pr.done} / ${pr.total}`, kind: 'line' }, { text: `グレイコイン ${coins} / ${COIN_IDS.size}`, kind: 'line' },
    { kind: 'gap', text: '' }, { text: '― おんがく ―', kind: 'head' }, { text: '「かなでる」で つくりました', kind: 'line' },
    { kind: 'gap', text: '' }, { kind: 'gap', text: '' }, { text: 'あそんでくれて ありがとう！', kind: 'end' });
  return it;
}

function backToMap() {
  mode = 'map';
  paused = false;
  bgm.duck(false);
  bgm.play('map');
  syncMapBtn();
}

function toTitle() {
  mode = 'title';
  paused = false;
  bgm.duck(false);
  bgm.play('title');
  syncTitle();
  syncMapBtn();
}

// タイトルのメニュー（セーブがあるか・振動）
function syncTitle() {
  const s = ow ? ow.save : loadSave();
  title.setItems({ hasSave: s.cleared.length > 0 || s.map !== 'w1' || s.node !== 'S', haptics: isHapticsOn(), bgm: getVolume('bgm'), se: getVolume('se') });
}

// タイトルで選んだ
function titleAction(id) {
  if (!id) return;
  if (id === 'continue') {
    sfx.door();
    fadeTo(() => {
      ow = makeOverworld();
      backToMap();
    });
  } else if (id === 'new') {
    if (!confirm('進み具合（クリアしたステージとグレイコイン）をすべて消して、はじめから遊びますか？')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* 消せなくても続ける */ }
    sfx.door();
    fadeTo(() => {
      ow = makeOverworld();
      backToMap();
    });
  } else if (id === 'help') {
    document.getElementById('help').hidden = false;
  } else if (id === 'editor') {
    location.href = 'editor.html';
  } else if (id === 'haptic') {
    setHaptics(!isHapticsOn());
    syncHapBtn();
    haptic('medium');
    syncTitle();
  } else if (id === 'settings' || id === 'back') {
    // せってい（BGM・効果音の大きさ、振動）を開く・閉じる
    title.sub = id === 'settings' ? 'settings' : null;
    title.cursor = id === 'settings' ? 0 : title.items.findIndex((it) => it.id === 'settings');
    sfx.reveal();
    syncTitle();
    if (title.cursor < 0) title.cursor = 0;
  } else if (/^(bgm|se):/.test(id)) {
    // 音量を 1 つ上げ下げ（効果音は変えた大きさで鳴らしてみる）
    const [kind, d] = id.split(':');
    const v = getVolume(kind);
    setVolume(kind, d === 'cycle' ? (v >= 10 ? 0 : v + 1) : v + Number(d));
    if (kind === 'se') sfx.message();
    syncTitle();
  }
}
let paused = false;
let clearTimer = 0;
let doorTimer = 0;
const DOOR_TIME = 40;
// 次のステージ（ボス部屋など、扉からしか入らない所は飛ばす。最後の次は最初）
function nextStage(i) {
  do { i = (i + 1) % STAGES.length; } while (STAGES[i].hidden);
  return i;
}
const CLEAR_TIME = 240;
let showDebug = false;

// ゲーム内イベント → 効果音と触覚フィードバック
const HAPTIC_OF = {
  break: 'medium', shatter: 'medium', bounce: 'medium', shrink: 'heavy', die: 'heavy', grow: 'medium',
  goal: 'heavy', tape: 'medium', bossdown: 'heavy', door: 'medium', message: 'light', cannon: 'light', bump: 'light', grab: 'light', throw: 'light', kick: 'light', splash: 'light', note: 'light', shock: 'medium', rumble: 'light', fire: 'medium', graycoin: 'heavy',
};

const MAP_SOUND = { bump: 'bump', enter: 'door', warp: 'door', reveal: 'reveal' };

function step() {
  const pad = input.poll();
  if (trans) {
    stepTrans();
    return;
  }
  if (mode === 'title') {
    const help = document.getElementById('help');
    if (!help.hidden) {
      if ((pad.press1 & 0x80) || (pad.press2 & 0x80) || pad.startPressed) help.hidden = true;
      return;
    }
    const a = title.step(pad);
    if (title.moved) {
      sfx.reveal();
      title.moved = false;
    }
    titleAction(a);
    return;
  }
  if (mode === 'ending') {
    if (ending.step(pad) === 'exit') {
      sfx.door();
      fadeTo(backToMap);
    }
    return;
  }
  if (mode === 'map') {
    // START でタイトルへ
    if (pad.startPressed) {
      sfx.pause();
      fadeTo(toTitle);
      return;
    }
    const r = ow.step(pad);
    for (const ev of ow.events) {
      if (MAP_SOUND[ev] && sfx[MAP_SOUND[ev]]) sfx[MAP_SOUND[ev]]();
      if (ev === 'enter' || ev === 'warp') haptic('medium');
    }
    ow.events.length = 0;
    if (r && r.play) fadeTo(() => playStage(r.play));
    if (r && r.warp) fadeTo(() => ow.warpTo(r));
    return;
  }
  if (pad.startPressed) {
    paused = !paused;
    sfx.pause();
    bgm.duck(paused);
  }
  if (paused) return;
  world.step(pad);
  if (world.coinTaken) coinCarry = true;
  for (const ev of world.events) {
    if (ev === 'goal') bgm.jingle('clear'); // ゴール：曲を止めてコースクリアのジングル
    else if (sfx[ev]) sfx[ev]();
    if (ev === 'die') bgm.jingle('miss', { delay: 0.45 }); // ミス：やられた音のあとにジングル
    if (ev === 'bossdown') bgm.stop(0.8); // ボスを倒した：曲が消えて、消え終わったらジングル
    if (HAPTIC_OF[ev]) haptic(HAPTIC_OF[ev]);
  }
  world.events.length = 0;
  // ミスの演出が終わったら：地図から来た時は地図へ戻る（小さくなる）。直接遊んでいる時はやり直し
  if (world.player.dead) {
    if (fromMap) {
      ow.setPower(0);
      fadeTo(backToMap);
    } else {
      reset();
    }
    return;
  }
  // コースクリア：文字を出してしばらくしたらやり直し
  // ボス扉に入った：行き先のステージへ（無ければクリア扱い）。大きさは引き継ぐ
  if (world.doorEntered && !world.cleared && ++doorTimer > DOOR_TIME) {
    const i = STAGES.findIndex((s) => s.id === world.level.doorTo);
    const power = world.player.powerUp;
    if (i < 0) {
      // 行き先の無い扉（エディタで行き先を空にした）は、入るとコースクリア
      world.cleared = true;
      clearTimer = 1;
      bgm.jingle('clear');
      return;
    }
    stageIndex = i;
    levelData = STAGES[i].make();
    // 扉の先の部屋へ（取ったグレイコインはそのまま。クリアした時に記録する）
    const carry = coinCarry;
    reset();
    coinCarry = carry;
    world.player.powerUp = power;
  }
  if (world.cleared && ++clearTimer > CLEAR_TIME && fromMap) {
    // 地図へ戻って、クリアした点から道が開く（ボス部屋はお城のクリアになる）。
    // ひみつのゴールなら「1-3*」のように * を付けて記録し、隠し道が開く
    const st = STAGES[stageIndex];
    const exit = (st.credit || st.id) + (world.secretExit ? '*' : '');
    const power = world.player.powerUp;
    const coin = coinCarry && COIN_IDS.has(coinIdOf(st));
    fadeTo(() => {
      backToMap();
      if (coin) ow.markCoin(coinIdOf(st)); // グレイコインは取ってコースクリアした時に記録する
      ow.markCleared(exit, power);
      // エンディングのあるステージ（やみの大王・ほしのはて・最終コース）：記録してから、エンディングを見せて地図へ
      if (st.ending) startEnding(st, power);
    });
    return;
  }
  if (world.cleared && clearTimer > CLEAR_TIME) {
    // 次のステージへ（custom・test は同じステージをもう一度）
    const power = world.player.powerUp;
    if (stageIndex >= 0) {
      stageIndex = nextStage(stageIndex);
      levelData = STAGES[stageIndex].make();
    }
    reset();
    world.player.powerUp = power; // クリアした時の大きさは次のステージへ引き継ぐ
  }
}

function drawPMeter() {
  // P メーター（SMW には表示が無いが、操作感確認用に表示）
  const p = world.player;
  const blink = world.frame & 4;
  const n = Math.floor(p.pmeter / 16); // 0..7
  for (let i = 0; i < 7; i++) {
    const on = i < n;
    g.fillStyle = '#24141c';
    g.fillRect(8 + i * 7, 8, 6, 6);
    g.fillStyle = on ? (n >= 7 ? (blink ? '#ffffff' : '#ff5050') : '#ffd040') : '#5a5070';
    g.fillRect(9 + i * 7, 9, 4, 4);
  }
  g.fillStyle = '#24141c';
  g.fillRect(58, 7, 11, 8);
  g.fillStyle = n >= 7 ? (blink ? '#ffffff' : '#ff5050') : '#8a80a0';
  const P = ['111.', '1..1', '111.', '1...', '1...'];
  P.forEach((row, y) => [...row].forEach((c, x) => c === '1' && g.fillRect(61 + x, 8 + y, 1, 1)));
}

// ステージの始まり：黒い画面にステージ名
function drawIntro() {
  g.fillStyle = '#000';
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.save();
  g.globalAlpha = Math.min(1, world.introTimer / 20);
  g.font = 'bold 16px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = '#ffe070';
  g.fillText(world.level.title, SCREEN_W / 2, SCREEN_H / 2);
  g.restore();
}

// メッセージの枠（ゲームは止まっている）
function drawMessage(text) {
  const lines = text.split('\n');
  const lh = 13;
  const h = lines.length * lh + 16;
  const x = 24;
  const y = 40;
  const w = SCREEN_W - 48;
  g.fillStyle = '#1c1424';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#ff78c8';
  g.lineWidth = 2;
  g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = '#ffffff';
  g.font = '10px system-ui, sans-serif';
  g.textAlign = 'center';
  lines.forEach((ln, i) => g.fillText(ln, SCREEN_W / 2, y + 16 + i * lh));
  g.textAlign = 'left';
}

// 「コースクリア！」
function drawClear() {
  const t = Math.min(clearTimer, 30) / 30;
  g.save();
  g.globalAlpha = 0.35 * t;
  g.fillStyle = '#fff8d0';
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.globalAlpha = t;
  g.font = 'bold 20px system-ui, sans-serif';
  g.textAlign = 'center';
  g.lineWidth = 4;
  g.strokeStyle = '#24141c';
  g.strokeText('コースクリア！', SCREEN_W / 2, 80);
  g.fillStyle = '#ffe070';
  g.fillText('コースクリア！', SCREEN_W / 2, 80);
  const ending = STAGES[stageIndex]?.ending;
  if (ending) {
    // 最後のボスを倒した・ほしの道を走りきった：エンディングの文（最後の行は水色）
    g.font = 'bold 13px system-ui, sans-serif';
    g.lineWidth = 3;
    ending.forEach((text, i) => {
      const y = 112 + i * 20 + (i === ending.length - 1 ? 8 : 0);
      g.strokeText(text, SCREEN_W / 2, y);
      g.fillStyle = i === ending.length - 1 ? '#c8d8ff' : '#ffffff';
      g.fillText(text, SCREEN_W / 2, y);
    });
  }
  g.restore();
}

function render() {
  g.setTransform(RES, 0, 0, RES, 0, 0);
  g.imageSmoothingEnabled = false;
  if (mode === 'title') {
    const s = ow ? ow.save : loadSave();
    const coins = (s.coins ?? []).filter((id) => COIN_IDS.has(id)).length;
    const o = ow ?? makeOverworld();
    const pr = o.progress();
    title.draw(g, { coins, coinTotal: COIN_IDS.size, clears: pr.done, clearTotal: pr.total });
    const a = fadeAlpha();
    if (a) {
      g.fillStyle = `rgba(0,0,0,${a})`;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    return;
  }
  if (mode === 'ending') {
    ending.draw(g);
    const a = fadeAlpha();
    if (a) {
      g.fillStyle = `rgba(0,0,0,${a})`;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    return;
  }
  if (mode === 'map') {
    owView.draw(g, ow, ow.frame, ow.save.power, fadeAlpha());
    if (showDebug) debugEl.textContent = `map ${ow.mapId}  node ${ow.nodeKey}  ${ow.x},${ow.y}\ncleared ${ow.save.cleared.join(' ')}`;
    return;
  }
  renderLevel();
  const a = fadeAlpha();
  if (a) {
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}

function renderLevel() {
  const camX = Math.floor(world.camera.x);
  const camY = world.camera.y;
  const p = world.player;
  view.drawBackground(g, camX, camY, world.level.theme);
  // ブロックから出てくる途中の光の玉はブロックの後ろ
  for (const a of world.actors) {
    if ((a.type === 'light' || a.type === 'bullet') && a.emerge) actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  view.drawTiles(g, world.level, camX, camY, world.frame);

  for (const e of world.effects) {
    if (e.kind === 'smoke') smokeSprites.draw(g, e.t, e.x - camX, e.y - camY);
  }
  for (const a of world.actors) {
    if (a.state === 'carried') continue; // 手前に描く
    if ((a.type === 'light' || a.type === 'bullet') && a.emerge) continue;
    if (a.type === 'goal') {
      actorSprites.drawGoalBack(g, a, world.frame, camX, camY);
      continue;
    }
    actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  // ダメージ後の無敵中は点滅
  if (!(p.hurtTimer && (p.hurtTimer >> 1) & 1)) {
    sprite.draw(g, p.pose, p.facing, p.xpos - camX, p.ypos - camY, p.powerUp);
  }
  for (const a of world.actors) {
    if (a.state === 'carried') actorSprites.drawActor(g, a, world.frame, a.x - camX, a.y - camY);
  }
  if (world.goal) actorSprites.drawGoalFront(g, world.goal, world.frame, camX, camY);
  if (world.secretGoal) actorSprites.drawGoalFront(g, world.secretGoal, world.frame, camX, camY);
  for (const e of world.effects) {
    if (e.kind === 'piece') actorSprites.drawPiece(g, e, world.frame, e.x - camX, e.y - camY);
    else if (e.kind === 'star') actorSprites.drawStar(g, e, e.x - camX, e.y - camY);
    else if (e.kind === 'bubble') actorSprites.drawBubble(g, e.x - camX, e.y - camY);
    else if (e.kind === 'splash') actorSprites.drawSplash(g, e, e.x - camX, e.y - camY);
  }
  view.drawWater(g, world.level, camX, camY, world.frame);
  // 暗やみ：光る物のまわりだけ見える
  if (world.level.dark) darkness.draw(g, world, camX, camY, world.frame);

  if (DEV) drawPMeter(); // P メーターは開発用（SMW には無い表示）
  if (world.doorEntered) {
    // 扉に入る：暗くなる
    g.fillStyle = `rgba(0,0,0,${Math.min(1, doorTimer / 30)})`;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  if (world.message) drawMessage(world.message);
  if (world.introTimer) drawIntro();
  if (clearTimer) drawClear();
  if (paused) {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle = '#fff';
    g.font = 'bold 16px monospace';
    g.textAlign = 'center';
    g.fillText('PAUSE', SCREEN_W / 2, SCREEN_H / 2);
    // 操作のヒント
    g.font = 'bold 9px system-ui, sans-serif';
    g.fillStyle = '#ffe070';
    g.fillText('START で つづける', SCREEN_W / 2, SCREEN_H / 2 + 20);
    if (fromMap) g.fillText('「ちず」ボタン（M キー）で 地図へ もどる', SCREEN_W / 2, SCREEN_H / 2 + 33);
    g.textAlign = 'left';
  }
  if (showDebug) {
    const hex = (v) => v.toString(16).toUpperCase().padStart(2, '0');
    const s8 = (v) => ((v & 0xff) << 24) >> 24;
    debugEl.textContent =
      `X ${String(p.xpos).padStart(4)}  Y ${p.ypos}\n` +
      `Xspd ${hex(p.xspeed)} (${s8(p.xspeed)})  Yspd ${hex(p.yspeed)} (${s8(p.yspeed)})\n` +
      `P ${hex(p.pmeter)}  air ${hex(p.inAir)}  pose ${hex(p.pose)}\n` +
      `spin ${p.spin}  duck ${p.ducking ? 1 : 0}  hold ${p.carrying ? 1 : 0}  cam ${camX}\n` +
      `power ${p.powerUp}  state ${p.state}`;
  }
}

let acc = 0;
let last = performance.now();
function loop(now) {
  acc += Math.min(now - last, 100);
  last = now;
  let n = 0;
  while (acc >= FRAME_MS && n < 4) {
    step();
    acc -= FRAME_MS;
    n++;
  }
  if (n === 4) acc = 0;
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- 画面レイアウト ----
function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vh > vw;
  document.body.classList.toggle('portrait', portrait);
  let scale;
  if (portrait) {
    scale = vw / SCREEN_W;
    if (SCREEN_H * scale > vh * 0.6) scale = (vh * 0.6) / SCREEN_H;
  } else {
    scale = Math.min(vw / SCREEN_W, vh / SCREEN_H);
  }
  // 余裕があれば整数倍にしてドットを均一に
  if (scale >= 2 && Math.floor(scale) / scale > 0.9) scale = Math.floor(scale);
  canvas.style.width = `${Math.floor(SCREEN_W * scale)}px`;
  canvas.style.height = `${Math.floor(SCREEN_H * scale)}px`;
  // 表示の大きさに合わせて、キャンバスを 2〜3 倍の細かさで描く（文字をくっきりさせる）
  const res = Math.max(1, Math.min(3, Math.round(scale * (window.devicePixelRatio || 1))));
  if (res !== RES || canvas.width !== SCREEN_W * res) {
    RES = res;
    canvas.width = SCREEN_W * RES;
    canvas.height = SCREEN_H * RES;
    g.imageSmoothingEnabled = false;
  }
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 100));
layout();

// タッチ端末ならバーチャルパッドを表示
function enableTouchUI() {
  document.body.classList.add('touch');
}
if (window.matchMedia('(pointer: coarse)').matches) enableTouchUI();
window.addEventListener('touchstart', enableTouchUI, { once: true, passive: true });

// ---- 各種ボタン ----
const unlock = () => unlockAudio();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

function toggleDebug() {
  showDebug = !showDebug;
  debugEl.hidden = !showDebug;
}
function reset() {
  if (mode !== 'level') return;
  coinCarry = false;
  newWorld();
  if (fromMap) world.player.powerUp = ow.save.power;
  clearTimer = 0;
  doorTimer = 0;
  paused = false;
}

document.getElementById('btn-debug').addEventListener('click', toggleDebug);
document.getElementById('btn-reset').addEventListener('click', reset);
const hapBtn = document.getElementById('btn-haptic');
function syncHapBtn() {
  hapBtn.classList.toggle('off', !isHapticsOn());
  hapBtn.setAttribute('aria-pressed', String(isHapticsOn()));
}
hapBtn.addEventListener('click', () => {
  setHaptics(!isHapticsOn());
  syncHapBtn();
  haptic('medium');
});
syncHapBtn();

window.addEventListener('keydown', (e) => {
  if (!DEV) return; // デバッグ表示とリセットは開発用
  if (e.code === 'F2' || e.code === 'Backquote') toggleDebug();
  if (e.code === 'KeyR') reset();
});
document.getElementById('btn-full').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    }
  } catch { /* iOS Safari などは非対応 */ }
});
document.getElementById('btn-help').addEventListener('click', () => {
  document.getElementById('help').hidden = !document.getElementById('help').hidden;
});
document.getElementById('help').addEventListener('click', (e) => {
  e.currentTarget.hidden = true;
});

// ---- PWA ----
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// 地図へ戻る（ステージの途中でも。クリアにはならない）
const mapBtn = document.getElementById('btn-map');
function syncMapBtn() {
  mapBtn.hidden = !(fromMap && mode === 'level');
}
// 開発用のボタンは DEV の時だけ
for (const id of ['btn-reset', 'btn-haptic', 'btn-edit', 'btn-help', 'btn-debug']) document.getElementById(id).hidden = !DEV;
// タイトルのメニューをタップ
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'title' || trans || !document.getElementById('help').hidden) return;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * SCREEN_W;
  const y = ((e.clientY - r.top) / r.height) * SCREEN_H;
  titleAction(title.hit(x, y));
});
syncTitle();
// 起動した時の曲（音が出せるのは最初のタップ・キーの後）
if (DIRECT) bgm.play(levelMusic());
else bgm.play('title');
function exitToMap() {
  if (!fromMap || mode !== 'level' || trans) return;
  // ゴールした後（クリアの記録の前）・扉に入った後・ミスや大きさが変わる演出の間は戻れない
  const p = world.player;
  if (p.endTimer || world.cleared || world.doorEntered || p.state !== 0 || p.locked || p.dead) return;
  ow.setPower(p.powerUp);
  fadeTo(backToMap);
}
mapBtn.addEventListener('click', exitToMap);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') exitToMap();
});
syncMapBtn();
// セーブデータを消す（ヘルプの中のボタン）
document.getElementById('btn-save-reset').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!confirm('進み具合（クリアしたステージ）をすべて消して、最初からにしますか？')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* 消せなくても続ける */ }
  if (fromMap) {
    ow = makeOverworld();
    toTitle();
  }
  document.getElementById('help').hidden = true;
});

// デバッグ・自動テスト用
window.rumina = { get world() { return world; }, get ow() { return ow; }, get mode() { return mode; }, get title() { return title; }, get ending() { return ending; }, bgm, COIN_IDS };
