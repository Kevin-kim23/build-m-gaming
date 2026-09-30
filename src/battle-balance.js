import { FORMATIONS, BATTALION_SIZE } from "./formations.js";
import { EQUIPMENT } from "./equipment.js";

export const BATTLE_RULES = Object.freeze({
  stepMs: 50,
  maxFrameMs: 250,
  volleyCooldownMs: 150,
  enemyVolleyMs: 1800,
  maxDurationMs: 180_000,
  maxUnitsPerType: 10,
});

const tiers = ["battalion", "regiment", "division", "corps", "fieldArmy"];
const enemyLevels = [0, 2, 3, 4, 4, 6, 6, 8, 8, 10];
const enemyModifiers = [1.35, 1.75, 1.6, 1.8, 1.1, 1.35, 1.1, 1.3, 1.1, 1.15];
const recommendedRanks = ["중령", "중령", "대령", "준장", "소장", "소장", "중장", "중장", "대장", "대장"];
export const STAGES = Object.freeze(
  Array.from({ length: tiers.length * 2 }, (_, index) => {
    const formation = FORMATIONS.find((f) => f.id === tiers[Math.floor(index / 2)]);
    return Object.freeze({
      id: index + 1,
      name: `${formation.name} 전투${index % 2 + 1}`,
      formationId: formation.id,
      hqPower: formation.size,
      enemyName: "아르덴 연방",
      enemyLevel: enemyLevels[index],
      recommendedRank: recommendedRanks[index],
      recommendedPower: formation.size * (index === 3 ? 2 : 1),
      enemyModifier: enemyModifiers[index],
      enemyUnitCount: index % 2 ? 10 : 7,
    });
  }),
);

// Enemy loadouts stay explicit so catalog additions do not silently raise stage difficulty.
export const ENEMY_EQUIPMENT = Object.freeze(["artillery", "tank", "selfPropelled"]);

const weaponBase = Object.freeze({
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

// Overall army strength improves deployed troops; headcounts remain capped at ten.
export function infantryDamage(unit, count, totalPower) {
  return count * (0.12 + Math.sqrt(unit.power) * 0.07) * combatScale(totalPower);
}

export function equipmentCombatStats(id, level, totalPower = BATTALION_SIZE) {
  const type = EQUIPMENT[id];
  if (!type || !Number.isInteger(level) || level < 0 || level > type.maxLevel)
    throw new RangeError("Invalid battle equipment");
  const base = weaponBase[id] ?? {
    damage: Math.max(5, Math.sqrt(type.passive) / 3),
    intervalMs: 3000,
  };
  return {
    damage: base.damage * (1 + level * 0.12) * combatScale(totalPower),
    intervalMs: Math.max(
      BATTLE_RULES.stepMs,
      Math.round(base.intervalMs / (1 + level * 0.08) / BATTLE_RULES.stepMs) * BATTLE_RULES.stepMs,
    ),
  };
}
