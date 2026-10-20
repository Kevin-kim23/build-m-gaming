// 무한 방어전 시간 진행: 보급 생산, 웨이브 시작·생성, 적 이동, 장비 사격, 보스 패턴, 웨이브 종료.
// 카드 고르기 중(run.hand)이거나 끝난 판은 멈춘다. 매 단계 할당을 줄이고 DOM·저장은 하지 않는다.
import {
  BASE_POS, PADS, ENEMIES, SPAWN_SPACING_S, WAVE_GAP_S, LEAK_HEARTS, BOSS_LEAK_HEARTS, BOSS_STUN, BOSS_SUMMON,
} from './defense-data.js';
import { baseStats } from './defense-economy.js';
import { waveSpec } from './defense-waves.js';
import { PATH_LENGTH, pointAt, airLength, airPointAt } from './defense-path.js';
import { towerStats, addStoredCards } from './defense-run.js';


const STEP = 0.05;
export const ICBM = Object.freeze({ radius: 60, hpMultiple: 8 });
export const MINE = Object.freeze({ radius: 30, hpMultiple: 3 });
const BIG_BOSS_SUPPLY = 100;

export function step(run, dt) {
  for (let left = dt; left > 1e-9 && run.phase !== 'over' && !run.hand; left -= STEP) tick(run, Math.min(STEP, left));
  return run;
}

function tick(run, dt) {
  run.time += dt;
  produceSupply(run, dt);
  if (run.phase === 'gap') { run.gapLeft -= dt; if (run.gapLeft <= 0) startWave(run); }
  if (run.phase === 'wave') spawn(run, dt);
  moveEnemies(run, dt);
  bossPatterns(run, dt);
  fire(run, dt);
  removeDead(run);
  for (const s of Object.values(run.skills)) s.ready = Math.max(0, s.ready - dt);
  if (run.phase === 'wave' && !run.queue.length && !run.enemies.length) endWave(run);
}

function produceSupply(run, dt) {
  const b = baseStats(run.baseLevel), wing = run.bays.transport?.branch === 'transportWing' ? 1.2 : 1;
  run.supplyTimer += dt;
  const interval = b.interval * run.mods.supplyInterval;
  while (run.supplyTimer >= interval) {
    run.supplyTimer -= interval;
    run.supply = Math.min(b.cap, run.supply + Math.round((b.amount + run.mods.supplyAmount) * wing));
  }
}

function startWave(run) {
  run.wave += 1; run.phase = 'wave'; run.spawnTimer = 0;
  run.queue = waveSpec(run.wave).enemies.slice();
}

function spawn(run, dt) {
  run.spawnTimer -= dt;
  while (run.queue.length && run.spawnTimer <= 0) {
    run.spawnTimer += SPAWN_SPACING_S;
    addEnemy(run, run.queue.shift(), 0);
  }
}
function addEnemy(run, spec, dist) {
  const id = run.nextId++, kind = spec.boss ?? ENEMIES[spec.type];
  const air = !!kind.air;
  run.enemies.push({
    id, type: spec.type, boss: !!spec.boss, big: spec.type === 'boss', def: kind, hp: spec.hp, maxHp: spec.hp,
    speed: kind.speed, dist, air, from: air ? [40 + (id * 97) % 280, 40] : null, shield: kind.shield ?? 0,
    stealth: !!kind.stealth, burnDps: 0, burnUntil: 0, slowUntil: 0, summoned: 0, clock: 0, x: 0, y: 0,
  });
}

function moveEnemies(run, dt) {
  for (const e of run.enemies) {
    e.dist += e.speed * (e.slowUntil > run.time ? 0.7 : 1) * dt;
    if (e.burnUntil > run.time) e.hp -= e.burnDps * dt;
    const [x, y] = e.air ? airPointAt(e.from, e.dist) : pointAt(e.dist);
    e.x = x; e.y = y;
    if (e.hp > 0 && e.dist >= (e.air ? airLength(e.from) : PATH_LENGTH)) {
      run.hearts -= e.boss ? BOSS_LEAK_HEARTS : LEAK_HEARTS; run.stats.leaks += 1; e.hp = 0; e.leaked = true;
      if (run.hearts <= 0) { run.hearts = 0; run.phase = 'over'; }
    }
  }
  for (const mine of run.mines) {
    if (!mine.armed) continue;
    const at = mine.at * PATH_LENGTH, hit = run.enemies.find(e => !e.air && e.hp > 0 && e.dist >= at);
    if (!hit) continue;
    mine.armed = false;
    blast(run, hit.x, hit.y, MINE.radius, MINE.hpMultiple * waveSpec(Math.max(1, run.wave)).hp, false);
  }
  run.mines = run.mines.filter(m => m.armed);
}

// 큰 보스: 8초마다 3초 경고 후 가장 높은 레벨 장비 주변을 5초 멈춤 / 체력 25%마다 소환.
function bossPatterns(run, dt) {
  for (const e of run.enemies) {
    if (!e.big || e.hp <= 0) continue;
    e.clock += dt;
    if (e.def.stun) {
      const phase = e.clock % BOSS_STUN.every;
      if (!run.warning && phase >= BOSS_STUN.every - BOSS_STUN.warn) run.warning = { at: strongestPad(run), until: run.time + BOSS_STUN.warn };
      if (run.warning && run.time >= run.warning.until) {
        const [wx, wy] = PADS[run.warning.at] ?? BASE_POS;
        run.pads.forEach((t, i) => { if (t && Math.hypot(PADS[i][0] - wx, PADS[i][1] - wy) <= BOSS_STUN.radius) t.stunnedUntil = run.time + BOSS_STUN.duration; });
        run.warning = null;
      }
    }
    if (e.def.summon) {
      const due = Math.floor((1 - e.hp / e.maxHp) * 4);
      for (; e.summoned < Math.min(3, due); e.summoned++)
        for (let i = 0; i < BOSS_SUMMON.count; i++) addEnemy(run, { type: BOSS_SUMMON.type, hp: waveSpec(run.wave).hp }, Math.max(0, e.dist - i * 12));
    }
  }
}
const strongestPad = run => run.pads.reduce((best, t, i) => t && (best < 0 || t.level > run.pads[best].level) ? i : best, -1);

