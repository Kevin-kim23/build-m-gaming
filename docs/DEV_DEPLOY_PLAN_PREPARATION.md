# 개발 배포 계획·실행기 준비 · 0.83.13

2026-10-13. 제작·가짜 검증 승인만 받았다. **배포 승인이 아니며 실제 클라우드 전송 0회.** 운영/비용 보호/관리자 Invoker/앱 로그인/방침11·약관8 변경 없음. 회사 PC 원본과 내일 비교 예정이며 **원본과 동일 보증 없음**.

은행 비유: 전표 양식이 계획서이고, 승인된 전표를 한 장씩 처리하는 창구가 실행기다. 계좌 정보는 전표 양식에 인쇄하지 않는다. `allowlist`는 명시된 요청만 통과시키는 허용 목록이다.

## 직접 확인함 / 문서로만 / 미확인

|구분|이번 결과|
|---|---|
|직접 확인함|설치된 firebase-tools 15.33.0 소스로 외부 전송 없이 실제 요청 생성 부분 실행. 함수9개 주요 설정 일치. 요청33개를 가짜 응답으로 도출하고 자리표시자 템플릿과 재비교. 실제 CLI 전송 계층·인증 갱신·파일/네트워크/출력 보호도 가짜 transport로 검증|
|문서로만|회사 PC의 서버 빈 상태·서울 DB/색인 확인 기록. 회사 원본 도구 동작과의 동일성은 보증하지 않음|
|미확인|집 PC Cloud Run/Scheduler/DB/색인 실제 상태, 실제 배포·IAM·예약 실행·관리자 외부 거부·테스트 계정 로그인/저장/삭제, 실제 업로드 및 비공개 값 연결|

Cloud Run `region-identity` 실패는 기존 지시대로 배포 후 확인으로 보류한다. 추가 실제 조회와 읽기 허용 확대 없음. 배포 후에도 거부되면 사용자 콘솔 화면으로 대체하거나 검사 변경을 별도 승인받는다. 전체 0개로 기록하지 않는다.

## 추측 대신 실제 CLI로 도출한 방법

`tools/firebase-guard/capture-deploy-offline.cjs`를 독립 Node22 프로세스에서 실행한다. 기존 CLI 소스 지문과 추가15개 지문(`deployment-source-fingerprints.json`)을 확인한다. 실제 인증 저장소를 읽기 전에 빈 메모리 저장소로 대체한다. 네트워크·자식 프로세스·파일 쓰기·환경 파일 읽기를 차단하며 stdout/stderr 원문을 버린다.

1. 실제 서버 SDK `runtime/loader.js:loadStack`와 `runtime/manifest.js:stackToWire`를 사용한다. 최초 실험에서 wire 변환 누락으로 ADMIN 비교가 실패했고, 공식 SDK bin의 변환 단계를 그대로 적용해 수정했다. 실제 서버 설정 불일치가 아니라 도출 도구의 변환 누락이었다.
2. CLI `lib/deploy/functions/runtimes/discovery/v1alpha1.js:buildFromV1Alpha1`, `build.js:envWithTypes/toBackend`, `prepare.js:resolveCpuAndConcurrency` 및 Node `parseRuntimeAndValidateSDK.js:getRuntimeChoice`를 실행한다. 런타임은 실제 firebase.json/package.json에서 선택한다. 필수 관리자 실행 계정은 가짜 값, 호출 허용2항목은 빈 값이다. 프로젝트/지역/런타임/함수 집합/최대 인스턴스/실행 계정/공개 범위/예약이 다르면 계획서 생성 전에 중단한다.
3. `lib/functions/env.js:loadFirebaseEnvs`로 Firebase 환경 형식을 만들고 `lib/deploy/functions/deploy.js:uploadSourceV2` 및 `lib/deploy/functions/release/fabricator.js:createV2Function/upsertScheduleV2`를 실행한다. SDK 파라미터와 upload/operation/service URI 등은 가짜 응답만 사용한다.
4. 실제 `apiv2.Client.request`의 인증·소켓 실행 직전에서 가로채고 `cli-bridge.cjs:requestFromClient`로 주소/방식/본문을 메모리에 수집한다. HTTP GET/POST 문자열을 추측해 직접 조립한 요청 목록이 아니다. 생성 부분 실행이며 CLI 전체 `firebase deploy` 실행을 의미하지 않는다. API 활성화/IAM 준비/이미지 정리 등의 CLI 전체 사전·사후 절차는 실행하지 않는다.
5. `deployment-template.cjs`가 가짜 식별자·응답 위치를 슬롯으로 바꾼다. Git에는 `deployment-template.json`의 전체 비개인 요청 양식만 저장한다. actual ID/메일/계정 숫자는 없음. 재도출한 양식이 한 항목이라도 다르면 실행 전 중단한다.

