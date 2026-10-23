# ルミナ

スーパーマリオワールド（[snesrev/smw](https://github.com/snesrev/smw) の逆アセンブル C ソース）の
プレイヤー処理を移植した、ルミナが主人公のアクションゲームです。

現在は「平坦な地面でルミナの操作感を確認する」段階です。

## 起動

ビルド不要です。静的ファイルとして配信してください。

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

スマホからは同じネットワーク内で `http://<PCのIP>:8000/` を開きます。
（Service Worker / PWA インストールには HTTPS か localhost が必要です）

## 操作

| 操作 | キーボード | タッチ / ゲームパッド |
| --- | --- | --- |
| 移動 | ← → / A D | 十字キー |
| ジャンプ（押し続けると高く跳ぶ） | X / K / Space | B |
| スピンジャンプ | C / L | A |
| ダッシュ | Z / J / Shift | Y（X） |
| しゃがむ / 上を見る | ↓ / ↑ | 十字キー |
| ポーズ | Enter | START |

- タッチでは Y と B の間を押すとダッシュとジャンプが同時に入ります。
- R キーでリセット、F2（または画面右上の i）でデバッグ表示。

## SMW から移植した挙動

`js/player.js` は SMW の `PlayerState00`（$00CC68）以降を、8bit/16bit 演算の
桁あふれも含めて再現しています。テーブルは `js/smw_tables.js`。

- 加速・減速・切り返し（ブレーキ加速）・最高速（歩き 20 / ダッシュ 36 / P スピード 48）
- 最高速付近での速度の振動（加速 0x180 と減速 0x100 が交互にかかる）
- P メーター（ダッシュ 35 以上で +2/フレーム、満タン 0x70）
- 速度で変わるジャンプ初速、B 押しっぱなし時の重力 3 / 離し時 6、落下速度上限
- スピンジャンプ、しゃがみ（しゃがみジャンプ含む）、上を見る
- 歩き/走りアニメーションの速度テーブル、ポーズ選択
- カメラの横スクロール（$00F6DB、進行方向へ 1px 先行）と画面端の押し戻し
- 60.0988 Hz 固定フレーム

テスト: `node tests/physics.test.mjs`

## ドット絵

`tools/rumina_frames.txt` が原本（24x32、1 文字 = 1 ドット）です。
編集後は `python3 tools/build_frames.py` で `js/rumina_frames.js` を再生成し、
`python3 tools/preview_frames.py tools/rumina_frames.txt preview.png` で一覧を確認できます。
アイコンは `python3 tools/make_icons.py` で再生成します。
