import { PERSONAL_EQUIPMENT } from './personal-catalog.js';
import { personalStatus } from './personal-equipment.js';
import { multiplyMoney, scaleMoney } from './money.js';

// Quotes are calculated once. UI, transactions and the published guide share them.
// Preserve early costs; later steps grow by an exact 8/5, without floating-point gold.
// Galactic progression starts with all eight items at Lv.20. Lv.21 has a new
// economy anchor, then costs double per level; no rank gate and no random roll.
export const GALACTIC_PERSONAL_COSTS = Object.freeze(Object.fromEntries(
  Object.keys(PERSONAL_EQUIPMENT).map((id,i)=>[id,BigInt([20,30,40,50,60,70,80,100][i])*10_000_000_000_000_000n])));
const steps = Object.fromEntries(Object.values(PERSONAL_EQUIPMENT).map(item => {
  let cost = item.baseUpgradeCost;
  return [item.id, Object.freeze(Array.from({length:item.maxLevel-1}, (_, index) => {
    if (index===19) cost=GALACTIC_PERSONAL_COSTS[item.id];
    else if (item.id==='divisionFlag' && index>=29) cost=scaleMoney(cost,index===29?2:3,index===29?1:2);
    else if (index) cost = index < 10 || index>19 ? multiplyMoney(cost,2) : scaleMoney(cost,8,5);
    return Object.freeze({level:index+1,nextLevel:index+2,cost});
  }))];
}));
export function personalUpgradeStep(id, level) {
  const item = PERSONAL_EQUIPMENT[id];
  if (!item || !Number.isInteger(level) || level<1 || level>=item.maxLevel) throw new RangeError('Invalid personal enhancement step');
  return steps[id][level-1];
}
export function personalUpgradeOffer(state, id) {
  const status = personalStatus(state,id);
  const step = status.level>0 && status.level<PERSONAL_EQUIPMENT[id].maxLevel ? personalUpgradeStep(id,status.level) : null;
  const reason = !status.owned ? 'locked' : !step ? 'max' : state.gold<step.cost ? 'gold' : null;
  return { ...status, ...step, cost:step?.cost??null, reason, canUpgrade:reason===null };
}
