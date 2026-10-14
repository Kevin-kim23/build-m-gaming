import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,upgradeSchool,parseSave} from '../src/game.js';
import {serializeSave} from '../src/money.js';
import {SCHOOLS} from '../src/schools.js';
import {academyView} from '../src/academy-view.js';
import {academyLevel} from '../src/academy-levels.js';
import {schoolsMarkup,schoolDetailMarkup} from '../src/school-panels.js';
import {layoutHomeField} from '../src/home-field-layout.js';
import {EQUIPMENT} from '../src/equipment.js';
import {UNITS} from '../src/units.js';
import {homeOfferMarkup} from '../src/home-offer-popup.js';
import {supremeRankSymbol} from '../src/rank-emblem.js';
import {homeMarkup} from '../src/home-view.js';

test('one academy preserves all 30 saved unlocks and advances one original cost at each boundary',()=>{
  const s=freshState(1000);s.soldiers=1e9;s.gold=10n**27n;
  s[Object.values(UNITS).at(-1).field]=64;
  let level=0;
  for(const school of Object.values(SCHOOLS))for(let i=1;i<=school.maxLevel;i++){
    const view=academyView(s);assert.equal(view.id,school.id);assert.equal(view.nextLevel,++level);
    const gold=s.gold,result=upgradeSchool(s,1000,view.id);
    assert.equal(result.ok,true);assert.equal(BigInt(gold)-BigInt(s.gold),BigInt(school.costs[i-1]));
    assert.equal(academyView(s).level,level);assert.equal(academyLevel(school.id,i),level);
    assert.equal((schoolsMarkup(s).match(/class="school-card"/g)??[]).length,1);
  }
  assert.equal(level,30);assert.equal(academyView(s).offer.reason,'max');
  assert.equal((schoolDetailMarkup(s).body.match(/<li /g)??[]).length,30);
});

test('legacy school fields stay intact and advanced level five displays academy fifteen',()=>{
  const s=freshState(1000);Object.assign(s,{ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5});
  const restored=parseSave(serializeSave(s),1000);
  const view=academyView(restored);assert.equal(view.level,15);assert.equal(view.artId,'advanced');assert.equal(view.artLevel,5);
  for(const d of Object.values(SCHOOLS))assert.equal(restored[d.field],s[d.field]);
  assert.match(schoolsMarkup(restored),/Lv.15 \/ 30/);
});

test('home fits early and maximum armies without scrolling and retains one campus, zero facilities',()=>{
  const early={...freshState(1000),soldiers:8},late=freshState(1000);
  late[Object.values(UNITS).at(-1).field]=64;
  for(const d of Object.values(SCHOOLS))late[d.field]=d.maxLevel;
  late.equipment=Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:10,count:1,deployed:true}]));
  for(const [w,h] of [[160,120],[160,220],[206,300]])for(const s of [freshState(1000),early,late]){
    const world=layoutHomeField(s,w,h);assert.equal(world.width,w);assert.equal(world.height,h);assert.equal(world.facilities.length,0);
    for(const item of [...world.army,...world.schools,...world.equipment]){
      assert.ok(item.x>=0&&item.y>=0);assert.ok(item.x+item.width<=w+.01);assert.ok(item.y+item.height<=h+.01);
    }
    if(s===late){assert.equal(world.army.length,1);assert.equal(world.schools.length,1);assert.equal(world.equipment.length,Object.keys(EQUIPMENT).length);}
    if(s===early)assert.equal(world.army.reduce((n,i)=>n+i.count,0),8);
  }
});

test('home offers are independent dialogs and production auto purchase cannot grant free ownership',()=>{
  for(const id of ['red','blue']){
    const content=homeOfferMarkup(id);assert.match(content.body,/광고 보기/);assert.match(content.body,/data-home-offer=/);assert.doesNotMatch(content.body,/shop-category|data-potion-use/);
  }
  assert.match(homeOfferMarkup('auto',{allowTestGrant:false}).body,/disabled>구매 준비 중/);
  assert.match(homeOfferMarkup('auto',{allowTestGrant:true}).body,/구매하기 · 개발 테스트/);
  assert.throws(()=>homeOfferMarkup('unknown'));
  const html=homeMarkup(freshState(0));assert.ok(html.indexOf('id="promotion-fill"')<html.indexOf('</header>'));
});

test('junior marshal has five aligned stars like deputy commander',()=>{
  const art=supremeRankSymbol(5),polygons=[...art.matchAll(/points="([^"]+)"/g)];assert.equal(polygons.length,5);
  const tips=polygons.map(m=>m[1].split(' ')[0].split(',').map(Number));
  assert.equal(new Set(tips.map(p=>p[1])).size,1);assert.equal(new Set(tips.map(p=>p[0])).size,5);
});
