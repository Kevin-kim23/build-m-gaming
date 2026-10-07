// 개인정보처리방침의 유일한 원본입니다. 앱 안 화면과 docs/store/PRIVACY_POLICY.md가 모두 여기서 만들어집니다.
// 고치는 법: 이 파일을 고치고 `npm run privacy:doc`을 실행한 뒤 날짜·버전을 올립니다. (docs/PRIVACY_MANAGEMENT.md 참고)
export const POLICY_DATE = '2026-10-07';
export const POLICY_REVISION = 1;
// 문의 이메일이 정해지면 문자열로 바꾸세요. 비어 있으면 스토어의 개발자 연락처를 안내합니다.
export const PRIVACY_CONTACT = null;
export const FICTION_NOTICE = '이 게임의 대륙·나라·지명·부대·장비·인물은 모두 허구이며, 실제 국가·군대·단체·인물·사건과 관련이 없습니다.';

const contact = PRIVACY_CONTACT ?? 'Google Play 스토어 앱 페이지에 표시된 개발자 연락처';
export const POLICY_SECTIONS = Object.freeze([
  { title: '운영자', lines: ['서비스: 부대 키우기 (Android 앱)', '운영자: 동람코 (Dongramco)', `문의: ${contact}`] },
  { title: '수집하는 개인정보', lines: [
    '운영자는 이용자의 개인정보를 수집하지 않습니다.',
    '회원가입·로그인이 없고, 이름·이메일·전화번호·위치·연락처·사진·마이크 정보를 받지 않습니다.',
    '운영자의 서버가 없고, 게임을 하는 동안 외부로 데이터를 보내지 않습니다.',
    '광고·통계·결제 기능이 아직 없습니다. 이 기능이 생기면 이 방침을 먼저 고치고 알립니다.',
  ] },
  { title: '기기 안에만 저장되는 정보', lines: [
    '이어서 하기 위해 게임 진행 기록(골드·병력·장비·점령 지역·설정·마지막 접속 시각)을 이용자 기기 안에 저장합니다. 운영자는 볼 수 없습니다.',
    '앱 오류 기록(오류 문구·시각)도 기기 안에 저장됩니다. 게임 저장 내용은 들어 있지 않고, 이용자가 "문의용 정보 복사"를 눌러 직접 보낼 때만 운영자에게 전달됩니다.',
    '앱을 삭제하거나 앱 데이터를 지우면 모두 삭제됩니다. 오류 기록은 게임 정보 화면에서 따로 지울 수 있습니다.',
  ] },
  { title: 'Android 자동 백업', lines: ['기기의 "앱 데이터 백업"이 켜져 있으면 운영체제가 게임 저장을 백업할 수 있습니다. 이는 운영체제의 기능이며 운영자는 접근할 수 없습니다. 기기 설정에서 끌 수 있습니다.'] },
  { title: '제3자 제공 · 보유 기간', lines: ['제3자에게 제공하거나 처리를 맡기는 개인정보가 없습니다.', '운영자가 보관하는 개인정보가 없으므로 별도 보유 기간이 없습니다.'] },
  { title: '이용자의 권리', lines: ['운영자에게 저장된 개인정보가 없어 열람·삭제 요청 대상이 없습니다. 기기 안 데이터는 앱 삭제 또는 앱 데이터 지우기로 직접 지울 수 있습니다.'] },
  { title: '어린이', lines: ['이 앱은 의도적으로 아동의 개인정보를 수집하지 않습니다. (수집 자체가 없습니다.)'] },
  { title: '방침이 바뀔 때', lines: ['광고·결제·클라우드 저장·통계 기능을 넣으면 먼저 이 방침을 고치고, 앱 업데이트 설명과 Play 데이터 보안 양식에도 반영합니다.'] },
]);

// 앱 화면용: 제목과 문단만 있는 HTML. 글은 모두 위 상수에서 오므로 이스케이프를 한 번 거칩니다.
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function privacyPolicyMarkup() {
  return {
    kicker: 'PRIVACY', title: '개인정보처리방침',
    body: `<p class="info-status">시행일 ${POLICY_DATE} · 개정 ${POLICY_REVISION}</p>${POLICY_SECTIONS.map((s) => `<h3 class="info-title">${esc(s.title)}</h3>${s.lines.map((l) => `<p>${esc(l)}</p>`).join('')}`).join('')}`,
  };
}
// 문서용: docs/store/PRIVACY_POLICY.md 내용
export function privacyPolicyMarkdown() {
  return `<!-- 자동 생성 파일입니다. src/privacy-policy.js를 고치고 npm run privacy:doc 을 실행하세요. -->
# 부대 키우기 개인정보처리방침

시행일: ${POLICY_DATE} · 개정 ${POLICY_REVISION}

> ${FICTION_NOTICE}

${POLICY_SECTIONS.map((s, i) => `## ${i + 1}. ${s.title}\n${s.lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n')}
`;
}
