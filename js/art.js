// ブロック・アイテム・敵・エフェクトのドット絵（1文字 = 1ドット、'.' は透明）

export const PAL_OBJ = {
  K: '#24141c',
  // ターンブロック（金）
  y: '#fff0a0', Y: '#f4c040', o: '#c08020', d: '#8a5a18',
  // 石ブロック
  s: '#d8d6ec', S: '#9a98bc', z: '#6a688e',
  // ギフトボックス
  W: '#faf8ec', v: '#c8c4dc', B: '#4470d0', b: '#284898',
  // トゲムシ
  P: '#5a2c8c', p: '#8a54c0', q: '#b488e0', L: '#fff0c8', l: '#d8b878', E: '#ffe060', R: '#c02848',
  // 甲羅
  T: '#3cb4a0', t: '#1f7468', u: '#9ae6d4',
  // ？ブロック・キノコ
  Q: '#f8a830', n: '#7a4a20', N: '#b07838', r: '#f05050', m: '#a82838',
  // 光の玉
  i: '#fffce8', J: '#ffe880', j: '#f0c050', O: '#d88a28',
};

export const TURN = [
  'KKKKKKKKKKKKKKKK',
  'KyyyyyyyyyyyyyoK',
  'KyYYYYYYYYYYYYoK',
  'KyYooooooooooYoK',
  'KyYoYYYYYYYYoYoK',
  'KyYoYYYyyYYYoYoK',
  'KyYoYYyWWyYYoYoK',
  'KyYoYYyWWyYYoYoK',
  'KyYoYYYyyYYYoYoK',
  'KyYoYYYYYYYYoYoK',
  'KyYoYYYYYYYYoYoK',
  'KyYooooooooooYoK',
  'KyYYYYYYYYYYYYoK',
  'KyYYYYYYYYYYYYoK',
  'KooooooooooooooK',
  'KKKKKKKKKKKKKKKK',
];

export const STONE = [
  'KKKKKKKKKKKKKKKK',
  'KsssssssssssssdK',
  'KsSSSSSSSSSSSSzK',
  'KsSSSSSSSSSSSSzK',
  'KsSSzSSSSSSSSSzK',
  'KsSSSSSSSSSzSSzK',
  'KsSSSSSSSSSSSSzK',
  'KsSSSSSSSSSSSSzK',
  'KsSSSSSSSSSSSSzK',
  'KsSSSSzSSSSSSSzK',
  'KsSSSSSSSSSSSSzK',
  'KsSSSSSSSSSSSSzK',
  'KsSzSSSSSSSSSSzK',
  'KsSSSSSSSSSzSSzK',
  'KzzzzzzzzzzzzzzK',
  'KKKKKKKKKKKKKKKK',
];

export const GIFT = [
  '....KKK..KKK....',
  '...KBBbKKbBBK...',
  '...KBBBbbBBBK...',
  '....KKBBBBKK....',
  'KKKKKKKBBKKKKKKK',
  'KWWWWWWBBWWWWWWK',
  'KWWWWWWBBWWWWWvK',
  'KKKKKKKBBKKKKKKK',
  '.KWWWWWBBWWWWWK.',
  '.KBBBBBBBBBBBBK.',
  '.KBBBBBBBBBBBBK.',
  '.KWWWWWBBWWWWvK.',
  '.KWWWWWBBWWWWvK.',
  '.KWWWWWBBWWWvvK.',
  '.KvvvvvBBvvvvvK.',
  '..KKKKKKKKKKKK..',
];

// トゲムシ（右向き）2コマ
export const SPIKER_A = [
  '.......K..K.....',
  '......KLK.KLK...',
  '..K..KLlKKLlK.K.',
  '.KLK.KLlPPLlK.KL',
  '.KLlKKPPPPKKKLlK',
  '..KLKPPqpPPPKLK.',
  '..KPPPqppPPPPK..',
  '.KPPPqppppPPKKK.',
  '.KPPqppppppPKEEK',
  '.KPPppppppppKEKK',
  '.KPPppppppppKKRK',
  '..KPPpppppppKKK.',
  '..KPPPppppppPK..',
  '...KKPPPPPPKK...',
  '...KPPK..KPPK...',
  '..KKKK....KKKK..',
];
export const SPIKER_B = [
  '.......K..K.....',
  '......KLK.KLK...',
  '..K..KLlKKLlK.K.',
  '.KLK.KLlPPLlK.KL',
  '.KLlKKPPPPKKKLlK',
  '..KLKPPqpPPPKLK.',
  '..KPPPqppPPPPK..',
  '.KPPPqppppPPKKK.',
  '.KPPqppppppPKEEK',
  '.KPPppppppppKEKK',
  '.KPPppppppppKKRK',
  '..KPPpppppppKKK.',
  '..KPPPppppppPK..',
  '...KKPPPPPPKK...',
  '....KPPKKPPK....',
  '....KKKK.KKKK...',
];

