import { PERSONAL_EQUIPMENT } from './personal-catalog.js';
import { RANKS } from './ranks.js';
import { personalIcon } from './personal-art.js';
import { personalLevelEffect } from './personal-panels.js';

// Called only after a successful recruitment, never on loading an existing save.
export function personalAwardsBetween(previousRank, nextRank) {
  return Object.values(PERSONAL_EQUIPMENT).filter(item => {
    const rank = RANKS.indexOf(item.unlockRank);
    return rank > previousRank && rank <= nextRank;
  });
}
export function personalAwardMarkup(items) {
  return `<p class="award-kicker">진급 보상</p><h2 id="personal-award-title">개인 장비를 획득했어요!</h2>
    <div class="personal-award-list">${items.map(item => `<article>
      <div class="personal-award-art">${personalIcon(item.icon, 1)}</div>
      <div><h3>${item.name} <small>Lv.1</small></h3><p>${item.unlockRank} 진급 보상 · 자동 지급</p>
      <strong>${personalLevelEffect(item.id, 1)}</strong></div></article>`).join('')}</div>
    <p class="personal-award-note">장비 → 개인 장비 → 상세보기에서 확인하고 강화할 수 있어요.</p>
    <button type="button" data-personal-award-close autofocus>확인</button>`;
}
export function createPersonalAwardUI({root = document, canShow = () => true} = {}) {
  let dialog, pending = [];
  const seen = new Set();
  function showPending() {
    if (!pending.length || !canShow() || root.hidden || dialog?.open ||
        root.querySelector('.promotion-layer[open], #offline-reward-modal[open]')) return;
    if (!dialog) {
      dialog = root.createElement('dialog');
      dialog.id = 'personal-award-modal';
      dialog.setAttribute('aria-labelledby', 'personal-award-title');
      dialog.addEventListener('click', event => {
        if (event.target.closest('[data-personal-award-close]')) dialog.close();
      });
      root.body.appendChild(dialog);
    }
    dialog.innerHTML = personalAwardMarkup(pending);
    pending = [];
    dialog.showModal();
  }
  // Dialog close events do not bubble; capture allows promotion/return-reward sequencing.
  root.addEventListener('close', showPending, true);
  return {
    sync: showPending,
    award(previousRank, nextRank) {
      for (const item of personalAwardsBetween(previousRank, nextRank)) {
        if (!seen.has(item.id)) { seen.add(item.id); pending.push(item); }
      }
      showPending();
    },
  };
}
