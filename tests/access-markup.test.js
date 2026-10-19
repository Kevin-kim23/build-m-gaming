import test from 'node:test';
import assert from 'node:assert/strict';
import {startConsentMarkup,adConsentMarkup} from '../src/access-markup.js';

test('age and required consent use separate forms and footer actions',()=>{
  const html=startConsentMarkup();
  for(const id of ['access-age-form','access-start-form']) {
    assert.ok(html.includes('id="'+id+'"'));
    assert.ok(html.includes('form="'+id+'"'));
  }
  const consentForm=html.match(/<form id="access-start-form"[\s\S]*?<\/form>/)[0];
  assert.doesNotMatch(consentForm,/name="age"/);
  assert.match(consentForm,/hidden/);
  assert.match(html,/data-access-back/);
  assert.match(html,/name="age"[^>]*required/);
  assert.match(html,/name="terms"/);assert.match(html,/name="privacy"/);
  assert.doesNotMatch(html,/\bchecked\b|실제 유료결제가 없/);
  assert.match(html,/Google Play/);
});

test('optional ad consent starts unchecked and disabled, keeping refusal and full disclosure reachable',()=>{
  const html=adConsentMarkup();
  assert.match(html,/data-ad-enable disabled/);
  assert.doesNotMatch(html,/\bchecked\b/);
  for(const action of ['data-ad-disable','data-ad-choice-cancel','data-access-ad-details','data-access-policy'])assert.ok(html.includes(action));
  assert.match(html,/광고 없이도 기본 게임/);
  assert.match(html,/해외로 전송/);
  assert.match(html,/이미 전송된 정보가 삭제되는 것은 아니/);
});
