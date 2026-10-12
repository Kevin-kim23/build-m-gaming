import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfileService,normalizeNickname} from '../server/profile-service.js';
function fixture() {
  const records=new Map();let queue=Promise.resolve();
  const service=createProfileService({now:()=>1000,transact:operation=>{
    const work=queue.then(async()=>{
      const writes=new Map();
      const result=await operation({get:async key=>records.get(key),set:(key,value)=>writes.set(key,value)});
      for(const [key,value] of writes)records.set(key,value);return result;
    });queue=work.catch(()=>{});return work;
  }});
  return {service,records};
}
test('nickname normalization prevents case and compatibility duplicate names',()=>{
  assert.deepEqual(normalizeNickname(' Ａrmy '),{display:'Army',key:'army'});
  for(const name of ['a','abcdefghijklmn','a/b','<script>','운영자01','ADMIN','a b','a\u200bb'])assert.throws(()=>normalizeNickname(name));
  assert.equal(normalizeNickname('용사_12').display,'용사_12');
});
test('simultaneous nickname claims yield one owner and never overwrite another profile',async()=>{
  const {service,records}=fixture();
  const results=await Promise.allSettled([service.create('a','Army'),service.create('b','ARMY')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'nickname-taken');
  assert.equal(records.get('nicknames/army').uid,'a');
  assert.equal(await service.read('b'),null);
});
test('retried creation is idempotent, nickname changes remain unavailable',async()=>{
  const {service}=fixture();const first=await service.create('a','용사01');
  assert.deepEqual(await service.create('a','용사01'),first);
  await assert.rejects(service.create('a','용사02'),{code:'nickname-change-unavailable'});
  assert.equal(first.rankingStatus,'pending-review');
  assert.deepEqual(Object.keys(first).sort(),['createdAt','nickname','nicknameKey','rankingStatus']);
});
test('anonymous requests and deletion-in-progress cannot create or resurrect a profile',async()=>{
  const {service,records}=fixture();
  await assert.rejects(service.create(null,'용사01'),{code:'unauthenticated'});
  records.set('deletions/a',{requestedAt:999});
  await assert.rejects(service.create('a','용사01'),{code:'account-deleting'});
  await assert.rejects(service.read('a'),{code:'account-deleting'});
  assert.equal(records.has('profiles/a'),false);
});
