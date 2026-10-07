import test from 'node:test';
import assert from 'node:assert/strict';
import {withCampaignIncome} from '../src/campaign-rewards.js';
import {freshState,perSecond,perTap,accrue,MAX_OFFLINE_MS} from '../src/game.js';
import {MAX_GOLD,exact,serializeSave} from '../src/money.js';
import {EQUIPMENT} from '../src/equipment.js';
import {FACILITIES,FACILITY_BONUS_STEP} from '../src/facility-catalog.js';
import {parseSave} from '../src/save.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
const T=1800000000000;
const scale=(v,n,d=100n)=>v*n/d;

test('conquest bonus avoids floating rounding at seventeen regions and accepts exact large integers',()=>{
  assert.equal(withCampaignIncome({campaignCleared:17},566671200000047),663005304000054);
  for(const value of [0,1,100,Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER,9007199254740993n,MAX_GOLD-1n]){
    for(const cleared of [0,1,17,80])assert.equal(exact(withCampaignIncome({campaignCleared:cleared},value)),exact(value)*(100n+BigInt(cleared))/100n);
  }
  assert.equal(typeof withCampaignIncome({campaignCleared:17},100),'number');
});

// An independent BigInt oracle follows the documented order and rounds at each layer.
function expectedIncome(state,count) {
  let gearPassive=0n,gearTap=0n;
  for(const gear of Object.values(EQUIPMENT)){
    gearPassive+=(BigInt(gear.passive)+20n*BigInt(gear.passiveStep)+12n*BigInt(gear.passive))*BigInt(count);
    gearTap+=(BigInt(gear.tap)+20n*BigInt(gear.tapStep)+12n*BigInt(gear.tap))*BigInt(count);
  }
  const facilityBasis=FACILITIES.reduce((sum,f)=>({passive:sum.passive+BigInt(f.passive*(100+FACILITY_BONUS_STEP*19)),tap:sum.tap+BigInt(f.tap*(100+FACILITY_BONUS_STEP*19))}),{passive:0n,tap:0n});
  const passive=BigInt(state.soldiers)+300n*75n+scale(gearPassive,220n);
  const tap=1n+BigInt(state.soldiers)*10n+300n*600n+scale(gearTap,220n);
  return {
    passive:scale(scale(scale(passive,10000n+facilityBasis.passive,10000n),117n)*4n,165n),
    tap:scale(scale(scale(tap,10000n+facilityBasis.tap,10000n),230n),165n),
  };
}

test('twelve deployed equipment types plus every max bonus preserve exact taps and offline income',()=>{
  const s={...freshState(T),soldiers:RANK_REQUIREMENTS[RANKS.indexOf('대원수')]-3000,sergeants:300,ncoSchoolLevel:5,campaignCleared:17};
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
  s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,20]));
  assert.equal(Object.keys(EQUIPMENT).length,12);
  for(const count of [100000,1]){
    s.gold=0;s.lastAccrual=T;s.incomeRemainder=0;
    for(const id of Object.keys(EQUIPMENT))s.equipment[id]={level:20,count,deployed:true};
    const expected=expectedIncome(s,count);
    assert.equal(exact(perSecond(s)),expected.passive);assert.equal(exact(perTap(s,T)),expected.tap);
    accrue(s,T+1000);assert.equal(exact(s.gold),expected.passive);
    s.gold=0;s.lastAccrual=T;s.incomeRemainder=0;
    const offline=expected.passive*BigInt(MAX_OFFLINE_MS)/1000n;
    accrue(s,T+MAX_OFFLINE_MS*2);assert.equal(exact(s.gold),offline>MAX_GOLD?MAX_GOLD:offline);
    const restored=parseSave(serializeSave(s),s.lastAccrual);assert.equal(restored.gold,s.gold);
    assert.deepEqual(restored.equipment,s.equipment);assert.equal(exact(perSecond(restored)),expected.passive);
  }
});
