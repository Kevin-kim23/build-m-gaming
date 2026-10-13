# 4단계 · 개발 게임 함수9개 배포 진행 · 2026-10-13

## 사용자 직접 로그인으로 전환 · 2026-10-13

- 사용자가 AI의 --interactive 재시도를 보류하고 본인 PowerShell에서 직접 로그인하기로 결정했다. AI는 인증 명령을 실행하지 않는다. 명령은 한 번에 하나씩 안내하며 먼저 저장소 밖에 설치한 동일 Firebase CLI15.33.0의 --version을 원문 파일 로그 차단 도구와 함께 안내한다. Node/CLI/보호 도구 경로 존재와 패키지 버전15.33.0 직접 확인. 사용자 터미널 실행 결과는 미확인이다.
- Google 계정 선택/권한 동의/2단계 인증은 사용자 직접. 비밀번호/인증 코드/인증 링크를 채팅으로 요구하지 않는다. 사용자 로그인 완료 응답 뒤에만 읽기 전용 상태 확인을 한다. 이메일/토큰/인증 파일 내용은 출력하지 않고 로그인 여부 및 접근 가능한 프로젝트 ID만 보고하며 개발 프로젝트 접근 확인 뒤 멈춘다. 배포 승인은 별도다.
- 사용자 로그인 상태가 AI 환경에서 보이지 않으면 사실을 보고하고 --interactive 복귀 여부를 묻는다. 동일 PC라도 Windows 사용자 또는 CLI 설정 경로 차이 가능성을 값 노출 없이 확인하며 자격 증명을 복사하거나 설정 경로를 임의로 변경하지 않는다. 배포 완료 후 로그아웃 방법과 인증 상태 파일의 Git 제외 여부를 별도로 확인한다. 현재 인증 파일 내용은 읽지 않았고 해당 안전성 확인을 완료라고 쓰지 않는다.
- 은행 비유: 사용자가 직접 출입증을 발급받고 AI는 출입 가능 지점 이름만 확인한다. CLI는 명령으로 Firebase를 다루는 도구다. 게임/서버/클라우드 설정 변경 없음. 직전 전체 테스트938개/빌드 통과, 이번에는 문서만 변경한다. 정책 영향 없음.

## CLI 로그인 시도 후 중단 · 2026-10-13

- 사용자 승인으로 CLI15.33.0의 login --reauth만 실행했다. 명령은 종료0이지만 원격 로그인 안내 단계에서 끝났고 인증 완료는 확인되지 않았다. 브라우저 자동 로그인 창 대신 인증 링크와 짧은 세션 표식이 도구 출력에 나타났다. 기존 출력 보호가 이 형식을 놓쳤으며 해당 원문은 이 문서/Git에 복사하지 않는다. 인증 코드 입력·함수 배포·권한 변경·키 파일 생성은 하지 않았다.
- 직접 확인: CLI command.js가 AI 실행 환경 또는 비대화형 입력을 감지하면 원격 로그인으로 분기한다. 현재 환경의 AI 감지 결과 true. 정식 --interactive 옵션이 해당 분기를 덮어쓰는 구현도 확인했다. CLI 종료0을 로그인 성공으로 취급하지 않는다.
- 로컬 보완: 저장소 밖 출력 보호 도구에 로그인 전용 출력 제한을 추가했다. 원문은 전부 숨기고 미리 정한 완료/대기/오류 상태만 출력한다. 가짜 인증 URL·세션 표식·이메일·오류를 넣은 오프라인 검증 통과. 기존 원문 파일 로그 차단 유지, 저장소/도구 폴더 최상위 firebase-debug 파일 없음. 인증 저장소 내용은 열지 않았다. 실제 인증 완료/기존 자격 증명 유무는 미확인이다.
- 재시도 보류: 사용자에게 login --reauth --interactive로 로그인만 재시도할 승인을 요청한다. Google 계정 선택·동의는 사용자 직접, 비밀번호/인증 코드 채팅 전송 금지. 실제 배포는 별도 승인이다. 실패나 다른 화면이 나오면 멈춘다. 필요하면 대기 프로세스를 종료하고 로그인 창을 닫아 취소하며, 로그인 후 연결 해제는 별도 승인 아래 로그아웃한다.
- 은행 비유: 출입증 발급 안내까지만 진행했고, 실제 출입증 발급 완료를 확인한 것은 아니다. CLI는 컴퓨터에서 명령으로 Firebase를 다루는 도구다. 게임/서버 실행 코드·설정 변경 없음. 직전 npm test938/938·npm run build 성공 결과 유지, 이번 문서 변경으로 전체 검사를 반복하지 않는다. 문서 검사와 푸시 결과는 최종 보고한다.
- 이전 문서의 로그인 미실행 상태를 이 기록이 대체한다. 운영/비용 보호 연결/앱 로그인 시험 미실행. 방침11·약관8 유지. 정책 영향 없음(기존 공개 정책 대조는 별도 미완료).

