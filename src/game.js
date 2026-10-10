import { facilityOffer, facilityUpgradeOffer, withFacilityIncome } from './facilities.js';
import { isPotion, potionStatus, potionBonusMs, consumePotion, validPotionTime } from './potions.js';
export { parseSave } from './save.js';
import { MAX_GOLD, addMoney, subtractMoney, multiplyMoney, minMoney, compactMoney } from './money.js';
import { pacedRecruitCost } from './growth-balance.js';
export { MAX_GOLD, serializeSave } from './money.js';
import { rankForArmy } from "./ranks.js";
import { UNITS, armyPower, troopIncome, unitAccess } from "./units.js";
import { schoolOffer } from "./schools.js";
import { COMMAND_BATON, BULK_RECRUIT, bulkRecruitAccess, swordSkillStatus, autoTouchStatus, generalSwordDuration, generalRevolverDuration, withPersonalIncome, withPersonalEquipmentIncome } from "./personal-equipment.js";
import { personalUpgradeOffer } from './personal-enhancement.js';
import { settleAutoTouch } from './auto-touch.js';
import { withCampaignIncome } from './campaign-rewards.js';
import { reconcileAchievements } from "./achievements.js";
import {
  emptyEquipment,
  equipmentIncome,
  equipmentPurchaseOffer,
  enhancementOffer,
  equipmentOf,
  additionalEquipmentOffer,
  deployedEquipment, MAX_DEPLOYED_EQUIPMENT, deploymentOffer,
} from "./equipment.js";
export { UNITS, armyPower } from "./units.js";
export { RANKS, RANK_REQUIREMENTS, rankFor } from "./ranks.js";
export { SAVE_KEY, LEGACY_KEY, MAX_SOLDIERS, freshState } from './state.js';
import { MAX_SOLDIERS } from './state.js';
import { MAX_OFFLINE_MS } from './offline-rules.js';
export { MAX_OFFLINE_MS } from './offline-rules.js';
export const baseTapIncome = s => withPersonalIncome(s,withFacilityIncome(s,addMoney(addMoney(1,troopIncome(s,'tap')),withPersonalEquipmentIncome(s,equipmentIncome(s).tap)),'tap'),'tap');
export const perTap = (s, now = Date.now()) => multiplyMoney(baseTapIncome(s),swordSkillStatus(s,now).multiplier*potionStatus(s,'red',now).multiplier);
export const basePassiveIncome = (s) =>
  withPersonalIncome(s,withCampaignIncome(s, withFacilityIncome(s,addMoney(troopIncome(s, 'passive'),withPersonalEquipmentIncome(s,equipmentIncome(s).passive)),'passive')));
