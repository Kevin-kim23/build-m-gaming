import { rankForArmy } from "./ranks.js";
import { UNITS, armyPower, troopIncome, unitAccess } from "./units.js";
import { schoolOffer, legacySchoolLevel } from "./schools.js";
import { FIELD_ARMY_SIZE } from "./formations.js";
import { STAGES } from "./battle-balance.js";
import { COMMAND_BATON, BULK_RECRUIT, bulkRecruitAccess, swordSkillStatus } from "./personal-equipment.js";
import { reconcileAchievements, validAchievementIds } from "./achievements.js";
import {
  emptyEquipment,
  equipmentIncome,
  equipmentPurchaseOffer,
  enhancementOffer,
  equipmentOf,
  equipmentCount, additionalEquipmentOffer,
  EQUIPMENT,
  deployedEquipment, MAX_DEPLOYED_EQUIPMENT, deploymentOffer,
  validEquipment,
} from "./equipment.js";
import { FIELD_THEMES } from './field-theme.js';
export { UNITS, armyPower } from "./units.js";
export { RANKS, RANK_REQUIREMENTS, rankFor } from "./ranks.js";
export const SAVE_KEY = "budae-kiugi-recruits-v3";
export const LEGACY_KEY = "budae-kiugi-tap-save-v2";
export const MAX_GOLD = 1_000_000_000_000;
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const MAX_SOLDIERS = FIELD_ARMY_SIZE * 4;
export const perTap = (s, now = Date.now()) =>
  (1 + troopIncome(s, "tap") + equipmentIncome(s).tap) * swordSkillStatus(s, now).multiplier;
export const perSecond = (s) =>
  troopIncome(s, "passive") + equipmentIncome(s).passive;
