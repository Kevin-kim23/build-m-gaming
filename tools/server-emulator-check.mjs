import assert from 'node:assert/strict';
import {freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {parseSave} from '../src/save.js';
import {createRequire} from 'node:module';
import {createMaintenanceRuntime} from '../server/maintenance-runtime.js';
const require=createRequire(new URL('../server/package.json',import.meta.url));
for(const [key,value]of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'})){
  if(process.env[key]&&process.env[key]!==value)throw Error('Only loopback emulators are permitted');
  process.env[key]=value;
}
const {initializeApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore'),{getAuth}=require('firebase-admin/auth');
initializeApp({projectId:'demo-budae-kiugi'});const db=getFirestore(),auth=getAuth();
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
assert.equal((await call('createProfile',other.idToken,{nickname:nickname+'B'})).status,200);
assert.equal((await call('reportNickname',other.idToken,{nickname,reason:'impersonation',reporterUid:owner.localId})).status,200);
let reports=await db.collection('nicknameReports').where('targetUid','==',owner.localId).get();
assert.equal(reports.size,1);assert.equal(reports.docs[0].data().reporterUid,other.localId);
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
reports=await db.collection('nicknameReports').where('targetUid','==',owner.localId).get();assert.equal(reports.size,0);
assert.notEqual((await call('createProfile',owner.idToken,{nickname})).status,200,'Deleted token must not resurrect profile');
assert.equal((await call('deleteGameAccount',other.idToken)).status,200);
const limited=await user();
for(let i=0;i<30;i++)assert.equal((await call('readProfile',limited.idToken)).status,200);
assert.equal((await call('readProfile',limited.idToken)).status,429);
for(let i=0;i<10;i++)assert.equal((await call('createProfile',limited.idToken,{nickname:'!'})).status,400);
assert.equal((await call('createProfile',limited.idToken,{nickname:'!'})).status,429);
// Simulated crash after the deletion barrier: worker must finish without a client session.
await db.doc(`deletions/${limited.localId}`).set({status:'pending',requestedAt:Date.now()});
const maintenance=createMaintenanceRuntime({db,auth});
const maintained=await maintenance();assert.ok(maintained.deletion.completed>=1);
assert.equal((await db.doc(`deletions/${limited.localId}`).get()).data().status,'completed');
const retained=(await db.doc(`deletions/${owner.localId}`).get()).data();
assert.equal(retained.expiresAt-retained.completedAt,90*24*60*60*1000);
// Advance the worker clock using synthetic emulator records only, then try the old token.
await createMaintenanceRuntime({db,auth,now:()=>Date.now()+91*24*60*60*1000})();
assert.equal((await db.doc(`deletions/${owner.localId}`).get()).exists,false);
assert.equal((await call('createProfile',owner.idToken,{nickname})).status,401);
console.log('Emulator checks passed: auth/rules denial, nickname race, private report and deletion cleanup, UID isolation, exact large save, retry/conflict, 30/10 limits, pending retry, 90-day cleanup and old-token denial after cleanup.');