- 마감 확인:0.83.1/7925f7e를 origin/feat/firebase-server-test로 푸시 성공. reportDedup 색인1개는 사용자 생성 후 사용 설정됨까지 직접 확인했다. 다음은 이 PC의 CLI15.33.0 로그인 방법 설명/승인과 사용자 직접 Google 로그인이다. 아직 CLI 로그인/함수 배포/Invoker 부여는 미실행이다.

최신 직접 확인: 사용자 4개 활성화 완료 응답 후 dev의 사용 설정된 API 목록에서 Cloud Build·Artifact Registry·Cloud Run Admin·Cloud Scheduler 모두 확인했다. Cloud Functions 포함 준비5개 활성 상태다. 실제 함수/예약 배포·로그인 시험·비용 보호 연결은 미실행이다. 다음은 공개 호출 금지 범위 확인: 일반 이용자6개의 인터넷 진입과 내부 Firebase 로그인/App Check 검증, 관리자1·예약2 비공개를 구분해 사용자에게 질문했다. 아직 답변/배포 승인이 아니다.

사용자 진행 방식 변경: 필요한 API 목록을 한 번에 안내받고 사용자가 직접 활성화 후 보고한다. 개발 프로젝트만, 이미 켜진 것은 건너뛰고 API 활성화만 한다. 우선 Cloud Build·Artifact Registry·Cloud Run Admin·Cloud Scheduler 4개를 안내한다. Cloud Functions는 활성 직접 확인, 나머지4개 완료는 아직 미확인. Eventarc는 공식 문서상 이벤트 트리거용 선택 항목으로 현재 HTTP/예약9개에 무조건 필수라고 안내하지 않으며, Firebase 배포 도구 요구 여부 확인 뒤 추가 안내한다. 함수/예약/저장소 생성·권한 변경·비용 보호 연결은 별도 승인 전 금지.


## 0.83.1 승인된 업로드 제외 보완 · 2026-10-13

