import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudService} from '../server/cloud-service.js';
import {createDeletionService} from '../server/deletion-service.js';
import {createProfileService} from '../server/profile-service.js';
import {parseSave} from '../src/save.js';
import {serializeSave} from '../src/money.js';
import {freshState} from '../src/state.js';
function fixture() {
  const records=new Map();let queue=Promise.resolve();
  const transact=operation=>{
    const result=queue.then(async()=>{
      const draft=new Map(records);const result=await operation({get:async p=>draft.get(p),set:(p,v)=>draft.set(p,v),delete:p=>draft.delete(p)});
      records.clear();for(const [p,v]of draft)records.set(p,v);return result;
    });queue=result.catch(()=>{});return result;
  };
  const cloud=createCloudService({transact,now:()=>1000,validate:raw=>{
    const state=parseSave(raw,1000);if(!state)throw Error('invalid-save');
    return {raw:serializeSave(state),power:String(state.soldiers)};
  }});
  return {records,transact,cloud,profiles:createProfileService({transact,now:()=>1000})};
}
const input=(gold=0n,expectedRevision=0,requestId='request_0000000001')=>({raw:serializeSave({...freshState(1000),gold}),expectedRevision,requestId});
test('large money survives cloud roundtrip, retry does not increase revision or duplicate rewards',async()=>{
  const f=fixture();await f.profiles.create('a','군단01');
  const request=input(10n**27n);const first=await f.cloud.save('a',request);
  assert.equal(first.revision,1);
  assert.deepEqual(await f.cloud.save('a',request),first);
  assert.equal(parseSave((await f.cloud.read('a')).raw,1000).gold,10n**27n);
  assert.equal(await f.cloud.read('b'),null);
});
test('two devices with the same cloud revision cannot overwrite one another',async()=>{
  const f=fixture();await f.profiles.create('a','군단01');
  const results=await Promise.allSettled([f.cloud.save('a',input(10n)),f.cloud.save('a',input(20n,0,'request_0000000002'))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.code,'save-conflict');
  await f.cloud.save('a',input(30n,1,'request_0000000003'));
  assert.equal(parseSave(f.records.get('initialSaves/a').raw,1000).gold,10);
  assert.equal(parseSave(f.records.get('saveBackups/a').raw,1000).gold,10);
});
test('cloud requires a profile and rejects reused request IDs with different data',async()=>{
  const f=fixture();await assert.rejects(f.cloud.save('a',input()),{code:'profile-required'});
  await f.profiles.create('a','군단01');await f.cloud.save('a',input());
  await assert.rejects(f.cloud.save('a',input(20n)),{code:'request-reused'});
});
test('failed Auth deletion leaves a tombstone, prevents resurrection, and safely retries',async()=>{
  const f=fixture();await f.profiles.create('a','군단01');await f.cloud.save('a',input(10n));
  let fail=true;
  const remove=createDeletionService({transact:f.transact,now:()=>1000,deleteAuth:async()=>{if(fail)throw Error('temporary');}});
  await assert.rejects(remove('a'),{code:'deletion-pending'});
  for(const prefix of ['profiles','saves','initialSaves','saveBackups'])assert.equal(f.records.has(`${prefix}/a`),false);
  await assert.rejects(f.cloud.save('a',input()),{code:'account-deleting'});
  await assert.rejects(f.profiles.create('a','군단02'),{code:'account-deleting'});
  fail=false;assert.deepEqual(await remove('a'),{deleted:true});
  assert.equal(f.records.get('deletions/a').status,'completed');
});
