// 触覚フィードバック。画面ボタンには押した感触がないので、振動で補う。
// Android: Vibration API / iOS(Safari 17.4+): スイッチ型チェックボックスのタップ感を利用する。
// どちらも使えない端末では何もしない。
const KEY = 'rumina.haptics';
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== '0'; } catch { /* 保存できなくても動く */ }

let label = null;
function ensureSwitch() {
  if (label) return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none;';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

// kind: 'light'（ボタンを押した） / 'medium'（ブロックが壊れた・敵で跳ねた） / 'heavy'（ダメージ）
export function haptic(kind = 'light') {
  if (!enabled) return;
  try {
    if (canVibrate) {
      navigator.vibrate(kind === 'heavy' ? 40 : kind === 'medium' ? 20 : 8);
    } else {
      const l = ensureSwitch();
      l.click();
      if (kind === 'heavy') setTimeout(() => l.click(), 60);
    }
  } catch { /* 非対応 */ }
}

export function isHapticsOn() { return enabled; }

export function setHaptics(v) {
  enabled = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* 保存できなくても動く */ }
}
