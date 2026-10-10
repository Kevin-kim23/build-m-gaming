import { MILITARY_MAX_LEVEL } from './equipment-limits.js';
import { multiplyMoney, addMoney, scaleMoney, exact, compactMoney, minMoney, MAX_GOLD } from './money.js';
import { GALACTIC_EQUIPMENT } from './galactic-equipment.js';
import { LATE_EQUIPMENT } from './late-equipment-catalog.js';
import { rankForArmy, RANKS } from "./ranks.js";
import { divisionFlagStatus, enhancementLimitForFlag } from './personal-equipment.js';
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
    maxLevel: MILITARY_MAX_LEVEL,
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
    maxLevel: MILITARY_MAX_LEVEL,
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
    maxLevel: MILITARY_MAX_LEVEL,
    passive: 8000,
    tap: 50000,
    passiveStep: 1600,
    tapStep: 10000,
  }),
  helicopter: Object.freeze({
    id: "helicopter", name: "공격헬기", unlockRank: "대령",
    cost: 45_000_000, maxLevel: MILITARY_MAX_LEVEL,
    passive: 25000, tap: 150000, passiveStep: 5000, tapStep: 30000,
    stages: HELICOPTER_STAGES,
  }),
  rocketLauncher: Object.freeze({
    id: 'rocketLauncher', name: '다연장 로켓포', unlockRank: '준장',
    cost: 150_000_000, maxLevel: MILITARY_MAX_LEVEL,
    passive: 75000, tap: 450000, passiveStep: 15000, tapStep: 90000,
    stages: ROCKET_STAGES,
  }),
  transport: Object.freeze({
    id:'transport', name:'전술 수송기', unlockRank:'소장', introducedVersion:16,
    cost:450_000_000, maxLevel: MILITARY_MAX_LEVEL, passive:225000, tap:1350000, passiveStep:45000, tapStep:270000,
    stages:Object.freeze(['기본 수송기','동체 보강','보급 적재함','엔진 개량','날개 보강','투하 장치','통신 설비','항법 레이더','방어 장치','보급 통제실','최종 개량형']),
  }),
  fighter: Object.freeze({
    id:'fighter', name:'전투기', unlockRank:'중장', introducedVersion:16,
    cost:1_500_000_000, maxLevel: MILITARY_MAX_LEVEL, passive:750000, tap:4500000, passiveStep:150000, tapStep:900000,
    stages:Object.freeze(['기본 전투기','기수 장갑','기관포 보강','날개 보강','미사일 장착','엔진 개량','사격 통제기','탐지 레이더','위장 패널','전자전 장비','최종 개량형']),
  }),
  railgunTank: Object.freeze({
    id:'railgunTank',name:'레일건 전차',unlockRank:'대장',introducedVersion:20,
    cost:4_500_000_000,maxLevel: MILITARY_MAX_LEVEL,passive:2_250_000,tap:13_500_000,passiveStep:450_000,tapStep:2_700_000,
    stages:Object.freeze(['기본 레일건','레일 외장','청광 코어','궤도 보강','측면 방호판','포탑 장갑','에너지 패널','탐지 센서','은빛 장갑','통신 안테나','최종 개량형']),
  }),
  icbm: Object.freeze({
    id:'icbm',name:'대륙간 탄도미사일',shortName:'ICBM',unlockRank:'준원수',introducedVersion:20,
    cost:15_000_000_000,maxLevel: MILITARY_MAX_LEVEL,passive:7_500_000,tap:45_000_000,passiveStep:1_500_000,tapStep:9_000_000,
    stages:Object.freeze(['기본 ICBM','동체 외장','운반대 보강','차체 장갑','지지대 확장','기수 도장','관측 센서','지원 설비','위장 패널','통신 안테나','최종 개량형']),
  }),
  ...LATE_EQUIPMENT,
  ...GALACTIC_EQUIPMENT,
});
// The horizontal home map expands with the catalog. Battle deployment has its own limits.
export const MAX_DEPLOYED_EQUIPMENT = Object.keys(EQUIPMENT).length;
export const REPEAT_EQUIPMENT_LEVEL = 10;
export const equipmentLevelLimit = state => enhancementLimitForFlag(divisionFlagStatus(state).level);
export const equipmentStage = (id,level) => level <= 10 ? (EQUIPMENT[id].stages ?? EQUIPMENT_STAGES)[level] : ['금장 보강','빛나는 장갑','지휘 문양','은빛 광채','황금 코어','청광 패널','정예 문장','별빛 장갑','영광의 광채','최종 지휘관 사양','홍금 외장','루비 코어','홍금 보강판','태양 문양','진홍 장갑','홍염 동력부','황금 방호판','홍금 지휘 문장','태양의 광채','최종 홍금 사양','성운 외장','자수정 코어','은하 방호판','성운 문양','백금 장갑','성운 동력부','성광 방호판','은하 지휘 문장','초신성 광채','최종 은하 사양'][level-11];
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
    passive: addMoney(addMoney(d.passive,multiplyMoney(d.passiveStep,level)),scaleMoney(d.passive,3*level*level,100)),
    tap: addMoney(addMoney(d.tap,multiplyMoney(d.tapStep,level)),scaleMoney(d.tap,3*level*level,100)),
  };
}
export const emptyEquipment = () =>
  Object.fromEntries(Object.keys(EQUIPMENT).map((id) => [id, null]));
