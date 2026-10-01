import { UNITS, armyPower } from "./units.js";
import { EQUIPMENT, equipmentCount } from "./equipment.js";
import { FORMATIONS } from "./formations.js";
import { RANKS, rankForArmy } from "./ranks.js";
import { ENEMY_EQUIPMENT, BATTLE_RULES, STAGES, infantryDamage, equipmentCombatStats, matchupMultiplier, stageEnemyType, enemyBalanceFactor, isFortress } from "./battle-balance.js";
export { BATTLE_RULES, STAGES, equipmentCombatStats, matchupMultiplier, stageEnemyType, GEAR_CLASS, CLASS_NAMES, fortressShieldClass, isFortress } from "./battle-balance.js";

export function battleAccess(state) {
  const rank = rankForArmy(state);
  return {
    visible: rank >= RANKS.indexOf("일병"),
    unlocked: rank >= RANKS.indexOf("중령"),
  };
}

// 출전 장비 칸: 중령 3칸, 준장 4칸, 중장 5칸, 대장 이상 6칸.
export function battleSlots(state) {
  const rank = rankForArmy(state);
  return 3 + ["준장", "중장", "대장"].filter((name) => rank >= RANKS.indexOf(name)).length;
}

// 기본 출전: 보유 장비 중 1회 공격력이 센 순서로 빈 칸을 채운다.
export function defaultLoadout(state, stageId = 0) {
  const power = armyPower(state);
  const ranked = Object.keys(EQUIPMENT).filter((id) => state.equipment?.[id]).sort((a, b) => {
    const dps = (id) => { const c = equipmentCombatStats(id, state.equipment[id].level, power, equipmentCount(state, id)); return ((c.damage ? c.damage * (stageId ? matchupMultiplier(stageId, id) : 1) : c.healing)) / c.intervalMs; };
    return dps(b) - dps(a);
  });
  return normalizeLoadout(state, { equipment: ranked.slice(0, battleSlots(state)) });
}

// 모르는 장비·중복·미보유 장비는 걸러내고, 칸 수를 넘으면 앞에서부터 자른다. 병력은 출전하지 않는다.
export function normalizeLoadout(state, input = {}) {
  const wanted = Array.isArray(input?.equipment) ? input.equipment : [];
  return {
    equipment: Object.keys(EQUIPMENT)
      .filter((id) => wanted.includes(id) && !!state.equipment?.[id])
      .slice(0, battleSlots(state)),
  };
}

function makeSide(formation, power, units, equipment, multiplier = 1, playerUpgrades = true, stageId = 0) {
  return {
    hq: { id: formation.id, name: formation.name, maxHp: formation.size, hp: formation.size },
    units: Object.values(UNITS).filter((u) => units[u.id] > 0).map((u) => ({
      id: u.id, count: units[u.id],
      damage: infantryDamage(u, units[u.id], power) * multiplier,
      lastShotMs: -1,
    })),
    equipment: equipment.map(({ id, level, count = 1 }) => {
      const stats = equipmentCombatStats(id, level, power, count, playerUpgrades);
      return { id, level, count, ...stats, damage: stats.damage * multiplier * (playerUpgrades && !stats.healing ? matchupMultiplier(stageId, id) : 1), lastShotMs: -1, nextShotMs: stats.intervalMs,
        ...(playerUpgrades ? { specialReadyMs: BATTLE_RULES.specialFirstReadyMs, lastSpecialMs: -1 } : {}) };
    }),
  };
}

// 적 장비 편성이 달라도 총 공격력이 같도록 장비 피해만 보정한다(보병 사격은 그대로).
function scaleEnemyGear(side, factor, fortress = null) {
  side.fortress = fortress; // 수도 요새면 나라 id(그림용)
  for (const gun of side.equipment) gun.damage *= factor;
  return side;
}

