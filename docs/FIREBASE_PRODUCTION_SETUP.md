# 운영 Firebase 준비 · 2026-10-12

## 출시 범위 정정

사용자 확정: 다음 업데이트는 로그인·중복 불가 닉네임·계정별 저장/복구·탈퇴·랭킹을 함께 준비한다. 닉네임 변경/변경권은 미정. 기존 기록은 보존하고 검토·승인 후 랭킹에 참여한다. 개발 만렙 계정은 제외한다. 광고는 테스트 ID 유지. 이전 0.77.1 로그인 제외 AAB는 이 업데이트의 최종 배포물이 아니다.

## 실제 콘솔 설정 완료

- 운영 프로젝트 `budae-kiugi-prod`, 번호 `745998969505`. 개발 프로젝트와 별도. Spark 유지, 결제 연결/Blaze 전환 안 함.
- Android 앱 `com.dongramco.budaekiugi`, Firebase 앱 ID `1:745998969505:android:01f3707464738582a71ee0`.
- 웹 앱 `1:745998969505:web:77cf8f37be357b0aa71ee0`, 인증 도메인 `budae-kiugi-prod.firebaseapp.com`.
- Google 로그인 제공업체 사용 설정, 공개 이름 `부대 키우기`.
- Firestore Standard `(default)`, 서울 `asia-northeast3`. 생성 규칙 `allow read, write: if false`. 빈 DB이며 사용자 게임 기록 이관 안 함.
- Analytics/Gemini 추가 기능 사용 안 함. Auth 처리 위치는 Firestore 지역과 별개다.

## 이 PC 개발 서명

Gradle `:app:validateSigningDebug :app:signingReport`로 이 PC의 표준 debug.keystore 생성·확인. 다음 공개 지문을 **개발** 프로젝트의 `.dev` 앱에 추가했다. 기존 다른 PC 지문은 삭제하지 않았다.

```text
SHA-1   8D:D0:E4:49:38:D9:6A:C5:6B:70:B5:FB:39:BD:65:5E:58:17:4D:FE
SHA-256 4A:B7:40:02:07:04:4F:61:CA:B7:45:06:EA:8F:CA:95:50:DE:93:59:F5:42:AB:2B:BB:23:50:53:4D:9C:58:66
```

개발 PC 지문, 업로드 키 지문, Play 앱 서명 지문은 서로 다르다. 운영 앱에 개발 지문을 대신 넣지 않는다. 후속 확인에서 다운로드된 Play 공개 인증서 ZIP을 발견했다. 현재 배포·hybrid classical·hybrid PQC 인증서와 업로드 인증서 각각의 SHA-1/SHA-256 총 8개를 운영 Android 앱에 등록하고 화면에서 확인했다. 운영 google-services.json 다운로드 완료. 0.79.0에서 운영 코드/Android 리소스 연결을 추가했다. 실제 로그인·Functions 운영 배포는 아직 확인하지 않았다.

## 남은 연결 및 검증

- 0.79.0 일반 출시 빌드는 운영 Firebase를, development/firebase-dev와 .dev 앱은 개발 Firebase를 사용한다. 프로젝트·패키지·환경 불일치를 차단한다. 코드 연결은 실제 로그인/서버 배포/출시 완료를 의미하지 않는다.
- 서버 닉네임/저장/삭제와 클라이언트 연결은 코드·로컬 검증 완료이며 Functions는 미배포. 랭킹 및 운영 보호 조치도 남아 있다.
- Functions 운영 배포에는 Blaze가 필요하다. 비용 조건/결제 연결을 확정한 뒤 진행한다. 서비스 계정 키를 생성하거나 Git에 저장하지 않는다.
- 사용자가 이번 실제 폰 검증은 생략하도록 명시했다. 폰 로그인은 미확인으로 남기고 다시 연결을 요청하지 않는다.
- 0.78.0 전체 테스트 751개, 일반/개발 웹 빌드, 합성 데이터 브라우저 및 에뮬레이터 검사 통과. 이전 0.77.1에서 이 PC 키로 서명한 개발 Android assembleDebug 통과; 0.78.0 Android 빌드는 미검증. SDK 경로 환경 변수 지정 후 빌드 성공. 기존 라이선스 청크/Gradle 경고 유지. 이는 운영 연결/실기기/배포 검증이 아니다.
- 정책 동기화 필요: 최종 처리 항목·삭제 동작 확정 후 앱 방침/스토어 문서/공개 Google Docs/Play 데이터 보안을 함께 맞춘다.

공식 근거: https://firebase.google.com/docs/projects/dev-workflows/general-best-practices 및 https://firebase.google.com/docs/functions/get-started
