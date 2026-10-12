import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';

async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'budae bootstrap '));
  t.after(async()=>{
    // Only remove the exact directory this test created, never a computed parent.
    assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));
    await rm(root,{recursive:true,force:true});
  });
  await mkdir(join(root,'tools'));
  await mkdir(join(root,'server'));
  return root;
}

test('server preparation creates a missing game directory and refreshes rules from another cwd',async t=>{
  const root=await fixture(t),script=join(root,'tools','prepare-server.mjs');
  await copyFile(new URL('../tools/prepare-server.mjs',import.meta.url),script);
  await mkdir(join(root,'src'));
  await writeFile(join(root,'src','save.js'),'export const revision = 1;');
  await writeFile(join(root,'src','private.txt'),'must not enter server game rules');
  for(const revision of [1,2]) {
    await writeFile(join(root,'src','save.js'),`export const revision = ${revision};`);
    const result=spawnSync(process.execPath,[script],{cwd:tmpdir(),encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.equal(await readFile(join(root,'server','game','save.js'),'utf8'),`export const revision = ${revision};`);
    assert.deepEqual(await readdir(join(root,'server','game')),['save.js']);
  }
});

test('root installer keeps spaced server paths intact and propagates npm ci failures',async t=>{
  const root=await fixture(t),script=join(root,'tools','install-server-dependencies.mjs');
  await copyFile(new URL('../tools/install-server-dependencies.mjs',import.meta.url),script);
  const npmCli=join(root,'stub npm.mjs'),capture=join(root,'arguments.json');
  await writeFile(npmCli,"import{writeFileSync}from'node:fs';writeFileSync(process.env.BOOTSTRAP_CAPTURE,JSON.stringify(process.argv.slice(2)));process.exit(Number(process.env.BOOTSTRAP_EXIT));");
  for(const status of [0,73]) {
    const result=spawnSync(process.execPath,[script],{cwd:tmpdir(),encoding:'utf8',
      env:{...process.env,npm_execpath:npmCli,BOOTSTRAP_CAPTURE:capture,BOOTSTRAP_EXIT:String(status)}});
    assert.equal(result.status,status,result.stderr);
    assert.deepEqual(JSON.parse(await readFile(capture,'utf8')),['ci','--prefix',join(root,'server')+sep]);
  }
});
