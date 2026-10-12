# 1단계 보안 설계·콘솔 점검안

작성: 2026-10-12. 조사 기준: 0.79.0 코드. **설계 문서이며 적용·배포·실제 로그인·실기기 성공 기록이 아니다.** 이후 구현 결과는 해당 버전의 CONTINUE/검증결과/WORK_LOG를 우선한다.

사용자 진행 순서: 보안·삭제 → 승인받은 운영 배포/실제 확인 → 랭킹 → 공개 정책 → 최종 AAB. 이 문서는 1단계 조사 결과다. 콘솔, 결제, 예산, Functions 설정을 변경하지 않았다. 삭제 보관 기간, 호출 제한 수, 랭킹 승인 기준, 닉네임 금칙어 범위, 월 비용 상한은 사용자 답변으로 정한다. 방침/약관 개정 번호를 올리지 않는다.

## 2026-10-12 후속: 구현 코드와 독립 리뷰

아래 기존 설계는 0.79.0 당시 조사이며, 이번 후속 코드는 다음을 추가했다. **운영 배포·실기기·실제 App Check 토큰 발급을 완료한 것은 아니다.**

- 사용자 결정이 코드에 반영됨: UID별 rolling 60초에 읽기30회/쓰기10회, 삭제 완료 처리 기록90일. 운영에서 숫자/예산/함수 설정을 변경한 사실은 없음.
- Android 자체 Capacitor 브리지가 Firebase App Check20.0.0을 사용한다. release/unsigned는 Play Integrity, debug만 Debug provider. JS CustomProvider 연결은 서버 호출 직전에 초기화하며 실제 SDK 만료 시각을 전달한다. 토큰/SDK 오류를 로그에 넘기지 않고 Capacitor의 자동 응답 로그도 `loggingBehavior: none`으로 차단한다.
- 웹에는 운영 진위 확인 provider가 아직 없어 클라우드 호출만 거부한다. Google 로그인 준비·기본 게임·기기 백업은 진위 확인 초기화 실패로 막지 않는다. production에서 개발 토큰으로 우회하지 않는다.
- 서버는 callable SDK가 검증한 `request.app`의 Android app ID를 개발/운영별 허용 목록과 비교한다. Functions7.4.0 소스를 확인한 결과 이 필드는 `verifyToken` 성공 후에만 설정된다. 현재 `enforceAppCheck` 런타임 옵션을 새로 설정한 것은 아니며, handler에서 누락/비허용 앱을 거부한다. `request.data.appId`는 신뢰하지 않는다.
- 매 요청 Auth `getUser`로 삭제·비활성·토큰 폐기 시각을 확인한다. 삭제 차단 기록이90일 후 없어져도 삭제된 계정의 옛 JWT를 허용하지 않는다.
- `runtime-environment.js`는 Functions/Auth/Firestore 모두 정확한 `demo-budae-kiugi`와 지정 loopback 조합일 때만 예외를 허용한다. 그 외에는 SDK 자체의 `FIREBASE_DEBUG_MODE`, `FIREBASE_DEBUG_FEATURES` 또는 emulator 환경 혼입을 거부한다. 원시 환경값은 오류에 넣지 않는다.
- 삭제는 실패 시 pending을 유지하고 완료 후90일 만료 시각을 부여한다. 미완료 재시도·완료 기록 정리 코드는 있지만 **예약 실행 함수는 아직 등록/배포되지 않았다.** 현재 global `maxInstances:2`는 이전 값을 유지한다.
- 독립 리뷰에서 삭제 실패 때 호출 제한 문서를 지워서 같은 시각20개 요청이 모두 허용되는 문제를 합성 데이터로 재현했다. root가 호출 제한 문서 삭제를 Auth 삭제 성공 뒤로 이동하고 영구 회귀 테스트를 추가했다. 후속 보안/삭제/환경 집중16개 모두 통과했다.

검증 한계: 분당 UID 제한은 계정 여러 개를 통한 남용이나 월 비용의 절대 상한이 아니다. 유지보수 작업은 모든 페이지를 처리하는 현재 구조이므로 실제 건수·함수 시간 제한을 포함한 부하 검증, 재시도 실행 주기/작업량 한도와 장애 대응을 배포 비용 검토 때 확정해야 한다. 계정 삭제 뒤 잠시 남는 동시 요청의 제한 카운터는 만료 재확인 후 정리한다.

