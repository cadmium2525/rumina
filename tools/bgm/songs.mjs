// ルミナの BGM（かなでる の曲 JSON）。作り直すときは node tools/bgm/build.mjs
// どの曲も「ルミナのテーマ」（タイトルの曲）の始まり「ミ・ソ・ド」（3 度・5 度・オクターブへ上がる動き）を、調や形を変えて入れてある。
// 低音は控えめ：ベースは倍音のある音色で 45Hz より下を切って小さめに、キックは軽く、ベース以外は低いところを切る
import { prog, mel, song, band, transpose, LOWCUT } from './lib.mjs';

const B = (bars) => bars * 4; // 小節 → 拍

// ================================================================ タイトル：ルミナのテーマ（C メジャー）
const THEME_CHORDS = 'C | Am | F | G | C | Am | F G | C | F | G | Em | Am | Dm7 | G | C/E F | Gsus4 G';
const THEME = `
  E5:.5 G5 C6:1 B5:.5 A5 G5:1 | A5:1.5 E5:.5 C5:1 E5 | F5:.5 A5 C6:1 B5:.5 A5 G5 F5 | G5:2 r:1 D5:.5 F5 |
  E5:.5 G5 C6:1 D6:.5 C6 B5:1 | A5:1 C6 E6:1.5! D6:.5 | C6:1 A5 B5 D6 | C6:3 r:1 |
  A5:1.5 G5:.5 F5:1 A5 | G5:1.5 F5:.5 D5:1 B4 | E5:1.5 D5:.5 E5:1 G5 | A5:2 G5:1 E5 |
  F5:1.5 E5:.5 D5:1 F5 | B5:1.5 A5:.5 G5:1 D5 | E5:1 G5 A5 C6 | D6:2! B5:1 G5:.5 r`;
const titleMel = mel(THEME);
const title = song({
  id: 'title', name: 'ルミナのテーマ', bpm: 112, key: 'C major', bars: 16, chords: prog(THEME_CHORDS),
  tracks: band({
    len: B(16), melody: titleMel,
    lead: { inst: 'flute', vol: -1 }, double: { inst: 'glock', vol: -12 },
    chords: { inst: 'piano', style: 'piano8', vol: -7, cut: 160 },
    pad: { inst: 'strings', vol: -14 },
    bass: { inst: 'pluckbass', style: 'half', vol: -7 },
    drums: { kit: 'acoustic', style: 'pop', intensity: 0.45, vol: -6 },
  }),
});

// ================================================================ 地図：ちずのうえで（F メジャー・てくてく歩く）
const mapMel = mel(`
  A4:.5 C5 F5:1 E5:.5 F5 G5:1 | A5:1 F5 D5 r | D5:.5 F5 A#5:1 A5:.5 G5 F5:1 | G5:2 E5:1 C5 |
  A4:.5 C5 F5:1 G5:.5 A5 A#5:1 | A5:1 D6 C6 A5 | A#5:1 G5 E5 G5 | F5:3 r:1 |
  D6:1.5 C6:.5 A#5:1 F5 | E5:1.5 F5:.5 G5:1 C5 | C6:1.5 A#5:.5 A5:1 E5 | F5:2 D5:1 A4 |
  A#4:.5 D5 G5:1 A5:.5 A#5 A5 G5 | E5:2 G5:1 C6 | D6:1 A#5 C6 E5 | F5:3 r:1`, { vel: 0.68 });
const map = song({
  id: 'map', name: 'ちずのうえで', bpm: 104, key: 'F major', bars: 16,
  chords: prog('F | Dm | Bb | C | F | Dm | Gm7 C7 | F | Bb | C | Am | Dm | Gm | C | Bb C | F'),
  tracks: band({
    len: B(16), melody: mapMel,
    lead: { inst: 'clarinet', vol: -1, reverb: 0.18 }, double: { inst: 'marimba', vol: -8, pan: -0.2 },
    chords: { inst: 'pizz', style: 'offbeat', vol: -8, register: 'C4' },
    bass: { inst: 'ebass', style: 'half', vol: -9 },
    drums: { kit: 'acoustic', style: 'light', intensity: 0.5, vol: -9 },
  }),
});

// ================================================================ 草原：そよかぜのおか（G メジャー・元気に走る）
const grassA = `
  B4:.5 D5 G5:1 A5:.5 G5 D5:1 | E5:.5 G5 B5:1.5 A5:.5 G5:1 | C6:.5 B5 A5 G5 E5:1 G5 | A5:2 F#5:1 D5 |
  B4:.5 D5 G5:1 A5:.5 G5 D5:1 | E5:.5 G5 B5:1 D6 B5 |`;
