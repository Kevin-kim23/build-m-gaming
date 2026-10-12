// Development authentication disclosure; excluded from release bundles.
import {PRIVACY_CONTACT as contact} from './privacy-contact.js';
export const DEVELOPMENT_POLICY_SECTION = { title: '선택형 Google 로그인 · 개발 테스트', lines: [
    '개발용 빌드의 설정 → 구글 계정 연결에서 Google 로그인을 선택하면 Firebase Authentication에 개발용 게임 계정이 생성됩니다. 일반 배포본에는 이 로그인 테스트가 표시되지 않습니다. 로그인하지 않아도 기본 게임을 이용할 수 있습니다.',
    '처리 정보는 Google·Firebase 계정 식별자, 이메일, Google 표시 이름·프로필 사진 주소, 인증 토큰, 계정 생성·로그인 시각, IP 주소·사용자 에이전트 등 인증·보안 정보입니다. 목적은 계정 인증과 계정 관리·보안·오용 방지이며 광고 동의와 구분합니다. 게임은 Google 비밀번호를 받지 않고 계정 화면에는 이메일만 표시하며 프로필 사진을 별도로 불러오지 않습니다.',
    '처리 수탁자는 Google LLC(Firebase Authentication)이며 미국 데이터센터에서 처리됩니다. 로그인·인증 갱신 시 HTTPS로 전송합니다. Firestore의 서울 리전 선택이 인증 정보의 국내 처리·보관을 뜻하지 않습니다. 공식 안내: https://firebase.google.com/support/privacy',
    '인증 정보는 계정 유지 중 보관됩니다. 계정 삭제를 요청하면 운영 시스템에서 삭제를 시작하며, Firebase 공식 안내에 따르면 관련 인증 정보는 실제 시스템과 백업에서 180일 이내 삭제되고 인증용 IP 로그는 수 주간 보관됩니다. Google 계정 자체의 정보는 Google 개인정보처리방침이 적용됩니다.',
    '로그인 상태는 Firebase SDK가 이 기기에 저장·갱신합니다. 로그아웃하면 이 기기의 로그인 상태를 해제하며 서버 계정을 삭제하지는 않습니다. 설정 → 구글 계정 연결 → 개발용 로그인 계정 삭제에서 인증 계정을 삭제할 수 있습니다. 최근 로그인이 필요한 경우 다시 로그인해야 합니다. 앱 삭제만으로 서버 인증 계정이 삭제되지는 않습니다.',
    '개발 계정 삭제는 Google 계정 자체나 기기에 저장된 게임 기록을 삭제하지 않습니다. 현재 골드·병력·장비·결제 기록은 인증 서버에 전송하지 않으며, 닉네임·클라우드 저장·구매 복원·랭킹은 아직 제공하지 않습니다. Firebase Analytics·Crashlytics·광고 연동은 추가하지 않았습니다.',
    '개발 테스트에 참여하지 않으려면 로그인하지 않거나 로그아웃할 수 있습니다. 삭제·열람·처리정지 문의는 '+contact+'으로 가능합니다. 일반 이용자에게 로그인 기능을 배포하기 전에 외부 삭제 요청 페이지와 Play 데이터 보안 양식 및 필요한 국외 이전 안내·동의 절차를 별도 검토합니다.',
  ] };
