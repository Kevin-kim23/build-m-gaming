// docs/store/PRIVACY_POLICY.md를 앱 안 방침과 같은 원본(src/privacy-policy.js)으로 다시 만든다.
import { writeFileSync } from 'node:fs';
import { privacyPolicyMarkdown } from '../src/privacy-policy.js';
writeFileSync(new URL('../docs/store/PRIVACY_POLICY.md', import.meta.url), privacyPolicyMarkdown());
console.log('docs/store/PRIVACY_POLICY.md 갱신');
