import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave } from '../src/game.js';
const T = 1800000000000;
test('legacy version six saves gain empty battle progress without losing assets', () => {
  const old = { ...freshState(T), version: 6, gold: 1234567, soldiers: 880,
    sergeants: 40, staffSergeants: 3, taps: 777, sound: true,
    revision: 47, incomeRemainder: 789,
    equipment: { artillery: {level: 8, deployed: true}, tank: {level: 3, deployed: false}, selfPropelled: null } };
  delete old.battleCleared;
  assert.equal(freshState(T).version, 13);
  assert.equal(freshState(T).battleCleared, 0);
  assert.deepEqual(parseSave(JSON.stringify(old)), {...old, version: 13, ncoSchoolLevel: 2, battleCleared: 0, equipment: {...Object.fromEntries(Object.entries(old.equipment).map(([id, gear]) => [id, gear ? {...gear, count: 1} : null])), helicopter: null, rocketLauncher: null},
    earnedAchievements: ['squad', 'platoon', 'company', 'battalion']});
});
test('all ten cleared stages survive saving and corrupt battle progress is rejected', () => {
  for(let i=0;i<=10;i++) {
    const s={...freshState(T), battleCleared:i};
    assert.deepEqual(parseSave(JSON.stringify(s)),s);
  }
  for(const bad of [-1,11,1.5,'3',null,undefined]) {
    assert.equal(parseSave(JSON.stringify({...freshState(T),version:7,battleCleared:bad})),null);
  }
});
test('pre battle versions cannot smuggle progression through migration', () => {
  for(const version of [3,4,5,6]) {
    const s={...freshState(T),version,battleCleared:10};
    const loaded=parseSave(JSON.stringify(s));
    assert.ok(loaded);
    assert.equal(loaded.battleCleared,0);
  }
  const v2=parseSave(JSON.stringify({version:2,gold:50,taps:50,rank:0,sound:false}),T);
  assert.equal(v2.battleCleared,0);
});
