# 0.77.1 비공개 테스트 AAB 점검 · 2026-10-12

브랜치 feat/firebase-server-test. main 병합·Play 업로드·공개 방침 수정은 하지 않았다.

- 검증 완료: 전체737개 테스트, 일반/개발 웹 빌드, 음원 검사, 기존 업로드 키 서명 AAB/APK 및 bundletool 구조 검사 통과. 앱 lint 오류0·경고15(의존 라이브러리 baseline 제외 항목은 별도). 기존 라이선스 청크/Gradle 경고와 jarsigner ZIP 스트림 경고가 있으나 strict 검증 종료0·jar verified.
- 최종 AAB 0.77.1/code77001: 패키지 com.dongramco.budaekiugi, 테스트 광고 ID 2개 유지, 웹 자산19개 원본 일치, DEX2개에 Firebase Auth 실행 클래스 없음, 개발 인증 리소스·표식·로그인 설명 없음. 라이선스 고지의 Firebase 이름은 실행 SDK 포함을 뜻하지 않음.
- 공개 Google Docs를2026-10-12에 비인증 HTTP로 조회: 시행일2026-10-09·개정6. 앱 방침9·약관6과 불일치. 공개 게시·Play Console 동기화·최대 업로드 versionCode 대조·실폰 확인·Play 업로드 미실시.

## 정책 변경

출시용은 회원가입·로그인 없이 로컬 저장하는 실제 동작을 안내한다. 개발용은 Firebase 인증의 처리 정보·미국 처리·삭제/보관 안내를 유지한다. 같은 소스의 Vite 모드 분기를3개 모드 빌드 테스트로 검증했다. privacy:doc은 출시용 방침Markdown/HTML과 약관을 생성한다. 개정 방침9·약관6이며 기존 게임 저장38과 광고 동의 내용은 유지된다. 스토어 초안을3대륙·10국가·200지역·전체 점령 수입+320%로 맞췄다.

## 최종 파일

- 경로: android/app/build/outputs/bundle/release/app-release.aab
- 버전0.77.1 / code77001 / 33899118바이트
- SHA-256: 8E423EC1806F2332C90B4E842EEFA1848C727782084F1835B4511B066EB9BBB4
- SDK36 대상, minSdk24. 기존 업로드 키 strict 서명 검증 통과.
- 앱 lint 경고15개와 의존 라이브러리 기존 baseline이 남아 있다. 실기기 동작이나 Play 심사 통과를 보장하는 결과가 아니다.
- Manifest 권한: android.permission.INTERNET, android.permission.ACCESS_NETWORK_STATE, com.google.android.gms.permission.AD_ID, android.permission.ACCESS_ADSERVICES_AD_ID, android.permission.ACCESS_ADSERVICES_ATTRIBUTION, android.permission.ACCESS_ADSERVICES_TOPICS, android.permission.WAKE_LOCK, android.permission.FOREGROUND_SERVICE, com.dongramco.budaekiugi.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION. 광고 SDK가 병합한 권한을 포함하며 이번 변경은 새 권한을 추가하지 않는다.

## 사용자 확인/외부 반영이 남은 항목

1. 공개 Google Docs를 outputs의 개인정보처리방침 본문(개정9)과 일치시키고 비로그인 조회로 확인. 현재 조회는 개정6.
2. Play Console에서 실제 제공 트랙의 데이터 보안·스토어 문구·방침 링크를 대조. 광고 SDK 처리 신고는 유지하고 출시본에 없는 계정/서버 저장/랭킹을 제공한다고 표시하지 않기.
3. Play에 이미 올라간 최대 versionCode가77001보다 작은지 확인. 현재 Console은 확인하지 않았다.
4. Play 테스트 설치본에서 기존 기록, 광고 완료/취소/복귀, 기본 게임을 확인. 현재 adb 기기0개.
5. 업로드·검토 제출·트랙 배포는 별도 단계. 이 파일은 아직 업로드하지 않았다.

## 공식 근거 확인

- [Google 테스트 광고](https://developers.google.com/admob/android/test-ads): 사용 중인 보상형 샘플 ID 일치. 사용자 요청에 따라 이번 비공개 테스트는 샘플을 유지. 일반 출시/수익화 전 운영 ID 전환은 별도.
- [Google 광고 SDK 처리 공개](https://developers.google.com/admob/android/privacy/play-data-disclosure): IP·상호작용·진단·식별자 처리 안내를 유지.
- [Play 데이터 보안](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ko): 실제 앱/SDK 처리와 제출 정보를 대조해야 한다. 이 작업은 법적 검토 전체나 Console 제출을 대신하지 않는다.

정책 동기화 필요.
