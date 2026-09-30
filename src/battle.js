import { UNITS, armyPower } from "./units.js";
import { EQUIPMENT } from "./equipment.js";
import { FORMATIONS } from "./formations.js";
import { RANKS, rankForArmy } from "./ranks.js";
import { BATTLE_RULES, STAGES, infantryDamage, equipmentCombatStats } from "./battle-balance.js";
export { BATTLE_RULES, STAGES, equipmentCombatStats } from "./battle-balance.js";

export function battleAccess(state) {
  const rank = rankForArmy(state);
  return {
    visible: rank >= RANKS.indexOf("일병"),
    unlocked: rank >= RANKS.indexOf("중령"),
  };
}

export function defaultLoadout(state) {
  return normalizeLoadout(state, {
    units: Object.fromEntries(Object.values(UNITS).map((u) => [u.id, BATTLE_RULES.maxUnitsPerType])),
    equipment: Object.keys(EQUIPMENT),
  });
}

// Unknown keys, duplicate equipment and invalid counts never enter a battle.
export function normalizeLoadout(state, input = {}) {
  return {
    units: Object.fromEntries(Object.values(UNITS).map((u) => {
      const requested = input?.units?.[u.id], owned = state[u.field] ?? 0;
      const count = Number.isFinite(requested) && Number.isSafeInteger(owned)
        ? Math.max(0, Math.min(BATTLE_RULES.maxUnitsPerType, owned, Math.floor(requested)))
        : 0;
      return [u.id, count];
    })),
    equipment: Object.keys(EQUIPMENT).filter((id) =>
      Array.isArray(input?.equipment) && input.equipment.includes(id) && !!state.equipment?.[id],
    ),
  };
}

function makeSide(formation, power, units, equipment, multiplier = 1) {
  return {
    hq: { id: formation.id, name: formation.name, maxHp: formation.size, hp: formation.size },
    units: Object.values(UNITS).filter((u) => units[u.id] > 0).map((u) => ({
      id: u.id, count: units[u.id],
      damage: infantryDamage(u, units[u.id], power) * multiplier,
      lastShotMs: -1,
    })),
    equipment: equipment.map(({ id, level }) => {
      const stats = equipmentCombatStats(id, level, power);
      return { id, level, ...stats, damage: stats.damage * multiplier, lastShotMs: -1, nextShotMs: stats.intervalMs };
    }),
  };
}

export function createBattle(state, stageId, input = defaultLoadout(state)) {
  const stage = STAGES.find((s) => s.id === stageId);
  const cleared = state.battleCleared ?? 0;
  if (!stage || !battleAccess(state).unlocked || !Number.isInteger(cleared) || cleared < 0 ||
      cleared > STAGES.length || stage.id > cleared + 1)
    throw new RangeError("Battle is locked");
  if (!Object.values(UNITS).every((u) => Number.isSafeInteger(state[u.field] ?? 0) && (state[u.field] ?? 0) >= 0))
    throw new RangeError("Invalid battle army");
  const loadout = normalizeLoadout(state, input);
  if (!Object.values(loadout.units).some(Boolean) && !loadout.equipment.length)
    throw new RangeError("Battle deployment is empty");
  const power = armyPower(state), formation = FORMATIONS.find((f) => f.size <= power);
  const enemyFormation = FORMATIONS.find((f) => f.id === stage.formationId);
  return {
    stageId, stageName: stage.name, status: "running", elapsedMs: 0,
    remainderMs: 0, lastVolleyMs: -BATTLE_RULES.volleyCooldownMs,
    nextEnemyVolleyMs: BATTLE_RULES.enemyVolleyMs,
    player: makeSide(formation, power, loadout.units,
      loadout.equipment.map((id) => ({ id, level: state.equipment[id].level }))),
    enemy: makeSide(enemyFormation, stage.hqPower,
      Object.fromEntries(['soldier','sergeant','staffSergeant'].map((id) => [id, stage.enemyUnitCount])),
      Object.keys(EQUIPMENT).map((id) => ({ id, level: stage.enemyLevel })), stage.enemyModifier),
  };
}

function cloneSide(side) {
  return { hq: { ...side.hq }, units: side.units.map((u) => ({ ...u })), equipment: side.equipment.map((g) => ({ ...g })) };
}
function cloneBattle(battle) {
  return { ...battle, player: cloneSide(battle.player), enemy: cloneSide(battle.enemy) };
}
function settle(battle, playerDamage, enemyDamage) {
  battle.enemy.hq.hp = Math.max(0, battle.enemy.hq.hp - playerDamage);
  battle.player.hq.hp = Math.max(0, battle.player.hq.hp - enemyDamage);
  if (!battle.enemy.hq.hp && !battle.player.hq.hp) battle.status = "draw";
  else if (!battle.enemy.hq.hp) battle.status = "victory";
  else if (!battle.player.hq.hp) battle.status = "defeat";
  else if (battle.elapsedMs >= BATTLE_RULES.maxDurationMs) battle.status = "draw";
}
function volley(side, now) {
  let damage = 0;
  for (const unit of side.units) {
    unit.lastShotMs = now;
    damage += unit.damage;
  }
  return damage;
}
function equipmentFire(side, now) {
  let damage = 0;
  for (const gun of side.equipment) {
    if (now < gun.nextShotMs) continue;
    gun.lastShotMs = now;
    gun.nextShotMs += gun.intervalMs;
    damage += gun.damage;
  }
  return damage;
}

export function fireVolley(battle) {
  if (battle.status !== "running" || !battle.player.units.length ||
      battle.elapsedMs - battle.lastVolleyMs < BATTLE_RULES.volleyCooldownMs) return battle;
  const next = cloneBattle(battle);
  next.lastVolleyMs = next.elapsedMs;
  settle(next, volley(next.player, next.elapsedMs), 0);
  return next;
}

// Call only while visible and unpaused. Long frames never grant offline combat.
export function advanceBattle(battle, deltaMs) {
  if (battle.status !== "running" || !Number.isFinite(deltaMs) || deltaMs <= 0) return battle;
  const next = cloneBattle(battle);
  next.remainderMs += Math.min(deltaMs, BATTLE_RULES.maxFrameMs);
  while (next.remainderMs >= BATTLE_RULES.stepMs && next.status === "running") {
    next.remainderMs -= BATTLE_RULES.stepMs;
    next.elapsedMs += BATTLE_RULES.stepMs;
    const playerDamage = equipmentFire(next.player, next.elapsedMs);
    let enemyDamage = equipmentFire(next.enemy, next.elapsedMs);
    if (next.elapsedMs >= next.nextEnemyVolleyMs) {
      enemyDamage += volley(next.enemy, next.elapsedMs);
      next.nextEnemyVolleyMs += BATTLE_RULES.enemyVolleyMs;
    }
    settle(next, playerDamage, enemyDamage);
  }
  return next;
}
