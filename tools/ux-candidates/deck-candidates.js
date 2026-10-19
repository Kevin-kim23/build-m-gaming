// Five loadout candidates inspired by card-battle deck screens. Local preview state only.
import {SAMPLE, CARDS, STARTER_DECK, card, gearCard, avgCost, icon, art, manaGem} from './data.js';
import {EQUIPMENT} from '../../src/equipment.js';

const LOCKED = Object.keys(EQUIPMENT).filter(id => !CARDS.some(c => c.id === id)).slice(0, 4);
const lockedCard = id => `<div class="gear-card locked" aria-label="${EQUIPMENT[id].name} 미보유">${icon('lock')}<span class="card-name">${EQUIPMENT[id].name}</span><small>장비 탭에서 구매</small></div>`;
export const freshDeckState = () => ({deck: [...STARTER_DECK], picked: null, swap: false, preset: 0,
  presets: [[...STARTER_DECK], ['tank', 'railgunTank', 'fighter', 'carrier', 'transport'], ['icbm', 'orbitalAssault', 'artillery', 'selfPropelled', 'transport']],
  filter: 'all', sort: 'cost', message: '', info: null});
const head = (title, sub, extra = '') => `<header class="phone-head"><div><small>${sub}</small><h3>${title}</h3></div>${extra}</header>`;
const deckHead = s => `<div class="deck-head"><b>출격 장비 <span>${s.deck.length} / ${SAMPLE.slots}</span><small class="max-note">최대 ${SAMPLE.maxSlots}칸</small></b><span class="avg">${icon('mana')} 평균 ${avgCost(s.deck)}</span></div>`;
// Popover sits right under the tapped card and holds only the action and a close button.
const popover = (s, id) => s.picked !== id ? '' : `<div class="card-pop" role="group" aria-label="${card(id).name}">${s.deck.includes(id)
  ? '<button type="button" data-act="remove">빼기</button>' : '<button type="button" data-act="use" class="primary">사용</button>'}<button type="button" data-act="cancel">닫기</button></div>`;
const cell = (s, id, attrs) => gearCard(card(id), {selected: s.picked === id, info: s.info === id, attrs, popover: popover(s, id)});
function slots(s, {attr = 'data-deck', wiggle = false} = {}) {
  return `<div class="deck-grid">${Array.from({length: SAMPLE.maxSlots}, (_, i) => i >= SAMPLE.slots
    ? `<div class="slot-locked" aria-label="잠긴 칸 · ${SAMPLE.nextSlotRank} 달성 시 열림">${icon('lock')}<small>${SAMPLE.nextSlotRank} 달성 시<br>열림</small></div>`
    : s.deck[i] ? cell(s, s.deck[i], `${attr}="${s.deck[i]}" data-slot="${i}"${wiggle ? ' data-wiggle' : ''}`)
    : `<button type="button" class="slot-empty" data-slot="${i}" aria-label="빈 칸 ${i + 1}">+</button>`).join('')}</div>`;
}
const collection = (s, list = CARDS) => `<div class="collection-grid">${list.filter(c => !s.deck.includes(c.id)).map(c => cell(s, c.id, `data-collect="${c.id}"`)).join('')}${LOCKED.map(lockedCard).join('')}</div>`;
const footer = (s, label = '이 편성으로 출격') => `<footer class="phone-footer"><p class="deck-message" role="status">${s.message}</p><button type="button" class="cta" ${s.deck.length ? '' : 'disabled'}>${label}</button></footer>`;

