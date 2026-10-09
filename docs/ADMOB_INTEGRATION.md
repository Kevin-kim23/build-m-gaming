# 현재 0.72.0 운영 ID 전환

release는 동람코 실제 광고 ID, debug는 Google 샘플 ID. 방침5 재확인. AdMob 검토 필요/스토어 미연결 확인. 아래는 과거 기록. 최신 상세: [운영 광고 보고서](store/LIVE_ADS_072.md)

# AdMob 연결 · 0.70.0 (2026-10-09)

## 현재 단계

실제 Android Google Mobile Ads SDK와 UMP를 연결한 **테스트 광고 빌드**입니다.
광고 수익을 발생시키는 운영 광고는 아직 활성화하지 않았습니다.
Google 테스트 광고도 SDK 통신을 하므로 이전의 "수집·전송 없음" 신고를 그대로 사용해 배포하면 안 됩니다.
공개 개인정보처리방침과 Play Console은 이번 코드 변경으로 자동 수정되지 않습니다.

2026-10-09 후속 작업에서 공개 방침 개정3 게시 및 Play 광고 포함/광고 ID/데이터 보안 변경 저장을 완료했습니다. 새 AAB 업로드와 검토 제출은 아직 하지 않았습니다. 문항별 답변·증빙·남은 작업은 [첫 광고 게시 구글 보고서](store/26.10.09%20첫%20광고%20게시%20구글%20보고서.md)를 확인하세요. 아래 배포 전 단계 중 2번의 공개 문서 갱신과 3번의 콘솔 저장은 완료되었으며, 법적 세부 검토와 검토 제출은 남아 있습니다.

## 확인된 운영 식별자

사용자가 AdMob에서 직접 생성했고 완료 화면에서 확인한 값입니다. 비밀키가 아닌 앱/광고 식별자입니다.

- 앱: `ca-app-pub-6317135937361483~2481976415`
- 물약 보상 광고: `ca-app-pub-6317135937361483/8022077704`
- 이번 빌드: Google 샘플 앱 `ca-app-pub-3940256099942544~3347511713`, 샘플 보상형 `ca-app-pub-3940256099942544/5224354917`
- 샘플 ID는 `android/app/build.gradle`의 두 `resValue`에 고정되어 있습니다. JavaScript나 이용자 입력으로 운영 ID로 바꿀 수 없습니다.
- 운영 전환 시 두 ID와 화면의 테스트 광고 설명을 함께 변경하고 새 버전으로 빌드합니다.

## 구현

- 공식 Google SDK `play-services-ads:25.5.0`, UMP `4.0.0`만 추가. 별도 미디에이션·Firebase·결제 SDK 없음.
- 앱 시작 시 광고를 요청하지 않음. 물약 광고 버튼에서 UMP 동의 상태 갱신 → 필요한 동의 화면 → canRequestAds 확인 → 광고 초기화/로드/표시.
- 동의 조회 실패 시 광고 요청 차단. 로드 시간 초과·취소·실패에 보상 없음.
- OnUserEarnedRewardListener에서만 지급 자격 획득. 광고 닫기 후 결과를 전달하고 게임 세션 복귀/저장 잠금 획득을 최대 10초 대기한 뒤 기존 컨트롤러가 선택한 물약 1개를 저장.
- 광고가 떠 있는 동안 중복 요청 차단. 보상은 지역/광고 단위의 표시 이름이 아니라 요청 당시 선택한 red/blue에 고정.
- 웹 브라우저에서는 광고 미지원으로 안내하고 무료 지급하지 않음.
- 설정에 광고 개인정보 선택 재설정 버튼 추가. UMP에서 요구한 지역에 동의 옵션 화면 표시.
- 광고 소재 등급 T 이하. 이것만으로 모든 지역의 미성년자 요건을 충족하지 않음.
- 강제 종료/프로세스 소멸 시 미완료 광고 보상 복구는 제공하지 않음. 서버 측 검증 없음. 유료 상품 지급에는 이 구조를 사용하지 말 것.

## 배포 전 남은 단계

1. 실제 폰에서 광고 로드/완료 1개/중도 취소 0개/연타/비행기모드/홈 복귀/재시작 후 보유량 검증. 현재 연결된 ADB 기기가 없어 실기기 미검증.
2. Google 문서 공개 방침을 `docs/store/PRIVACY_POLICY.md` 개정3과 일치시키기. 한국 개인정보 국외 처리 안내의 구체 항목과 대상 연령/제공 국가도 실제 운영 조건으로 검토.
3. Play Console 광고 포함=예, 광고 ID 사용 여부, 데이터 보안 양식 변경. 병합 manifest에서 INTERNET, ACCESS_NETWORK_STATE, AD_ID, ACCESS_ADSERVICES_AD_ID/ATTRIBUTION/TOPICS, WAKE_LOCK 확인. SDK 의존성에 의해 추가된 권한이며 광고 ID 사용 신고가 필요함. SDK 처리 항목은 IP 기반 대략적 위치, 앱 상호작용, 진단 정보, 기기 및 기타 식별자. 수집/공유·목적·선택 여부는 실제 동작과 공식 안내로 문항별 확정. 결제는 아직 미연결.
4. 실제 AdMob 계정/앱 승인 상태, 공개 스토어 연결, app-ads.txt 소유권 확인, UMP 메시지(배포 지역별) 설정. 미성년자/동의 연령 처리와 대상 연령 설정 점검 후 운영 광고 전환.
5. 별도 단계에서 실제 Play 결제 구현. 기존 자동터치 테스트 지급은 아직 남아 있으며 정식 결제가 아님.

## 공식 출처 및 권리

- https://developers.google.com/admob/android/quick-start (SDK 버전/초기화/광고 ID 권한)
- https://developers.google.com/admob/android/rewarded (보상 콜백/Google 테스트 광고)
- https://developers.google.com/admob/android/privacy (UMP/선택 변경)
- https://developers.google.com/admob/android/privacy/play-data-disclosure (SDK 데이터 처리)
- https://developers.google.com/admob/terms (Google Mobile Ads SDK 조건)

2026-10-09 확인. SDK는 Google Maven 배포본이며 외부 미디어 에셋을 추가하지 않았습니다.
기존 음악은 공개 Git에 포함하지 않습니다. SDK 사용 조건/AdMob 정책 준수와 배포 승인까지 보장하는 문서가 아닙니다.
