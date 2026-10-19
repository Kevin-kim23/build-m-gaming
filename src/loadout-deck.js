import { UNIT_TRAITS, battleSlots, normalizeLoadout, EXTRA_SLOT_RANKS, MAX_BATTLE_SLOTS } from './battle.js';
import { EQUIPMENT } from './equipment.js';
import { battleIcon } from './battle-icons.js';

// 출격 편성 카드 덱(클래식 카드 덱): 위는 출격 칸(계급별 3~6칸, 잠긴 칸 표시), 아래는 보유 장비.
// 카드를 누르면 바로 아래에 사용(빼기)·닫기만 뜬다. 모든 카드는 같은 색, 그림은 강화 장식 없는 기본형으로 통일한다
// (강화 단계는 Lv 숫자로만). 이 파일의 규칙은 순수 함수이고 저장하지 않는다.
export const CARD_ART_LEVEL = 1;
export const freshDeckView = (deck = []) => ({ deck: [...deck], picked: null, swap: false, message: '' });

// One tap → the next view. Deck order always follows the shared loadout rules.
export function deckAction(state, view, action) {
  const limit = battleSlots(state), next = { ...view, deck: [...view.deck] };
  const tidy = () => { next.deck = normalizeLoadout(state, { equipment: next.deck }).equipment; };
  const { type, id } = action;
  if (type === 'close') return { ...next, picked: null, swap: false, message: '' };
  if (type === 'card' && view.deck.includes(id)) {
    if (view.swap && view.picked && !view.deck.includes(view.picked)) {
      next.deck[next.deck.indexOf(id)] = view.picked;
      tidy(); return { ...next, picked: null, swap: false, message: '' };
    }
    return { ...next, picked: view.picked === id ? null : id, swap: false, message: '' };
  }
  if (type === 'card') return state.equipment?.[id] ? { ...next, picked: view.picked === id ? null : id, swap: false, message: '' } : next;
  if (type === 'remove' && view.deck.includes(view.picked)) {
    next.deck = next.deck.filter(gear => gear !== view.picked);
    return { ...next, picked: null, message: '' };
  }
  const placeable = view.picked && !view.deck.includes(view.picked) && state.equipment?.[view.picked];
  if ((type === 'use' || type === 'slot') && placeable) {
    if (next.deck.length < limit) { next.deck.push(view.picked); tidy(); return { ...next, picked: null, swap: false, message: '' }; }
    return { ...next, swap: true, message: `출격 칸이 가득 찼어요(${limit}칸). 바꿀 장비를 위에서 누르세요.` };
  }
  if (type === 'slot') return { ...next, message: '아래 보유 장비를 누른 뒤 사용을 누르세요.' };
  return next;
}

const cardCost = id => UNIT_TRAITS[id].cost;
function card(state, view, id, inDeck) {
  const level = state.equipment[id].level, name = EQUIPMENT[id].name, open = view.picked === id;
  const pop = !open ? '' : `<div class="deck-pop" role="group" aria-label="${name}">${inDeck
    ? '<button type="button" data-deck-act="remove">빼기</button>' : '<button type="button" class="primary" data-deck-act="use">사용</button>'}<button type="button" data-deck-act="close">닫기</button></div>`;
  return `<div class="deck-cell${open ? ' is-open' : ''}"><button type="button" class="deck-card${open ? ' is-selected' : ''}" data-deck-card="${id}"${inDeck && view.swap ? ' data-wiggle' : ''} aria-pressed="${open}" aria-label="${name}, 마나 ${cardCost(id)}, 강화 ${level}${inDeck ? ', 출격 칸' : ''}">
    <i class="deck-mana" aria-hidden="true">${cardCost(id)}</i><span class="deck-art"><canvas data-gear-art="${id}" data-level="${CARD_ART_LEVEL}" width="120" height="68" aria-hidden="true"></canvas></span><span class="deck-level">Lv.${level}</span><b class="deck-name">${name}</b>
</button>${pop}</div>`;
}
export function deckBoardMarkup(state, view) {
  const limit = battleSlots(state), owned = Object.keys(EQUIPMENT).filter(id => state.equipment?.[id]);
  const avg = view.deck.length ? Math.round(view.deck.reduce((sum, id) => sum + cardCost(id), 0) / view.deck.length) : 0;
  const slots = Array.from({ length: MAX_BATTLE_SLOTS }, (_, i) => i >= limit
    ? `<div class="deck-slot-locked" aria-label="잠긴 칸 · ${EXTRA_SLOT_RANKS[i - 3]} 달성 시 열림">${battleIcon('lock')}<small>${EXTRA_SLOT_RANKS[i - 3]} 달성 시<br>열림</small></div>`
    : view.deck[i] ? card(state, view, view.deck[i], true)
    : `<button type="button" class="deck-slot-empty" data-deck-slot="${i}" aria-label="빈 칸 ${i + 1}">+</button>`).join('');
  const collection = owned.filter(id => !view.deck.includes(id)).map(id => card(state, view, id, false)).join('')
    + Object.keys(EQUIPMENT).filter(id => !state.equipment?.[id]).map(id => `<div class="deck-card locked" aria-label="${EQUIPMENT[id].name} 미보유">${battleIcon('lock')}<b class="deck-name">${EQUIPMENT[id].name}</b><small>장비 탭에서 구매</small></div>`).join('');
  return `<div class="deck-board"><div class="brief-deck-head"><span>출전 장비 <b id="battle-slot-count">${view.deck.length} / ${limit}</b><small class="deck-max">최대 ${MAX_BATTLE_SLOTS}칸</small></span><span class="deck-avg">${battleIcon('mana')} 평균 ${avg}</span></div>
    ${view.swap ? `<p class="deck-swap" role="status">${battleIcon('info')} 바꿀 장비를 누르세요</p>` : ''}
    <div class="deck-slots" role="group" aria-label="출격 칸">${slots}</div>
    <h4 class="deck-list-title">보유 장비 <small>${owned.length}개</small></h4>
    <div class="deck-collection" role="group" aria-label="보유 장비">${collection}</div></div>`;
}
