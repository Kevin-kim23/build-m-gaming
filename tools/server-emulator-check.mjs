import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
// Only loopback demo emulators. Never accept a production URL or use a real user's save.
const functions='http://127.0.0.1:5001/demo-budae-kiugi/asia-northeast3/';
async function user(){
  const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  assert.equal(response.status,200);return response.json();
}
async function call(name,token,data={}){
  const response=await fetch(functions+name,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({data})});
  return {status:response.status,body:await response.json()};
}
const a=await user(),b=await user();
const nickname='QA'+Date.now().toString(36);
assert.equal((await call('readProfile',null)).status,401);
const claims=await Promise.all([call('createProfile',a.idToken,{nickname}),call('createProfile',b.idToken,{nickname:nickname.toUpperCase()})]);
assert.equal(claims.filter(r=>r.status===200).length,1);
assert.equal(claims.filter(r=>r.status===409).length,1);
const owner=claims[0].status===200?a:b,other=owner===a?b:a;
assert.equal((await call('readProfile',other.idToken)).body.result,null);
const raw=serializeSave({...freshState(Date.now()),gold:10n**27n});
const first=await call('saveCloudProgress',owner.idToken,{raw,expectedRevision:0,requestId:'integration_request_0001'});
assert.equal(first.status,200,JSON.stringify(first));
assert.equal(first.body.result.revision,1);
assert.equal(parseSave(first.body.result.raw).gold,10n**27n);
assert.equal((await call('saveCloudProgress',owner.idToken,{raw,expectedRevision:0,requestId:'integration_request_0001'})).body.result.revision,1);
assert.equal((await call('saveCloudProgress',owner.idToken,{raw,expectedRevision:0,requestId:'integration_request_0002'})).body.error.message,'save-conflict');
assert.equal((await call('readCloudSave',other.idToken,{uid:owner.localId})).body.result,null);
const direct=await fetch(`http://127.0.0.1:8080/v1/projects/demo-budae-kiugi/databases/(default)/documents/saves/${owner.localId}`,{headers:{Authorization:`Bearer ${owner.idToken}`}});
assert.equal(direct.status,403,'Firestore direct access must remain denied');
assert.equal((await call('deleteGameAccount',owner.idToken)).status,200);
assert.notEqual((await call('createProfile',owner.idToken,{nickname})).status,200,'Deleted token must not resurrect profile');
assert.equal((await call('deleteGameAccount',other.idToken)).status,200);
console.log('Emulator checks passed: unauthenticated denial, unique nickname race, UID isolation, exact large save, idempotent retry, conflict rejection, rules denial, account deletion and resurrection denial.');
