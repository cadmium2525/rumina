// ステージの一覧。地図（js/overworld/maps.js）の点は、ここの id でステージを指す。
// hidden は扉からしか入らないステージ（ボス部屋や、コースの中の隠し部屋）。credit はクリアした時に
// 「クリア」になる地図の点（ボス部屋をクリアするとお城、隠し部屋のひみつのゴールなら元のコースの「*」）。
// ?level=1-2 のように直接遊ぶ時は、クリアすると次のステージへ進む（最後の次は最初に戻る）。
import { makeAkihabara } from './akihabara.js';
import { STAGE_1_2 } from './stage1_2.js';
import { STAGE_1_3 } from './stage1_3.js';
import { STAGE_1_4 } from './stage1_4.js';
import { STAGE_1_5 } from './stage1_5.js';
import { STAGE_1_5B } from './stage1_5b.js';
import { STAGE_2_1 } from './stage2_1.js';
import { STAGE_2_2 } from './stage2_2.js';
import { STAGE_2_3 } from './stage2_3.js';
import { STAGE_2_4 } from './stage2_4.js';
import { STAGE_2_5 } from './stage2_5.js';
import { STAGE_2_5B } from './stage2_5b.js';
import { STAGE_3_1 } from './stage3_1.js';
import { STAGE_3_2 } from './stage3_2.js';
import { STAGE_3_3 } from './stage3_3.js';
import { STAGE_3_4 } from './stage3_4.js';
import { STAGE_3_5 } from './stage3_5.js';
import { STAGE_3_5B } from './stage3_5b.js';
import { STAGE_1_S } from './stage1_s.js';
import { STAGE_2_S } from './stage2_s.js';
import { STAGE_3_S } from './stage3_s.js';
import { STAGE_4_1 } from './stage4_1.js';
import { STAGE_4_2 } from './stage4_2.js';
import { STAGE_4_3 } from './stage4_3.js';
import { STAGE_4_4 } from './stage4_4.js';
import { STAGE_4_5 } from './stage4_5.js';
import { STAGE_4_5B } from './stage4_5b.js';
import { STAGE_4_S } from './stage4_s.js';
import { STAGE_5_1 } from './stage5_1.js';
import { STAGE_5_2 } from './stage5_2.js';
import { STAGE_5_2B } from './stage5_2b.js';
import { STAGE_5_3 } from './stage5_3.js';
import { STAGE_5_4 } from './stage5_4.js';
import { STAGE_5_5 } from './stage5_5.js';
import { STAGE_5_5B } from './stage5_5b.js';
import { STAGE_5_S } from './stage5_s.js';
import { STAGE_6_1 } from './stage6_1.js';
import { STAGE_6_2 } from './stage6_2.js';
import { STAGE_6_3 } from './stage6_3.js';
import { STAGE_6_4 } from './stage6_4.js';
import { STAGE_6_5 } from './stage6_5.js';
import { STAGE_6_5B } from './stage6_5b.js';
import { STAGE_6_S } from './stage6_s.js';
import { STAGE_7_1 } from './stage7_1.js';
import { STAGE_7_2 } from './stage7_2.js';
import { STAGE_7_3 } from './stage7_3.js';
import { STAGE_7_4 } from './stage7_4.js';
import { STAGE_7_5 } from './stage7_5.js';
import { STAGE_7_5B } from './stage7_5b.js';
import { STAGE_7_S } from './stage7_s.js';
import { STAGE_8_1 } from './stage8_1.js';
import { STAGE_8_2 } from './stage8_2.js';
import { STAGE_8_3 } from './stage8_3.js';
import { STAGE_8_4 } from './stage8_4.js';
import { STAGE_8_5 } from './stage8_5.js';
import { STAGE_8_5B } from './stage8_5b.js';
import { STAGE_8_S } from './stage8_s.js';