const grassMel = mel(`${grassA} C6:1 E6 D6 F#5 | G5:3 r:1 |
  ${grassA} E6:1 D6:.5 C6 B5:1 A5 | G5:2 B5:1 D6 |
  E6:1.5 D6:.5 B5:1 G5 | C6:1.5 B5:.5 A5:1 E5 | F#5:1 A5 D6 C6 | B5:2 G5:1 D5 |
  E5:.5 F#5 G5 A5 B5:1 E6 | E6:1 D6:.5 C6 G5:2 | A5:1 C6 E6 D6 | C6:1 A5 F#5 D5`);
const grass = song({
  id: 'grass', name: 'そよかぜのおか', bpm: 138, key: 'G major', bars: 24,
  chords: prog('G | Em | C | D | G | Em | C D | G | G | Em | C | D | G | Em | C D | G | Em | C | D | G | Em | C | Am | D7'),
  tracks: band({
    len: B(24), melody: grassMel,
    lead: { inst: 'squarelead', vol: -3, reverb: 0.15, delay: 0.08 }, double: { inst: 'pluck', vol: -9 },
    chords: { inst: 'epiano', style: 'offbeat', vol: -9, register: 'D4' },
    pad: { inst: 'strings', vol: -17 },
    bass: { inst: 'pluckbass', style: 'octave', vol: -9, lo: 'D2' },
    drums: { kit: 'acoustic', style: 'pop', intensity: 0.6, vol: -6 },
  }),
});

// ================================================================ アキハバラ：でんきの街（D メジャー・ピコピコ電子ポップ）
const akibaMel = mel(`
  F#5:.5 A5 D6:1 C#6:.5 D6 A5:1 | B5:.5 A5 F#5:1 D5 F#5 | G5:.5 B5 D6:1 C#6:.5 B5 A5 G5 | A5:2 E5:1 C#5 |
  F#5:.5 A5 D6:1 E6:.5 F#6 E6:1 | D6:1 B5 F#5 B5 | G5:1 B5 A5 C#6 | D6:3 r:1 |
  B5:.5 B5 B5:1 A5:.5 G5 D5:1 | C#6:.5 C#6 C#6:1 B5:.5 A5 E5:1 | A5:1 F#5 C#6 A5 | B5:2 D6:1 F#6 |
  G6:1.5 F#6:.5 E6:1 D6 | E6:1.5 D6:.5 C#6:1 A5 | B5:1 G5 E5 G5 | A5:2 C#6:1 E6`);
const akiba = song({
  id: 'akiba', name: 'でんきの街アキハバラ', bpm: 148, key: 'D major', bars: 16,
  chords: prog('D | Bm | G | A | D | Bm | Em A | D | G | A | F#m | Bm | G | A | Em | A7'),
  tracks: band({
    len: B(16), melody: akibaMel,
    lead: { inst: 'chip', vol: -4, reverb: 0.12, delay: 0.15 }, double: { inst: 'edmlead', vol: -12, pan: -0.2 },
    chords: { inst: 'chordstab', style: 'offbeat', vol: -10, register: 'D4' },
    arp: { inst: 'pluck', pattern: 'updown', rate: '1/16', vol: -15, register: 'D5' },
    bass: { inst: 'synthbass', style: 'octave', vol: -11, lo: 'D2' },
    drums: { kit: 'house', style: 'house', intensity: 0.55, vol: -8 },
  }),
});

// ================================================================ 洞窟：ひかりの洞窟（A マイナー・しずくの音）
const caveMel = mel(`
  C5:1 E5 A5:2 | G5:1 E5 C5:2 | B4:1 C5 E5 A5 | G5:2 A5:1 E5 |
  F5:2 E5:1 D5 | E5:2 G5:1 B5 | A5:3 G5:1 | G#5:2 E5 |
  A5:1.5 B5:.5 C6:1 A5 | B5:1.5 A5:.5 G5:1 D5 | C6:1.5 A5:.5 F5:1 C5 | B4:2 G#4 |
  D5:1 F5 A5 D6 | C6:1.5 B5:.5 A5:1 E5 | D5:1 F5 A#5 A5 | G#5:2 E5:1 B4`, { vel: 0.66 });
