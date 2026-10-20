// 무한 방어전 고정 데이터 (1단계 · 화면 없음). 숫자는 초안이며 자동 시뮬레이션 시험으로 맞춘다.
// 좌표는 360×780 전장 기준. 적은 PATH를 따라 위에서 아래 기지로 내려오고, 공중 적은 길을 무시하고 기지로 직진한다.

export const MAP = Object.freeze({ width: 360, height: 780 });
export const PATH = Object.freeze([[290, 56], [290, 190], [70, 190], [70, 370], [290, 370], [290, 530], [180, 530], [180, 640]]);
export const BASE_POS = Object.freeze([180, 690]);
// 공격 장비 자리 6곳. 지원 2칸은 기지 양옆에 고정(BAYS).
export const PADS = Object.freeze([[180, 112], [180, 280], [300, 280], [180, 450], [62, 520], [292, 610]]);

export const START_SUPPLY = 150;   // 시작 전(준비)에 장비 둘을 지을 수 있게
export const START_HEARTS = 20;
export const WAVE_GAP_S = 4;              // 웨이브 사이 쉬는 시간
export const CALL_EARLY_PER_S = 5;        // 바로 부르기: 남은 초 × 5 보급
export const SPAWN_SPACING_S = 0.8;
export const MAX_STORED_CARDS = 3;
export const MAX_LEVEL = 50;

// 공격 계열 3개. 지원은 자리 대신 기지 옆 칸(BAYS)으로 간다.
export const LINES = Object.freeze({
  armor: Object.freeze({ name: '기갑', buildCost: 50, path: Object.freeze(['tank', 'tankElite', Object.freeze(['railgunTank', 'plasmaTank'])]) }),
  firepower: Object.freeze({ name: '화력', buildCost: 70, path: Object.freeze(['artillery', 'selfPropelled', Object.freeze(['rocketLauncher', 'siegeMech'])]) }),
  air: Object.freeze({ name: '대공', buildCost: 60, path: Object.freeze(['helicopter', 'fighter', Object.freeze(['carrier', 'stellarBomber'])]) }),
});
// 진화 조건: 1차 Lv10, 2차(갈래) Lv20. 진화권(희귀 카드)으로만 진화하고 레벨은 유지한다.
export const EVOLVE_LEVELS = Object.freeze([10, 20]);

// 방어전 전용 장비 성능(Lv1 기준). art는 본편 그림 id.
// targets: ground/air/both · groundFactor: 지상 피해 배율 · splash: 폭발 반경 · shots: 한 번에 쏘는 수
// pierce: 일직선 관통 수 · burn: 화상(초당 피해 비율, 초) · bossFactor: 보스 피해 배율
export const TOWERS = Object.freeze({
  tank: { name: '전차', art: 'tank', targets: 'ground', range: 90, damage: 10, interval: 0.6 },
  tankElite: { name: '전차 개량형', art: 'tank', targets: 'ground', range: 100, damage: 15, interval: 0.45 },
  railgunTank: { name: '레일건 전차', art: 'railgunTank', targets: 'ground', range: 170, damage: 60, interval: 1.2, pierce: 3, ignoreShield: true },
  plasmaTank: { name: '플라스마 전차', art: 'plasmaTank', targets: 'ground', range: 100, damage: 10, interval: 0.22, burn: [0.6, 3] },
  artillery: { name: '견인포', art: 'artillery', targets: 'ground', range: 140, damage: 14, interval: 1.6, splash: 28 },
  selfPropelled: { name: '자주포', art: 'selfPropelled', targets: 'ground', range: 165, damage: 28, interval: 1.4, splash: 36 },
  rocketLauncher: { name: '다연장 로켓포', art: 'rocketLauncher', targets: 'ground', range: 165, damage: 18, interval: 2, splash: 24, shots: 6 },
  siegeMech: { name: '타이탄 공성포', art: 'siegeMech', targets: 'ground', range: 185, damage: 170, interval: 3.2, splash: 60, bossFactor: 1.5 },
  helicopter: { name: '공격헬기', art: 'helicopter', targets: 'both', groundFactor: 0.5, range: 120, damage: 9, interval: 0.5 },
  fighter: { name: '전투기', art: 'fighter', targets: 'air', range: 175, damage: 36, interval: 0.9 },
  carrier: { name: '항공모함', art: 'carrier', targets: 'both', range: 200, damage: 24, interval: 1, shots: 3 },
  stellarBomber: { name: '성운 폭격기', art: 'stellarBomber', targets: 'both', range: 165, damage: 34, interval: 1.4, splash: 30, shots: 3 },
});
Object.values(TOWERS).forEach(Object.freeze);