가짜 응답은 정상 생성·예약 없음(404)·기본 실행 계정 조회를 가정한다. 실제 클라우드가 동일한 응답을 준다고 보증하지 않는다. 기본 실행 계정의 실제 값은 승인된 읽기로 확인해야 하며 CLI의 추정 fallback을 실제 값의 근거로 사용하지 않는다.

## 요청 전체 양식과 근거

전체 본문·순서: `tools/firebase-guard/deployment-template.json`. 아래 표의 슬롯은 실제 값을 쓰지 않은 이름이다. 재시도/업데이트/삭제/API 활성화/프로젝트 전체 IAM/Artifact Registry 정리 정책은 양식에 없다.

|건수|호스트·방식·경로 모양|CLI 15.33.0 근거|
|---|---|---|
|1|cloudfunctions.googleapis.com POST `/v2/projects/{dev}/locations/{seoul}/functions:generateUploadUrl`|gcp/cloudfunctionsv2.js:generateUploadUrl; deploy/functions/deploy.js:uploadSourceV2|
|1|storage.googleapis.com PUT `{그 생성 응답의 정확한 일회용 업로드 URL}`|gcp/storage.js:upload|
|9|cloudfunctions.googleapis.com POST `/v2/projects/{dev}/locations/{seoul}/functions?functionId={정확한 이름}`|gcp/cloudfunctionsv2.js:functionFromEndpoint/createFunction|
|9|cloudfunctions.googleapis.com GET `/v2/{직전 생성 응답의 operation}`|operation-poller.js:getPollingTask; release/fabricator.js:createV2Function|
|8|run.googleapis.com POST `/v1/{이번에 생성한 정확한 service}:setIamPolicy`|gcp/run.js:setInvokerCreate/setIamPolicy; release/fabricator.js:createV2Function|
|1|compute.googleapis.com GET `/compute/v1/projects/{비공개 프로젝트 번호}`|gcp/computeEngine.js:getDefaultServiceAccount|
|2|cloudscheduler.googleapis.com GET `/v1/projects/{dev}/locations/{seoul}/jobs/firebase-schedule-{예약 함수}-{seoul}`|gcp/cloudscheduler.js:getJob/createOrReplaceJob|
|2|cloudscheduler.googleapis.com POST `/v1/projects/{dev}/locations/{seoul}/jobs`|gcp/cloudscheduler.js:jobFromEndpoint/createOrReplaceJob|

compute GET와 정확한 Scheduler 작업 GET은 **이번 도출로 확인한 배포 흐름의 후보 요청**이다. 기존 읽기 전용 실행기의 허용 범위를 넓히지 않았다. 실제 사용은 이 계획 전체에 대한 별도 최종 승인 후에만 가능하다. 필요하면 사전 읽기 승인을 별도로 받고 비공개 값을 준비한다. 새 API 활성화나 더 넓은 읽기가 필요하면 멈춘다.

운영 계정·인증 토큰 조회는 없다. 인증 갱신은 기존 가드에서 승인한 정확한 Google 토큰 경로만 쓰며 메모리에서 처리한다. 코드 업로드는 Git의 깨끗한 승인 기능 브랜치 커밋에서 `server` 루트 JS/JSON과 `src` JS(서버 game 복사본)를 읽어 메모리 ZIP으로 만든다. `.env`, 인증 파일, 개인 저장, 원본 에셋, node_modules는 넣지 않는다. 무시된 game 복사본과 커밋의 코드가 다르면 중단한다.

## 함수 설정 비교

|대상|런타임/지역|실행 계정|최대 인스턴스/동시 요청|공개 범위|
|---|---|---|---|---|
|readProfile/createProfile/readCloudSave/saveCloudProgress/reportNickname/deleteGameAccount|Node22/서울|개발 시험의 기본 실행 계정|각2/80(CLI 도출 기본값)|각 서비스에만 allUsers의 run.invoker|
|moderateNicknames|동일|전용 moderation-runtime|1/1|private; Invoker 추가 요청 자체가 없음|
|retryAccountDeletions/purgeExpiredServerRecords|동일|개발 시험의 기본 실행 계정|각1/1|ALLOW_INTERNAL_ONLY; 기본 실행 계정만 예약 호출 권한|