const cave = song({
  id: 'cave', name: 'ひかりの洞窟', bpm: 96, key: 'A minor', bars: 16,
  chords: prog('Am | Fmaj7 | Am | Fmaj7 | Dm7 | Em7 | Fmaj7 | E | Am | G | F | E | Dm | Am | Bb | E'),
  sends: { reverb: { size: 1.6, decay: 2.8, damp: 5500, predelay: 0.03, volume: 0 }, delay: { time: '1/4d', feedback: 0.4, tone: 3500, volume: 0 } },
  tracks: band({
    len: B(16), melody: caveMel,
    lead: { inst: 'vibraphone', vol: 0, reverb: 0.35, delay: 0.25 }, double: { inst: 'kalimba', vol: -10, pan: -0.25 },
    arp: { inst: 'marimba', pattern: 'updown', rate: '1/8', vol: -13, register: 'A4' },
    pad: { inst: 'darkpad', vol: -15 },
    bass: { inst: 'ebass', style: 'root', vol: -10 },
    drums: { kit: 'lofi', style: 'light', intensity: 0.35, vol: -12 },
  }),
});

// ================================================================ 遺跡：ゆうやけの遺跡（D マイナー・ハープとオーボエ）
const ruinsMel = mel(`
  F4:.5 A4 D5:1 E5:.5 F5 E5 D5 | E5:1.5 D5:.5 C5:1 G4 | D5:.5 F5 A#5:1 A5:.5 G5 F5:1 | E5:2 C#5:1 A4 |
  F4:.5 A4 D5:1 F5:.5 A5 G5 F5 | G5:1.5 E5:.5 C5:1 E5 | F5:1 D5 E5 G5 | D5:3 r:1 |
  G5:1.5 A5:.5 A#5:1 D6 | A5:2 F5:1 D5 | A#5:1.5 A5:.5 G5:1 D5 | C#5:1 E5 A5:2 |
  D6:1.5 C6:.5 A#5:1 F5 | A5:1.5 G5:.5 F5:1 C5 | D5:1 G5 A#5 A5:.5 G5 | A5:1 G5 E5 C#5`, { vel: 0.68 });
const ruins = song({
  id: 'ruins', name: 'ゆうやけの遺跡', bpm: 108, key: 'D minor', bars: 16,
  chords: prog('Dm | C | Bb | A | Dm | C | Bb C | Dm | Gm | Dm | Gm | A | Bb | F | Gm | A7'),
  tracks: band({
    len: B(16), melody: ruinsMel,
    lead: { inst: 'oboe', vol: -1, reverb: 0.3 }, double: { inst: 'koto', vol: -13, pan: -0.25, transpose: -12 },
    arp: { inst: 'harp', pattern: 'up', rate: '1/8', vol: -11, register: 'D4', octaves: 2 },
    pad: { inst: 'strings', vol: -17 },
    bass: { inst: 'ebass', style: 'root', vol: -10 },
    drums: { kit: 'acoustic', style: 'light', intensity: 0.55, vol: -10 },
  }),
});

// ================================================================ お城：かげの城（C マイナー・オルガンとチェンバロ）
const castleMel = mel(`
  D#5:.5 G5 C6:1 B5:.5 C6 G5:1 | G#5:1.5 G5:.5 D#5:1 C5 | F5:.5 G#5 C6:1 A#5:.5 G#5 G5 F5 | G5:2 D5:1 B4 |
  D#5:.5 G5 C6:1 D6:.5 D#6 D6:1 | C6:1 G#5 D#5 G#5 | F5:1 G#5 G5 B5 | C6:3 r:1 |
  C6:1.5 A#5:.5 G#5:1 F5 | G5:1.5 F5:.5 D#5:1 C5 | G#5:1 C6 F6 D#6 | D6:2 B5:1 G5 |
  D#6:1.5 D6:.5 C6:1 G#5 | D6:1.5 C6:.5 A#5:1 F5 | C6:1 D#6 G#5 C6 | B5:1 D6 F5 D5`, { vel: 0.7 });
const castle = song({
  id: 'castle', name: 'かげの城', bpm: 124, key: 'C minor', bars: 16,
  chords: prog('Cm | Ab | Fm | G | Cm | Ab | Dm7b5 G | Cm | Fm | Cm | Fm | G | Ab | Bb | Ab | G7'),
  tracks: band({
    len: B(16), melody: castleMel,
    lead: { inst: 'organ', vol: -3, reverb: 0.28 }, double: { inst: 'trumpet', vol: -14, pan: 0.15 },
    arp: { inst: 'harpsichord', pattern: 'updown', rate: '1/8', vol: -11, register: 'C4' },
    pad: { inst: 'strings', vol: -14 },
    bass: { inst: 'fmbass', style: 'root8', vol: -12 },
    drums: { kit: 'cinematic', style: 'halftime', intensity: 0.55, vol: -9 },
  }),
});