export const perSecond = (s, now = Date.now()) => multiplyMoney(basePassiveIncome(s),potionStatus(s,'blue',now).multiplier);
// Preserve early prices, but avoid exponential prices blocking battalion progression.
export const recruitCost = count => {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid recruit count');
  if (count < 64) return pacedRecruitCost(Math.ceil((Math.min(50*1.2**count,50+50*count+0.05*count*count)-1e-8)/10)*10,count,'soldier');
  const n=BigInt(count);
  return pacedRecruitCost(compactMoney(((1000n+1000n*n+n*n+199n)/200n)*10n),count,'soldier');
};
// Exact polynomial prices depend only on this unit's owned count.
function calculateUnitCost(owned, type) {
  if (type==='soldier') return recruitCost(owned);
  if (!Number.isSafeInteger(owned) || owned<0) throw new RangeError('Invalid recruit count');
  const price=UNITS[type]?.price;
  if(!price) throw new RangeError('Unknown recruit type');
  return pacedRecruitCost(addMoney(price[0],addMoney(multiplyMoney(price[1],owned),multiplyMoney(multiplyMoney(price[2],owned),owned))),owned,type);
}
const unitCosts = new Map();
export function unitCost(owned, type = 'soldier') {
  const cached = unitCosts.get(type);
  if(cached?.owned === owned) return cached.cost;
  const cost = calculateUnitCost(owned,type);
  unitCosts.set(type,{owned,cost});
  return cost;
}
function recruitUnit(type, quantity) {
  const unit = UNITS[type];
  if (!unit) throw new RangeError("Unknown recruit type");
  if (quantity !== 1 && (quantity !== COMMAND_BATON.recruitAmount || !BULK_RECRUIT[type]))
    throw new RangeError("Unsupported recruit quantity");
  return unit;
}
// One cache entry per supported type: repeated UI updates never sum 100 prices again.
const batchCosts = new Map();
function batchRecruitCost(owned, type) {
  let cached = batchCosts.get(type);
  if (!cached || cached.owned !== owned) {
    let cost = 0;
    for (let i = 0; i < COMMAND_BATON.recruitAmount; i++) cost = addMoney(cost, unitCost(owned + i, type));
    cached = { owned, cost };
    batchCosts.set(type, cached);
  }
  // Keep sums above the wallet limit unaffordable, rather than discounting them.
  return cached.cost;
}
export function recruitOffer(s, type = "soldier", quantity = 1) {
  const unit = recruitUnit(type, quantity), bulk = quantity > 1;
  const power = armyPower(s),
    owned = s[unit.field] ?? 0,
    cost = bulk ? batchRecruitCost(owned, type) : unitCost(owned, type);
  const baton = bulk ? bulkRecruitAccess(s, type) : null;
  const access = unitAccess(s, unit);
  const locked = !access.unlocked || (bulk && !baton.unlocked);
  const reason = locked
    ? "locked"
    : power + unit.power * quantity > MAX_SOLDIERS
      ? "limit"
      : s.gold < cost
        ? "gold"
        : null;
  return {
    unit,
    visible: bulk ? baton.visible : access.visible,
    requirement: bulk && !baton.unlocked ? baton.requirement : access.requirement,
    cost,
    owned,
    quantity,
    locked,
    reason,
    canBuy: reason === null,
  };
}
export function accrue(s, now = Date.now()) {
  const elapsed = Math.min(MAX_OFFLINE_MS, Math.max(0, Math.floor(now - s.lastAccrual)));
  if (!elapsed) return 0;
  // Split at the potion boundary, including capped offline time, without per-second loops.
  const bonusMs=potionBonusMs(s,'blue',s.lastAccrual,s.lastAccrual+elapsed);
  const scaled = addMoney(multiplyMoney(basePassiveIncome(s),elapsed+bonusMs),s.incomeRemainder);
  const earned = typeof scaled === 'bigint' ? compactMoney(scaled/1000n) : Math.floor(scaled/1000);
  const actual = minMoney(earned, subtractMoney(MAX_GOLD,s.gold));
  s.gold = addMoney(s.gold,actual);
  s.incomeRemainder = s.gold === MAX_GOLD ? 0 : Number(typeof scaled === 'bigint' ? scaled%1000n : scaled%1000);
  s.lastAccrual = now;
  const automatic = settleAutoTouch(s, now, baseTapIncome(s), MAX_GOLD);
  if (s.gold === MAX_GOLD) s.incomeRemainder = 0;
  return addMoney(actual,automatic);
}
export function tapGold(s, now = Date.now()) {
  accrue(s, now);
  if (s.gold >= MAX_GOLD || s.taps >= Number.MAX_SAFE_INTEGER) return 0;
  const earned = minMoney(perTap(s, now), subtractMoney(MAX_GOLD,s.gold));
  s.gold = addMoney(s.gold,earned);
  s.taps++;
  return earned;
}
export function usePotion(s, now=Date.now(), id) {
  if(!isPotion(id) || !validPotionTime(now))return {ok:false,reason:'invalid'};
  accrue(s,now);
  return consumePotion(s,id,now);
}
export function activateSword(s, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > 100_000_000_000_000)
    return { ok: false, reason: "time" };
  accrue(s, now);
  const skill = swordSkillStatus(s, now);
  if (!skill.canUse) return { ok: false, reason: skill.owned ? "cooldown" : "locked" };
  s.swordActivatedAt = Math.max(now, s.lastAccrual);
  s.swordDurationMs = generalSwordDuration(s);
  return { ok: true };
}
export function activateAutoTouch(s, now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > 100_000_000_000_000) return {ok:false,reason:'time'};
  accrue(s,now);
  const skill=autoTouchStatus(s,now);
  if(!skill.canUse)return {ok:false,reason:skill.owned?'cooldown':'locked'};
  s.autoTouchActivatedAt=Math.max(now,s.lastAccrual);s.autoTouchTicks=0;
  s.autoTouchDurationMs=generalRevolverDuration(s);
  return {ok:true};
}
export function enhancePersonalEquipment(s,now=Date.now(),id='commandBaton') {
  accrue(s,now);
  const offer=personalUpgradeOffer(s,id);
  if(!offer.canUpgrade)return {ok:false,reason:offer.reason};
  s.gold=subtractMoney(s.gold,offer.cost);
  s.personalLevels={...s.personalLevels,[id]:offer.nextLevel};
  return {ok:true,success:true,level:offer.nextLevel,cost:offer.cost};
}
export function recruit(s, now = Date.now(), type = "soldier", quantity = 1) {
  recruitUnit(type, quantity);
  accrue(s, now);
  const offer = recruitOffer(s, type, quantity);
  if (!offer.canBuy)
    return { ok: false, reason: offer.reason, cost: offer.cost };
  const { cost, unit } = offer;
  const previousRank = rankForArmy(s);
  s.gold = subtractMoney(s.gold,cost);
  s[unit.field] = (s[unit.field] ?? 0) + quantity;
  const rank = rankForArmy(s);
  const achievements = reconcileAchievements(s);
  return { ok: true, cost, rank, type, count: quantity, achievements, promoted: rank > previousRank };
}
export function upgradeSchool(s, now = Date.now(), id = 'nco') {
  schoolOffer(s,id); // Validate identifiers before settling or spending.
  accrue(s,now);
  const offer=schoolOffer(s,id);
  if(!offer.canBuy) return {ok:false,reason:offer.reason};
  s.gold = subtractMoney(s.gold,offer.cost);
  s[offer.school.field]=offer.nextLevel;
  return {ok:true,cost:offer.cost,level:offer.nextLevel};
}
// Settle the old income before every equipment mutation, using the same transaction as recruitment.
export function buyEquipment(s, now = Date.now(), id = "artillery") {
  accrue(s, now);
  const offer = equipmentPurchaseOffer(s, id);
  if (!offer.canBuy) return { ok: false, reason: offer.reason };
  const deployed = deployedEquipment(s).length < MAX_DEPLOYED_EQUIPMENT;
  s.gold = subtractMoney(s.gold,offer.cost);
  s.equipment = {
    ...emptyEquipment(),
    ...s.equipment,
    [id]: { level: 0, deployed, count: 1 },
  };
  return { ok: true, cost: offer.cost, deployed };
}
export function enhanceEquipment(s, now = Date.now(), id = "artillery") {
  accrue(s, now);
  const offer = enhancementOffer(s, id);
  if (!offer.canUpgrade) return { ok: false, reason: offer.reason };
  s.gold = subtractMoney(s.gold,offer.cost);
  equipmentOf(s, id).level++;
  return { ok: true, cost: offer.cost, level: equipmentOf(s, id).level };
}
export function buyAdditionalEquipment(s, now = Date.now(), id = 'artillery') {
  const offer = additionalEquipmentOffer(s, id);
  return { ok:false, reason:offer.reason };
}
export function setEquipmentDeployed(
  s,
  deployed,
  now = Date.now(),
  id = "artillery",
) {
  accrue(s, now);
  const gun = equipmentOf(s, id);
  if (!gun) return { ok: false, reason: "unowned" };
  if (typeof deployed !== "boolean") return { ok: false, reason: "invalid" };
  if (deployed && !deploymentOffer(s, id).canDeploy) return { ok: false, reason: 'capacity' };
  gun.deployed = deployed;
  return { ok: true, deployed };
}

export function buildFacility(s, now = Date.now(), id) {
  facilityOffer(s,id); // Validate before any accrual/mutation.
  accrue(s,now);
  const offer=facilityOffer(s,id);
  if(!offer.canBuy)return {ok:false,reason:offer.reason};
  s.gold=subtractMoney(s.gold,offer.cost);
  s.facilities=[...(s.facilities??[]),id];
  s.facilityLevels={...s.facilityLevels,[id]:1};
  return {ok:true,id};
}

export function upgradeFacility(s, now = Date.now(), id) {
  facilityUpgradeOffer(s,id); // Validate before any accrual/mutation.
  accrue(s,now);
  const offer=facilityUpgradeOffer(s,id);
  if(!offer.canUpgrade)return {ok:false,reason:offer.reason};
  s.gold=subtractMoney(s.gold,offer.cost);
  s.facilityLevels={...s.facilityLevels,[id]:offer.nextLevel};
  return {ok:true,id,cost:offer.cost,level:offer.nextLevel};
}
