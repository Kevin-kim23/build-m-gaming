# 집 PC 보호 도구 · 0.83.2 · 2026-10-13

사용자 '(나)' 승인에 따라 집에서 새로 작성했다. **원본과 동일 보증 없음.** 회사 PC 원본과 내일(2026-10-14) 비교해서 같은 동작인지 확인한다. 회사 인증·.env·도구는 복사하지 않았다. 이 문서는 배포 승인이 아니다.

## 직접 확인 / 문서로만 / 미확인

| 구분 | 결과 |
| --- | --- |
| 직접 확인 | Node22.23.3에서 신규 가짜 검사40개 통과. 실제 CLI15.33.0의 projects:list 코드에 가짜 전송 함수를 연결한6가지 검사도 통과 |
| 직접 확인 | 실제 읽기 전용 진입점을 projects:list로1회 실행. 안전한 not-logged-in 상태로 종료. 로그인/자동 ADC/실제 프로젝트 목록 조회로 진행하지 않음 |
| 문서로만 | 회사 도구11종 검사, 개발 Blaze/예산/API/IAM/DB 준비, 이전 함수/Run/예약0개. 집의 현재 클라우드 사실로 바꾸어 적지 않음 |
| 미확인 | 인증 후 실제 조회 성공, 원본 동일성, 현재 서버 빈 상태, 실제 배포/예약/권한/비용/앱 로그인 |

은행 비유: 허용 업무만 창구로 보내는 문지기와 원문을 보여주지 않는 가림막을 가짜 서류로 검사했다. 실제 창구 조회는 집 출입증이 없어 멈췄다. 가짜 검사 통과를 실제 서버 확인으로 대신하지 않는다.

## 파일과 실행 범위

- tools/firebase-guard/request-policy.cjs: 기본 거부 요청 정책. 호스트/메서드/경로/query/body/응답으로 받은 일회성 업로드 주소를 검사한다. 첫 거부·오류 이후 후속 요청도 차단한다.
- cli-bridge.cjs: CLI Client.request에서 인증 갱신 전에 검사하고 재시도0/redirect:error를 적용한다. 인코딩 뒤 전송 body도 다시 비교한다. CLI logger를 닫고 인증 캐시 변경은 메모리에서만 처리한다.
- network-guard.cjs: 검사된 fetch만 전송. 직접 http/https/http2/socket/worker/자식 실행은 차단한다. 30초 전송 제한, 리다이렉트·HTTP오류·전송 예외 후 중단한다.
- privacy.cjs / privacy-preload.cjs / file-guard.cjs: stdout/stderr 원문 전부 폐기, 고정 상태만 허용. 기본·사용자 지정·회전 로그를 포함해 읽기/가짜 실행 중 파일 쓰기 전부 차단한다. .env 읽기도 차단한다. preload는 가짜 자식 검사 전용이며 실사용 로그인 도구가 아니다.
- run-readonly.cjs: Node22/고정 CLI 소스 확인 후 projects:list 또는 개발 functions:list만 실행 가능. 실제 명령 실행은 이번에 projects:list1회뿐이다. functions:list는 함수 두 세대만 확인하며 Run/Scheduler 전체 빈 상태 검사로 쓰면 안 된다.
- deploy-guard.cjs: 이후 별도 승인된 정확한 명령·비공개 계획을 검사하는 정책 모듈. **실제 deploy/login 실행 진입점은 열지 않았다.** 이 모듈 단독으로 원본 CLI를 실행하면 보호되는 것이 아니다.
- source-check.cjs / source-fingerprints.json: 설치한 firebase-tools15.33.0의 관련 소스16개 SHA-256 고정. CLI/의존성 전체의 무결성 보증은 아니다.
- selftest-cli.cjs: 실제 CLI 소스를 가짜 서버에 연결하는 오프라인 검사. 실인증 저장소를 첫 읽기 전에 가짜 메모리 저장소로 바꾸고 실제 fetch를 사용하지 않는다.
- tests/firebase-guard-*.test.js: npm test에 포함되는40개 검사. 임시 파일·가짜 계정·가짜 토큰만 사용한다.

현재 로그인용 파일 쓰기 예외를 두지 않았다. 읽기 전용 파일 차단을 해제해 로그인에 재사용하면 안 된다. 사용자 직접 로그인 단계는 별도 승인 후 인증 저장과 브라우저 열기만 허용하는 전용 경로를 추가·가짜 검증하고 진행한다. 배포 연결도 함수 탐색 자식/임시 묶음/사전 확인 요청을 검증한 뒤에만 가능하다. **현재 도구로 배포 준비가 모두 끝났다고 판단하지 않는다.**

## 허용 요청의 CLI15.33.0 근거

아래 위치는 저장소 밖에 설치한 공식 npm 패키지 firebase-tools@15.33.0의 상대 경로/행이다. 원본 소스를 직접 읽었고 관련 지문은 source-fingerprints.json에 기록했다. credential 상수의 값은 옮기지 않았다. P는 budae-kiugi-dev, R은 asia-northeast3, N은 향후 비공개로 검토할 개발 프로젝트 번호다. 실제 N/이메일/토큰/서명URL은 문서에 쓰지 않는다.

