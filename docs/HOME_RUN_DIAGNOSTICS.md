# 집 PC Cloud Run 실패 진단 · 0.83.12 · 2026-10-13

이번 범위는 오류 구분과 기록 검토뿐이다. 실제 재조회·허용 목록 확대·배포·환경 파일 변경은 하지 않는다. 원문 응답/주소/토큰/계정 주소/숫자 계정 식별자는 진단에 포함하지 않는다.

## 고정 진단

| category | 출력 필드 | 뜻 |
| --- | --- | --- |
| guard-blocked | beforeTransport 불리언, check 고정 이름 | 가드의 거부. 전송 함수 진입 전인지도 구분 |
| transport-failed | transport 고정 분류 | 전송을 시도했지만 HTTP 응답을 얻지 못함. dns/connection/timeout/tls/aborted/other만 허용 |
| http-response | status 정수 | 응답 HTTP 상태 번호만. 200 이후 검사 실패도 별도로 기록 |
| validation-failed | check 고정 이름 | 응답 또는 로컬 결과 검사에서 거부된 검사 이름만 |
| unclassified | beforeTransport/responseReceived 불리언 | 네 범주로 확정할 증거가 없는 실패. 가드 거부/통신 실패/HTTP 오류라고 추측하지 않음 |

전송 시도는 원격 서버가 요청을 받았다는 증명이 아니다. DNS/TLS 단계 실패도 이 범주에 들어간다. 응답 본문이나 오류 message/stack을 검색하여 원인을 추정하지 않는다. 표준 오류 code/name의 정확한 대응만 사용하며 모르는 값은 other다. HTTP 상태는100~599 정수만 받는다. 검사 이름은 request-policy, transport-options, response-shape, unreachable, region-identity, pagination, region-count, database-location, index-definition, index-ready, index-missing, unexpected-resource 등 고정 목록으로만 출력한다.

첫 실패 이유를 나중의 일반 예외로 덮어쓰지 않는다. HTTP 오류나 리디렉션 뒤에 '전송 전 거부'라고 잘못 붙이지 않는다. 기존 출력/파일 차단, 재시도0, 리디렉션 금지와 요청 허용 조건은 그대로다. 로그인 출력3상태는 바꾸지 않으며 새 진단은 inventory:remaining에만 연결한다.

테스트: 전송 전 차단·DNS/연결/시간 초과/알 수 없는 오류·HTTP200/302/403/500·HTTP200 뒤 검사 거부·모르는 검사명·원문 추가 필드 유출 시도·분류 불가를 합성 자료로 확인한다. 실제 클라우드에 보내는 테스트가 아니다.

## 회사 기록: 문서로만 확인함

- WORK_LOG_2026-10-13.md 항목58: Run 지역 목록 v2에서500, 공식 v1로 수정. 지역별42지역0·다맘403 후 공식 전역 서비스 GET에서0/조회 불가0.
- 같은 일지 항목62: 공식 전역 결과0/조회 불가0을 다시 기록. 지역별403 원인은 확정하지 않음.
- 검증결과.md의 이전 '읽기 오류 기록'도 같은500/403/공식v1 전체 목록 성공을 기록한다.
- HOME_PC_HANDOFF.md의 상태표·첫 절·읽기 도구 설명에 전역 목록 서비스0/조회 불가0과 stage4-platform-readonly.cjs 역할이 남아 있다.
- STAGE4_DEV_FUNCTION_DEPLOYMENT.md는 공식 namespaces.services.list 문서 링크를 남겼다.
- **당시 정확히 전송한 경로 문자열/쿼리 조합은 추적 문서에서 찾지 못했다.** 회사 원본 도구는 복사·열람하지 않았다. 아래 경로는 기록의 메서드 종류와 공식 문서를 대조한 후보이지, 당시 원문 요청을 직접 확인했다는 뜻이 아니다.

## 경로 제안: 아직 변경하지 않음

P는 budae-kiugi-dev에 고정한다.

| 목적 | 호스트 | 방식 | 경로 모양 | 근거/판단 |
| --- | --- | --- | --- | --- |
| 현재 첫 지역 조회 | run.googleapis.com | GET | /v1/projects/P/locations | CLI15.33.0 lib/gcp/run.js listLocations 및 [공식 v1 지역 목록](https://docs.cloud.google.com/run/docs/reference/rest/v1/projects.locations/list). 현재는 pageSize=100. 이미 공식 v1이라 회사의 v2→v1 수정이 필요한 상태는 아님 |
| 전체 서비스 조회 후보 | run.googleapis.com | GET | /apis/serving.knative.dev/v1/namespaces/P/services | 회사 기록의 공식 v1 전체 목록 메서드와 [공식 namespaces.services.list](https://docs.cloud.google.com/run/docs/reference/rest/v1/namespaces.services/list) 대조. 신규 허용은 아직 없음 |

공식 문서 확인일2026-10-13. 전체 목록 후보는 limit/continue 방식으로 페이지를 처리하며 기존 pageSize/pageToken 방식과 다르다. 승인되더라도 limit=100 및 직전 metadata.continue의 일회 사용, items 전부 확인, unreachable이 없거나 빈 배열인지 확인해야 한다. 응답 종류/페이지 누락/조회 불가 지역을 무시하고0개로 보고하면 안 된다. 원문 자원 내용은 계속 출력하지 않는다.

권장 순서: 먼저 현재 허용된 v1 첫 지역 조회가 어디서 실패하는지 고정 진단으로 확인한다. 집 실패는 당시 상태 번호를 기록하지 않아 아직 원인을 모른다. 결과에 따라 로컬 검사 문제인지, HTTP/통신 문제인지 구분한 뒤 전체 목록 경로 전환을 별도로 제안한다. 회사 성공 이력만으로 지금의 첫 조회 실패가 해결된다고 단정하지 않는다. 이번 진단 보완 후 실제 읽기 명령1회 재실행은 사용자 승인 전 금지다.

은행 비유: 장부 열람 실패를 '출입문 차단 / 연락 실패 / 은행 응답 번호 / 장부 형식 검사'로 구분하는 표시등을 추가했다. 장부를 다시 열거나 다른 출입문을 허용한 것은 아니다. 클라우드 변경이 없어 서버 되돌림은 불필요하며 진단 코드만 되돌릴 수 있다. 회사 원본과 동일 보증 없음 유지. 정책 영향 없음.
