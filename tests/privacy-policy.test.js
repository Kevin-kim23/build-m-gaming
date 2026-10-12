import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { privacyPolicyMarkup, privacyPolicyMarkdown, POLICY_SECTIONS, FICTION_NOTICE, POLICY_DATE } from '../src/privacy-policy.js';
import { infoPanelMarkup } from '../src/info-panel.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const base = { version: '0.55.0', platform: 'android', status: 's', saveVersion: 23, report: 'R', entries: [] };

test('the info screen shows the fiction notice and a button to open the privacy policy', () => {
  const { body } = infoPanelMarkup(base);
  assert.ok(body.includes(FICTION_NOTICE));
  assert.match(body, /data-detail-action="open-privacy"/);
});

test('the in-app policy lists every section and the date, with text escaped', () => {
  const { title, body } = privacyPolicyMarkup();
  assert.equal(title, '개인정보처리방침');
  for (const s of POLICY_SECTIONS) assert.ok(body.includes(s.title), s.title);
  assert.ok(body.includes(POLICY_DATE));
  assert.doesNotMatch(body, /<script/i);
});

test('docs/store/PRIVACY_POLICY.md is generated from the same source (run npm run privacy:doc if this fails)', () => {
  // Git may check out CRLF on Windows; compare content without hiding other changes.
  assert.equal(read('docs/store/PRIVACY_POLICY.md').replace(/\r\n/g, '\n'), privacyPolicyMarkdown());
});

test('the public HTML contains the complete in-app policy without a stale duplicate body', () => {
  const html = read('docs/privacy/index.html');
  const main = html.match(/<main><h1>부대 키우기 개인정보처리방침<\/h1>([\s\S]*?)<\/main>/);
  assert.ok(main, 'public policy main content is missing');
  assert.equal(main[1], privacyPolicyMarkup().body);
});

// Keep the SDK allowlist and the disclosure together. New SDKs require another review.
test('the app still matches what the privacy policy promises', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ['@capacitor-firebase/authentication', '@capacitor/android', '@capacitor/app', '@capacitor/core', 'firebase']);
  const gradle=read('android/app/build.gradle');
  const googleSdks=[...gradle.matchAll(/\b(?:implementation|debugImplementation|releaseImplementation|unsignedImplementation)\s+["'](com\.google\.[^"']+)["']/g)].map(m=>m[1]);
  assert.deepEqual(googleSdks,[
    'com.google.firebase:firebase-appcheck:20.0.0',
    'com.google.firebase:firebase-appcheck-debug:20.0.0',
    'com.google.firebase:firebase-appcheck-playintegrity:20.0.0',
    'com.google.firebase:firebase-appcheck-playintegrity:20.0.0',
    'com.google.android.gms:play-services-ads:25.5.0',
    'com.google.android.ump:user-messaging-platform:4.0.0',
  ]);
  const policy=privacyPolicyMarkdown();
  assert.match(policy,/AdMob/);assert.match(policy,/IP 주소/);assert.match(policy,/식별자/);assert.match(policy,/외부 통신/);
  assert.doesNotMatch(policy,/외부로 데이터를 보내지 않습니다|수집 자체가 없습니다/);
  assert.match(policy,/Firebase Authentication/);
  assert.match(policy,/로그인 없이 기본 게임/);
  assert.match(policy,/서버 저장을 직접 선택한 경우에만/);
  assert.match(policy,/서버 계정·기록 삭제/);
  assert.match(policy,/Firestore·Cloud Functions/);
  assert.match(policy,/Firebase App Check/);assert.match(policy,/Google Play Integrity/);
  assert.match(policy,/증명 자료/);assert.match(policy,/확인 토큰/);
  assert.match(policy,/신고자와 대상의 계정 식별자/);
  assert.match(policy,/닉네임, 선택한 사유, 접수 시각과 처리 상태/);
  assert.match(policy,/완료 후 90일/);assert.match(policy,/미완료 기록은 재처리에 필요한 동안/);
  assert.match(policy,/최근 60초 동안 조회 30회/);assert.match(policy,/변경 요청 10회/);
  assert.match(policy,/기존 복구 기록을 자동으로 덮어쓰거나 개수만으로 지우지/);
  assert.match(policy,/서버 계정 삭제만으로는 지워지지/);
  assert.doesNotMatch(policy,/개발용 게임 계정|일반 배포본에는 이 로그인 테스트/);
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const permissions = [...manifest.matchAll(/uses-permission android:name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(permissions, ['android.permission.INTERNET']);
  const network = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.geolocation/;
  for (const file of readdirSync(new URL('../src', import.meta.url)).filter((f) => f.endsWith('.js'))) {
    assert.doesNotMatch(read(`src/${file}`), network, `${file} sends or reads network/location data`);
  }
});

test('the policy shows a real contact email and it appears in the generated document', async () => {
  const { PRIVACY_CONTACT } = await import('../src/privacy-policy.js');
  assert.match(PRIVACY_CONTACT, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  assert.ok(privacyPolicyMarkup().body.includes(PRIVACY_CONTACT));
  assert.ok(read('docs/store/PRIVACY_POLICY.md').includes(PRIVACY_CONTACT));
});