| 메서드·호스트·경로 | 허용 조건 / 근거 |
| --- | --- |
| GET firebase.googleapis.com /v1beta1/projects | pageSize1~1000, 선택 pageToken만. lib/management/projects.js:294(getProjectPage),315(getFirebaseProjectPage),343(listFirebaseProjects); 공식 명령 lib/commands/projects-list.js:44, lib/command.js:266(runner). 페이지 누락 없이 공식 루프 사용 |
| GET firebase.googleapis.com /v1beta1/projects/P | inventory/deploy 모드에서 개발만. lib/management/projects.js:373(getFirebaseProject) |
| POST www.googleapis.com /oauth2/v3/token | 기존 인증 갱신만. refresh_token/client_id/client_secret/grant_type/scope5개, CLI 내장 OAuth클라이언트와 비교. scope 빈 문자열도 소스상 정상. lib/auth.js:549~607(refreshTokens), lib/apiv2.js:46~55(getAccessToken). 신규 로그인 코드 교환은 불허 |
| GET cloudfunctions.googleapis.com /v1/projects/P/locations/-/functions | inventory/deploy에서 개발만. lib/gcp/cloudfunctions.js:188~211(list/listAllFunctions) |
| GET cloudfunctions.googleapis.com /v2/projects/P/locations/-/functions | filter=environment="GEN_2", 선택pageToken만. lib/gcp/cloudfunctionsv2.js:100~124(listAllFunctions/listFunctionsInternal) |
| GET run.googleapis.com /v1/projects/P/locations | 개발 지역 목록만. lib/gcp/run.js:170(listLocations). 이것은 서비스 전체 조회가 아님 |
| POST cloudfunctions.googleapis.com /v2/projects/P/locations/R/functions:generateUploadUrl | deploy 정책·검토된 계획 필수, 빈 body. lib/gcp/cloudfunctionsv2.js:65~73 |
| PUT storage.googleapis.com /응답에서받은정확한경로?정확한query | 바로 위 허용 요청의 성공 응답에서 받은 HTTPS주소만 메모리에 등록, stream업로드·완료 후 소진. lib/gcp/storage.js:54~71(upload). 다른 호스트/임의 URL/바뀐 서명/query는 거부 |
| POST cloudfunctions.googleapis.com /v2/projects/P/locations/R/functions?functionId=정해진이름 | 사용자6·관리자1·예약2의 최초 생성만. body는 사전에 검토된 계획과 전체 일치, nodejs22·min0·사용자max2/나머지max1·비공개concurrency1·예약internal·실행계정 일치. lib/gcp/cloudfunctionsv2.js:75~93(createFunction). CLI가 추가하는 GOOGLE_NODE_RUN_SCRIPTS/FUNCTION_TARGET/LOG_EXECUTION_ID도 실제 계획에 반영해야 함 |
| GET cloudfunctions.googleapis.com /v2/성공응답의operation명 | 위 생성 응답이 발급한 개발/서울operation명만, 임의poll불가. lib/gcp/cloudfunctionsv2.js:createFunction 반환, lib/operation-poller.js:pollOperation의operationResourceName 사용 |
| POST serviceusage.googleapis.com /v1beta1/projects/N/services/{pubsub.googleapis.com 또는 eventarc.googleapis.com}:generateServiceIdentity | 계획에서 명시적 opt-in된 두 관리형 서비스만, body{}. lib/gcp/serviceusage.js:25~46. API활성/일반계정 생성은 불허 |
| GET serviceusage.googleapis.com /v1beta1/성공응답의operations/이름 | 직전 허용 생성 응답의 미완료operation만. 위generateServiceIdentityAndPoll과operation-poller 근거. 예상 구조 밖이면 차단하고 재검토 |
| POST run.googleapis.com /v1/계획의정확한서비스명:setIamPolicy | 개발/서울·일반6개 allUsers 또는 예약2개 승인기본실행주체1개, roles/run.invoker만, etag빈값/version3/updateMask정확일치. 관리자 전부 불허. lib/gcp/run.js:92~130(setIamPolicy/setInvokerCreate), lib/gcp/proto.js:59~84(fieldMasks) |
| POST cloudscheduler.googleapis.com /v1/projects/P/locations/R/jobs | 정확한계획body와 작업2개, Asia/Seoul, 재시도0/6/12/18시·정리03시, POST/OIDC주체·URI·retryCount2 일치. lib/gcp/cloudscheduler.js:23~29(createJob),118~174(jobFromEndpoint). PATCH/DELETE/수동run불허 |

호스트 출처는 lib/api.js 각 *Origin 함수, API버전은 위 gcp 모듈의 Client 생성부다. 요청 인코딩·FormData·fetch 위치는 lib/apiv2.js:144~179,214~322. 파일 로그 근거는 lib/logger.js:56~180(FIREBASE_DEBUG_PATH·회전·useFileLogger). 함수 탐색 자식 출력 근거는 lib/deploy/functions/runtimes/node/index.js:129~137.

