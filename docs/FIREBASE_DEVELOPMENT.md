# Firebase 개발 연결 · 0.77.0

다음 작업의 전체 목록: [다른 PC 인수인계](SERVER_RELEASE_HANDOFF_2026-10-12.md), [정책 수정 목록](store/ACCOUNT_POLICY_TODO.md). 이 파일은 연결 설정·명령·코드 구조를 설명합니다.

2026-10-12. 브랜치 `feat/firebase-server-test`에서만 진행합니다. **로그인 성공과 게임 기록의 서버 저장은 다른 단계입니다.** 지금은 로그인·로그아웃·인증 상태 유지·개발 인증 계정 삭제까지 구현했습니다. 닉네임, 게임 저장/복구, 랭킹, 구매 복원은 아직 제공하지 않습니다.

## 현재 서버와 앱

| 항목 | 개발 설정 |
| --- | --- |
| Firebase 프로젝트 | `budae-kiugi-dev`, 프로젝트 번호 `96394423737`, Spark |
| 인증 | Google 제공업체 활성화, 공개 이름 `부대 키우기 개발 테스트` |
| 웹 앱 | `1:96394423737:web:08eff8d7940f396871da68` |
| Android 개발 앱 | `com.dongramco.budaekiugi.dev` |
| Android Firebase 앱 | `1:96394423737:android:854aaaf4efc2920b71da68` |
| 정식 패키지 | `com.dongramco.budaekiugi` — 이번에는 Firebase 정식 앱 등록/연결 안 함 |
| Firestore | Standard, 서울 `asia-northeast3`, 모든 클라이언트 접근 거부, 게임 데이터 업로드 안 함 |
| 인증 허용 도메인 | `localhost`, `127.0.0.1`, 프로젝트 기본 firebaseapp.com/web.app |

Analytics·Crashlytics·서버 함수는 추가하지 않았습니다. Firebase Authentication은 Firestore 서울 위치와 별개로 **미국에서 처리**됩니다. 공개 API 키와 앱 ID는 앱 식별용입니다. 서비스 계정 JSON, 토큰, 비밀번호, keystore는 Git에 넣지 않습니다. API 키의 공개 가능 여부와 데이터 접근 허용 여부는 별개이며, 현재 Firestore 규칙은 닫힌 상태를 유지합니다.

## 집에서 이어하기

먼저 집 PC 저장소에서 `git status`로 작업 중 변경이 없는지 확인하세요. 변경이 있으면 보존한 뒤 진행하고 강제로 덮어쓰지 않습니다.

```powershell
git fetch origin
git switch feat/firebase-server-test
git pull --ff-only origin feat/firebase-server-test
npm ci
npm run dev:firebase
```

로컬에 브랜치가 없다면 `git switch --track origin/feat/firebase-server-test`를 사용합니다. `main` 병합은 별도로 합니다. 브랜치를 푸시하면 코드는 이동하지만 브라우저의 게임 저장·로그인 세션·서명키는 이동하지 않습니다. 서버의 프로젝트 설정은 같은 Google 관리자 계정으로 확인합니다.

- 게임: `http://127.0.0.1:4196/` → 설정 → 구글 계정 연결 · 개발 테스트.
- 실제 게임 저장을 읽지 않는 분리 검증: `npx vite --config tools/account-qa.config.mjs` → `http://127.0.0.1:4214/__account`.
- 같은 브라우저라도 포트가 다르면 별도 로그인 저장 공간입니다. 검증 페이지 로그인은 4196 게임 로그인으로 자동 이전되지 않습니다.
- 포트가 이미 사용 중이면 기존 서버를 확인합니다. 다른 사람의 개발 서버를 임의로 종료하지 않습니다.

## Android 개발 APK

기존 출시 서명키 없이 개발 APK를 빌드할 수 있습니다. JDK21, Android SDK와 이 저장소의 `android/local.properties`가 필요합니다. 환경 점검은 `npm run android:doctor`로 합니다.

```powershell
npm run android:sync:firebase
cd android
./gradlew.bat :app:assembleDebug
```

결과는 `android/app/build/outputs/apk/debug/app-debug.apk`입니다. `.dev` 앱이므로 기존 출시 앱 옆에 설치되며 저장도 별개입니다. **집 PC의 debug.keystore가 다르면 해당 인증서 SHA-1/SHA-256을 Firebase Android 개발 앱에 추가해야 합니다.** Android Studio의 Gradle `:app:signingReport`로 공개 지문을 확인합니다. 비밀번호나 키 파일을 채팅·Git에 올리지 않습니다.

이 PC에 등록한 공개 지문:

```text
SHA-1   7E:27:6B:CF:BD:E8:96:8A:C4:00:B3:74:27:BB:01:98:D4:6C:F6:FC
SHA-256 E2:01:4D:05:79:61:14:FA:05:E6:C1:D8:FD:E8:89:DC:52:AE:D3:90:67:E8:80:22:66:11:FE:AF:0E:65:A6:C9
```

