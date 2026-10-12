import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudController} from '../src/cloud-controller.js';
import {cloudMarkup} from '../src/cloud-ui.js';

test('refresh stops before a second request when the account changes',async()=>{
  let finish;const calls=[];
  const cloud=createCloudController({call:name=>{calls.push(name);return name==='readProfile'?new Promise(done=>{finish=done;}):Promise.resolve(null);}});
  cloud.setUser({uid:'a'});const pending=cloud.refresh();
  cloud.setUser({uid:'b'});finish({nickname:'old'});
  assert.equal(await pending,false);assert.deepEqual(calls,['readProfile']);
  assert.equal(cloud.state.profile,null);
});
test('account change discards late cloud response and prevents restoring another account',async()=>{
  let finish,restored=0;
  const cloud=createCloudController({call:()=>new Promise(done=>{finish=done;}),restore:()=>{restored++;return true;}});
  cloud.setUser({uid:'a'});
  const pending=cloud.createProfile('용사01');cloud.setUser({uid:'b'});finish({nickname:'용사01'});
  assert.equal(await pending,false);assert.equal(cloud.state.profile,null);
  assert.equal(await cloud.restore('a'),false);assert.equal(restored,0);
});
test('uncertain upload retries the original request without silently sending later progress',async()=>{
  const calls=[];let fail=true,raw='old';
  const cloud=createCloudController({localSave:()=>raw,requestId:()=> 'stable-request-123',call:async(name,data)=>{
    calls.push(data);if(fail)throw Error('network');return {revision:1,raw:data.raw};
  }});
  cloud.setUser({uid:'a'});assert.equal(await cloud.upload('a'),false);
  raw='new';fail=false;assert.equal(await cloud.upload('a'),true);
  assert.deepEqual(calls[0],calls[1]);assert.equal(cloud.state.cloud.raw,'old');
});
test('cloud markup escapes nicknames and distinguishes manual server save from local play',()=>{
  const markup=cloudMarkup({phase:'ready',profile:{nickname:'<script>bad</script>'},cloud:null,message:''});
  assert.doesNotMatch(markup.body,/<script>/);assert.match(markup.body,/자동 합산하지/);
  assert.match(markup.body,/검토·승인/);assert.match(markup.body,/변경은 아직 제공하지/);
});
