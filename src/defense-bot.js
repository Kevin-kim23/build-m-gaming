// 무한 방어전 자동 플레이(시험·밸런스용). 정해진 순서로 짓고, 가장 낮은 장비부터 강화하고, 카드는 우선순위로 고른다.
import { LINES } from './defense-data.js';
import { baseUpgradeCost, upgradeCost, buildCost, bayBuildCost } from './defense-economy.js';
import { build, upgrade, chooseTrait, evolve, upgradeBase, buildBay, upgradeBay, openCards, pickCard, callEarly } from './defense-run.js';
import { evolvable } from './defense-cards.js';
import { step, useIcbm } from './defense-combat.js';

const PLAN = [[1, 'firepower'], [2, 'armor'], [0, 'armor'], [5, 'air'], [3, 'firepower'], [4, 'air']];
const CARD_ORDER = ['evolve', 'allAttack', 'supplySpeed', 'supplyAmount', 'lineFocus', 'icbm', 'baseRepair', 'lifeExtend', 'mines'];

function think(run, { skill = 1 } = {}) {
  while (run.storedCards > 0) {
    openCards(run);
    const best = run.hand.map((c, i) => [CARD_ORDER.indexOf(c.id), i]).sort((a, b) => a[0] - b[0])[0][1];
    pickCard(run, best);
  }
  while (run.evoTickets > 0 && evolvable(run).length) evolve(run, evolvable(run).at(-1), 0);
  run.pads.forEach((t, i) => { if (t) for (const l of [30, 40]) if (t.level >= l && t.traits[l] === undefined && (l === 30 || t.stage === 2)) chooseTrait(run, i, l, 0); });
  for (const [pad, line] of PLAN) if (!run.pads[pad] && run.supply >= buildCost(line)) build(run, pad, line);
  if (!run.bays.transport && run.wave >= 8 && run.supply >= bayBuildCost('transport')) buildBay(run, 'transport');
  if (!run.bays.recon && run.wave >= 18 && run.supply >= bayBuildCost('recon')) buildBay(run, 'recon');
  if (run.baseLevel < 30 && run.supply >= baseUpgradeCost(run.baseLevel + 1) * (skill > 1 ? 1.2 : 2)) upgradeBase(run);
  for (let guard = 0; guard < 50; guard++) {
    const options = run.pads.map((t, i) => [t, i]).filter(([t]) => t && t.level < 50 && !(t.level >= 30 && t.traits[30] === undefined) && !(t.level >= 40 && t.traits[40] === undefined));
    const bayOpts = Object.entries(run.bays).filter(([, b]) => b && b.level < 50);
    const pad = options.sort((a, b) => a[0].level - b[0].level)[0];
    const padCost = pad ? upgradeCost(LINES[pad[0].line].buildCost, pad[0].level) : Infinity;
    const bay = bayOpts.sort((a, b) => a[1].level - b[1].level)[0];
    const bayCost = bay && bay[1].level < (pad?.[0].level ?? 99) ? upgradeCost(100, bay[1].level) : Infinity;
    if (bayCost <= run.supply && bayCost <= padCost) upgradeBay(run, bay[0]);
    else if (padCost <= run.supply) upgrade(run, pad[1]);
    else break;
  }
  if (run.skills.icbm?.ready === 0) {
    const target = run.enemies.find(e => e.boss) ?? run.enemies.sort((a, b) => b.dist - a.dist)[0];
    if (target && (target.boss || run.enemies.length > 8)) useIcbm(run, target.x, target.y);
  }
  if (skill > 1 && run.phase === 'gap' && run.enemies.length === 0 && run.wave % 10 !== 9) callEarly(run);
}

// 판이 끝날 때까지(또는 maxWave까지) 0.25초마다 생각하며 진행. 도달 웨이브를 돌려준다.
export function autoplay(run, { maxWave = 200, maxSeconds = 4 * 3600, skill = 1 } = {}) {
  while (run.phase !== 'over' && run.cleared < maxWave && run.time < maxSeconds) {
    think(run, { skill });
    step(run, 0.25);
  }
  return run.cleared;
}
