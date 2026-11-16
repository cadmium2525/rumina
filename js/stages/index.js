// ステージの並び。クリアすると次へ進む（最後の次は最初に戻る）。
// hidden はボス扉からしか入らないステージ（クリアすると、その次のステージへ）
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

export const STAGES = [
  { id: '1-1', make: makeAkihabara },
  { id: '1-2', make: () => STAGE_1_2 },
  { id: '1-3', make: () => STAGE_1_3 },
  { id: '1-4', make: () => STAGE_1_4 },
  { id: '1-5', make: () => STAGE_1_5 },
  { id: '1-5B', make: () => STAGE_1_5B, hidden: true },
  { id: '2-1', make: () => STAGE_2_1 },
  { id: '2-2', make: () => STAGE_2_2 },
  { id: '2-3', make: () => STAGE_2_3 },
  { id: '2-4', make: () => STAGE_2_4 },
  { id: '2-5', make: () => STAGE_2_5 },
  { id: '2-5B', make: () => STAGE_2_5B, hidden: true },
];
