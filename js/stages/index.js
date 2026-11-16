// ステージの並び。クリアすると次へ進む（最後の次は最初に戻る）
import { makeAkihabara } from './akihabara.js';
import { STAGE_1_2 } from './stage1_2.js';
import { STAGE_1_3 } from './stage1_3.js';

export const STAGES = [
  { id: '1-1', make: makeAkihabara },
  { id: '1-2', make: () => STAGE_1_2 },
  { id: '1-3', make: () => STAGE_1_3 },
];
