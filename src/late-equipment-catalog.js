import { MILITARY_MAX_LEVEL } from './equipment-limits.js';
// Original fictional late-rank equipment; shared by the shop, home and battle catalogs.
export const LATE_EQUIPMENT = Object.freeze({
  carrier: Object.freeze({
    id: 'carrier', name: '항공모함', unlockRank: '소원수', introducedVersion: 27,
    cost: 45_000_000_000, maxLevel: MILITARY_MAX_LEVEL,
    passive: 22_500_000, tap: 135_000_000, passiveStep: 4_500_000, tapStep: 27_000_000,
    stages: Object.freeze(['기본 항공모함', '비행 갑판', '함재기 정비고', '선체 장갑', '관제탑 증설', '발진 설비', '레이더 기둥', '함교 보강', '방공 설비', '지휘 통신실', '최종 개량형']),
  }),
  flyingFortress: Object.freeze({
    id: 'flyingFortress', name: '공중요새', unlockRank: '중원수', introducedVersion: 27,
    cost: 150_000_000_000, maxLevel: MILITARY_MAX_LEVEL,
    passive: 75_000_000, tap: 450_000_000, passiveStep: 15_000_000, tapStep: 90_000_000,
    stages: Object.freeze(['기본 공중요새', '동체 장갑', '보조 엔진', '주익 확장', '중앙 포대', '방어 포탑', '비행 제어실', '장갑 패널', '정밀 조준기', '중앙 지휘실', '최종 개량형']),
  }),
  orbitalAssault: Object.freeze({
    id: 'orbitalAssault', name: '궤도 강습함', unlockRank: '대원수', introducedVersion: 27,
    cost: 450_000_000_000, maxLevel: MILITARY_MAX_LEVEL,
    passive: 225_000_000, tap: 1_350_000_000, passiveStep: 45_000_000, tapStep: 270_000_000,
    stages: Object.freeze(['기본 강습함', '함체 장갑', '에너지 코어', '추진기 보강', '날개 확장', '궤도 포대', '관측 센서', '보호 패널', '청광 축전기', '궤도 통제실', '최종 개량형']),
  }),
});
