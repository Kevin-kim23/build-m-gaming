import { serializeSave } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave, buyEquipment, setEquipmentDeployed, enhanceEquipment, perSecond, recruit, recruitOffer, unitCost, MAX_GOLD, MAX_SOLDIERS } from '../src/game.js';
import { EQUIPMENT, deployedEquipment, equipmentPurchaseOffer, equipmentStats, enhancementCost } from '../src/equipment.js';
import { fieldTheme, setFieldTheme } from '../src/field-theme.js';
import { createBattle, advanceBattle, equipmentCombatStats } from '../src/battle.js';
import { homeMarkup } from '../src/home-view.js';
import { syncSwordControls } from '../src/sword-controls.js';
import { drawEquipment } from '../src/equipment-art.js';
const T=1800000000000;
const general=()=>({...freshState(T),soldiers:7240,sergeants:300,ncoSchoolLevel:2,gold:100_000_000_000_000});

test('rocket launcher previews only at colonel and requires actual brigadier rank to purchase',()=>{
  const s=general();s.soldiers=880;s.sergeants=40;
  assert.equal(equipmentPurchaseOffer(s,'rocketLauncher').visible,false);
  s.soldiers=6000;
  assert.equal(equipmentPurchaseOffer(s,'rocketLauncher').visible,true);
  assert.equal(buyEquipment(s,T,'rocketLauncher').reason,'locked');
  s.soldiers=20000;assert.equal(buyEquipment(s,T,'rocketLauncher').reason,'locked');
  s.sergeants=300;s.gold=EQUIPMENT.rocketLauncher.cost-1;
  assert.equal(buyEquipment(s,T,'rocketLauncher').reason,'gold');
  s.gold++;assert.equal(buyEquipment(s,T,'rocketLauncher').ok,true);assert.equal(s.gold,0);
  assert.equal(buyEquipment(s,T,'rocketLauncher').reason,'owned');
});
test('fifth purchase goes to storage, swaps require freeing a slot, no income from stored gear',()=>{
  const s=general();for(const id of ['artillery','tank','selfPropelled','helicopter','rocketLauncher'])assert.equal(buyEquipment(s,T,id).ok,true);
  assert.equal(deployedEquipment(s).length,4);assert.equal(s.equipment.rocketLauncher.deployed,false);
  const before=perSecond(s);
  assert.equal(setEquipmentDeployed(s,true,T,'rocketLauncher').reason,'capacity');assert.equal(perSecond(s),before);
  assert.equal(setEquipmentDeployed(s,true,T,'tank').ok,true);
  assert.equal(setEquipmentDeployed(s,false,T,'artillery').ok,true);
  assert.equal(setEquipmentDeployed(s,true,T,'rocketLauncher').ok,true);
  assert.equal(deployedEquipment(s).length,4);
  assert.equal(perSecond(s),before-EQUIPMENT.artillery.passive+EQUIPMENT.rocketLauncher.passive);
  assert.equal(setEquipmentDeployed(s,true,T,'artillery').reason,'capacity');
  assert.deepEqual(parseSave(serializeSave(s),T).equipment,s.equipment);
});
test('rocket upgrades settle old income and all ten levels persist while stored',()=>{
  const s=general();buyEquipment(s,T,'rocketLauncher');const before=s.gold,income=perSecond(s);
  const cost=enhancementCost(0,'rocketLauncher');enhanceEquipment(s,T+1000,'rocketLauncher');
  assert.equal(s.gold,before+income-cost);
  setEquipmentDeployed(s,false,T+1000,'rocketLauncher');
  const without=perSecond(s);
  for(let n=1;n<10;n++)assert.equal(enhanceEquipment(s,T+1000,'rocketLauncher').ok,true);
  assert.equal(perSecond(s),without);assert.equal(enhanceEquipment(s,T+1000,'rocketLauncher').reason,'max');
  assert.deepEqual(parseSave(serializeSave(s),T).equipment.rocketLauncher,{level:10,deployed:false, count: 1 });
  assert.deepEqual(equipmentStats(10,'rocketLauncher'),{passive:450000,tap:2700000});
});
test('v11 migration preserves assets and cooldown, grants neither rocket nor concrete; current saves reject corrupt saves',()=>{
  const old={...general(),version:11,battleCleared:3,swordActivatedAt:T-5000};
  for(const id of ['artillery','tank','selfPropelled','helicopter','rocketLauncher'].filter(id=>id!=='rocketLauncher'))old.equipment[id]={level:7,deployed:true};
  delete old.equipment.rocketLauncher;delete old.fieldTheme;
  const next=parseSave(serializeSave(old),T);
  for(const key of ['gold','soldiers','sergeants','ncoSchoolLevel','battleCleared','swordActivatedAt'])assert.equal(next[key],old[key]);
  assert.deepEqual(next.equipment,{...Object.fromEntries(Object.entries(old.equipment).map(([id, gear]) => [id, gear ? {...gear, count: 1} : null])),rocketLauncher:null});assert.equal(next.fieldTheme,'earth');assert.equal(next.version, 19);
  old.fieldTheme='concrete';old.equipment.rocketLauncher={level:10,deployed:true};
  assert.equal(parseSave(serializeSave(old),T).equipment.rocketLauncher,null);
  for(const theme of [undefined,null,'invalid',{}])assert.equal(parseSave(serializeSave({...next,fieldTheme:theme}),T),null);
  for(const gear of [undefined,{level:11,deployed:false},{level:0,deployed:1}])assert.equal(parseSave(serializeSave({...next,equipment:{...next.equipment,rocketLauncher:gear}}),T),null);
  assert.equal(parseSave(serializeSave({...next,equipment:{...next.equipment,rocketLauncher:{level:0,deployed:true}}}),T),null);
});
test('general can switch both backgrounds and reload preference without affecting economy',()=>{
  const s=general(),income=perSecond(s),gold=s.gold;
  assert.equal(setFieldTheme(s,'concrete').ok,true);assert.equal(fieldTheme(s),'concrete');
  assert.equal(fieldTheme(parseSave(serializeSave(s),T)),'concrete');assert.equal(perSecond(s),income);assert.equal(s.gold,gold);
  assert.equal(setFieldTheme(s,'earth').ok,true);assert.equal(fieldTheme(s),'earth');
  s.soldiers=4999;assert.equal(setFieldTheme(s,'concrete').reason,'locked');
  s.fieldTheme='concrete';assert.equal(fieldTheme(s),'earth');assert.equal(setFieldTheme(s,'invalid').reason,'invalid');
});
test('staff sergeant batches require Lv3 baton and school Lv2, charge exact sum and remain atomic',()=>{
  const s=general();s.staffSergeants=20;s.personalLevels.commandBaton=3;
  const sum=Array.from({length:100},(_,i)=>unitCost(20+i,'staffSergeant')).reduce((a,b)=>a+b,0);
  assert.equal(recruitOffer(s,'staffSergeant',100).cost,sum);
  for(const patch of [{personalLevels:{...s.personalLevels,commandBaton:2}},{ncoSchoolLevel:1},{gold:sum-1},{soldiers:MAX_SOLDIERS-3000-400-1999}]) {
    const blocked={...s,...patch},before=structuredClone(blocked);
    assert.equal(recruit(blocked,T,'staffSergeant',100).ok,false);assert.deepEqual(blocked,before);
  }
  s.gold=sum;assert.equal(recruit(s,T,'staffSergeant',100).ok,true);assert.equal(s.staffSergeants,120);assert.equal(s.gold,0);
  assert.equal(parseSave(serializeSave(s),T).staffSergeants,120);
});
test('rocket fires in battle with its own stats while enemies keep their previous weapons',()=>{
  const s=general();buyEquipment(s,T,'rocketLauncher');
  let b=createBattle(s,1,{units:{},equipment:['rocketLauncher']});
  assert.deepEqual(b.enemy.equipment.map(g=>g.id),['artillery','tank','selfPropelled']);
  const hp=b.enemy.hq.hp;for(let i=0;i<84;i++)b=advanceBattle(b,50);
  assert.equal(b.enemy.hq.hp,hp-equipmentCombatStats('rocketLauncher',0,10240).damage);
});
test('home sword sits in the dock under the field (where the troop status row used to be), preserves icon and short text through cooldown updates',()=>{
  const html=homeMarkup(general());
  assert.ok(html.indexOf('medal-shelf')<html.indexOf('id="tap-zone"'));
  assert.ok(html.indexOf('id="tap-zone"')<html.indexOf('data-use-sword'));
  assert.ok(html.indexOf('data-use-sword')<html.indexOf('id="promotion-fill"'));
  assert.equal((html.match(/data-use-sword/g)||[]).length,1);
  assert.doesNotMatch(html,/30초 터치/);
  const label={textContent:'장군검 사용'},attrs={};
  const button={querySelector:selector=>selector==='[data-sword-label]'?label:null,setAttribute:(k,v)=>attrs[k]=v,classList:{toggle(){}},set textContent(v){throw Error('icon must not be removed');}};
  const root={querySelectorAll:()=>[button]},s=general();
  syncSwordControls(root,s,true,T);assert.equal(button.disabled,false);
  s.swordActivatedAt=T;syncSwordControls(root,s,true,T+1000);assert.equal(button.disabled,true);
  syncSwordControls(root,s,true,T+31000);assert.match(attrs['aria-label'],/대기/);
  syncSwordControls(root,s,true,T+600000);assert.equal(button.disabled,false);assert.equal(label.textContent,'장군검 사용');
});
test('rocket drawings distinguish all eleven stages and reuse cached previews',()=>{
  const prior=global.document;let created=0;const signatures=[];
  const make=()=>{const marks=[];const ctx={setTransform(){},fillRect(...p){marks.push([this.fillStyle,...p]);},clearRect(){},drawImage(){}};return {width:220,height:124,marks,getContext:()=>ctx};};
  global.document={createElement(){created++;const c=make();signatures.push(c.marks);return c;}};
  try {const target=make();for(let l=0;l<=10;l++){assert.equal(drawEquipment(target,l,'rocketLauncher'),true);assert.equal(drawEquipment(target,l,'rocketLauncher'),false);}
    assert.equal(created,11);assert.equal(new Set(signatures.map(x=>serializeSave(x))).size,11);
    drawEquipment(make(),5,'rocketLauncher');assert.equal(created,11);
  } finally {global.document=prior;}
});