// ================================================================ 空：くものうえ（B♭ メジャー・口笛とハープ）
const skyMel = mel(`
  D5:.5 F5 A#5:1.5 C6:.5 D6:1 | A#5:2 G5:1 D5 | D#5:.5 G5 A#5:1.5 C6:.5 A#5 G5 | A5:2 F5:1 C5 |
  D5:.5 F5 A#5:1.5 C6:.5 D6 F6 | D6:2 A#5:1 G5 | D#6:1 C6 C6 A5 | A#5:3 r:1 |
  G5:1.5 A#5:.5 D#6:2 | F5:1.5 A5:.5 C6:2 | D6:1.5 C6:.5 A5:1 F5 | G5:2 A#5:1 D6 |
  D#6:1.5 D6:.5 C6:1 G5 | A5:1.5 A#5:.5 C6:1 F5 | G5:1 A#5 A5 C6 | A5:1.5 F5:.5 D#5:1 C5`, { vel: 0.68 });
const sky = song({
  id: 'sky', name: 'くものうえ', bpm: 118, key: 'Bb major', bars: 16,
  chords: prog('Bb | Gm | Eb | F | Bb | Gm | Cm7 F | Bb | Eb | F | Dm | Gm | Cm | F | Eb F | F7'),
  tracks: band({
    len: B(16), melody: skyMel,
    lead: { inst: 'whistle', vol: -2, reverb: 0.3, delay: 0.15 }, double: { inst: 'celesta', vol: -11 },
    arp: { inst: 'harp', pattern: 'updown', rate: '1/8', vol: -11, register: 'F4', octaves: 2 },
    pad: { inst: 'airpad', vol: -13 },
    bass: { inst: 'ebass', style: 'half', vol: -10 },
    drums: { kit: 'acoustic', style: 'pop', intensity: 0.4, vol: -9 },
  }),
});

// ================================================================ ネオン：ネオンどおり（F マイナー・ファンキーなハウス）
const neonMel = mel(`
  G#4:.5 C5 F5:.75 D#5:.25 F5:.5 G#5:1 r:.5 | F5:.5 G#5 C6:1 G#5:.5 F5 D#5 C5 | C#5:.5 F5 A#5:.75 G#5:.25 F5:1 C#5 | E5:1.5 G5:.5 A#5:1 C6 |
  G#5:.5 C6 F6:.75 D#6:.25 C6:1 G#5 | F5:.5 G#5 C6:1.5 C#6:.5 C6:1 | C#6:1 A#5 G5 A#5 | C6:3 r:1 |
  F5:.5 F5 G#5 C6:1 G#5:.5 F5:1 | G5:.5 G5 A#5 D#6:1 A#5:.5 G5:1 | D#5:.5 G5 A#5:1 C6 G5 | G#5:2 F5:1 D#5 |
  C#6:1.5 C6:.5 A#5:1 F5 | D#6:1.5 C#6:.5 A#5:1 G5 | C6:1 G#5 F5 G#5 | E5:1 G5 A#5 G5`, { vel: 0.7 });
const neon = song({
  id: 'neon', name: 'ネオンどおり', bpm: 122, key: 'F minor', bars: 16,
  chords: prog('Fm7 | Dbmaj7 | Bbm7 | C7 | Fm7 | Dbmaj7 | Bbm7 Eb | Ab | Dbmaj7 | Eb | Cm7 | Fm7 | Bbm7 | Eb | Dbmaj7 | C7'),
  tracks: band({
    len: B(16), melody: neonMel,
    lead: { inst: 'squarelead', vol: -4, delay: 0.18 }, double: { inst: 'vibraphone', vol: -11 },
    chords: { inst: 'epiano', style: 'funk', vol: -9, register: 'C4', fx: [{ type: 'chorus', mix: 0.3 }] },
    pad: { inst: 'futurebass', vol: -18 },
    bass: { inst: 'synthbass', style: 'funk', vol: -12, lo: 'C2' },
    drums: { kit: 'house', style: 'disco', intensity: 0.5, vol: -8 },
  }),
});

