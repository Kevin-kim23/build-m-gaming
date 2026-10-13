// Offline reproduction against the exact deployment CLI; no login or network.
// Usage: node tools/verify-functions-upload.mjs <firebase-tools package directory>
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createRequire} from 'node:module';

let fixture;
const archives=[];
try {
  if(process.argv.length!==3)throw Error('cli-directory-required');
  const cliRoot=resolve(process.argv[2]);
  const require=createRequire(join(cliRoot,'package.json'));
  const pkg=JSON.parse(await readFile(join(cliRoot,'package.json'),'utf8'));
  assert.equal(pkg.name,'firebase-tools');
  assert.equal(pkg.version,'15.33.0','review and pin a new CLI before changing this check');
  // Import only offline modules. Do not start the CLI or enable a file logger.
  const {prepareFunctionsUpload}=require('./lib/deploy/functions/prepareFunctionsUpload.js');
  const {loadUserEnvs}=require('./lib/functions/env.js');
  const tar=require('tar');
  const projectId='demo-upload-check';
  fixture=await mkdtemp(join(tmpdir(),'budae-upload-'));
  const source=join(fixture,'server');
  await mkdir(source);
  const contents={
    '.env':'BASE_SETTING=synthetic-base\n',
    [`.env.${projectId}`]:'MODERATION_RUNTIME_SERVICE_ACCOUNT=synthetic-only\nMODERATION_ADMIN_AUDIENCE=\nMODERATION_ADMIN_SUBJECT=\n',
    '.env.local':'LOCAL_SETTING=must-not-load\n',
    '.env.example':'EXAMPLE_SETTING=documentation-only\n',
    'index.js':'export const placeholder=true;\n',
    'package.json':'{"name":"offline-upload-fixture","private":true}\n',
  };
  for(const [name,value] of Object.entries(contents))await writeFile(join(source,name),value);
  const config=JSON.parse(await readFile(new URL('../firebase.json',import.meta.url),'utf8'));
  const game=config.functions.find(item=>item.codebase==='game');
  async function packagedNames(ignore) {
    const result=await prepareFunctionsUpload(fixture,source,{...game,ignore:[...ignore]},[],undefined,{exportType:'tar.gz'});
    archives.push(result.pathToSource);
    const names=[];
    await tar.t({file:result.pathToSource,onReadEntry:entry=>names.push(entry.path)});
    return names;
  }
  const before=await packagedNames(['node_modules','*.log']);
  assert.ok(before.includes('.env')&&before.includes(`.env.${projectId}`),'old upload must reproduce the leak');
  console.log('PASS: old configuration includes synthetic dotenv files in the source archive.');
  const after=await packagedNames(game.ignore);
  for(const name of Object.keys(contents).filter(name=>name.startsWith('.env')))
    assert.equal(after.includes(name),false,`dotenv archive exclusion failed: ${name}`);
  assert.ok(after.includes('index.js')&&after.includes('package.json'));
  console.log('PASS: configured upload excludes .env / .env.* including public examples; executable source remains.');
  const loaded=loadUserEnvs({projectDir:fixture,functionsSource:source,projectId});
  assert.equal(loaded.BASE_SETTING,'synthetic-base');
  assert.equal(loaded.MODERATION_RUNTIME_SERVICE_ACCOUNT,'synthetic-only');
  assert.equal(loaded.MODERATION_ADMIN_AUDIENCE,'');
  assert.equal(loaded.MODERATION_ADMIN_SUBJECT,'');
  assert.equal(loaded.LOCAL_SETTING,undefined);
  assert.equal(loaded.EXAMPLE_SETTING,undefined);
  console.log('PASS: CLI still loads local and project dotenv values independently of source upload filtering.');
  for(const [name,value] of Object.entries(contents))assert.equal(await readFile(join(source,name),'utf8'),value);
  console.log('PASS: local files and public example content remain unchanged. No cloud deployment performed.');
} catch {
  // Never echo an unknown CLI error or configuration value.
  console.error('FAIL: offline upload reproduction failed; inspect the synthetic fixture assertions locally.');
  process.exitCode=1;
} finally {
  // Only remove exact temporary outputs created in this invocation.
  const temporaryRoot=resolve(tmpdir())+sep;
  for(const archive of archives){
    assert.ok(resolve(archive).startsWith(temporaryRoot));
    assert.ok((await stat(archive)).isFile());
    await rm(archive);
  }
  if(fixture){assert.ok(resolve(fixture).startsWith(temporaryRoot));await rm(fixture,{recursive:true,force:true});}
}