// Preserve early prices, but avoid exponential prices blocking battalion progression.
export const recruitCost = (count) => {
  const earlyPrice = 50 * 1.2 ** count;
  const gradualPrice = 50 + 50 * count + 0.05 * count * count;
  return Math.min(
    MAX_GOLD,
    Math.ceil((Math.min(earlyPrice, gradualPrice) - 1e-8) / 10) * 10,
  );
};
// Each price uses only the owned count of that exact unit type.
export function unitCost(owned, type = "soldier") {
  if (type === "soldier") return recruitCost(owned);
  const price = UNITS[type]?.price;
  if (!price) throw new RangeError("Unknown recruit type");
  return Math.min(MAX_GOLD, price[0] + price[1] * owned + price[2] * owned * owned);
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
    for (let i = 0; i < COMMAND_BATON.recruitAmount; i++) cost += unitCost(owned + i, type);
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
    version: 13,
    fieldTheme: 'earth',
    swordActivatedAt: null,
    ncoSchoolLevel: 0,
    officerSchoolLevel: 0,
    battleCleared: 0,
    earnedAchievements: [],
    gold: 0,
    taps: 0,
    soldiers: 0,
    sergeants: 0,
    staffSergeants: 0,
    masterSergeants: 0,
    sergeantMajors: 0,
    lieutenants: 0,
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
  const wholeSeconds = Math.floor(elapsed / 1000);
  const income = perSecond(s);
  const fraction = s.incomeRemainder + (elapsed % 1000) * income;
  const earned = wholeSeconds * income + Math.floor(fraction / 1000);
  const actual = Math.min(earned, MAX_GOLD - s.gold);
  s.gold += actual;
  s.incomeRemainder = s.gold === MAX_GOLD ? 0 : fraction % 1000;
  s.lastAccrual = now;
  return actual;
}
export function tapGold(s, now = Date.now()) {
  accrue(s, now);
  if (s.gold >= MAX_GOLD || s.taps >= Number.MAX_SAFE_INTEGER) return 0;
  const earned = Math.min(perTap(s, now), MAX_GOLD - s.gold);
  s.gold += earned;
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
  return { ok: true };
}
export function recruit(s, now = Date.now(), type = "soldier", quantity = 1) {
  recruitUnit(type, quantity);
  accrue(s, now);
  const offer = recruitOffer(s, type, quantity);
  if (!offer.canBuy)
    return { ok: false, reason: offer.reason, cost: offer.cost };
  const { cost, unit } = offer;
  const previousRank = rankForArmy(s);
  s.gold -= cost;
  s[unit.field] = (s[unit.field] ?? 0) + quantity;
  const rank = rankForArmy(s);
  const achievements = reconcileAchievements(s);
  return { ok: true, cost, rank, type, count: quantity, achievements, promoted: rank > previousRank };
}
export function parseSave(raw, now = Date.now()) {
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s.sound !== "boolean") return null;
    if (s.version === 2) {
      if (
        !Number.isSafeInteger(s.gold) ||
        s.gold < 0 ||
        s.gold !== s.taps ||
        s.rank !== 0
      )
        return null;
      return {
        ...freshState(now),
        gold: Math.min(s.gold, MAX_GOLD),
        taps: s.taps,
        sound: s.sound,
      };
    }
    const integer = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;
    if (
      ![3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(s.version) ||
      (s.version >= 12 && (typeof s.fieldTheme !== 'string' || !Object.hasOwn(FIELD_THEMES, s.fieldTheme))) ||
      (s.version >= 11 && !(s.swordActivatedAt === null || integer(s.swordActivatedAt, 100_000_000_000_000))) ||
      (s.version >= 9 && (!integer(s.ncoSchoolLevel,5) || !integer(s.officerSchoolLevel,1) ||
        (s.officerSchoolLevel>0 && s.ncoSchoolLevel!==5) ||
        !['masterSergeant','sergeantMajor','lieutenant'].every(id=>integer(s[UNITS[id].field],Math.floor(MAX_SOLDIERS/UNITS[id].power))))) ||
      (s.version >= 7 && !integer(s.battleCleared, STAGES.length)) ||
      (s.version >= 8 && !validAchievementIds(s.earnedAchievements)) ||
      !integer(s.gold, MAX_GOLD) ||
      !integer(s.taps, Number.MAX_SAFE_INTEGER) ||
      !integer(s.soldiers, MAX_SOLDIERS) ||
      (s.version >= 4 && !integer(s.sergeants, MAX_SOLDIERS / 10)) ||
      (s.version >= 6 && !integer(s.staffSergeants, MAX_SOLDIERS / 20)) ||
      (s.version >= 5 && !validEquipment(s.equipment, s.version === 5, s.version >= 10, s.version >= 12, s.version >= 13)) ||
      !integer(s.lastAccrual, 100_000_000_000_000) ||
      !integer(s.incomeRemainder, 999) ||
      !integer(s.revision, Number.MAX_SAFE_INTEGER)
    )
      return null;
    const migrated = {
      version: 13,
      fieldTheme: s.version >= 12 ? s.fieldTheme : 'earth',
      swordActivatedAt: s.version >= 11 ? s.swordActivatedAt : null,
      ncoSchoolLevel: s.version >= 9 ? s.ncoSchoolLevel : 0,
      officerSchoolLevel: s.version >= 9 ? s.officerSchoolLevel : 0,
      battleCleared: s.version >= 7 ? s.battleCleared : 0,
      earnedAchievements: s.version >= 8 ? [...s.earnedAchievements] : [],
      gold: s.gold,
      taps: s.taps,
      soldiers: s.soldiers,
      sergeants: s.version >= 4 ? s.sergeants : 0,
      staffSergeants: s.version >= 6 ? s.staffSergeants : 0,
      masterSergeants: s.version >= 9 ? s.masterSergeants : 0,
      sergeantMajors: s.version >= 9 ? s.sergeantMajors : 0,
      lieutenants: s.version >= 9 ? s.lieutenants : 0,
      equipment: emptyEquipment(),
      sound: s.sound,
      lastAccrual: s.lastAccrual,
      incomeRemainder: s.incomeRemainder,
      revision: s.revision,
    };
    if (armyPower(migrated) > MAX_SOLDIERS) return null;
    if (s.version < 9) migrated.ncoSchoolLevel = legacySchoolLevel(migrated);
    for (const id of Object.keys(EQUIPMENT)) {
      const gun =
        s.version >= 5 && (s.version >= 6 || id === "artillery") && (id !== "helicopter" || s.version >= 10) && (id !== "rocketLauncher" || s.version >= 12)
          ? s.equipment[id]
          : null;
      if (gun)
        migrated.equipment[id] = { level: gun.level, deployed: gun.deployed, count: s.version >= 13 ? gun.count : 1 };
    }
    if (deployedEquipment(migrated).length > MAX_DEPLOYED_EQUIPMENT) return null;
    reconcileAchievements(migrated);
    return migrated;
  } catch {
    return null;
  }
}
export function upgradeSchool(s, now = Date.now(), id = 'nco') {
  schoolOffer(s,id); // Validate identifiers before settling or spending.
  accrue(s,now);
  const offer=schoolOffer(s,id);
  if(!offer.canBuy) return {ok:false,reason:offer.reason};
  s.gold-=offer.cost;
  s[offer.school.field]=offer.nextLevel;
  return {ok:true,cost:offer.cost,level:offer.nextLevel};
}
// Settle the old income before every equipment mutation, using the same transaction as recruitment.
export function buyEquipment(s, now = Date.now(), id = "artillery") {
  accrue(s, now);
  const offer = equipmentPurchaseOffer(s, id);
  if (!offer.canBuy) return { ok: false, reason: offer.reason };
  const deployed = deployedEquipment(s).length < MAX_DEPLOYED_EQUIPMENT;
  s.gold -= offer.cost;
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
  s.gold -= offer.cost;
  equipmentOf(s, id).level++;
  return { ok: true, cost: offer.cost, level: equipmentOf(s, id).level };
}
export function buyAdditionalEquipment(s, now = Date.now(), id = 'artillery') {
  additionalEquipmentOffer(s, id); // Validate the identifier before settling income.
  accrue(s, now);
  const offer = additionalEquipmentOffer(s, id);
  if (!offer.canBuy) return { ok: false, reason: offer.reason };
  s.gold -= offer.cost;
  const gun = equipmentOf(s, id);
  gun.count = equipmentCount(s, id) + 1;
  return { ok: true, cost: offer.cost, count: gun.count, level: gun.level, deployed: gun.deployed };
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