export function createBattle(state, stageId, input = defaultLoadout(state)) {
  const stage = STAGES.find((s) => s.id === stageId);
  const cleared = state.campaignCleared ?? 0;
  if (!stage || !battleAccess(state).unlocked || !Number.isInteger(cleared) || cleared < 0 ||
      cleared > STAGES.length || stage.id > cleared + 1)
    throw new RangeError("Battle is locked");
  if (!Object.values(UNITS).every((u) => Number.isSafeInteger(state[u.field] ?? 0) && (state[u.field] ?? 0) >= 0))
    throw new RangeError("Invalid battle army");
  const loadout = normalizeLoadout(state, input);
  if (!loadout.equipment.length) throw new RangeError("Battle deployment is empty");
  const power = armyPower(state), formation = FORMATIONS.find((f) => f.size <= power);
  const enemyFormation = {...FORMATIONS.find((f) => f.id === stage.formationId),size:stage.hqPower};
  return {
    stageId, stageName: stage.name, enemyName:stage.enemyName, countryId:stage.countryId, status: "running", elapsedMs: 0,
    remainderMs: 0,
    nextEnemyVolleyMs: BATTLE_RULES.enemyVolleyMs,
    player: makeSide({...formation,size:power}, power, {},
      loadout.equipment.map((id) => ({ id, level: state.equipment[id].level, count: equipmentCount(state, id) })), 1, true, stageId),
    enemy: scaleEnemyGear(makeSide(enemyFormation, stage.enemyPower,
      Object.fromEntries(['soldier','sergeant','staffSergeant'].map((id) => [id, stage.enemyUnitCount])),
      stageEnemyType(stageId).gear.map((id) => ({ id, level: stage.enemyLevel })), stage.enemyModifier, false), enemyBalanceFactor(stageId), isFortress(stageId) ? stage.countryId : null),
  };
}

function cloneSide(side) {
  return { hq: { ...side.hq }, fortress: side.fortress, units: side.units.map((u) => ({ ...u })), equipment: side.equipment.map((g) => ({ ...g })) };
}
function cloneBattle(battle) {
  return { ...battle, player: cloneSide(battle.player), enemy: cloneSide(battle.enemy) };
}
function settle(battle, playerDamage, enemyDamage, playerHealing = 0, enemyHealing = 0) {
  battle.enemy.hq.hp = Math.max(0, battle.enemy.hq.hp - playerDamage);
  battle.player.hq.hp = Math.max(0, battle.player.hq.hp - enemyDamage);
  if(battle.player.hq.hp>0)battle.player.hq.hp=Math.min(battle.player.hq.maxHp,battle.player.hq.hp+playerHealing);
  if(battle.enemy.hq.hp>0)battle.enemy.hq.hp=Math.min(battle.enemy.hq.maxHp,battle.enemy.hq.hp+enemyHealing);
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
  let damage = 0, healing = 0;
  for (const gun of side.equipment) {
    if (now < gun.nextShotMs) continue;
    gun.lastShotMs = now;
    gun.nextShotMs += gun.intervalMs;
    damage += gun.damage;
    healing += gun.healing ?? 0;
  }
  return { damage, healing };
}

// 필살기: 출전 장비 하나의 1회 공격력(보급차는 회복량)의 N배를 즉시 사용한다. 쓰면 재사용 대기.
export function useSpecial(battle, gearId) {
  const gear = battle.player.equipment.find((g) => g.id === gearId);
  if (battle.status !== "running" || !gear || battle.elapsedMs < gear.specialReadyMs) return battle;
  const next = cloneBattle(battle), target = next.player.equipment.find((g) => g.id === gearId);
  target.specialReadyMs = next.elapsedMs + BATTLE_RULES.specialCooldownMs;
  target.lastSpecialMs = target.lastShotMs = next.elapsedMs;
  settle(next, target.damage * BATTLE_RULES.specialMultiplier, 0, (target.healing ?? 0) * BATTLE_RULES.specialMultiplier);
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
    const playerFire = equipmentFire(next.player, next.elapsedMs);
    const enemyFire = equipmentFire(next.enemy, next.elapsedMs);
    let enemyDamage = enemyFire.damage;
    if (next.elapsedMs >= next.nextEnemyVolleyMs) {
      enemyDamage += volley(next.enemy, next.elapsedMs);
      next.nextEnemyVolleyMs += BATTLE_RULES.enemyVolleyMs;
    }
    settle(next, playerFire.damage, enemyDamage, playerFire.healing, enemyFire.healing);
  }
  return next;
}
