import { ACHIEVEMENTS, FORMATION_ACHIEVEMENTS, BATTLE_ACHIEVEMENTS, achievementProgress } from "./achievements.js";
import { medalSvg } from "./achievement-art.js";
import { fmt } from "./format.js";
export const achievementDescription = definition => definition.category === 'battle'
  ? definition.description : `첫 ${definition.formationName} 1개 달성 · 전력 ${fmt(definition.required)}`;

export function medalShelfMarkup() {
  return `<section class="medal-shelf" aria-label="획득한 훈장">
    <div class="medal-shelf-heading"><span id="medal-count">훈장 0 / ${ACHIEVEMENTS.length}</span><span class="medal-shelf-actions"><button id="toggle-medals" type="button" aria-expanded="true" aria-controls="medal-list">숨기기</button><button id="open-achievements" type="button">도전과제 <span aria-hidden="true">›</span></button></span></div>
    <ol id="medal-list" aria-label="획득 순서대로 놓인 훈장"></ol>
  </section>`;
}

export function achievementCardMarkup(state, definition, selectedId) {
  const progress = achievementProgress(state, definition.id), earned = progress.earned;
  const completed = earned ? progress.required : Math.min(progress.current, progress.required);
  return `<article class="achievement-card${earned ? " earned" : " locked"}${selectedId === definition.id ? " selected" : ""}" data-achievement="${definition.id}">
    <div class="achievement-medal">${medalSvg(definition.id)}</div>
    <div class="achievement-card-content"><div class="achievement-card-heading"><h3>${definition.title}</h3><span class="achievement-status">${earned ? "획득 완료" : "도전 중"}</span></div>
      <p>${achievementDescription(definition)}</p>
      <div class="achievement-progress"><progress max="${progress.required}" value="${completed}" aria-label="${definition.title} 달성 진행"></progress><span>${fmt(completed)} / ${fmt(progress.required)}</span></div>
    </div>
  </article>`;
}

export function achievementListMarkup(state, selectedId = null) {
  const earned = ACHIEVEMENTS.filter((item) => achievementProgress(state, item.id).earned).length;
  return `<div class="achievement-dialog-heading"><div><small>HONORS</small><h2 id="achievements-title">도전과제</h2></div><button id="close-achievements" type="button" aria-label="도전과제 닫기">×</button></div>
    <p class="achievement-intro">편제 성장과 대륙 정복에 따라 훈장이 자동으로 지급됩니다.<br>받은 훈장은 홈에 획득 순서대로 보관됩니다.</p>
    <p class="achievement-total">훈장 <strong>${earned}</strong> / ${ACHIEVEMENTS.length}</p>
    <div class="achievement-list"><h3 class="achievement-category">부대 성장 · ${FORMATION_ACHIEVEMENTS.length}종</h3>${FORMATION_ACHIEVEMENTS.map((definition) => achievementCardMarkup(state, definition, selectedId)).join("")}<h3 class="achievement-category">대륙 정복 · ${BATTLE_ACHIEVEMENTS.length}종</h3><p class="achievement-category-note">점령한 지역의 누적 개수입니다. 재도전 승리는 중복 집계하지 않습니다.</p>${BATTLE_ACHIEVEMENTS.map((definition) => achievementCardMarkup(state, definition, selectedId)).join("")}</div>`;
}