모두 CLI 도출 메모리256Mi/CPU1. 관리자 timeout60초, 예약300초. 일반 함수의 timeout/minInstances/serviceAccount는 CLI가 `null`로 보내는 기본값 재설정이며 명시적인0/계정 이메일로 임의 변환하지 않는다. 이전 `request-policy.cjs`의 배포 초안은 명시0/계정만 예상해 이 실제 요청을 거부하므로 그대로 재사용하지 않는다. 기존 허용 범위는 변경하지 않고 새 실행기는 정확한 템플릿·순서·응답 결합 검사로 제한한다. 운영에서는 역할별 실행 계정 분리 별도 승인 필수.

예약: 삭제 재시도 `0 0,6,12,18 * * *`, 정리 `0 3 * * *`, 시간대 Asia/Seoul. 처리 실패용 Scheduler 설정 retryCount2/minBackoff360초/maxBackoff720초/maxDoublings1/maxRetry0은 기존 서버 설정이다. **배포 요청 실패를 자동 재시도한다는 뜻이 아니다.**

## 실행기와 마지막 승인

`run-deployment.cjs`는 별도 최종 승인 전 실행하지 않는다. 아직 실행 명령을 사용자에게 안내하지 않았다. 입력은 외부 CLI 경로와 저장소/동기화 폴더 밖 비공개 조회 결과 파일이다. 파일에는 PROJECT_NUMBER/DEFAULT_RUNTIME/FIREBASE_CONFIG 세 항목만, 실제 값은 채팅/로그/Git에 기록하지 않는다. 관리자 실행 값은 사용자가 만든 개발 `.env`에서 메모리로만 읽고, 호출 허용2항목은 비어 있어야 한다. 이 비공개 조회 파일은 아직 만들지 않았다.

도출 재검증 → 깨끗한 기능 브랜치·원본 코드 ZIP 확인 → 비공개 값 검증 → TTY에서 사람이 정확한 확인 문구 입력 → 인증 읽기와 전송기 설치 → 요청을 한 장씩 처리한다. 명령 인자/환경 변수로 확인 문구를 대신 넘기지 않는다. 확인 문구 없는 핵심 실행기·비대화형 확인 거부는 가짜 시험에서 전송0회를 확인했다. 최종 승인 표시가 사전 클라우드 준비 승인까지 대신하지 않는다.

`deployment-session.cjs`는 템플릿 변경/함수 추가·누락/중복 mutation/순서 변경을 거부한다. operation/service/URL은 이번 승인 요청 응답에서만 채운다. 생성 완료 응답에서 프로젝트·함수·Node22·최대 인스턴스·실행 계정·예약 내부 수신을 비교한다. 실제 응답 모양이 다르면 넓히지 않고 중단한다. 예약 GET의 정확한404만 '없음'으로 처리한다.200이면 기존 작업이므로 덮어쓰지 않는다. 다른404/HTTP오류/리디렉션/통신오류는 중단한다.

성공했지만 생성 중인 operation만5초 간격 최대360회 확인한다. 이는 성공 응답의 진행 상황 조회이며 오류 후 재시도가 아니다. 작업 생성·업로드·IAM·예약 생성은 각각1회만 전송한다. 소스 ZIP은 메모리 해시를 전송 전에 다시 확인한다. 원문 stdout/stderr·파일 로그·직접 네트워크·자식 프로그램은 기존 보호 계층으로 막는다.

## 실패와 되돌림

추가 작업 중단 → **확정된 생성 종류·개수와 생성 여부 불확실 표시** 보고 → 생성된 예약 일시정지 → 코드 복구 → 삭제는 별도 승인 순서다. 예약 일시정지는 클라우드 변경이므로 현재 실행기가 자동으로 수행하지 않는다. 이 계획에는 pause/delete 권한도 없으며 실제로 필요할 때 사용자에게 즉시 콘솔 일시정지를 요청한다. HTTP 응답이 끊기면0개 생성됐다고 단정하지 않는다.

