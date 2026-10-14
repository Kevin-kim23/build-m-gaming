## 집 PC 개발 서버 중지 시도 · 0.83.21 · 2026-10-14

사용자가 집 PC임을 확인하고 이번 정식 출시에서 서버를 제외하며 개발 서버 중지를 승인했다. 운영은 변경하지 않는다.

- Git: feat/firebase-server-test를 6287b99에서89ad29d로 fast-forward. 수정 파일이 없음을 먼저 확인했다. release 기준은 별도 feat/ui-first-release/0.76.15이며 main/claude/다른 기능 브랜치를 병합하지 않았다.
- 직접 확인: Scheduler 두 작업을 콘솔에서 일시중지하고 Paused 두 개를 확인했다. 마지막 성공 표시는 만료 정리03:00:00, 삭제 재시도18:00:01(KST, 2026-10-14). 실제 처리 내역은 읽지 않았다.
- Cloud Run UI 검토에서 revision 최대 인스턴스 제거가 표시되어 저장 없이 취소했다. 원래 자동 확장 설정 유지 확인 후, 사용자에게 정확한 API 변경 범위를 설명해 승인을 받았다.
- tools/firebase-guard/run-stop-dev.cjs와 stop-dev-policy.cjs: 개발 서울 기존9개만 조회, scalingMode/manualInstanceCount만 변경, etag 동시 변경 방지, 반환된 작업 조회, 원문/파일 로그 차단, 첫 오류 중단. 코드·데이터·권한·revision·상한 보존 검증. 가짜 테스트5개 통과 후 실제1회 실행.
- 실제 결과: 서비스9개 사전 조회 성공 → 첫 PATCH HTTP409 → 즉시 중단. 변경 완료0, 사후 검증0. 첫 요청 반영 여부 미확인. 추가 조회/재시도/권한 변경/삭제하지 않았다. 서버 전체 중지 완료가 아니다. HTTP409의 구체 원인은 본문을 출력하지 않아 미확인이다.
- 되돌림: 예약 재개와 서비스 자동 확장 복구는 별도 승인 후. 데이터/함수 삭제는 하지 않는다. 은행 비유: 정기 업무는 멈췄지만 창구9개를 닫는 첫 요청이 충돌해 멈춘 상태다. 보관 데이터/이미지 비용은 남을 수 있고 비용0원을 보장하지 않는다.
- 이전 집 실기기 진행 보완: 사용자가 디버그 토큰 등록 완료를 알렸고 테스트 프로필 등록 및 승인된 readProfile 1회 확인을 진행했다. 실제 게임 저장·불러오기·삭제 완료는 미확인. 토큰은 정식 출시 전 폐기 항목으로 유지한다. 값/닉네임/계정 정보는 기록하지 않는다.
- 로컬 전체 테스트/빌드 및 커밋·푸시 결과는 뒤에 기록한다. 방침11·약관8, 테스트 광고 ID, 저장 키/형식 불변. 출시용 공개 정책의 서버 제외 정합은 별도 미완료다.

## 회사 PC 최신화 · 서버 작업은 집 PC 전용 · 2026-10-14

- 직접 확인함: 회사 PC Node22.23.3에서 로컬 npm test1201/1201 통과(실패/건너뜀0, 약176초), npm run build 성공. 기존 라이선스 고지 묶음 크기 경고는 남았고 npm 업데이트 안내는 실행하지 않았다. 클라우드 연결 도구/로그인/배포/실제 서버 시험은 실행하지 않았다.

사용자 결정: 이 PC는 회사 PC이며 앞으로 서버 관련 작업은 집 PC에서만 한다. 회사에서는 Git 받기/문서 읽기/서버에 접속하지 않는 로컬 검사만 진행한다. 서버 코드·연결 기능 개발, 클라우드 콘솔(읽기 포함), 로그인/배포/API 호출/권한/예산/실제 저장 시험은 하지 않는다. 자세한 지속 규칙은 AGENTS.md 최상단.

- 직접 확인함: 기존 feat/firebase-server-test/79b9daf·깨끗함에서 원격72커밋을 받아 6287b99까지 fast-forward(갈라진 기록 없이 앞으로 이동). 버전0.83.20, 실행 코드에는 Android 로그인 준비 무한대기 수정과 보호 도구/검증 추가가 포함돼 있다. main/claude 브랜치는 병합하지 않았다.
- 문서로만 확인함: 집에서 개발 함수9개·예약2개 배포 및 S9+ Google 로그인까지 확인했다고 기록돼 있다. 과거 회사의 함수0개 기록과 재시도 승인은 이제 최신 서버 상태/작업 허용 기준이 아니다. 회사에서 서버 재조회하지 않았다.
- 미확인: 집의 App Check(정상 앱/시험 단말기인지 확인하는 장치) 디버그 등록 완료, 실제 서버 저장·불러오기·삭제 및 예약 실제 처리 성공. 출시 전 디버그 등록 폐기 항목은 유지하며 회사에서 수행하지 않는다.
- 회사에 남은 인증 상태의 현재 유효 여부는 조회하지 않았고 로그아웃/파일 복사/삭제도 안 했다. 비밀값은 문서에 기록하지 않는다.
- 로컬 테스트/빌드 결과와 푸시는 이번 작업일지·검증결과·마감 보고에 기록한다. 게임·서버 소스/방침11/약관8은 이번 동기화 규칙 기록으로 수정하지 않는다. 은행 비유: 회사에는 최신 설계도를 받아 두고 실제 은행 창구 업무는 집에서만 한다. 정책 영향 없음.

