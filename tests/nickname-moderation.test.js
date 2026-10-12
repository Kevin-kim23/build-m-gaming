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

test('reviewed ordinary English words do not match their embedded prohibited fragments',()=>{
  for(const name of ['Badminton','badminton12','Badminton_1','Scunthorpe','scunthorpe12','Scunthorpe_1','Scunthorpe_x']){
    assert.equal(normalizeNickname(name).display,name);
    assert.equal(normalizeNickname(name).key,name.toLocaleLowerCase('en-US'));
  }
  assert.equal(normalizeNickname('Ｂａｄｍｉｎｔｏｎ').display,'Badminton');
});

test('reviewed words exempt only their own accidental fragment, not an entire name',()=>{
  for(const name of ['Badminton씨발','Scunthorpe좆','Scunthorpe씨발']){
    assert.throws(()=>normalizeNickname(name),{code:'prohibited-nickname'},name);
  }
  assert.throws(()=>normalizeNickname('Badminton관리자'),{code:'reserved-nickname'});
  for(const name of ['xbadminton','bad_minton','b_admin_ton']){
    assert.throws(()=>normalizeNickname(name),{code:'reserved-nickname'},name);
  }
  for(const name of ['scunthorpex','s_cunthorpe']){
    assert.throws(()=>normalizeNickname(name),{code:'prohibited-nickname'},name);
  }
});

test('known normalization and repeated-letter evasions stay blocked when the fragment survives',()=>{
  for(const name of ['씨_발','씨발','ＦＵＣＫ','F_u_C_k','fuckkk']){
    assert.throws(()=>normalizeNickname(name),{code:'prohibited-nickname'},name);
  }
  for(const name of ['ad_min','adminnn','ＡｄＭｉＮ']){
    assert.throws(()=>normalizeNickname(name),{code:'reserved-nickname'},name);
  }
});

test('documented classifier gaps remain explicit rather than claiming complete evasion detection',()=>{
  // These synthetic examples need private review. Passing registration does not
  // classify a nickname as appropriate or approve it for ranking.
  for(const name of ['ㅆㅣㅂㅏㄹ','씨이발','fuuuck','fυck','admіn']){
    assert.equal(normalizeNickname(name).display,name.normalize('NFKC'));
  }
});

test('privacy checks reject phone forms but leave short ordinary numeric suffixes',()=>{
  for(const name of ['０１０１２３４５６７８','용사0101234567','0212345678','821012345678']){
    assert.throws(()=>normalizeNickname(name),{code:'prohibited-nickname'},name);
  }
  for(const name of ['병사010','왕123456','0123456789'])assert.equal(normalizeNickname(name).display,name);
});
