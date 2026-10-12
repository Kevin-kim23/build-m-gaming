import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNickname} from '../server/profile-service.js';

test('server refuses severe abusive and exposed phone-number nicknames',()=>{
  for(const name of ['씨발병사','개새끼','한남충','강간범','01012345678']){
    assert.throws(()=>normalizeNickname(name),{code:'prohibited-nickname'},name);
  }
});

test('nickname checks prevent compatibility, case and underscore evasions',()=>{
  for(const name of ['운영_자','ＡＤＭＩＮ','game_master']){
    assert.throws(()=>normalizeNickname(name),{code:'reserved-nickname'},name);
  }
});

test('ordinary names and permitted number suffixes remain available',()=>{
  for(const name of ['용사_12','강한병사','나무꾼','지휘관2026','골드1000','설날병사','grape','sigmar']){
    assert.equal(normalizeNickname(name).display,name);
  }
});

test('privacy checks reject phone forms but leave short ordinary numeric suffixes',()=>{
  for(const name of ['０１０１２３４５６７８','용사0101234567','0212345678','821012345678']){
    assert.throws(()=>normalizeNickname(name),{code:'prohibited-nickname'},name);
  }
  for(const name of ['병사010','왕123456','0123456789'])assert.equal(normalizeNickname(name).display,name);
});