## 개발 재개 배포 완료 및 콘솔 읽기 확인 · 2026-10-13

사용자 최종 승인 후 직접 실행한 결과: requestsCompleted=true, stopped=false, 신규 함수8, 예약2, 보존 함수1, possibleUnconfirmedResource=false. 사용자 전달 실행 결과와 아래 Codex 콘솔 직접 확인을 구분한다.

직접 확인: Chrome 개발 프로젝트 Cloud Run 목록에서 함수 유형 서비스9개, 모두 서울. createprofile/deletegameaccount/readcloudsave/readprofile/reportnickname/savecloudprogress는 공개 액세스·전체 인그레스, moderatenicknames는 인증 필요·전체 인그레스, purgeexpiredserverrecords/retryaccountdeletions는 인증 필요·내부 인그레스다. 관리자 서비스 권한 대화상자에서 상속 표시 제외 후 결과 없음: 직접 바인딩0, 공개 주체 표시 없음. 상속 소유자/편집자/서비스 에이전트 권한은 변경하지 않았다. 인증 필요 설정 확인과 실제 HTTP 거부 시험은 다른 결과다.

직접 확인: Scheduler2개 모두 Enabled/서울/Asia-Seoul 시간대. 만료 정리 매일03시, 삭제 재시도00·06·12·18시. 두 작업 모두 아직 실행되지 않음으로 표시된다. 조회 시 다음 실행은 삭제 재시도10월14일00시, 만료 정리10월14일03시였다. 강제 실행/편집/일시정지/삭제는 하지 않았다.

미확인: 예약 실제 실행 성공/자료 처리, 외부 요청의 실제 거부, 관리자 인증 호출, 테스트 계정 로그인→저장→불러오기→삭제, 원격 소스 바이트 동일성. 배포 성공을 이 시험들의 완료로 대신하지 않는다. 운영은 미배포·미접근. 이번은 콘솔 읽기만이며 API 허용 확대/클라우드 변경/앱 로그인 없음.

중요: 기존 새 배포 명령 및 --resume-first 명령을 다시 실행하지 않는다. 이번 재개기는 첫 함수1개만 존재하는 중간 상태 전용이며 현재9개 상태는 대상이 아니다. 문제가 생기면 재배포/삭제보다 먼저 종류·상태를 읽기로 확인한다. 예약 문제 발견 시 승인된 일시정지 절차를 따르며 자동 삭제하지 않는다.

직전 직접 검증: 전체1197/가드259/합성15종/빌드 통과. 이번은 코드 변경 없음으로 테스트/빌드 재실행 없음. 버전0.83.19·방침11·약관8 유지. 은행 비유: 창구 설치와 출입 설정까지 확인했으나 실제 거래 시험은 남았다. Scheduler는 정해진 시각에 실행하는 예약 담당이다. 정책 영향 없음. 기존 공개 정책 동기화 과제는 별도로 남아 있다.

# 집 PC 인수인계 · 개발 서버 배포 재시도 전 · 2026-10-13

> 최신0.83.3: 로그인 전용 보완 승인 후 가짜검사를 마치고 사용자 직접 실행을 준비했다. [로그인 안내](HOME_LOGIN_GUARD.md)와 CONTINUE 최상단 참조. Codex의 실제 로그인 실행/클라우드조회/서버상태갱신/.env/배포는 없음. 아래 이전상태와 구분한다.

> **최신 0.83.2:** 사용자 '(나)' 제작·가짜검증·tools보관 승인 후 집에서 기본 거부 보호 도구를 작성했다. [구현 결과/CLI 소스 근거](HOME_GUARD_IMPLEMENTATION.md) 참조. 신규40개·오프라인CLI6개 통과, 실제 projects:list는 not-logged-in으로 멈춤. 실제 조회 성공/서버 빈 상태/배포 미확인. 로그인·.env·배포 별도 승인. 회사 원본과 내일 비교 계획, **원본과 동일 보증 없음**. 아래 '도구 승인 대기'는 과거 이력이다.

> **집 PC 수신 후 최신 진행:** 회사 PC 원격 접속 불가로 집이 서버 담당이다. 집에서 Node22.23.3/npm10.9.9·CLI15.33.0 외부 폴더 설치·npm ci·전체938개 테스트·웹 빌드를 확인했다. [보호 도구 재작성 사전 검토](HOME_GUARD_REBUILD_REVIEW.md)를 작성했지만 제작·tools 공개는 '(나)' 승인 대기다. 아래 회사 상태는 과거 확인 이력이다. 최신 순서는 도구 검증 → 사용자 로그인 → 읽기/빈 서버 확인 → 사용자 .env → 배포 명령·최종 승인으로, 아래6절의 과거 .env 선행 순서보다 우선한다. 회사 인증/.env/도구 복사 금지.

