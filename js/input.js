// 入力（キーボード / ゲームパッド / タッチ）を SMW のコントローラビットに変換する
import { PAD, PAD2 } from './player.js';

const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  KeyX: 'b', KeyK: 'b', Space: 'b',
  KeyZ: 'y', KeyJ: 'y', ShiftLeft: 'y', ShiftRight: 'y',
  KeyC: 'a', KeyL: 'a',
  KeyV: 'x',
  Enter: 'start', Escape: 'start',
};

export class Input {
  constructor(touchRoot) {
    this.keys = new Set();
    this.touch = new Set();
    this.prevHold1 = 0;
    this.prevHold2 = 0;
    this.state = { hold1: 0, press1: 0, hold2: 0, press2: 0, start: false };
    this.prevStart = false;
    this.listeners = [];

    window.addEventListener('keydown', (e) => {
      const b = KEYMAP[e.code];
      if (!b) return;
      e.preventDefault();
      this.keys.add(b);
    });
    window.addEventListener('keyup', (e) => {
      const b = KEYMAP[e.code];
      if (!b) return;
      e.preventDefault();
      this.keys.delete(b);
    });
    window.addEventListener('blur', () => this.keys.clear());

    if (touchRoot) this.setupTouch(touchRoot);
  }

  // ---- タッチ ----
  setupTouch(root) {
    this.touchRoot = root;
    this.dpad = root.querySelector('[data-dpad]');
    this.btnEls = [...root.querySelectorAll('[data-btn]')];
    this.pointers = new Map(); // pointerId -> {x, y, zone}

    const zoneOf = (x, y) => {
      const r = this.dpad.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.hypot(x - cx, y - cy) < r.width * 0.75) return 'dpad';
      for (const el of this.btnEls) {
        const b = el.getBoundingClientRect();
        const bx = b.left + b.width / 2;
        const by = b.top + b.height / 2;
        if (Math.hypot(x - bx, y - by) < b.width * 0.9) return 'buttons';
      }
      return null;
    };

    root.addEventListener('pointerdown', (e) => {
      const zone = zoneOf(e.clientX, e.clientY);
      if (!zone) return;
      e.preventDefault();
      try { root.setPointerCapture(e.pointerId); } catch { /* 古いブラウザ */ }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, zone });
      this.recalcTouch();
    });
    root.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      e.preventDefault();
      p.x = e.clientX;
      p.y = e.clientY;
      this.recalcTouch();
    });
    const end = (e) => {
      if (this.pointers.delete(e.pointerId)) this.recalcTouch();
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  recalcTouch() {
    const t = new Set();
    for (const p of this.pointers.values()) {
      if (p.zone === 'dpad') this.dpadDirs(p.x, p.y, t);
      else this.buttonsAt(p.x, p.y, t);
    }
    this.touch = t;
    this.dpad.dataset.dir = ['left', 'right', 'up', 'down'].filter((d) => t.has(d)).join(' ');
    for (const el of this.btnEls) el.classList.toggle('on', t.has(el.dataset.btn));
  }

  dpadDirs(x, y, out) {
    const r = this.dpad.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2);
    const dy = y - (r.top + r.height / 2);
    const rad = r.width / 2;
    if (Math.hypot(dx, dy) < rad * 0.18) return;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    // 横方向を広めに取り、走行中にうっかり「下」が入らないようにする
    const horiz = ay < ax * Math.tan((30 * Math.PI) / 180);
    const vert = ax < ay * Math.tan((22.5 * Math.PI) / 180);
    if (!vert) out.add(dx < 0 ? 'left' : 'right');
    if (!horiz) out.add(dy < 0 ? 'up' : 'down');
  }

  buttonsAt(x, y, out) {
    // ボタンの判定円は少し大きめ。B と Y の間を押すと両方入る
    for (const el of this.btnEls) {
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      if (Math.hypot(x - bx, y - by) < b.width * 0.72) out.add(el.dataset.btn);
    }
  }

  // ---- ゲームパッド ----
  pollGamepad(set) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const pr = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      if (pr(0)) set.add('b');
      if (pr(1)) set.add('a');
      if (pr(2)) set.add('y');
      if (pr(3)) set.add('x');
      if (pr(9)) set.add('start');
      if (pr(12)) set.add('up');
      if (pr(13)) set.add('down');
      if (pr(14)) set.add('left');
      if (pr(15)) set.add('right');
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      if (ax < -0.5) set.add('left');
      if (ax > 0.5) set.add('right');
      if (ay < -0.6) set.add('up');
      if (ay > 0.6) set.add('down');
    }
  }

  // 1 フレームに 1 回呼ぶ
  poll() {
    const s = new Set([...this.keys, ...this.touch]);
    this.pollGamepad(s);
    let hold1 = 0;
    let hold2 = 0;
    if (s.has('right')) hold1 |= PAD.RIGHT;
    if (s.has('left')) hold1 |= PAD.LEFT;
    if (s.has('down')) hold1 |= PAD.DOWN;
    if (s.has('up')) hold1 |= PAD.UP;
    // SMW は $15 で A を B に、X を Y にまとめている
    if (s.has('b') || s.has('a')) hold1 |= PAD.B;
    if (s.has('y') || s.has('x')) hold1 |= PAD.Y;
    if (s.has('a')) hold2 |= PAD2.A;
    if (s.has('x')) hold2 |= PAD2.X;
    // 左右同時押しは SMW 同様そのまま渡す（SNES 実機では起こりにくい）
    const st = this.state;
    st.press1 = hold1 & ~this.prevHold1;
    st.press2 = hold2 & ~this.prevHold2;
    st.hold1 = hold1;
    st.hold2 = hold2;
    const start = s.has('start');
    st.startPressed = start && !this.prevStart;
    this.prevStart = start;
    this.prevHold1 = hold1;
    this.prevHold2 = hold2;
    st.any = s.size > 0;
    return st;
  }
}
