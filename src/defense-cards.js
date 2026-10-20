// 무한 방어전 보상 카드: 시작 9장, 등급 확률, 3장 뽑기, 진화권 보장, 카드 효과.
import { EVOLVE_LEVELS, LINES, BAY_EVOLVE_LEVEL } from './defense-data.js';

export const RARITY_WEIGHTS = Object.freeze({ common: 70, rare: 25, legendary: 5 });
export const EVO_PITY_WAVES = 5;   // 진화권이 5웨이브 연속 안 나오면 다음 뽑기에 꼭 넣는다.
export const MIN_SUPPLY_INTERVAL_FACTOR = 0.5;
export const MAX_ALL_ATTACK = 0.6;
export const MAX_HEARTS_CAP = 40;
export const MINE_SPOTS = Object.freeze([0.3, 0.5, 0.7]);   // 지뢰: 길 전체 길이 비율 위치

// eligible(run)이 false면 그 카드는 뽑기에 나오지 않는다.
export const CARDS = Object.freeze({
  supplySpeed: { kind: 'economy', rarity: 'common', name: '보급 속도', text: '보급 간격 −10%', eligible: run => run.mods.supplyInterval > MIN_SUPPLY_INTERVAL_FACTOR + 1e-9 },
  supplyAmount: { kind: 'economy', rarity: 'common', name: '보급량', text: '한 번에 받는 보급 +3' },
  lifeExtend: { kind: 'life', rarity: 'common', name: '생명 연장', text: '기지 ♥ +3 (최대치도 +3)', eligible: run => run.maxHearts < MAX_HEARTS_CAP },
  baseRepair: { kind: 'life', rarity: 'rare', name: '기지 수리', text: '♥ 최대치까지 회복', eligible: run => run.hearts < run.maxHearts },
  allAttack: { kind: 'attack', rarity: 'common', name: '전군 사격', text: '모든 장비 공격 +10%', eligible: run => run.mods.allAttack < MAX_ALL_ATTACK - 1e-9 },
  lineFocus: { kind: 'attack', rarity: 'common', name: '계열 특화', text: '한 계열 공격 +20%' },
  mines: { kind: 'tactic', rarity: 'common', name: '지뢰 매설', text: '길 위에 지뢰 3개' },
  icbm: { kind: 'tactic', rarity: 'rare', name: 'ICBM', text: '누른 곳 큰 폭발 · 쿨 40초' },
  evolve: { kind: 'evolve', rarity: 'rare', name: '진화권', text: '조건을 채운 장비 1개 진화 · 레벨 유지', eligible: run => evolvable(run).length > 0 },
});
Object.values(CARDS).forEach(Object.freeze);

// 진화권을 쓸 수 있는 곳: 1차는 Lv10, 2차(갈래)는 Lv20인 공격 장비, Lv20 이상 지원 칸(아직 안 바뀐 것).
export function evolvable(run) {
  const pads = run.pads.flatMap((t, i) => t && t.stage < 2 && t.level >= EVOLVE_LEVELS[t.stage] ? [{ pad: i }] : []);
  const bays = Object.entries(run.bays).flatMap(([id, b]) => b && !b.branch && b.level >= BAY_EVOLVE_LEVEL ? [{ bay: id }] : []);
  return [...pads, ...bays];
}

export function nextRandom(run) {
  let t = run.rng = (run.rng + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pickWeighted = (run, entries) => {
  let roll = nextRandom(run) * entries.reduce((s, [, w]) => s + w, 0);
  for (const [value, w] of entries) if ((roll -= w) < 0) return value;
  return entries.at(-1)[0];
};

// 서로 다른 3장. 등급을 먼저 굴리고, 그 등급에 낼 카드가 없으면 남은 카드 중에서 고른다.
export function drawCards(run, count = 3) {
  const pool = Object.keys(CARDS).filter(id => CARDS[id].eligible?.(run) ?? true), hand = [];
  while (hand.length < count && hand.length < pool.length) {
    const left = pool.filter(id => !hand.includes(id));
    const rarity = pickWeighted(run, Object.entries(RARITY_WEIGHTS));
    const same = left.filter(id => CARDS[id].rarity === rarity);
    const from = same.length ? same : left;
    hand.push(from[Math.floor(nextRandom(run) * from.length)]);
  }
  if (pool.includes('evolve') && !hand.includes('evolve') && run.wavesWithoutEvo >= EVO_PITY_WAVES) hand[hand.length - 1] = 'evolve';
  run.wavesWithoutEvo = hand.includes('evolve') ? 0 : run.wavesWithoutEvo + 1;
  return hand.map(id => id === 'lineFocus' ? { id, line: Object.keys(LINES)[Math.floor(nextRandom(run) * 3)] } : { id });
}

export function applyCard(run, card) {
  const def = CARDS[card.id];
  if (!def) throw new RangeError('Unknown defense card');
  const m = run.mods;
  switch (card.id) {
    case 'supplySpeed': m.supplyInterval = Math.max(MIN_SUPPLY_INTERVAL_FACTOR, m.supplyInterval * 0.9); break;
    case 'supplyAmount': m.supplyAmount += 3; break;
    case 'lifeExtend': run.maxHearts = Math.min(MAX_HEARTS_CAP, run.maxHearts + 3); run.hearts = Math.min(run.maxHearts, run.hearts + 3); break;
    case 'baseRepair': run.hearts = run.maxHearts; break;
    case 'allAttack': m.allAttack = Math.min(MAX_ALL_ATTACK, m.allAttack + 0.1); break;
    case 'lineFocus': if (!LINES[card.line]) throw new RangeError('Unknown defense line'); m.line[card.line] += 0.2; break;
    case 'mines': run.mines.push(...MINE_SPOTS.map(at => ({ at, armed: true }))); break;
    case 'icbm': run.skills.icbm = run.skills.icbm ? { ...run.skills.icbm, cooldown: Math.max(20, run.skills.icbm.cooldown * 0.8) } : { cooldown: 40, ready: 0 }; break;
    case 'evolve': run.evoTickets += 1; break;
  }
  return run;
}
