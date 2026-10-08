import { PERSONAL_EQUIPMENT, PERSONAL_MAX_LEVEL } from './personal-catalog.js';
import { personalStatus } from './personal-equipment.js';
import { multiplyMoney, scaleMoney } from './money.js';

// Quotes are calculated once. UI, transactions and the published guide share them.
// Preserve early costs; later steps grow by an exact 8/5, without floating-point gold.
const steps = Object.fromEntries(Object.values(PERSONAL_EQUIPMENT).map(item => {
  let cost = item.baseUpgradeCost;
  return [item.id, Object.freeze(Array.from({length:item.maxLevel-1}, (_, index) => {
    if (index) cost = index < 10 ? multiplyMoney(cost,2) : scaleMoney(cost,8,5);
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
  const step = status.level>0 && status.level<PERSONAL_MAX_LEVEL ? personalUpgradeStep(id,status.level) : null;
  const reason = !status.owned ? 'locked' : !step ? 'max' : state.gold<step.cost ? 'gold' : null;
  return { ...status, ...step, cost:step?.cost??null, reason, canUpgrade:reason===null };
}
