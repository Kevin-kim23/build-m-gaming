import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The "update the policy and Play Console whenever privacy-relevant things change" rule must not be deleted.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('AGENTS.md keeps the policy sync rule and the final-report line', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /## 정책·개인정보 동기화 \(절대 규칙\)/);
  for (const word of ['구글 독스', 'Play Console', 'privacy:doc', '정책 동기화 필요', '정책 영향 없음']) assert.ok(agents.includes(word), word);
});

test('the privacy management doc and the continue notes repeat the rule', () => {
  assert.match(read('docs/PRIVACY_MANAGEMENT.md'), /절대 규칙/);
  assert.match(read('CONTINUE.md'), /마지막까지 기억/);
});