### 다음에 사용자가 직접 확인할 최소 콘솔 항목

1. **Play Console → 앱 무결성 → Play Integrity API:** 연결된 Cloud 프로젝트가 `budae-kiugi-prod`인지 확인. 일반 앱 서명 SHA 등록과 다른 항목이다.
2. **운영 Firebase → App Check:** Android 앱이 Play Integrity provider와 실제 Play 서명 SHA-256으로 등록됐는지 확인. Play 설치/직접 설치 허용 조건은 실제 테스트 경로와 맞춘다. 이 문서는 등록 완료 증거가 아니다.
3. **Google Cloud → API 및 서비스 → 사용자 인증 정보:** 아래4절 체크리스트로 개발 키부터 제한을 점검. API 키 본문을 채팅/기록에 붙여 넣지 않는다.
4. 개발 Android의 Debug provider를 시험한다면 **개발 프로젝트에만** 해당 기기에서 표시되는 등록 토큰을 직접 등록한다. 토큰을 채팅·Git에 옮기거나 운영 앱에 넣지 않는다. 이전 실기기 검증 생략 요청을 뒤집어 실행하지 않는다.

Blaze·예산·예약 작업·함수 리소스 변경은 아직 이 목록의 실행 대상이 아니다. 비용 추정과 별도 승인 후2단계에서 진행한다. 실제 서버 왕복 검증은 테스트 전용 계정/합성 기록만 사용한다. 현재 PC 웹은 클라우드 진위 확인 경로가 없고, 실제 Play Integrity 정상 통과는 폰/배포 경로 확인이 필요하므로 어느 것도 에뮬레이터 성공으로 대체해 완료 처리하지 않는다.

## 1. 코드 조사에서 확인한 경계

| 항목 | 0.79.0에서 확인한 상태 | 필요한 보완 |
| --- | --- | --- |
| 요청 인증 | callable에서 Firebase Auth UID 확인 | App Check, 활성 계정/폐기 검증, UID별 호출 제한 |
| 앱 진위 확인 | Android 인증 플러그인만 등록; App Check 초기화 없음 | 네이티브 진위 토큰을 JS Functions에 전달 |
| DB 접근 | 클라이언트 Firestore 접근 모두 거부, 서버가 UID별 경로 사용 | 계속 유지; 보조 컬렉션도 직접 쓰기 금지 |
| 닉네임 | NFKC, 문자/길이/중복/운영자 사칭 일부 검사 | 사용자 확정 금칙어 정책, 신고 처리 |
| 저장 | 형식 검증·서버 전력 재계산·revision·requestId | 정상 플레이를 증명하지 못함; 아래 단계별 검증 필요 |
| 삭제 | 차단 기록 생성 후 데이터/Auth 삭제; 실패 시 pending | 서버가 독립적으로 재시도, 완료 후 보관 기간 적용 |

확인 파일: `AGENTS.md`, `src/firebase-auth-adapter.js`, `src/firebase-environment.js`, `src/save.js`, `src/game.js`, `src/money.js`, `src/units.js`, `src/session.js`, `server/index.js`, `server/profile-service.js`, `server/cloud-service.js`, `server/save-validator.js`, `server/deletion-service.js`, `server/package.json`, `firestore.rules`, `android/app/build.gradle`, release `DevelopmentAccountPlugins.java`, `package.json`, 기존 서버 인계/수익화 문서. `src/offline.js` 검색은 파일이 없어 실패했고 실제 참조는 `offline-rules.js`/`offline-reward.js`임을 확인했다.

## 2. App Check / Play Integrity 연결 설계