// ================================================================ 火山：ふんかのみち（E マイナー・はやいロック）
const volcanoMel = mel(`
  G5:.5 B5 E6:1 D6:.5 B5 G5:1 | E6:.5 D6 C6 B5 G5:1 E5 | F#5:.5 A5 D6:1 C6:.5 A5 F#5:1 | D#6:2 B5:1 F#5 |
  G5:.5 B5 E6:1 F#6:.5 G6 F#6:1 | E6:1 C6 G5 E5 | A5:.5 C6 E6:1 D#6 F#6 | E6:3 r:1 |
  C6:.5 C6 C6:1 B5:.5 A5 E5:1 | B5:.5 B5 B5:1 A5:.5 G5 E5:1 | A5:.5 C6 E6:1 D6:.5 C6 A5:1 | B5:2 D#6:1 F#6 |
  G6:1.5 F#6:.5 E6:1 C6 | F#6:1.5 E6:.5 D6:1 A5 | E6:1 C6 B5 D#6 | F#6:2 D#6:1 B5`, { vel: 0.72 });
const volcano = song({
  id: 'volcano', name: 'ふんかのみち', bpm: 150, key: 'E minor', bars: 16,
  chords: prog('Em | C | D | B7 | Em | C | Am B7 | Em | Am | Em | Am | B | C | D | C B7 | B7'),
  tracks: band({
    len: B(16), melody: volcanoMel,
    lead: { inst: 'sawlead', vol: -5, reverb: 0.15 }, double: { inst: 'synthbrass', vol: -11, pan: -0.2 },
    chords: { inst: 'guitar', style: 'stab', vol: -10, register: 'E4', fx: [{ type: 'dist', drive: 10, kind: 'tape', tone: 0.3, mix: 0.6 }] },
    bass: { inst: 'synthbass', style: 'root8', vol: -12, lo: 'D2' },
    drums: { kit: 'rock', style: 'rock', intensity: 0.7, vol: -7 },
  }),
});

// ================================================================ やみ：くらやみのもり（B マイナー・オルゴール）
const darkMel = mel(`
  D5:1 F#5 B5:2 | A5:1.5 G5:.5 D5:2 | E5:1 G5 B5 A5 | A#5:3 r:1 |
  D5:1 F#5 B5 C#6 | D6:2 B5:1 G5 | G5:1.5 F#5:.5 E5:2 | F#5:2 E5:1 C#5 |
  B5:1.5 A5:.5 G5:1 D5 | F#5:1.5 E5:.5 D5:1 A4 | G5:1.5 F#5:.5 E5:1 B4 | D5:2 F#5 |
  G5:1 B5 D6 B5 | C#6:1.5 B5:.5 A5:1 E5 | G5:2 F#5:1 E5 | F#5:2 A#4:1 C#5`, { vel: 0.62 });
const dark = song({
  id: 'dark', name: 'くらやみのもり', bpm: 84, key: 'B minor', bars: 16,
  chords: prog('Bm | G | Em | F# | Bm | G | Em | F#7 | G | D | Em | Bm | G | A | Em | F#'),
  sends: { reverb: { size: 1.8, decay: 3.2, damp: 5000, predelay: 0.03, volume: 0 }, delay: { time: '1/4d', feedback: 0.35, tone: 3000, volume: 0 } },
  tracks: band({
    len: B(16), melody: darkMel,
    lead: { inst: 'musicbox', vol: 0, reverb: 0.4, delay: 0.2 }, double: { inst: 'celesta', vol: -14, transpose: 12 },
    pad: { inst: 'darkpad', vol: -12 },
    arp: { inst: 'nylon', pattern: 'up', rate: '1/8', vol: -14, register: 'B3' },
    bass: { inst: 'ebass', style: 'pedal', vol: -14 },
    drums: { kit: 'lofi', style: 'light', intensity: 0.25, vol: -14 },
  }),
});

// ================================================================ 宇宙：ほしのみち（D・リディア・きらきらのシンセ）
const spaceMel = mel(`
  F#5:.5 A5 D6:1.5 C#6:.5 A5:1 | G#5:1.5 B5:.5 E6:1 B5 | D6:1 C#6:.5 B5 F#5:2 | E5:1 A5 C#6:2 |
  B5:.5 D6 F#6:1.5 E6:.5 D6:1 | C#6:1.5 A5:.5 F#5:1 E5 | G5:1 B5 D6 E6 | D6:2 C#6 |
  B5:1.5 A5:.5 F#5:1 D5 | E5:1 A5 C#6 E6 | E6:1.5 C#6:.5 A5:1 F#5 | D6:2 A5:1 F#5 |
  G5:.5 B5 D6 F#6 E6:1 D6 | C#6:1.5 B5:.5 A5:1 E5 | G5:1 B5 E6 D6 | C#6:2 A5:1 E5`, { vel: 0.68 });
