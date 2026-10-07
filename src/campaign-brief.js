import { REGION_INCOME_PERCENT } from './campaign-rewards.js';
import { battleAccess, battleSlots } from './battle.js';
import { stageTagsMarkup, quickDeckMarkup } from './quick-deck.js';
import { armyPower } from './units.js';
import { fmt } from './format.js';

export function stageBriefMarkup(state, selected, deckIds = []) {
  const access = battleAccess(state), cleared = state.campaignCleared ?? 0;
  const done = selected.id <= cleared;
  const canPrepare = access.unlocked && selected.id <= cleared + 1;
  return `<section class="region-brief" aria-label="선택한 지역 출전 준비"><div class="brief-head"><div><small>${selected.capital ? '최종 수도전' : '출전 준비'}</small><h3>${selected.name}</h3></div><button class="info-btn" data-battle-info data-info-stage="${selected.id}" aria-label="${selected.name} 상세보기">ⓘ</button></div>
    <p class="brief-line">권장 전력 <strong>${fmt(selected.recommendedPower)}</strong> · 내 전력 ${fmt(armyPower(state))}</p>
    ${canPrepare ? `<div class="prep-tags">${stageTagsMarkup(selected)}</div><div class="brief-deck-head"><span>출전 장비</span><b id="battle-slot-count">${deckIds.length} / ${battleSlots(state)}</b></div>${quickDeckMarkup(state, selected, deckIds)}<p role="status" class="battle-message" id="battle-message"></p>` : ''}
    <button class="battle-primary" data-stage="${selected.id}" ${canPrepare ? '' : 'disabled'}>${!access.unlocked ? '중령부터 출전' : done ? '다시 도전' : '전투 시작'}</button>
    <p class="region-reward">${done ? '점령 보너스 획득 완료' : '최초 점령 보상'} · 초당 수입 +${REGION_INCOME_PERCENT}%</p></section>`;
}
