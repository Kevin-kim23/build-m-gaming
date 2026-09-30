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

test('continent preview shows four nations, three locked, and map movement controls',()=>{
 const html=stagesMarkup({...freshState(0),soldiers:4});
 assert.match(html,/아스테라 대륙/);assert.equal((html.match(/class="nation-tab /g)??[]).length,4);
 assert.equal((html.match(/class="country-hit locked"/g)??[]).length,3);
 for(const d of ['up','down','left','right'])assert.match(html,new RegExp('data-pan="'+d+'"'));
 assert.doesNotMatch(html,/undefined|NaN/);
});
test('country preview exposes twenty regions but only a sequential ready action',()=>{
 const state=army({campaignCleared:2});
 const html=stagesMarkup(state,'serdin',3);
 assert.equal((html.match(/class="region-hit /g)??[]).length,20);
 assert.ok(stageCards(html).find(c=>c.id===3&&!c.disabled));
 assert.ok(stageCards(stagesMarkup(state,'serdin',4))[0].disabled);
 assert.ok(stageCards(stagesMarkup({...freshState(0),soldiers:4},'serdin',1))[0].disabled);
 assert.match(stagesMarkup(state,'serdin',1),/다시 도전/);
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
  assert.match(markup, /1,282 HP/);
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