`src/debug/google-services.json`은 공개 앱 설정입니다. Gradle이 debug 리소스만 생성하고 Firebase 네이티브 플러그인도 debug에서만 등록합니다. release/unsigned에는 해당 SDK를 의존성으로 넣지 않습니다. 일반 웹 빌드는 인증 청크를 제외합니다. 개발 웹 빌드에는 표식을 넣어 release/unsigned가 잘못 묶이면 실패하도록 했습니다. 정식 빌드로 돌아갈 때는 `npm run android:sync`를 사용합니다. 이 명령의 음원 검증에 필요한 비공개 자산은 별도 로컬 준비가 필요합니다. 개발 빌드 성공이 출시 자산·서명 검증 완료를 뜻하지 않습니다.

## 코드를 읽는 순서

1. `src/account-config.js`: 공개 개발 설정과 사용 가능한 모드/패키지.
2. `src/account-controller.js`: 준비→사용 가능→처리 중 상태, 연타 방지, 오류 코드 정리. 게임 state를 받지 않습니다.
3. `src/firebase-auth-adapter.js`: 웹 Google 팝업, Android Credential Manager, Firebase JS 인증 상태 저장. 인증 토큰은 SDK가 관리하고 게임 저장/오류 로그에 복사하지 않습니다.
4. `src/account-view.js`, `src/account-ui.js`: 이메일 표시, 로그인/로그아웃/삭제 안내. 서버 응답 문구를 HTML로 실행하지 않습니다.
5. `src/settings-ui.js`: 계정 메뉴를 열 때만 코드를 불러옵니다. 홈 터치·수입 루프에는 인증 요청을 넣지 않습니다.
6. `tests/account.test.js`: 동시 요청, 취소·오류, 재시도, 계정 변경, 저장 분리, 개발/출시 구분.

기존 `budae-kiugi-recruits-v3`와 저장 형식은 바꾸지 않았습니다. 로그아웃·계정 전환은 현재 기기의 골드·병력을 변경하지 않습니다. 개발용 삭제는 지금은 Firebase Auth 사용자만 삭제합니다. **게임 데이터를 서버에 추가하는 순간 전체 데이터 삭제와 충돌 방지를 먼저 연결해야 합니다.** 이 삭제 기능을 그대로 정식 탈퇴로 취급하지 않습니다.

## 후속 순서와 통과 조건

1. 닉네임/프로필: 서버 검증, 길이·문자·사칭·금칙어, 변경 및 신고 처리. 닉네임 중복 정책은 구현 전 결정합니다.
2. 기존 저장 연결/복구: UID별 분리, 원본 백업, 명시적 기록 선택, 저장 revision 충돌 처리, 재시도, 오래된 앱의 덮어쓰기 방지. 돈은 큰 정수 문자열, 스키마 검증·중복 보상 방지 포함. 정상 테스터 기록 유지.
3. 탈퇴/운영: Auth와 저장·프로필의 삭제, 외부 삭제 요청 페이지, 로그 최소화/보존 기간, 복구 절차. 보안 규칙은 에뮬레이터에서 타인 읽기/쓰기 거부를 먼저 검증합니다.
4. 랭킹: 서버가 검증한 전력, 오전9시(KST) 스냅샷, 상위100명·내 순위·공동 순위, 개발/조작 기록 제외. 클라이언트가 보낸 전력을 그대로 공개 순위에 올리지 않습니다. 예약 함수/결제 요금제는 적용 전에 비용을 확인합니다.
5. 정식 연결: 개발 프로젝트를 자동으로 운영 서버라고 간주하지 않습니다. 테스터 데이터 보존·이관 계획과 운영 프로젝트/서명 지문을 확정합니다. Play 앱 서명 인증서와 업로드 키 인증서는 구분합니다.

## 정책과 라이선스

방침 revision8·약관 revision5 및 저장소의 공개 HTML/스토어 준비 문서를 수정했습니다. **Google Docs 공개 방침과 Play Console 제출은 아직 하지 않았습니다.** 일반 사용자에게 계정 기능을 배포하기 전 처리 정보·국외 이전의 법적 근거/고지·외부 삭제 URL·데이터 보안 양식을 구현에 맞춰 동기화해야 합니다. 법률 적합성이나 부정 이용 방지를 이번 로그인 테스트만으로 보장하지 않습니다.

Firebase JS와 Capawesome의 Apache-2.0 및 네이티브 전이 의존성 고지는 `docs/licenses/README.md`를 참고합니다. npm audit에서 발견한 전이 의존성은 보완했으며, 알려진 취약점 0건은 모든 보안 문제가 없다는 의미가 아닙니다.

공식 자료: [Google 웹 인증](https://firebase.google.com/docs/auth/web/google-signin), [Firebase 개인정보 처리](https://firebase.google.com/support/privacy), [공개 API 키](https://firebase.google.com/docs/projects/api-keys), [Capawesome Google 설정](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md), [서명 지문](https://developers.google.com/android/guides/client-auth), [Android 앱 서명](https://developer.android.com/studio/publish/app-signing).

검증 결과와 미확인 사항은 `검증결과.md`의 0.77 항목을 확인하세요.