const space = song({
  id: 'space', name: 'ほしのみち', bpm: 116, key: 'D lydian', bars: 16,
  chords: prog('Dmaj7 | E/D | Bm7 | A | Gmaj7 | F#m7 | Em7 | A7sus4 A7 | Gmaj7 | A | F#m7 | Bm7 | Gmaj7 | A | Em7 | A'),
  tracks: band({
    len: B(16), melody: spaceMel,
    lead: { inst: 'softlead', vol: -2, reverb: 0.3, delay: 0.2 }, double: { inst: 'bellkeys', vol: -11 },
    arp: { inst: 'pluck', pattern: 'up', rate: '1/16', vol: -13, register: 'D5', octaves: 2 },
    pad: { inst: 'glasspad', vol: -12 },
    bass: { inst: 'synthbass', style: 'pedal8', vol: -13, lo: 'C2' },
    drums: { kit: 'house', style: 'halftime', intensity: 0.45, vol: -10 },
  }),
});

// ================================================================ ルミナの家（テーマを F メジャーでゆっくり）
const house = song({
  id: 'house', name: 'ルミナの家', bpm: 84, key: 'F major', bars: 16,
  chords: prog('F | Dm | Bb | C | F | Dm | Bb C | F | Bb | C | Am | Dm | Gm7 | C | F/A Bb | Csus4 C'),
  tracks: band({
    len: B(16), melody: transpose(mel(THEME, { vel: 0.62 }), -7),
    lead: { inst: 'epiano', vol: 0, reverb: 0.3, cut: 160 }, double: { inst: 'musicbox', vol: -13, transpose: 12 },
    chords: { inst: 'nylon', style: 'ballad', vol: -10, register: 'C4', cut: 140 },
    bass: { inst: 'ebass', style: 'root', vol: -11 },
    drums: { kit: 'lofi', style: 'lofi', intensity: 0.3, vol: -13 },
  }),
});

// ================================================================ ボス：ボスせん（D マイナー・はやい）
const bossMel = mel(`
  D5:.5 F5 A5 D6 C6:1 A5 | A#5:.5 A5 F5 D5 F5:1 A#5 | G5:.5 A#5 D6 G6 F6:1 D6 | E6:1.5 C#6:.5 A5:2 |
  D6:.5 C6 A5 F5 D5:1 F5 | D5:.5 F5 A#5 D6 C6:1 A#5 | A#5:1 G5 C#6 E6 | D6:2 r:1 A5 |
  F6:1.5 D6:.5 A#5:1 F5 | E6:1.5 C6:.5 G5:1 E5 | C6:.5 B5 C6 E6 A6:2 | F6:1.5 E6:.5 D6:1 A5 |
  G5:.5 A5 A#5 D6 G6:1 F6 | E6:1 C6 G5 E6 | D6:1 F6 A#5 D6 | C#6:1 A5 E5 C#5`, { vel: 0.74 });
const boss = song({
  id: 'boss', name: 'ボスせん', bpm: 158, key: 'D minor', bars: 16,
  chords: prog('Dm | Bb | Gm | A | Dm | Bb | Gm A7 | Dm | Bb | C | Am | Dm | Gm | C | Bb | A7'),
  tracks: band({
    len: B(16), melody: bossMel,
    lead: { inst: 'brass', vol: -3, reverb: 0.18 }, double: { inst: 'sawlead', vol: -13, pan: -0.2 },
    arp: { inst: 'spiccato', pattern: 'updown', rate: '1/16', vol: -11, register: 'D4' },
    pad: { inst: 'strings', vol: -15 },
    bass: { inst: 'synthbass', style: 'root8', vol: -12, lo: 'D2' },
    drums: { kit: 'rock', style: 'rock', intensity: 0.85, vol: -7 },
  }),
});