동적 URL은 신뢰된 성공 응답을 먼저 받아야 하며 호스트 전체를 개방하지 않는다. 알려지지 않은 사전 점검 GET·테스트권한POST·새전송방식도 기본 거부다. **위 표는 전체 deploy가 막힘 없이 끝난다는 목록이 아니다.** 실제 서버 읽기/계획 검토 전 배포 관련 정상 요청을 추가로 추측 허용하지 않는다. 새 요구는 고정 CLI 소스 근거와 가짜 허용/거부 검사를 추가한 뒤 검토한다.

## 검사와 재현

저장소 루트의 PowerShell, Node22 프로세스에서 실행한다. CLI 경로는 사용자 폴더 변수를 사용하며 Git에 개인 경로를 박지 않는다.

~~~powershell
$taskCli = Join-Path $env:LOCALAPPDATA 'BudaeKiugiTools/firebase-15.33.0/node_modules/firebase-tools'
node --test tests/firebase-guard-*.test.js
foreach ($taskMode in @('normal','refresh','error','unknown','warning','file')) { node tools/firebase-guard/selftest-cli.cjs $taskCli $taskMode; if ($LASTEXITCODE -ne 0) { throw 'Offline guard test failed' } }
~~~

로그인 승인 전 임의 Firebase 명령을 실행하지 않는다. 인증 후 별도 읽기 확인에 사용할 진입점:

~~~powershell
node tools/firebase-guard/run-readonly.cjs $taskCli projects:list
~~~

| 검사 묶음 | 직접 확인한 내용 |
| --- | --- |
| 요청 | 정상 조회·페이지·인증 갱신 허용, 허용9개 생성/6개 공개/2개예약 정책 후보 통과 |
| 전송 전 거부 | 다른 프로젝트/지역/런타임/함수·API활성·IAM·주제·비용·정리·관리자Invoker·예약공개·변형body/query/URL거부. 가짜 전송 카운터0, 이후 정상 요청도 차단 |
| 응답/업로드 | 정확한 동적URL/operation만 허용, 임의URL·변경query·리다이렉트·403·예외 중단 |
| 출력 | 가짜URL/세션/이메일/토큰/오류/스택/ANSI/모든분할경계/Buffer/긴출력/미완성조각 폐기. 원문의 성공문장/JSON으로 로그인완료 위조 불가 |
| 파일/자식 | 기본/사용자경로/회전 로그·sync/async/promise/stream/fd쓰기 생성 전 거부. 가짜 자식 stdout/stderr/console/throw/rejection과 로그 차단. 보호 없는 자식/worker실행 거부 |
| CLI 연동 | 실제CLI 소스의 정상2페이지/가짜토큰갱신/403/미등록요청/경고/logger파일 경로6가지 오프라인 검사. 원문 없는 고정 상태만 출력 |
| 버전/입력 | 고정CLI소스 변경·잘못된command·배포인수 변형 거부. Node22만 실사용 진입 허용 |
| 실제 읽기 | projects:list1회는 not-logged-in. 인증 후 성공 검증 미완료, 로그인 자동 실행 없음 |

전체 테스트/빌드 최종 수치는 검증결과.md와 작업일지에 기록한다. 오프라인6개는 npm test40개와 별도이며 숨겨진 skip으로 전체 통과 수에 넣지 않는다.

## 한계·중단·되돌림

- Node 프로세스 안의 알려진 CLI 전송/출력 경로를 보호한다. 악성 네이티브 모듈·이미 탈취된 PC를 격리하는 OS 샌드박스/방화벽은 아니다. 원본 CLI를 별도로 켜면 보호되지 않는다.
- 파일 쓰기 전부 차단은 현재 읽기 모드의 의도다. 로그인 인증 저장·배포 임시 ZIP/탐색 자식은 아직 연결하지 않았다. 인증 후 실제 네트워크 호환성도 미확인이다.
- 현재 새 경고는 모두 중단한다. Node22 아닌 진입은 node-mismatch, 나머지 CLI 경고는 warning-stopped다. 회사 SDK/Node 메시지별 세부분류와 동일하다는 보장은 없다.
- 실패 후 차단을 해제해 다시 보내지 않는다. 이미 보낸 요청이나 서버 내부 작업을 되돌릴 수 있다는 뜻도 아니다. raw debug를 켜 원인을 찾지 말고 소스와 가짜 자료로 재현한다.
- 지금 클라우드 변경은 없다. 위험 발견 시 도구 사용을 멈추고 해당 코드 커밋만 되돌릴 수 있다. 실제 클라우드 삭제/로그아웃/비용 변경은 하지 않는다.
- 로그인·.env·배포는 각각 별도 승인. 사용자 다음 행동은 **로그인 준비 단계로 진행할지 결정하는 것 하나**이며 지금 값을 보내거나 로그인하지 않는다. 실제 조회 성공과 전체 빈 상태 재확인 전 배포 명령 확정 금지.

방침11·약관8·광고테스트ID·게임저장키/형식38 유지. 새 앱SDK/권한/서버 기능/사용자수집 변경 없음. 공개정책의 기존 미완료 항목은 그대로다.

정책 영향 없음.
