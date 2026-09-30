import { rankForArmy, RANKS, catalogVisible } from "./ranks.js";
export const HELICOPTER_STAGES = Object.freeze([
  "기본형", "기수 장갑", "로켓 포드", "꼬리날개 확장", "동체 장갑",
  "미사일 장착", "엔진 보강", "탐지 센서", "위장 패널", "통신 안테나", "최종 개량형",
]);
export const ROCKET_STAGES = Object.freeze(['기본 발사차','차체 장갑','발사관 보강','안정 지지대','방호 패널','탄약 적재함','사격 통제기','탐지 센서','위장 장갑','통신 안테나','최종 개량형']);
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
  helicopter: Object.freeze({
    id: "helicopter", name: "공격헬기", unlockRank: "대령",
    cost: 45_000_000, maxLevel: 10,
    passive: 25000, tap: 150000, passiveStep: 5000, tapStep: 30000,
    stages: HELICOPTER_STAGES,
  }),
  rocketLauncher: Object.freeze({
    id: 'rocketLauncher', name: '다연장 로켓포', unlockRank: '준장',
    cost: 150_000_000, maxLevel: 10,
    passive: 75000, tap: 450000, passiveStep: 15000, tapStep: 90000,
    stages: ROCKET_STAGES,
  }),
});
export const MAX_DEPLOYED_EQUIPMENT = 4;
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
export function deploymentOffer(s, id) {
  const gun = equipmentOf(s, id);
  const reason = !gun ? 'unowned' : !gun.deployed && deployedEquipment(s).length >= MAX_DEPLOYED_EQUIPMENT ? 'capacity' : null;
  return { canDeploy: reason === null, reason };
}
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
export function validEquipment(value, legacy = false, includeHelicopter = true, includeRocket = true) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (legacy ? ["artillery"] : Object.keys(EQUIPMENT).filter(id => (includeHelicopter || id !== "helicopter") && (includeRocket || id !== "rocketLauncher"))).every((id) => {
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
