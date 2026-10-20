// 공허 군단(무한 방어전 적) 그림: 코드로 직접 그린 픽셀 그림. 외부 이미지 없음.
// 왼쪽 절반만 적고 좌우를 뒤집어 붙인다(대칭). 앞(머리)이 위를 향하게 그리고, 화면에서 가는 방향으로 돌린다.
// 글자 → 색: d 외곽 · b 몸 · l 밝은 면 · h 반사광 · p 갑판 · g 발광 · c 발광 중심 · e 눈·감지기 · . 빈칸
import { reportError } from './diagnostics.js';

// 구간별 색: 아스테라 녹슨 갈색 · 에테리온 수정 청보라 · 에레보스 용암
export const ALIEN_PALETTES = Object.freeze({
  rust: Object.freeze({ d: '#170a0e', b: '#4a2a2e', l: '#7a4a44', h: '#c08a6a', p: '#5e3638', g: '#ff4fd8', c: '#ffe2f6', e: '#7ff3ff' }),
  crystal: Object.freeze({ d: '#0b0e22', b: '#2c2f6a', l: '#4a56a8', h: '#a6b4ff', p: '#383d86', g: '#6ff0ff', c: '#eaffff', e: '#ff8af0' }),
  magma: Object.freeze({ d: '#120507', b: '#3a1014', l: '#6a1e1c', h: '#ff9a4a', p: '#4e1618', g: '#ff6a2a', c: '#fff0c0', e: '#ffd24a' }),
});

// 왼쪽 절반(각 줄 같은 길이). 오른쪽은 거울.
const HALF = Object.freeze({
  crawler: [ // 갑각병: 다리 6개, 갑판 3겹, 꼬리 발광 주머니
    '.....dd.', '....dbld', '..d.dbhe', '...ddbll', '.dd.dbpp', 'd..ddplh', '...dbppl', '.dd.dbpl',
    'd..ddppp', '...dbbll', '..d.dbgg', '....dbgc', '.....dbg', '......dd', '........', '........'],
  drone: [ // 포자 드론: 원반 몸통, 테두리 발광, 아래 포자 주머니
    '........', '......dd', '....ddbb', '...dbbll', '..dbllhh', '.dbpplle', 'gdppplll', 'gdpppbbc',
    'gdpppbbc', 'gdppplll', '.dbpplll', '..dbbllh', '...ddbbb', '.....ddd', '....g...', '........'],
  shell: [ // 방패 갑충: 앞쪽 수정 방패막, 육각 갑판
    '..eeeeee', '.e......', '...ddddd', '..dbbbbb', '.dbpphhp', 'dbpplppl', 'dbplhpph', 'dbppplpl',
    'dbplpphl', 'dbppplpl', 'dbplpphl', '.dbppppl', '..dbbbbb', '...dd.gg', '.....dgc', '......dd'],
  runner: [ // 질주체: 날렵한 화살 몸, 뒤로 끌리는 발광 꼬리
    '.......d', '......dh', '......dl', '.....dbe', '.....dbl', '....dbll', '...ddbpl', '..d.dbpl',
    '.d..dbpl', '....dbbl', '.....dbg', '.....dgc', '......gc', '......gg', '.......g', '........'],
  phase: [ // 위상 잠입자: 마름모 결정 몸, 가운데 핵
    '.......e', '......dh', '.....dbl', '....dbll', '...dbplh', '..dbpplg', '.dbpppgc', 'dbppppgc',
    '.dbpppgc', '..dbpplg', '...dbplh', '....dbll', '.....dbl', '......dh', '.......e', '........'],
  brute: [ // 거대 갑각병(중간 보스): 넓은 어깨 갑판, 집게, 눈 넷
    'dd....dd', 'dbd..dbb', 'dhbd.dbl', '.dbbdbll', '..dbbphe', '..dbpplh', '.ddbpppl', 'dbbbplll',
    'dlbpppph', 'dbbpplll', '.ddbpppl', '..dbppll', '..dbbggg', '...dbgcc', '....dbgg', '.....ddd'],
  mother: [ // 모체(20웨이브 보스): 겹겹 갑판, 눈 줄, 양쪽 발광 촉수
    'g...........', 'gd.......ddd', '.gd....ddbbb', '..d...dbllll', '.....dbphhhp', '....dbpplllp', '...dbppeplep', '...dbpplllll',
    '..dbbppppppp', 'ddbllbpplhhl', 'dhbllbpplllp', 'ddbllbpppppp', '..dbbppllllp', '...dbppphhhp', '...dbbpppppp', '....dbbbgggg',
    '.....dbgcccc', '......dbgggg', '.......dbbbb', '........dddd', '..........gg', '...........g', '............', '............'],
  hive: [ // 포자 모선(40웨이브 보스): 큰 원반, 포자 구멍 줄, 고리 발광
    '............', '.......ddddd', '.....ddbbbbb', '....dbblllll', '...dbllhhhhh', '..dbllpppppp', '.dbllpgdgdgd', '.dblpppppppp',
    'gdbpplllllll', 'gdbpplhhhhhh', 'gdbpplllcccc', 'gdbpplllcccc', 'gdbpplhhhhhh', 'gdbpplllllll', '.dblpppppppp', '.dbllpgdgdgd',
    '..dbllpppppp', '...dbllhhhhh', '....dbblllll', '.....ddbbbbb', '.......ddddd', '.........g..', '............', '............'],
  colossus: [ // 심연 거신(60웨이브 보스): 육중한 다리, 등 위 발광 결정, 앞 방패
    '...eeeeeeeee', '..e.........', '....dddddddd', '...dbbbbbbbb', '..dbllhhllll', 'ddbpplpphppl', 'dhbpplppgppl', 'ddbppppgcgpp',
    '..dbpplpgppl', 'ddbpplpphppl', 'dhbppppppppp', 'ddbpplllllll', '..dbppphhhhh', 'ddbppppppppp', 'dhbpplllllll', 'ddbbppppgggg',
    '..ddbpppgccc', '...ddbbbgggg', '....dddbbbbb', '...dd..ddddd', '..dd....dd..', '............', '............', '............'],
});

const cache = new Map();
// 적 한 종류·한 색의 그림(발광 테두리 포함). 실패하면 null(그림 없이 진행).
export function alienSprite(kind, palette = 'rust', doc = globalThis.document) {
  const key = `${kind}:${palette}`;
  if (cache.has(key)) return cache.get(key);
  let out = null;
  try {
    const half = HALF[kind] ?? HALF.crawler, colors = ALIEN_PALETTES[palette] ?? ALIEN_PALETTES.rust;
    const rows = half.map(row => row + [...row].reverse().join('')), size = rows[0].length, cell = size > 16 ? 4 : 5, pad = 6;
    const base = doc.createElement('canvas'); base.width = base.height = size * cell;
    const c = base.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { c.fillStyle = colors[ch]; c.fillRect(x * cell, y * cell, cell, cell); } }));
    out = doc.createElement('canvas'); out.width = out.height = base.width + pad * 2;
    const o = out.getContext('2d');
    o.shadowColor = colors.g; o.shadowBlur = 7; o.drawImage(base, pad, pad); o.shadowBlur = 0; o.drawImage(base, pad, pad);
  } catch (error) { reportError('defense.alienSprite', error); out = null; }
  cache.set(key, out);
  return out;
}
export const ALIEN_KINDS = Object.freeze(Object.keys(HALF));
export const ALIEN_SHAPES = HALF;
