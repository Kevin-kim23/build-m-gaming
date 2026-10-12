import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFirebaseAppCheck} from '../src/firebase-app-check.js';

const app={options:{projectId:'synthetic-project',appId:'1:123:web:synthetic'}};
const valid=()=>({token:'synthetic-token',expireTimeMillis:2000,projectId:'synthetic-project',appId:'1:123:android:synthetic',provider:'play-integrity'});
function harness(options={}) {
  let loads=0,initializations=0,fetches=0,provider;
  const answers=[];
  const sdk={CustomProvider:class {constructor(value){this.getToken=value.getToken;}},
    initializeAppCheck(actualApp,settings){assert.equal(actualApp,app);assert.equal(settings.isTokenAutoRefreshEnabled,false);initializations++;provider=settings.provider;return {provider};},
    getToken:async instance=>{fetches++;const token=await instance.provider.getToken();answers.push(token);return token;}};
  const ensure=createFirebaseAppCheck({app,native:true,mode:'production',now:()=>1000,
    loadSDK:async()=>{loads++;return sdk;},loadPlugin:async()=>({getToken:async()=>valid()}),...options});
  return {ensure,sdk,answers,counts:()=>({loads,initializations,fetches}),provider:()=>provider};
}
const blocked={message:'app-check-unavailable',code:'functions/failed-precondition'};

test('app attestation is lazy, shares initialization and passes the native expiry to Firebase JS',async()=>{
  const h=harness();assert.deepEqual(h.counts(),{loads:0,initializations:0,fetches:0});
  await Promise.all([h.ensure(),h.ensure()]);
  assert.deepEqual(h.counts(),{loads:1,initializations:1,fetches:2});
  assert.deepEqual(h.answers,[{token:'synthetic-token',expireTimeMillis:2000},{token:'synthetic-token',expireTimeMillis:2000}]);
});

test('web without configured attestation and unknown modes fail closed before loading any SDK',async()=>{
  for(const options of [{native:false},{mode:'staging'},{mode:'test'}]){
    const h=harness(options);await assert.rejects(h.ensure(),blocked);
    assert.deepEqual(h.counts(),{loads:0,initializations:0,fetches:0});
  }
});

test('native token must come from the matching project, platform and build provider',async()=>{
  for(const patch of [{projectId:'other-project'},{appId:'1:456:android:other'},
    {appId:'1:123:web:synthetic'},{provider:'debug'},{provider:'unknown'}]){
    const h=harness({loadPlugin:async()=>({getToken:async()=>({...valid(),...patch})})});
    await assert.rejects(h.ensure(),blocked);assert.deepEqual(h.answers,[]);
  }
  const h=harness({mode:'firebase-dev',loadPlugin:async()=>({getToken:async()=>({...valid(),provider:'debug'})})});
  await h.ensure();assert.equal(h.answers.length,1);
  const mismatch=harness({mode:'development'});await assert.rejects(mismatch.ensure(),blocked);
});

test('empty, expired and malformed tokens cannot reach callable and errors contain no SDK payload',async()=>{
  for(const patch of [{token:''},{token:null},{expireTimeMillis:999},{expireTimeMillis:1000},
    {expireTimeMillis:Infinity},{expireTimeMillis:'2000'},{expireTimeMillis:2000.5}]){
    const h=harness({loadPlugin:async()=>({getToken:async()=>({...valid(),...patch})})});
    await assert.rejects(h.ensure(),blocked);
  }
  const h=harness({loadPlugin:async()=>({getToken:async()=>{throw new Error('private-token-and-address');}})});
  await assert.rejects(h.ensure(),error=>{
    assert.equal(error.message,blocked.message);assert.equal(error.code,blocked.code);
    assert.doesNotMatch(error.stack,/private-token-and-address/);assert.equal(error.cause,undefined);return true;
  });
});

test('SDK initialization failure can retry and a token failure does not register another provider',async()=>{
  let attempts=0;const h=harness({loadPlugin:async()=>{if(attempts++===0)throw Error('load-failed');return {getToken:async()=>valid()};}});
  await assert.rejects(h.ensure(),blocked);await h.ensure();assert.equal(h.counts().initializations,1);
  let tokenAttempts=0;const transient=harness({loadPlugin:async()=>({getToken:async()=>{
    if(tokenAttempts++===0)throw Error('network-error');return valid();}})});
  await assert.rejects(transient.ensure(),blocked);await transient.ensure();
  assert.deepEqual(transient.counts(),{loads:1,initializations:1,fetches:2});
});

test('web SDK global debug flag cannot override native production protection',async()=>{
  const before=globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN;
  try {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN=true;
    const h=harness();await assert.rejects(h.ensure(),blocked);assert.equal(h.counts().loads,0);
  } finally {
    if(before===undefined)delete globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN;
    else globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN=before;
  }
});

test('an SDK placeholder token with an attached error is never accepted',async()=>{
  const h=harness();h.sdk.getToken=async()=>({token:'placeholder',error:Error('synthetic-failure')});
  await assert.rejects(h.ensure(),blocked);
});

test('Android production providers cannot select debug attestation from JavaScript',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const java='android/app/src/';
  for(const variant of ['release','unsigned']){
    const factory=read(`${java}${variant}/java/com/dongramco/budaekiugi/GameAppCheckProvider.java`);
    assert.match(factory,/PlayIntegrityAppCheckProviderFactory/);assert.doesNotMatch(factory,/DebugAppCheckProviderFactory/);
  }
  const debug=read(`${java}debug/java/com/dongramco/budaekiugi/GameAppCheckProvider.java`);
  assert.match(debug,/DebugAppCheckProviderFactory/);
  const gradle=read('android/app/build.gradle');
  assert.match(gradle,/debugImplementation 'com.google.firebase:firebase-appcheck-debug:/);
  assert.doesNotMatch(gradle,/(?:implementation|releaseImplementation|unsignedImplementation) 'com.google.firebase:firebase-appcheck-debug:/);
  const bridge=read(`${java}main/java/com/dongramco/budaekiugi/AppCheckPlugin.java`);
  assert.match(bridge,/token\.getExpireTimeMillis\(\)/);assert.doesNotMatch(bridge,/Log\.|System\.out|call\.getBoolean|call\.getString/);
  assert.match(read(`${java}main/java/com/dongramco/budaekiugi/MainActivity.java`),/registerPlugin\(AppCheckPlugin\.class\)/);
  // Capacitor otherwise logs successful plugin result.data, which now contains a token.
  assert.equal(JSON.parse(read('capacitor.config.json')).loggingBehavior,'none');
});

test('attestation guards server calls, preserves auth readiness, and checks account changes afterward',()=>{
  const source=readFileSync(new URL('../src/firebase-auth-adapter.js',import.meta.url),'utf8');
  const call=source.slice(source.indexOf('async function call('),source.indexOf('adapter = {'));
  assert.ok(call.indexOf('await ensureAppCheck()')<call.indexOf('httpsCallable('));
  assert.match(call,/await ensureAppCheck\(\);\s*if\(auth\.currentUser\?\.uid!==uid\)/);
  const ready=source.match(/ready: async \(\) => \{([^}]+)\}/)[1];
  assert.doesNotMatch(ready,/ensureAppCheck/);
  assert.doesNotMatch(source,/consumeAppCheckToken|limitedUseAppCheckTokens/);
});
