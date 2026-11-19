#!/usr/bin/env python3
"""グレイコインの絵を作る: python3 tools/build_graycoin.py

tools/assets/graycoin_face.png（いただいた男性キャラの絵の顔の部分）を小さくして、
銀色のコインの中に入れた絵を js/graycoin_art.js に書き出す（ほかのドット絵と同じ「文字の行＋パレット」の形）。
  GRAYCOIN       24x24（ステージに置くコイン）
  GRAYCOIN_SMALL 12x12（地図とタイトルのバッジ）
"""
import math
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'assets', 'graycoin_face.png')
OUT = os.path.join(ROOT, 'js', 'graycoin_art.js')

KEYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJLMNOPQRSTUVWXYZ'  # K は輪郭に使う


def face(size, colors):
    """顔を size x size に縮めて、colors 色に減らす（透明は None）"""
    src = Image.open(SRC).convert('RGBA')
    # 元の絵は 1 ドットが約 10px。いったん元のドットの大きさに戻してから縮める
    native = src.resize((35, 35), Image.NEAREST)
    small = native.resize((size, size), Image.LANCZOS)
    bg = Image.new('RGBA', small.size, (200, 204, 216, 255))
    bg.alpha_composite(small)
    q = bg.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT)
    pal = q.getpalette()[: colors * 3]
    px = q.load()
    rows = [[px[x, y] for x in range(size)] for y in range(size)]
    return rows, [tuple(pal[i * 3: i * 3 + 3]) for i in range(colors)]


def coin(size, inner, face_size, colors):
    rows, pal = face(face_size, colors)
    keys = {i: KEYS[i] for i in range(len(pal))}
    palette = {keys[i]: '#%02x%02x%02x' % c for i, c in enumerate(pal)}
    palette.update({'K': '#2e2e38', 'R': '#c8ccd8', 'L': '#ffffff', 'S': '#7a7e8c'})
    c = (size - 1) / 2
    off = (size - face_size) // 2
    grid = []
    for y in range(size):
        line = ''
        for x in range(size):
            d = math.hypot(x - c, y - c)
            if d > size / 2:
                line += '.'
            elif d > size / 2 - 1:
                line += 'K'  # 輪郭
            elif d > inner:
                # ふち：左上は明るく、右下は暗く
                t = (x - c) + (y - c)
                line += 'L' if t < -size * 0.35 else ('S' if t > size * 0.3 else 'R')
            elif d > inner - 0.8:
                line += 'S'  # ふちの内側の影
            else:
                fx, fy = x - off, y - off
                if 0 <= fx < face_size and 0 <= fy < face_size:
                    line += keys[rows[fy][fx]]
                else:
                    line += 'R'
        grid.append(line)
    return grid, palette


def js_grid(name, grid, pal_name, pal, comment):
    out = f'// {comment}\nexport const {pal_name} = {{ ' + ', '.join(f"{k}: '{v}'" for k, v in pal.items()) + ' };\n'
    out += f'export const {name} = [\n' + ''.join(f"  '{r}',\n" for r in grid) + '];\n'
    return out


big, pal_big = coin(24, 9.6, 18, 16)
# 12x12 では顔を縮めるとつぶれるので、灰色の髪・肌・ひげが分かる簡単な絵を手で描く
small = [
    '....KKKK....',
    '..KKLLRRKK..',
    '.KLRhhhhRRK.',
    '.KRhhwhhhhK.',
    'KLhsssssshRK',
    'KRsKsssKssSK',
    'KRsssssssSSK',
    'KRsbbsbbsSSK',
    '.KRbbbbbbSK.',
    '.KSRbbbbSSK.',
    '..KKSSSSKK..',
    '....KKKK....',
]
assert all(len(r) == 12 for r in small)
pal_small = {'K': '#2e2e38', 'L': '#ffffff', 'R': '#c8ccd8', 'S': '#7a7e8c', 'h': '#5a4e48', 'w': '#dcdcdc',
             's': '#e8b088', 'b': '#8a8a92'}
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// グレイコインの絵（tools/build_graycoin.py が tools/assets/graycoin_face.png から作る。手で直さない）\n')
    f.write(js_grid('GRAYCOIN', big, 'PAL_GRAYCOIN', pal_big, 'ステージに置くコイン（24x24）'))
    f.write(js_grid('GRAYCOIN_SMALL', small, 'PAL_GRAYCOIN_SMALL', pal_small, '地図とタイトルのバッジ（12x12）'))
print('wrote', OUT)
