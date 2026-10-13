import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {createLoginSession,validateLoginArguments,SCOPES,TOKEN}=require('../tools/firebase-guard/login-session.cjs');
const {createReceiver}=require('../tools/firebase-guard/login-receiver.cjs');
const {prepareCredentialStore,validateCredentialPath}=require('../tools/firebase-guard/login-store.cjs');
const {installNetworkGuard}=require('../tools/firebase-guard/network-guard.cjs');
const {installFileGuard}=require('../tools/firebase-guard/file-guard.cjs');
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const {credentialsFromResponse}=require('../tools/firebase-guard/login-response.cjs');
const fixture=()=>createLoginSession({args:['login','--localhost'],clientId:'FIXTURE_CLIENT',clientSecret:'FIXTURE_SECRET',scopes:[...SCOPES]});
function listening() {
  const s=fixture();s.bind('127.0.0.1',49152);const url=s.browserUrl();s.openBrowser(url,()=>{});
  return {s,state:new URL(url).searchParams.get('state')};
}
const callback=state=>({method:'GET',host:'localhost:49152',remoteAddress:'127.0.0.1',url:'/?state='+state+'&code=FIXTURE_CODE'});
test('login opens only fixed arguments; deploy/no-localhost/extra arguments/scopes denied',()=>{
  validateLoginArguments(['login','--localhost']);
  for(const args of [[],['deploy','--localhost'],['login','--no-localhost'],['login','--localhost','--reauth']])assert.throws(()=>validateLoginArguments(args),/GUARD/);
  assert.throws(()=>createLoginSession({args:['login','--localhost'],clientId:'FIXTURE',clientSecret:'FIXTURE',scopes:[...SCOPES,'extra']}),/GUARD/);
});
test('login auth URL uses exact pinned scopes, redirect, client and fresh state',()=>{
  const a=fixture(),b=fixture();a.bind('127.0.0.1',49152);b.bind('127.0.0.1',49153);
  const url=new URL(a.browserUrl());
  assert.equal(url.origin+url.pathname,'https://accounts.google.com/o/oauth2/auth');
  assert.equal(url.searchParams.get('scope'),SCOPES.join(' '));
  assert.equal(url.searchParams.get('redirect_uri'),'http://localhost:49152');
  assert.notEqual(url.searchParams.get('state'),new URL(b.browserUrl()).searchParams.get('state'));
});
for(const [name,mutate] of Object.entries({
  'other host':u=>u.hostname='fixture.invalid',
  'other path':u=>u.pathname='/other',
  'external redirect':u=>u.searchParams.set('redirect_uri','https://fixture.invalid'),
  'extra scope':u=>u.searchParams.set('scope',u.searchParams.get('scope')+' extra'),
  'wrong state':u=>u.searchParams.set('state','FIXTURE_WRONG'),
  'extra query':u=>u.searchParams.set('login_hint','fixture@example.invalid'),
}))test('login rejects '+name+' before browser launch',()=>{
  const s=fixture();s.bind('127.0.0.1',49152);const u=new URL(s.browserUrl());mutate(u);let opened=0;
  assert.throws(()=>s.openBrowser(u.href,()=>opened++),/GUARD/);assert.equal(opened,0);assert.equal(s.isStopped(),true);
});
test('login cannot bind wildcard/external interface or reuse a receiver',async()=>{
  for(const host of ['0.0.0.0','::','192.0.2.1']) {
    assert.throws(()=>fixture().bind(host,49152),/GUARD/);
    assert.throws(()=>createReceiver(fixture(),{host}),/GUARD/);
  }
  const receiver=createReceiver(fixture(),{timeoutMs:1000});
  try {await receiver.start();assert.equal(receiver.address().address,'127.0.0.1');await assert.rejects(receiver.start(),/GUARD/);}
  finally {receiver.close();}
});
test('login callback requires correct state, host, method, loopback peer and unique fields',()=>{
  for(const mutate of [r=>r.remoteAddress='192.0.2.1',r=>r.host='fixture.invalid',r=>r.method='POST',
    r=>r.url='/?state=WRONG&code=FIXTURE_CODE',r=>r.url+='&state=duplicate',r=>r.url+='&unknown=1']) {
    const {s,state}=listening(),r=callback(state);mutate(r);
    assert.throws(()=>s.receive(r),/GUARD/);assert.equal(s.isStopped(),true);
  }
});
test('login accepts only one callback and one browser launch',()=>{
  let entry=listening();entry.s.receive(callback(entry.state));
  assert.throws(()=>entry.s.receive(callback(entry.state)),/GUARD/);
  const s=fixture();s.bind('127.0.0.1',49152);const url=s.browserUrl();s.openBrowser(url,()=>{});
  assert.throws(()=>s.openBrowser(url,()=>assert.fail('second browser opened')),/GUARD/);
});
test('login valid exchange passes once; changed redirect and repeated requests never transmit',async()=>{
  for(const tamper of [false,true]) {
    const {s,state}=listening();s.receive(callback(state));const r=s.exchangeRequest();
    if(tamper)r.body.redirect_uri='https://fixture.invalid';
    r.wireBody=JSON.stringify(r.body);
    let sent=0;const network=installNetworkGuard({policy:s,transport:async()=>{sent++;return {status:200};}});
    try {
      const send=()=>network.send(r,{method:'POST',body:r.wireBody});
      if(tamper){await assert.rejects(send(),/GUARD/);assert.equal(sent,0);}
      else {assert.equal((await send()).status,200);await assert.rejects(send(),/GUARD/);assert.equal(sent,1);}
    }finally{network.restore();}
  }
});
test('login permission closes on success/failure and normal modes never gain OAuth permission',()=>{
  const {s,state}=listening();s.receive(callback(state));s.assert(s.exchangeRequest());s.complete();
  assert.equal(s.mode(),'readonly');
  assert.equal(s.assert({method:'GET',url:'https://firebase.googleapis.com/v1beta1/projects?pageSize=100'}),'projects-list');
  assert.throws(()=>s.assert({method:'POST',url:TOKEN}),/GUARD/);
  const failed=fixture();failed.stop();assert.equal(failed.mode(),'readonly');assert.throws(()=>failed.assert({method:'POST',url:TOKEN}),/GUARD/);
  for(const mode of ['projects','inventory','deploy'])assert.throws(()=>createPolicy({mode}).assert({method:'POST',url:TOKEN}),/GUARD/);
});
test('login real loopback listener takes one synthetic callback then closes',async()=>{
  const s=fixture(),receiver=createReceiver(s,{timeoutMs:5000});
  await receiver.start();
  const address=receiver.address(),authUrl=new URL(s.browserUrl()),state=authUrl.searchParams.get('state');
  s.openBrowser(authUrl.href,()=>{});
  try {
    const code=await new Promise((resolve,reject)=>{
      const req=http.get({host:'127.0.0.1',port:address.port,path:'/?state='+state+'&code=FIXTURE_CODE',
        headers:{Host:'localhost:'+address.port}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
      req.on('error',reject);
    });
    await receiver.result;assert.equal(code,200);assert.equal(receiver.address(),null);
    await assert.rejects(new Promise((resolve,reject)=>{
      http.get({host:'127.0.0.1',port:address.port,path:'/'},resolve).on('error',reject);
    }));
  }finally{receiver.dispose();}
});
test('credential path rejects repository, sync folder, different filename/path and linked files',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'guard-login-path-'));
  try {
    const repo=path.join(root,'repo'),file=path.join(root,'config','firebase-tools.json');
    assert.equal(validateCredentialPath(file,{expectedPath:file,repo}),true);
    for(const candidate of [path.join(repo,'firebase-tools.json'),path.join(root,'OneDrive','firebase-tools.json'),
      path.join(root,'Dropbox','firebase-tools.json'),path.join(root,'config','other.json')])
      assert.throws(()=>validateCredentialPath(candidate,{expectedPath:candidate,repo}),/GUARD/);
    assert.throws(()=>validateCredentialPath(file,{expectedPath:path.join(root,'different','firebase-tools.json'),repo}),/GUARD/);
    assert.throws(()=>validateCredentialPath(file,{expectedPath:file,repo,syncRoots:[path.join(root,'config')]}),/GUARD/);
    fs.mkdirSync(path.dirname(file));fs.writeFileSync(file,'{}');
    fs.linkSync(file,path.join(root,'linked.json'));
    assert.throws(()=>validateCredentialPath(file,{expectedPath:file,repo}),/GUARD/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('credential writer only writes exact file once; no post-save read or raw log',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'guard-login-store-'));
  const file=path.join(root,'config','firebase-tools.json'),repo=path.join(root,'repo');
  const store=prepareCredentialStore(file,{expectedPath:file,repo});
  let reads=0;const read=fs.readFileSync;fs.readFileSync=(...args)=>{reads++;return read(...args);};
  const restore=installFileGuard();
  try {
    store.save({user:{email:'fixture@example.invalid'},tokens:{access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH'},scopes:SCOPES});
    assert.equal(reads,0);assert.equal(fs.statSync(file).isFile(),true);
    assert.throws(()=>store.save({}),/GUARD/);
    assert.throws(()=>fs.writeFileSync(path.join(root,'raw.log'),'FIXTURE_TOKEN'),/GUARD/);
  }finally{restore();fs.readFileSync=read;fs.rmSync(root,{recursive:true,force:true});}
});
test('credential writer preserves preexisting preferences and refuses concurrent replacement/revoked saves',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'guard-login-existing-'));
  const file=path.join(root,'firebase-tools.json'),options={expectedPath:file,repo:path.join(root,'repo')};
  try {
    fs.writeFileSync(file,JSON.stringify({fixturePreference:true}));
    const store=prepareCredentialStore(file,options);
    store.save({user:{email:'fixture@example.invalid'},tokens:{access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH'},scopes:SCOPES});
    // Independent test verifier reads only the synthetic fixture, not real credentials.
    assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).fixturePreference,true);
    const raced=prepareCredentialStore(file,options);fs.appendFileSync(file,' ');
    assert.throws(()=>raced.save({}),/GUARD/);
    const revoked=prepareCredentialStore(file,options);revoked.revoke();assert.throws(()=>revoked.save({}),/GUARD/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('login entry refuses remote/deploy/noninteractive execution with only fixed failure output',()=>{
  const runner=fileURLToPath(new URL('../tools/firebase-guard/run-login.cjs',import.meta.url));
  // No real login: invalid arguments/non-TTY fail BEFORE reading any CLI/config.
  for(const args of [['fixture-cli','login','--no-localhost'],['fixture-cli','deploy'],['fixture-cli','login','--localhost']]) {
    const r=spawnSync(process.execPath,[runner,...args],{encoding:'utf8',timeout:10000});
    assert.equal(r.status,1);assert.equal(r.stdout,'실패\n');assert.equal(r.stderr,'');
  }
});
test('login validates token response before persistence and rejects changed audience/issuer/expiry',()=>{
  const user={iss:'https://accounts.google.com',aud:'FIXTURE_CLIENT',sub:'FIXTURE_SUBJECT',email:'fixture@example.invalid',exp:Date.now()/1000+3600};
  const response=u=>({access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH',expires_in:3600,
    id_token:'fixture.'+Buffer.from(JSON.stringify(u)).toString('base64url')+'.fixture'});
  assert.equal(credentialsFromResponse(response(user),'FIXTURE_CLIENT').user.email,user.email);
  for(const u of [null,{...user,iss:'https://fixture.invalid'},{...user,aud:'OTHER_CLIENT'},{...user,exp:1},{...user,email:undefined}])
    assert.throws(()=>credentialsFromResponse(response(u),'FIXTURE_CLIENT'));
  assert.throws(()=>credentialsFromResponse({...response(user),refresh_token:undefined},'FIXTURE_CLIENT'));
});
test('synthetic login completes under network/file guards then OAuth closes; unexpected redirects stop',async()=>{
  for(const status of [200,302,403]) {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'guard-login-flow-')),file=path.join(root,'firebase-tools.json');
    const store=prepareCredentialStore(file,{expectedPath:file,repo:path.join(root,'repo')});
    const {s,state}=listening();s.receive(callback(state));
    const r=s.exchangeRequest();r.wireBody=JSON.stringify(r.body);
    const restoreFiles=installFileGuard(()=>s.stop());
    let sent=0;const network=installNetworkGuard({policy:s,transport:async()=>{sent++;return {status};}});
    try {
      if(status!==200) {
        await assert.rejects(network.send(r,{method:'POST',body:r.wireBody}),/GUARD/);assert.equal(fs.existsSync(file),false);
      }else{
        await network.send(r,{method:'POST',body:r.wireBody});s.complete();
        store.save({user:{email:'fixture@example.invalid'},tokens:{access_token:'FIXTURE_ACCESS',refresh_token:'FIXTURE_REFRESH'},scopes:SCOPES});
        store.revoke();assert.equal(s.mode(),'readonly');assert.equal(fs.existsSync(file),true);
        await assert.rejects(network.send(r,{method:'POST',body:r.wireBody}),/GUARD/);
      }
      assert.equal(sent,1);
    }finally{network.restore();restoreFiles();store.revoke();fs.rmSync(root,{recursive:true,force:true});}
  }
});
test('login output drops raw URL/session/email/token/chunks and emits only fixed failure',()=>{
  const preload=fileURLToPath(new URL('../tools/firebase-guard/run-login.cjs',import.meta.url));
  const code="process.stdout.write('https://fixture.invalid/?session=FIXTURE');process.stdout.write('_SESSION');console.error('fixture@example.invalid FIXTURE_TOKEN');throw new Error('FIXTURE_ERROR');";
  const r=spawnSync(process.execPath,['--require',preload,'-e',code],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,1);assert.equal(r.stdout,'실패\n');assert.equal(r.stderr,'');
});
test('login timeout closes receiver and permission without credential writes',async()=>{
  const s=fixture(),receiver=createReceiver(s,{timeoutMs:20});
  await receiver.start();
  await assert.rejects(receiver.result,/GUARD/);
  assert.equal(receiver.address(),null);assert.equal(s.mode(),'readonly');assert.equal(s.isStopped(),true);
});


test('login receiver starts with network and file guards installed together',async()=>{
  const s=fixture(),r=createReceiver(s,{timeoutMs:1000});
  const restoreFiles=installFileGuard(()=>s.stop());
  const g=installNetworkGuard({policy:s});
  try {
    await g.startLoginReceiver(()=>r.start());
    assert.equal(r.address().address,'127.0.0.1');
    assert.ok(r.address().port>0);
    assert.throws(()=>g.startLoginReceiver(()=>{}),/GUARD/);
  } finally {r.dispose();g.restore();restoreFiles();}
});


test('receiver lookup exception denies other hosts, outbound sockets and repeated lookups',()=>{
  const dns=require('node:dns'),net=require('node:net');
  for(const attempt of [
    g=>g.startLoginReceiver(()=>dns.lookup('fixture.invalid',()=>{})),
    g=>g.startLoginReceiver(()=>dns.lookup('localhost',()=>{})),
    g=>g.startLoginReceiver(()=>net.connect({host:'127.0.0.1',port:443})),
    g=>g.startLoginReceiver(()=>{dns.lookup('127.0.0.1',()=>{});dns.lookup('127.0.0.1',()=>{});}),
    g=>{g.startLoginReceiver(()=>{});dns.lookup('127.0.0.1',()=>{});},
  ]) {
    const s=fixture(),g=installNetworkGuard({policy:s});
    try {assert.throws(()=>attempt(g),/GUARD/);assert.equal(s.isStopped(),true);}
    finally {g.restore();}
  }
  const g=installNetworkGuard({policy:createPolicy({mode:'projects'})});
  try {assert.throws(()=>g.startLoginReceiver(()=>{}),/GUARD/);}finally {g.restore();}
});


test('offline login diagnostics identify only a fixed check without exposing input or error',()=>{
  const script=fileURLToPath(new URL('../tools/firebase-guard/selftest-login-cli.cjs',import.meta.url));
  const input=path.join(os.tmpdir(),'FIXTURE_TOKEN_fixture@example.invalid');
  const result=spawnSync(process.execPath,[script,input],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,1);
  assert.deepEqual(JSON.parse(result.stdout),{offlineLoginCli:'failed',check:'cli-source'});
  assert.equal(result.stderr,'');
  assert.equal(result.stdout.includes('FIXTURE'),false);
});
