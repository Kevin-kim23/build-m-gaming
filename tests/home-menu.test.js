import test from 'node:test';
import assert from 'node:assert/strict';
import {homeMarkup} from '../src/home-view.js';
import {guideRoute} from '../src/guide-route.js';

test('home promotion exposes a labelled percentage progressbar',()=>{
  const html=homeMarkup({});
  assert.match(html,/role="progressbar" aria-label="다음 계급 필요 전력 달성률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/);
  assert.match(html,/<span id="promotion-percent">0%<\/span>/);
});

test('home menu follows the requested two-row reading and keyboard order',()=>{
  const nav=homeMarkup({}).match(/<nav class="home-tabs"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const buttons=[...nav.matchAll(/<button id="([^"]+)">([\s\S]*?)<\/button>/g)];
  assert.deepEqual(buttons.map(match=>match[1]),['open-recruit','open-equipment','open-shop','open-facilities','open-personal','open-items']);
  assert.deepEqual(buttons.map(match=>match[2].match(/<span>(.*?)<\/span>/)[1]),['군대 모집','군사 장비','상점','시설','개인 장비','아이템']);
  for(const [,id,content] of buttons) assert.match(content,/<span class="home-menu-icon" aria-hidden="true">/,id);
});
test('military equipment guide names the actual home destination after rename',()=>{
  const step={ready:true,panel:'equipment',category:'military'};
  assert.equal(guideRoute(step).selector,'#open-equipment');
  assert.match(guideRoute(step).text,/군사 장비/);
  assert.match(guideRoute(step,{panel:'shop',category:'recruit'}).text,/군사 장비/);
});

test('home keeps loot balance inside the shop rather than crowding its navigation button',()=>{
  const html=homeMarkup({});
  const button=html.match(/<button id="open-loot"[\s\S]*?<\/button>/)[0];
  assert.match(button,/전리품 상점/);assert.match(button,/<svg/);
  assert.doesNotMatch(button,/보유|data-home-loot|<small/);
});

test('loot is left and battle is right before the six unchanged management buttons',()=>{
  const html=homeMarkup({});
  const dock=html.slice(html.indexOf('<section class="home-dock"'));
  const row=dock.match(/<div class="home-expeditions">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...row.matchAll(/<button id="([^"]+)"/g)].map(match=>match[1]),['open-loot','open-battle']);
  assert.ok(dock.indexOf('class="home-expeditions"')<dock.indexOf('<nav class="home-tabs"'));
  for(const id of ['open-battle','open-loot','open-recruit','open-equipment','open-shop','open-facilities','open-personal','open-items'])
    assert.equal(html.split(`id="${id}"`).length-1,1,id);
});
