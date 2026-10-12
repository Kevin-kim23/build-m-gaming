import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {accountEnabled, DEVELOPMENT_FIREBASE, PRODUCTION_FIREBASE} from '../src/account-config.js';

for (const [mode, expected, excluded] of [
  ['production', PRODUCTION_FIREBASE, DEVELOPMENT_FIREBASE],
  ['firebase-dev', DEVELOPMENT_FIREBASE, PRODUCTION_FIREBASE],
  ['development', DEVELOPMENT_FIREBASE, PRODUCTION_FIREBASE],
]) {
  test(`${mode} compiles exactly one Firebase project and a separate persisted auth session`, async () => {
    const result = await build({configFile:false, mode, logLevel:'silent',
      build:{write:false,minify:false,lib:{entry:fileURLToPath(new URL('../src/firebase-environment.js',import.meta.url)),formats:['es']}}});
    const code=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk'&&item.isEntry).code;
    assert.ok(!code.includes(excluded.projectId));
    assert.ok(!code.includes(excluded.apiKey));
    const actual=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
    assert.deepEqual(actual.FIREBASE_CONFIG,expected);
    assert.equal(actual.FIREBASE_APP_NAME,mode==='production'?'budae-account-production':'budae-account-development');
  });
}

test('native package mismatch and unknown build modes cannot enable authentication', () => {
  assert.equal(accountEnabled('production',true,'com.dongramco.budaekiugi'),true);
  assert.equal(accountEnabled('production',true,'com.dongramco.budaekiugi.dev'),false);
  assert.equal(accountEnabled('development',true,'com.dongramco.budaekiugi'),false);
  assert.equal(accountEnabled('production',true,''),false);
  assert.equal(accountEnabled('staging'),false);
});

test('Android native OAuth configurations belong to the same projects as their web builds', () => {
  for(const [variant, config, appPackage] of [
    ['debug',DEVELOPMENT_FIREBASE,'com.dongramco.budaekiugi.dev'],
    ['release',PRODUCTION_FIREBASE,'com.dongramco.budaekiugi'],
  ]) {
    const native=JSON.parse(readFileSync(new URL(`../android/app/src/${variant}/google-services.json`,import.meta.url),'utf8'));
    assert.equal(native.project_info.project_id,config.projectId);
    const client=native.client.find(item=>item.client_info.android_client_info.package_name===appPackage);
    assert.ok(client);
    assert.ok(client.client_info.mobilesdk_app_id.startsWith(`1:${native.project_info.project_number}:android:`));
    const webClient=client.oauth_client.find(item=>item.client_type===3);
    assert.ok(webClient.client_id.startsWith(native.project_info.project_number+'-'));
    assert.ok(webClient.client_id.endsWith('.apps.googleusercontent.com'));
    if(variant==='release') {
      assert.equal(client.oauth_client.filter(item=>item.client_type===1).length,4);
      assert.ok(client.oauth_client.some(item=>item.android_info?.certificate_hash==='1267a09235b399a5eb5adb9e90f13b0117134a78'));
    }
  }
});
