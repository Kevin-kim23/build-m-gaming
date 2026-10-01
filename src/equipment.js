import { multiplyMoney } from './money.js';
import { rankForArmy, RANKS, catalogVisible } from "./ranks.js";
import { divisionFlagStatus } from './personal-equipment.js';
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
    maxLevel: 20,
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
    maxLevel: 20,
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
    maxLevel: 20,
    passive: 8000,
    tap: 50000,
    passiveStep: 1600,
    tapStep: 10000,
  }),
  helicopter: Object.freeze({
    id: "helicopter", name: "공격헬기", unlockRank: "대령",
    cost: 45_000_000, maxLevel: 20,
    passive: 25000, tap: 150000, passiveStep: 5000, tapStep: 30000,
    stages: HELICOPTER_STAGES,
  }),
  rocketLauncher: Object.freeze({
    id: 'rocketLauncher', name: '다연장 로켓포', unlockRank: '준장',
    cost: 150_000_000, maxLevel: 20,
    passive: 75000, tap: 450000, passiveStep: 15000, tapStep: 90000,
    stages: ROCKET_STAGES,
  }),
  transport: Object.freeze({
    id:'transport', name:'전술 수송기', unlockRank:'소장', introducedVersion:16,
    cost:450_000_000, maxLevel:20, passive:225000, tap:1350000, passiveStep:45000, tapStep:270000,
    stages:Object.freeze(['기본 수송기','동체 보강','보급 적재함','엔진 개량','날개 보강','투하 장치','통신 설비','항법 레이더','방어 장치','보급 통제실','최종 개량형']),
  }),
  fighter: Object.freeze({
    id:'fighter', name:'전투기', unlockRank:'중장', introducedVersion:16,
    cost:1_500_000_000, maxLevel:20, passive:750000, tap:4500000, passiveStep:150000, tapStep:900000,
    stages:Object.freeze(['기본 전투기','기수 장갑','기관포 보강','날개 보강','미사일 장착','엔진 개량','사격 통제기','탐지 레이더','위장 패널','전자전 장비','최종 개량형']),
  }),
});
export const MAX_DEPLOYED_EQUIPMENT = 4;
export const REPEAT_EQUIPMENT_LEVEL = 10;
export const equipmentLevelLimit = state => divisionFlagStatus(state).level >= 2 ? 20 : 10;
export const equipmentStage = (id,level) => level <= 10 ? (EQUIPMENT[id].stages ?? EQUIPMENT_STAGES)[level] : ['금장 보강','빛나는 장갑','지휘 문양','은빛 광채','황금 코어','청광 패널','정예 문장','별빛 장갑','영광의 광채','최종 지휘관 사양'][level-11];
// Income saturates at the wallet limit before large offline multiplications.
export const MAX_EQUIPMENT_COUNT = 100_000;
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
export const equipmentCount = (s, id) => equipmentOf(s, id)?.count ?? (equipmentOf(s, id) ? 1 : 0);
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
      const count = equipmentCount(s, d.id);
      return { passive: sum.passive + stats.passive * count, tap: sum.tap + stats.tap * count };
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
    limit = equipmentLevelLimit(s),
    cost = gun && gun.level < limit ? multiplyMoney(enhancementCost(gun.level, id),equipmentCount(s,id)) : null;
  const reason = !gun
    ? "unowned"
    : cost === null
      ? "max"
      : s.gold < cost
        ? "gold"
        : null;
  return { cost, reason, limit, canUpgrade: reason === null };
}
export function additionalEquipmentCost(id, level = REPEAT_EQUIPMENT_LEVEL) {
  const d = equipmentType(id);
  equipmentStats(level,id);
  let cost = d.cost;
  for (let step = 0; step < level; step++) cost += enhancementCost(step, id);
  return cost;
}
export function additionalEquipmentOffer(s, id) {
  const d = equipmentType(id), gun = equipmentOf(s, id), level = Math.max(REPEAT_EQUIPMENT_LEVEL,gun?.level ?? 0), cost = additionalEquipmentCost(id,level);
  const reason = !gun ? 'unowned'
    : !divisionFlagStatus(s).owned ? 'locked'
    : gun.level < REPEAT_EQUIPMENT_LEVEL ? 'enhancement'
    : equipmentCount(s, id) >= MAX_EQUIPMENT_COUNT ? 'limit'
    : s.gold < cost ? 'gold' : null;
  return { cost, reason, level, canBuy: reason === null };
}
export function validEquipment(value, legacy = false, includeHelicopter = true, includeRocket = true, requireCount = false, includeAircraft = true) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (legacy ? ["artillery"] : Object.keys(EQUIPMENT).filter(id => (includeHelicopter || id !== "helicopter") && (includeRocket || id !== "rocketLauncher") && (includeAircraft || !EQUIPMENT[id].introducedVersion))).every((id) => {
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
        g.level <= (includeAircraft ? EQUIPMENT[id].maxLevel : 10) &&
        typeof g.deployed === "boolean" &&
        (!requireCount || (Number.isSafeInteger(g.count) && g.count >= 1 &&
          g.count <= MAX_EQUIPMENT_COUNT && (g.count === 1 || g.level >= REPEAT_EQUIPMENT_LEVEL)))
      )
    );
  });
}