자동 삭제·자동 배포 재시도·업데이트·API 활성화·전체 권한 변경·이미지 삭제 정책 질문에 응답하는 기능이 없다. 일부 배포 뒤 재실행하면 기존 자원 충돌에 멈추며 별도 복구 계획이 필요하다. 이번 작업은 서버 변경이 없어 클라우드 롤백 불필요, 기능 브랜치의 준비 코드만 되돌릴 수 있다.

## 검증

- 가짜 계획 검사33개: 정상33개·승인없음0개·추가/누락/다른 프로젝트/지역/런타임/최대 인스턴스·업데이트/삭제/API/IAM/정리정책/중복·관리자공개/예약공개·오류/부분 생성·기존 예약·업로드 주소 거부.
- 실제 CLI 전송 계층 가짜8종: 정상/토큰갱신/승인없음/응답오류/부분생성/파일로그/여러조각 원문출력/자식프로그램. 원문은 출력하지 않았고 외부 전송0회.
- 실제 업로드/배포·예약 실행·IAM 효과는 이 합성 시험으로 확인되지 않는다. 실서버 검증은 미완료다.
- 전체1115/1115(실패·건너뜀0)·가드177/177·신규계획33/33·실제CLI 합성8종 통과. 요청33개 재도출/템플릿 일치, 합성TTY 확인 성공. 웹빌드 성공(기존 고지 청크 용량 경고). 신규12파일 개인정보 패턴0. 실제 클라우드 전송0회.

다음 사용자 행동 하나: 이 계획의 **요청 범위와 미확인 항목을 검토**한다. 현재 답변은 배포 요청이 아니며, 필요한 비공개 값 준비 및 최종 승인은 별도 단계다.

정책 영향 없음. 방침11·약관8 유지. 공개 방침/Play 양식의 기존 출시 전 동기화 과제는 여전히 남아 있다.

## 편집자 축소·Pub/Sub/Eventarc 읽기 검토 · 2026-10-13

설정 변경 없이 소스와 공식 문서를 읽었다. server/index.js: 사용자 callable6개 공통 guard는 Auth getUser를 호출하며 탈퇴는 deleteUser를 호출한다. server/database.js: Firestore 트랜잭션/문서 읽기·쓰기·삭제·쿼리. server/maintenance-runtime.js: 삭제 재시도 deleteUser, 만료 정리도 getUser로 Auth 계정 존재 확인. 따라서 정리 함수가 Auth 권한을 전혀 쓰지 않는다고 가정하면 안 된다.

권장 초안(적용 미승인): 개발 공유 실행 계정에 필요한 Firestore 데이터 접근과 Auth 사용자 조회/삭제만 부여하는 별도 맞춤 역할을 검토한다. 후보는 datastore.databases.get, datastore.entities.get/list/create/update/delete, firebaseauth.users.get/delete다. 정확한 SDK 보조 권한·리소스 범위와 실제 동작은 아직 검증하지 않았으므로 최소권한 검증 완료라고 표시하지 않는다. roles/datastore.user는 편리하지만 더 많은 조회 권한을 포함하고, roles/firebaseauth.admin은 사용자 생성·설정 변경 등 불필요한 권한도 포함하여 최소 대체안으로 단정하지 않는다. 관리자 전용 역할에는 Auth 권한을 추가하지 않는다. 개발8개가 같은 계정을 쓰면 Auth 삭제 권한도 공유되므로 함수별 격리는 보장되지 않는다. 운영 담당별 분리는 기존 별도 승인 조건을 유지한다.

Editor를 먼저 제거하면 안 되는 추가 이유: deployment-template.json의 buildConfig에는 빌드 serviceAccount가 명시되지 않는다. Cloud Functions API 빌드는 프로젝트의 기본 빌드 계정을 사용하고 Compute 계정이 그 역할을 겸할 수 있다. IAM 화면의 Legacy Cloud Build 계정 존재만으로 실제 선택 계정을 확정할 수 없다. 공식 Cloud Functions 빌드 안내에는 이 API 경로에서 Compute 빌드 계정 권한 대안으로 roles/cloudbuild.builds.builder가 제시된다. Cloud Run API source deploy의 roles/run.builder 안내와 혼동하지 않는다. 이번에는 어떤 빌드 역할도 부여하지 않는다.

