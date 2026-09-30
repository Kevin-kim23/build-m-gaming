import { BATTALION_SIZE } from "./formations.js";
import { EQUIPMENT, MAX_EQUIPMENT_COUNT } from "./equipment.js";
import { campaignStages } from './campaign.js';

export const BATTLE_RULES = Object.freeze({
  stepMs: 50,
  maxFrameMs: 250,
  volleyCooldownMs: 150,
  enemyVolleyMs: 1800,
  maxDurationMs: 180_000,
  maxUnitsPerType: 10,
});

export const STAGES = campaignStages;

// Enemy loadouts stay explicit so catalog additions do not silently raise stage difficulty.
export const ENEMY_EQUIPMENT = Object.freeze(["artillery", "tank", "selfPropelled"]);

const weaponBase = Object.freeze({
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

// Overall army strength improves deployed troops; headcounts remain capped at ten.
export function infantryDamage(unit, count, totalPower) {
  return count * (0.12 + Math.sqrt(unit.power) * 0.07) * combatScale(totalPower);
}

export function equipmentCombatStats(id, level, totalPower = BATTALION_SIZE, count = 1) {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_EQUIPMENT_COUNT) throw new RangeError("Invalid equipment count");
  const type = EQUIPMENT[id];
  if (!type || !Number.isInteger(level) || level < 0 || level > type.maxLevel)
    throw new RangeError("Invalid battle equipment");
  const base = weaponBase[id] ?? {
    damage: Math.max(5, Math.sqrt(type.passive) / 3),
    intervalMs: 3000,
  };
  return {
    damage: count * base.damage * (1 + level * 0.12) * combatScale(totalPower),
    ...(base.healing ? { healing:count*base.healing*(1+level*.12)*combatScale(totalPower) } : {}),
    intervalMs: Math.max(
      BATTLE_RULES.stepMs,
      Math.round(base.intervalMs / (1 + level * 0.08) / BATTLE_RULES.stepMs) * BATTLE_RULES.stepMs,
    ),
  };
}
