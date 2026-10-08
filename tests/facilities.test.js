import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,buildFacility,perSecond,perTap,baseTapIncome,accrue,tapGold,activateSword,activateAutoTouch,buyEquipment} from '../src/game.js';
import {FACILITIES,facilityOffer,facilityBonus,withFacilityIncome} from '../src/facilities.js';
import {facilityIcon} from '../src/facility-art.js';
import {facilitiesMarkup,renderFacilities} from '../src/facility-panels.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {inspectSave,parseSave} from '../src/save.js';
import {SAVE_VERSION} from '../src/state.js';
import {MAX_GOLD,exact,serializeSave} from '../src/money.js';
import {prepareOfflineReward,claimOfflineReward} from '../src/offline-reward.js';
import {EQUIPMENT,deployedEquipment} from '../src/equipment.js';
const T=1800000000000;
const army=rank=>{const s=freshState(T),power=RANK_REQUIREMENTS[RANKS.indexOf(rank)];s.sergeants=power>=10240?300:power>=640?40:0;s.soldiers=power-s.sergeants*10;s.gold=MAX_GOLD;return s;};

test('nineteen facilities unlock in order from master sergeant; actual promotion gates are enforced',()=>{
  assert.equal(FACILITIES.length,19);
  assert.deepEqual(FACILITIES.map(f=>f.rank),RANKS.slice(RANKS.indexOf('상사'),RANKS.indexOf('부사령관')+1));
  for(const f of FACILITIES){
    const s=army(RANKS[RANKS.indexOf(f.rank)-1]);
    assert.equal(facilityOffer(s,f.id).visible,true);assert.equal(facilityOffer(s,f.id).locked,true);
    assert.equal(buildFacility(s,T,f.id).reason,'locked');assert.equal(s.gold,MAX_GOLD);
    const unlocked=army(f.rank);assert.equal(buildFacility(unlocked,T,f.id).ok,true);
    assert.equal(exact(unlocked.gold),MAX_GOLD-BigInt(f.cost));
    const saved=serializeSave(unlocked);assert.equal(buildFacility(unlocked,T,f.id).reason,'owned');assert.equal(serializeSave(unlocked),saved);
  }
  const gated=army('준장');gated.sergeants=299;gated.soldiers+=10;
  assert.equal(facilityOffer(gated,'operations').locked,true);
  assert.equal(facilityOffer(freshState(T),'kitchen').visible,true);
});

test('construction is exact at wallet boundaries, rejects unknown IDs, settles old income first',()=>{
  const f=FACILITIES[0];
  for(const balance of [f.cost-1,Number.MAX_SAFE_INTEGER,9007199254740993n,MAX_GOLD-1n]){
    const s=army('상사');s.gold=balance;
    const result=buildFacility(s,T,f.id);
    assert.equal(result.ok,balance>=f.cost);
    assert.equal(exact(s.gold),exact(balance)-(result.ok?BigInt(f.cost):0n));
    assert.equal(parseSave(serializeSave(s),T).gold,s.gold);
  }
  const s=army('상사');s.gold=f.cost;
  assert.throws(()=>buildFacility(s,T+1000,'__proto__'),RangeError);
  assert.equal(s.lastAccrual,T);
  assert.equal(buildFacility(s,T+1000,f.id).ok,true);assert.equal(s.gold,60);
  accrue(s,T+2000);assert.equal(s.gold,123); // old 60/s then floor(60*1.05)=63/s
});

test('bonuses add per income type, cache by ownership and use exact integer arithmetic',()=>{
  const s=army('대원수'),base=perSecond(s),tap=perTap(s,T);
  s.facilities=FACILITIES.map(f=>f.id);
  assert.deepEqual(facilityBonus(s),{passive:150,tap:129});
  assert.equal(facilityBonus(s),facilityBonus(s));
  assert.equal(perTap(s,T),Math.floor(tap*2.29));
  assert.ok(perSecond(s)>base);
  for(const value of [Number.MAX_SAFE_INTEGER,9007199254740993n,MAX_GOLD-1n])
    assert.equal(exact(withFacilityIncome(s,value,'tap')),exact(value)*229n/100n);
  s.facilities=['kitchen'];assert.deepEqual(facilityBonus(s),{passive:5,tap:0});
});

