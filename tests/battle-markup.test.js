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

test('deployment is equipment only: no troop inputs, slot limit shown, stored equipment included', () => {
  const state = army({ soldiers: 2, sergeants: 128,
    equipment: { artillery: { level: 3, deployed: false }, tank: null, selfPropelled: null } });
  const markup = preparationMarkup(state, STAGES[0], defaultLoadout(state));
  assert.doesNotMatch(markup, /data-battle-unit/);
  assert.match(markup, /최대 3칸/);
  assert.match(inputTag(markup, 'data-battle-gear', 'artillery'), /\bchecked\b/);
  assert.equal(inputTag(markup, 'data-battle-gear', 'tank'), undefined);
  assert.equal(inputTag(markup, 'data-battle-gear', 'selfPropelled'), undefined);
  assert.match(markup, /정찰 · 기갑 부대/);
  assert.match(markup, /공중 &gt; 기갑 &gt; 화력/);
  assert.match(markup, /이 지역에 불리 ▼/);
  assert.match(markup, /마나 18/);
  assert.match(markup, /1,282 HP/);
  assert.match(markup, /장비는 소모되지 않으며 홈 배치 설정은 유지/);
  assert.doesNotMatch(markup, /undefined|NaN/);
});

test('battlefield shows one canvas, a mana bar and one deploy card per deployed gear and keeps home economy controls out of battle', () => {
  const markup = battlefieldMarkup(createBattle(army({ equipment: { artillery: { level: 3, deployed: true }, tank: { level: 3, deployed: true } } }), 1));
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal((markup.match(/id="battle-canvas"/g) ?? []).length, 1);
  assert.equal((markup.match(/data-card-art=/g) ?? []).length, 2, 'each deploy card shows its equipment picture');
  assert.deepEqual([...markup.matchAll(/data-deploy="(\w+)"/g)].map(m => m[1]), ['artillery', 'tank']);
  assert.match(markup, /id="battle-mana-fill"/);
  assert.deepEqual([...markup.matchAll(/data-lane="(\d)"/g)].map(m => m[1]), ['0', '1', '2'], 'three lane buttons');
  assert.match(markup, /aria-label="왼쪽 레인에 출격"/);
  assert.match(markup, /width="360" height="440"/);
  for (const required of ['battle-canvas', 'battle-player-hp', 'battle-enemy-hp', 'battle-pause', 'battle-resume'])
    assert.ok(ids.includes(required));
  for (const homeControl of ['tap-zone', 'gold', 'open-shop', 'open-equipment'])
    assert.ok(!ids.includes(homeControl));
  assert.match(markup, /전투 중 터치는 골드를 지급하지 않아요/);
});

test('capital preparation shows the fortress warning and its shielded gear class; ordinary regions do not', () => {
  const state = army({ campaignCleared: 19, equipment: { artillery: { level: 3, deployed: true } } });
  const capital = preparationMarkup(state, STAGES[19], defaultLoadout(state, 20));
  assert.match(capital, /요새 수도 · 방어 장갑/);
  assert.match(capital, /기지 피해 -40%/);
  assert.doesNotMatch(preparationMarkup(state, STAGES[0], defaultLoadout(state, 1)), /요새 수도/);
});

test('preparation shows equipment as picture cards (image + name + mana badge) with a details line, not a text list', () => {
  const state = army({ soldiers: 2, sergeants: 128, equipment: { artillery: { level: 3, deployed: true }, tank: { level: 5, deployed: true } } });
  const markup = preparationMarkup(state, STAGES[0], defaultLoadout(state));
  assert.equal((markup.match(/data-card-art=/g) ?? []).length, 2);
  assert.match(markup, /class="gear-tile[^"]*"[^>]*>.*?견인포/s);
  assert.match(markup, /class="card-cost"[^>]*>18</);
  assert.match(markup, /id="battle-gear-info"/);
  assert.match(inputTag(markup, 'data-battle-gear', 'tank'), /data-info="전차 \+5 \[1문\] · 마나 24/);
  assert.doesNotMatch(markup, /자동 공격 ·/);
});
