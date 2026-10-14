import {serializeLegacySave} from './legacy-save-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,SAVE_VERSION} from '../src/state.js';
import {STARTER_PACK,emptyStarterPack,validStarterPack,grantTestStarterPack} from '../src/starter-pack.js';
import {POTION_COUNT_LIMIT} from '../src/potions.js';
import {MAX_GOLD,serializeSave} from '../src/money.js';
import {inspectSave,parseSave} from '../src/save.js';

const T=1_800_000_000_000;

test('starter pack catalog contains only thirty of each potion for 5900 won',()=>{
  assert.deepEqual(STARTER_PACK,{priceWon:5900,red:30,blue:30,max:10});
  assert.ok(Object.isFrozen(STARTER_PACK));
  assert.deepEqual(freshState(T).starterPack,emptyStarterPack());
});

test('test starter pack adds both potions once without granting automatic taps or charging gold',()=>{
  const s=freshState(T);
  s.gold=MAX_GOLD-1n;s.potions.red.count=4;s.potions.blue.count=7;
  const automatic={...s.homeAutoTap};
  assert.deepEqual(grantTestStarterPack(s),{ok:true});
  assert.equal(s.potions.red.count,34);assert.equal(s.potions.blue.count,37);
  assert.equal(s.gold,MAX_GOLD-1n);assert.deepEqual(s.homeAutoTap,automatic);
  assert.deepEqual(s.starterPack,{claimed:true,source:'test'});
  const after=serializeSave(s);
  assert.deepEqual(grantTestStarterPack(s),{ok:false,reason:'claimed'});
  assert.equal(serializeSave(s),after);
});

test('starter pack preserves active potion intervals and the existing automatic-tap off switch',()=>{
  const s=freshState(T);
  s.homeAutoTap={owned:true,enabled:false,source:'test'};
  s.potions.red={count:2,startedAt:T-1000,expiresAt:T+59000};
  s.potions.blue={count:3,startedAt:T-5000,expiresAt:T+1795000};
  const inventory=s.potions,red=inventory.red,blue=inventory.blue,auto=s.homeAutoTap;
  assert.equal(grantTestStarterPack(s).ok,true);
  assert.deepEqual(s.potions.red,{...red,count:32});
  assert.deepEqual(s.potions.blue,{...blue,count:33});
  assert.equal(red.count,2);assert.equal(blue.count,3);
  assert.notEqual(s.potions,inventory);assert.equal(s.homeAutoTap,auto);
});

test('starter pack rejects either inventory overflow before changing any part of the save',()=>{
  for(const id of ['red','blue','max']){
    const s=freshState(T);s.potions[id].count=POTION_COUNT_LIMIT-STARTER_PACK[id]+1;
    const before=serializeSave(s),inventory=s.potions,claim=s.starterPack;
    assert.deepEqual(grantTestStarterPack(s),{ok:false,reason:'limit'});
    assert.equal(serializeSave(s),before);assert.equal(s.potions,inventory);assert.equal(s.starterPack,claim);
  }
  const s=freshState(T);
  for(const id of ['red','blue'])s.potions[id].count=POTION_COUNT_LIMIT-30;
  assert.equal(grantTestStarterPack(s).ok,true);
  assert.equal(s.potions.red.count,POTION_COUNT_LIMIT);assert.equal(s.potions.blue.count,POTION_COUNT_LIMIT);
  const restored=parseSave(serializeSave(s),T);
  assert.equal(restored.potions.red.count,POTION_COUNT_LIMIT);
});

test('version 38 records migrate without losing progress or inventing a starter-pack purchase',()=>{
  const legacy=freshState(T);legacy.version=38;delete legacy.starterPack;
  legacy.gold=MAX_GOLD;legacy.soldiers=120;legacy.homeAutoTap={owned:true,enabled:false,source:'test'};
  legacy.potions.red={count:17,startedAt:T-1000,expiresAt:T+59000};legacy.potions.blue.count=11;
  const restored=parseSave(serializeLegacySave(legacy),T);
  assert.equal(restored.version,SAVE_VERSION);assert.deepEqual(restored.starterPack,emptyStarterPack());
  for(const key of ['gold','soldiers','homeAutoTap','potions'])assert.deepEqual(restored[key],legacy[key]);
  assert.equal(grantTestStarterPack(restored).ok,true);
});

test('claimed starter pack survives save/reload and cannot be received again',()=>{
  const s=freshState(T);s.gold=MAX_GOLD;grantTestStarterPack(s);
  const restored=parseSave(serializeSave(s),T);
  assert.deepEqual(restored.starterPack,s.starterPack);assert.deepEqual(restored.potions,s.potions);
  assert.equal(restored.gold,MAX_GOLD);
  assert.deepEqual(grantTestStarterPack(restored),{ok:false,reason:'claimed'});
});

test('only explicit unclaimed or test-claimed starter flags pass save validation',()=>{
  assert.equal(validStarterPack(emptyStarterPack()),true);
  assert.equal(validStarterPack({claimed:true,source:'test'}),true);
  for(const bad of [null,undefined,[],{},true,{claimed:0,source:null},{claimed:false,source:'test'},
    {claimed:true,source:null},{claimed:true,source:'play'},{claimed:true,source:'test',extra:true}]){
    assert.equal(validStarterPack(bad),false);
    const s=freshState(T);s.starterPack=bad;
    assert.equal(inspectSave(serializeSave(s),T).issue.field,'starterPack');
    const before=serializeSave(s);
    assert.deepEqual(grantTestStarterPack(s),{ok:false,reason:'invalid'});
    assert.equal(serializeSave(s),before);
  }
});

test('corrupt potion inventory cannot receive a starter pack or leave a claimed flag behind',()=>{
  for(const bad of [null,{}, {red:{count:-1,startedAt:null,expiresAt:null},blue:{count:0,startedAt:null,expiresAt:null}}]){
    const s=freshState(T);s.potions=bad;
    const before=serializeSave(s);
    assert.deepEqual(grantTestStarterPack(s),{ok:false,reason:'invalid'});
    assert.equal(serializeSave(s),before);assert.deepEqual(s.starterPack,emptyStarterPack());
  }
});
