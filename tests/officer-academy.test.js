import { serializeSave } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, upgradeSchool, recruit, recruitOffer, unitCost, parseSave, perSecond, perTap, MAX_GOLD, MAX_SOLDIERS, SAVE_KEY, armyPower } from '../src/game.js';
import { OFFICER_GRADES, NEW_OFFICER_GRADES } from '../src/officer-progression.js';
import { schoolOffer } from '../src/schools.js';
import { RANKS, rankForArmy, RANK_REQUIREMENTS } from '../src/ranks.js';
import { createGameSession } from '../src/session.js';
import { defaultLoadout, createBattle } from '../src/battle.js';
import { UNITS } from '../src/units.js';
import { groupArmy } from '../src/formations.js';
import { unitPositions } from '../src/battle-art.js';
import { schoolIcon } from '../src/school-art.js';
import { schoolsMarkup, schoolDetailMarkup } from '../src/school-panels.js';
import { officerDetails } from '../src/officer-art.js';
const T=1_800_000_000_000;
const general=()=>({...freshState(T),soldiers:17480,sergeants:300,ncoSchoolLevel:5,gold:100_000_000_000_000});

test('all five academy levels open in sequence at major general without additional rank gates',()=>{
  const s=general();
  for(const grade of OFFICER_GRADES){
    const offer=schoolOffer(s,'officer');s.gold=grade.academyCost;
    assert.equal(offer.cost,grade.academyCost);
    assert.equal(upgradeSchool(s,T,'officer').level,grade.schoolLevel);assert.equal(s.gold,0);
    for(const other of OFFICER_GRADES)assert.equal(recruitOffer(s,other.id).locked,other.schoolLevel>grade.schoolLevel);
    assert.equal(RANKS[rankForArmy(s)],'소장');s.gold=MAX_GOLD;
  }
  const before=structuredClone(s);assert.equal(upgradeSchool(s,T,'officer').reason,'max');assert.deepEqual(s,before);
});
test('every academy expansion refuses insufficient gold and settles only old troop income',()=>{
  for(const grade of OFFICER_GRADES){
    const s={...general(),officerSchoolLevel:grade.schoolLevel-1,gold:grade.academyCost-1},before=structuredClone(s);
    assert.equal(upgradeSchool(s,T,'officer').reason,'gold');assert.deepEqual(s,before);
    s.gold=grade.academyCost;const income=perSecond(s);
    assert.equal(upgradeSchool(s,T+1000,'officer').ok,true);assert.equal(s.gold,income);assert.equal(perSecond(s),income);
  }
});
test('new officer recruitment preserves independent prices, unlocks, income and total power limits',()=>{
  for(const u of NEW_OFFICER_GRADES){
    const s={...general(),officerSchoolLevel:u.schoolLevel-1};
    assert.equal(recruit(s,T,u.id).reason,'locked');
    s.officerSchoolLevel=u.schoolLevel;s.gold=unitCost(0,u.id)-1;
    const before=structuredClone(s);assert.equal(recruit(s,T,u.id).reason,'gold');assert.deepEqual(s,before);
    s.gold=unitCost(0,u.id);const income=perSecond(s),tap=perTap(s,T),power=armyPower(s);
    const prices=Object.fromEntries(Object.keys(UNITS).map(id=>[id,unitCost(s[UNITS[id].field],id)]));
    assert.equal(recruit(s,T+1000,u.id).ok,true);assert.equal(s.gold,income);assert.equal(s[u.field],1);
    assert.equal(perSecond(s),income+u.passive);assert.equal(perTap(s,T),tap+u.tap);assert.equal(armyPower(s),power+u.power);
    for(const other of Object.values(UNITS))if(other.id!==u.id)assert.equal(unitCost(s[other.field],other.id),prices[other.id]);
    assert.equal(groupArmy(s).reduce((sum,g)=>sum+g.count*g.size,0),armyPower(s));
    const over={...general(),officerSchoolLevel:5,soldiers:MAX_SOLDIERS-3000-u.power+1};
    assert.equal(recruit(over,T,u.id).reason,'limit');assert.equal(over[u.field],0);
    over.soldiers--;assert.equal(recruit(over,T,u.id).ok,true);assert.equal(armyPower(over),MAX_SOLDIERS);
  }
});
test('officer pricing favors building the army toward the intended rank before the next academy',()=>{
  const cases=[['소장','중장','captain',4,96,232_760_000_000],['중장','대장','major',5,192,609_449_600_000]];
  for(const [from,to,id,nextLevel,count,expected] of cases){
    const s={...general(),soldiers:RANK_REQUIREMENTS[RANKS.indexOf(from)]-3000,officerSchoolLevel:nextLevel-1};
    assert.equal((RANK_REQUIREMENTS[RANKS.indexOf(to)]-armyPower(s))/UNITS[id].power,count);
    const total=Array.from({length:count},(_,n)=>unitCost(n,id)).reduce((a,b)=>a+b,0);
    assert.equal(total,expected);assert.ok(total<schoolOffer(s,'officer').cost);
    s.gold=total;for(let n=0;n<count;n++)assert.equal(recruit(s,T,id).ok,true);
    assert.equal(s.gold,0);assert.equal(RANKS[rankForArmy(s)],to);
  }
  for(const grade of OFFICER_GRADES)assert.ok(grade.academyCost<=MAX_GOLD);
  // Upkeep gets harder: per-person passive payback increases with officer grade.
  const payback=OFFICER_GRADES.map(g=>unitCost(0,g.id)/g.passive);
  assert.ok(payback.every((seconds,i)=>i===0||seconds>payback[i-1]));
});
test('v13 and older saves preserve assets and never inject new officer counts or higher academy levels',()=>{
  const old={...general(),version:13,officerSchoolLevel:1,lieutenants:49,gold:123456789,swordActivatedAt:T-30000,fieldTheme:'concrete',battleCleared:4};
  old.equipment.tank={level:10,deployed:true,count:3};
  for(const u of NEW_OFFICER_GRADES){delete old[u.field];}
  const loaded=parseSave(serializeSave(old),T);assert.equal(loaded.version,21);
  for(const field of ['gold','soldiers','sergeants','lieutenants','officerSchoolLevel','swordActivatedAt','fieldTheme','battleCleared'])assert.deepEqual(loaded[field],old[field]);
  assert.deepEqual(loaded.equipment,{...old.equipment,tank:{...old.equipment.tank,count:1}});
  for(const version of [9,10,11,12,13]){
    const prior={...old,version};for(const u of NEW_OFFICER_GRADES)prior[u.field]=99;
    const migrated=parseSave(serializeSave(prior),T);
    assert.ok(migrated);for(const u of NEW_OFFICER_GRADES)assert.equal(migrated[u.field],0);
    assert.equal(parseSave(serializeSave({...prior,officerSchoolLevel:2}),T),null);
  }
});
test('v14 reloads new officers and all school levels and rejects corrupted headcounts',()=>{
  for(let level=1;level<=5;level++){
    const s={...general(),officerSchoolLevel:level};
    for(const u of NEW_OFFICER_GRADES)if(u.schoolLevel<=level)s[u.field]=2;
    const loaded=parseSave(serializeSave(s),T);for(const u of NEW_OFFICER_GRADES)assert.equal(loaded[u.field],s[u.field]);
    assert.equal(loaded.officerSchoolLevel,level);assert.equal(armyPower(loaded),armyPower(s));
  }
  for(const u of NEW_OFFICER_GRADES)for(const value of [undefined,null,-1,1.5,'2',Math.floor(MAX_SOLDIERS/u.power)+1])assert.equal(parseSave(serializeSave({...general(),[u.field]:value}),T),null);
  for(const level of [6,-1,1.2,'5'])assert.equal(parseSave(serializeSave({...general(),officerSchoolLevel:level}),T),null);
});
test('academy and officer purchases share checkpoint/backups and survive restart',()=>{
  const initial={...general(),officerSchoolLevel:1,gold:OFFICER_GRADES[1].academyCost+unitCost(0,'firstLieutenant')};
  const values=new Map([[SAVE_KEY,serializeSave(initial)]]),writes=[];
  const storage={getItem:k=>values.get(k)??null,setItem(k,v){values.set(k,v);writes.push(k);}};
  const session=createGameSession({storage,now:()=>T,setTimer:()=>1,clearTimer:()=>{}});
  session.start();assert.equal(session.change(s=>upgradeSchool(s,T,'officer')).ok,true);
  assert.equal(session.change(s=>recruit(s,T,'firstLieutenant')).ok,true);assert.equal(writes.length,4);
  assert.equal(parseSave(values.get(SAVE_KEY+'-backup'),T).firstLieutenants,0);
  session.pause();session.start();assert.equal(session.state.officerSchoolLevel,2);assert.equal(session.state.firstLieutenants,1);assert.equal(session.state.gold,0);session.pause();
});
test('troops no longer deploy: loadout is equipment only and the enemy roster is unchanged',()=>{
  const s={...general(),officerSchoolLevel:5};for(const u of Object.values(UNITS))s[u.field]=Math.max(s[u.field],12);
  s.equipment.artillery={level:1,count:1,deployed:true};
  const loadout=defaultLoadout(s);assert.deepEqual(Object.keys(loadout),['equipment']);
  const battle=createBattle(s,1,loadout);
  assert.equal(battle.player.units.length,0);assert.equal(battle.enemy.units.length,3);
});
test('academy stages show true prices and recommended ranks, with distinct cached geometry',()=>{
  // Level-by-level details moved from the school card into its detail popup.
  const html=schoolDetailMarkup({...general(),officerSchoolLevel:3},'officer').body;
  assert.ok(!schoolsMarkup({...general(),officerSchoolLevel:3}).includes('school-levels'));
  for(const g of OFFICER_GRADES)assert.ok(html.includes(g.name+' 모집'));
  for(const price of ['150,000,000', '30억', '200억', '2,500억', '9,000억'])
    assert.ok(html.includes(price+' G'));
  assert.match(html,/추가 계급 제한 없이 골드/);
  const images=OFFICER_GRADES.map(g=>schoolIcon('officer',g.schoolLevel).replace(/aria-label="[^"]*"/,''));
  assert.equal(new Set(images).size,5);
  const uniforms=OFFICER_GRADES.map(g=>{
    const marks=[],c={fillRect(...r){marks.push([this.fillStyle,...r]);}};officerDetails(c,g);return serializeSave(marks);
  });assert.equal(new Set(uniforms).size,5);
});
