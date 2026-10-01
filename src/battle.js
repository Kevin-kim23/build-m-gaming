import { EQUIPMENT, equipmentCount } from "./equipment.js";
import { FORMATIONS } from "./formations.js";
import { armyPower } from "./units.js";
import { RANKS, rankForArmy } from "./ranks.js";
import {
  BATTLE_RULES, STAGES, UNIT_TRAITS, FORTRESS_SHIELD, equipmentCombatStats, classMatchup,
  stageEnemyType, fortressShieldClass, isFortress, GEAR_CLASS, CLASS_NAMES, matchupMultiplier, enemyStack,
} from "./battle-balance.js";
export { BATTLE_RULES, STAGES, UNIT_TRAITS, equipmentCombatStats, matchupMultiplier, stageEnemyType,
  GEAR_CLASS, CLASS_NAMES, fortressShieldClass, isFortress, classMatchup } from "./battle-balance.js";

// 가로 전장 전투 규칙(순수 함수). 화면 코드는 battle-ui.js / lane-art.js 쪽에 있다.
// 흐름: 마나가 차면 장비(카드)를 출격 → 장비가 적 기지 쪽으로 전진하며 가까운 적을 쏨 → 상대 기지 체력을 0으로.
export function battleAccess(state) {
  const rank = rankForArmy(state);
  return { visible: rank >= RANKS.indexOf("일병"), unlocked: rank >= RANKS.indexOf("중령") };
}

// 출전 장비 칸: 중령 3칸, 준장 4칸, 중장 5칸, 대장 이상 6칸.
export function battleSlots(state) {
  const rank = rankForArmy(state);
  return 3 + ["준장", "중장", "대장"].filter((name) => rank >= RANKS.indexOf(name)).length;
}

// 기본 출전: 보유 장비 중 초당 공격력이 센 순서로 빈 칸을 채우되, 이 지역 적을 상대로 유리한 분류를 앞에 둔다.
export function defaultLoadout(state, stageId = 0) {
  const power = armyPower(state);
  const score = (id) => {
    const c = equipmentCombatStats(id, state.equipment[id].level, power, equipmentCount(state, id));
    return ((c.damage || c.healing || 1) / c.intervalMs) * (stageId ? matchupMultiplier(stageId, id) : 1);
  };
  const ranked = Object.keys(EQUIPMENT).filter((id) => state.equipment?.[id]).sort((a, b) => score(b) - score(a));
  return normalizeLoadout(state, { equipment: ranked.slice(0, battleSlots(state)) });
}

// 모르는 장비·중복·미보유 장비는 걸러내고, 칸 수를 넘으면 앞에서부터 자른다.
export function normalizeLoadout(state, input = {}) {
  const wanted = Array.isArray(input?.equipment) ? input.equipment : [];
  return { equipment: Object.keys(EQUIPMENT).filter((id) => wanted.includes(id) && !!state.equipment?.[id]).slice(0, battleSlots(state)) };
}

const scaleHp = (id, level, count, power, upgrades) => {
  const stats = equipmentCombatStats(id, level, power, count, upgrades);
  // 체력은 공격력과 같은 성장 곡선(전력·수량·레벨)을 따른다.
  return { stats, hp: UNIT_TRAITS[id].hp * (stats.growth ?? 1) * count * (power / 1280) };
};

function makeUnit(battle, side, id, level, count, power, modifier = 1, upgrades = true, stack = 1) {
  const trait = UNIT_TRAITS[id], scaled = scaleHp(id, level, count, power, upgrades), stats = scaled.stats, hp = scaled.hp * stack;
  modifier *= stack;
  const dir = side === "player" ? 1 : -1, startX = side === "player" ? 40 : BATTLE_RULES.laneLength - 40;
  return {
    uid: battle.nextUid++, id, side, cls: trait.cls, kind: trait.kind, level, count, dir,
    x: startX, hp: hp * (side === "enemy" ? 1 : 1), maxHp: hp,
    damage: (stats.damage ?? 0) * modifier, healing: (stats.healing ?? 0) * stack,
    intervalMs: stats.intervalMs, nextShotMs: battle.elapsedMs + stats.intervalMs / 2, lastShotMs: -1,
    range: trait.range, speed: trait.speed,
  };
}

const turretDamage = (power, mult) => (power / 1280) * BATTLE_RULES.turretPower * mult;

