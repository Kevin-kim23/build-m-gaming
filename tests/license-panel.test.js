import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {licenseListMarkup,licenseDetailMarkup} from '../src/license-panel.js';
import {infoPanelMarkup} from '../src/info-panel.js';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const notices = JSON.parse(read('docs/licenses/runtime-notices.json'));

test('info leads to offline license list; every entry opens retained upstream text',()=>{
  assert.match(infoPanelMarkup({version:'x',platform:'android',status:'ready',saveVersion:33,entries:[],report:''}).body,/data-detail-action="open-licenses"/);
  assert.match(licenseListMarkup(notices).body,/게임 정보로/);
  for(const [index,entry] of notices.entries.entries()) {
    assert.ok(entry.textIds.length,entry.name);
    const detail=licenseDetailMarkup(notices,index);
    assert.match(detail.body,/라이선스 목록으로/);
    for(const id of entry.textIds) {
      assert.ok(notices.texts[id]?.length>80,entry.name);
      assert.equal(createHash('sha256').update(notices.texts[id]).digest('hex'),id);
    }
  }
  assert.equal(licenseDetailMarkup(notices,NaN).title,'오픈소스 라이선스');
  const unsafe={entries:[{name:'<script>',license:'<img>',textIds:['x']}],texts:{x:'<script>alert(1)</script>'}};
  assert.doesNotMatch(licenseDetailMarkup(unsafe,0).body,/<script>|<img>/);
});

test('notices include actual native and JS runtime, embedded SDK copyrights, not Vite tools',()=>{
  for(const fragment of ['play-services-ads:25.5.0','user-messaging-platform:4.0.0','androidx.appcompat','@capacitor/core','@capacitor/android','@capacitor/app','firebase-auth:','firebase 12.19.0','@capacitor-firebase/authentication 8.5.2','firebase-appcheck:20.0.0','firebase-appcheck-debug:20.0.0','firebase-appcheck-playintegrity:20.0.0','play:integrity:1.4.0','@firebase/app-check ','@firebase/functions '])
    assert.ok(notices.entries.some(e=>e.name.includes(fragment)),fragment);
  assert.ok(notices.entries.some(e=>e.name.includes('SDK 포함')));
  assert.match(notices.entries.find(e=>e.name.includes('play-services-ads:')).license,/Android Software Development Kit License/);
  assert.ok(!notices.entries.some(e=>/^(vite|chokidar|connect)(\s|:|$)/i.test(e.name)));
  assert.equal(existsSync(new URL('../public/THIRD_PARTY_NOTICES.txt',import.meta.url)),false,
    'The app retains complete offline notices in its JSON chunk, without a second public TXT copy');
  const repositoryText=read('THIRD_PARTY_NOTICES.txt');
  for(const [id,text] of Object.entries(notices.texts))assert.ok(repositoryText.includes(id+' ==========\n'+text));
  const inventory=JSON.parse(read('docs/licenses/runtime-inventory.json'));
  for(const row of inventory)assert.ok(notices.entries.some(e=>e.name===row.coordinate));
});

test('production license chunk preserves every complete notice for offline display',async()=>{
  const result=await build({configFile:false,logLevel:'silent',mode:'production',
    build:{write:false,minify:true,lib:{entry:fileURLToPath(new URL('../docs/licenses/runtime-notices.json',import.meta.url)),formats:['es']}}});
  const output=(Array.isArray(result)?result:[result]).flatMap(item=>item.output);
  const chunk=output.find(item=>item.type==='chunk'&&item.isEntry);
  assert.ok(chunk,'License data must be packaged in a local JavaScript chunk');
  assert.deepEqual(chunk.imports,[],'Offline notices must not require an external module');
  const bundled=(await import('data:text/javascript;base64,'+Buffer.from(chunk.code).toString('base64'))).default;
  assert.deepEqual(bundled,notices,'Minification must preserve names, license labels, and complete text');
  const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const [index,entry] of bundled.entries.entries())
    assert.ok(licenseDetailMarkup(bundled,index).body.includes(escape(entry.textIds.map(id=>bundled.texts[id]).join('\n\n'))),entry.name);
});

test('repackaged protobuf retains the exact reviewed copyright, BSD conditions, and disclaimer',()=>{
  const upstream=read('docs/licenses/protobuf-4.28.2-LICENSE.txt');
  const id=createHash('sha256').update(upstream).digest('hex');
  assert.equal(id,'6e5e117324afd944dcf67f36cf329843bc1a92229a8cd9bb573d7a83130fea7d');
  const entry=notices.entries.find(e=>e.name==='androidx.datastore:datastore-preferences-external-protobuf:1.1.7');
  assert.equal(entry?.license,'BSD-3-Clause');
  assert.ok(entry.textIds.includes(id));
  assert.equal(notices.texts[id],upstream);
  assert.match(upstream,/Copyright 2008 Google Inc\./);
  assert.match(upstream,/Redistributions in binary form must reproduce/);
  assert.match(upstream,/Neither the name of Google Inc\./);
  assert.match(upstream,/THIS SOFTWARE IS PROVIDED/);
});
