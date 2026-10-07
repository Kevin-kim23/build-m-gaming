import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

test('Vite production output disables the development free-double adapter',async()=>{
  const bundles=await build({configFile:false,logLevel:'silent',mode:'production',build:{write:false,minify:false,
    lib:{entry:fileURLToPath(new URL('../src/rewarded-ads.js',import.meta.url)),formats:['es']}}});
  const bundle=(Array.isArray(bundles)?bundles:[bundles]).flatMap(result=>result.output).find(item=>item.type==='chunk'&&item.isEntry);
  const compiled=await import('data:text/javascript;base64,'+Buffer.from(bundle.code).toString('base64'));
  assert.equal(compiled.OFFLINE_AD_TEST_MODE,false);
  assert.deepEqual(await compiled.showOfflineRewardAd(),{status:'unavailable'});
});