test('sword and automatic touch use facility bonuses exactly once; cap remains exact',()=>{
  const s=army('대원수');s.facilities=FACILITIES.map(f=>f.id);s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,1]));s.gold=0;
  assert.equal(activateSword(s,T).ok,true);assert.equal(activateAutoTouch(s,T).ok,true);
  const tap=perTap(s,T);assert.equal(tap,baseTapIncome(s)*2);
  accrue(s,T+300);
  assert.equal(exact(s.gold),exact(perSecond(s))*300n/1000n+exact(tap));
  const same=s.gold;accrue(s,T+300);assert.equal(s.gold,same);
  s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,T+300),1);assert.equal(s.gold,MAX_GOLD);
  assert.equal(tapGold(s,T+300),0);assert.equal(parseSave(serializeSave(s),T+300).gold,MAX_GOLD);
});

test('offline facility income caps at eight hours, survives reload and claims once',()=>{
  const s=army('상사');s.gold=0;s.facilities=['kitchen'];s.facilityLevels={kitchen:1};
  prepareOfflineReward(s,T+12*3600000);
  assert.equal(s.offlineReward.amount,perSecond(s)*8*3600);
  const restored=parseSave(serializeSave(s),T+12*3600000),id=restored.offlineReward.id;
  assert.equal(claimOfflineReward(restored,id,2).amount,perSecond(s)*8*3600*2);
  assert.equal(claimOfflineReward(restored,id,2).ok,false);
});

test('version24 assets migrate without losing equipment or pending reward; malformed facilities report diagnostics',()=>{
  const old=army('대원수');old.version=24;delete old.facilities;
  old.offlineReward={id:T,durationMs:3600000,amount:9007199254740993n};
  for(const item of Object.values(EQUIPMENT)){
    if((item.introducedVersion??0)<=24)old.equipment[item.id]={level:10,count:1,deployed:item.id==='tank'};
    else delete old.equipment[item.id];
  }
  const next=parseSave(serializeSave(old),T);
  assert.equal(next.version,SAVE_VERSION);assert.deepEqual(next.facilities,[]);
  for(const key of ['gold','soldiers','sergeants','offlineReward'])assert.deepEqual(next[key],old[key]);
  for(const item of Object.values(EQUIPMENT))assert.deepEqual(next.equipment[item.id],(item.introducedVersion??0)<=24?old.equipment[item.id]:null);
  for(const facilities of [null,undefined,{},['unknown'],['kitchen','kitchen'],[1],['__proto__']]){
    const result=inspectSave(serializeSave({...next,facilities}),T);
    assert.equal(result.state,null);assert.equal(result.issue.field,'facilities');
  }
});

test('all home equipment can coexist while previously stored equipment stays stored after migration',()=>{
  const s=army('대원수');for(const id of Object.keys(EQUIPMENT))assert.equal(buyEquipment(s,T,id).deployed,true);
  assert.equal(deployedEquipment(s).length,Object.keys(EQUIPMENT).length);assert.deepEqual(parseSave(serializeSave(s),T).equipment,s.equipment);
});

test('shop shows all facilities; buttons track affordability and ownership',()=>{
  const s=army('상사');s.gold=FACILITIES[0].cost-1;
  const html=facilitiesMarkup(s);assert.match(html,/취사장/);assert.match(html,/체력단련장/);assert.match(html,/풋살장/);assert.match(html,/작전지원센터/);
  const nodes=new Map(),card={classList:{toggle(){}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{textContent:'',disabled:false,dataset:{},innerHTML:''});return nodes.get(selector);}};
  const root={querySelector(selector){return selector==='[data-facility="kitchen"]'?card:null;}};
  renderFacilities(s,root);assert.equal(nodes.get('[data-facility-action]').disabled,true);assert.match(nodes.get('[data-facility-status]').textContent,/1 G 부족/);
  s.gold++;renderFacilities(s,root);assert.equal(nodes.get('[data-facility-action]').disabled,false);
  buildFacility(s,T,'kitchen');renderFacilities(s,root);assert.equal(nodes.get('[data-facility-action]').textContent,'Lv.2 강화');assert.equal(nodes.get('[data-facility-action]').disabled,true);
  s.gold=MAX_GOLD;renderFacilities(s,root);assert.equal(nodes.get('[data-facility-action]').disabled,false);
  s.facilityLevels={kitchen:20};renderFacilities(s,root);assert.equal(nodes.get('[data-facility-action]').textContent,'최대 Lv.20');assert.equal(nodes.get('[data-facility-action]').disabled,true);
});

test('facility sprites are original cached distinct geometry without embedded external resources',()=>{
  const drawings=FACILITIES.map(f=>facilityIcon(f.id));assert.equal(new Set(drawings).size,19);
  for(const f of FACILITIES){assert.equal(facilityIcon(f.id),facilityIcon(f.id));assert.match(facilityIcon(f.id),/viewBox="0 0 96 72"/);assert.doesNotMatch(facilityIcon(f.id),/href=|<image|script/);}
});