// ================================================================ 最後のボス：やみの大王（C マイナー・オルガンとクワイア）
const lastbossMel = mel(`
  C5:.5 D#5 G5 C6 D#6:1 D6:.5 C6 | G#5:1.5 G5:.5 D#5:1 C5 | F5:.5 G#5 C6 F6 D#6:1 C6 | D6:1.5 B5:.5 G5:2 |
  G5:.5 C6 D#6 G6 F6:1 D#6 | D#6:.5 C6 G#5 D#5 C6:2 | G#5:1 C6 B5 D6 | C6:2 G5:1 D#5 |
  C6:1.5 D#6:.5 G#6:2 | F6:1.5 D6:.5 A#5:2 | G6:1 F6:.5 D#6 D6:1 A#5 | C6:2 D#6:1 G6 |
  G#6:1.5 G6:.5 F6:1 C6 | D6:1.5 D#6:.5 F6:1 D6 | D#6:1 C6 G#5 C6 | B5:1 D6 F6 D6`, { vel: 0.74 });
const lastboss = song({
  id: 'lastboss', name: 'やみの大王', bpm: 166, key: 'C minor', bars: 16,
  chords: prog('Cm | Ab | Fm | G | Cm | Ab | Fm G | Cm | Ab | Bb | Gm | Cm | Fm | Bb | Ab | G7'),
  tracks: band({
    len: B(16), melody: lastbossMel,
    lead: { inst: 'organ', vol: -3, reverb: 0.25 }, double: { inst: 'brass', vol: -10, pan: 0.15 },
    arp: { inst: 'spiccato', pattern: 'updown', rate: '1/16', vol: -10, register: 'C4' },
    pad: { inst: 'choir', vol: -11 },
    bass: { inst: 'synthbass', style: 'root8', vol: -12, lo: 'C2' },
    drums: { kit: 'cinematic', style: 'rock', intensity: 0.9, vol: -7 },
  }),
});

// ================================================================ 最終コース：ひかりのみなもと（E マイナー・テーマを短調で）
const finalMel = mel(`
  G5:.5 B5 E6:1 D6:.5 C6 B5:1 | C6:1.5 G5:.5 E5:1 G5 | D5:.5 G5 B5:1 A5:.5 G5 F#5 G5 | A5:2 r:1 F#5:.5 A5 |
  G5:.5 B5 E6:1 F#6:.5 E6 D6:1 | C6:1 E6 G6:1.5! F#6:.5 | E6:1 C6 D#6 F#6 | E6:3 r:1 |
  G6:1.5 F#6:.5 E6:1 C6 | F#6:1.5 E6:.5 D6:1 A5 | B5:1.5 A5:.5 G5:1 D5 | E5:1 G5 B5 E6 |
  E6:1.5 D6:.5 C6:1 G5 | A5:1.5 B5:.5 C6:1 D6 | D6:1 F#6 E6 G6 | F#6:2! D#6:1 B5`, { vel: 0.74 });
const final = song({
  id: 'final', name: 'ひかりのみなもと', bpm: 144, key: 'E minor', bars: 16,
  chords: prog('Em | C | G | D | Em | C | Am B | Em | C | D | G | Em | C | D | Bm Em | B'),
  tracks: band({
    len: B(16), melody: finalMel,
    lead: { inst: 'supersaw', vol: -6, reverb: 0.2 }, double: { inst: 'violin', vol: -9, pan: -0.15 },
    arp: { inst: 'spiccato', pattern: 'up', rate: '1/16', vol: -11, register: 'E4' },
    pad: { inst: 'choir', vol: -12 },
    bass: { inst: 'synthbass', style: 'root8', vol: -12, lo: 'D2' },
    drums: { kit: 'cinematic', style: 'rock', intensity: 0.8, vol: -7 },
  }),
});

