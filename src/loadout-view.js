import { battleAccess, battleSlots } from './battle.js';
import { stageTagsMarkup, quickDeckMarkup } from './quick-deck.js';
import { armyPower } from './units.js';
import { fmt } from './format.js';
import { battleIcon } from './battle-icons.js';

// 출격 편성: the road picks a stage, this separate screen picks the equipment and starts the battle.
// ← (data-battle-back) returns to the same stage on the road; Android Back takes the same path (data-back-first).
export function loadoutMarkup(state, stage, deckIds) {
  const cleared = state.campaignCleared ?? 0, ready = battleAccess(state).unlocked && stage.id <= cleared + 1;
  return `<header class="battle-header loadout-head"><button type="button" data-battle-back data-back-first aria-label="스테이지 선택으로 돌아가기">${battleIcon('left')}</button><div><small>출격 편성 · STAGE ${String(stage.continentStage).padStart(2, '0')}</small><h2 id="battle-title">${stage.name}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header><p class="battle-session-note" role="status" data-battle-session></p>
  <section class="region-brief loadout-panel" aria-label="출전 장비 선택">
    <p class="brief-line">권장 전력 <strong>${fmt(stage.recommendedPower)}</strong> · 장비 +${stage.recommendedLevel}<br>내 전력 ${fmt(armyPower(state))}</p>
    <div class="prep-tags">${stageTagsMarkup(stage)}</div>
    <div class="brief-deck-head"><span>출전 장비</span><b id="battle-slot-count">${deckIds.length} / ${battleSlots(state)}</b></div>
    ${quickDeckMarkup(state, stage, deckIds)}
    <p role="status" class="battle-message" id="battle-message"></p>
    <button class="battle-primary" data-battle-start ${ready ? '' : 'disabled'}>전투 시작</button>
  </section>`;
}
