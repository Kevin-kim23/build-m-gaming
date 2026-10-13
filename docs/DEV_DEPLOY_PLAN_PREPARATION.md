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
