import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const cwd=new URL('../',import.meta.url);
test('actual SDK manifest exposes only six player callables and keeps moderation/schedules private',()=>{
  const script='const m=await import("./server/index.js"); console.log(JSON.stringify(Object.fromEntries(Object.entries(m).map(([k,v])=>[k,v.__endpoint]))));';
  const output=execFileSync(process.execPath,['--input-type=module','-e',script],{cwd,encoding:'utf8',
    env:{...process.env,GCLOUD_PROJECT:'demo-budae-kiugi',FUNCTIONS_EMULATOR:'true',
      FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'}});
  const endpoints=JSON.parse(output.trim());
  assert.deepEqual(Object.keys(endpoints).filter(name=>endpoints[name].callableTrigger).sort(),
    ['createProfile','deleteGameAccount','readCloudSave','readProfile','reportNickname','saveCloudProgress'].sort());
  assert.deepEqual(endpoints.moderateNicknames.httpsTrigger.invoker,['private']);
  assert.equal(endpoints.moderateNicknames.callableTrigger,undefined);
  for(const name of ['retryAccountDeletions','purgeExpiredServerRecords']){
    assert.ok(endpoints[name].scheduleTrigger);
    assert.equal(endpoints[name].ingressSettings,'ALLOW_INTERNAL_ONLY');
    assert.equal(endpoints[name].callableTrigger,undefined);
  }
});
