## 최신 승인·구현 상태 0.83.11

사용자가 아래6가지 GET과 제한된 페이지 처리를 승인했다. 아래 미승인 표기는 승인 전 이력이다. 승인 범위를 코드로 구현했지만 실제 조회 성공은 별도 결과를 따른다. 지역 응답은 정확한 프로젝트/name/locationId·지역 문자 규칙을 확인하고 목록 마지막 페이지까지 읽어야 지역별 조회 허용이 생긴다. 동시 요청을 포함한 페이지 재사용은 실제 전송 직전에 막는다. 중복 지역·순환/중복 토큰·unreachable·오류는 중단한다. 1개라도 예상 밖 서비스/예약/색인을 발견하면 종류·발견 개수만 보고하고 뒤의 페이지/대상을 조회하지 않는다(전체 개수라고 주장하지 않음). DB가 서울이 아니거나 기대 색인이 없거나 준비되지 않았어도 성공으로 보고하지 않는다.

색인은 firestore.indexes.json의 collectionGroup/queryScope/fields를 값 단위로 비교한다. 자동 __name__ 마지막 필드는 [Google 공식 Index 정의](https://docs.cloud.google.com/firestore/docs/reference/rest/Shared.Types)에 따라 마지막 정렬 방향(비방향 필드는 ASCENDING)으로 명시적으로 확장하여 비교한다. 필드 이름/순서/방향이 다르거나 READY가 아니면 통과하지 않는다. 문서/게임 데이터·키·IAM 정책 읽기는 추가하지 않았다. 조회 원문은 메모리에서만 검사하며 stdout/stderr/파일 로그는 기존 보호를 유지한다. 이 도구는 OS 수준의 악성 코드 격리 도구가 아니며 회사 원본과 동일 보증 없음은 유지한다.

# 집 PC 자원 재확인: 읽기 허용 제안 · 2026-10-13

이 문서는 배포 계획서가 아니다. 추가 조회의 허용 제안이며 아래 미승인 요청은 아직 구현·실행하지 않는다. 운영 프로젝트, 배포, 비용 보호 연결, 앱 로그인 시험, 관리자 Invoker, API 활성화, 권한 변경은 포함하지 않는다.

## 승인 후 구현한 관리자 두 계정 조회 · 0.83.10

- inventory 모드의 GET만 허용한다. 호스트 iam.googleapis.com, 경로 /v1/projects/budae-kiugi-dev/serviceAccounts/{지정 계정 주소}. 지정 이름 moderation-caller 또는 moderation-runtime과 개발 프로젝트로 구성한 주소에 정확히 일치해야 한다. 실제 주소는 문서/출력에 적지 않는다.
- CLI15.33.0 lib/gcp/iam.js:24의 v1 클라이언트와 :38–43 getServiceAccount가 근거다. 이 파일을 추가로 해시 고정했다. 직접 요청 주소를 추측하지 않고 해당 함수를 가드 안에서 호출한다.
- 목록, 다른 계정/프로젝트, 대소문자 변경, keys, getIamPolicy, 쿼리/후행 슬래시, POST/PUT/PATCH/DELETE는 차단한다. projects/deploy 모드에서는 이번 IAM 조회를 허용하지 않는다.
- 출력은 지정 계정 이름과 exists/disabled 불리언만이다. 응답의 숫자 ID·주소·키·본문은 출력/파일 저장하지 않는다. 응답은 메모리에서 대상 프로젝트/주소와 disabled 형식을 확인하고 요약한다. disabled 생략은 API의 기본값 false로 처리한다.
- 404/403/전송 오류는 즉시 실패·중단한다. 404를 임의로 성공이나 '없음'으로 바꾸지 않는다. 따라서 오류 시 존재 여부는 미확인으로 남긴다.
- 신규19개 테스트: 두 정상 요청 전송,13가지 미허용 요청 전송0,다른 모드 차단,고정 출력/응답 검증/첫 오류 중단. 실제 응답과 가짜 검증을 구분한다.

## 남은 조회를 한 번에 승인받을 표

P는 budae-kiugi-dev에만 고정한다. D는 (default)에만 고정한다. R은 해당 서비스의 지원 지역 조회 응답에서 검증한 지역에만 한정한다. 슬래시나 특수문자를 포함한 임의 지역/프로젝트는 허용하지 않는다. 모두 HTTPS GET, 본문 없음이다.

| 목적 | 호스트 | 방식 | 경로 모양 | 근거 |
| --- | --- | --- | --- | --- |
| Cloud Run 지원 지역 | run.googleapis.com | GET | /v1/projects/P/locations | CLI15.33.0 lib/gcp/run.js:170–172 listLocations; [공식 locations.list](https://cloud.google.com/run/docs/reference/rest/v1/projects.locations/list) |
| Cloud Run 지역별 서비스 | run.googleapis.com | GET | /v2/projects/P/locations/R/services | [공식 services.list](https://cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/list). 위 CLI run 모듈에는 서비스 목록 함수가 없어 공식 REST를 근거로 별도 읽기 어댑터를 준비해야 함 |
| Scheduler 지원 지역 | cloudscheduler.googleapis.com | GET | /v1/projects/P/locations | [공식 locations.list](https://cloud.google.com/scheduler/docs/reference/rest/v1/projects.locations/list). CLI lib/gcp/cloudscheduler.js:19–22의 v1 호스트 확인; 이 모듈에는 목록 함수 없음 |
| Scheduler 지역별 작업 | cloudscheduler.googleapis.com | GET | /v1/projects/P/locations/R/jobs | [공식 jobs.list](https://cloud.google.com/scheduler/docs/reference/rest/v1/projects.locations.jobs/list). 기존 CLI getJob은 개별 조회라 전체 목록 근거로 사용하지 않음 |
| Firestore 기본 DB 위치 | firestore.googleapis.com | GET | /v1/projects/P/databases/D | CLI lib/firestore/api.js:21,542–544 getDatabase; [공식 databases.get](https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases/get) |
| Firestore 복합 색인 | firestore.googleapis.com | GET | /v1/projects/P/databases/D/collectionGroups/-/indexes | CLI lib/firestore/api.js:161–168 listIndexes; [공식 indexes.list](https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.collectionGroups.indexes/list) |

공식 문서 확인일 2026-10-13. CLI 소스에서 확인한 부분과 공식 REST로 보완해야 하는 부분을 구분했다. 'CLI가 이 목록 요청들을 모두 실제로 만든다'고 주장하지 않는다. Cloud Run v2의 지역 '-'는 공식 문서에서 허용하지 않으므로 지원 지역별로 조회한다.

## 좁게 허용할 조건과 완료 판단

- 첫 지역/목록 요청은 pageSize=100만, 후속 페이지는 직전 응답의 nextPageToken을 해당 목록에만 일회 사용한다. 숫자/토큰 값은 출력·저장하지 않는다. 중복·순환 토큰, 미완료 페이지, 비정상 응답이면 중단한다. 다른 쿼리(filter/showDeleted 등), 추가 호스트, 리디렉션은 허용하지 않는다.
- 현재 Run 지역 요청은 쿼리 없는 형태만 허용되어 있다. 위 표 승인에는 이 요청의 정확한 pageSize/pageToken 처리 보완도 포함한다. 나머지 다섯 경로는 신규 허용이다. DB 단건은 쿼리 없이 호출한다.
- 지원 지역 목록 자체를 끝까지 읽은 뒤 검증된 모든 지역의 모든 페이지를 읽는다. 과거 34개를 고정하지 않는다. 한 지역이라도 조회 불가/오류/unreachable이면 '전 지역 0개'로 보고하지 않는다. 예상 밖 자원이 있으면 개수만 보고하고 삭제하지 않는다.
- Firestore 응답 locationId가 asia-northeast3인지 확인한다. 문서/게임 데이터 조회는 금지한다. 복합 색인은 저장소 firestore.indexes.json의 reportDedup 필드 구성과 READY 상태를 비교하며, 단순히 색인 수가 1개 이상이라는 이유로 일치 판정하지 않는다.
- 서비스/예약 응답에는 환경값·호출 주소가 있을 수 있으므로 원문 출력·파일 로그를 차단한다. 결과는 조회 지역 수/자원 수/완료 여부/서울 여부/기대 색인 준비 여부만 고정 항목으로 출력한다.
- 기존 인증 갱신의 좁은 허용은 유지한다. 조회 오류를 API 자동 활성화나 권한 변경으로 해결하지 않는다.
- 승인 후 정상 허용·범위 이탈/전송 전 차단·페이지 누락·미조회 지역·원문 유출 방지 테스트를 먼저 만들고 전체 테스트/빌드 후 실제 조회한다. 이번 문서 작성으로 조회 허용이 생기지는 않는다.

## 사용자가 콘솔로 보는 대안

개발 프로젝트 선택을 먼저 확인한다. 화면 전체나 계정 정보가 포함된 캡처를 보내지 않고 결과만 알려준다.

| 대상 | 사용자 확인 경로 | 비교 |
| --- | --- | --- |
| Firestore 위치 | Google Cloud → Firestore → Databases → 기본 DB의 위치 | 서울 여부 하나는 콘솔에서 확인하는 편이 간단함 |
| 복합 색인 | Firebase → Firestore Database → Indexes → Composite | reportDedup의 두 필드와 준비 상태를 확인하기 쉬움; 만들기/수정은 누르지 않음 |
| Cloud Run | Google Cloud → Cloud Run → Services → 모든 지역/필터 해제 | 빠른 육안 확인 가능. 모든 지역 포함 여부 확인이 필요함 |
| Scheduler | Google Cloud → Cloud Scheduler → 작업 목록 → 지역 필터 확인 | 전 지원 지역 누락 없이 검증하려면 자동 읽기가 더 확실함 |

콘솔 결과를 사용자가 전달한 경우 '사용자 화면 확인'으로 기록하며 'Codex가 집에서 가드로 직접 조회함'으로 바꾸지 않는다. 가드 GET은 은행 장부 열람과 같고 계좌를 만들거나 돈을 보내는 작업은 아니다. 서버 변경이 없으므로 서버 롤백은 필요 없으며 가드 코드 변경만 되돌릴 수 있다. 회사 PC 원본과 내일 비교 계획/원본과 동일 보증 없음 유지. 정책 영향 없음.

## 실제 조회 결과

| 대상 | 회사 기록(문서로만) | 집 직접 조회 |
| --- | --- | --- |
| 1세대/2세대 함수 | 각각0 | 이전 단계에서 각각0 확인 |
| moderation-caller | 존재 | 있음 / 사용 중지 꺼짐 |
| moderation-runtime | 존재 | 있음 / 사용 중지 꺼짐 |
| Cloud Run / Scheduler | 각각0 | 미확인 |
| 서울 Firestore / 기대 색인 | 존재 | 미확인 |

관리자 조회는 0.83.10 가드 안에서 성공(exit0). 키/권한 보유 여부를 조회한 것은 아니다. 전체1036/1036·가드98/98·빌드 성공. 정책 영향 없음.

## 0.83.11 실제 실행 중단 결과

전체1068/가드130/빌드 통과 후 1회 실행했다. run 단계 시작 직후 고정 실패(exit1)로 중단했다. 현재 출력은 전송 전 차단/네트워크·권한/응답 검증 실패를 구분하지 못하므로 원인 미확인이다. 원문 출력·로그·권한 변경·허용 목록 확대·재시도는 하지 않았다. Run 전체0 판단 불가, Scheduler/DB/색인은 후속 호출하지 않아 미확인. 회사 문서로만 확인한 상태를 집 직접 확인으로 바꾸지 않는다. 다음에는 고정 단계 진단으로 원인을 좁혀야 하며 배포/.env 승인과는 별개다. 정책 영향 없음.
