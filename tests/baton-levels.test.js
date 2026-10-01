import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, parseSave } from '../src/game.js';
import { RANKS, RANK_REQUIREMENTS } from '../src/ranks.js';
import { commandBatonStatus, bulkRecruitAccess } from '../src/personal-equipment.js';
import { personalMarkup } from '../src/personal-panels.js';
import { personalIcon } from '../src/personal-art.js';

test('paid baton levels survive reload while the original lieutenant-colonel award remains fixed',()=>{
  const names=['중령','대령','준장','소장','중장','대장'];
  const pictures=[];
  names.forEach((name,i)=>{
    const power=RANK_REQUIREMENTS[RANKS.indexOf(name)];
    const sergeants=i>=2?300:40;
    const state={...freshState(1000),soldiers:power-sergeants*10,sergeants,ncoSchoolLevel:1};
    assert.equal(commandBatonStatus(state).level,1);state.personalLevels.commandBaton=i+1;
    assert.equal(commandBatonStatus(state).level,i+1);
    assert.equal(commandBatonStatus(parseSave(JSON.stringify(state),1000)).level,i+1);
    assert.match(personalMarkup(state),/보유 중 · 중령 진급 보상/);
    assert.ok(personalMarkup(state).includes(`Lv.${i+1}`));
    assert.equal(bulkRecruitAccess(state,'soldier').unlocked,true);
    assert.equal(bulkRecruitAccess(state,'sergeant').unlocked,i>=1);
    pictures.push(personalIcon('baton',i+1));
  });
  assert.equal(new Set(pictures).size,6);
});
