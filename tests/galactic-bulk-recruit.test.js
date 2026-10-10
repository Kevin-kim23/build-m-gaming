import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {GALACTIC_OFFICERS} from '../src/galactic-officers.js';
import {recruitOffer,recruit,unitCost} from '../src/game.js';
import {BULK_RECRUIT} from '../src/personal-equipment.js';
import {MAX_GOLD,addMoney,subtractMoney} from '../src/money.js';
const T=1800000000000;
test('baton levels21..25 unlock exact100 galaxy recruits and still require the academy',()=>{
  for(const [i,unit] of GALACTIC_OFFICERS.entries()){
    const s={...freshState(T),soldiers:unit.recruitRankPower-3000,sergeants:300,gold:MAX_GOLD,galacticSchoolLevel:i+1};
    assert.equal(BULK_RECRUIT[unit.id]?.level,21+i);
    s.personalLevels.commandBaton=20+i;
    assert.equal(recruitOffer(s,unit.id,100).reason,'locked');
    s.personalLevels.commandBaton=21+i;
    const cost=Array.from({length:100},(_,n)=>unitCost(n,unit.id)).reduce(addMoney,0);
    assert.equal(recruitOffer(s,unit.id,100).cost,cost);
    s.galacticSchoolLevel=i;assert.equal(recruitOffer(s,unit.id,100).reason,'locked');
    s.galacticSchoolLevel=i+1;s.gold=subtractMoney(cost,1);
    assert.equal(recruit(s,T,unit.id,100).reason,'gold');assert.equal(s[unit.field],0);
    s.gold=cost;assert.equal(recruit(s,T,unit.id,100).ok,true);
    assert.equal(s[unit.field],100);assert.equal(s.gold,0);
  }
});
