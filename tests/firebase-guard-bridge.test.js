import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {requestFromClient}=require('../tools/firebase-guard/cli-bridge.cjs');
const {createPolicy}=require('../tools/firebase-guard/request-policy.cjs');
const {checkSource}=require('../tools/firebase-guard/source-check.cjs');
const client={requestURL:({path})=>'https://firebase.googleapis.com/v1beta1'+path};
test('bridge follows pinned CLI URL/query encoding and snapshots encoded body',()=>{
  const r=requestFromClient(client,{path:'projects',method:'GET',queryParams:{pageSize:100,pageToken:'fixture + token'}},{});
  assert.equal(r.url,'https://firebase.googleapis.com/v1beta1/projects?pageSize=100&pageToken=fixture+%2B+token');
  assert.equal(createPolicy().assert(r),'projects-list');
  const body={fixture:true},copy=requestFromClient(client,{path:'/fixture',method:'POST',body},{});
  body.fixture=false;assert.equal(copy.wireBody,'{"fixture":true}');
});
test('bridge rejects alternative transport and redirects before requesting auth',()=>{
  for(const options of [{compress:false},{redirect:'follow'}])assert.throws(()=>requestFromClient(client,{path:'/projects',method:'GET',...options},{}),/GUARD/);
});
test('bridge parses exact OAuth multipart, permits empty scope, verifies client, rejects duplicate fields',()=>{
  const fields={refresh_token:'FIXTURE_REFRESH',client_id:'FIXTURE_CLIENT',client_secret:'FIXTURE_SECRET',grant_type:'refresh_token',scope:''};
  const form=(extra='')=>({getBoundary:()=> 'fixture-boundary',getBuffer:()=>Buffer.from(Object.entries(fields).map(([k,v])=>
    '--fixture-boundary\r\nContent-Disposition: form-data; name="'+k+'"\r\n\r\n'+v+'\r\n').join('')+extra+'--fixture-boundary--\r\n')});
  const api={clientId:()=>fields.client_id,clientSecret:()=>fields.client_secret};
  const c={requestURL:()=> 'https://www.googleapis.com/oauth2/v3/token'};
  const r=requestFromClient(c,{path:'/oauth2/v3/token',method:'POST',body:form()},api);
  assert.equal(createPolicy().assert(r),'token-refresh');assert.equal(r.body.scope,'');
  const bad=requestFromClient(c,{path:'/oauth2/v3/token',method:'POST',body:form()},{...api,clientId:()=> 'OTHER_FIXTURE'});
  assert.throws(()=>createPolicy().assert(bad),/GUARD/);
  assert.throws(()=>requestFromClient(c,{path:'/oauth2/v3/token',method:'POST',body:form('--fixture-boundary\r\nContent-Disposition: form-data; name="scope"\r\n\r\nextra\r\n')},api),/GUARD/);
});
test('source gate refuses changed version and unverified source',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'guard-source-'));
  try {
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'firebase-tools',version:'0.0.0'}));
    assert.throws(()=>checkSource(dir),/GUARD/);
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'firebase-tools',version:'15.33.0'}));
    assert.throws(()=>checkSource(dir),/GUARD/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('readonly entry refuses unknown commands before any CLI or auth load',()=>{
  const runner=fileURLToPath(new URL('../tools/firebase-guard/run-readonly.cjs',import.meta.url));
  const result=spawnSync(process.execPath,[runner,'fixture-cli','deploy'],{encoding:'utf8',timeout:10000});
  assert.equal(result.stderr,'');assert.notEqual(result.status,0);
  assert.equal(result.stdout,process.versions.node.startsWith('22.')?'{"event":"configuration-invalid"}\n':'{"event":"node-mismatch"}\n');
});
