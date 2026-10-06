import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Android identity agrees across Capacitor, manifest resources and activity namespace',()=>{
  const id=JSON.parse(read('capacitor.config.json')).appId;
  assert.equal(id,'com.dongramco.budaekiugi');
  const gradle=read('android/app/build.gradle');
  assert.ok(gradle.includes('namespace = "'+id+'"'));
  assert.ok(gradle.includes('applicationId "'+id+'"'));
  assert.ok(read('android/app/src/main/res/values/strings.xml').includes('name="package_name">'+id+'<'));
  assert.ok(read('android/app/src/main/java/'+id.replaceAll('.','/')+'/MainActivity.java').includes('package '+id+';'));
  assert.equal(existsSync(new URL('../android/app/src/main/java/com/budaekiugi/prototype/MainActivity.java',import.meta.url)),false);
  assert.ok(read('android/app/src/main/AndroidManifest.xml').includes('${applicationId}.fileprovider'));
});

test('release build keeps upload secrets external and fails closed without them',()=>{
  const signing=read('android/app/release-signing.gradle');
  assert.match(signing,/BUDAE_SIGNING_FILE/);
  assert.match(signing,/throw new GradleException\('Release signing is not configured/);
  assert.match(signing,/android.buildTypes.release.signingConfig = android.signingConfigs.upload/);
  assert.doesNotMatch(signing,/signingConfigs.debug/);
  for(const entry of ['*.p12','*.pfx','*.jks','*signing*.json'])assert.ok(read('.gitignore').includes(entry));
  assert.match(read('tools/android-build.ps1'),/Refusing to replace any existing key/);
});