export function createBattle(state, stageId, input = defaultLoadout(state, stageId)) {
  const stage = STAGES.find((s) => s.id === stageId);
  const cleared = state.campaignCleared ?? 0;
  if (!stage || !battleAccess(state).unlocked || !Number.isInteger(cleared) || cleared < 0 ||
      cleared > STAGES.length || stage.id > cleared + 1)
    throw new RangeError("Battle is locked");
  const loadout = normalizeLoadout(state, input);
  if (!loadout.equipment.length) throw new RangeError("Battle deployment is empty");
  const power = armyPower(state), formation = FORMATIONS.find((f) => f.size <= power);
  const enemyFormation = FORMATIONS.find((f) => f.id === stage.formationId);
  return {
    stageId, stageName: stage.name, enemyName: stage.enemyName, countryId: stage.countryId, status: "running",
    elapsedMs: 0, remainderMs: 0, mana: BATTLE_RULES.manaStart, nextUid: 1, fx: [],
    deck: loadout.equipment.map((id) => ({
      id, level: state.equipment[id].level, count: equipmentCount(state, id), cost: UNIT_TRAITS[id].cost, readyMs: 0,
    })),
    player: { hq: { id: formation.id, name: formation.name, maxHp: power, hp: power }, fortress: null, units: [], power,
      turret: { damage: turretDamage(power, 1), nextShotMs: BATTLE_RULES.turretIntervalMs } },
    enemy: {
      hq: { id: enemyFormation.id, name: enemyFormation.name, maxHp: stage.hqPower, hp: stage.hqPower },
      fortress: isFortress(stageId) ? stage.countryId : null, units: [], spawned: 0,
      nextSpawnMs: BATTLE_RULES.enemyFirstSpawnMs, power: stage.enemyPower,
      turret: { damage: turretDamage(stage.enemyPower, isFortress(stageId) ? BATTLE_RULES.fortressTurret : 1) * stage.enemyModifier * enemyStack(stageId, stage.enemyLevel) / Math.max(1, enemyStack(stageId, stage.enemyLevel)), nextShotMs: BATTLE_RULES.turretIntervalMs },
    },
  };
}

function cloneBattle(b) {
  const side = (s) => ({ ...s, hq: { ...s.hq }, units: s.units.map((u) => ({ ...u })) });
  return { ...b, deck: b.deck.map((c) => ({ ...c })), player: side(b.player), enemy: side(b.enemy), fx: [...b.fx] };
}

// 카드를 눌러 장비 출격. 마나 부족·재출격 대기·없는 장비면 같은 battle을 그대로 돌려준다.
export function deploy(battle, gearId) {
  const card = battle.deck.find((c) => c.id === gearId);
  if (battle.status !== "running" || !card || battle.mana < card.cost || battle.elapsedMs < card.readyMs) return battle;
  const next = cloneBattle(battle), c = next.deck.find((x) => x.id === gearId);
  next.mana -= c.cost;
  c.readyMs = next.elapsedMs + UNIT_TRAITS[gearId].cooldownMs;
  const unit = makeUnit(next, "player", gearId, c.level, c.count, next.player.power);
  if (unit.kind === "strike") {
    const shield = fortressShieldClass(next.stageId) === unit.cls && next.enemy.fortress ? FORTRESS_SHIELD : 1;
    next.enemy.hq.hp = Math.max(0, next.enemy.hq.hp - unit.damage * BATTLE_RULES.strikeMultiplier * shield);
    next.fx.push({ at: next.elapsedMs, kind: "strike", side: "player", id: gearId, x: BATTLE_RULES.laneLength });
    finish(next);
  } else next.player.units.push(unit);
  return next;
}

function finish(b) {
  const e = b.enemy.hq.hp <= 0, p = b.player.hq.hp <= 0;
  if (e && p) b.status = "draw";
  else if (e) b.status = "victory";
  else if (p) b.status = "defeat";
  else if (b.elapsedMs >= BATTLE_RULES.maxDurationMs) b.status = "draw";
}

function spawnEnemy(b, stage) {
  const type = stageEnemyType(b.stageId), id = type.pool[b.enemy.spawned % type.pool.length];
  b.enemy.units.push(makeUnit(b, "enemy", id, stage.enemyLevel, 1, stage.enemyPower, stage.enemyModifier, false, enemyStack(b.stageId, stage.enemyLevel)));
  b.enemy.spawned++;
  b.enemy.nextSpawnMs += stage.spawnMs;
}