순서: 실제 기본 빌드 계정 읽기 확인 → 맞춤 실행 권한과 필요한 빌드 권한/분리 여부 제안 → 사용자 별도 승인 → 필요한 역할 부여·검증 후 Editor 제거. 실제 IAM 변경 승인 전 실행하지 않으며, 잘못된 축소 복구는 승인된 이전 역할 연결 복원으로 다루고 계정 삭제·Owner 추가로 대체하지 않는다. 역할 변경만으로 모든 조건을 검증할 수 없고 테스트 계정 실동작 확인도 후속 필요하다.

Pub/Sub/Eventarc: 이번9개 생성 템플릿에는 eventTrigger가 없고 예약2개는 httpTarget이다. 따라서 코드 기능 자체의 이벤트 전달을 위해 두 서비스 에이전트를 새로 만들 근거는 확인되지 않았다. 단, 설치된 firebase-tools15.33.0 lib/deploy/functions/prepare.js:661~672는 gcfv2가 있으면 두 API 준비·generateServiceIdentity를 공통 수행한다. gcp/serviceusage.js:25~28의 POST /v1beta1/projects/{project-number}/services/{service}:generateServiceIdentity는 쓰기 요청이며 현재 제한 계획에 없다. 표준 firebase deploy로 몰래 대체하거나 요청을 허용하지 않는다. 기존 제한 실행기는 이 사전 절차를 실행하지 않으며 실제 Cloud Functions API가 요구할 프로젝트 사전 조건 충족은 미확인이다. 두 계정이 사진에 없다는 이유만으로 생성하지 않는다. API 활성화 여부·필요성·생성 권한을 분리 확인하고 필요하면 범위를 명시해 별도 승인한다. 실패 위치/성공은 실제 검증 전 단정하지 않는다.

공식 근거(2026-10-13): https://docs.cloud.google.com/firestore/native/docs/security/iam ; https://docs.cloud.google.com/iam/docs/roles-permissions/firebaseauth ; https://docs.cloud.google.com/functions/docs/building ; https://docs.cloud.google.com/build/docs/cloud-build-service-account-updates ; https://firebase.google.com/docs/functions/schedule-functions . 설치 CLI 소스는 직접 확인, 클라우드 현황은 사용자 제공 화면 범위만 확인, 기본 빌드 계정·두 에이전트 실존·축소 후 동작은 미확인이다.

다음 사용자 행동 하나: 개발 Cloud Build 설정 화면 열기만 요청. API 사용/역할 저장/빌드 실행은 누르지 않는다. 화면이 예상과 다르면 추측하지 않고 안내를 멈춘다. 은행 업무 직원과 프로그램을 포장하는 제작 담당자가 같은 신분증을 쓰는지 확인하는 단계. 클라우드 API 호출·설정 변경·배포 없음. 문서만 변경, 버전·방침11·약관8 유지, 테스트·빌드 재실행 없음. 정책 영향 없음.

## 기본 빌드 계정 읽기 승인 보완 · 0.83.14

개발 서울 Cloud Build 기본 계정 GET 한 경로를 전용 build-account 모드에 추가. 다른 프로젝트/지역/호스트/쿼리/본문/쓰기 거부, 전송 시작 1회 제한, 오류 후 재시도 없음. 기존 로그인 인증 갱신만 유지. 응답의 정확한 리소스 이름과 문서화된 계정 형식을 검사하고 compute/legacy-cloud-build/none 고정 분류만 출력. 알 수 없는 응답은 실패로 중단. 원문·이메일·번호 저장 없음. 실제 조회는 전체 테스트·빌드 통과 후 승인된 1회만 예정. 설정 변경·배포 미승인. 방침11·약관8 유지. 정책 영향 없음.

근거(2026-10-13): https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.locations/getDefaultServiceAccount . GET cloudbuild.googleapis.com /v1/projects/budae-kiugi-dev/locations/asia-northeast3/defaultServiceAccount, 본문/쿼리 없음. 기존 설치 CLI15.33.0 소스 검증을 유지하고 apiv2.Client를 기존 cli-bridge/network/file/privacy 가드로 연결한다. 배포/인벤토리/프로젝트 목록 모드에는 이 요청을 열지 않는다. 반환 serviceAccountEmail은 문서상 projects/{project}/serviceAccounts/{identity} 형태이며 bare email이나 다른 형태는 넓게 허용하지 않는다. 누락 필드도 실패 처리한다. 가짜 selftest는 인증 저장소 첫 읽기 전에 메모리 합성 값으로 대체하고 실제 네트워크 전송기를 주입하지 않는다. 초기 정상 테스트 실패1개를 재현 후 수정, 현재17/17·가짜8종 통과. 실제 조회와 빌드 결과는 후속 기록한다.

