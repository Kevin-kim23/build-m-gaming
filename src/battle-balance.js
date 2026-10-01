import { BATTALION_SIZE } from "./formations.js";
import { EQUIPMENT, MAX_EQUIPMENT_COUNT } from "./equipment.js";
import { campaignStages } from './campaign.js';

// 가로 전장 전투(0.45): 마나로 장비를 출격시켜 적 기지를 부순다. 수치는 모두 여기 한 곳에 둔다.
export const BATTLE_RULES = Object.freeze({
  stepMs: 50,
  maxFrameMs: 250,
  maxDurationMs: 180_000,
  laneLength: 1000,        // 전장 길이(왼쪽 아군 기지 0 ~ 오른쪽 적 기지 1000)
  manaMax: 100,
  manaStart: 40,
  manaPerSecond: 8,
  enemyFirstSpawnMs: 2500,
  healPercent: 0.12,       // 수송기가 주기마다 주변 아군에게 회복하는 최대 체력 비율
  turretRange: 280,        // 기지 포탑 사거리·간격·세기(전력 기준 배수)·요새 배율
  turretIntervalMs: 2000,
  turretPower: 10,
  fortressTurret: 2,
  strikeMultiplier: 2,     // ICBM 일제 타격: 1회 공격력의 배수(적 기지 직격)
});

export const STAGES = campaignStages;

const weaponBase = Object.freeze({
  railgunTank: {damage:180,intervalMs:2200},
  icbm: {damage:1200,intervalMs:9000},
  transport: { damage:0, healing:6, intervalMs:5000 },
  fighter: { damage:96, intervalMs:2600 },
  rocketLauncher: { damage: 48, intervalMs: 4200 },
  helicopter: { damage: 16, intervalMs: 1800 },
  artillery: { damage: 11, intervalMs: 2800 },
  tank: { damage: 12, intervalMs: 1900 },
  selfPropelled: { damage: 21, intervalMs: 3500 },
});

// 장비 특성: 분류·체력(전력 비례 기준)·이동 속도·사거리·마나 비용·재출격 대기. kind: unit(전진 전투) / heal(회복) / strike(즉시 타격)
export const UNIT_TRAITS = Object.freeze({
  artillery:      { cls: "firepower", kind: "unit",   hp: 100, speed: 48,  range: 300, cost: 18, cooldownMs: 3500 },
  tank:           { cls: "armor",     kind: "unit",   hp: 260, speed: 64,  range: 120, cost: 24, cooldownMs: 4500 },
  selfPropelled:  { cls: "firepower", kind: "unit",   hp: 150, speed: 45,  range: 340, cost: 30, cooldownMs: 6000 },
  rocketLauncher: { cls: "firepower", kind: "unit",   hp: 120, speed: 42,  range: 380, cost: 38, cooldownMs: 8000 },
  helicopter:     { cls: "air",       kind: "unit",   hp: 110, speed: 120,  range: 150, cost: 34, cooldownMs: 7000 },
  fighter:        { cls: "air",       kind: "unit",   hp: 130, speed: 176, range: 180, cost: 48, cooldownMs: 10000 },
  transport:      { cls: "support",   kind: "heal",   hp: 200, speed: 61,  range: 170, cost: 30, cooldownMs: 10000 },
  railgunTank:    { cls: "armor",     kind: "unit",   hp: 340, speed: 58,  range: 240, cost: 55, cooldownMs: 12000 },
  icbm:           { cls: "firepower", kind: "strike", hp: 1,   speed: 0,   range: 0,   cost: 80, cooldownMs: 22000 },
});
export const GEAR_CLASS = Object.freeze(Object.fromEntries(Object.entries(UNIT_TRAITS).map(([id, t]) => [id, t.cls])));
export const CLASS_NAMES = Object.freeze({ firepower: "화력", armor: "기갑", air: "공중", support: "지원" });

// 상성 삼각형: 공중 > 기갑 > 화력 > 공중. 유리 ×strong, 불리 ×weak(나라가 뒤로 갈수록 차이가 커진다).
export const CLASS_BEATS = Object.freeze({ air: "armor", armor: "firepower", firepower: "air" });
export const MATCHUP_BY_COUNTRY = Object.freeze([{ strong: 1.3, weak: 0.8 }, { strong: 1.4, weak: 0.7 }, { strong: 1.5, weak: 0.65 }, { strong: 1.6, weak: 0.6 }]);
export const FORTRESS_SHIELD = 0.6; // 수도 요새 기지: 방어 분류 장비의 피해가 40% 줄어듦
export const countryIndex = (stageId) => Math.floor((stageId - 1) / 20);
export function classMatchup(attackerClass, targetClass, stageId) {
  const m = MATCHUP_BY_COUNTRY[countryIndex(stageId)] ?? MATCHUP_BY_COUNTRY[0];
  return CLASS_BEATS[attackerClass] === targetClass ? m.strong : CLASS_BEATS[targetClass] === attackerClass ? m.weak : 1;
}

