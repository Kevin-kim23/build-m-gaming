import { rankForArmy, RANKS, catalogVisible } from "./ranks.js";
export const EQUIPMENT = Object.freeze({
  artillery: Object.freeze({
    id: "artillery",
    name: "견인포",
    unlockRank: "대위",
    cost: 1_000_000,
    maxLevel: 10,
    passive: 500,
    tap: 3000,
    passiveStep: 100,
    tapStep: 600,
  }),
  tank: Object.freeze({
    id: "tank",
    name: "전차",
    unlockRank: "소령",
    cost: 5_000_000,
    maxLevel: 10,
    passive: 2500,
    tap: 15000,
    passiveStep: 500,
    tapStep: 3000,
  }),
  selfPropelled: Object.freeze({
    id: "selfPropelled",
    name: "자주포",
    unlockRank: "중령",
    cost: 15_000_000,
    maxLevel: 10,
    passive: 8000,
    tap: 50000,
    passiveStep: 1600,
    tapStep: 10000,
  }),
});
export const ARTILLERY = EQUIPMENT.artillery;
export const EQUIPMENT_STAGES = Object.freeze([
  "기본형",
  "포신 보강",
  "제퇴기 장착",
  "방호판 확장",
  "차체 장갑",
  "지지대 보강",
  "포미 장갑",
  "조준 장치",
  "위장 장갑판",
  "통신 안테나",
  "최종 개량형",
]);
export function equipmentType(id = "artillery") {
  if (!EQUIPMENT[id]) throw new RangeError("Unknown equipment");
  return EQUIPMENT[id];
}
export function equipmentStats(level, id = "artillery") {
  const d = equipmentType(id);
  if (!Number.isInteger(level) || level < 0 || level > d.maxLevel)
    throw new RangeError("Invalid enhancement level");
  return {
    passive: d.passive + level * d.passiveStep,
    tap: d.tap + level * d.tapStep,
  };
}
export const emptyEquipment = () =>
  Object.fromEntries(Object.keys(EQUIPMENT).map((id) => [id, null]));
export const equipmentOf = (s, id = "artillery") => s.equipment?.[id] ?? null;
export const artilleryOf = (s) => equipmentOf(s);
export const visibleEquipment = (s) =>
  Object.values(EQUIPMENT).filter(
    (d) => catalogVisible(s, d.unlockRank) || equipmentOf(s, d.id),
  );
export const deployedEquipment = (s) =>
  Object.values(EQUIPMENT)
    .filter((d) => equipmentOf(s, d.id)?.deployed)
    .map((d) => ({ ...d, ...equipmentOf(s, d.id) }));
export function equipmentIncome(s) {
  return deployedEquipment(s).reduce(
    (sum, d) => {
      const stats = equipmentStats(d.level, d.id);
      return { passive: sum.passive + stats.passive, tap: sum.tap + stats.tap };
    },
    { passive: 0, tap: 0 },
  );
}
export function enhancementCost(level, id = "artillery") {
  const d = equipmentType(id);
  equipmentStats(level, id);
  return level === d.maxLevel
    ? null
    : Math.ceil(((d.cost / 4) * 1.4 ** level) / 10000) * 10000;
}
export function equipmentPurchaseOffer(s, id = "artillery") {
  const d = equipmentType(id),
    locked = rankForArmy(s) < RANKS.indexOf(d.unlockRank);
  const reason = equipmentOf(s, id)
    ? "owned"
    : locked
      ? "locked"
      : s.gold < d.cost
        ? "gold"
        : null;
  return {
    cost: d.cost,
    locked,
    reason,
    canBuy: reason === null,
    visible: catalogVisible(s, d.unlockRank) || !!equipmentOf(s, id),
  };
}
export function enhancementOffer(s, id = "artillery") {
  const gun = equipmentOf(s, id),
    cost = gun ? enhancementCost(gun.level, id) : null;
  const reason = !gun
    ? "unowned"
    : cost === null
      ? "max"
      : s.gold < cost
        ? "gold"
        : null;
  return { cost, reason, canUpgrade: reason === null };
}
export function validEquipment(value, legacy = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (legacy ? ["artillery"] : Object.keys(EQUIPMENT)).every((id) => {
    if (!Object.hasOwn(value, id)) return false;
    const g = value[id];
    return (
      g === null ||
      !!(
        g &&
        typeof g === "object" &&
        !Array.isArray(g) &&
        Number.isInteger(g.level) &&
        g.level >= 0 &&
        g.level <= 10 &&
        typeof g.deployed === "boolean"
      )
    );
  });
}
