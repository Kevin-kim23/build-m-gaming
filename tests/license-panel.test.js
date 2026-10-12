import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
  for(const fragment of ['play-services-ads:25.5.0','user-messaging-platform:4.0.0','androidx.appcompat','@capacitor/core','@capacitor/android','@capacitor/app'])
    assert.ok(notices.entries.some(e=>e.name.includes(fragment)),fragment);
  assert.ok(notices.entries.some(e=>e.name.includes('SDK 포함')));
  assert.match(notices.entries.find(e=>e.name.includes('play-services-ads:')).license,/Android Software Development Kit License/);
  assert.ok(!notices.entries.some(e=>/^(vite|chokidar|connect)(\s|:|$)/i.test(e.name)));
  assert.equal(read('THIRD_PARTY_NOTICES.txt'),read('public/THIRD_PARTY_NOTICES.txt'));
  for(const [id,text] of Object.entries(notices.texts))assert.ok(read('THIRD_PARTY_NOTICES.txt').includes(id+' ==========\n'+text));
  const inventory=JSON.parse(read('docs/licenses/runtime-inventory.json'));
  for(const row of inventory)assert.ok(notices.entries.some(e=>e.name===row.coordinate));
});
