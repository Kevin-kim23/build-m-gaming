import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, recruit, recruitOffer, unitCost, perSecond, perTap, armyPower, parseSave, upgradeSchool, MAX_GOLD, MAX_SOLDIERS } from '../src/game.js';
import { schoolOffer } from '../src/schools.js';
import { UNITS } from '../src/units.js';
import { rankForArmy, RANKS } from '../src/ranks.js';
import { defaultLoadout, createBattle, fireVolley } from '../src/battle.js';
import { groupArmy } from '../src/formations.js';
import { createGameSession } from '../src/session.js';
import { SAVE_KEY } from '../src/game.js';
const T = 1800000000000;
const wealthy = () => ({...freshState(T),gold:MAX_GOLD});

test('rank alone never opens NCO recruitment; school levels open exactly one new grade', () => {
  const s = {...wealthy(), soldiers:20480, sergeants:40};
  for (const id of ['sergeant','staffSergeant','masterSergeant','sergeantMajor']) {
    assert.equal(recruitOffer(s,id).visible,true);
    assert.equal(recruit(s,T,id).reason,'locked');
  }
  const beginner=wealthy();
  for (let level=1;level<=4;level++) {
    assert.equal(upgradeSchool(beginner,T,'nco').level,level);
    for(const u of Object.values(UNITS).filter(u=>u.school==='nco'))
      assert.equal(recruitOffer(beginner,u.id).locked,u.schoolLevel>level);
  }
  assert.equal(RANKS[rankForArmy(beginner)],'이등병');
});
test('construction checks gold, sequential levels and the maximum without partial changes',()=>{
  const s=wealthy(), first=schoolOffer(s,'nco');
  s.gold=first.cost-1; const before=structuredClone(s);
  assert.equal(upgradeSchool(s,T,'nco').reason,'gold'); assert.deepEqual(s,before);
  s.gold=first.cost; assert.equal(upgradeSchool(s,T,'nco').ok,true); assert.equal(s.gold,0);
  s.gold=MAX_GOLD;
  for(let level=2;level<=5;level++) assert.equal(upgradeSchool(s,T,'nco').level,level);
  const balance=s.gold; assert.equal(upgradeSchool(s,T,'nco').reason,'max'); assert.equal(s.gold,balance);
  assert.throws(()=>upgradeSchool(s,T,'unknown'),RangeError);
});
test('officer academy needs both NCO level five and actual major general rank',()=>{
  const s={...wealthy(),soldiers:17480,sergeants:300,ncoSchoolLevel:4};
  assert.equal(schoolOffer(s,'officer').visible,false);
  assert.equal(upgradeSchool(s,T,'officer').reason,'locked');
  s.ncoSchoolLevel=5; s.soldiers=17479;
  assert.equal(schoolOffer(s,'officer').visible,true);
  assert.equal(upgradeSchool(s,T,'officer').reason,'locked');
  s.soldiers=327680; s.sergeants=39;
  assert.equal(upgradeSchool(s,T,'officer').reason,'locked');
  s.soldiers=17480;s.sergeants=300;
  const before=s.gold; assert.equal(upgradeSchool(s,T,'officer').level,1);
  assert.equal(before-s.gold,150000000);
  assert.equal(recruitOffer(s,'lieutenant').locked,false);
  assert.equal(schoolOffer(s,'officer').nextLevel,2);
  assert.equal(schoolOffer(s,'officer').cost,3_000_000_000);
});
test('every new recruit changes only its count and price and adds its catalog power and income',()=>{
  const s={...wealthy(),ncoSchoolLevel:5,officerSchoolLevel:5};
  for(const u of Object.values(UNITS)) {
    const prices=Object.fromEntries(Object.keys(UNITS).map(id=>[id,recruitOffer(s,id).cost]));
    const old={gold:s.gold,power:armyPower(s),passive:perSecond(s),tap:perTap(s)};
    assert.equal(recruit(s,T,u.id).ok,true);
    assert.equal(s[u.field],1); assert.equal(old.gold-s.gold,prices[u.id]);
    assert.equal(armyPower(s)-old.power,u.power);
    assert.equal(perSecond(s)-old.passive,u.passive); assert.equal(perTap(s)-old.tap,u.tap);
    for(const id of Object.keys(UNITS)) if(id!==u.id) assert.equal(recruitOffer(s,id).cost,prices[id]);
  }
});
test('NCO buffs reduce early and repeated costs, and all curves stay finite and independent',()=>{
  assert.equal(unitCost(0,'sergeant'),10000); assert.equal(unitCost(0,'staffSergeant'),50000);
  for(let n=0;n<=100;n++) {
    assert.ok(unitCost(n,'sergeant')<100000+30000*n+3000*n*n);
    assert.ok(unitCost(n,'staffSergeant')<1000000+350000*n+50000*n*n);
  }
  for(const id of Object.keys(UNITS)) for(const n of [0,10,100,10000,MAX_SOLDIERS]) {
    const cost=unitCost(n,id);assert.ok(Number.isSafeInteger(cost)&&cost<=MAX_GOLD);
    assert.ok(unitCost(n+1,id)>=cost);
  }
});
test('new units cannot exceed the shared power limit or earn past income',()=>{
  for(const id of ['masterSergeant','sergeantMajor','lieutenant']) {
    const u=UNITS[id],s={...wealthy(),ncoSchoolLevel:5,officerSchoolLevel:1,soldiers:MAX_SOLDIERS-u.power+1};
    assert.equal(recruit(s,T,id).reason,'limit');assert.equal(s[u.field],0);
    s.soldiers=1;s.gold=unitCost(0,id);
    assert.equal(recruit(s,T+1000,id).ok,true);assert.equal(s.gold,1);
    assert.equal(groupArmy(s).reduce((n,g)=>n+g.size*g.count,0),1+u.power);
  }
});
test('v8 migration preserves assets and previously unlocked NCO access without granting new grades',()=>{
  for(const [soldiers,sergeants,staffSergeants,level] of [[0,0,0,0],[160,0,0,1],[0,1,0,1],[240,40,0,2],[0,0,1,2]]) {
    const old={...freshState(T),version:8,gold:4321,soldiers,sergeants,staffSergeants,battleCleared:3};
    old.ncoSchoolLevel=5;old.officerSchoolLevel=1;old.lieutenants=999;
    const s=parseSave(JSON.stringify(old),T);
    assert.equal(s.version, 14);assert.equal(s.ncoSchoolLevel,level);assert.equal(s.officerSchoolLevel,0);
    assert.equal(s.gold,4321);assert.equal(s.battleCleared,3);assert.equal(s.lieutenants,0);
    assert.equal(s.masterSergeants,0);assert.equal(s.sergeantMajors,0);
  }
});
test('v9 schools and troops survive reload and reject malformed school/count data',()=>{
  const s={...wealthy(),ncoSchoolLevel:5,officerSchoolLevel:1,masterSergeants:3,sergeantMajors:2,lieutenants:1};
  const loaded=parseSave(JSON.stringify(s),T);
  for(const key of ['ncoSchoolLevel','officerSchoolLevel','masterSergeants','sergeantMajors','lieutenants']) assert.equal(loaded[key],s[key]);
  for(const patch of [{ncoSchoolLevel:6},{ncoSchoolLevel:-1},{ncoSchoolLevel:1.5},{officerSchoolLevel:6},{officerSchoolLevel:1,ncoSchoolLevel:4},{lieutenants:-1},{masterSergeants:undefined},{sergeantMajors:MAX_SOLDIERS}])
    assert.equal(parseSave(JSON.stringify({...s,...patch}),T),null);
});
test('school upgrade is saved once with backup and cannot purchase twice after restart',()=>{
  const values=new Map([[SAVE_KEY,JSON.stringify({...freshState(T),gold:30000})]]),writes=[];
  const session=createGameSession({storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes.push(k);values.set(k,v);}},now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  assert.equal(session.change(s=>upgradeSchool(s,T,'nco')),undefined);
  session.start();assert.equal(session.change(s=>upgradeSchool(s,T,'nco')).ok,true);
  assert.deepEqual(writes,[SAVE_KEY+'-backup',SAVE_KEY]);
  session.pause();session.start();assert.equal(session.state.ncoSchoolLevel,1);
  assert.equal(session.change(s=>upgradeSchool(s,T,'nco')).reason,'gold');session.pause();
});
test('new grades participate in capped deployments and one tap fires every deployed grade',()=>{
  const s={...wealthy(),soldiers:1000,sergeants:40,staffSergeants:12,masterSergeants:12,sergeantMajors:12,lieutenants:12};
  const loadout=defaultLoadout(s);assert.equal(Object.values(loadout.units).length,10);
  assert.ok(Object.entries(loadout.units).every(([id,n])=>n===Math.min(10,s[UNITS[id].field])));
  const b=createBattle(s,1,loadout),shot=fireVolley(b);
  assert.equal(shot.player.units.length,6);assert.ok(shot.player.units.every(u=>u.lastShotMs===0));
  assert.ok(shot.enemy.hq.hp<b.enemy.hq.hp);
  assert.equal(b.enemy.units.length,3,'new catalog entries must not silently double existing enemy strength');
});
