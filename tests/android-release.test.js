import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
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

test('debug identity is isolated and unsigned bundles do not weaken release signing',()=>{
  const gradle=read('android/app/build.gradle'),script=read('tools/android-build.ps1');
  assert.match(gradle,/debug\s*\{[^}]*applicationIdSuffix "\.dev"/);
  const debugLabels=read('android/app/src/debug/res/values/strings.xml');
  assert.match(debugLabels,/name="app_name">부대 키우기 테스트</);
  assert.match(debugLabels,/name="title_activity_main">부대 키우기 테스트</);
  assert.match(gradle,/unsigned\s*\{[^}]*signingConfig = null/);
  assert.match(script,/'Unsigned' \{ @\('bundleUnsigned', 'lintUnsigned'\) \}/);
  assert.match(script,/UNSIGNED AAB \(cannot upload to Play\)/);
  assert.match(script,/if \(\$Mode -eq 'Release' -and -not \(Test-Path/);
  assert.match(read('android/app/release-signing.gradle'),/name\.toLowerCase\(\)\.contains\('release'\)/);
});

test('startup media opt-in is applied only after the Android bridge exists',()=>{
  const java=read('android/app/src/main/java/com/dongramco/budaekiugi/MainActivity.java');
  assert.ok(java.indexOf('super.onCreate(savedInstanceState)')<java.indexOf('setMediaPlaybackRequiresUserGesture(false)'));
  assert.match(java,/getBridge\(\) != null && getBridge\(\)\.getWebView\(\) != null/);
  assert.match(java,/setMediaPlaybackRequiresUserGesture\(false\)/);
});

test('PowerShell passes whole Gradle task names even for one-task debug builds', {skip:process.platform!=='win32'},()=>{
  const script=read('tools/android-build.ps1');
  const selection=script.match(/(\$targets = [\s\S]+?)\r?\n\s*& \.\\gradlew\.bat @targets/)[1];
  // Run only the real target selection and inspect splatted arguments: no SDK/build side effects.
  const command=`function Capture-Targets { @($args) }; $results = @('Debug','Unsigned','Release') | ForEach-Object { $Mode = $_; ${selection}; [pscustomobject]@{ mode=$Mode; isArray=($targets -is [array]); arguments=@(Capture-Targets @targets) } }; $results | ConvertTo-Json -Compress`;
  const results=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8'}));
  assert.deepEqual(results,[
    {mode:'Debug',isArray:true,arguments:['assembleDebug']},
    {mode:'Unsigned',isArray:true,arguments:['bundleUnsigned','lintUnsigned']},
    {mode:'Release',isArray:true,arguments:['bundleRelease','assembleRelease','lintRelease']},
  ]);
});

test('Windows build hash output works without optional PowerShell hash cmdlets', {skip:process.platform!=='win32'},()=>{
  const script=read('tools/android-build.ps1');
  const helper=script.match(/function Get-AndroidArtifactHash[\s\S]*?\r?\n\}/)?.[0]??'';
  const hashOutput=script.match(/Write-Output \('SHA-256: ' \+ .*\$unsignedBundle.*\)/)[0];
  const sample=fileURLToPath(new URL('../package.json',import.meta.url));
  const command=`${helper}; function Get-FileHash { throw 'Optional hash cmdlet unavailable in test' }; $ErrorActionPreference='Stop'; $unsignedBundle='${sample.replaceAll("'","''")}'; ${hashOutput}`;
  const result=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8'}).trim();
  assert.equal(result,'SHA-256: '+createHash('sha256').update(readFileSync(sample)).digest('hex').toUpperCase());
});
