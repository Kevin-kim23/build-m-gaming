// 무한 방어전 한 판의 상태와 플레이어 행동(짓기·강화·진화·옮기기·카드·바로 부르기). 순수 계산, 화면 없음.
import {
  PADS, LINES, TOWERS, BAYS, START_SUPPLY, START_HEARTS, WAVE_GAP_S, MAX_LEVEL, MAX_STORED_CARDS,
  TRAIT_LEVELS, COMMON_TRAITS, BRANCH_TRAITS, LEVEL_DAMAGE_STEP, FINAL_LEVEL_FACTOR, BASE_MAX_LEVEL, EVOLVE_LEVELS, BAY_EVOLVE_LEVEL,
} from './defense-data.js';
import { buildCost, bayBuildCost, upgradeCost, baseUpgradeCost, startBaseLevel, sellRefund, callEarlyBonus } from './defense-economy.js';
import { drawCards, applyCard, evolvable } from './defense-cards.js';

export function createRun({ rank = '부사령관', seed = 1 } = {}) {
  const baseLevel = startBaseLevel(rank);
  if (baseLevel === null) throw new RangeError('Defense is locked below 부사령관');
  return {
    rank, rng: seed | 0, time: 0, wave: 0, cleared: 0, phase: 'gap', gapLeft: WAVE_GAP_S,
    supply: START_SUPPLY, supplyTimer: 0, baseLevel, hearts: START_HEARTS, maxHearts: START_HEARTS,
    pads: PADS.map(() => null), bays: { transport: null, recon: null },
    mods: { supplyInterval: 1, supplyAmount: 0, allAttack: 0, line: { armor: 0, firepower: 0, air: 0 } },
    storedCards: 1, hand: null, rerolls: 1, evoTickets: 0, wavesWithoutEvo: 0,
    mines: [], skills: {}, enemies: [], queue: [], spawnTimer: 0, nextId: 1, warning: null,
    stats: { kills: 0, evolutions: 0, leaks: 0 },
    fx: [],   // 화면 연출용 최근 사격(최대 40개, 저장하지 않음)
  };
}

const fail = message => { throw new RangeError(message); };
const spend = (run, cost) => { if (run.supply < cost) fail('Not enough supply'); run.supply -= cost; };
const towerAt = (run, pad) => run.pads[pad] ?? fail('Empty defense pad');

export const towerId = t => t.stage < 2 ? LINES[t.line].path[t.stage] : LINES[t.line].path[2][t.branch];

// 레벨·카드·특성·지원 칸을 모두 반영한 지금 성능.
export function towerStats(run, t) {
  const base = TOWERS[towerId(t)], picks = traitsOf(t);
  const pick = key => picks.reduce((v, p) => p[key] ?? v, null);
  const add = key => picks.reduce((v, p) => v + (p[key] ?? 0), 0);
  const bay = run.bays.transport;
  const damage = base.damage * (1 + LEVEL_DAMAGE_STEP * (t.level - 1)) * (1 + run.mods.allAttack + run.mods.line[t.line])
    * (t.level >= MAX_LEVEL ? FINAL_LEVEL_FACTOR : 1);
  return {
    ...base, damage,
    range: base.range * (pick('range') ?? 1) * (bay?.branch === 'flyingFortress' ? 1.15 : 1),
    interval: base.interval / ((pick('speed') ?? 1) * (1 + 0.01 * (bay?.level ?? 0))),
    shots: (base.shots ?? 1) + add('shots'), pierce: (base.pierce ?? 1) + add('pierce'),
    splash: base.splash ? base.splash * (pick('splash') ?? 1) : 0,
    bossFactor: (base.bossFactor ?? 1) * (pick('bossFactor') ?? 1), airFactor: pick('airFactor') ?? 1,
    burn: base.burn ? [base.burn[0] * (pick('burnFactor') ?? 1), base.burn[1]] : pick('burnAdd'),
    burnSpread: pick('burnSpread') ?? 0, slow: pick('slow') ?? 0,
  };
}
// 고른 특성(Lv30 공통, Lv40 갈래).
export function traitsOf(t) {
  return TRAIT_LEVELS.flatMap(level => {
    const index = t.traits[level];
    if (index === undefined) return [];
    return level === 30 ? [COMMON_TRAITS[index]] : [BRANCH_TRAITS[towerId(t)][index]];
  });
}

