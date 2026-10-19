import { battleAccess } from './battle.js';
import { deckBoardMarkup } from './loadout-deck.js';
import { battleIcon } from './battle-icons.js';

// 출격 편성: the road picks a stage, this separate screen picks the equipment and starts the battle.
// ← (data-battle-back) returns to the same stage on the road; Android Back takes the same path (data-back-first).
export function loadoutMarkup(state, stage, view) {
  const cleared = state.campaignCleared ?? 0, ready = battleAccess(state).unlocked && stage.id <= cleared + 1;
  return `<header class="battle-header loadout-head"><button type="button" data-battle-back data-back-first aria-label="스테이지 선택으로 돌아가기">${battleIcon('left')}</button><div><small>출격 편성 · STAGE ${String(stage.continentStage).padStart(2, '0')}</small><h2 id="battle-title">${stage.name}</h2></div><button data-battle-close aria-label="전투 메뉴 닫기">×</button></header><p class="battle-session-note" role="status" data-battle-session></p>
  <section class="loadout-panel" aria-label="출전 장비 선택">
    ${deckBoardMarkup(state, view)}
    <p role="status" class="battle-message" id="battle-message">${view.message}</p>
    <button class="battle-primary" data-battle-start ${ready ? '' : 'disabled'}>전투 시작</button>
  </section>`;
}