// A · Classic: tap a card for Use / Remove; when the deck is full, "Use" asks which slot to swap.
function classic(s) {
  return `${head('출격 편성', '아스테라 스테이지 24')}<div class="phone-content pad">${deckHead(s)}
    ${s.swap ? `<p class="swap-banner">${icon('info')} 바꿀 장비를 누르세요</p>` : ''}${slots(s, {wiggle: s.swap})}
    <h4 class="list-title">보유 장비 <small>${CARDS.length}개</small></h4>${collection(s)}</div>${footer(s)}`;
}
// B · Deck presets: three saved decks you switch with one tap, plus auto-fill.
function presets(s) {
  const tabs = s.presets.map((_, i) => `<button type="button" class="preset-tab" data-preset="${i}" aria-pressed="${s.preset === i}">덱 ${i + 1}</button>`).join('');
  return `${head('출격 편성', '아스테라 스테이지 24')}<div class="preset-bar">${tabs}<button type="button" class="ghost-btn" data-auto>자동 편성</button></div>
    <div class="phone-content pad">${deckHead(s)}${s.swap ? `<p class="swap-banner">${icon('info')} 바꿀 장비를 누르세요</p>` : ''}${slots(s, {wiggle: s.swap})}
    <h4 class="list-title">보유 장비</h4>${collection(s)}</div>${footer(s)}`;
}
// C · Drag and drop: drag a card onto a slot; tap card then tap slot also works.
function dragDrop(s) {
  return `${head('출격 편성', '아스테라 스테이지 24')}<div class="phone-content pad" data-drag-zone>${deckHead(s)}
    <p class="hint">카드를 위 칸으로 끌어 놓으세요. 누른 뒤 칸을 눌러도 됩니다.</p>${slots(s)}
    <h4 class="list-title">보유 장비</h4>${collection(s)}</div>${footer(s)}`;
}
// D · Launch sheet: deck check pops up over the stage screen just before battle.
function launchSheet(s) {
  const strong = [...CARDS].sort((a, b) => b.level * 100 + b.cost - (a.level * 100 + a.cost)).slice(0, SAMPLE.slots).map(c => c.id);
  return `${head('작전 사령실', '전투')}<div class="phone-content dimmed"><div class="behind-stage"><strong>스테이지 24</strong><span>철도 분기점 · 벨로크 연방</span></div></div>
    <div class="bottom-sheet" role="dialog" aria-label="출격 전 편성 확인"><span class="grabber"></span>${deckHead(s)}
      <div class="sheet-deck">${s.deck.map(id => `<button type="button" class="mini-card cls-${card(id).cls}" data-deck="${id}" aria-label="${card(id).name} 빼기">${art(id, 60, 34)}${manaGem(card(id))}<i>×</i></button>`).join('')}${Array.from({length: SAMPLE.slots - s.deck.length}, () => '<span class="mini-card empty">+</span>').join('')}</div>
      <div class="quick-chips"><button type="button" data-quick="last">이전 편성</button><button type="button" data-quick="auto" data-ids="${strong.join(',')}">강한 순 자동</button><button type="button" data-quick="air">공중 대비</button></div>
      <div class="sheet-collection">${CARDS.filter(c => !s.deck.includes(c.id)).map(c => `<button type="button" class="mini-card cls-${c.cls}" data-collect-quick="${c.id}" aria-label="${c.name} 추가">${art(c.id, 60, 34)}${manaGem(c)}</button>`).join('')}</div>
      <p class="deck-message" role="status">${s.message}</p><button type="button" class="cta" ${s.deck.length ? '' : 'disabled'}>출격</button></div>`;
}
// E · Role analysis: filter/sort the collection and see mana curve + role gaps before battle.
function analysis(s) {
  const filters = [['all', '전체'], ['firepower', '화력'], ['armor', '기갑'], ['air', '공중'], ['support', '지원']];
  const sorts = [['cost', '마나순'], ['damage', '공격순'], ['level', '강화순']];
  const list = CARDS.filter(c => s.filter === 'all' || c.cls === s.filter).sort((a, b) => s.sort === 'cost' ? a.cost - b.cost : s.sort === 'damage' ? b.damage - a.damage : b.level - a.level);
  const roles = ['firepower', 'armor', 'air', 'support'].map(r => [r, s.deck.filter(id => card(id).cls === r).length]);
  const gaps = roles.filter(([, n]) => !n).map(([r]) => ({firepower: '화력', armor: '기갑', air: '공중', support: '지원(회복)'})[r]);
  const bins = [[0, 30], [31, 50], [51, 70], [71, 100]].map(([lo, hi]) => s.deck.filter(id => card(id).cost >= lo && card(id).cost <= hi).length);
  return `${head('출격 편성', '아스테라 스테이지 24')}<div class="phone-content pad">${deckHead(s)}${slots(s)}
    <div class="analysis"><div class="curve" aria-label="마나 분포">${bins.map((n, i) => `<span style="--h:${n / SAMPLE.slots}"><i></i><small>${['~30', '~50', '~70', '~100'][i]}</small></span>`).join('')}</div>
      <p class="${gaps.length ? 'warn' : 'ok'}">${gaps.length ? `${icon('info')} 빠진 역할: ${gaps.join(', ')}` : '역할이 고르게 들어갔어요'}</p></div>
    <div class="filters">${filters.map(([k, l]) => `<button type="button" class="filter-chip" data-cls="${k}" aria-pressed="${s.filter === k}">${l}</button>`).join('')}</div>
    <div class="sort-row">${sorts.map(([k, l]) => `<button type="button" class="sort-chip" data-sort="${k}" aria-pressed="${s.sort === k}">${l}</button>`).join('')}</div>
    <div class="stat-list">${list.map(c => `<button type="button" class="stat-row cls-${c.cls}${s.deck.includes(c.id) ? ' in-deck' : ''}" data-toggle="${c.id}" aria-pressed="${s.deck.includes(c.id)}">${manaGem(c)}<span class="row-art">${art(c.id, 72, 40)}</span><span class="row-main"><strong>${c.name}</strong><small>${c.clsName} · Lv.${c.level}</small></span><span class="row-bars"><i style="--v:${Math.min(1, c.damage / 40)}"></i><i class="hp" style="--v:${Math.min(1, c.hp / 400)}"></i></span><b>${s.deck.includes(c.id) ? '편성됨' : '추가'}</b></button>`).join('')}</div></div>${footer(s)}`;
}

