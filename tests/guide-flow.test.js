import { LEGACY_MAX_GOLD } from '../src/money.js';
import { serializeLegacySave } from './legacy-save-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, upgradeSchool, recruit, buildFacility, buyEquipment, enhanceEquipment } from '../src/game.js';
import { guideCandidates, createGuideFlow } from '../src/guide.js';
import { FACILITIES } from '../src/facilities.js';
import { MAX_GOLD, serializeSave } from '../src/money.js';
import { parseSave } from '../src/save.js';
const T=1_800_000_000_000;
const state=(extra={})=>({...freshState(T),soldiers:20,...extra});
test('school guide waits below 600,000 and starts exactly at the real construction price',()=>{
  const flow=createGuideFlow(),s=state({gold:599_999});
  assert.equal(flow.next(s).id,'school'); assert.equal(flow.next(s).ready,false);
  assert.match(flow.next(s).text,/60만 골드/);
  s.gold=600_000; assert.equal(flow.next(s).ready,true);
  s.gold=599_999; assert.equal(flow.next(s).ready,false);
});
test('failed purchase or opening a panel does not finish the guide; real construction does',()=>{
  const flow=createGuideFlow(),s=state({gold:599_999});
  assert.equal(upgradeSchool(s,T,'nco').ok,false);
  assert.equal(flow.next(s).id,'school');
  s.gold=600_000;flow.next(s);
  assert.equal(upgradeSchool(s,T,'nco').ok,true);
  assert.equal(flow.next(s).id,'first-nco');
  s.gold=MAX_GOLD;assert.equal(recruit(s,T,'sergeant').ok,true);
  assert.notEqual(flow.next(s)?.id,'first-nco');
});
test('a running affordable guide keeps its place when another purchase becomes affordable',()=>{
  const flow=createGuideFlow(),s=state({soldiers:80,ncoSchoolLevel:1,sergeants:1,gold:2_000_000});
  assert.equal(flow.next(s).id,'facility');
  s.gold=MAX_GOLD;
  assert.equal(flow.next(s).id,'facility');
  assert.equal(buildFacility(s,T,FACILITIES[0].id).ok,true);
  assert.notEqual(flow.next(s)?.id,'facility');
});
test('locked equipment never starts a purchase guide even with maximum gold',()=>{
  const s=state({gold:MAX_GOLD});
  assert.equal(guideCandidates(s).some(g=>g.id==='equipment'),false);
});
test('owned and upgraded gear does not restart first-purchase or first-upgrade guides',()=>{
  const s=state({soldiers:400,ncoSchoolLevel:2,sergeants:1,gold:MAX_GOLD});
  assert.equal(buyEquipment(s,T,'artillery').ok,true);
  assert.equal(guideCandidates(s).some(g=>g.id==='equipment'),false);
  assert.equal(guideCandidates(s).some(g=>g.id==='equipment-upgrade'),true);
  assert.equal(enhanceEquipment(s,T,'artillery').ok,true);
  assert.equal(guideCandidates(s).some(g=>g.id==='equipment-upgrade'),false);
});
test('deferring a guide does not spend gold or silently complete the action',()=>{
  const flow=createGuideFlow(),s=state({gold:MAX_GOLD}),before=serializeLegacySave(s);
  const first=flow.next(s);flow.defer(first.id);
  assert.equal(flow.paused,true,'later pauses other spotlights for the session too');
  assert.notEqual(flow.next(s)?.id,first.id);
  flow.resume();assert.equal(flow.paused,false);assert.equal(flow.next(s).id,first.id);
  assert.equal(serializeLegacySave(s),before);
});
test('returning players skip completed lessons after save round trips and schema28 migration',()=>{
  for(const version of [28,29]) {
    const s=state({version,soldiers:20000,sergeants:300,ncoSchoolLevel:5,gold:LEGACY_MAX_GOLD,
      facilities:['gym'],facilityLevels:{gym:7}});
    s.equipment.tank={level:4,count:1,deployed:true};
    const restored=parseSave(serializeLegacySave(s),T),before=serializeSave(restored);
    const flow=createGuideFlow();assert.equal(flow.next(restored),null);
    flow.resume();assert.equal(flow.next(restored),null);
    assert.equal(serializeSave(restored),before);
  }
});
test('players who completed only purchases get only remaining first upgrades',()=>{
  const s=state({soldiers:400,sergeants:1,ncoSchoolLevel:1,gold:MAX_GOLD,
    facilities:['kitchen'],facilityLevels:{kitchen:1}});
  s.equipment.artillery={level:0,count:1,deployed:true};
  assert.deepEqual(guideCandidates(s).map(g=>g.id),['school-upgrade','facility-upgrade','equipment-upgrade']);
});
test('an expensive school upgrade does not block an affordable facility lesson',()=>{
  const s=state({soldiers:80,ncoSchoolLevel:1,sergeants:1,gold:120000});
  assert.equal(createGuideFlow().next(s).id,'facility');
});
test('the first school goal stays ahead of other systems until construction is complete',()=>{
  const s=state({soldiers:80,gold:120000});
  assert.equal(createGuideFlow().next(s).id,'school');
  assert.equal(createGuideFlow().next(s).ready,false);
});
