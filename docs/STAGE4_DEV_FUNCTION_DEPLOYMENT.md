# 4단계 · 개발 게임 함수9개 배포 진행 · 2026-10-13

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
| cloudbuild.googleapis.com | 코드 빌드, 빌드 시간/전송 | Cloud Functions 활성화 뒤에도 상세 화면 사용 버튼 표시, 사용자 승인/활성화 대기 |
| artifactregistry.googleapis.com | 실행 이미지 보관, 저장/전송 | 목록에 없음 |
| run.googleapis.com | 서버 실행, 처리/메모리/요청/전송 | 목록에 없음 |
| cloudscheduler.googleapis.com | 예약2개 생성·실행, 작업 수 | 목록에 없음 |
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
