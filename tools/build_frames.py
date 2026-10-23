"""tools/rumina_frames.txt を js/rumina_frames.js に変換する。
使い方: python3 tools/build_frames.py
"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'tools' / 'rumina_frames.txt').read_text()
js = ("// ルミナのドット絵データ（tools/rumina_frames.txt から生成）\n"
      "// 1フレーム = 24x32。'!mirror' 付きは左半分12列を左右反転して24列にする。\n"
      "export const RUMINA_FRAMES_TEXT = `\n" + src + "`;\n")
(root / 'js' / 'rumina_frames.js').write_text(js)
print('wrote js/rumina_frames.js')
