import { PERSONAL_EQUIPMENT, PERSONAL_MAX_LEVEL } from './personal-catalog.js';
import { personalStatus } from './personal-equipment.js';
import { multiplyMoney } from './money.js';

// Actual draws, UI and the published table share these exact percentages.
export const PERSONAL_UPGRADE_CHANCES = Object.freeze([100,95,90,80,70,60,50,40,30]);
export const PERSONAL_ROLL_SIZE = 10000;
export function personalUpgradeStep(id, level) {
  const item = PERSONAL_EQUIPMENT[id];
  if (!item || !Number.isInteger(level) || level<1 || level>=item.maxLevel) throw new RangeError('Invalid personal enhancement step');
  return { level, nextLevel:level+1, chance:PERSONAL_UPGRADE_CHANCES[level-1], cost:multiplyMoney(item.baseUpgradeCost,2**(level-1)) };
}
export function personalUpgradeOffer(state, id) {
  const status = personalStatus(state,id);
  const step = status.level>0 && status.level<PERSONAL_MAX_LEVEL ? personalUpgradeStep(id,status.level) : null;
  const reason = !status.owned ? 'locked' : !step ? 'max' : state.gold<step.cost ? 'gold' : null;
  return { ...status, ...step, cost:step?.cost??null, chance:step?.chance??null, reason, canUpgrade:reason===null };
}
export function personalRollSucceeds(level, roll) {
  if (!Number.isInteger(level) || level<1 || level>=PERSONAL_MAX_LEVEL || !Number.isInteger(roll) || roll<0 || roll>=PERSONAL_ROLL_SIZE)
    throw new RangeError('Invalid personal enhancement roll');
  return roll<PERSONAL_UPGRADE_CHANCES[level-1]*100;
}
// Rejection sampling avoids modulo bias. No rank, streak or hidden rate adjustment.
export function drawPersonalRoll(fill = values => crypto.getRandomValues(values)) {
  const values = new Uint32Array(1), limit = Math.floor(2**32/PERSONAL_ROLL_SIZE)*PERSONAL_ROLL_SIZE;
  do { fill(values); } while (values[0]>=limit);
  return values[0]%PERSONAL_ROLL_SIZE;
}
