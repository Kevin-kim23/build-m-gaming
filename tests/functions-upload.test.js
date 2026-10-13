import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchesGlob,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(readFileSync(new URL('../firebase.json',import.meta.url),'utf8'));
const game=config.functions.find(item=>item.codebase==='game');

test('game upload excludes local dotenv files while retaining executable source',()=>{
  // Firebase CLI uses matchBase + dot matching; the separate CLI reproduction
  // verifies its actual archive and env loader with synthetic files.
  const ignored=name=>game.ignore.some(pattern=>matchesGlob(basename(name),pattern));
  for(const name of ['.env','.env.budae-kiugi-dev','.env.budae-kiugi-prod','.env.local','.env.example','nested/.env.private'])
    assert.equal(ignored(name),true,`must not upload ${name}`);
  for(const name of ['index.js','package.json','package-lock.json','runtime-environment.js','game/game.js'])
    assert.equal(ignored(name),false,`must retain ${name}`);
});

test('upload exclusion does not hide public env examples from Git or unhide private settings',()=>{
  const paths=['server/.env','server/.env.budae-kiugi-dev','server/.env.example','cost-control/.env.example'];
  const result=spawnSync('git',['check-ignore','--no-index','--stdin'],{cwd:root,encoding:'utf8',input:paths.join('\n')+'\n'});
  assert.equal(result.status,0);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/),paths.slice(0,2));
});
