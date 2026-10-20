// 무한 방어전 웨이브 구성: 구간(20웨이브), 적 체력 배율, 섞여 나오는 적, 10웨이브마다 보스.
import {
  ENEMIES, BOSSES, ZONES, WAVE_HP_BASE, WAVE_HP_GROWTH, LOOP_HP_FACTOR, ZONE_PALETTE, ENEMY_TIPS,
} from './defense-data.js';

const checkWave = wave => { if (!Number.isInteger(wave) || wave < 1) throw new RangeError('Invalid wave'); };

// 1-20 아스테라 · 21-40 에테리온 · 41-60 에레보스 · 61부터 다시 아스테라(2회차).
export function zoneFor(wave) {
  checkWave(wave);
  const index = Math.floor((wave - 1) / 20), loop = Math.floor(index / ZONES.length);
  return { ...ZONES[index % ZONES.length], loop: loop + 1, hp: ZONES[index % ZONES.length].hp * LOOP_HP_FACTOR ** loop };
}
export const waveHp = wave => WAVE_HP_BASE * WAVE_HP_GROWTH ** (wave - 1) * zoneFor(wave).hp;

// 큰 보스는 20·40·60(그 뒤 순환), 중간 보스는 나머지 10의 배수.
export function bossFor(wave) {
  checkWave(wave);
  if (wave % 20 === 0) return BOSSES[(wave / 20 - 1) % BOSSES.length];
  return wave % 10 === 0 ? ENEMIES.midBoss : null;
}

// 이번 웨이브에 처음 나오는 적 종류(소개 카드용).
export const newEnemyTypes = wave => Object.entries(ENEMIES).filter(([, e]) => e.first === wave).map(([id]) => id);

// 적 목록: 6 + 웨이브 마리. 세 마리 중 한 마리만 특수 적(열린 종류를 차례로), 나머지는 일반. 무작위 없음. 보스는 맨 뒤.
export function waveSpec(wave) {
  checkWave(wave);
  const hp = waveHp(wave), special = Object.entries(ENEMIES).filter(([id, e]) => id !== 'grunt' && e.first && e.first <= wave).map(([id]) => id);
  const enemies = Array.from({ length: 6 + wave }, (_, i) => {
    const type = i % 3 !== 2 || !special.length ? 'grunt' : special[(Math.floor(i / 3) + wave) % special.length];
    return { type, hp: hp * ENEMIES[type].hp };
  });
  const boss = bossFor(wave);
  if (boss) enemies.push({ type: boss === ENEMIES.midBoss ? 'midBoss' : 'boss', boss, hp: hp * boss.hp });
  return { wave, zone: zoneFor(wave), hp, enemies, newTypes: newEnemyTypes(wave) };
}

// 적 그림: 종류(공허 군단 그림) + 구간 색. 큰 보스는 그 보스 그림.
export function enemyArt(wave, type, boss = null) {
  const kind = type === 'boss' ? (boss ?? bossFor(wave))?.art ?? 'mother' : ENEMIES[type]?.art ?? 'crawler';
  return { kind, palette: ZONE_PALETTE[zoneFor(wave).id] };
}

// 웨이브가 시작될 때 띄우는 안내(구간 전환 > 큰 보스 > 중간 보스 > 새 적). 없으면 null.
export function waveBanner(wave) {
  const zone = zoneFor(wave), boss = bossFor(wave), fresh = newEnemyTypes(wave).filter(id => ENEMY_TIPS[id]);
  if (wave > 1 && (wave - 1) % 20 === 0)
    return { kind: 'zone', title: `${zone.name} 전선 진입${zone.loop > 1 ? ` · ${zone.loop}회차` : ''}`, text: `배경·적 장비가 바뀌어요 · 적 체력 ×${+(zone.hp / zoneFor(wave - 1).hp).toFixed(2)}` };
  if (boss && boss !== ENEMIES.midBoss) return { kind: 'boss', title: `보스 등장: ${boss.name}`, text: boss.summon ? '체력이 줄 때마다 갑각병 무리를 불러요' : '경고 원 안의 장비가 잠시 멈춰요' };
  if (boss) return { kind: 'boss', title: '중간 보스: 거대 갑각병', text: '기지에 닿으면 ♥ −5' };
  if (fresh.length) return { kind: 'new', title: '새 적 등장', text: ENEMY_TIPS[fresh[0]] };
  return null;
}
