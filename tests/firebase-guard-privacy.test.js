import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createOutput}=require('../tools/firebase-guard/privacy.cjs');
const {installFileGuard}=require('../tools/firebase-guard/file-guard.cjs');
const {installNetworkGuard}=require('../tools/firebase-guard/network-guard.cjs');
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const preload=fileURLToPath(new URL('../tools/firebase-guard/privacy-preload.cjs',import.meta.url));
const list={url:'https://firebase.googleapis.com/v1beta1/projects?pageSize=100',method:'GET'};
const fixture='https://fixture.example.invalid/auth?session=FIXTURE_SESSION\nfixture-person@example.invalid\nBearer FIXTURE_TOKEN\nError: FIXTURE_ERROR\n    at fixture.invalid:1\n';

test('privacy discards every chunk boundary, buffers, ANSI, partial and long output',()=>{
  let text='';const out=createOutput(chunk=>text+=chunk);
  for(let i=0;i<=fixture.length;i++){out.discard(fixture.slice(0,i));out.discard(fixture.slice(i));}
  for(const byte of Buffer.from(fixture))out.discard(Buffer.from([byte]));
  out.discard('\x1b[31m'+fixture+'\r\n');out.discard(fixture.repeat(10000));out.discard('unfinished FIXTURE');
  assert.equal(text,'');
  out.emit('login-waiting');out.emit('login-completed',{email:'fixture-person@example.invalid'});out.emit('login-failed');
  assert.equal(text,'{"event":"login-waiting"}\n{"event":"login-completed"}\n{"event":"login-failed"}\n');
});
test('privacy raw success cannot forge login; unknown events and invalid summaries are denied',()=>{
  let text='';const out=createOutput(chunk=>text+=chunk);
  out.discard('Successfully logged in as fixture-person@example.invalid');out.discard('{"event":"login-completed"}');
  assert.equal(text,'');assert.throws(()=>out.emit(fixture),/GUARD/);
  assert.throws(()=>out.emit('projects-list-ok',{count:'FIXTURE_TOKEN',devVisible:true}),/GUARD/);
  out.emit('projects-list-ok',{count:2,devVisible:true,raw:fixture});
  assert.equal(text,'{"event":"projects-list-ok","count":2,"devVisible":true}\n');
});
test('privacy synthetic child stdout/stderr/console/errors cannot escape',()=>{
  for(const ending of ['','throw new Error(secret);','Promise.reject(new Error(secret));']) {
    const code='const secret='+JSON.stringify(fixture)+';process.stdout.write(secret.slice(0,7));process.stdout.write(Buffer.from(secret.slice(7)));process.stderr.write(secret);console.log(secret);console.error(secret);'+ending;
    const result=spawnSync(process.execPath,['--require',preload,'-e',code],{encoding:'utf8',timeout:10000,env:{...process.env,NODE_OPTIONS:''}});
    assert.equal(result.error,undefined);assert.equal(result.stderr,'');
    assert.equal(result.stdout,ending?'{"event":"command-failed"}\n':'');assert.equal(result.status,ending?1:0);
  }
});
test('file guard blocks default/custom/rotated logs, promises/streams/fds before creation; preserves reads',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'guard-fixture-'));
  const source=path.join(dir,'fixture.txt');fs.writeFileSync(source,'fixture safe');
  const envFile=path.join(dir,'.env.fixture');fs.writeFileSync(envFile,'FIXTURE_ONLY');
  let blocks=0;const restore=installFileGuard(()=>blocks++);
  try {
    for(const filename of ['firebase-debug.log','firebase-debug.1.log','custom-output.txt']) {
      const file=path.join(dir,filename);
      assert.throws(()=>fs.writeFileSync(file,fixture),/GUARD/);assert.throws(()=>fs.appendFileSync(file,fixture),/GUARD/);
      assert.throws(()=>fs.writeFile(file,fixture,()=>{}),/GUARD/);assert.throws(()=>fs.createWriteStream(file),/GUARD/);
      assert.throws(()=>fs.openSync(file,'w'),/GUARD/);await assert.rejects(fs.promises.writeFile(file,fixture),/GUARD/);
      assert.equal(fs.existsSync(file),false);
    }
    assert.throws(()=>fs.writeSync(1,fixture),/GUARD/);
    for(const p of [envFile,Buffer.from(envFile),pathToFileURL(envFile)])assert.throws(()=>fs.readFileSync(p),/GUARD/);
    assert.equal(fs.readFileSync(source,'utf8'),'fixture safe');assert.ok(blocks>=22);
  } finally {restore();fs.rmSync(dir,{recursive:true,force:true});}
});
test('synthetic child cannot create raw file logs even with custom log path',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'guard-child-'));
  try {
    const file=path.join(dir,'custom.log');
    const result=spawnSync(process.execPath,['--require',preload,'-e',"require('node:fs').writeFileSync(process.env.FIREBASE_DEBUG_PATH,'FIXTURE_TOKEN')"],
      {encoding:'utf8',timeout:10000,env:{...process.env,NODE_OPTIONS:'',FIREBASE_DEBUG_PATH:file}});
    assert.equal(result.status,1);assert.equal(result.stderr,'');assert.equal(fs.existsSync(file),false);
    assert.match(result.stdout,/file-write-blocked/);assert.equal(result.stdout.includes('FIXTURE_TOKEN'),false);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('network permits exact approved fetch and denies changed wire body before transport',async()=>{
  let sent=0;const policy=createPolicy(),network=installNetworkGuard({policy,transport:async(url,init)=>{
    sent++;assert.equal(url,list.url);assert.equal(init.redirect,'error');return {status:200};}});
  try {
    assert.equal((await network.run(list,()=>fetch(list.url,{method:'GET'}))).status,200);assert.equal(sent,1);
    await assert.rejects(network.run(list,()=>fetch(list.url,{method:'GET',body:'FIXTURE_TOKEN'})),/GUARD/);assert.equal(sent,1);
  } finally {network.restore();}
});
test('network rejects unbridged fetch/custom dispatcher/redirect/errors and latches stop',async()=>{
  for(const mode of ['unbridged','dispatcher','redirect','error','exception']) {
    let sent=0;const policy=createPolicy(),network=installNetworkGuard({policy,transport:async()=>{
      sent++;if(mode==='exception')throw new Error(fixture);return {status:mode==='redirect'?302:403};}});
    try {
      if(mode==='unbridged')await assert.rejects(fetch(list.url,{method:'GET'}),/GUARD/);
      else await assert.rejects(network.run(list,()=>fetch(list.url,{method:'GET',...(mode==='dispatcher'?{dispatcher:{}}:{})})),/GUARD/);
      assert.equal(sent,['unbridged','dispatcher'].includes(mode)?0:1);assert.equal(policy.isStopped(),true);
      await assert.rejects(network.send(list,{method:'GET'}),/GUARD/);
    } finally {network.restore();}
  }
});
test('network denies alternate transports and unprotected children before start',()=>{
  const attempts=[()=>require('node:http').get('http://fixture.invalid'),()=>require('node:https').get('https://fixture.invalid'),
    ()=>require('node:http2').connect('https://fixture.invalid'),()=>require('node:net').connect({host:'fixture.invalid',port:443}),
    ()=>require('node:tls').connect({host:'fixture.invalid',port:443}),()=>require('node:child_process').spawn(process.execPath,['-v']),
    ()=>new (require('node:worker_threads').Worker)('0',{eval:true}),
    ()=>require('node:dgram').createSocket('udp4'),()=>require('node:dns').lookup('fixture.invalid',()=>{})];
  for(const attempt of attempts) {
    const policy=createPolicy(),network=installNetworkGuard({policy,transport:()=>{throw new Error('must not send');}});
    try {assert.throws(attempt,/GUARD/);assert.equal(policy.isStopped(),true);}finally{network.restore();}
  }
});
