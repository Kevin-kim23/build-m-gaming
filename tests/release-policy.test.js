import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'vite';
import {serviceTermsMarkdown} from '../src/service-terms.js';

for (const mode of ['production', 'firebase-dev', 'development']) {
  test(`${mode} bundles only the matching privacy and terms disclosures`, async () => {
    const result = await build({configFile:false, mode, logLevel:'silent',
      plugins:[{name:'policy-test-entry', resolveId(id){if(id==='policy-test'||id.endsWith('/policy-test')||id.endsWith('\\policy-test'))return '\0policy-test';},
        load(id){if(id==='\0policy-test')return `export {privacyPolicyMarkdown} from ${JSON.stringify(new URL('../src/privacy-policy.js',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'))}; export {serviceTermsMarkdown} from ${JSON.stringify(new URL('../src/service-terms.js',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'))};`;}}],
      build:{write:false,minify:false,lib:{entry:'policy-test',formats:['es']}}});
    const code=(Array.isArray(result)?result[0]:result).output.find(item=>item.type==='chunk'&&item.isEntry).code;
    const policy=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
    const privacy=policy.privacyPolicyMarkdown(), terms=policy.serviceTermsMarkdown();
    for(const text of [privacy,terms])assert.match(text,/샘플/);
    assert.match(privacy,/AdMob/); assert.match(privacy,/외부 통신/);
    if(mode==='production') {
      assert.match(privacy,/Firebase Authentication|선택형 Google 로그인/);
      assert.doesNotMatch(privacy,/개발용 게임 계정|일반 배포본에는 이 로그인 테스트/);
      assert.doesNotMatch(terms,/개발용 빌드|개발 모드/);
      assert.match(privacy,/로그인 없이 기본 게임/);
      assert.match(privacy,/서버 저장을 직접 선택한 경우에만/);
      assert.match(terms,/충돌하는 기록의 골드·병력은 합산하지/);
    } else {
      assert.match(privacy,/Firebase Authentication/);assert.match(privacy,/미국/);
      assert.match(privacy,/서버 계정·기록 삭제/);assert.match(privacy,/180일/);
      assert.match(privacy,/최초 연결 검토 기록/);assert.match(privacy,/직접 선택해야/);
      assert.match(terms,/로그인만으로 기기 기록을 자동 업로드하거나 바꾸지/);
      assert.match(terms,/충돌하는 기록의 골드·병력은 합산하지/);
    }
  });
}
test('published terms are generated from the release source',()=>{
  assert.equal(readFileSync(new URL('../docs/store/SERVICE_TERMS.md',import.meta.url),'utf8').replace(/\r\n/g,'\n'),serviceTermsMarkdown());
});
