import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAccountController, accountErrorCode, accountErrorMessage} from '../src/account-controller.js';
import {accountMarkup, accountDeleteMarkup} from '../src/account-view.js';
import {accountEnabled, DEVELOPMENT_FIREBASE} from '../src/account-config.js';
import {freshState} from '../src/state.js';
import {serializeSave} from '../src/money.js';

function harness(options = {}) {
  let user = null, observe = () => {}, loads = 0, subscriptions = 0, unsubscribed = 0, signs = 0;
  const errors = [];
  const adapter = {
    ready: async () => {}, currentUser: () => user,
    subscribe(fn) { subscriptions++; observe = fn; return () => {unsubscribed++;}; },
    async signIn() { signs++; user = {uid: 'test-uid', email: 'player@example.invalid', accessToken: 'never expose'}; observe(user); },
    async signOut() { user = null; observe(null); },
    async deleteAccount() { user = null; observe(null); },
    ...options,
  };
  const account = createAccountController({loadAdapter: () => {loads++; return adapter;}, onError: (...v) => errors.push(v)});
  return {account, adapter, errors, counts: () => ({loads, subscriptions, unsubscribed, signs}),
    setUser: value => {user = value; observe(value);}};
}
test('auth stays lazy, initializes once, and exposes only minimal account data', async () => {
  const h = harness();
  assert.equal(h.counts().loads, 0);
  assert.equal(await h.account.signIn(), false);
  await Promise.all([h.account.initialize(), h.account.initialize()]);
  assert.equal(h.counts().loads, 1); assert.equal(h.counts().subscriptions, 1);
  await h.account.signIn();
  assert.deepEqual(h.account.state.user, {uid: 'test-uid', email: 'player@example.invalid'});
  assert.ok(Object.isFrozen(h.account.state.user));
  await h.account.signOut(); assert.equal(h.account.state.user, null);
  h.account.dispose(); assert.equal(h.counts().unsubscribed, 1);
});
test('double clicks cannot open two sign-in flows and browser popup starts synchronously', async () => {
  let finish, calls = 0;
  const h = harness({signIn: () => {calls++; return new Promise(resolve => {finish = resolve;});}});
  await h.account.initialize();
  const pending = h.account.signIn();
  assert.equal(calls, 1, 'popup must start in the click event before an await');
  assert.equal(await h.account.signIn(), false);
  assert.equal(await h.account.signOut(), false);
  finish(); await pending; assert.equal(h.account.state.phase, 'ready');
});
test('cancel and connection failures are recoverable and do not log credentials', async () => {
  const h = harness({signIn: () => Promise.reject({code: 'auth/network-request-failed', message: 'private token=email@example.invalid'})});
  await h.account.initialize();
  assert.equal(await h.account.signIn(), false); assert.equal(h.account.state.phase, 'ready');
  assert.equal(h.errors[0][1].message, 'auth/network-request-failed');
  assert.doesNotMatch(h.account.state.message, /private|example/);
  h.adapter.signIn = () => Promise.reject({code: 'auth/popup-closed-by-user'});
  await h.account.signIn(); assert.equal(h.errors.length, 1);
  assert.match(h.account.state.message, /취소/);
  assert.equal(accountErrorCode({message:'Sign in canceled.'}), 'auth/cancelled');
  assert.equal(accountErrorCode({code:'evil email@example.invalid'}), 'auth/unknown');
});
test('a synchronous initialization error can retry without duplicate listeners', async () => {
  let failures = true, subscriptions = 0;
  const account = createAccountController({loadAdapter: () => {
    if (failures) throw Error('SDK load failed');
    return {ready: async () => {}, currentUser: () => null, subscribe: () => {subscriptions++; return () => {};}};
  }});
  assert.equal(await account.initialize(), false);
  failures = false; assert.equal(await account.initialize(), true); assert.equal(subscriptions, 1);
});
test('auth restoration, account changes and deletion never receive or mutate the army save', async () => {
  const save = {...freshState(1000), gold: 10n ** 27n, soldiers: 5000};
  const original = serializeSave(save), h = harness();
  await h.account.initialize();
  h.setUser({uid:'a',email:'a@example.invalid'}); assert.equal(h.account.state.user.uid,'a');
  h.setUser({uid:'b',email:'b@example.invalid'}); assert.equal(h.account.state.user.uid,'b');
  await h.account.deleteAccount('b'); assert.equal(h.account.state.user,null);
  assert.equal(serializeSave(save),original);
  const source=readFileSync(new URL('../src/firebase-auth-adapter.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/firestore|session\.js|state\.js|SAVE_KEY|serializeSave/);
});

test('account switching invalidates an earlier delete confirmation', async () => {
  const h = harness(); await h.account.initialize();
  h.setUser({uid:'original',email:'first@example.invalid'});
  const confirmedUid = h.account.state.user.uid;
  h.setUser({uid:'other',email:'second@example.invalid'});
  assert.equal(await h.account.deleteAccount(confirmedUid),false);
  assert.equal(h.account.state.user.uid,'other');
  assert.equal(await h.account.deleteAccount(),false);
});
test('stale initialization cannot subscribe after disposal', async () => {
  let resolve;
  const h = harness({ready: () => new Promise(done => {resolve = done;})});
  const pending = h.account.initialize(); await Promise.resolve(); await Promise.resolve();
  h.account.dispose(); resolve(); await pending;
  assert.equal(h.counts().subscriptions,0);
});
test('account builds reject a mismatched native package', () => {
  assert.equal(accountEnabled('development'),true);
  assert.equal(accountEnabled('firebase-dev',true,'com.dongramco.budaekiugi.dev'),true);
  assert.equal(accountEnabled('production'),true);
  assert.equal(accountEnabled('firebase-dev',true,'com.dongramco.budaekiugi'),false);
  assert.equal(DEVELOPMENT_FIREBASE.projectId,'budae-kiugi-dev');
});
test('account markup escapes provider text and honestly distinguishes login from saved progress', () => {
  const view=accountMarkup({phase:'ready',user:{email:'<img src=x onerror=alert(1)>'},message:'<script>bad</script>'});
  assert.doesNotMatch(view.body,/<img|<script/);
  assert.match(view.body,/로그인만으로 게임 기록이 서버에 저장되지는/);
  assert.match(view.body,/data-detail-action="cloud-show"/);
  assert.match(accountDeleteMarkup().body,/닉네임·게임 저장·최초 연결 기록/);
  assert.match(accountDeleteMarkup().body,/Google 계정 자체/);
  assert.match(accountErrorMessage('auth/requires-recent-login'),/다시 로그인/);
});
test('local backup access stays available when signed out or the auth SDK fails, but is absent without a game session',()=>{
  for(const phase of ['idle','loading','ready','busy','error']){
    const state={phase,user:null,message:''};
    const body=accountMarkup(state,false,true).body;
    assert.match(body,/<button[^>]*data-detail-action="local-backups-show"[^>]*>/);
    assert.doesNotMatch(body,/<button[^>]*data-detail-action="local-backups-show"[^>]*disabled/);
    assert.doesNotMatch(accountMarkup(state,false,false).body,/local-backups-show/);
  }
});
test('nickname reporting is offered only to a signed-in account and waits for auth operations',()=>{
  assert.doesNotMatch(accountMarkup({phase:'ready',user:null}).body,/nickname-report-show/);
  assert.match(accountMarkup({phase:'ready',user:{email:'player@example.invalid'}}).body,/<button[^>]*nickname-report-show"\s*>/);
  assert.match(accountMarkup({phase:'busy',user:{email:'player@example.invalid'}}).body,/<button[^>]*nickname-report-show"\s+disabled>/);
});
test('account deletion explains associated reports, retry state and the separate 90-day completion record',()=>{
  for(const development of [false,true]){
    const body=accountDeleteMarkup(development).body;
    assert.match(body,/신고자 또는 대상인 닉네임 신고/);
    assert.match(body,/실패한 처리를 재시도/);
    assert.match(body,/완료 후[\s\S]*최소 기록을 90일 보관/);
    assert.match(body,/기기의 복원 전 백업 보관과 별개/);
    assert.match(body,/기기의 골드·병력·복원 전 백업은 삭제하지/);
  }
});
test('server recent-login rejection during deletion asks for reauthentication and keeps the signed-in account',async()=>{
  const h=harness({deleteAccount:async()=>{throw {code:'functions/unauthenticated',message:'recent-login-required'};}});
  await h.account.initialize();h.setUser({uid:'test'});
  assert.equal(await h.account.deleteAccount('test'),false);
  assert.equal(h.account.state.user.uid,'test');assert.equal(h.account.state.phase,'ready');
  assert.match(h.account.state.message,/다시 로그인/);
  assert.equal(h.errors[0][1].message,'auth/requires-recent-login');
});
test('server deletion and security failures are mapped only for known code-message pairs',async()=>{
  for(const [message,code,expected] of [
    ['deletion-pending','functions/unavailable',/아직 완료되지 않았어요/],
    ['rate-limit','functions/resource-exhausted',/요청이 많아요/],
    ['app-check-required','functions/permission-denied',/정상 앱인지/],
    ['app-check-unavailable','functions/failed-precondition',/앱 확인 서비스/],
    ['account-unavailable','functions/unauthenticated',/현재 계정으로/],
    ['security-unavailable','functions/unavailable',/보안 확인/],
  ]){
    const h=harness({deleteAccount:async()=>{throw {code,message,details:{token:'private-token',email:'private@example.invalid'}};}});
    await h.account.initialize();h.setUser({uid:'test'});
    assert.equal(await h.account.deleteAccount('test'),false);
    assert.equal(h.account.state.user.uid,'test');assert.match(h.account.state.message,expected);
    assert.equal(h.errors[0][1].message,`server/${message}`);
    assert.doesNotMatch(h.account.state.message,/private/);
    assert.equal(accountErrorCode({code:'functions/internal',message}),'auth/unknown');
  }
  assert.equal(accountErrorCode({code:'functions/unavailable',message:'private-token-private@example.invalid'}),'auth/unknown');
  assert.equal(accountErrorCode({code:'functions/unavailable',message:'__proto__'}),'auth/unknown');
});
test('a late deletion result never claims success for an account selected while it was pending',async()=>{
  for(const failed of [false,true]){
    let finish;
    const h=harness({deleteAccount:()=>new Promise((resolve,reject)=>{finish=failed?reject:resolve;})});
    await h.account.initialize();h.setUser({uid:'original'});
    const pending=h.account.deleteAccount('original');h.setUser({uid:'new-account'});
    finish(failed?{code:'functions/unavailable',message:'deletion-pending'}:undefined);
    assert.equal(await pending,false);
    assert.equal(h.account.state.user.uid,'new-account');assert.equal(h.account.state.phase,'ready');
    assert.match(h.account.state.message,/계정이 달라졌어요/);
    assert.doesNotMatch(h.account.state.message,/삭제했어요|삭제 요청을 접수/);
  }
});
test('Android auth is registered in each variant and packaging rejects mixed environments', () => {
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.deepEqual(JSON.parse(read('capacitor.config.json')).includePlugins,['@capacitor/app']);
  assert.match(read('android/app/build.gradle'),/implementation project\(':capacitor-firebase-authentication'\)/);
  assert.match(read('android/app/build.gradle'),/Firebase web\/native environment mismatch/);
  for(const variant of ['release','unsigned'])assert.match(read(`android/app/src/${variant}/java/com/dongramco/budaekiugi/DevelopmentAccountPlugins.java`),/FirebaseAuthenticationPlugin/);
  const config=JSON.parse(read('android/app/src/debug/google-services.json'));
  assert.equal(config.client[0].client_info.android_client_info.package_name,'com.dongramco.budaekiugi.dev');
});