- 사용자 승인: 일반 callable6개 인터넷 진입+Firebase 로그인/App Check/호출 제한, 관리자1·예약2 비공개로 구분한다. 실제 배포 승인은 별도다.
- 준비 API6개(Functions/Build/Artifact Registry/Run/Scheduler/Eventarc) 활성 직접 확인. Eventarc는 공식 일반 Run 문서에서는 선택이지만 Firebase CLI15.33.0의 prepare.js에서 gcfv2가 있으면 사용 설정을 요구하므로 추가 사용자 활성화 후 확인했다. 비용 보호 주제/트리거 생성은 없다.
- CLI15.33.0을 저장소 밖 work/firebase-deploy-tools에 공식 npm으로 설치했다(설치 스크립트 비활성). 앱 의존성 변경 없음. 종속 패키지 지원 종료 경고가 있었고 로그인/배포 실행은 없었다. CLI 로그 파일에 원문이 기록되는 구현을 확인해 개인정보 출력 차단 방법을 준비하기 전 실행하지 않는다.
- firebase.json의 game ignore에 .env와 .env.*만 추가했다. 게임/서버 실행 소스는 d4fcbd2 그대로지만 승인된 설정/검증/버전 변경으로 버전0.83.1이다. 비용 보호용 firebase.cost-control.json은 변경하지 않는다.
- 공식 근거: [환경 변수 파일과 프로젝트별 값 전달](https://firebase.google.com/docs/functions/config-env#environment_variables), [배포할 때 제외되는 Cloud Functions 파일](https://firebase.google.com/docs/cli#cloud_functions_files_to_ignore_on_deploy). 공식 문서는 .env/.env.<project> 값을 배포 환경 변수로 전달하고 ignore는 백엔드에 올릴 파일을 걸러내는 것으로 설명한다. 두 경로의 독립 동작은 아래 실제 CLI 검증으로 추가 확인했다.
- 재현: tools/verify-functions-upload.mjs에 CLI 패키지 폴더를 인수로 전달한다. 테스트용 임시 파일만 생성하고 CLI의 실제 prepareFunctionsUpload로 묶음을 만들고 열어 확인하며, loadUserEnvs로 설정 읽기를 별도 검증한다. 로그인/네트워크 배포/실제 로컬 값 읽기 없음.
- 수정 전: 기존 ignore는 .env 및 프로젝트 파일을 묶음에 넣어 재현 실패. 수정 후: .env/.env.* 제외, 실행 소스 유지, 로컬 값/프로젝트 값 읽기 유지, 빈 관리자 audience/subject 유지, .env.local 및 예시 값 미주입, 로컬 파일 내용 불변 모두 통과했다.
- .env.example도 .env.*에 해당하여 업로드에서 빠진다. Git의 !.env.example 예외와 예시 파일 내용은 유지됨을 따로 검증했다. 공개 예시가 배포 묶음에도 남는다고 보고하지 않는다.
- 실제 서버 파일명만 대조:209개에서208개로 변경, 로컬 env 포함 true→false, index.js 유지. 실제 값 출력 없음.
- 배포 전 콘솔 직접 확인: 개발 Cloud Run 서비스0개, Scheduler 작업0개. Firestore(default) 서울·데이터 추가 전 빈 화면, 전체 클라이언트 read/write if false 규칙 확인. 초기 1세대 목록 화면은 로딩 중 이동되어 전체 구형 함수 부재는 아직 확정하지 않았다. Firebase 직접 규칙 URL은 개요로 이동되어 메뉴로 다시 접근했다.
- 누락: 콘솔 수동 색인 목록은 비어 있고, 저장소에는 reportDedup의 targetUid ASCENDING + nicknameRevision ASCENDING, COLLECTION 색인1개가 정의돼 있다. 함수9개 범위 외이므로 사용자 별도 승인 전 생성/배포하지 않는다.
- 배포 후 필수: moderateNicknames의 실제 실행 계정과 필수 환경 설정이 승인된 로컬 설정과 일치하는지 값 출력 없이 대조한다. 소스/오프라인 검사 통과를 실제 적용 완료로 대체하지 않는다. 현재 미확인.
- ③단계 필수 인계: firebase.cost-control.json의 환경 파일 묶음 제외·로컬 로드·실제 적용 여부를 별도 재현 검토한다. 이번에 운영 또는 비용 보호 설정을 수정하지 않는다.

## 범위·승인

- 개발 budae-kiugi-dev 하나. 운영 콘솔/배포/설정, 비용 보호 계정/주제/observe/enforce, 앱 로그인 시험, API 키 제한, 사용자/예약8개 실행 계정 분리, main/AAB/Play 금지.
- 시작 feat/firebase-server-test/d4fcbd2/0.83.0, 깨끗함·fetch 후 원격0/0 직접 확인. 이후 문서 커밋은 달라질 수 있으나 배포 소스는 d4fcbd2와 일치하는지 별도 확인한다.
- 사용자 승인별 진행: 로컬 설정 승인 완료, 개발 프로젝트 확인 완료, Cloud Functions API 사용자 사용 설정 후 화면에서 활성 상태 직접 확인. 그 외 API·로그인·배포·Invoker 승인 미완료.
- 매 콘솔/배포 단계에 사용자에게 상단 프로젝트 확인을 요청한다. 사용자에게 승인받은 항목만 실행한다. 오류/삭제/대상 밖 변경/예상 비용은 중단 후 보고한다.

## 로컬 준비 — 직접 확인

- server/.env.budae-kiugi-dev: 사용자 승인 후 실행 계정 이름만 설정, AUDIENCE/SUBJECT 빈 값. .gitignore .env.* 적용·Git 미추적 확인. 실제 값은 출력/문서/로그에 복사하지 않았다.
- 주의: AUDIENCE는 배포 후 실제 주소와 대조한다. SUBJECT는 주소가 아니라 기존 코드에서 호출 계정 숫자 고유 ID를 요구한다. 이번 숫자 사용 금지에 따라 비워두며, 후속 관리자 호출 허용 단계에서 사용자와 해결 방식을 먼저 논의한다. 이번에는 관리자 전부 거부 상태를 유지한다.
- predeploy 두 검사(check-moderation-runtime, prepare-server) 통과. 설정 형식 검사일 뿐 실제 권한/인증 성공 아님.
- npm test936/936 통과·npm run build 성공. 기존 라이선스 고지 청크 크기 경고. 게임/서버 소스 변경 없음, 버전0.83.0·방침11·약관8 유지.
- server 내 추적 소스+src와 바이트 일치하는 생성 JS+승인된 환경 파일 외 추가 파일0개(node_modules 제외). 키/저장 덤프 파일 없음. 실제 사용자/만렙 기록 업로드 없음. 실제 CLI 업로드 묶음 검토는 배포 승인 단계에 추가한다.
- 개발 허용 앱1개가 debug google-services.json의 .dev Android 앱 ID와 일치, 웹 앱 허용 없음. 실제 클라우드 적용 상태는 배포 후 확인.

## API 목록과 비용 — 사용 설정은 자원 생성과 다름

API는 Google 서비스에 요청하는 창구다. 아래 API를 켜는 행위 자체의 별도 활성화 요금은 없지만 실제 빌드/실행/보관/전달/작업 생성은 무료 할당량 초과 또는 과금 대상 사용에 따라 비용이 생긴다. 사용자의 다른 프로젝트와 무료 할당량을 공유할 수 있어 무료를 보장하지 않는다. 비용 보호 자동 중단은 아직 꺼져 있다.

| API | 용도/실제 사용 비용 | 이번 화면 근거 |
| --- | --- | --- |
| cloudfunctions.googleapis.com | 함수 등록·배포, 실행/빌드/보관 비용 | 사용자 활성화 후 상세 화면 사용 설정됨 직접 확인 |
| cloudbuild.googleapis.com | 코드 빌드, 빌드 시간/전송 | 사용자 활성화 후 사용 설정 목록에서 직접 확인 |
| artifactregistry.googleapis.com | 실행 이미지 보관, 저장/전송 | 사용자 활성화 후 사용 설정 목록에서 직접 확인 |
| run.googleapis.com | 서버 실행, 처리/메모리/요청/전송 | 사용자 활성화 후 사용 설정 목록에서 직접 확인 |
| cloudscheduler.googleapis.com | 예약2개 생성·실행, 작업 수 | 사용자 활성화 후 사용 설정 목록에서 직접 확인 |
| eventarc.googleapis.com | 2세대 배포 기반 요구 여부 확인, 이벤트 전달 비용 | 목록에 없음; 게임은 HTTP/예약이며 비용 보호 이벤트 연결은 만들지 않음 |
| pubsub.googleapis.com | 메시지 전달, 메시지/보관 비용 | 이미 켜짐 직접 확인; 비용 보호 주제 연결 금지 |
| logging.googleapis.com / storage.googleapis.com | 로그/배포 소스 보관, 사용량 비용 | 이미 켜짐 직접 확인 |
| iamcredentials.googleapis.com | 키 없는 임시 인증 | 사용 설정됨 직접 확인 |
| firestore / identitytoolkit / serviceusage / cloudresourcemanager | DB/인증/서비스 관리 기반 | 이미 켜진 목록 직접 확인 |

공식 문서: [Firebase 배포](https://firebase.google.com/docs/functions), [시작](https://firebase.google.com/docs/functions/get-started), [예약](https://firebase.google.com/docs/functions/schedule-functions), [Cloud Run 함수 배포](https://docs.cloud.google.com/run/docs/deploy-functions).
비용: [Run](https://cloud.google.com/run/pricing), [Build](https://cloud.google.com/build/pricing), [Artifact Registry](https://cloud.google.com/artifact-registry/pricing), [Scheduler](https://cloud.google.com/scheduler/pricing), [Eventarc](https://cloud.google.com/eventarc/pricing), [Pub/Sub](https://cloud.google.com/pubsub/pricing). Scheduler 무료3개는 결제계정 단위이며 그 밖은 작업당31일0.10USD 기준; 원화 청구/다른 프로젝트 이용량은 별도다.

## 향후 배포 방법 — 아직 미승인·미실행

현재 PC의 프로젝트 폴더에서 사용자가 Firebase CLI(배포용 명령 도구)에 본인 Google 계정으로 직접 로그인한다. 키 파일 로그인 금지. 전역 firebase 명령은 현재 PATH에서 찾지 못했으므로 실행할 CLI 위치/버전도 먼저 확인하고 안내한다. 로그인 토큰·계정 이메일·디버그 원문을 저장/출력하지 않는다.

대상 명령 후보(승인 전 실행 금지):

```powershell
firebase deploy --project budae-kiugi-dev --config firebase.json --only "functions:game:readProfile,functions:game:createProfile,functions:game:readCloudSave,functions:game:saveCloudProgress,functions:game:reportNickname,functions:game:deleteGameAccount,functions:game:moderateNicknames,functions:game:retryAccountDeletions,functions:game:purgeExpiredServerRecords"
```

9개는 callable6+관리자HTTP1+예약함수2, Scheduler 작업은 별도2개다. 함수는 요청 하나를 처리하는 서버 프로그램, Scheduler는 정해진 시간의 자동 실행 예약, 인스턴스는 프로그램을 돌리는 실행 자리, 동시 처리는 자리 하나가 함께 받는 요청 수다.

- 전부 서울 asia-northeast3/Node22. callable6 최대2, 동시 처리·메모리 등 미지정값은 실제 배포 도구 기본값과 대조한다. 관리자 최대1/동시1/256MiB/60초/비공개, 예약 최대1/동시1/256MiB/300초/내부 접근. 예약 시간 Asia/Seoul 0/6/12/18시와03시.
- 배포 전에 공개 호출 금지의 적용 범위를 확인해야 한다. 관리자 private은 필수다. 일반 Firebase callable은 Google Cloud 호출 문을 열고 내부에서 Firebase 로그인/App Check로 검증하는 표준 구조일 수 있다. allUsers 금지를 모든9개 함수에 적용하면 현재 SDK 연결 방식과 충돌할 수 있으므로 임의 공개나 보안 우회 없이 사용자에게 먼저 설명/확인한다.
- 기존 Firestore 접근 거부 규칙·필요 색인 상태와 개발 자료 존재 여부는 읽기 검증한다. 미확인이면 예약 삭제 작업을 배포하지 않는다. 규칙/색인 변경이 필요하면 이번 함수9개 범위 밖이므로 별도 보고/승인한다.
- CLI가 API 자동 활성화·기존 함수 삭제·대상 밖 수정·추가 정책/비용을 제안하면 멈춘다. --force 사용하지 않는다. 오류 시 비밀을 뺀 원인 후보를 보고하고 재시도 승인을 받는다.

## 배포 후 권한과 PASS 표 — 전부 미확인

배포 결과의 관리자 함수가 가리키는 실제 Cloud Run 서비스 하나만 연다. 프로젝트 전체 IAM이 아니라 그 서비스의 권한에서 호출 계정에 Cloud Run Invoker(해당 서버를 호출하는 권한)를 연결한다. 사용자 승인·직접 민감 저장 후 다시 읽어 확인한다. allUsers/allAuthenticatedUsers 관리자 권한 금지. 앱 로그인/저장/삭제 시험은 다음 단계다.

함수9개 이름 일치, 서울/Node22/실행 설정, 예약2개·한국 시간, 관리자 무인증1회 거부와 공개 권한 부재, 호출 계정 단일 서비스 권한, 실제 앱 허용 목록, 키/비밀 비노출, 비용·오류 로그 상태는 모두 배포 후 직접 확인이 필요하다. 정상 예약 실제 실행은 시간이 지나지 않았으면 미확인이다. 코드 테스트를 이 PASS로 대체하지 않는다.

## 위험·되돌림

현재는 로컬 설정을 승인 변경했고, 사용자가 Cloud Functions API를 활성화했다. 철회하려면 새로 넣은 세 항목만 제거/비활성화하며 파일 전체나 다른 설정을 지우지 않는다. API 사용 설정 후에는 다른 기능의 의존성을 검토하고 해당 API만 사용자가 되돌린다. 결제 해제는 하지 않는다.

배포 실패는 일부 함수가 이미 생성됐을 수 있으므로 목록부터 확인한다. 업데이트 롤백은 검증된 이전 코드/설정의 해당 함수만 별도 승인받아 재배포한다. 첫 배포 철회는 예약부터 일시정지하여 자동 동작을 막고, 승인된 대상9개와 연동 작업을 명시해 제거하거나 실행을 멈추는 계획을 사용자에게 보여준다. 제거 전 설정/영향 확인 필수, 저장DB/Auth 계정·전체 프로젝트 삭제 금지. 이미 발생한 빌드/보관 비용은 되돌려지지 않는다.

## 사용자 게시 정책 점검 목록 — 게시·개정 번호 변경 없음

- 개발 계정만 사용하고 운영 서버 연결 완료라고 안내하지 않는다. 실제 활성화 날짜와 사용 가능 범위를 공개 문구와 대조한다.
- 로그인 계정 UID/이메일, 닉네임, 게임 저장, 신고·호출 제한·삭제 기록, App Check 처리 항목/목적/보관/삭제를 기존 초안과 대조한다.
- 삭제 문의 URL/이메일과 실제 접수·처리 경로, 신고 처리90일/삭제 확인90일/미완료 재처리 등 기존 승인 규칙을 검증한다.
- 서울 DB와 Google 인증/보안 서비스의 처리 위치를 혼동하지 않는다. 이전·위탁/국외 처리 고지를 검토한다.
- Google Docs 공개 방침·앱 방침·Play 데이터 보안/계정삭제 링크/스토어 설명을 사용자 최종 승인으로 게시한다. 번호11·8 유지. 실제 비용 보호/랭킹/로그인 시험은 아직 완료라고 적지 않는다.

은행 비유: 설계도/내부 메모/창구 준비를 확인했고 실제 영업 개시 승인은 아직이다. 정책 동기화 필요(배포 전 체크리스트 준비, 공개 게시 미실행).