> 인계 본문 커밋 `ca782cf`를 origin/feat/firebase-server-test에 푸시한 뒤 fetch로 원격0/0·작업폴더 깨끗함을 직접 확인했다. 이 문장은 그 성공을 기록하는 후속 문서 변경이다. 집에서는 브랜치의 최신 후속 커밋까지 받는다.

**집에서는 이 문서부터 읽는다. 배포 재시도는 승인 대기이며, 이 인수인계 요청은 재시도 승인이 아니다. 보호 도구 공개도 별도 승인 전 금지다.**

## 1. 현재 위치와 다음 한 단계

- 기준 브랜치: `feat/firebase-server-test`. `claude/...`나 `main`이 이번 서버 작업의 기준이 아니다. 다른 브랜치와 병합하지 않는다.
- 인계 작성 시작 커밋: `524f3b6`. 이 문서를 추가한 후속 커밋까지 브랜치 최신을 받는다. 최종 인계 커밋은 `git log -1 --oneline`과 채팅의 푸시 보고로 확인한다. 문서 자신의 커밋 해시를 본문에 고정하지 않는다.
- 앱 0.83.1. 게임·서버의 추적 실행 소스는 `d4fcbd2`와 동일하다. 개인정보 방침 11·약관 8·저장 형식 38 유지.
- 다음 한 단계: **집 PC에서 작업 중인 파일을 보존하면서 이 브랜치 최신을 받기.** 그다음 설치/보호 도구/비공개 설정/로그인/읽기 확인 순서다. 준비가 끝나도 배포를 자동 실행하지 않는다.

### 직접 확인함 — 이 PC에서 마지막으로 확인한 시점의 사실

| 대상 | 상태 |
| --- | --- |
| 첫 배포 시도 | 10/13 13:26 KST 실행. 사전 검사 2개 통과 뒤 경고에서 중단. 자동 재시도 안 함 |
| 개발 함수 | 중단 뒤 전 지역 1세대 0개·2세대 0개 |
| Cloud Run | 전역 목록 서비스 0개, 조회 불가 항목 0개 |
| 예약 작업 | 지원 34개 지역 조회, 작업 0개·조회 실패 0개 |
| 배포 준비용 Google 관리형 계정 | Pub/Sub·Eventarc 계정 2개 모두 아직 없음 |
| 관리자 전용 계정 | 호출용 `moderation-caller`와 실행용 `moderation-runtime` 존재. 앞 단계에서 각각 키 없음/승인한 권한 연결 확인 |
| API | 배포에 필요한 API 사용 설정 확인. 새로 켜라는 요청이 생기면 멈춤 |
| 데이터베이스 | 서울 Firestore와 직접 접근 거부 규칙, 신고 중복 검색용 색인 존재 확인. 서버 전체가 아무것도 없는 프로젝트라는 뜻이 아님 |
| 비용 | 개발 Blaze·월 10만 원·50/90/100% 알림은 앞 단계에서 확인. 자동 중단은 아직 연결하지 않음 |
| 로그인 | 이 PC에서 사용자 직접 CLI 로그인 후 개발 접근 확인. 집 PC 로그인은 별도 |

계정/규칙/예산은 앞선 점검의 결과이며 이번 인수인계 중 콘솔을 새로 조작하거나 재검증하지 않았다. 함수·예약 0개도 마지막 배포 중단 직후의 결과다. **집에서 다시 읽어 확인해야 한다.** 지역별 Cloud Run 조회 중 한 지역 403은 있었고, 이후 공식 전역 조회에서 0개/조회 불가 0개를 확인했다. 403 원인은 확정하지 않았다.

### 미확인·미완료

- 최초 경고의 정확한 원문과 확정 원인: 원문을 저장하지 않아 모른다.
- 재현한 원인 후보: 도구 실행 Node 24와 서버 지정 Node 22 불일치. 같은 CLI에서 경고 발생을 재현했고, 기존 Node 22.23.3으로는 해당 경고가 없었다.
- 함수 9개/예약 2개 배포, 실제 실행 설정, 공개 범위, 관리자 무인증 거부: 미완료.
- 실제 비용 집계, 집 PC 설치·인증·보호 도구 재현: 미확인. 비용 0원을 보장하지 않는다.
- 관리자 호출 권한 연결, 비용 보호 연결, 앱 로그인·저장·삭제 시험: 다음 단계이며 이번에 하지 않음.
- 운영 콘솔/배포, API 키 제한, 나머지 실행 계정 분리, main 병합, AAB/Play 업로드: 하지 않음.

## 2. 집에서 설치할 것

| 도구 | 버전/용도 | 확인 |
| --- | --- | --- |
| Git for Windows | 유지보수 중인 2.x. 이 PC는 2.55.0.windows.2, 같은 패치 버전 필수 아님 | `git --version` |
| Node.js와 함께 설치되는 npm | **Node 22.x**, 이 PC 검증 버전 22.23.3 권장. Node는 서버 JavaScript 실행 프로그램, npm은 의존 패키지 설치 도구 | `node --version`, `npm.cmd --version` |
| Firebase CLI | **15.33.0 고정**, 저장소 밖 별도 폴더. CLI는 명령으로 Firebase를 관리하는 도구 | 아래 설치 절차 |
| PowerShell·Chrome·편집기/Codex | 사용자 직접 명령/브라우저 인증/파일 편집 | 기존 설치 사용 가능 |