// ================================================================ ジングル：コースクリア
const clear = song({
  id: 'clear', name: 'コースクリア', bpm: 150, key: 'C major', bars: 3, loop: false, tail: 2.5,
  chords: prog('C | F G | C'),
  tracks: [
    { id: 'lead', name: 'ブラス', inst: 'brass', volume: -2, sends: { reverb: 0.25 }, fx: [LOWCUT(200)],
      clips: [{ at: 0, notes: mel('E5:.5 G5 C6:1 E6:.5 D6 C6:1 | A5:.5 C6 F6:1 D6:.5 F6 G6:1 | E6:3! r:1', { vel: 0.8 }) }] },
    { id: 'glock', name: 'グロッケン', inst: 'glock', volume: -9, sends: { reverb: 0.3 },
      clips: [{ at: 0, notes: mel('E5:.5 G5 C6:1 E6:.5 D6 C6:1 | A5:.5 C6 F6:1 D6:.5 F6 G6:1 | E6:3 r:1', { vel: 0.7 }) }] },
    { id: 'chords', name: '和音', inst: 'strings', volume: -8, sends: { reverb: 0.3 }, fx: [LOWCUT(180)],
      clips: [{ at: 0, notes: mel('[C4,E4,G4]:4 | [C4,F4,A4]:2 [D4,G4,B4]:2 | [E4,G4,C5]:4', { vel: 0.6 }) }] },
    { id: 'bass', name: 'ベース', inst: 'pluckbass', volume: -9, fx: [{ type: 'eq', bands: [{ type: 'hp', freq: 50, slope: 24 }] }],
      clips: [{ at: 0, notes: mel('C3:2 G2:2 | F2:2 G2:2 | C3:3 r:1') }] },
    { id: 'drums', name: 'ドラム', type: 'drums', kit: 'acoustic', volume: -7, tune: { kick: { tone: 0.25, length: 0.7 } },
      clips: [{ at: 0, len: 12, grid: { kick: 'x.......x.......|x.......x.x.x.x.|X...............', snare: '....x.......x...|....x...xxxxxxxx|................', crash: 'X...............|................|X...............', hat: 'x.x.x.x.x.x.x.x.|x.x.x.x.........|................' } }] },
  ],
});

// ================================================================ ジングル：ミス
const miss = song({
  id: 'miss', name: 'ミス', bpm: 120, key: 'A minor', bars: 2, loop: false, tail: 2,
  tracks: [
    { id: 'lead', name: 'チップ', inst: 'chip', volume: -3, sends: { reverb: 0.2 }, fx: [LOWCUT(200)],
      clips: [{ at: 0, notes: mel('C6:.5 B5 A#5 A5 G#5:1 E5:.5 B4 | A4:3 r:1', { vel: 0.75 }) }] },
    { id: 'pad', name: 'パッド', inst: 'pad', volume: -12, fx: [LOWCUT(200)],
      clips: [{ at: 0, notes: mel('[D4,F4,G#4]:2 [E4,G#4,B4]:2 | [C4,E4,A4]:3 r:1', { vel: 0.5 }) }] },
  ],
});

// ================================================================ エンディング：ひかりのテーマ（テーマをゆったり、フルオーケストラで）
// 2 小節の前奏 → A（8）→ B（8）→ A の後半（6）→ 終わりの和音（2）＝ 26 小節
const endA = mel(THEME, { at: B(2), vel: 0.7 });
const endChords = prog('C | Am | F | G | C | Am | F G | C | F | G | Em | Am | Dm7 | G | C/E F | Gsus4 G', 4, B(2));
// 最後の A は 5〜8 小節目の旋律（「ミ・ソ・ド・レ・ド・シ」→ 高いドで終わる）を少し変えて
const endLast = mel(`
  C5:4 | D5:2 G4:2 |
  E5:.5 G5 C6:1 D6:.5 C6 B5:1 | A5:1 C6 E6:1.5! D6:.5 | C6:1 A5 B5 D6 | C6:2 E6:1 G6 |
  F6:1.5 E6:.5 D6:1 C6 | D6:2 B5:1 G5 | C6:4! | r:4`, { at: B(18), vel: 0.72 });
const endMel = [...mel('G4:2 C5:1 E5 | F5:2 D5', { vel: 0.5 }), ...endA, ...endLast];
const ending = song({
  id: 'ending', name: 'ひかりのテーマ', bpm: 96, key: 'C major', bars: 28, loop: false, tail: 4,
  chords: [[0, 'C'], [4, 'Gsus4'], ...endChords, ...prog('C | G/B | C | Am | F G | C | F | G | C | C', 4, B(18))],
  tracks: band({
    len: B(28), melody: endMel,
    lead: { inst: 'strings', vol: 0, reverb: 0.35, cut: 180 }, double: { inst: 'flute', vol: -6, pan: 0.15 },
    chords: { inst: 'piano', style: 'ballad', vol: -6, cut: 150 },
    pad: { inst: 'choiroo', vol: -14 },
    bass: { inst: 'cello', style: 'root', vol: -12, lo: 'C2' },
    drums: { clips: [{ at: B(10), len: B(16), gen: { type: 'drums', style: 'ballad', intensity: 0.45, fill: 8, seed: 1 } },
      { at: B(26), len: 8, grid: { crash: 'X...............|................', kick: 'X...............|................' } }], kit: 'acoustic', vol: -9 },
  }),
});

export const SONGS = [title, map, grass, akiba, cave, ruins, castle, sky, neon, volcano, dark, space, house, boss, lastboss, final, clear, miss, ending];
