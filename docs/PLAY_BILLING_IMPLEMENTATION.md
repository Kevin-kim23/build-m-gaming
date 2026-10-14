# 서버 없는 자동터치 결제 준비 · 2026-10-14

사용자 승인: 자동터치 영구 해금 국내 예정 가격 4,900원. 상품 등록·판매·업로드·정책 원문 변경은 미실행. 실제 구매 버튼의 가격은 Play 상품 조회 결과를 사용한다. 서버 브랜치는 수정하지 않는다.

## 구현과 한계

- `src/play-billing.js`: 구매·복원·취소·대기 분리, 중복 클릭 차단, 앱 시작/복귀 시 보유 조회. 기기 골드와 진행은 구매 복원 대상이 아니다.
- `android/app/src/playBilling/`: Billing 8.3.0, 정확한 상품/패키지 확인과 RSA 영수증 서명 검증. PURCHASED 상태만 보유 인정. 비소모성 상품이므로 consume하지 않는다. 로컬 보유 표시 저장 후 acknowledge하고 게임 저장에 반영한다. 중단되면 다음 보유 조회로 복구한다. 응답 실패/대기는 보유를 취소하지 않는다.
- 정상 보유 조회에서 상품이 없으면 Play 보유를 해제한다. 환불 감지는 다음 성공한 조회 시점이며 즉각적인 서버 알림은 없다. 기존 테스트 지급은 별도 source로 유지한다.
- 저장41은 Play 보유 출처를 추가한다. 저장40의 정상 테스트 보유와 큰 금액은 보존한다. 저장 키 불변. 구매 토큰·영수증·서명은 JS/저장/로그로 넘기지 않는다.
- 클라이언트 검증과 로컬 보유는 변조된 앱/저장에 대한 완전한 방어가 아니다. 서버 검증·환불 통지·재화 원장 없음. 재화 판매와 구독은 이번 범위가 아니다.

## 현재 빌드 제한

일반 debug/release/unsigned 빌드에는 새 Billing SDK가 포함되지 않는다. `-PplayBillingTest=true`로 만든 debug만 연결 코드를 포함한다. 상품 ID와 공개키가 없으면 실제 구매는 차단된다. release 활성화는 구현하지 않았다.

로컬 설정은 gitignore의 `android/play-billing.properties`에 아래 항목을 넣는 구조다. 이번 작업에서는 실제 파일을 만들지 않았다.

| 항목 | 의미 |
|---|---|
| autoTapProductId | Play에 등록할 비소모성 자동터치 상품의 정확한 ID |
| playLicensePublicKey | Play 앱의 구매 서명 검증용 공개키. 서비스 계정 키/비밀키와 다름 |

빈 예제는 `android/play-billing.properties.example`. 키·영수증·계정 정보는 문서/채팅에 붙이지 않는다. 이 시험 APK는 기존 debug의 `.dev` 패키지를 유지하므로 실제 Play 앱 상품을 시험할 수 있다고 보장하지 않는다. 폰 설치와 AAB 생성은 하지 않았다.

로컬 컴파일 검증: Node22에서 `npm run build`, `npx cap sync android`, JDK21/Android SDK 환경에서 `android/gradlew.bat -p android -PplayBillingTest=true :app:assembleDebug :app:testDebugUnitTest`. 출시 서명 설정을 사용하지 않는 debug 검사다.

## 실제 Play 시험 전에 남은 순서

1. 지급수단·판매자 설정을 사용자가 확인. 상품 ID와 한 개의 구매 옵션, 국내4,900원 가격을 확정하여 콘솔 상품 준비.
2. 아래 정책/SDK 검토를 끝내고 승인된 시험 빌드 경로 준비. 실제 앱 패키지와 서명, Play 테스트 트랙, 라이선스 테스터를 일치시켜야 한다. 현재 `.dev` APK를 출시 앱 대신 올리지 않는다.
3. 결제 가능한 테스트 수단으로 가격·성공·취소·대기 확인. 테스트 구매임을 구매창에서 확인하지 못하면 진행하지 않는다.
4. 앱 종료/복귀·재설치 복원·다른 계정·통신 실패·ack 실패·환불 후 보유 해제 확인. 실제 진행 기록을 삭제하여 시험하지 않는다.
5. 검증 결과와 판매 문구 승인 후에만 release 연결·AAB·업로드를 별도 진행한다.

## 라이선스·정책 동기화 초안 (게시용 최종 문안 아님)

Billing 8.3.0 공식 Maven POM의 라이선스는 Android Software Development Kit License다. Google SDK를 Apache 코드로 오표기하지 않는다. 기존 `android/app/notices.gradle` 고지 생성 경로는 release 의존성을 수집하므로 이번 opt-in debug SDK는 기존 고지 목록에 자동 추가되지 않는다. 간접 의존성에는 Google Play services/DataTransport 등이 있으며, 시험 APK 배포를 포함해 실제 배포 variant의 전체 의존성과 고지·SDK 데이터 공개 내용을 먼저 재검토해야 한다. 현재 APK는 로컬 컴파일 결과만 확인하고 배포하지 않는다. 컴파일 성공은 법적 검토 완료를 뜻하지 않는다.

후속 반영 대상: 자동터치 비소모성 구매/Play 계정 기반 복원/게임 진행 복원 제외 안내, 구매 정보 처리와 Google Play 결제 안내, 환불 문의 절차, Play 데이터 보안 양식의 구매 관련 정보와 SDK 처리. 결제수단 번호를 게임에서 직접 받지 않는다. SDK가 처리하는 정보 전체가 없다고 단정하지 않는다. 방침11·약관8과 공개 원문은 변경하지 않았다.

## 공식 근거 (2026-10-14 확인)

- [Billing 통합](https://developer.android.com/google/play/billing/integrate): 상품 조회·구매 상태·보유 조회·acknowledgement 흐름. 구매 후 확인 처리를 누락하면 환불될 수 있으므로 실제 시험에서 확인한다.
- [결제 보안](https://developer.android.com/google/play/billing/security): 서버 검증 권고. 이번 클라이언트 전용 방식의 한계를 없애지 못한다.
- [테스트](https://developer.android.com/google/play/billing/test): 라이선스 테스트와 패키지/계정 조건.
- [버전 기록](https://developer.android.com/google/play/billing/release-notes): 8.3.0 고정 사용. 최신 버전이라고 주장하지 않는다.
- [공식 POM](https://dl.google.com/dl/android/maven2/com/android/billingclient/billing/8.3.0/billing-8.3.0.pom), [SDK 약관](https://developer.android.com/studio/terms).

은행 비유: 게임에 Google 결제 창구를 연결하고 영수증을 확인하는 준비다. 우리 은행 서버를 다시 켜는 작업은 아니다. acknowledge는 상품을 전달했다고 Google에 확인하는 처리다.

되돌림: 배포하지 않았으므로 해당 코드 커밋을 되돌릴 수 있다. 저장41을 만든 뒤 구버전40으로 내려가면 구버전의 미래 저장 보호가 작동하므로 실제 저장을 지우지 않는다. 현재 테스트는 가짜 상태만 쓴다.