Node 24가 일반적으로 사용 불가능한 것은 아니다. 이번 서버가 Node 22이고 보호 도구가 버전 불일치 경고에서도 멈추므로, 집의 배포 실행 프로그램도 22로 맞춘다. 기존 다른 프로젝트가 24를 쓴다면 삭제하거나 전역 설정을 무작정 바꾸지 말고, 이 작업 터미널에만 22 경로를 적용한다. 설치 뒤 새 PowerShell을 열고 실제 `node --version`이 `v22.`로 시작하는지 확인한다.

이번 서버 준비에 Android Studio·Android SDK·Java·앱 서명키·서비스 계정 키 파일·Google Cloud CLI는 필수가 아니다. APK/AAB는 만들지 않는다. 서비스 계정은 프로그램용 계정이며 JSON 키를 만들거나 복사하지 않는다.

공식 안내: [Git 설치](https://git-scm.com/install/windows), [Node 22 다운로드](https://nodejs.org/en/download/archive/v22.23.3), [Firebase CLI 설치·로그인·로그아웃](https://firebase.google.com/docs/cli). 공식 CLI의 일반 전역 설치 안내 대신, 이 프로젝트에서는 고정 버전을 별도 폴더에 설치한다.

## 3. 브랜치 받기 — 한 줄씩 실행

### 집에 저장소가 이미 있다면

PowerShell에서 **집의 게임 저장소 폴더**로 이동한 후:

```powershell
git status --short
```

출력이 있으면 여기서 멈추고 변경 파일을 먼저 확인한다. 강제 초기화/덮어쓰기/자동 stash를 하지 않는다. 깨끗할 때:

```powershell
git fetch origin
```

```powershell
git switch feat/firebase-server-test
```

로컬 브랜치가 없다는 경우에만 대신 아래를 실행한다.

```powershell
git switch --track origin/feat/firebase-server-test
```

```powershell
git pull --ff-only origin feat/firebase-server-test
```

갈라진 기록 때문에 실패하면 병합하거나 강제 밀어넣지 말고 보고한다.

### 저장소가 없다면

게임을 받을 부모 폴더에서 실행한다. 이미 같은 이름의 폴더가 있으면 다른 새 폴더 이름을 먼저 정한다.

```powershell
git clone --branch feat/firebase-server-test --single-branch https://github.com/Kevin-kim23/build-m-gaming.git budae-kiugi
```

```powershell
Set-Location .\budae-kiugi
```

### 어느 경우든 마지막 확인

```powershell
git branch --show-current
```

```powershell
git log -1 --oneline
```

```powershell
git rev-list --left-right --count HEAD...origin/feat/firebase-server-test
```

정상은 브랜치 이름 일치, 최신 인계 커밋, `0 0`이다. 마지막으로 `git status --short` 출력이 없어야 한다. `524f3b6`으로 되돌리라는 뜻이 아니다.

## 4. Firebase CLI를 저장소 밖에 설치

아래 변수는 **같은 PowerShell 창**에서 사용한다. `$env:LOCALAPPDATA`는 집 PC의 사용자 폴더를 자동으로 가리킨다. 설치 폴더는 게임 저장소 안에 두지 않는다. 아래 설치는 집에서 실행할 절차이며, 이번에 집 PC에서 검증한 것은 아니다.

```powershell
$taskToolDir = Join-Path $env:LOCALAPPDATA 'BudaeKiugiTools\firebase-15.33.0'
```

```powershell
New-Item -ItemType Directory -Force -Path $taskToolDir | Out-Null
```

```powershell
npm.cmd install --prefix "$taskToolDir" --save-exact --ignore-scripts --no-audit --no-fund firebase-tools@15.33.0
```

```powershell
$taskCliPath = Join-Path $taskToolDir 'node_modules\firebase-tools\lib\bin\firebase.js'
```

```powershell
node "$taskCliPath" --version
```

정상 출력은 `15.33.0`. 게임의 package.json/package-lock.json을 바꾸지 않는다. 아직 `login`이나 `deploy`를 실행하지 않는다. 보호 도구 준비가 다음이다.

## 5. 보호 도구 인계 — 추천 A, 승인 전 업로드 금지

### 실제 읽기 점검 결과

- `deploy-guard.cjs`와 `privacy-preload.cjs`를 모두 읽었다. 실제 비밀키·토큰·사용자 이메일·실제 숫자 계정 ID·이 PC의 절대 개인 경로는 발견되지 않았다.
- 출력 보호 도구의 자체 시험에는 가짜 정보가 있다. 실제 계정 자료는 아니며 문서에는 그 값도 복사하지 않는다.
- 배포 보호 도구는 `deploy-request-policy.cjs`와 동일 폴더의 CLI 설치를 요구한다. 정책 파일에는 개발 프로젝트 이름과 9개 함수 이름이 고정돼 있다. 계정 이름은 실행 중 얻은 값을 메모리에서 조합하며 실제 값이 소스에 저장돼 있지는 않다.
- CLI 내부 파일을 직접 참조하므로 **15.33.0에 의존**한다. 도구 두 개만 `tools/`로 복사하면 의존 경로가 달라져 깨질 수 있다.
- 일반 출력 보호는 패턴 기반이라 모든 미래 비밀 형식의 차단을 보장하지 않는다. 로그인 때는 로그인 전용 허용 출력 모드, 배포 때는 상태만 허용하는 별도 배포 보호를 사용한다.
- 배포 보호는 알려진 CLI 요청을 제한하는 보조 장치다. Google 내부 작업이나 청구 상한까지 보장하지 않는다. 이를 없애고 원본 명령으로 우회하지 않는다.

| 선택 | 방법 | 평가 |
| --- | --- | --- |
| **A 추천** | 승인 뒤 개인 경로/실제 값을 제외한 보호 도구·정책·읽기 도구·가짜 데이터 테스트를 `tools/` 아래에 함께 추가. CLI 위치를 외부 경로 인수로 받아 동작하게 수정하고 두 PC에서 재검증 | 동일 코드와 수정 기록을 받으므로 재작성 누락 위험이 작음. 공개 전 검사 및 사용자 승인이 필요 |
| B | 집의 저장소 밖 전용 폴더에서 아래 명세로 다시 작성하고 테스트. 또는 사용자가 검토된 소스 파일만 비공개로 전달한 후 해시 확인 | 공개는 피하지만 재작성 차이·버전 누락·경로 오류 위험이 큼. 실행 가능한 도구가 자동으로 생기는 것은 아님 |

**이번 커밋에는 보호 도구를 추가하지 않았다. A 업로드 승인은 아직 없다. B도 집에서 재작성·검증하지 않았다. 이 지점이 집의 로그인/배포 전 준비 관문이다.** 원본 파일을 문서에 붙여 넣는 방식으로 승인 조건을 우회하지 않는다.

집에서 이어 할 요청 예시: “HOME_PC_HANDOFF.md 5절부터 진행해. 보호 도구 A안 업로드는 별도 승인 여부를 확인하고, 준비 전에는 로그인·배포를 실행하지 마. 배포 재시도 승인도 아직 대기야.”

### B를 고르는 경우의 재현 명세

전용 폴더에 필요한 파일: `privacy-preload.cjs`, `deploy-guard.cjs`, `deploy-request-policy.cjs`, `deploy-guard.test.cjs`, `check-login-readonly.cjs`, `stage4-inventory-readonly.cjs`, `stage4-platform-readonly.cjs`. node_modules와 인증 파일, .env 파일은 이전 PC에서 복사하지 않는다.

- 원문 stdout/stderr와 CLI 디버그 파일 저장 차단. 경고/오류는 비밀이 없는 고정 분류만 출력하고 중단.
- 개발 프로젝트·서울·Node22·정확한 함수9개 최초 생성만 허용. --force 없음, --non-interactive 사용. 관리자 Invoker 연결 금지.
- 승인된 관리형 계정2개 준비, 일반6개 공개, 예약2개 기본 실행 계정 호출 및 정해진 예약만 허용.
- API 활성화, 프로젝트 전체 권한 변경, 다른 대상, 삭제/수정, 이미지 정리 정책, 비용 보호 연결은 차단.
- 인증 토큰/프로젝트 숫자/서명된 업로드 주소는 필요한 동안 메모리에서만 다루고 출력·기록하지 않음.
- 읽기 도구는 자동 API 활성화 경로를 사용하지 않고 GET 중심으로 조회. 권한 확인 POST는 testIamPermissions 같은 변경 없는 검사만 허용. 원문 오류 대신 상태만 출력.
- 기존 배포 보호 테스트 11종: 대상9개 생성, 다른 프로젝트/지역/런타임 거부, API/IAM/정리/주제 거부, 관리형2개 범위, 공개6개만, 예약 호출 계정, 승인 업로드 주소만, 예약 일정2개, 임의 원문 출력 차단, 금지 요청 네트워크 전 중단, Node 불일치 경고 분류 후 중단.
- 추가로 로그인 모드의 가짜 이메일/토큰/URL/분할 출력 차단과 디버그 파일 미생성을 검사. 실제 계정값을 테스트 자료로 쓰지 않음.
- 모든 로컬 검사가 통과해도 실제 배포 성공을 뜻하지 않는다. 새 오류는 멈추고 별도 승인을 받는다.

원본 소스를 비공개로 전달할 때 비교할 SHA-256(파일 내용 지문, 인증값 아님):

| 파일 | SHA-256 |
| --- | --- |
| deploy-guard.cjs | C11650E4B26E9A7EAB68588BC70514DF90C366918346A44B4643B7BBBF07E8B2 |
| privacy-preload.cjs | B5D905D5AAEAEA7C3AE972948A32CD45774BB6E8FA672C05DF61F1AE8D64B9ED |
| deploy-request-policy.cjs | 4A7AC350216A1D83A0CCD14D5B9BA1C9EF28B1D4AF778705B7290C4F68E38B6D |
| deploy-guard.test.cjs | 78CE735C6D3F68CA428415D20DFC73F3CB340E45D685B190B11F256D45A097FD |
| check-login-readonly.cjs | 369E3C2F7B077D95807C3DA1CE6D9FD7678EAEFC49CC3615121FF9740A5AD81A |
| stage4-inventory-readonly.cjs | 5C9FFB2C38B5B7C5CC69E962627F68FBBFF02497EF3E35C3F06A8865A807CF85 |
| stage4-platform-readonly.cjs | 298E0587E17AC01A62449D7EF086F93018C057AE93330B5E6033CD5469303F26 |

A안에서 경로를 수정하거나 B안으로 다시 작성하면 해시는 달라진다. 해시 일치 대신 소스 검토/테스트/새 지문 기록이 필요하다.

## 6. 집에서 의존 패키지와 비공개 설정 준비

게임 저장소 루트, Node22 터미널에서 한 줄씩:

```powershell
npm.cmd ci
```

잠금 파일에 정해진 패키지를 설치한다. 저장소의 postinstall은 server와 cost-control 패키지도 설치한다. **설치만 하며 클라우드 배포/비용 보호 활성화를 하지 않는다.** 이 단계가 실패하면 npm update로 버전을 바꾸지 말고 멈춘다.

```powershell
git check-ignore -v server/.env.budae-kiugi-dev
```

`.env.*` 제외 규칙을 확인한 뒤 편집기에서 `server/.env.budae-kiugi-dev`를 새로 만든다. 집에서는 만들기 전 위치와 내용 종류를 다시 설명하고 사용자에게 비공개 입력을 맡긴다. 파일 내용/스크린샷을 채팅에 보내지 않는다. 아래는 **항목 이름만**이며 실제 값은 문서에 없다.

```dotenv
MODERATION_RUNTIME_SERVICE_ACCOUNT=
MODERATION_ADMIN_AUDIENCE=
MODERATION_ADMIN_SUBJECT=
```

- 첫 항목만 승인된 **실행용 계정의 이메일 형태 이름**을 사용자가 비공개 입력한다. 호출용 계정을 넣지 않는다.
- 나머지 두 항목은 첫 배포에서 빈 값 유지: 관리자 요청을 모두 거부하는 상태다.
- SUBJECT를 함수 주소로 채우지 않는다. 현재 코드는 계정 숫자 식별자를 기대하지만 사용자 숫자 기록 금지 조건이 있어 후속 단계에서 해결 방식을 별도 논의한다. 지금은 넣지 않는다.
- `git ls-files -- server/.env.budae-kiugi-dev`의 출력이 없어야 한다. Git 제외와 배포 소스 제외는 다르므로 기존 업로드 제외 검사도 유지한다.

```powershell
npm.cmd test
```

이 인계 버전 기준 정상 기대값은 **938개 통과, 실패 0개**. 집에서는 아직 미검증이다. 통과 개수가 다르면 브랜치/커밋/Node버전을 먼저 확인한다.

```powershell
npm.cmd run build
```

빌드 성공을 확인한다. 기존 라이선스 고지 묶음 크기 경고는 남아 있다. 빌드 통과는 Android 기기/클라우드 배포 확인과 다르다.

## 7. 집에서 사용자 직접 Firebase 로그인

**5절 보호 도구 준비·검증이 끝난 경우에만 진행한다.** 아래는 원본 폴더 구조를 유지하는 B안 기준 실행 예시다. A안 승인 후 외부 CLI 경로 처리 방식이 바뀌면 검증된 새 안내를 우선한다.

집의 일반 PowerShell을 사용자가 직접 열고 Node22/CLI15.33.0을 확인한다. 비밀번호·인증 코드·로그인 링크는 요청하지도, 채팅/문서로 받지도 않는다. 원격 로그인 토큰을 만드는 `login:ci`, 키 파일 로그인, AI의 --interactive 재시도는 하지 않는다.

```powershell
$taskToolDir = Join-Path $env:LOCALAPPDATA 'BudaeKiugiTools\firebase-15.33.0'
```

```powershell
$taskCliPath = Join-Path $taskToolDir 'node_modules\firebase-tools\lib\bin\firebase.js'
```

```powershell
$taskPrivacyPath = Join-Path $taskToolDir 'privacy-preload.cjs'
```

```powershell
$env:BUDAE_CLI_LOGIN_OUTPUT = '1'
```

```powershell
node --require "$taskPrivacyPath" "$taskCliPath" login --reauth
```

정상 흐름: Chrome 로그인 화면 → 사용자 직접 계정 선택·권한 검토/동의·2단계 인증 → `Firebase CLI Login Successful` 화면. 별도 이용정보 제공 질문은 사용자가 읽고 결정한다. 예상하지 못한 링크 복사·코드 전달 요구나 화면이 멈추면 그 상태만 알리고 중단한다. 성공했다고 말한 뒤 AI가 읽기 확인한다.

```powershell
Remove-Item Env:BUDAE_CLI_LOGIN_OUTPUT -ErrorAction SilentlyContinue
```

## 8. 처음 할 읽기 전용 확인 — 배포하지 않기

매 콘솔 단계 시작에 사용자가 상단 프로젝트 `budae-kiugi-dev`를 확인한다. 화면에는 이메일·숫자 식별자를 가리고 보낸다. 아래 도구는 5절에서 준비한 뒤 실행하며, 없으면 원본 CLI 전체 출력을 대신 보내지 않는다.

1. `check-login-readonly.cjs`: 로그인됨/안 됨 → 접근 가능한 **프로젝트 ID 목록만** → 개발 프로젝트 직접 GET 성공 순서로 확인한다. 운영 ID가 목록에 있어도 운영 개별 조회는 하지 않는다. 이메일/토큰/인증 파일 원문/원문 오류 출력 금지.
2. `stage4-inventory-readonly.cjs`: 함수 1세대/2세대 전 지역 목록, Scheduler 모든 지원 지역, API 활성 상태만 읽는다. 데이터베이스의 사용자 기록은 열지 않는다.
3. `stage4-platform-readonly.cjs`: 공식 Cloud Run 전역 목록과 조회 불가 항목을 확인한다. 승인 계정 존재/활성 여부, 관리형2계정 준비 여부, 실행 계정 연결 권한은 값 대신 판정만 출력한다.
4. 이 PC의 마지막 상태인 함수0/Run0/예약0과 비교한다. 403·조회 실패·페이지 누락은 0개로 취급하지 않는다. 자원이 생겼다면 다른 PC 작업 가능성이 있으므로 **최초 생성 배포를 재시도하지 말고 이름/상태부터 보고**한다.
5. 로그인·개발 접근·빈 실행 자원 상태까지만 확인하고 멈춘다. 배포 재시도 승인 질문은 그대로 남아 있다.

로그인이 집의 사용자 PowerShell에서는 성공했는데 AI에서 안 보이면, 다른 Windows 사용자/실행 호스트/사용자 설정 폴더 환경 차이를 경로 내용 없이 확인한다. 같아 보인다는 이유로 인증 파일을 복사하지 않는다. --interactive로 돌아가려면 먼저 사용자에게 묻는다.

B안의 검증된 파일이 전용 폴더에 준비돼 있다면, 위 순서대로 하나씩 실행하는 명령은 다음과 같다. A안은 승인 후 확정한 경로/실행 방법을 따른다.

```powershell
node (Join-Path $taskToolDir 'check-login-readonly.cjs')
```

```powershell
node (Join-Path $taskToolDir 'stage4-inventory-readonly.cjs')
```

```powershell
node (Join-Path $taskToolDir 'stage4-platform-readonly.cjs')
```

## 9. 배포 재시도 승인 대기 내용 — 실행 명령이 아님

승인 대기: 기존 승인 범위의 개발 함수9개·예약2개·Google 관리형 기본계정2개 준비를, **Node22.23.3 + CLI15.33.0 + 검증된 보호 도구**로 다시 시도할지 여부. 집 PC 환경과 자원 상태가 달라졌으므로 사전 점검 결과를 다시 보여준 뒤 최종 승인을 받는다. 앞선 1회 배포 승인이 실패 후 재시도까지 자동 허용하지 않는다.

대상 이름: readProfile, createProfile, readCloudSave, saveCloudProgress, reportNickname, deleteGameAccount, moderateNicknames, retryAccountDeletions, purgeExpiredServerRecords.

- `--project budae-kiugi-dev`, `--only` 위9개, `--force` 없음. 관리형2계정 준비 외 미승인 변경 금지.
- 예약 계획: Asia/Seoul `0 0,6,12,18 * * *` / `0 3 * * *`.
- 일반6개만 인터넷 진입 허용 후 내부 인증/앱검증. 관리자1개·예약2개 공개 금지.
- 관리자 Invoker(호출을 허용하는 권한) 연결과 비용 보호 연결은 이번 범위 밖.
- 이미지 자동 삭제 정책 질문, 삭제/추가 API/범위 밖 변경/예상 밖 비용/정책 변경/오류는 즉시 중단. 실제 목록을 먼저 확인하고 새 승인을 받는다.
- 부분 배포 시 생성/미생성 이름을 구분하고, 예약이 있으면 일시정지할지 사용자에게 묻는다. 임의 삭제 안 함.
- 첫 배포·작은 확인의 계획치 0~5,000원은 과금 상한이 아니다. 월10만원 알림도 자동 중단이 아니다.

## 10. 이 PC 마무리와 집 PC 작업 후 로그아웃

이번 인수인계에서 직접 재확인: 로그인 상태 파일 존재, **저장소 밖**, Git 추적 없음. 파일 내용은 출력하지 않았다. `firebase-tools.json`이라는 이름을 저장소 안에 복사하면 현 .gitignore는 차단하지 않는다. 파일을 복사하지 않는 것이 현재 전제다. `.env.*`, `.firebase/`, `*.log` 제외와 인증 파일 보호를 혼동하지 않는다.

**실제 로그아웃은 사용자 승인 전 실행하지 않는다.** 사용자 승인을 받은 뒤, 준비된 출력 보호를 거쳐 같은 CLI로 수행한다. 이 PC에서 전용 도구 폴더는 집의 예시 폴더와 다르다. 기존 기록의 절대 경로는 이 PC 전용이고 집에서는 바꿔야 한다.

현재 PC의 게임 저장소 루트에서만 다음과 같이 기존 도구 위치를 찾을 수 있다. 집에서는 이 상대 경로도 그대로 사용하지 말고 4절의 집 전용 경로를 사용한다.

```powershell
$taskToolDir = (Resolve-Path '..\..\work\firebase-deploy-tools').Path
```

```powershell
$taskCliPath = Join-Path $taskToolDir 'node_modules\firebase-tools\lib\bin\firebase.js'
```

```powershell
$taskPrivacyPath = Join-Path $taskToolDir 'privacy-preload.cjs'
```

위 경로 확인은 로그아웃이 아니다. **사용자가 실제 로그아웃을 승인한 뒤에만** 다음 명령을 실행한다.

```powershell
node --require "$taskPrivacyPath" "$taskCliPath" logout
```

CLI에 여러 계정이 등록돼 있다면 전체 로그아웃 영향 범위를 먼저 확인한다. 완료 뒤 읽기 도구가 `not-logged-in`을 출력하는지 확인하고 Git 상태를 다시 확인한다. 로그아웃은 배포된 서버나 게임 기록을 삭제하지 않는다. 인증 파일 수동 삭제로 대신하지 않는다.

## 11. 경로·복구·정책·기록 원칙

- 과거 문서의 `C:\Users\...` 절대 경로는 **이 PC 전용 예시/실행 기록**이다. 집의 저장소 위치·도구 위치로 바꿔야 한다. 사용자 폴더 환경 변수는 읽기만 하고 HOME/USERPROFILE/CODEX_HOME을 재정의하지 않는다.
- 이전 PC의 로그인 상태는 Git으로 동기화하지 않는다. 계정 키·토큰·실제 이메일·숫자 계정 ID·결제 번호·예산 ID를 인계 문서에 적지 않는다. 설정 항목 이름과 결과 판정만 남긴다.
- 은행 비유: 지점(프로젝트)은 그대로지만 집에서는 새 출입증(본인 로그인)과 검증된 작업 도구가 필요하다. Git은 설계도/작업일지를 옮기며 출입증/비공개 설정은 옮기지 않는다.
- 현재 함수/예약을 설치하지 못했으므로 되돌릴 서버 배포는 없다. 나중에 일부 생성되면 사용자 승인 후 예약 정지/접근 제한/대상별 되돌림을 검토한다. DB·인증 계정·프로젝트를 통째로 삭제하지 않는다. 발생 비용은 되돌려 없어지지 않는다.
- 이번 변경은 문서뿐이다. 정책 번호11·약관8 유지. 서버 배포 후 공개 방침/Play 데이터 보안 양식과의 대조는 여전히 미완료다. 이번 인수인계 자체는 정책 영향 없음.
- 이 PC 최종 검증: Node22.23.3에서 npm test938/938 통과(실패/건너뜀0, 약166초), npm run build 성공. 실행 소스 변경 없음. CONTINUE.md·검증결과.md·작업일지에도 기록했다. 집 PC 성공 여부는 여전히 미확인이다.

정책 영향 없음

## 사용자 승인 Git for Windows 설치 · 2026-10-13

사용자가 본인 PowerShell에서 gitAvailable=false/gitNotFound=true 결과를 전달했다. Codex 전용 Git은 있었지만 일반 설치 위치 두 곳에는 Git이 없었으며, 사용자 PowerShell에서 Git 실행 파일을 찾지 못하는 조건이 확인되었다. 실행기 소스 묶음은 git에 의존하므로 이 조건은 전송 전 검사 실패를 일으킬 수 있다. 사용자 실행 당시 다른 실패도 있었는지까지 확정하지 않는다.

사용자가 Git 설치를 명시 승인했다. winget 공식 소스에서 Git.Git 패키지와 Git for Windows 공식 GitHub 설치 주소·해시를 확인하고 버전2.55.0.5를 설치했다. winget 해시 검증 통과, 설치 성공 종료0. 사용자에게 Windows 관리자 권한 확인 창은 본인이 확인하도록 안내했다. 직접 확인: git version2.55.0.windows.5, 표준 설치 있음, 영구 PATH Git 등록 있음. Windows 저장 PATH로 구성한 검사 환경에서 Node 하위 프로세스 gitAvailable=true/gitNotFound=false. 기존 사용자 PowerShell의 오래된 PATH는 자동 갱신되지 않을 수 있어 해당 창에 Git cmd 경로를 앞에 추가한 뒤 git --version 확인만 요청한다.

배포 재실행·클라우드 조회·기본 빌드 계정 조사·권한 변경·로그인·비공개 파일 수정 없음. Git 작성자/인증 설정은 새로 바꾸지 않았다. 설치와 기존 사용자 셸 적용은 구분하며 사용자 셸 실제 성공은 다음 답변 대기다. 은행 업무 도구를 PC에 설치한 단계로 배포 접수는 하지 않았다. 설치를 되돌리려면 Windows 설치된 앱의 Git 제거를 사용하고 저장소는 삭제하지 않는다. 이번 코드 변경 없음, 테스트·빌드 재실행 없음. 문서·인계 기록 갱신 후 기능 브랜치 푸시. 버전·방침11·약관8 유지. 정책 영향 없음.
