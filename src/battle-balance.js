import { BATTALION_SIZE } from "./formations.js";
import { EQUIPMENT, MAX_EQUIPMENT_COUNT } from "./equipment.js";
import { campaignStages } from './campaign.js';

export const BATTLE_RULES = Object.freeze({
  stepMs: 50,
  maxFrameMs: 250,
  enemyVolleyMs: 1800,
  maxDurationMs: 180_000,
  specialFirstReadyMs: 8000,
  specialCooldownMs: 14000,
  specialMultiplier: 8,
});

export const STAGES = campaignStages;

// Enemy loadouts stay explicit so catalog additions do not silently raise stage difficulty.
export const ENEMY_EQUIPMENT = Object.freeze(["artillery", "tank", "selfPropelled"]);

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
export function combatScale(totalPower) {
  if (!Number.isFinite(totalPower) || totalPower <= 0)
    throw new RangeError("Invalid battle power");
  return totalPower / BATTALION_SIZE;
}

// 적 보병 사격 세기(적 전용). 아군은 병력을 전투에 내보내지 않는다(0.40).
export function infantryDamage(unit, count, totalPower) {
  return count * (0.12 + Math.sqrt(unit.power) * 0.07) * combatScale(totalPower);
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
    damage: count * base.damage * growth * combatScale(totalPower),
    ...(base.healing ? { healing:count*base.healing*growth*combatScale(totalPower) } : {}),
    intervalMs: Math.max(
      BATTLE_RULES.stepMs,
      Math.round(base.intervalMs / (1 + level * 0.08) / BATTLE_RULES.stepMs) * BATTLE_RULES.stepMs,
    ),
  };
}

// 장비 분류와 적 부대 유형 상성(0.42). 유리 ×1.3, 불리 ×0.8, 그 외 ×1. 회복(보급차)에는 적용하지 않는다.
export const GEAR_CLASS = Object.freeze({
  artillery: "firepower", selfPropelled: "firepower", rocketLauncher: "firepower", icbm: "firepower",
  tank: "armor", railgunTank: "armor", helicopter: "air", fighter: "air", transport: "support",
});
export const CLASS_NAMES = Object.freeze({ firepower: "화력", armor: "기갑", air: "공중", support: "지원" });
export const ENEMY_TYPES = Object.freeze([
  { id: "armored", name: "기갑 부대", strong: "air", weak: "firepower" },
  { id: "airDefense", name: "방공 진지", strong: "firepower", weak: "air" },
  { id: "artilleryNest", name: "포병 진지", strong: "armor", weak: "firepower" },
]);
export const MATCHUP = Object.freeze({ strong: 1.3, weak: 0.8 });
// 지역 번호 순서대로 유형이 돌아가며, 지도에서 번호만으로 유형을 알 수 있다.
export const stageEnemyType = (stageId) => ENEMY_TYPES[(stageId - 1) % ENEMY_TYPES.length];
export function matchupMultiplier(stageId, gearId) {
  const type = stageEnemyType(stageId), cls = GEAR_CLASS[gearId];
  return cls === type.strong ? MATCHUP.strong : cls === type.weak ? MATCHUP.weak : 1;
}