const radar = run => {
  const r = run.bays.recon;
  if (!r) return 0;
  return r.branch === 'globalRadar' ? Infinity : 60 + 12 * r.level;
};
const visible = (run, e, radarRange) => !e.stealth || Math.hypot(e.x - BASE_POS[0], e.y - BASE_POS[1]) <= radarRange;
const progress = e => e.dist / (e.air ? airLength(e.from) : PATH_LENGTH);

function fire(run, dt) {
  const radarRange = radar(run);
  run.pads.forEach((t, i) => {
    if (!t) return;
    t.cooldown -= dt;
    if (t.stunnedUntil > run.time || t.cooldown > 0) return;
    const s = towerStats(run, t), [px, py] = PADS[i];
    const targets = run.enemies.filter(e => e.hp > 0 && (s.targets === 'both' || (s.targets === 'air') === e.air)
      && visible(run, e, radarRange) && Math.hypot(e.x - px, e.y - py) <= s.range).sort((a, b) => progress(b) - progress(a));
    if (!targets.length) return;
    t.cooldown = s.interval;
    if (run.fx.length >= 40) run.fx.shift();
    run.fx.push({ line: t.line, x0: px, y0: py, x1: targets[0].x, y1: targets[0].y, at: run.time, splash: s.splash });
    for (let shot = 0; shot < s.shots; shot++) hit(run, s, targets[shot % targets.length], targets, radarRange);
  });
}

function damageFor(run, s, e) {
  const recon = run.bays.recon;
  let d = s.damage * (e.air ? s.airFactor : (s.groundFactor ?? 1)) * (e.boss ? s.bossFactor : 1);
  if (recon && recon.level >= 10 && Math.hypot(e.x - BASE_POS[0], e.y - BASE_POS[1]) <= radar(run)) d *= 1.1;
  if (recon?.branch === 'targetMark' && e.boss) d *= 1.25;
  return d;
}
function strike(run, s, e, damage) {
  if (e.shield > 0 && !s.ignoreShield) { e.shield -= 1; return; }
  e.hp -= damage;
  if (s.burn) { e.burnDps = Math.max(e.burnDps, damage * s.burn[0]); e.burnUntil = run.time + s.burn[1]; }
  if (s.slow) e.slowUntil = run.time + 2;
}
function hit(run, s, target, inRange, radarRange) {
  strike(run, s, target, damageFor(run, s, target));
  if (s.pierce > 1) inRange.filter(e => e !== target && !e.air && Math.hypot(e.x - target.x, e.y - target.y) <= 60).slice(0, s.pierce - 1)
    .forEach(e => strike(run, s, e, damageFor(run, s, e)));
  if (s.splash) run.enemies.forEach(e => {
    if (e !== target && !e.air && e.hp > 0 && visible(run, e, radarRange) && Math.hypot(e.x - target.x, e.y - target.y) <= s.splash) strike(run, s, e, damageFor(run, s, e));
  });
  if (s.burnSpread) run.enemies.forEach(e => {
    if (e !== target && Math.hypot(e.x - target.x, e.y - target.y) <= s.burnSpread) { e.burnDps = Math.max(e.burnDps, target.burnDps); e.burnUntil = target.burnUntil; }
  });
}

// ICBM: 누른 곳 반경 60에 그 웨이브 기본 체력 × 8 피해(방패 무시, 공중 포함).
export function useIcbm(run, x, y) {
  const skill = run.skills.icbm;
  if (!skill) throw new RangeError('No ICBM');
  if (skill.ready > 0) throw new RangeError('ICBM is cooling down');
  blast(run, x, y, ICBM.radius, ICBM.hpMultiple * waveSpec(Math.max(1, run.wave)).hp, true);
  skill.ready = skill.cooldown;
  removeDead(run);
  return run;
}
function blast(run, x, y, radius, damage, includeAir) {
  for (const e of run.enemies) if ((includeAir || !e.air) && Math.hypot(e.x - x, e.y - y) <= radius) e.hp -= damage;
}

function removeDead(run) {
  if (!run.enemies.some(e => e.hp <= 0)) return;
  for (const e of run.enemies) if (e.hp <= 0 && !e.leaked) {
    run.stats.kills += 1;
    run.supply = Math.min(baseStats(run.baseLevel).cap, run.supply + (e.big ? BIG_BOSS_SUPPLY : e.def.supply));
  }
  run.enemies = run.enemies.filter(e => e.hp > 0);
}

// 웨이브 끝: 카드 1장 적립(큰 보스는 2장), 수송 비행장 Lv10이면 ♥ +1, 4초 쉬기.
function endWave(run) {
  run.cleared = run.wave; run.phase = 'gap'; run.gapLeft = WAVE_GAP_S;
  addStoredCards(run, run.wave % 20 === 0 ? 2 : 1);
  if ((run.bays.transport?.level ?? 0) >= 10) run.hearts = Math.min(run.maxHearts, run.hearts + 1);
}