function step(b, stage) {
  const dt = BATTLE_RULES.stepMs / 1000, now = b.elapsedMs, L = BATTLE_RULES.laneLength;
  b.mana = Math.min(BATTLE_RULES.manaMax, b.mana + BATTLE_RULES.manaPerSecond * dt);
  if (now >= b.enemy.nextSpawnMs) spawnEnemy(b, stage);
  const damage = new Map(), heal = new Map();
  let toEnemyBase = 0, toPlayerBase = 0;
  const sides = { player: b.player.units, enemy: b.enemy.units };
  for (const side of ["player", "enemy"]) {
    const foes = sides[side === "player" ? "enemy" : "player"], allies = sides[side];
    const baseX = side === "player" ? L : 0;
    for (const u of allies) {
      if (u.kind === "heal") {
        if (now >= u.nextShotMs) {
          u.nextShotMs = now + u.intervalMs; u.lastShotMs = now;
          for (const a of allies) if (Math.abs(a.x - u.x) <= u.range && a.hp < a.maxHp) heal.set(a, (heal.get(a) ?? 0) + a.maxHp * BATTLE_RULES.healPercent);
        }
        // 회복 장비는 가장 앞선 아군보다 60 뒤에서 멈춰 따라간다.
        const front = Math.max(-Infinity, ...allies.filter((a) => a !== u).map((a) => a.x * u.dir));
        if (!(front - u.x * u.dir < 60)) u.x += u.dir * u.speed * dt;
        continue;
      }
      let target = null, best = u.range + 1;
      for (const f of foes) { const d = Math.abs(f.x - u.x); if (d <= u.range && d < best) { best = d; target = f; } }
      const baseDist = Math.abs(baseX - u.x);
      if (!target && baseDist <= u.range) target = "base";
      if (!target) { u.x += u.dir * u.speed * dt; continue; }
      if (now < u.nextShotMs) continue;
      u.nextShotMs = now + u.intervalMs; u.lastShotMs = now;
      if (target === "base") {
        const shield = side === "player" && b.enemy.fortress && fortressShieldClass(b.stageId) === u.cls ? FORTRESS_SHIELD : 1;
        if (side === "player") toEnemyBase += u.damage * shield; else toPlayerBase += u.damage;
        b.fx.push({ at: now, kind: "shot", side, id: u.id, from: u.x, to: baseX });
      } else {
        damage.set(target, (damage.get(target) ?? 0) + u.damage * classMatchup(u.cls, target.cls, b.stageId));
        b.fx.push({ at: now, kind: "shot", side, id: u.id, from: u.x, to: target.x });
      }
    }
  }
  // 기지 포탑: 가까이 온 적 부대를 자동으로 쏜다(요새는 더 강하다).
  for (const [side, turretSide] of [["player", b.player], ["enemy", b.enemy]]) {
    const t = turretSide.turret;
    if (now < t.nextShotMs) continue;
    const foes = sides[side === "player" ? "enemy" : "player"], baseX = side === "player" ? 0 : L;
    let target = null, best = BATTLE_RULES.turretRange + 1;
    for (const f of foes) { const d = Math.abs(f.x - baseX); if (d < best) { best = d; target = f; } }
    if (!target) continue;
    t.nextShotMs = now + BATTLE_RULES.turretIntervalMs;
    damage.set(target, (damage.get(target) ?? 0) + t.damage);
    b.fx.push({ at: now, kind: "shot", side, id: "turret", from: baseX, to: target.x });
  }
  for (const [u, d] of damage) u.hp -= d;
  for (const [u, h] of heal) u.hp = Math.min(u.maxHp, u.hp + h);
  b.enemy.hq.hp = Math.max(0, b.enemy.hq.hp - toEnemyBase);
  b.player.hq.hp = Math.max(0, b.player.hq.hp - toPlayerBase);
  for (const s of ["player", "enemy"]) {
    for (const u of b[s].units) if (u.hp <= 0) b.fx.push({ at: now, kind: "death", side: s, id: u.id, from: u.x });
    b[s].units = b[s].units.filter((u) => u.hp > 0);
  }
  b.fx = b.fx.filter((f) => now - f.at < 600).slice(-60);
  finish(b);
}

// Call only while visible and unpaused. Long frames never grant offline combat.
export function advanceBattle(battle, deltaMs) {
  if (battle.status !== "running" || !Number.isFinite(deltaMs) || deltaMs <= 0) return battle;
  const next = cloneBattle(battle), stage = STAGES.find((s) => s.id === next.stageId);
  next.remainderMs += Math.min(deltaMs, BATTLE_RULES.maxFrameMs);
  while (next.remainderMs >= BATTLE_RULES.stepMs && next.status === "running") {
    next.remainderMs -= BATTLE_RULES.stepMs;
    next.elapsedMs += BATTLE_RULES.stepMs;
    step(next, stage);
  }
  return next;
}
