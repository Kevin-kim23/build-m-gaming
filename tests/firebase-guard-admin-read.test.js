import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
const {summarizeAccount,readAdminAccounts}=require('../tools/firebase-guard/admin-read.cjs');
const project='budae-kiugi-dev';
const root='https://iam.googleapis.com/v1/projects/'+project+'/serviceAccounts';
const account=name=>name+'@'+project+'.iam.gserviceaccount.com';
for(const name of ['moderation-caller','moderation-runtime']) {
  test('admin read permits exact '+name+' before sending',async()=>{
    let sent=0;
    await createPolicy({mode:'inventory'}).dispatch({method:'GET',url:root+'/'+account(name)},async()=>{sent++;return {status:200};});
    assert.equal(sent,1);
  });
}
const good=root+'/'+account('moderation-caller');
const bad=[
  ['other account',root+'/'+account('other-account'),'GET'],
  ['case changed',root+'/'+account('Moderation-caller'),'GET'],
  ['list',root,'GET'],['keys',good+'/keys','GET'],
  ['getIamPolicy',good+':getIamPolicy','GET'],
  ...['POST','PUT','PATCH','DELETE'].map(method=>[method,good,method]),
  ['other project',good.replaceAll(project,'other-project'),'GET'],
  ['other host',good.replace('iam.googleapis.com','example.invalid'),'GET'],
  ['query',good+'?alt=json','GET'],['trailing slash',good+'/','GET'],
];
for(const [label,url,method] of bad)test('admin read denies '+label+' before sending',async()=>{
  let sent=0;
  const policy=createPolicy({mode:'inventory'});
  await assert.rejects(()=>policy.dispatch({url,method},async()=>{sent++;}));
  assert.equal(sent,0);assert.equal(policy.isStopped(),true);
});
test('admin read remains unavailable in projects and deploy modes',()=>{
  for(const mode of ['projects','deploy'])assert.throws(()=>createPolicy({mode}).assert({url:good,method:'GET'}));
});
test('admin output contains only fixed label and booleans',()=>{
  let text='';
  const output=createOutput(value=>text+=value);
  output.emit('admin-account-ok',{account:'moderation-caller',exists:true,disabled:false,
    email:'FAKE_EMAIL',uniqueId:'FAKE_ID',keys:['FAKE_KEY'],body:'FAKE_BODY'});
  assert.deepEqual(JSON.parse(text),{event:'admin-account-ok',account:'moderation-caller',exists:true,disabled:false});
  assert.doesNotMatch(text,/FAKE/);
  assert.throws(()=>output.emit('admin-account-ok',{account:'unknown',exists:true,disabled:false}));
  assert.throws(()=>output.emit('admin-account-ok',{account:'moderation-caller',exists:true,disabled:'false'}));
});
test('admin response validates identity and hides extra response fields',()=>{
  const body={projectId:project,email:account('moderation-caller'),uniqueId:'FAKE_ID',keys:['FAKE_KEY']};
  assert.deepEqual(summarizeAccount('moderation-caller',body),{account:'moderation-caller',exists:true,disabled:false});
  assert.equal(summarizeAccount('moderation-caller',{...body,disabled:true}).disabled,true);
  for(const changed of [{email:account('other')},{projectId:'other'},{disabled:'false'}])
    assert.throws(()=>summarizeAccount('moderation-caller',{...body,...changed}));
});
test('admin reader emits only summaries and stops at first API error',async()=>{
  const seen=[],emitted=[];
  const lib=()=>({async getServiceAccount(p,name){seen.push(name);return {projectId:p,email:account(name)};}});
  await readAdminAccounts(lib,{emit:(event,details)=>emitted.push({event,...details})});
  assert.deepEqual(seen,['moderation-caller','moderation-runtime']);
  assert.equal(emitted.length,2);assert.doesNotMatch(JSON.stringify(emitted),/@/);
  let calls=0;
  await assert.rejects(()=>readAdminAccounts(()=>({async getServiceAccount(){calls++;throw new Error('FAKE_ERROR');}}),{emit:()=>assert.fail()}));
  assert.equal(calls,1);
});