검증 결과: 새 단위17/17, 가드194/194, 설치CLI15.33.0 합성8종 통과. Node22 npm test 종료0·실패0·취소0·건너뜀0(약143초), npm run build 종료0(기존 라이선스 고지 청크 용량 경고). 전체 테스트 총수는 이번 출력에서 보존하지 않아 추산하지 않는다. 신규 파일 개인경로·토큰 패턴 검사 미검출(완전한 비밀 부재 보장은 아님). 실제 승인 명령은 1회만 실행: guard-ready → command-failed, 종료1. 기본 빌드 계정 미확인. HTTP 상태나 실패단계는 출력되지 않아 원인 판단 불가. 실제 대상 GET 전송 여부도 이 출력만으로 단정하지 않는다. 추가 재시도/허용 확대/인증파일 수정/클라우드 변경 없음. 기존 지시대로 여기서 중단. 다음은 고정 오류 진단 보완 여부를 사용자와 정하며 실제 재조회는 새 승인 전 금지. 정책 영향 없음.

## 실패 진단 해석 · 0.83.15

배포 요청 계획 및 허용 목록은 변경하지 않았다. deployment-request의 number는 이번 실행에서 시도하는 순번(성공한 작업 수가 아님)이다. deployment-stop의 phase는 preflight/offline-capture/private-input/source-archive/human-confirmation/transport-setup/execution 중 하나, kind는 caught-error/uncaught-exception/unhandled-rejection/runtime-warning 중 하나다. 이벤트는 고정 코드만 사용하고 예외 객체·메시지·스택은 출력하지 않는다.

guard-diagnostic은 기존 읽기 가드와 같은 보호 출력이다. guard-blocked는 가드 차단, transport-failed는 통신 오류 분류, http-response는 숫자 상태, validation-failed/response-shape는 반환값 검사 실패다. 요청마다 진단 상태를 초기화하므로 정상적으로 예상한 Scheduler 404 이후의 실패도 진단 가능하다. 진단은 허용 판정·중단 동작을 바꾸지 않는다. HTTP200만으로 함수 생성 성공을 뜻하지 않는다. 응답 검사 실패 때에도 원문은 저장하지 않는다. 출력만으로 원인을 확정할 수 없으면 추가 가짜 재현 또는 승인된 읽기 점검을 사용한다.

기존 사용자 직접 TTY 확인 문구 입력을 유지한다. 진단을 위해 확인 문구를 대신 입력하거나 비공개 값을 출력하지 않는다. 코드 진단 보완은 실제 배포 성공과 다르다. 실제 첫 오류에서는 중단하고, 허용 목록/IAM 변경이 필요한 경우 해당 범위의 별도 승인을 받는다. 기본 빌드 계정 추가 조사는 사용자 중단 지시대로 수행하지 않는다.

## 승인된 업로드 응답 검사 수정 · 0.83.16

사용자 승인 범위로 업로드 응답 generation 생략을 허용하고, 있으면 음이 아닌 int64 범위의 십진 문자열만 허용한다. 누락을 임의 숫자로 채우지 않고 그대로 전달한다. bucket/object 필수·추가 필드 거부·기존 주소 검사는 유지한다. upload-url/upload-source-fields/upload-source-format/upload-generation 고정 검사 이름으로 오류를 구분하고 원문은 출력하지 않는다. 새22개 테스트는 수정 전3통과/19실패(생략 정상 사례 및 진단 세분화 기대 실패), 수정 후22/22 및 기존 진단2/2 통과. 실제 과거 응답 원인과 재배포 성공은 미확인. 실제 재시도는 이번 수정 승인과 별개이며 실행하지 않는다. 버전0.83.16, 방침11·약관8 유지. 정책 영향 없음.

소스 근거: firebase-tools15.33.0 lib/gcp/cloudfunctionsv2.js:65-69 및 lib/deploy/functions/deploy.js:65-67. 공식 근거(2026-10-13): https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions/generateUploadUrl 및 https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions#StorageSource . 공식 생략 허용에 맞추되 generation 숫자형/음수/공백/소수/지수/범위초과는 거부한다. 부호 없는 정규 십진 문자열 또는 생략만 허용하며 알 수 없는 필드는 거부한다. 합성 계정과 가짜 업로드 주소만 검증에 사용한다.
