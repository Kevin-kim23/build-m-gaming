import { stageEnemyType } from './battle.js';

// 스테이지 특징 칩(적 유형·첫 출격·수도 요새). 진격 로드와 출격 편성 화면이 함께 쓴다.
export function stageTagsMarkup(stage) {
  const type = stageEnemyType(stage.id);
  return `<span class="chip">${type.name}</span>${type.intro?'<span class="chip">견인포로 첫 출격</span>':''}${stage.capital?'<span class="chip">수도 요새</span>':''}`;
}
