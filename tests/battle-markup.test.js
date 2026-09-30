import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { STAGES, defaultLoadout, createBattle } from '../src/battle.js';
import { stagesMarkup, preparationMarkup, battlefieldMarkup } from '../src/battle-markup.js';

const army = (patch = {}) => ({ ...freshState(1000), soldiers: 880, sergeants: 40, ...patch });
function stageCards(markup) {
  return [...markup.matchAll(/<button\b([^>]*\bdata-stage="(\d+)"[^>]*)>([\s\S]*?)<\/button>/g)]
    .map(([, attrs, id, content]) => ({ id: Number(id), disabled: /\bdisabled\b/.test(attrs), content }));
}
function inputTag(markup, attribute, id) {
  return markup.match(new RegExp(`<input\\b[^>]*${attribute}="${id}"[^>]*>`))?.[0];
}

test('early battle preview lists every stage but offers no playable entry before lieutenant colonel', () => {
  const privateFirstClass = { ...freshState(1000), soldiers: 4 };
  const markup = stagesMarkup(privateFirstClass), cards = stageCards(markup);
  assert.equal(cards.length, 10);
  assert.deepEqual(cards.map(c => c.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(cards.every(c => c.disabled));
  assert.match(markup, /중령 진급 후 출전/);
  assert.match(cards[0].content, /대대 전투1/);
  assert.match(cards[9].content, /야전군 전투2/);
  assert.match(markup, /가상 국가/);
  assert.doesNotMatch(markup, /undefined|NaN/);
});

test('stage map allows cleared-stage replays and only the next uncleared stage', () => {
  const newCards = stageCards(stagesMarkup(army()));
  assert.deepEqual(newCards.filter(c => !c.disabled).map(c => c.id), [1]);
  const markup = stagesMarkup(army({ battleCleared: 2 })), progressed = stageCards(markup);
  assert.deepEqual(progressed.filter(c => !c.disabled).map(c => c.id), [1, 2, 3]);
  assert.ok(progressed.slice(0, 2).every(c => /완료/.test(c.content)));
  assert.doesNotMatch(progressed[2].content, /완료/);
  assert.ok(progressed.slice(3).every(c => /잠금/.test(c.content)));
  assert.doesNotMatch(markup, /중령 진급 후 출전/);
  assert.match(markup, /보상은 아직 없습니다/);
});

test('deployment shows actual owned troop limits and includes stored equipment without inventing units', () => {
  const state = army({ soldiers: 2, sergeants: 128,
    equipment: { artillery: { level: 3, deployed: false }, tank: null, selfPropelled: null } });
  const markup = preparationMarkup(state, STAGES[0], defaultLoadout(state));
  assert.match(inputTag(markup, 'data-battle-unit', 'soldier'), /max="2"/);
  assert.match(inputTag(markup, 'data-battle-unit', 'soldier'), /value="2"/);
  assert.match(inputTag(markup, 'data-battle-unit', 'sergeant'), /max="10"/);
  assert.match(inputTag(markup, 'data-battle-unit', 'sergeant'), /value="10"/);
  assert.equal(inputTag(markup, 'data-battle-unit', 'staffSergeant'), undefined);
  assert.match(inputTag(markup, 'data-battle-gear', 'artillery'), /\bchecked\b/);
  assert.equal(inputTag(markup, 'data-battle-gear', 'tank'), undefined);
  assert.equal(inputTag(markup, 'data-battle-gear', 'selfPropelled'), undefined);
  assert.match(markup, /1,280 HP/);
  assert.match(markup, /병력·장비는 소모되지 않으며 홈 배치 설정은 유지/);
  assert.doesNotMatch(markup, /undefined|NaN/);
});

test('battlefield owns one accessible firing target and keeps home economy controls out of battle', () => {
  const markup = battlefieldMarkup(createBattle(army(), 1));
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal((markup.match(/<canvas\b/g) ?? []).length, 1);
  assert.match(markup, /<button[^>]*id="battle-field"[^>]*aria-label="전원 사격"/);
  for (const required of ['battle-canvas', 'battle-player-hp', 'battle-enemy-hp', 'battle-pause', 'battle-resume'])
    assert.ok(ids.includes(required));
  for (const homeControl of ['tap-zone', 'gold', 'open-shop', 'open-equipment'])
    assert.ok(!ids.includes(homeControl));
  assert.match(markup, /전투 터치는 골드를 지급하지 않아요/);
});
