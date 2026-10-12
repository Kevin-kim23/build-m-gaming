import test from 'node:test';
import assert from 'node:assert/strict';
import {MODERATION_HTTP_OPTIONS,moderateNicknames} from '../server/moderation-runtime.js';
import {MODERATION_RUNTIME_ACCOUNT_PARAM,requireModerationRuntimeAccount,withModerationRuntimeAccount} from '../server/moderation-runtime-account.js';
import {mkdtemp,mkdir,copyFile,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';

const synthetic='moderator-worker@budae-kiugi-dev.iam.gserviceaccount.com';
const invalid=[undefined,'',' ','default','moderator-worker@','owner@example.test',
  '123456789-compute@developer.gserviceaccount.com','budae-kiugi-dev@appspot.gserviceaccount.com',
  'short@budae-kiugi-dev.iam.gserviceaccount.com','A-worker@budae-kiugi-dev.iam.gserviceaccount.com',
  synthetic+'\n',' '+synthetic,synthetic+',other@example.test'];

test('moderation requires an explicit runtime service account in its options and SDK manifest',()=>{
  assert.ok(MODERATION_HTTP_OPTIONS.serviceAccount,'moderation runtime serviceAccount is missing');
  assert.equal(MODERATION_HTTP_OPTIONS.serviceAccount.name,'MODERATION_RUNTIME_SERVICE_ACCOUNT');
  assert.equal(moderateNicknames.__endpoint.serviceAccountEmail,MODERATION_HTTP_OPTIONS.serviceAccount);
  const spec=MODERATION_HTTP_OPTIONS.serviceAccount.toSpec();
  assert.equal(spec.type,'string');
  assert.equal(Object.hasOwn(spec,'default'),false);
  assert.equal(spec.input.text.nonEmpty,true);
  for(const value of invalid.filter(value=>typeof value==='string'))
    assert.equal(new RegExp(spec.input.text.validationRegex).test(value),false);
});

test('runtime account rejects missing/default/shorthand identities without logging their values',()=>{
  assert.equal(requireModerationRuntimeAccount(synthetic),synthetic);
  for(const value of invalid)
    assert.throws(()=>requireModerationRuntimeAccount(value),{message:'moderation-runtime-account-required'});
});

test('unconfigured moderation returns 503 before the protected handler can access any service',async()=>{
  let calls=0;
  for(const value of invalid) {
    const response={set(){return this;},status(code){this.code=code;return this;},
      json(body){this.body=body;return this;}};
    await withModerationRuntimeAccount(()=>value,()=>{calls++;})({},response);
    assert.equal(response.code,503);
    assert.deepEqual(response.body,{error:'moderation-runtime-unconfigured'});
  }
  assert.equal(calls,0);
  assert.equal(await withModerationRuntimeAccount(()=>synthetic,()=>{calls++;return 'allowed';})({},{}),'allowed');
  assert.equal(calls,1);
});

test('the exported SDK handler blocks a missing runtime account before Firebase initialization',async()=>{
  const original=process.env[MODERATION_RUNTIME_ACCOUNT_PARAM];
  delete process.env[MODERATION_RUNTIME_ACCOUNT_PARAM];
  try {
    const response=Object.assign(new EventEmitter(),{
      set(){return this;},status(code){this.code=code;return this;},
      json(body){this.body=body;this.emit('finish');return this;},
    });
    await moderateNicknames({method:'POST',headers:{}},response);
    assert.equal(response.code,503);
    assert.deepEqual(response.body,{error:'moderation-runtime-unconfigured'});
  } finally {
    if(original===undefined)delete process.env[MODERATION_RUNTIME_ACCOUNT_PARAM];
    else process.env[MODERATION_RUNTIME_ACCOUNT_PARAM]=original;
  }
});

test('offline predeploy gate rejects missing/blank/wrong-project settings and accepts the explicit project file',async t=>{
  const root=await mkdtemp(join(tmpdir(),'moderation runtime '));
  t.after(async()=>{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});});
  await mkdir(join(root,'tools'));
  await mkdir(join(root,'server'));
  await writeFile(join(root,'package.json'),'{"type":"module"}');
  for(const path of ['tools/check-moderation-runtime.mjs','server/moderation-runtime-account.js'])
    await copyFile(new URL('../'+path,import.meta.url),join(root,path));
  const run=(project='budae-kiugi-dev')=>spawnSync(process.execPath,[join(root,'tools','check-moderation-runtime.mjs')],
    {cwd:tmpdir(),encoding:'utf8',env:{...process.env,GCLOUD_PROJECT:project,[MODERATION_RUNTIME_ACCOUNT_PARAM]:synthetic}});
  const config=join(root,'server','.env.budae-kiugi-dev');
  assert.equal(run().status,1,'a shell-only setting must not bypass a missing project file');
  for(const value of [...invalid.filter(value=>typeof value==='string'),synthetic.replace('-dev.','-prod.')]) {
    await writeFile(config,MODERATION_RUNTIME_ACCOUNT_PARAM+'='+JSON.stringify(value));
    const result=run();
    assert.equal(result.status,1);
    assert.equal(result.stdout,'');
    assert.match(result.stderr,/Deployment blocked/);
    assert.equal(result.stderr.includes(synthetic),false);
  }
  await writeFile(config,MODERATION_RUNTIME_ACCOUNT_PARAM+'='+synthetic);
  assert.equal(run().status,0);
  assert.equal(run('budae-kiugi-prod').status,1,'dev settings must not fill in missing prod settings');
  assert.equal(run('other-project').status,1);
  const firebase=JSON.parse(await readFile(new URL('../firebase.json',import.meta.url),'utf8'));
  assert.deepEqual(firebase.functions[0].predeploy,['node tools/check-moderation-runtime.mjs','node tools/prepare-server.mjs']);
});