export const equipmentOf = (s, id = "artillery") => s.equipment?.[id] ?? null;
export const equipmentCount = (s, id) => equipmentOf(s, id)?.count ?? (equipmentOf(s, id) ? 1 : 0);
export const artilleryOf = (s) => equipmentOf(s);
export const visibleEquipment = () => Object.values(EQUIPMENT);
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
      return { passive: minMoney(MAX_GOLD,addMoney(sum.passive,multiplyMoney(stats.passive,count))), tap: minMoney(MAX_GOLD,addMoney(sum.tap,multiplyMoney(stats.tap,count))) };
    },
    { passive: 0, tap: 0 },
  );
}
export function enhancementCost(level, id = "artillery") {
  const d = equipmentType(id);
  equipmentStats(level, id);
  if (GALACTIC_EQUIPMENT[id]) {
    if(level===d.maxLevel)return null;
    const numerator=exact(d.cost)*118n**BigInt(level),denominator=4n*100n**BigInt(level)*10000n;
    return compactMoney((numerator+denominator-1n)/denominator*10000n);
  }
  if(level>=30){
    if(level===d.maxLevel)return null;
    const numerator=exact(d.cost)*7n**BigInt(level),denominator=4n*5n**BigInt(level)*10000n;
    return compactMoney((numerator+denominator-1n)/denominator*10000n);
  }
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
    visible: true,
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
  for (let step = 0; step < level; step++) cost = addMoney(cost,enhancementCost(step, id));
  return cost;
}
export function additionalEquipmentOffer(s, id) {
  equipmentType(id);
  return { cost:null, reason:'disabled', level:equipmentOf(s,id)?.level ?? 0, canBuy:false };
}
export function validEquipment(value, legacy = false, includeHelicopter = true, includeRocket = true, requireCount = false, includeAircraft = true, saveVersion=Infinity) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (legacy ? ["artillery"] : Object.keys(EQUIPMENT).filter(id => (EQUIPMENT[id].introducedVersion??0)<=saveVersion && (includeHelicopter || id !== "helicopter") && (includeRocket || id !== "rocketLauncher") && (includeAircraft || !EQUIPMENT[id].introducedVersion))).every((id) => {
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
        g.level <= (includeAircraft ? (saveVersion<30?20:saveVersion<35?30:EQUIPMENT[id].maxLevel) : 10) &&
        typeof g.deployed === "boolean" &&
        (!requireCount || (Number.isSafeInteger(g.count) && g.count >= 1 &&
          g.count <= MAX_EQUIPMENT_COUNT && (g.count === 1 || g.level >= REPEAT_EQUIPMENT_LEVEL)))
      )
    );
  });
}
