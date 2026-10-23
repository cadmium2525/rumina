"""ルミナの正面ドット絵からアプリアイコンを生成する。
使い方: python3 tools/make_icons.py
"""
import pathlib
from PIL import Image, ImageDraw

root = pathlib.Path(__file__).resolve().parent.parent
PAL = {'K': '#24141c', 'H': '#f6d480', 'L': '#fff4c4', 'h': '#d6a050', 'd': '#a06830',
       'S': '#fce0c4', 's': '#eeb088', 'P': '#f08c8c', 'E': '#4068c4', 'e': '#1c2868', 'i': '#ffffff',
       'W': '#faf8ec', 'w': '#c8c4dc', 'v': '#9090b0', 'B': '#4470d0', 'b': '#284898',
       'O': '#96522e', 'o': '#5c2c18'}


def load_frames(path):
    frames, name, mirror = {}, None, False
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith('#'):
            parts = line[1:].split()
            name, mirror = parts[0], '!mirror' in parts
            frames[name] = []
            continue
        frames[name].append(line + line[::-1] if mirror else line)
    return frames


def sprite(rows):
    im = Image.new('RGBA', (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in PAL:
                im.putpixel((x, y), Image.new('RGB', (1, 1), PAL[c]).getpixel((0, 0)) + (255,))
    return im


def icon(size, maskable):
    fr = load_frames(root / 'tools' / 'rumina_frames.txt')
    head = sprite(fr['front']).crop((0, 0, 24, 20))  # 顔まわり
    bg = Image.new('RGBA', (size, size), (92, 148, 252, 255))
    d = ImageDraw.Draw(bg)
    # 地面
    d.rectangle([0, int(size * 0.78), size, size], fill=(88, 192, 72, 255))
    if not maskable:
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 6, fill=255)
        bg.putalpha(mask)
    area = size * (0.62 if maskable else 0.8)
    scale = max(1, int(area // 24))
    h = head.resize((24 * scale, 20 * scale), Image.NEAREST)
    bg.alpha_composite(h, ((size - h.width) // 2, int(size * 0.84) - h.height))
    return bg


out = root / 'icons'
out.mkdir(exist_ok=True)
icon(192, False).save(out / 'icon-192.png')
icon(512, False).save(out / 'icon-512.png')
icon(512, True).save(out / 'icon-maskable-512.png')
icon(180, True).convert('RGB').save(out / 'icon-180.png')
print('icons written')
