import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {licenseListMarkup,licenseDetailMarkup} from '../src/license-panel.js';
import {infoPanelMarkup} from '../src/info-panel.js';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const notices = JSON.parse(read('docs/licenses/runtime-notices.json'));
const escapeText = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

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
      assert.ok(detail.body.includes(escapeText(notices.texts[id])),entry.name);
    }
  }
  assert.equal(licenseDetailMarkup(notices,NaN).title,'오픈소스 라이선스');
  const unsafe={entries:[{name:'<script>',license:'<img>',textIds:['x']}],texts:{x:'<script>alert(1)</script>'}};
  assert.doesNotMatch(licenseDetailMarkup(unsafe,0).body,/<script>|<img>/);
});

test('notices include actual native and JS runtime, embedded SDK copyrights, not Vite tools',()=>{
  for(const fragment of ['play-services-ads:25.5.0','user-messaging-platform:4.0.0','com.android.billingclient:billing:8.3.0','androidx.appcompat','@capacitor/core','@capacitor/android','@capacitor/app'])
    assert.ok(notices.entries.some(e=>e.name.includes(fragment)),fragment);
  assert.ok(notices.entries.some(e=>e.name.includes('SDK 포함')));
  assert.match(notices.entries.find(e=>e.name.includes('play-services-ads:')).license,/Android Software Development Kit License/);
  assert.ok(!notices.entries.some(e=>/^(vite|chokidar|connect)(\s|:|$)/i.test(e.name)));
  for(const [id,text] of Object.entries(notices.texts))assert.ok(read('THIRD_PARTY_NOTICES.txt').includes(id+' ==========\n'+text));
  const inventory=JSON.parse(read('docs/licenses/runtime-inventory.json'));
  for(const row of inventory)assert.ok(notices.entries.some(e=>e.name===row.coordinate));
  const font = notices.entries.find(entry=>entry.name==='Black Han Sans Regular');
  assert.ok(font);
  assert.equal(font.license,'SIL Open Font License 1.1');
  assert.ok(font.textIds.some(id=>notices.texts[id]===read('public/fonts/black-han-sans/OFL.txt').trim()+'\n'));
});

test('production bundles complete offline notices once without the redundant public text copy',async()=>{
  assert.equal(existsSync(new URL('../public/THIRD_PARTY_NOTICES.txt',import.meta.url)),false);
  const bundles=await build({configFile:false,logLevel:'silent',mode:'production',build:{write:false,minify:false,
    lib:{entry:fileURLToPath(new URL('../docs/licenses/runtime-notices.json',import.meta.url)),formats:['es']}}});
  const bundle=(Array.isArray(bundles)?bundles:[bundles]).flatMap(result=>result.output).find(item=>item.type==='chunk'&&item.isEntry);
  assert.deepEqual(bundle.imports,[]);
  assert.deepEqual(bundle.dynamicImports,[]);
  const compiled=await import('data:text/javascript;base64,'+Buffer.from(bundle.code).toString('base64'));
  assert.deepEqual(compiled.default,notices);
});
