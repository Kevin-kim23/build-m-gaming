import { rankForArmy, catalogVisible, RANKS } from "./ranks.js";
import { UNITS, armyPower, troopIncome } from "./units.js";
import { FIELD_ARMY_SIZE } from "./formations.js";
import { STAGES } from "./battle-balance.js";
import { COMMAND_BATON, commandBatonStatus } from "./personal-equipment.js";
import { reconcileAchievements, validAchievementIds } from "./achievements.js";
import {
  emptyEquipment,
  equipmentIncome,
  equipmentPurchaseOffer,
  enhancementOffer,
  equipmentOf,
  EQUIPMENT,
  validEquipment,
} from "./equipment.js";
export { UNITS, armyPower } from "./units.js";
export { RANKS, RANK_REQUIREMENTS, rankFor } from "./ranks.js";
export const SAVE_KEY = "budae-kiugi-recruits-v3";
export const LEGACY_KEY = "budae-kiugi-tap-save-v2";
export const MAX_GOLD = 1_000_000_000_000;
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
export const MAX_SOLDIERS = FIELD_ARMY_SIZE * 4;
export const perTap = (s) => 1 + troopIncome(s, "tap") + equipmentIncome(s).tap;
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
  if (type === "staffSergeant")
    return Math.min(
      MAX_GOLD,
      1_000_000 + 350_000 * owned + 50_000 * owned * owned,
    );
  if (type !== "sergeant") throw new RangeError("Unknown recruit type");
  // A steeper, predictable curve without exponential late-game price walls.
  return Math.min(MAX_GOLD, 100_000 + 30_000 * owned + 3_000 * owned * owned);
}
function recruitUnit(type, quantity) {
  const unit = UNITS[type];
  if (!unit) throw new RangeError("Unknown recruit type");
  if (quantity !== 1 && (quantity !== COMMAND_BATON.recruitAmount || type !== "soldier"))
    throw new RangeError("Unsupported recruit quantity");
  return unit;
}
// One bounded cache avoids summing a hundred prices on every UI update.
let cachedSoldierCount = -1, cachedBatchCost = 0;
function batchRecruitCost(owned) {
  if (owned !== cachedSoldierCount) {
    let cost = 0;
    for (let i = 0; i < COMMAND_BATON.recruitAmount; i++) cost += unitCost(owned + i);
    cachedSoldierCount = owned;
    cachedBatchCost = cost;
  }
  // Do not cap the sum: a price above the wallet limit must remain unaffordable.
  return cachedBatchCost;
}
export function recruitOffer(s, type = "soldier", quantity = 1) {
  const unit = recruitUnit(type, quantity), bulk = quantity > 1;
  const power = armyPower(s),
    owned = s[unit.field] ?? 0,
    cost = bulk ? batchRecruitCost(owned) : unitCost(owned, type);
  const baton = bulk ? commandBatonStatus(s) : null;
  const locked = rankForArmy(s) < RANKS.indexOf(unit.unlockRank) || (bulk && !baton.owned);
  const reason = locked
    ? "locked"
    : power + unit.power * quantity > MAX_SOLDIERS
      ? "limit"
      : s.gold < cost
        ? "gold"
        : null;
  return {
    unit,
    visible: bulk ? baton.visible : catalogVisible(s, unit.unlockRank),
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
    version: 8,
    battleCleared: 0,
    earnedAchievements: [],
    gold: 0,
    taps: 0,
    soldiers: 0,
    sergeants: 0,
    staffSergeants: 0,
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
  const earned = Math.min(perTap(s), MAX_GOLD - s.gold);
  s.gold += earned;
  s.taps++;
  return earned;
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
      ![3, 4, 5, 6, 7, 8].includes(s.version) ||
      (s.version >= 7 && !integer(s.battleCleared, STAGES.length)) ||
      (s.version >= 8 && !validAchievementIds(s.earnedAchievements)) ||
      !integer(s.gold, MAX_GOLD) ||
      !integer(s.taps, Number.MAX_SAFE_INTEGER) ||
      !integer(s.soldiers, MAX_SOLDIERS) ||
      (s.version >= 4 && !integer(s.sergeants, MAX_SOLDIERS / 10)) ||
      (s.version >= 6 && !integer(s.staffSergeants, MAX_SOLDIERS / 20)) ||
      (s.version >= 5 && !validEquipment(s.equipment, s.version === 5)) ||
      !integer(s.lastAccrual, 100_000_000_000_000) ||
      !integer(s.incomeRemainder, 999) ||
      !integer(s.revision, Number.MAX_SAFE_INTEGER)
    )
      return null;
    const migrated = {
      version: 8,
      battleCleared: s.version >= 7 ? s.battleCleared : 0,
      earnedAchievements: s.version >= 8 ? [...s.earnedAchievements] : [],
      gold: s.gold,
      taps: s.taps,
      soldiers: s.soldiers,
      sergeants: s.version >= 4 ? s.sergeants : 0,
      staffSergeants: s.version >= 6 ? s.staffSergeants : 0,
      equipment: emptyEquipment(),
      sound: s.sound,
      lastAccrual: s.lastAccrual,
      incomeRemainder: s.incomeRemainder,
      revision: s.revision,
    };
    if (armyPower(migrated) > MAX_SOLDIERS) return null;
    for (const id of Object.keys(EQUIPMENT)) {
      const gun =
        s.version >= 5 && (s.version >= 6 || id === "artillery")
          ? s.equipment[id]
          : null;
      if (gun)
        migrated.equipment[id] = { level: gun.level, deployed: gun.deployed };
    }
    reconcileAchievements(migrated);
    return migrated;
  } catch {
    return null;
  }
}
// Settle the old income before every equipment mutation, using the same transaction as recruitment.
export function buyEquipment(s, now = Date.now(), id = "artillery") {
  accrue(s, now);
  const offer = equipmentPurchaseOffer(s, id);
  if (!offer.canBuy) return { ok: false, reason: offer.reason };
  s.gold -= offer.cost;
  s.equipment = {
    ...emptyEquipment(),
    ...s.equipment,
    [id]: { level: 0, deployed: true },
  };
  return { ok: true, cost: offer.cost };
}
export function enhanceEquipment(s, now = Date.now(), id = "artillery") {
  accrue(s, now);
  const offer = enhancementOffer(s, id);
  if (!offer.canUpgrade) return { ok: false, reason: offer.reason };
  s.gold -= offer.cost;
  equipmentOf(s, id).level++;
  return { ok: true, cost: offer.cost, level: equipmentOf(s, id).level };
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
  gun.deployed = deployed;
  return { ok: true, deployed };
}
