// docs/store/PRIVACY_POLICY.md를 앱 안 방침과 같은 원본(src/privacy-policy.js)으로 다시 만든다.
import { writeFileSync, mkdirSync } from 'node:fs';
import { privacyPolicyMarkdown, privacyPolicyMarkup } from '../src/privacy-policy.js';
writeFileSync(new URL('../docs/store/PRIVACY_POLICY.md', import.meta.url), privacyPolicyMarkdown());
console.log('docs/store/PRIVACY_POLICY.md 갱신');
mkdirSync(new URL('../docs/privacy/', import.meta.url), {recursive:true});
writeFileSync(new URL('../docs/privacy/index.html', import.meta.url), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>부대 키우기 개인정보처리방침 · 동람코</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:16px/1.8 system-ui,sans-serif;color:#202620}h1{font-size:28px}h3{margin-top:32px}p{word-break:keep-all}</style><main><h1>부대 키우기 개인정보처리방침</h1>${privacyPolicyMarkup().body}</main></html>`);
