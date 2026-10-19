import { fmt } from './format.js';
import { lootIcon } from './operative-art.js';

// Presentation only: receives the amount already awarded by recordBattleVictory.
function lootView(amount) {
  const visible = Number.isSafeInteger(amount) && amount >= 0;
  return {
    visible,
    earned: visible && amount > 0,
    label: visible ? (amount > 0 ? `${fmt(amount)}개 획득!` : '보상 없음') : '',
  };
}

export function battleLootMarkup(amount = null) {
  const view = lootView(amount);
  return `<div class="battle-loot-reward${view.earned ? '' : ' is-empty'}" id="battle-result-loot" role="status" aria-live="polite" aria-atomic="true"${view.visible ? '' : ' hidden'}>
    <span class="battle-loot-art" data-result-loot-art aria-hidden="true"${view.earned ? '' : ' hidden'}>${lootIcon()}</span>
    <span class="battle-loot-caption"><span class="battle-loot-label">전리품</span><strong data-result-loot-amount>${view.label}</strong></span>
  </div>`;
}

// Called once when showing a result or clearing a pause/defeat screen, never per frame.
export function renderBattleLoot(container, amount = null) {
  if (!container) return;
  const view = lootView(amount);
  container.hidden = !view.visible;
  container.classList.toggle('is-empty', !view.earned);
  container.querySelector('[data-result-loot-art]').hidden = !view.earned;
  container.querySelector('[data-result-loot-amount]').textContent = view.label;
}
