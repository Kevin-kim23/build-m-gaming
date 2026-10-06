import { createBattle, advanceBattle, deploy, BATTLE_RULES } from '../src/battle.js';

// 시험용 가로 전장: 적의 출격을 멈추고(적 기지·포탑은 그대로) 아군 장비만 따로 확인한다.
export function quietBattle(state, stageId, equipment) {
  const b = createBattle(state, stageId, { equipment });
  b.enemy.nextSpawnMs = Infinity;
  return b;
}
export function until(b, ms) { while (b.elapsedMs < ms && b.status === 'running') b = advanceBattle(b, 50); return b; }
// 마나·재출격 대기와 상관없이 바로 출격시킨다(규칙 테스트용).
export function deployNow(b, id, lane = 1) { b.mana = 100; const c = b.deck.find((x) => x.id === id); if (c) c.readyMs = 0; return deploy(b, id, lane); }
// 플레이어 대역이 고르는 레인: 우리 기지에 가장 가까이 온 적이 있는 레인(없으면 가운데).
export function threatLane(b) {
  let lane = 1, nearest = Infinity;
  for (let i = 0; i < BATTLE_RULES.lanes; i++) for (const u of b.enemy.units) if (u.lane === i && u.x < nearest) { nearest = u.x; lane = i; }
  return lane;
}
// 플레이어 대역: 쓸 수 있는 카드를 돌아가며, 가장 급한 레인에 출격. policy 'none'이면 아무것도 안 함.
export function play(state, stageId, { deck, policy = 'cycle' } = {}) {
  let b = createBattle(state, stageId, deck ? { equipment: deck } : undefined), k = 0;
  while (b.status === 'running') {
    if (policy === 'cycle') {
      const ready = b.deck.filter((c) => b.mana >= c.cost && b.elapsedMs >= c.readyMs);
      if (ready.length) b = deploy(b, ready[k++ % ready.length].id, threatLane(b));
    }
    b = advanceBattle(b, 50);
  }
  return b;
}
