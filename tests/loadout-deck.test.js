import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { battleSlots, MAX_BATTLE_SLOTS, EXTRA_SLOT_RANKS } from '../src/battle.js';
import { freshDeckView, deckAction, deckBoardMarkup, CARD_ART_LEVEL } from '../src/loadout-deck.js';

// Three owned gears, rank with the base 3 slots. Synthetic state only; no save is read or written.
const gear = level => ({ level, count: 1, deployed: true });
const army = (patch = {}) => ({ ...freshState(1000), soldiers: 880, sergeants: 40,
  equipment: { artillery: gear(3), tank: gear(5), selfPropelled: gear(2), helicopter: gear(1) }, ...patch });
const tap = (state, view, ...actions) => actions.reduce((v, a) => deckAction(state, v, a), view);

test('the board always shows six slots: open ones by rank, the rest locked with the rank that opens them', () => {
  const state = army();
  assert.equal(MAX_BATTLE_SLOTS, 6);
  assert.equal(battleSlots(state), 3);
  const html = deckBoardMarkup(state, freshDeckView(['artillery']));
  assert.equal((html.match(/class="deck-slot-locked"/g) ?? []).length, 3);
  for (const rank of EXTRA_SLOT_RANKS) assert.match(html, new RegExp(`잠긴 칸 · ${rank} 달성 시 열림`));
  assert.equal((html.match(/class="deck-slot-empty"/g) ?? []).length, 2);
  assert.match(html, /id="battle-slot-count">1 \/ 3</);
  assert.match(html, /최대 6칸/);
});

test('tapping a card opens only use/close right under it; a deck card offers remove instead', () => {
  const state = army();
  let view = tap(state, freshDeckView(['artillery']), { type: 'card', id: 'tank' });
  let html = deckBoardMarkup(state, view);
  const cell = html.match(/<div class="deck-cell is-open">[\s\S]*?<\/div><\/div>/)?.[0] ?? '';
  assert.match(cell, /data-deck-card="tank"/);
  assert.match(cell, /<div class="deck-pop"[^>]*><button[^>]*data-deck-act="use">사용<\/button><button[^>]*data-deck-act="close">닫기<\/button><\/div>/);
  assert.doesNotMatch(cell.match(/<div class="deck-pop[\s\S]*$/)[0], /전투력|화력|공격|체력/, 'no info text in the popover');
  view = tap(state, freshDeckView(['artillery']), { type: 'card', id: 'artillery' });
  assert.match(deckBoardMarkup(state, view), /data-deck-act="remove">빼기</);
  assert.equal(tap(state, view, { type: 'close' }).picked, null);
});

test('use adds into a free slot; a full deck asks which card to swap; remove frees a slot', () => {
  const state = army();
  let view = tap(state, freshDeckView(['artillery']), { type: 'card', id: 'tank' }, { type: 'use' });
  assert.deepEqual(view.deck, ['artillery', 'tank']);
  view = tap(state, view, { type: 'card', id: 'selfPropelled' }, { type: 'use' });
  assert.equal(view.deck.length, 3);
  view = tap(state, view, { type: 'card', id: 'helicopter' }, { type: 'use' });
  assert.equal(view.swap, true);
  assert.equal(view.deck.length, 3, 'never more than the rank allows');
  assert.match(view.message, /가득 찼어요\(3칸\)/);
  assert.match(deckBoardMarkup(state, view), /바꿀 장비를 누르세요/);
  view = tap(state, view, { type: 'card', id: 'tank' });
  assert.equal(view.swap, false);
  assert.ok(view.deck.includes('helicopter') && !view.deck.includes('tank'));
  view = tap(state, view, { type: 'card', id: 'helicopter' }, { type: 'remove' });
  assert.equal(view.deck.includes('helicopter'), false);
  view = tap(state, view, { type: 'slot' });
  assert.match(view.message, /보유 장비를 누른 뒤/);
});

test('cards share one look: same base art for every level, no info button, no class labels', () => {
  const state = army({ equipment: { artillery: gear(30), tank: gear(1), selfPropelled: gear(12) } });
  const html = deckBoardMarkup(state, freshDeckView(['artillery']));
  const levels = [...html.matchAll(/data-gear-art="\w+" data-level="(\d+)"/g)].map(m => m[1]);
  assert.equal(levels.length, 3);
  assert.deepEqual([...new Set(levels)], [String(CARD_ART_LEVEL)], 'upgrade glow never changes the card picture');
  assert.match(html, /Lv\.30/);
  assert.doesNotMatch(html, /deck-info|deck-power|전투력/);
  assert.doesNotMatch(html.replaceAll('공중요새', ''), /cls-|화력|기갑|공중|지원|유리|불리/);
});

test('equipment you do not own appears locked and can never be picked', () => {
  const state = army();
  const html = deckBoardMarkup(state, freshDeckView([]));
  assert.match(html, /class="deck-card locked" aria-label="[^"]+ 미보유"/);
  const view = tap(state, freshDeckView([]), { type: 'card', id: 'icbm' }, { type: 'use' });
  assert.equal(view.picked, null);
  assert.deepEqual(view.deck, []);
});