export function build(run, pad, line) {
  if (!(pad in run.pads)) fail('Unknown defense pad');
  if (run.pads[pad]) fail('Pad is taken');
  const cost = buildCost(line);
  spend(run, cost);
  run.pads[pad] = { line, stage: 0, branch: null, level: 1, spent: cost, traits: {}, cooldown: 0, stunnedUntil: 0 };
  return run;
}
// 특성 선택이 남아 있으면 그 레벨을 넘어 올릴 수 없다.
const blockedAt = t => TRAIT_LEVELS.find(l => t.level >= l && t.traits[l] === undefined) ?? null;
export function upgrade(run, pad, times = 1) {
  const t = towerAt(run, pad);
  for (let i = 0; i < times; i++) {
    if (t.level >= MAX_LEVEL) fail('Already at max level');
    if (blockedAt(t)) fail('Choose a trait first');
    const cost = upgradeCost(LINES[t.line].buildCost, t.level);
    spend(run, cost);
    t.spent += cost; t.level += 1;
  }
  return run;
}
export function chooseTrait(run, pad, level, index) {
  const t = towerAt(run, pad);
  if (!TRAIT_LEVELS.includes(level) || t.level < level) fail('Trait level not reached');
  if (t.traits[level] !== undefined) fail('Trait already chosen');
  if (level === 40 && t.stage < 2) fail('Branch trait needs the second evolution');
  const list = level === 30 ? COMMON_TRAITS : BRANCH_TRAITS[towerId(t)];
  if (!list[index]) fail('Unknown trait');
  t.traits[level] = index;
  return run;
}
export function sell(run, pad) {
  const t = towerAt(run, pad);
  run.supply += sellRefund(t.spent);
  run.pads[pad] = null;
  return run;
}
// 옮기기는 무료. 옮길 자리에 장비가 있으면 서로 자리를 바꾼다.
export function move(run, from, to) {
  towerAt(run, from);
  if (!(to in run.pads)) fail('Unknown defense pad');
  [run.pads[from], run.pads[to]] = [run.pads[to], run.pads[from]];
  return run;
}

// 진화권 1장으로 진화. 레벨·특성·쓴 보급은 그대로.
export function evolve(run, target, branch = 0) {
  if (run.evoTickets < 1) fail('No evolution ticket');
  const ok = evolvable(run).some(e => e.pad === target.pad && e.bay === target.bay);
  if (!ok) fail('Target cannot evolve yet');
  if (target.bay) {
    const options = BAYS[target.bay].branches;
    if (!options[branch]) fail('Unknown branch');
    run.bays[target.bay].branch = options[branch];
  } else {
    const t = run.pads[target.pad];
    if (t.stage === 1 && ![0, 1].includes(branch)) fail('Unknown branch');
    if (t.stage === 1) t.branch = branch;
    t.stage += 1;
  }
  run.evoTickets -= 1; run.stats.evolutions += 1;
  return run;
}

export function upgradeBase(run) {
  if (run.baseLevel >= BASE_MAX_LEVEL) fail('Base at max level');
  spend(run, baseUpgradeCost(run.baseLevel + 1));
  run.baseLevel += 1;
  return run;
}
export function buildBay(run, bay) {
  if (run.bays[bay] === undefined) fail('Unknown support bay');
  if (run.bays[bay]) fail('Bay is built');
  const cost = bayBuildCost(bay);
  spend(run, cost);
  run.bays[bay] = { level: 1, spent: cost, branch: null };
  return run;
}
export function upgradeBay(run, bay, times = 1) {
  const b = run.bays[bay] ?? fail('Bay is not built');
  for (let i = 0; i < times; i++) {
    if (b.level >= MAX_LEVEL) fail('Already at max level');
    const cost = upgradeCost(BAYS[bay].buildCost, b.level);
    spend(run, cost);
    b.spent += cost; b.level += 1;
  }
  return run;
}

// 바로 부르기: 쉬는 시간에만. 남은 초 × 5 보급 후 바로 다음 웨이브.
export function callEarly(run) {
  if (run.phase !== 'gap') fail('Not between waves');
  run.supply += callEarlyBonus(run.gapLeft);
  run.gapLeft = 0;
  return run;
}

// 카드: 쌓인 카드를 열면 3장을 뽑고(전투 멈춤), 1장을 고르면 다시 진행.
export function openCards(run) {
  if (run.hand) return run;
  if (run.storedCards < 1) fail('No stored card');
  run.hand = drawCards(run);
  return run;
}
export function reroll(run) {
  if (!run.hand || run.rerolls < 1) fail('Cannot reroll');
  run.rerolls -= 1; run.hand = drawCards(run);
  return run;
}
export function pickCard(run, index) {
  const card = run.hand?.[index] ?? fail('No such card');
  applyCard(run, card);
  run.hand = null; run.storedCards -= 1;
  return run;
}
export const addStoredCards = (run, n) => { run.storedCards = Math.min(MAX_STORED_CARDS, run.storedCards + n); };

export { EVOLVE_LEVELS, BAY_EVOLVE_LEVEL };
