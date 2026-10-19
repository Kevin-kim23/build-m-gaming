import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../src/game.js';
import { STAGES, defaultLoadout, createBattle } from '../src/battle.js';
import { stagesMarkup, quickDeckMarkup, stageTagsMarkup, battlefieldMarkup, battleDetailMarkup } from '../src/battle-markup.js';
import { loadoutMarkup } from '../src/loadout-view.js';
import { battleStarsMarkup, renderBattleStars, renderBattleLock } from '../src/battle-icons.js';

const army = (patch = {}) => ({ ...freshState(1000), soldiers: 880, sergeants: 40, equipment:{artillery:{level:3,count:1,deployed:true}}, ...patch });
function stageCards(markup) {
  return [...markup.matchAll(/<button\b([^>]*\bdata-stage="(\d+)"[^>]*)>([\s\S]*?)<\/button>/g)]
    .map(([, attrs, id, content]) => ({ id: Number(id), disabled: /\bdisabled\b/.test(attrs), content }));
}
function inputTag(markup, attribute, id) {
  return markup.match(new RegExp(`<input\\b[^>]*${attribute}="${id}"[^>]*>`))?.[0];
}

test('the conquest road shows all 80 stages of the continent one per step, only the next stage ready, and a single locate button',()=>{
 const html=stagesMarkup({...freshState(0),soldiers:4});
 assert.match(html,/아스테라 대륙/);assert.equal((html.match(/class="road-stop /g)??[]).length,80);
 assert.equal((html.match(/class="road-stop frontier/g)??[]).length,1);assert.equal((html.match(/class="road-stop locked/g)??[]).length,79);
 const tops=[...html.matchAll(/class="road-stop[^"]*" data-region="(\d+)" style="left:[\d.]+%;top:(\d+)px"/g)].map(m=>Number(m[2]));
 for(let i=1;i<tops.length;i++)assert.ok(tops[i]<tops[i-1],'each next stage sits one step higher');
 assert.match(html,/data-locate/);assert.doesNotMatch(html,/data-pan=|data-zoom=|atlas-controls|nation-tab|country-hit/,'no drag map, nation tabs or zoom controls');
 const road=html.slice(html.indexOf('road-frame'),html.indexOf('region-brief'));
 for(const name of ['세르딘','벨로크','이스트라','노르가드'])assert.ok(!road.includes(name),`${name} is not printed on the road map`);
 assert.doesNotMatch(html,/undefined|NaN/);
});
test('the road exposes every stage of the continent but only a sequential ready action',()=>{
 const state=army({campaignCleared:2});
 const html=stagesMarkup(state,'serdin',3);
 assert.equal((html.match(/class="road-stop /g)??[]).length,80);
 assert.ok(stageCards(html).find(c=>c.id===3&&!c.disabled));
 assert.ok(stageCards(stagesMarkup(state,'serdin',4))[0].disabled);
 assert.ok(stageCards(stagesMarkup({...freshState(0),soldiers:4},'serdin',1))[0].disabled);
 assert.match(stagesMarkup(state,'serdin',1),/다시 출격/);
});

test('the road only picks a stage and offers 출격; the separate loadout screen holds the deck and the start button', () => {
  const state = army({ soldiers: 2, sergeants: 128, campaignCleared: 0,
    equipment: { artillery: { level: 3, deployed: false }, tank: null, selfPropelled: null } });
  const html = stagesMarkup(state, 'serdin', 1);
  assert.match(html, /data-info-stage="1"/);
  assert.match(html, /class="chip">전초 포병</);
  assert.match(html, /<button[^>]*data-stage="1"[^>]*>출격</);
  assert.doesNotMatch(html, /quick-deck|data-battle-gear|battle-slot-count|data-battle-start|전투 시작/, 'no deck on the stage screen');
  const loadout = loadoutMarkup(state, STAGES[0], ['artillery']);
  assert.match(loadout, /출격 편성 · STAGE 01/);
  assert.match(loadout, /<button[^>]*data-battle-back[^>]*data-back-first[^>]*aria-label="스테이지 선택으로 돌아가기"/);
  assert.match(loadout, /id="battle-slot-count">1 \/ 3</);
  assert.match(inputTag(loadout, 'data-battle-gear', 'artillery'), /\bchecked\b/);
  assert.equal(inputTag(loadout, 'data-battle-gear', 'tank'), undefined);
  assert.match(loadout, /data-card-art="artillery"/);
  assert.match(loadout, /<button[^>]*data-battle-start[^>]*>전투 시작</);
  assert.doesNotMatch(loadout, /road-stop|data-stage=/, 'no road on the loadout screen');
  assert.doesNotMatch(html + loadout, /진격 준비|병종별 10명|region-strategy|battle-intel/);
  assert.doesNotMatch(html + loadout, /undefined|NaN/);
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
  assert.match(stageCards(stagesMarkup(state, 'serdin', 6)).at(-1).content, /이전 스테이지 점령 필요/);
  assert.match(stagesMarkup(state, 'serdin', 1), /다시 출격/);
  for (const id of [1, 3, 6]) assert.doesNotMatch(stagesMarkup(state, 'serdin', id), /quick-deck/);
  assert.match(loadoutMarkup(state, STAGES[2], ['artillery']), /quick-deck/);
  assert.match(loadoutMarkup(state, STAGES[5], ['artillery']), /data-battle-start disabled/, 'a locked stage can never start from the loadout screen');
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
  assert.match(stageTagsMarkup(STAGES[19]), /class="chip">수도 요새/);
  assert.match(battleDetailMarkup(state, STAGES[19]).body, /체력이 높은 기지와 강한 포탑/);
  assert.doesNotMatch(stageTagsMarkup(STAGES[0]), /요새/);
  assert.doesNotMatch(battleDetailMarkup(state, STAGES[0]).body, /요새 수도/);
});

test('deck cards show pictures, name, mana and role without category advantage markers', () => {
  const state = army({ soldiers: 2, sergeants: 128, equipment: { artillery: { level: 3, deployed: true }, tank: { level: 5, deployed: true } } });
  const markup = quickDeckMarkup(state, STAGES[6], ['tank']);
  assert.equal((markup.match(/data-card-art=/g) ?? []).length, 2);
  assert.match(markup, /class="card-cost"[^>]*>18</);
  assert.match(markup, /class="card-cost"[^>]*>24</);
  assert.match(inputTag(markup, 'data-battle-gear', 'tank'), /\bchecked\b/);
  assert.doesNotMatch(inputTag(markup, 'data-battle-gear', 'artillery'), /\bchecked\b/);
  assert.match(markup, /gear-tile mini"/);
  assert.doesNotMatch(markup, /유리|불리|gear-tile mini (bad|good)/);
  assert.match(quickDeckMarkup(army({ equipment: {} }), STAGES[0], []), /보유한 장비가 없어요/);
});

test('the map shows each conquered region\'s best stars and the selected region\'s record; unconquered regions show none', () => {
  const state = army({ soldiers: 880, sergeants: 40, campaignCleared: 3, campaignStars: [3, 1, 0, ...Array(77).fill(0)], equipment: { artillery: { level: 3, deployed: true } } });
  const html = stagesMarkup(state, 'serdin', 2);
  assert.equal((html.match(/class="road-stars"/g) ?? []).length, 3, 'one star row per conquered stage');
  for(const count of [3,1,0])assert.match(html,new RegExp(`<span class="road-stars"><svg[^>]*aria-label="별 ${count}개"`));
  assert.match(html, /최고 <span class="best-stars"><svg[^>]*aria-label="최고 별 1개"/);
  assert.equal((html.match(/data-star-filled="true"/g)??[]).length,5);
  assert.equal((html.match(/data-star-filled="false"/g)??[]).length,7);
  assert.doesNotMatch(html, /★|☆|<text class="region-stars"/);
  assert.doesNotMatch(stagesMarkup(state, 'serdin', 4), /최고 <span/);
});

test('battle symbols are drawn SVGs while controls retain their names and result transitions clear old stars',()=>{
  const state=army({campaignCleared:3,campaignStars:[3,1,0]});
  const views=[stagesMarkup(state),stagesMarkup(state,'serdin',2),loadoutMarkup(state,STAGES[2],['artillery']),quickDeckMarkup(state,STAGES[6],['artillery']),
    battlefieldMarkup(createBattle(state,1)),battleDetailMarkup(state,STAGES[6]).body];
  for(const view of views)assert.doesNotMatch(view,/[\p{Extended_Pictographic}\p{Emoji_Presentation}★☆✓▲▼✦◈◎ⓘ↑↓→‹]/u);
  assert.match(views[4],/aria-label="일시정지"><svg[^>]*data-battle-icon="pause"/);
  assert.match(views[4],/data-battle-icon="mana"/);
  assert.match(views[0],/aria-label="현재 위치로 이동"><svg[^>]*data-battle-icon="locate"/);
  for(let count=0;count<=3;count++){
    const stars=battleStarsMarkup(count);
    assert.match(stars,new RegExp(`aria-label="별 ${count}개"`));
    assert.equal((stars.match(/data-star-filled="true"/g)??[]).length,count);
  }
  const classes=new Set(),node={innerHTML:'',classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}}};
  renderBattleStars(node,3,true);assert.match(node.innerHTML,/신기록!/);assert.equal(classes.has('pop'),true);
  renderBattleStars(node);assert.equal(node.innerHTML,'');assert.equal(classes.has('pop'),false);
  renderBattleStars(node,1);assert.doesNotMatch(node.innerHTML,/신기록!/);assert.match(node.innerHTML,/별 1개/);
  renderBattleStars(node,null);assert.equal(node.innerHTML,'');
});

test('home battle lock rendering keeps unchanged updates cheap and removes the icon once unlocked',()=>{
  assert.doesNotThrow(()=>renderBattleLock(null,'대위 해금'));
  let inserts=0;const node={dataset:{},textContent:'',insertAdjacentHTML(where,html){inserts++;this.icon=html;}};
  renderBattleLock(node,'대위 해금');assert.equal(node.textContent,'대위 해금');assert.match(node.icon,/data-battle-icon="lock"/);
  renderBattleLock(node,'대위 해금');assert.equal(inserts,1);
  renderBattleLock(node,'');assert.equal(node.textContent,'');assert.equal(inserts,1);
});