// ブロックのかけら（8x8）
export const PIECE_GOLD = [
  '..KKKK..',
  '.KyyYoK.',
  'KyYYYYoK',
  'KYYYYYoK',
  'KYYYYoKK',
  '.KoooKK.',
  '..KKK...',
  '........',
];
export const PIECE_GIFT = [
  '..KKKK..',
  '.KWWBBK.',
  'KWWWBBWK',
  'KBBBBBBK',
  'KWWWBBvK',
  '.KvvBBK.',
  '..KKKK..',
  '........',
];

// 接触エフェクト（8x8、踏んだ・叩いたときの星）
export const STAR_A = [
  '...KK...',
  '...KK...',
  'K..KK..K',
  '.KKWWKK.',
  '.KKWWKK.',
  'K..KK..K',
  '...KK...',
  '...KK...',
];
export const STAR_B = [
  '........',
  '.K....K.',
  '..K..K..',
  '...KK...',
  '...KK...',
  '..K..K..',
  '.K....K.',
  '........',
];

// 甲羅（SMW のノコノコの甲羅相当）。蹴られている間は 4 コマで回る
export const SHELL_SIDE = [
  '................',
  '................',
  '.....KKKKKK.....',
  '...KKuuTTTTKK...',
  '..KuuTTtTTTTTK..',
  '.KuTTTtTTTtTTTK.',
  '.KuTTtTTTTTtTTK.',
  'KuTTTtTTTTTtTTTK',
  'KTTTtTTTTTTTtTTK',
  'KTttTTTTTTTTTttK',
  'KtTTTTTTTTTTTTtK',
  'KKKKKKKKKKKKKKKK',
  'KLLLLLLLLLLLLLLK',
  'KlLLLLLLLLLLLLlK',
  '.KllllllllllllK.',
  '..KKKKKKKKKKKK..',
];
export const SHELL_FRONT = [
  '................',
  '................',
  '......KKKK......',
  '....KKuTTTKK....',
  '...KuTTtTTTtK...',
  '...KuTTtTTTtK...',
  '..KuTTTtTTTtTK..',
  '..KuTTTtTTTtTK..',
  '..KTTTTtTTTtTK..',
  '..KTtTTtTTTttK..',
  '..KttTTtTTTttK..',
  '..KKKKKKKKKKKK..',
  '..KLLLLLLLLLLK..',
  '..KlLLLLLLLLlK..',
  '...KllllllllK...',
  '....KKKKKKKK....',
];
export const SHELL_EDGE = [
  '................',
  '................',
  '.......KK.......',
  '......KuTK......',
  '.....KuTTtK.....',
  '.....KuTTtK.....',
  '.....KuTTtK.....',
  '.....KTTTtK.....',
  '.....KTTTtK.....',
  '.....KtTTtK.....',
  '.....KtTttK.....',
  '.....KKKKKK.....',
  '.....KLLLLK.....',
  '.....KlLLlK.....',
  '......KllK......',
  '.......KK.......',
];

export const QUESTION = [
  '.KKKKKKKKKKKKKK.',
  'KyyyyyyyyyyyyyyK',
  'KyYYYYYYYYYYYYoK',
  'KyYYYYKKKKYYYYoK',
  'KyYYYKWWWWKYYYoK',
  'KyYYKWWKKWWKYYoK',
  'KyYYKKKYKWWKYYoK',
  'KyYYYYYYKWWKYYoK',
  'KyYYYYYKWWKYYYoK',
  'KyYYYYYKWWKYYYoK',
  'KyYYYYYYKKYYYYoK',
  'KyYYYYYKWWKYYYoK',
  'KyYYYYYKWWKYYYoK',
  'KyYYYYYYKKYYYYoK',
  'KoooooooooooooooK',
  '.KKKKKKKKKKKKKK.',
].map((r) => r.slice(0, 16));

export const USED = [
  '.KKKKKKKKKKKKKK.',
  'KNNNNNNNNNNNNNNK',
  'KNnNNNNNNNNNNnnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNNNNNNNNNNNNNnK',
  'KNnNNNNNNNNNNnnK',
  'KnnnnnnnnnnnnnnK',
  '.KKKKKKKKKKKKKK.',
];

// 光の玉（パワーアップ）
export const LIGHT_ORB = [
  '................',
  '......OOOO......',
  '....OOjjjjOO....',
  '...OjjJJJJjjO...',
  '..OjJJJiiJJJjO..',
  '..OjJJiWWiJJjO..',
  '.OjJJiWWWWiJJjO.',
  '.OjJiWWWWWWiJjO.',
  '.OjJiWWWWWWiJjO.',
  '.OjJJiWWWWiJJjO.',
  '..OjJJiWWiJJjO..',
  '..OjJJJiiJJJjO..',
  '...OjjJJJJjjO...',
  '....OOjjjjOO....',
  '......OOOO......',
  '................',
];
