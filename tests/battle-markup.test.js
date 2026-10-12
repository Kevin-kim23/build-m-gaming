import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { STAGES, defaultLoadout, createBattle } from '../src/battle.js';
import { stagesMarkup, quickDeckMarkup, stageTagsMarkup, battlefieldMarkup, battleDetailMarkup } from '../src/battle-markup.js';

const army = (patch = {}) => ({ ...freshState(1000), soldiers: 880, sergeants: 40, equipment:{artillery:{level:3,count:1,deployed:true}}, ...patch });
function stageCards(markup) {
  return [...markup.matchAll(/<button\b([^>]*\bdata-stage="(\d+)"[^>]*)>([\s\S]*?)<\/button>/g)]
    .map(([, attrs, id, content]) => ({ id: Number(id), disabled: /\bdisabled\b/.test(attrs), content }));
}
function inputTag(markup, attribute, id) {
  return markup.match(new RegExp(`<input\\b[^>]*${attribute}="${id}"[^>]*>`))?.[0];
}

test('continent preview shows four nations, three locked, and a single locate button instead of arrow/zoom buttons',()=>{
 const html=stagesMarkup({...freshState(0),soldiers:4});
 assert.match(html,/아스테라 대륙/);assert.equal((html.match(/class="nation-tab /g)??[]).length,4);
 assert.equal((html.match(/class="country-hit locked"/g)??[]).length,3);
 assert.match(html,/data-locate/);assert.doesNotMatch(html,/data-pan=|data-zoom=|atlas-controls/,'only one map button: gestures replace arrows and zoom');assert.match(html,/손가락으로 끌어 이동/);
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

test('the operations map starts battles directly: chips, picture deck cards, slot counter and one start button; long text lives in the info popup', () => {
  const state = army({ soldiers: 2, sergeants: 128, campaignCleared: 0,
    equipment: { artillery: { level: 3, deployed: false }, tank: null, selfPropelled: null } });
  const html = stagesMarkup(state, 'serdin', 1, ['artillery']);
  assert.match(html, /data-info-stage="1"/);
  assert.match(html, /class="chip">전초 포병</);
  assert.match(html, /id="battle-slot-count">1 \/ 3</);
  assert.match(inputTag(html, 'data-battle-gear', 'artillery'), /\bchecked\b/);
  assert.equal(inputTag(html, 'data-battle-gear', 'tank'), undefined);
  assert.match(html, /data-card-art="artillery"/);
  assert.match(html, /<button[^>]*data-stage="1"[^>]*>전투 시작</);
  assert.doesNotMatch(html, /진격 준비|병종별 10명|region-strategy|battle-intel/);
  assert.doesNotMatch(html, /undefined|NaN/);
  const detail = battleDetailMarkup(state, STAGES[0]);
  assert.match(detail.body, /정찰 · 전초 포병/);
  assert.match(detail.body, /첫 출격은 견인포로 충분/);
  assert.match(detail.body, /첫 점령/);
  assert.match(detail.body, /마나 18/);
  assert.match(detail.body, /장비는 소모되지 않으며 홈 배치 설정은 유지/);
  assert.match(detail.body, /끌어다 놓아/);
});

test('locked or unselectable regions show no deck, and a conquered region offers a replay', () => {
  const state = army({ soldiers: 880, sergeants: 40, campaignCleared: 2, equipment: { artillery: { level: 3, deployed: true } } });
  assert.doesNotMatch(stagesMarkup(state, 'serdin', 6, ['artillery']), /quick-deck/);
  assert.match(stagesMarkup(state, 'serdin', 1, ['artillery']), /다시 도전/);
  assert.match(stagesMarkup(state, 'serdin', 3, ['artillery']), /quick-deck/);
});

test('battlefield is minimal: canvas, base HP over each base, mana bar and deploy cards, with no explanation text', () => {
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
  assert.match(markup, /id="base-hp-enemy"/);
  assert.match(markup, /id="base-hp-player"/);
  assert.doesNotMatch(markup, /battle-note|battle-controls|예고 없이|방치 수입/, 'no explanatory paragraphs');
});

test('capital detail shows the fortress warning; the deck row only shows a chip; ordinary regions have neither', () => {
  const state = army({ campaignCleared: 19, equipment: { artillery: { level: 3, deployed: true } } });
  assert.match(stageTagsMarkup(STAGES[19]), /class="chip bad">요새 · 기갑 약화/);
  assert.match(battleDetailMarkup(state, STAGES[19]).body, /기지 피해 -40%/);
  assert.doesNotMatch(stageTagsMarkup(STAGES[0]), /요새/);
  assert.doesNotMatch(battleDetailMarkup(state, STAGES[0]).body, /요새 수도/);
});

test('deck cards are pictures with name and mana badge, marked advantageous or disadvantaged for the region', () => {
  const state = army({ soldiers: 2, sergeants: 128, equipment: { artillery: { level: 3, deployed: true }, tank: { level: 5, deployed: true } } });
  const markup = quickDeckMarkup(state, STAGES[6], ['tank']);
  assert.equal((markup.match(/data-card-art=/g) ?? []).length, 2);
  assert.match(markup, /class="card-cost"[^>]*>18</);
  assert.match(markup, /class="card-cost"[^>]*>24</);
  assert.match(inputTag(markup, 'data-battle-gear', 'tank'), /\bchecked\b/);
  assert.doesNotMatch(inputTag(markup, 'data-battle-gear', 'artillery'), /\bchecked\b/);
  assert.match(markup, /gear-tile mini bad/);
  assert.match(quickDeckMarkup(army({ equipment: {} }), STAGES[0], []), /보유한 장비가 없어요/);
});

test('the map shows each conquered region\'s best stars and the selected region\'s record; unconquered regions show none', () => {
  const state = army({ soldiers: 880, sergeants: 40, campaignCleared: 3, campaignStars: [3, 1, 0, ...Array(77).fill(0)], equipment: { artillery: { level: 3, deployed: true } } });
  const html = stagesMarkup(state, 'serdin', 2, ['artillery']);
  assert.equal((html.match(/class="region-stars"/g) ?? []).length, 3, 'one star row per conquered region');
  assert.match(html, /aria-label="최고 별 3개">★★★</);
  assert.match(html, /aria-label="최고 별 1개">★☆☆</);
  assert.match(html, /aria-label="최고 별 0개">☆☆☆</);
  assert.match(html, /최고 <span class="best-stars">★☆☆</);
  assert.doesNotMatch(stagesMarkup(state, 'serdin', 4, ['artillery']), /최고 <span/);
});
