// 개인정보처리방침의 유일한 원본입니다. 앱 안 화면과 docs/store/PRIVACY_POLICY.md가 모두 여기서 만들어집니다.
// 고치는 법: 이 파일을 고치고 `npm run privacy:doc`을 실행한 뒤 날짜·버전을 올립니다. (docs/PRIVACY_MANAGEMENT.md 참고)
export const POLICY_DATE = '2026-10-09';
export const POLICY_REVISION = 3;
// 방침에 공개되는 문의 이메일. 실제로 읽는 주소여야 합니다. null이면 스토어의 개발자 연락처를 안내합니다.
export const PRIVACY_CONTACT = 'dong760630@naver.com';
export const FICTION_NOTICE = '이 게임의 대륙·나라·지명·부대·장비·인물은 모두 허구이며, 실제 국가·군대·단체·인물·사건과 관련이 없습니다.';

const contact = PRIVACY_CONTACT ?? 'Google Play 스토어 앱 페이지에 표시된 개발자 연락처';
export const POLICY_SECTIONS = Object.freeze([
  { title: '운영자', lines: ['서비스: 부대 키우기 (Android 앱)', '운영자: 동람코 (Dongramco)', `문의: ${contact}`] },
  { title: '광고와 개인정보 처리', lines: [
    '운영자는 회원가입이나 별도의 게임 서버를 운영하지 않습니다. 이름·이메일·전화번호·연락처·사진·마이크 및 정밀 위치를 게임에서 요청하지 않습니다.',
    'Android 앱에는 Google AdMob 보상형 광고와 Google 사용자 메시지 플랫폼(UMP)이 포함되어 있습니다. 현재 버전은 Google 테스트 광고로 연동을 검증하며 실제 유료결제는 제공하지 않습니다.',
    '물약 광고 버튼을 누르면 동의 필요 여부를 확인하고, 허용되는 경우 광고를 요청합니다. 광고 요청을 하지 않아도 기본 게임을 이용할 수 있습니다. 광고 조건을 완료하면 선택한 물약 1개를 받습니다.',
    'Google 광고 SDK는 광고 제공·분석·부정행위 방지를 위해 IP 주소(대략적 위치 추정 가능), 광고·앱 상호작용, 진단 정보, 광고 ID·앱 세트 ID 등 기기 및 기타 식별자를 수집·공유할 수 있습니다. 테스트 광고도 외부 통신을 합니다.',
    'UMP는 지역과 동의 필요 여부 확인 및 선택 기록 처리를 위해 Google과 통신합니다. 동의가 필요한 지역에서는 Google 동의 안내를 표시하며, 광고 요청이 허용되지 않거나 확인에 실패하면 광고를 요청하지 않습니다.',
    'Google 개인정보처리방침: https://policies.google.com/privacy · 광고 SDK 공개 안내: https://developers.google.com/admob/android/privacy/play-data-disclosure',
  ] },
  { title: '기기 안에 저장되는 정보', lines: [
    '게임 진행 기록(골드·병력·장비·점령 지역·물약·자동터치 보유 상태·설정·마지막 접속 시각)은 기기에 저장되며 운영자의 서버로 전송하지 않습니다.',
    '앱 자체 오류 기록은 기기 안에 저장되고, 이용자가 문의용 정보를 복사하여 직접 보낼 때만 운영자에게 전달됩니다. 광고 SDK가 처리하는 진단 정보는 위 항목과 별개입니다.',
    '게임 진행 데이터는 앱 삭제 또는 앱 데이터 지우기로 삭제할 수 있습니다. 동의 선택 기록은 Google UMP가 기기에 저장할 수 있습니다.',
  ] },
  { title: 'Android 자동 백업', lines: ['기기의 앱 데이터 백업이 켜져 있으면 운영체제가 게임 저장을 백업할 수 있습니다. 이는 운영체제의 기능이며 운영자는 접근할 수 없습니다. 기기 설정에서 끌 수 있습니다.'] },
  { title: '외부 처리 · 보유 기간', lines: [
    '광고 관련 정보는 Google의 서버에서 처리되며 해외 서버에서 처리될 수 있습니다. 광고 SDK의 전송 데이터는 TLS로 암호화됩니다.',
    'Google이 처리하는 정보의 보관·삭제는 Google 개인정보처리방침에 따릅니다. Google의 보관 기간을 운영자가 임의로 정하거나 삭제를 보장할 수 없습니다.',
    '운영자는 게임 진행 기록을 서버에 보관하지 않습니다. 문의를 직접 보내면 문의 해결에 필요한 범위에서 그 내용을 처리하고 목적이 끝나면 삭제합니다. 법령에 따라 보관이 필요한 경우는 예외입니다.',
  ] },
  { title: '이용자의 선택과 권리', lines: [
    '광고 시청은 선택 사항이며 광고 버튼을 누르지 않고 게임을 진행할 수 있습니다. 설정의 광고 개인정보 설정에서 지원되는 지역의 동의 선택을 다시 변경할 수 있습니다.',
    'Android 설정에서 광고 ID를 삭제하거나 재설정할 수 있습니다. Google이 처리한 정보에 관한 권리는 Google 개인정보처리방침의 도구와 문의 경로를 이용할 수 있습니다.',
    `운영자에게 직접 보낸 문의 내용의 열람·정정·삭제 요청: ${contact}`,
  ] },
  { title: '대상 이용자', lines: ['앱의 대상 연령과 콘텐츠 등급은 Google Play 안내를 확인해 주세요. 광고 소재 등급은 T 이하로 제한합니다. 이 제한만으로 아동 대상 서비스에 필요한 별도 동의·광고 요건을 충족하는 것은 아닙니다.'] },
  { title: '방침이 바뀔 때', lines: ['광고 설정·실제 결제·클라우드 저장·통계 기능이 달라지면 처리 내용을 확인하여 이 방침과 공개 주소, Play 데이터 보안 양식을 함께 갱신합니다.'] },
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