export const STAGES = [
  { id: '1-1', make: makeAkihabara },
  { id: '1-2', make: () => STAGE_1_2 },
  { id: '1-3', make: () => STAGE_1_3 },
  { id: '1-4', make: () => STAGE_1_4 },
  { id: '1-5', make: () => STAGE_1_5 },
  { id: '1-5B', make: () => STAGE_1_5B, hidden: true, credit: '1-5' },
  { id: '1-S', make: () => STAGE_1_S }, // 隠しコース（地図の H）
  { id: '2-1', make: () => STAGE_2_1 },
  { id: '2-2', make: () => STAGE_2_2 },
  { id: '2-3', make: () => STAGE_2_3 },
  { id: '2-4', make: () => STAGE_2_4 },
  { id: '2-5', make: () => STAGE_2_5 },
  { id: '2-5B', make: () => STAGE_2_5B, hidden: true, credit: '2-5' },
  { id: '2-S', make: () => STAGE_2_S }, // 隠しコース（地図の H）
  { id: '3-1', make: () => STAGE_3_1 },
  { id: '3-2', make: () => STAGE_3_2 },
  { id: '3-3', make: () => STAGE_3_3 },
  { id: '3-4', make: () => STAGE_3_4 },
  { id: '3-5', make: () => STAGE_3_5 },
  { id: '3-5B', make: () => STAGE_3_5B, hidden: true, credit: '3-5' },
  { id: '3-S', make: () => STAGE_3_S }, // 隠しコース（地図の H）
  { id: '4-1', make: () => STAGE_4_1 },
  { id: '4-2', make: () => STAGE_4_2 },
  { id: '4-3', make: () => STAGE_4_3 },
  { id: '4-4', make: () => STAGE_4_4 },
  { id: '4-5', make: () => STAGE_4_5 },
  { id: '4-5B', make: () => STAGE_4_5B, hidden: true, credit: '4-5' },
  { id: '4-S', make: () => STAGE_4_S }, // 隠しコース（地図の H）
  { id: '5-1', make: () => STAGE_5_1 },
  { id: '5-2', make: () => STAGE_5_2 },
  { id: '5-2B', make: () => STAGE_5_2B, hidden: true, credit: '5-2' }, // 5-2 の穴の底の扉の先（ひみつのゴール）
  { id: '5-3', make: () => STAGE_5_3 },
  { id: '5-4', make: () => STAGE_5_4 },
  { id: '5-5', make: () => STAGE_5_5 },
  { id: '5-5B', make: () => STAGE_5_5B, hidden: true, credit: '5-5' },
  { id: '5-S', make: () => STAGE_5_S }, // 隠しコース（地図の H）
  { id: '6-1', make: () => STAGE_6_1 },
  { id: '6-2', make: () => STAGE_6_2 }, // 屋上にひみつのゴール
  { id: '6-3', make: () => STAGE_6_3 },
  { id: '6-4', make: () => STAGE_6_4 },
  { id: '6-5', make: () => STAGE_6_5 },
  { id: '6-5B', make: () => STAGE_6_5B, hidden: true, credit: '6-5' },
  { id: '6-S', make: () => STAGE_6_S }, // 隠しコース（地図の H）
  { id: '7-1', make: () => STAGE_7_1 }, // 台地の下の洞窟にひみつのゴール
  { id: '7-2', make: () => STAGE_7_2 }, // 強制スクロール（遅い）
  { id: '7-3', make: () => STAGE_7_3 },
  { id: '7-4', make: () => STAGE_7_4 }, // 強制スクロール（速い）
  { id: '7-5', make: () => STAGE_7_5 },
  { id: '7-5B', make: () => STAGE_7_5B, hidden: true, credit: '7-5' },
  { id: '7-S', make: () => STAGE_7_S }, // 隠しコース（地図の H）。強制スクロール（速い）
  { id: '8-1', make: () => STAGE_8_1 },
  { id: '8-2', make: () => STAGE_8_2 }, // 暗やみ。上の道にひみつのゴール
  { id: '8-3', make: () => STAGE_8_3 },
  { id: '8-4', make: () => STAGE_8_4 }, // 暗やみ・強制スクロール（遅い）
  { id: '8-5', make: () => STAGE_8_5 }, // 暗やみ
  { id: '8-5B', make: () => STAGE_8_5B, hidden: true, credit: '8-5', ending: true }, // 最後のボス
  { id: '8-S', make: () => STAGE_8_S }, // 隠しコース（地図の H）。強制スクロール（速い）
];
