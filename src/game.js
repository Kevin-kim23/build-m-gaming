export { parseSave } from './save.js';
import { ADVANCED_OFFICERS } from './advanced-officers.js';
import { MAX_GOLD, addMoney, subtractMoney, multiplyMoney, minMoney, compactMoney } from './money.js';
export { MAX_GOLD, serializeSave } from './money.js';
import { rankForArmy } from "./ranks.js";
import { UNITS, armyPower, troopIncome, unitAccess } from "./units.js";
import { NEW_OFFICER_GRADES } from './officer-progression.js';
import { schoolOffer } from "./schools.js";
import { ALLIED_ARMY_SIZE } from "./formations.js";
import { COMMAND_BATON, BULK_RECRUIT, bulkRecruitAccess, swordSkillStatus, autoTouchStatus, GENERAL_SWORD, generalSwordDuration } from "./personal-equipment.js";
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
export const SAVE_KEY = "budae-kiugi-recruits-v3";
export const LEGACY_KEY = "budae-kiugi-tap-save-v2";
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const MAX_SOLDIERS = ALLIED_ARMY_SIZE * 4;
export const perTap = (s, now = Date.now()) =>
  (1 + troopIncome(s, "tap") + equipmentIncome(s).tap) * swordSkillStatus(s, now).multiplier;
export const perSecond = (s) =>
  withCampaignIncome(s, troopIncome(s, "passive") + equipmentIncome(s).passive);
// Preserve early prices, but avoid exponential prices blocking battalion progression.
export const recruitCost = count => {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid recruit count');
  if (count < 64) return Math.ceil((Math.min(50*1.2**count,50+50*count+0.05*count*count)-1e-8)/10)*10;
  const n=BigInt(count);
  return minMoney(MAX_GOLD, compactMoney(((1000n+1000n*n+n*n+199n)/200n)*10n));
};
// Exact polynomial prices depend only on this unit's owned count.
function calculateUnitCost(owned, type) {
  if (type==='soldier') return recruitCost(owned);
  if (!Number.isSafeInteger(owned) || owned<0) throw new RangeError('Invalid recruit count');
  const price=UNITS[type]?.price;
  if(!price) throw new RangeError('Unknown recruit type');
  return minMoney(MAX_GOLD,addMoney(price[0],addMoney(multiplyMoney(price[1],owned),multiplyMoney(multiplyMoney(price[2],owned),owned))));
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
export function freshState(now = Date.now()) {
  return {
    version: 18,
    fieldTheme: 'earth',
    swordActivatedAt: null,
    swordDurationMs: GENERAL_SWORD.durationMs,
    autoTouchActivatedAt: null,
    autoTouchTicks: 0,
    ncoSchoolLevel: 0,
    officerSchoolLevel: 0,
    advancedSchoolLevel: 0,
    battleCleared: 0,
    campaignCleared: 0,
    earnedAchievements: [],
    gold: 0,
    taps: 0,
    soldiers: 0,
    sergeants: 0,
    staffSergeants: 0,
    masterSergeants: 0,
    sergeantMajors: 0,
    lieutenants: 0,
    ...Object.fromEntries([...NEW_OFFICER_GRADES,...ADVANCED_OFFICERS].map(unit=>[unit.field,0])),
    equipment: emptyEquipment(),
    sound: false,
    lastAccrual: now,
    incomeRemainder: 0,
    revision: 0,
  };
}
export function accrue(s, now = Date.now()) {
  const elapsed = Math.min(MAX_OFFLINE_MS, Math.max(0, Math.floor(now - s.lastAccrual)));
  if (!elapsed) return 0;
  const scaled = addMoney(multiplyMoney(perSecond(s),elapsed),s.incomeRemainder);
  const earned = typeof scaled === 'bigint' ? compactMoney(scaled/1000n) : Math.floor(scaled/1000);
  const actual = minMoney(earned, subtractMoney(MAX_GOLD,s.gold));
  s.gold = addMoney(s.gold,actual);
  s.incomeRemainder = s.gold === MAX_GOLD ? 0 : Number(typeof scaled === 'bigint' ? scaled%1000n : scaled%1000);
  s.lastAccrual = now;
  const automatic = settleAutoTouch(s, now, 1 + troopIncome(s, 'tap') + equipmentIncome(s).tap, MAX_GOLD);
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
  return {ok:true};
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
