import { serializeSave } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave, recruitOffer, recruit, unitCost, MAX_GOLD, MAX_SOLDIERS } from '../src/game.js';
import { UNITS } from '../src/units.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
import { generalSwordStatus, commandBatonStatus, swordSkillStatus, BULK_RECRUIT } from '../src/personal-equipment.js';
import { personalIcon } from '../src/personal-art.js';
import { personalMarkup } from '../src/personal-panels.js';
import { shopMarkup } from '../src/shop.js';
const T=1_800_000_000_000;
const army=rank=>({...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(rank)]-3000,sergeants:300,ncoSchoolLevel:5,officerSchoolLevel:5,gold:100_000_000_000_000});

test('legacy general ranks reset personal levels to one but retain active skill deadlines',()=>{
  const pictures=[];
  for(const [i,rank] of ['준장','소장','중장','대장'].entries()) {
    const s={...army(rank),version:12,officerSchoolLevel:1,swordActivatedAt:T-15000}, loaded=parseSave(serializeSave(s),T);
    assert.equal(generalSwordStatus(loaded).level,1);assert.equal(commandBatonStatus(loaded).level,1);
    assert.equal(swordSkillStatus(loaded,T).activeMs,15000);assert.equal(swordSkillStatus(loaded,T).remainingMs,585000);
    assert.match(personalMarkup(loaded),new RegExp(`장군검 <small>Lv.1</small>`));
    pictures.push(personalIcon('sword',i+1));
  }
  assert.equal(new Set(pictures).size,4);
});
test('each baton level adds exactly one supported 100-person button and keeps earlier ones',()=>{
  const rules=Object.entries(BULK_RECRUIT);
  for(const [index,[id,rule]] of rules.entries()) {
    const s=army('대원수');s.gold=MAX_GOLD;s.personalLevels.commandBaton=rule.level;
    const html=shopMarkup(s,'',()=>'', 'recruit');
    assert.equal((html.match(/data-buy-bulk=/g)||[]).length,index+1);
    for(const [earlier] of rules.slice(0,index+1))assert.match(html,new RegExp(`data-buy-bulk="${earlier}"`));
    assert.equal(recruitOffer(s,id,100).canBuy,true);
  }
});
for(const id of ['masterSergeant','sergeantMajor','lieutenant'])test(`${id} batch charges 100 sequential prices with school, paid level, gold and capacity gates`,()=>{
  const rule=BULK_RECRUIT[id], unit=UNITS[id], s=army('대원수');s.personalLevels.commandBaton=rule.level;
  s[unit.field]=7;s.soldiers-=7*unit.power;
  const cost=Array.from({length:100},(_,i)=>unitCost(7+i,id)).reduce((a,b)=>a+b,0);
  assert.equal(recruitOffer(s,id,100).cost,cost);
  for(const patch of [
    {[unit.school==='nco'?'ncoSchoolLevel':'officerSchoolLevel']:unit.schoolLevel-1},
    {gold:cost-1}, {personalLevels:{...s.personalLevels,commandBaton:rule.level-1}},
    {soldiers:MAX_SOLDIERS-3000-7*unit.power-100*unit.power+1},
  ]){
    const blocked={...s,...patch},before=structuredClone(blocked);
    assert.equal(recruit(blocked,T,id,100).ok,false);assert.deepEqual(blocked,before);
  }
  const singles=structuredClone(s);s.gold=cost;singles.gold=cost;
  assert.equal(recruit(s,T,id,100).ok,true);
  for(let i=0;i<100;i++)assert.equal(recruit(singles,T,id).ok,true);
  assert.deepEqual(s,singles);assert.equal(s.gold,0);assert.equal(s[unit.field],107);
  assert.equal(parseSave(serializeSave(s),T)[unit.field],107);
});