// 적 부대 유형: 지역 번호 순서로 돌아간다. pool은 적이 차례로 출격시키는 장비(분류가 한쪽으로 치우쳐 상성이 보인다).
export const ENEMY_TYPES = Object.freeze([
  { id: "armored", name: "기갑 부대", main: "armor", counter: "air", pool: ["tank", "tank", "selfPropelled", "tank", "helicopter"] },
  { id: "artilleryNest", name: "포병 진지", main: "firepower", counter: "armor", pool: ["artillery", "rocketLauncher", "artillery", "selfPropelled", "tank"] },
  { id: "airWing", name: "항공 부대", main: "air", counter: "firepower", pool: ["helicopter", "helicopter", "fighter", "helicopter", "artillery"] },
]);
export const stageEnemyType = (stageId) => ENEMY_TYPES[(stageId - 1) % ENEMY_TYPES.length];
export const isFortress = (stageId) => stageId % 20 === 0;
// 수도 요새 기지는 이 유형을 잡는 정석 분류(counter)의 피해를 줄인다 → 부대는 정석으로, 기지는 다른 분류로 부수는 전략.
export const fortressShieldClass = (stageId) => isFortress(stageId) ? stageEnemyType(stageId).counter : null;
// 호환: 장비 하나가 이 지역 적 유형에 얼마나 유리한가(준비 화면 표시용). 기지 방어 장갑은 따로 안내한다.
export function matchupMultiplier(stageId, gearId) {
  return classMatchup(GEAR_CLASS[gearId], stageEnemyType(stageId).main, stageId);
}

// 난이도 기준 장비(레벨, 보유 수량). 나라별 적 본부 체력 배율은 이 장비로 맞춘다.
export const REFERENCE_GEAR = Object.freeze([[8, 1], [12, 3], [16, 6], [20, 10]].map(Object.freeze));

export function combatScale(totalPower) {
  if (!Number.isFinite(totalPower) || totalPower <= 0)
    throw new RangeError("Invalid battle power");
  return totalPower / BATTALION_SIZE;
}

export function equipmentCombatStats(id, level, totalPower = BATTALION_SIZE, count = 1, playerUpgrades = true) {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_EQUIPMENT_COUNT) throw new RangeError("Invalid equipment count");
  const type = EQUIPMENT[id];
  if (!type || !Number.isInteger(level) || level < 0 || level > type.maxLevel)
    throw new RangeError("Invalid battle equipment");
  const base = weaponBase[id] ?? {
    damage: Math.max(5, Math.sqrt(type.passive) / 3),
    intervalMs: 3000,
  };
  const growth = 1 + level*.12 + (playerUpgrades ? Math.max(0,level-10)**2*.02 : 0);
  return {
    growth,
    damage: count * base.damage * growth * combatScale(totalPower),
    ...(base.healing ? { healing:count*base.healing*growth*combatScale(totalPower) } : {}),
    intervalMs: Math.max(
      BATTLE_RULES.stepMs,
      Math.round(base.intervalMs / (1 + level * 0.08) / BATTLE_RULES.stepMs) * BATTLE_RULES.stepMs,
    ),
  };
}

// 적 부대 1대가 아군 기준 장비 몇 문에 해당하는지(수량 배율). 아군 기준 장비(레벨·수량)와 같은 힘이 되도록
// 레벨 성장 차이를 보정하고, ENEMY_STRENGTH로 전체 난이도를 한 번에 조절한다.
export const ENEMY_STRENGTH = Object.freeze([1.1, 1.1, 1.1, 1.0]); // 나라별(세르딘~노르가드)
export function enemyStack(stageId, enemyLevel) {
  const [refLevel, refCount] = REFERENCE_GEAR[countryIndex(stageId)] ?? REFERENCE_GEAR[0];
  const growth = (level, upgrades) => 1 + level * .12 + (upgrades ? Math.max(0, level - 10) ** 2 * .02 : 0);
  return Math.max(1, Math.round(refCount * growth(refLevel, true) / growth(enemyLevel, false) * (ENEMY_STRENGTH[countryIndex(stageId)] ?? 1) * 100) / 100);
}
