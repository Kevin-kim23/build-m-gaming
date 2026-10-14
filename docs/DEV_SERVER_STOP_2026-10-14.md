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

공식 근거: https://docs.cloud.google.com/run/docs/configuring/services/manual-scaling 및 https://docs.cloud.google.com/run/docs/managing/services
허용 PATCH는 run.googleapis.com의 v2/projects/budae-kiugi-dev/locations/asia-northeast3/services/{기존9개}이며 updateMask=scaling.scalingMode,scaling.manualInstanceCount만 허용한다. 프로젝트 숫자/토큰/응답 원문은 메모리에만 사용한다. 다음 실행 승인 없이 재실행하지 않는다.

검증 완료: 집 Node22에서 npm test 1206/1206 통과(실패/건너뜀0, 약143초), npm run build 성공. 기존500kB 묶음 경고 유지. 신규 가드 가짜 테스트5개 포함, 신규4파일 민감 패턴 검사 미검출. 실제 중지 재시도 없음. 이 변경을 서버 브랜치에 커밋·푸시하고 원격 차이는 마감 보고에서 확인한다.

## 409 읽기 조사 · 2026-10-14

- 사용자 승인 범위는 읽기 조사만. 시작 cbf5524/작업폴더 깨끗함 확인. 수정 요청/재시도/권한 변경/삭제 없음.
- 직접 확인: 기존 가드에서 변경 루프를 메모리상 제거하고 PATCH 문자열 부재를 확인한 읽기 전용 실행으로 개발 서울 서비스9개 GET. 자동 확장9, 수동0 중지0, 변경 진행중0. 최초 준비 시 줄바꿈 판별 실패로 네트워크 전송 전 중단, LF 정규화 후 읽기 성공. 저장소 실행 코드 변경 없음.
- 직접 확인: Chrome 개발 감사 로그의22:15:55 UpdateService 오류. readprofile의 기존 revision 이름에 다른 configuration이 이미 존재한다는 충돌. 요청 updateMask는 scaling.scalingMode,scaling.manualInstanceCount로 기록됨. 권한 거부로 보고할 근거 없음. 원문/계정/숫자ID는 기록하지 않음.
- 공식 문서 확인: https://docs.cloud.google.com/run/docs/managing/services 의 Disable an existing service REST 예시는 update_mask=scaling.manualInstanceCount 및 본문 scaling.manualInstanceCount=0만 사용. 제안은 이 최소 요청 형태로 가드/가짜 테스트를 보완한 뒤 별도 승인으로1회 실행. 이 형태가 현재 함수의 충돌을 해결할지는 미검증이며 확정하지 않는다. revision 이름 삭제나 새 revision 생성/상한 제거는 임의로 하지 않는다.
- 예약2개 Paused는 직전 작업 직접 확인 사실, 이번 감사 로그에서 PauseJob도 확인. 이번에는 예약 설정을 변경하지 않음. 은행 비유: 정기 업무는 멈췄지만 창구는 아직 열려 있음. 재개/복구 변경도 별도 승인. 저장 비용 잔존 가능.
- 문서만 갱신: 앱 버전0.83.21/방침11/약관8 유지. 코드 불변으로 전체 테스트/빌드 재실행 생략(직전1206개/빌드 통과). 기록 커밋·푸시 후 원격 차이 확인. 정책 영향 없음(출시 정책 정합 미완료는 별도 유지).
