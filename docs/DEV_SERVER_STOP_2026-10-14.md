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