Firebase의 앱 일반 설정에 SHA 지문을 등록하는 일과 App Check 등록은 별도다. Google 공식 경로는 Play Console의 Play Integrity API에 같은 Firebase Cloud 프로젝트를 연결하고, Firebase App Check에 Android 앱/서명 SHA-256을 등록하는 것이다. Play 설치본과 직접 설치본의 허용 조건이 다르므로 배포 경로를 먼저 확인한다. 이 문서는 해당 콘솔 등록 완료를 주장하지 않는다. [Google Android 연결 안내](https://firebase.google.com/docs/app-check/android/play-integrity-provider)

현재 게임의 로그인 세션·Functions는 **Firebase JS SDK**에서 실행된다. 따라서 네이티브 App Check를 설치한 것만으로 JS callable 요청 보호를 완료했다고 쓰면 안 된다.

제안 경로:

1. Android에서 Firebase Play Integrity provider 초기화.
2. 네이티브에서 발급된 App Check 토큰과 만료 시각을 Capacitor 경계로 전달.
3. 로그인 어댑터가 사용하는 동일한 JS Firebase app에 `CustomProvider`를 초기화한 뒤 callable 사용.
4. callable 서버는 App Check 유효성 검사와 허용 app ID 검사를 하고, 그 뒤 Auth/활성 사용자/UID별 접근/호출 제한을 검사.
5. 토큰 누락·만료·잘못된 앱은 서버 작업을 거부. 재시도 안내와 로컬 게임 이용은 유지하며, 진위 확인 실패를 이유로 현재 저장을 지우지 않음.

Capawesome의 `@capacitor-firebase/app-check`는 이 네이티브→JS 연결 예제를 제공한다. 기존 Authentication 플러그인과 같은 제작자지만 **Google 공식 Capacitor 플러그인은 아니다.** 적용 전 버전·라이선스·네이티브 의존성·기존 SDK와의 호환성을 확인해야 한다. 다른 선택은 Google Android SDK를 감싼 작은 자체 Capacitor 브리지다. 어느 쪽도 이번 조사에서 설치하지 않았다. [유지보수자 JS 연결 문서](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/app-check/docs/firebase-js-sdk.md), [플러그인 문서](https://capawesome.io/docs/sdks/capacitor/firebase/app-check/), [Google CustomProvider 안내](https://firebase.google.com/docs/app-check/web/custom-provider)

개발 debug provider와 운영 Play Integrity를 빌드에서 분리한다. 디버그 토큰은 Git·일지·스크린샷에 남기지 않고 운영 앱에 포함하지 않는다. 운영 PC 웹 테스트를 위해 진위 확인을 무조건 끄거나 Android 토큰 검증을 우회하지 않는다. 브라우저 운영 테스트가 필요하면 별도 승인된 웹 App Check 경로를 구성한다.

서버 `enforceAppCheck` 적용은 코드 준비와 **실제 배포**를 나눠 기록한다. App Check는 앱/기기 진위를 확인하는 방어이며 로그인 권한·호출 제한·게임 진행 검증을 대체하지 못한다. 정상 앱에서도 조작된 게임 값을 보낼 수 있다. [App Check 보안 범위](https://firebase.google.com/docs/app-check)

### 요청 재사용 방어의 주의점

App Check 일반 토큰은 캐시/재사용된다. Functions의 `consumeAppCheckToken`은 limited-use 클라이언트 토큰과 서버 검증 권한까지 맞춰야 하며 지연이 추가되는 별도 기능이다. 이미 소비된 토큰을 서버가 다시 받은 경우도 처리해야 한다. [Functions 적용 및 재사용 방어](https://firebase.google.com/docs/app-check/cloud-functions)

검토한 플러그인 API에는 일반 `getToken(forceRefresh)`만 있고 limited-use 메서드가 없다. JS `CustomProvider` 구현도 limited-use 구분을 공급자 콜백에 전달하지 않는다. 그러므로 `forceRefresh`나 Functions 옵션 한 줄만으로 이 경로의 limited-use 대응 완료를 주장하면 안 된다. 필요하면 Android `getLimitedUseAppCheckToken`을 별도로 연결하고 동일 토큰 재사용/통신 재시도를 실제로 검증한다. [플러그인 API 원본](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/app-check/src/definitions.ts), [JS SDK 원본](https://github.com/firebase/firebase-js-sdk/blob/main/packages/app-check/src/providers.ts), [Android 공식 API](https://firebase.google.com/docs/reference/android/com/google/firebase/appcheck/FirebaseAppCheck)

로컬 설치본도 대조했다: `@firebase/app-check` 0.13.1의 `dist/esm/index.esm.js`에서 CustomProvider 콜백 인자 없음, `@firebase/functions` 0.14.0에서 limited-use 옵션에 따른 토큰 API 분기를 확인했다. 처음 예상한 `index.esm2017.js` 경로가 없어 검색을 다시 해 실제 파일을 읽었다.

일반 App Check만 쓰는 초기 구현에서도 저장 `requestId`의 동일 요청 재시도, revision 충돌, 삭제의 멱등성은 유지한다. 이것은 중복 처리를 막는 장치이며 모든 토큰 재사용 공격을 막는다는 의미는 아니다.

## 3. 계정별 호출 제한·삭제 재시도

호출 횟수/시간 구간은 **사용자 결정 대기**다. 메모리 카운터는 여러 함수 인스턴스에서 우회되므로 UID+작업 종류별 서버 트랜잭션 카운터로 설계한다. 읽기·쓰기·닉네임/신고·삭제를 구분하고, 동일 요청 재시도의 계산 방식도 명시한다. 카운터 문서에는 UID와 필요한 시각/횟수만 남기고 요청 본문·이메일·토큰은 저장하지 않는다. 제한 초과는 재시도 가능한 시각을 안내하되 앱에서 끝없이 자동 재시도하지 않는다.

제한 검사는 검증/DB 작업에 앞서 수행하지만, 거부 요청도 호출·일부 DB 비용을 발생시킬 수 있다. UID별 제한은 여러 계정을 만드는 공격이나 프로젝트 전체 과금의 절대 상한이 아니다. 제한 횟수, 정리 작업, 동시성/인스턴스 수 변경은 비용 추정과 함께 제시하고 승인 후 운영에 적용한다.

삭제 설계:

- 최초 요청은 최근 인증·UID를 확인하고 삭제 차단 기록을 먼저 생성. 이후 프로필/저장/신고/랭킹 등 전체 데이터 목록을 기준으로 정리.
- 사용자 앱 종료·로그아웃 뒤에도 신뢰된 서버 작업자가 pending 삭제를 이어 처리. 함수/예약 작업 선택과 재시도 횟수·빈도는 운영 비용 승인 전 확정/배포하지 않음.
- 재실행은 이미 지워진 Auth/문서를 성공으로 취급하고, 새 닉네임 소유자의 claim을 잘못 삭제하지 않음. 완료 전후 동시 실행·최종 상태 쓰기 실패를 시험.
- 미완료 pending 기록에 만료 시각을 주어 작업이 사라지게 하지 않음. 완료된 최소 처리 기록에만 사용자 결정 보관 기간을 적용. 무기한 실패는 운영자 확인 대상으로 남김.
- 모든 사용자 작업은 삭제 차단 외에도 활성 Auth 상태/폐기 여부를 확인하는 경로가 필요. 삭제 후 남은 ID token으로, 차단 기록이 정리된 뒤 예전 UID의 프로필을 다시 만드는 경로를 막아야 함. ID token과 refresh token의 수명이 다르다는 점을 반영. [Firebase 세션 관리](https://firebase.google.com/docs/auth/admin/manage-sessions)
- Firestore TTL은 만료 시점 즉시 삭제가 아니고, 하위 컬렉션도 자동 삭제하지 않음. TTL 삭제에는 비용이 발생하므로 기간만 정하고 콘솔 기능을 먼저 켜지 않음. 방침에는 실제 정리 방식과 지연 가능성을 맞춰 적음. [Firestore TTL](https://firebase.google.com/docs/firestore/ttl)

## 4. 사용자가 직접 하는 Firebase API 키 제한 체크리스트

이 목록은 **미점검 상태**다. 키 본문을 채팅/Git에 붙여 넣지 않고 이름·용도·제한 결과만 기록한다. 콘솔 주소: [운영 프로젝트 API 사용자 인증 정보](https://console.cloud.google.com/apis/credentials?project=budae-kiugi-prod), [개발 프로젝트 API 사용자 인증 정보](https://console.cloud.google.com/apis/credentials?project=budae-kiugi-dev).

- [ ] 프로젝트가 운영/개발 중 어느 것인지 확인하고, Browser/Android 키가 각각 어느 설정 파일·앱에서 사용되는지 대조한다.
- [ ] 각 키의 현재 API 제한을 기록한다. Firebase용 키에 불필요한 유료/생성형 AI API를 허용하지 않는다.
- [ ] 사용 서비스의 필요한 API가 허용되어 있는지 공식 표와 대조한다. 현재 Auth는 `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, App Check 적용 시 `firebaseappcheck.googleapis.com`을 확인한다. 공통 API 및 다른 실제 SDK 의존성은 공식 표와 시험 결과를 보고 유지한다. 필요한 API를 추측으로 제거하지 않는다.
- [ ] 먼저 개발 키/테스트 앱으로 제한 변경과 로그인·토큰 갱신·App Check 발급·callable을 확인한다. 운영 키에 바로 같은 제한을 복사하지 않는다.
- [ ] 사용자가 콘솔에 적용한 날짜·키 용도·제한 종류·시험 결과만 WORK_LOG에 남긴다. Firebase 일반 앱의 지문 등록과 API 키 제한 적용을 별도 체크한다.

Firebase 키는 인증 비밀번호가 아니라 앱/프로젝트 식별자다. 키를 숨기는 것으로 DB 권한 검증을 대신하지 않는다. API 제한으로 인해 403/`API_KEY_SERVICE_BLOCKED`가 발생하면 필요한 서비스 허용을 확인하고, 모든 API 허용으로 되돌리는 방식으로 끝내지 않는다. [Firebase API 키 공식 안내·서비스별 표](https://firebase.google.com/docs/projects/api-keys)

앱 제한 점검은 요청이 실제로 어디에서 나가는지에 맞춘다:

| 키 사용 경로 | 검토할 제한 | 주의 |
| --- | --- | --- |
| Android 네이티브 Firebase/App Check | Android 앱 패키지+실제 서명 SHA-1 | Play 앱 서명, 개발 키, 업로드 키를 혼동하지 않기 |
| Capacitor WebView 안 Firebase JS Auth | JS 요청의 origin/referrer/API 지원 확인 | Android 앱 내부라는 이유만으로 JS 키에 Android 제한을 강제하면 인증이 끊길 수 있음 |
| 별도 웹 인증 확인 페이지 | 정확한 허용 도메인/referrer | 넓은 와일드카드 또는 운영의 localhost 상시 허용으로 대체하지 않기 |

Google Cloud의 Android API 키 앱 제한은 패키지와 SHA-1을 사용한다. App Check Play Integrity 등록의 SHA-256과 용도가 다르다. JS/WebView에 어떤 앱 제한이 안전한지는 우리 실제 네트워크 요청으로 확인해야 하는 **설계상 미검증 항목**이다. [Google Cloud API 키 제한](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)

## 5. 구조 검사보다 강한 저장 검증 설계

다음은 현재 게임 코드를 바탕으로 한 설계 판단이다. 서버가 `armyPower`를 다시 계산해도 병력 수 자체를 조작한 완성 저장은 통과할 수 있다. 유효한 서명/해시를 원시 저장에 붙여도, 서버가 조작 저장을 처음 받아 서명했다면 정상 플레이 증명이 되지 않는다. App Check 통과도 동일하다.

### 1단계에서 준비할 검증 경계

1. 원본을 파싱한 뒤 누락/상한/형식 검사만 할지, migration 결과의 명확한 게임 불변식까지 검사할지 구분한다. 기존 migration을 삭제하거나 과거 정상 저장을 잘못 거부하지 않는다.
2. 게임 정의를 재사용해 해금 선행 조건, 장비/시설 보유·레벨, 전력 한도, 캠페인/보상 일관성, 금액/수량 경계를 검토한다. 정상 조합에서도 성립하는 불변식만 차단 조건으로 채택한다.
3. 서버가 알고 있는 이전 기록·서버 수신 시각과 비교해 급증/역행/미래 시각을 탐지한다. 임계값은 실제 게임 규칙에서 유도하고, 랭킹 승인 임계값은 사용자에게 묻는다. 의심 기록을 곧바로 기기에서 삭제하거나 계정 정지하지 않는다.
4. 최초 로컬 기록은 검토용 증거로 격리하고 승인된 기준점을 별도로 저장한다. 서버 시간, 클라이언트 호환 버전, 규칙 버전, 검증 상태/사유 코드를 관리한다. 개발 만렙 여부는 클라이언트의 `dev=false` 값으로 승인하지 않는다.
5. 사용자가 정한 검토 기준에 따른 관리자 승인만 랭킹 대상 상태를 바꿀 수 있도록 설계한다. 사용자 callable에 승인/개발 여부 변경 API를 노출하지 않는다.

시간당 골드 증가 상한 검사만으로는 충분하지 않다. 시간 사이에 병력·장비를 구매하면 수입도 변하고, 골드를 소비했다면 잔액은 작아도 전력은 증가한다. `taps` 역시 클라이언트가 임의 제출할 수 있어 실제 손가락 입력 증거가 아니다. 공격자가 합법 범위 내로 천천히 조작하는 경우도 막지 못한다. 따라서 이런 검사는 **이상 탐지**로 표기한다.

### 랭킹 전 합의·구현해야 할 서버 기준 진행

강한 방법은 서버가 승인된 기준 상태를 보유하고 구매/강화/보상 수령 등 명령을 직접 계산하는 것이다. 앱은 임의의 최종 골드·전력을 권위 있는 값으로 보내지 않는다.

- 명령에는 UID 세션, 기준 revision, 중복 방지 ID, 허용된 동작/매개변수만 포함한다. 현재의 `money.js`, 가격·해금 공통 정의를 서버에서도 사용한다.
- 서버는 자신의 시각으로 수입·쿨타임·오프라인 기간을 계산하고, 비용 차감과 진행을 하나의 트랜잭션으로 처리한다. 서버가 인정한 전력만 랭킹 후보로 쓴다.
- 보상은 발급/사용 ID와 원장을 사용한다. 광고 완료의 클라이언트 콜백만으로 재사용 가능한 서버 보상을 승인하지 않고, 향후 실제 광고/결제는 제공자 검증 경로를 별도 마련한다.
- 오프라인 진행을 허용하려면 명령 묶음을 재연산하고 서버 시간/기준 revision/1회 소비 증거로 중복을 막는다. 앱 내부 비밀키나 단순 서명 토큰만으로 오프라인 입력의 진실성을 보장하지 않는다.
- 강한 검증을 적용할 게임 범위와 오프라인/게스트 기록의 랭킹 자격은 사용자에게 설명하고 결정한다. 1단계에서 설계할 수 있지만 전체 진행 서버화는 추가 구현 범위이며 완료라고 쓰지 않는다.

필수 시험: 비용보다 적은 골드/큰 금액 경계, 해금 전 구매, 같은 보상 재사용, 같은 명령 ID의 다른 내용, 두 기기 revision 충돌, 미래/과거 시계, 이전 밸런스 앱, 승인 전/후 조작 저장, 서버 장애와 재시도, 개발 UID 위장, 탈퇴 중 갱신. 실제 사용자의 원본 대신 합성 저장만 사용한다.

## 6. 완료 판단

| 1단계 안에서 할 수 있는 일 | 사용자 콘솔/결정이 필요한 일 | 아직 실제 확인이 필요한 일 |
| --- | --- | --- |
| 독립 로직·실패 재현·에뮬레이터 검증, 원본 보존 복원, 보안 설계/체크리스트 | 기간·호출수·금칙어·승인기준·비용 상한, API 제한, App Check/Play 연결 | 실제 App Check 발급·거부·정상 앱 통과, 운영 Auth/저장/삭제 |
| 서버 배포 전 코드와 검증 결과 기록 | 비용 추정 승인 후 함수/요금제 설정 | Node 22 운영과 로컬 Node 24 차이, 실기기/Play 설치본 |

실기기 확인을 생략하면 Play Integrity 정상 통과는 미완료로 남는다. 실기기 확인을 요구한다고 임의로 기존 앱을 교체하거나 테스트용 최종 AAB를 만들지 않는다. 필요한 사용자 단계와 검증용 산출물은 별도로 설명한 뒤 진행한다.

**정책 동기화 필요:** App Check·호출 카운터·삭제 재시도/처리 기록·신고 정보가 실제 구현되면 수집 항목, 목적, 처리자, 보관·파기를 최종 문안에 반영해야 한다. 이번 설계 문서만으로 공개 방침이 확정되거나 앱 약관 재동의가 시작되지 않는다.