// 강화: 레벨마다 공격 +10%. Lv30 공통 특성, Lv40 갈래 특성, Lv50 최종(공격 ×1.5).
export const LEVEL_DAMAGE_STEP = 0.1;
export const TRAIT_LEVELS = Object.freeze([30, 40]);
export const FINAL_LEVEL_FACTOR = 1.5;
export const COMMON_TRAITS = Object.freeze([
  Object.freeze({ id: 'range', name: '사거리 +20%', range: 1.2 }),
  Object.freeze({ id: 'speed', name: '공격 속도 +20%', speed: 1.2 }),
]);
export const BRANCH_TRAITS = Object.freeze({
  railgunTank: [{ id: 'pierce', name: '관통 +2', pierce: 2 }, { id: 'boss', name: '보스 피해 +50%', bossFactor: 1.5 }],
  plasmaTank: [{ id: 'burnSpread', name: '화상 번짐', burnSpread: 30 }, { id: 'burnDouble', name: '화상 피해 2배', burnFactor: 2 }],
  rocketLauncher: [{ id: 'shots', name: '로켓 +4발', shots: 4 }, { id: 'slow', name: '맞은 적 느려짐', slow: 0.7 }],
  siegeMech: [{ id: 'splash', name: '폭발 범위 +30%', splash: 1.3 }, { id: 'boss', name: '보스 피해 +80%', bossFactor: 1.8 }],
  carrier: [{ id: 'shots', name: '함재기 +2대', shots: 2 }, { id: 'air', name: '공중 피해 2배', airFactor: 2 }],
  stellarBomber: [{ id: 'shots', name: '폭탄 +4개', shots: 4 }, { id: 'burn', name: '불타는 길', burnAdd: [0.4, 3] }],
});
Object.values(BRANCH_TRAITS).forEach(list => { list.forEach(Object.freeze); Object.freeze(list); });

// 지원 2칸(기지 양옆 고정, 공격 없음). Lv20부터 진화권으로 갈래 진화.
export const BAYS = Object.freeze({
  transport: Object.freeze({ name: '수송 비행장', buildCost: 100, branches: Object.freeze(['flyingFortress', 'transportWing']) }),
  recon: Object.freeze({ name: '정찰 비행장', buildCost: 100, branches: Object.freeze(['globalRadar', 'targetMark']) }),
});
export const BAY_EVOLVE_LEVEL = 20;

// 기지 Lv1~30: 정해진 간격마다 보급 생산. 계급이 높으면 높은 레벨로 시작.
export const BASE_MAX_LEVEL = 30;
export const RANK_START_LEVEL = Object.freeze({
  '부사령관': 1, '은하 준장': 2, '은하 소장': 3, '은하 중장': 4, '은하 대장': 5, '은하 원수': 6,
  '은하단 준장': 10, '은하단 소장': 12, '은하단 중장': 14, '은하단 대장': 16, '은하단 원수': 18,
});
export const UNLOCK_RANK = '부사령관';

// 적(공허 군단). art는 alien-art.js 그림 종류. hp는 그 웨이브 기본 체력 배율, speed는 초당 px. first = 처음 나오는 웨이브.
export const ENEMIES = Object.freeze({
  grunt: Object.freeze({ name: '갑각병', art: 'crawler', hp: 1, speed: 40, first: 1, supply: 3 }),
  air: Object.freeze({ name: '포자 드론', art: 'drone', hp: 0.8, speed: 46, first: 3, air: true, supply: 4 }),
  shield: Object.freeze({ name: '방패 갑충', art: 'shell', hp: 1.3, speed: 34, first: 8, shield: 3, supply: 4 }),
  fast: Object.freeze({ name: '질주체', art: 'runner', hp: 0.6, speed: 80, first: 14, supply: 4 }),
  stealth: Object.freeze({ name: '위상 잠입자', art: 'phase', hp: 0.9, speed: 44, first: 25, stealth: true, supply: 5 }),
  midBoss: Object.freeze({ name: '거대 갑각병', art: 'brute', hp: 14, speed: 26, boss: true, leak: 5, supply: 40 }),
});
// 20웨이브마다 큰 보스. 패턴: stun(범위 장비 정지) · summon(체력 25%마다 소환) · shield.
export const BOSSES = Object.freeze([
  Object.freeze({ wave: 20, name: '모체', art: 'mother', hp: 40, speed: 22, stun: true }),
  Object.freeze({ wave: 40, name: '포자 모선', art: 'hive', hp: 40, speed: 22, summon: true }),
  Object.freeze({ wave: 60, name: '심연 거신', art: 'colossus', hp: 44, speed: 20, stun: true, shield: 10 }),
]);
export const BOSS_STUN = Object.freeze({ every: 8, warn: 3, duration: 5, radius: 70 });
export const BOSS_SUMMON = Object.freeze({ count: 6, type: 'grunt' });

// 20웨이브 구간: 배경·적 그림·체력 배율. 61웨이브부터 처음 구간으로 돌아가며 2회차마다 체력 ×2.
export const ZONES = Object.freeze([
  Object.freeze({ id: 'asteria', name: '아스테라', theme: 'earth', hp: 1 }),
  Object.freeze({ id: 'aetherion', name: '에테리온', theme: 'space', hp: 1.5 }),
  Object.freeze({ id: 'erebus', name: '에레보스', theme: 'abyss', hp: 2.25 }),
]);
// 적은 우리 장비가 아닌 '공허 군단'(외계 생체·기계 침략군). 구간마다 같은 모양에 색만 바뀐다.
export const ZONE_PALETTE = Object.freeze({ asteria: 'rust', aetherion: 'crystal', erebus: 'magma' });
// 새 적이 처음 나올 때 띄우는 한 줄 안내.
export const ENEMY_TIPS = Object.freeze({
  air: '포자 드론(공중): 길을 무시하고 기지로 직진 · 대공만 맞혀요',
  shield: '방패 갑충: 첫 3발을 막아요 · 화력 범위·레일건이 좋아요',
  fast: '질주체: 2배 속도 · 기갑 연사·지뢰가 좋아요',
  stealth: '위상 잠입자: 정찰 비행장 레이더 안에서만 보여요',
});
export const WAVE_HP_BASE = 40;
export const WAVE_HP_GROWTH = 1.12;
export const LOOP_HP_FACTOR = 2;
export const LEAK_HEARTS = 1;
export const BOSS_LEAK_HEARTS = 5;
