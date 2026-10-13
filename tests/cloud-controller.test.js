import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudController,cloudErrorMessage} from '../src/cloud-controller.js';
import {cloudMarkup} from '../src/cloud-ui.js';

test('server unavailable retains local progress, remote snapshot and upload retry without claiming a save',async()=>{
  const saved={revision:3,raw:'synthetic-remote'},local='synthetic-local';let stopped=false,restores=0;
  const cloud=createCloudController({localSave:()=>local,restore:()=>{restores++;return true;},requestId:()=> 'synthetic-retry',
    call:async name=>{if(stopped)throw {code:'functions/unavailable',message:'Service disabled'};
      return name==='readProfile'?{nickname:'테스트계정'}:saved;}});
  cloud.setUser({uid:'synthetic-user'});assert.equal(await cloud.refresh(),true);stopped=true;
  assert.equal(await cloud.upload('synthetic-user'),false);
  assert.deepEqual(cloud.state.cloud,saved);assert.match(cloud.state.message,/기기 기록은 유지/);
  assert.doesNotMatch(cloud.state.message,/서버에 저장했어요/);
  assert.equal(await cloud.restore('synthetic-user'),false);assert.equal(restores,0);
  assert.equal(local,'synthetic-local');assert.deepEqual(cloud.state.cloud,saved);
});

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
test('security and nickname rejections give specific safe messages and never claim success',async()=>{
  for(const [message,expected] of [
    ['prohibited-nickname',/사용할 수 없는 표현/],['rate-limit',/요청이 많아요/],
    ['app-check-required',/정상 앱인지 확인하지 못해/],['app-check-unavailable',/앱 확인 서비스/],
    ['account-unavailable',/현재 계정으로 서버를 이용할 수 없어요/],['security-unavailable',/서버의 보안 확인/],
  ]){
    const cloud=createCloudController({call:async()=>{throw {message,details:{token:'private-token',email:'private@example.invalid'}};}});
    cloud.setUser({uid:'test'});
    assert.equal(await cloud.createProfile('테스터12'),false);
    assert.equal(cloud.state.phase,'ready');assert.equal(cloud.state.profile,null);
    assert.match(cloud.state.message,expected);assert.doesNotMatch(cloud.state.message,/private/);
  }
  assert.match(cloudErrorMessage({code:'functions/resource-exhausted',message:'private-token'}),/요청이 많아요/);
  for(const message of ['__proto__','constructor','private-token']){
    assert.equal(typeof cloudErrorMessage({message}),'string');
    assert.doesNotMatch(cloudErrorMessage({message}),/private-token|\[object Object\]/);
    assert.equal(cloudErrorMessage({message},null),null);
  }
});
test('restore storage failure directs the user to individual backup cleanup while retaining the remote record',async()=>{
  const remote={revision:1,raw:'synthetic serialized save'};
  for(const limit of [false,true]){
    const cloud=createCloudController({
      call:async name=>name==='readProfile'?{nickname:'테스트계정'}:remote,
      restore:()=>{if(limit)throw Error('restore-backup-limit');return false;},
    });
    cloud.setUser({uid:'synthetic-test-account'});assert.equal(await cloud.refresh(),true);
    assert.equal(await cloud.restore('synthetic-test-account'),false);
    assert.match(cloud.state.message,limit?/보관 상한/:/기기 저장 공간/);
    assert.match(cloud.state.message,/백업.*직접 삭제/);
    assert.doesNotMatch(cloud.state.message,/서버에 저장할 수/);
    assert.deepEqual(cloud.state.cloud,remote);
  }
});
