import test from 'node:test';
import assert from 'node:assert/strict';
import {createNicknameReportController,nicknameReportMarkup} from '../src/nickname-report-ui.js';

test('nickname report sends only target nickname and selected reason after explicit action',async()=>{
  const calls=[];
  const controller=createNicknameReportController({call:async(...args)=>{calls.push(args);return {submitted:true};}});
  assert.equal(await controller.submit('용사12','abuse'),false);
  controller.setUser({uid:'reporter',email:'synthetic@example.invalid'});
  assert.equal(calls.length,0);
  assert.equal(await controller.submit('용사12','abuse'),true);
  assert.deepEqual(calls,[['reportNickname',{nickname:'용사12',reason:'abuse'}]]);
  assert.match(controller.state.message,/접수/);
});

test('invalid reports and repeated clicks do not issue requests',async()=>{
  let finish,calls=0;
  const controller=createNicknameReportController({call:()=>{calls++;return new Promise(done=>{finish=done;});}});
  controller.setUser({uid:'reporter'});
  assert.equal(await controller.submit('','abuse'),false);
  assert.equal(await controller.submit('용사12','email or free text'),false);
  assert.equal(calls,0);
  const pending=controller.submit('용사12','abuse');
  assert.equal(await controller.submit('용사12','abuse'),false);assert.equal(calls,1);
  finish({submitted:true});assert.equal(await pending,true);
});

test('account changes clear report data and discard late success or error',async()=>{
  for(const failed of [false,true]){
    let finish;
    const controller=createNicknameReportController({call:()=>new Promise((resolve,reject)=>{finish=failed?reject:resolve;})});
    controller.setUser({uid:'old'});
    const pending=controller.submit('용사12','abuse');
    controller.setUser({uid:'new'});finish(failed?Error('private token'):{});
    assert.equal(await pending,false);
    assert.deepEqual(controller.state,{uid:'new',busy:false,nickname:'',reason:'',message:''});
  }
});

test('report errors and diagnostics never expose raw server details',async()=>{
  const errors=[];
  const controller=createNicknameReportController({call:async()=>{throw Error('secret-token-synthetic@example.invalid');},onError:(...args)=>errors.push(args)});
  controller.setUser({uid:'reporter'});
  assert.equal(await controller.submit('용사12','abuse'),false);
  assert.equal(errors[0][0],'account.nickname-report');assert.equal(errors[0][1].message,'request-failed');
  assert.doesNotMatch(controller.state.message,/secret|example/);
  const limited=createNicknameReportController({call:async()=>{throw {code:'functions/resource-exhausted'};}});
  limited.setUser({uid:'reporter'});await limited.submit('용사12','abuse');
  assert.match(limited.state.message,/잠시 뒤/);
});

test('report markup escapes user inputs and explains private review without free text',()=>{
  const markup=nicknameReportMarkup({uid:'reporter',busy:false,nickname:'"><script>x</script>',reason:'abuse',message:'<img onerror=x>'});
  assert.doesNotMatch(markup.body,/<script>|<img|textarea|value="reporter"/);
  assert.match(markup.body,/&lt;script&gt;/);assert.match(markup.body,/자동 제재하지/);
  assert.match(markup.body,/개인정보 노출/);assert.match(markup.body,/다른 이용자에게 공개하지/);
  assert.match(nicknameReportMarkup({uid:null,busy:false,nickname:'',reason:'',message:''}).body,/로그인한 뒤/);
});
test('reports share app-check, account and throttling errors without logging provider secrets',async()=>{
  for(const [message,expected] of [
    ['rate-limit',/요청이 많아요/],['rate-limit-exceeded',/요청이 많아요/],
    ['app-check-required',/정상 앱인지/],['app-check-unavailable',/앱 확인 서비스/],
    ['account-unavailable',/현재 계정으로/],['security-unavailable',/보안 확인/],
    ['recent-login-required',/다시 로그인/],['report-target-unavailable',/해당 닉네임을 찾을 수 없거나/],
  ]){
    const errors=[];
    const report=createNicknameReportController({call:async()=>{throw {message,details:{token:'secret-token'}};},onError:(...args)=>errors.push(args)});
    report.setUser({uid:'synthetic'});
    assert.equal(await report.submit('테스터12','abuse'),false);
    assert.equal(report.state.busy,false);assert.match(report.state.message,expected);
    assert.doesNotMatch(report.state.message,/secret-token/);assert.deepEqual(errors,[]);
  }
});