// Shared deck rules: never more than the rank's slots, swap when full, never zero at launch.
function add(s, id) {
  if (s.deck.includes(id)) return;
  if (s.deck.length < SAMPLE.slots) { s.deck.push(id); s.message = ''; } else { s.swap = true; s.message = `최대 ${SAMPLE.slots}칸이에요. 바꿀 장비를 누르세요.`; return; }
  s.picked = null;
}
export function handleDeck(s, b) {
  const d = b.dataset;
  if (d.info) { s.info = s.info === d.info ? null : d.info; return true; }
  if (d.act === 'cancel') { s.picked = null; s.swap = false; return true; }
  if (d.act === 'remove') { s.deck = s.deck.filter(id => id !== s.picked); s.picked = null; s.message = ''; return true; }
  if (d.act === 'use') { add(s, s.picked); return true; }
  if (d.deck && s.swap && s.picked) { s.deck[s.deck.indexOf(d.deck)] = s.picked; s.picked = null; s.swap = false; s.message = ''; return true; }
  if (d.deck && b.closest('.sheet-deck')) { s.deck = s.deck.filter(id => id !== d.deck); return true; }
  if (d.deck) { s.picked = s.picked === d.deck ? null : d.deck; return true; }
  if (d.collect) { s.picked = s.picked === d.collect ? null : d.collect; s.swap = false; return true; }
  if (d.slot !== undefined && s.picked && !s.deck.includes(s.picked)) { const i = Number(d.slot); if (s.deck[i]) s.deck[i] = s.picked; else add(s, s.picked); s.picked = null; return true; }
  if (d.collectQuick) { if (s.deck.length < SAMPLE.slots) s.deck.push(d.collectQuick); else s.message = `최대 ${SAMPLE.slots}칸이에요. 위에서 하나를 빼 주세요.`; return true; }
  if (d.quick) { s.deck = d.quick === 'auto' ? d.ids.split(',') : d.quick === 'air' ? ['fighter', 'helicopter', 'carrier', 'artillery', 'transport'] : [...STARTER_DECK]; s.message = ''; return true; }
  if (d.preset !== undefined) { s.presets[s.preset] = [...s.deck]; s.preset = Number(d.preset); s.deck = [...s.presets[s.preset]]; s.picked = null; s.swap = false; return true; }
  if (d.auto !== undefined) { s.deck = [...CARDS].sort((a, b) => b.level - a.level).slice(0, SAMPLE.slots).map(c => c.id); return true; }
  if (d.cls) { s.filter = d.cls; return true; }
  if (d.sort) { s.sort = d.sort; return true; }
  if (d.toggle) { if (s.deck.includes(d.toggle)) s.deck = s.deck.filter(id => id !== d.toggle); else if (s.deck.length < SAMPLE.slots) s.deck.push(d.toggle); else s.message = `최대 ${SAMPLE.slots}칸이에요. 하나를 빼 주세요.`; return true; }
  return false;
}
export function dropOnSlot(s, id, slot) {
  if (!id || s.deck.includes(id)) return false;
  if (s.deck[slot]) s.deck[slot] = id; else add(s, id);
  s.picked = null; return true;
}

export const DECK_CANDIDATES = Object.freeze([
  {id: 'A', title: '클래식 카드 덱', tag: '추천 · 클래시 로얄 방식', render: classic,
    copy: '위는 출격 칸, 아래는 보유 장비. 카드를 누르면 사용/빼기가 나오고, 칸이 꽉 차면 바꿀 카드를 고릅니다.',
    pros: '익숙한 방식, 실수 적음', cons: '장비가 많으면 아래 목록이 길어짐'},
  {id: 'B', title: '덱 3개 저장', tag: '상황별 덱 전환', render: presets,
    copy: '덱 1·2·3에 편성을 저장해 두고 한 번에 바꿉니다. 자동 편성 버튼도 있습니다.',
    pros: '공중전·수도전 등 상황별로 빠르게', cons: '저장 형식 변경 필요(덱 여러 개 저장)'},
  {id: 'C', title: '끌어서 놓기', tag: '손맛 중심', render: dragDrop,
    copy: '카드를 위 칸으로 끌어 놓습니다. 끌기가 어려우면 카드를 누르고 칸을 눌러도 됩니다.',
    pros: '직관적이고 재미있음', cons: '작은 화면·한 손 조작에서 실수 가능'},
  {id: 'D', title: '출격 전 시트', tag: '가장 짧은 흐름', render: launchSheet,
    copy: '스테이지에서 출격을 누르면 아래에서 편성 확인 창이 올라옵니다. 이전 편성·자동 편성을 한 번에.',
    pros: '반복 전투가 가장 빠름', cons: '장비 정보를 자세히 보긴 어려움'},
  {id: 'E', title: '역할 분석형', tag: '전략 중심', render: analysis,
    copy: '화력·기갑·공중·지원으로 걸러 보고, 마나 분포와 빠진 역할을 알려 줍니다.',
    pros: '왜 지는지 이해하기 쉬움', cons: '처음 보는 사람에겐 정보가 많음'},
]);
