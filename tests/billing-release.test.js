import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POLICY_REVISION,privacyPolicyMarkdown} from '../src/privacy-policy.js';
import {TERMS_REVISION,ACCESS_POLICY_REVISION} from '../src/access-rules.js';
import {serviceTermsMarkdown} from '../src/service-terms.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('approved billing policy and reconsent revisions agree without server promises',()=>{
  assert.equal(POLICY_REVISION,12);assert.equal(ACCESS_POLICY_REVISION,12);assert.equal(TERMS_REVISION,9);
  assert.match(privacyPolicyMarkdown(),/Google Play Billing/);assert.match(privacyPolicyMarkdown(),/구매 토큰/);
  assert.match(serviceTermsMarkdown(),/다시 지급될 수 있습니다/);
  assert.doesNotMatch(serviceTermsMarkdown(),/실제 결제 기능이 없습니다/);
  assert.equal(read('docs/store/SERVICE_TERMS.md').replace(/\r\n/g,'\n'),serviceTermsMarkdown());
});
test('release billing requires explicit flag and local settings; license inventory includes it',()=>{
  const gradle=read('android/app/build.gradle');
  assert.match(gradle,/playBillingRelease.*== 'true'/);assert.match(gradle,/Missing local billing setting/);
  assert.match(gradle,/Billing product IDs must be distinct/);
  assert.match(gradle,/releaseImplementation 'com.android.billingclient:billing:8.3.0'/);
  const inventory=JSON.parse(read('docs/licenses/runtime-inventory.json'));
  assert.ok(inventory.some(e=>e.coordinate==='com.android.billingclient:billing:8.3.0'));
  const inject=inventory.find(e=>e.coordinate==='javax.inject:javax.inject:1');assert.ok(inject.licenses.some(([name])=>name.includes('Apache')));
  assert.match(read('.gitignore'),/android\/play-billing.properties/);
});
