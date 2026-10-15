# 서명 AAB · 0.76.25 · 2026-10-15

사용자 요청으로 현재 UI 브랜치의 서명 AAB를 생성했다. Play 업로드·콘솔 변경·서버 작업은 실행하지 않았다. 코드 변경 없이 기존 버전0.76.25를 빌드했다.

## 결과물

- 파일명: `budae-kiugi-0.76.25-76025-play-billing.aab`
- 전달 위치: 사용자 Downloads 폴더. 빌드 원본: `android/app/build/outputs/bundle/release/app-release.aab`.
- 패키지: `com.dongramco.budaekiugi`, versionName0.76.25, versionCode76025, minSdk24, targetSdk36, debuggable=false.
- 크기:35,604,084바이트. SHA-256:`5D93B13E16DCA9BFDEB8BA0753A9C6416D27AEAD366156FA7A2D88E65FB69E1E`.
- 전달 사본과 원본 해시 일치. AAB/서명 비밀/로컬 결제 설정은 Git에 포함하지 않음.

## 빌드와 검사

- 현재 프로세스에만 `ORG_GRADLE_PROJECT_playBillingRelease=true`를 지정하고 `npm run android:release` 실행. 종료 후 기존 환경변수 값 복원. 기본 명령에 판매 플래그가 자동으로 들어가지는 않으므로 다음 빌드도 명시해야 한다.
- 승인 음원4곡·시작 자산 해시 검증 성공. 웹 production 빌드·Capacitor sync·bundleRelease·assembleRelease·lintRelease 성공(Gradle2분10초).
- 기존 업로드 키 사용, 새 키 생성/교체 없음. jarsigner strict 종료0 / jar verified. 기존 AGP ZIP 구조에 따른 JarInputStream 서명 해석 경고는 남았으며 bundletool1.18.3 구조 검사도 통과했다.
- Android lint 오류0·경고15. 웹 고지885.32kB 큰청크 경고 유지. 경고 없는 빌드라고 표시하지 않음.
- 최종 npm test818/818 통과, 실패0·건너뜀0,253.97초. 앞선 메뉴 작업의 문서 검사 실패 이후 최신 기록으로 전체 재검사를 완료했다.
- AAB 안 웹 파일22개가 최종 dist와 SHA-256 일치. 로컬 결제 설정·서명 설정·개인키·.env 파일0개.
- 실제 결과물의 PlayBillingPlugin·BillingClient 클래스, 생성 BuildConfig의 PLAY_BILLING_ENABLED=true, BILLING 권한 확인. Google 샘플 광고 리소스2개 확인. 출시 웹 빌드이며 신규 개발 무료 지급은 production 분기에서 차단.
- 게임 서버 프로젝트/Cloud Functions 주소 표식과 FirebaseAuth/AppCheck 클래스 없음. 광고 SDK 내부 공용 Google/Firebase 유틸리티까지 없다는 뜻은 아니다.

## 최종 권한 목록

- android.permission.INTERNET
- android.permission.ACCESS_NETWORK_STATE
- com.google.android.gms.permission.AD_ID
- android.permission.ACCESS_ADSERVICES_AD_ID
- android.permission.ACCESS_ADSERVICES_ATTRIBUTION
- android.permission.ACCESS_ADSERVICES_TOPICS
- com.android.vending.BILLING
- android.permission.WAKE_LOCK
- android.permission.FOREGROUND_SERVICE
- com.dongramco.budaekiugi.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION

## 범위와 남은 확인

- 공통 테마·홈·시설/장비·상점 개선, 약20% 낮아진 메뉴 카드, 자동터치10회/초 포함.
- 저장 키·저장42/migration·큰 금액·기존 구매권리 유지. 외부 자산/SDK/폰트 추가 없음. 기존 고지 유지.
- 실기기 설치·최신 Play 구매/복원·Google 업로드 수락은 미확인. AAB는 직접 설치 파일이 아니다.
- 광고는 테스트 ID이므로 정식 광고 수익용으로 바꾸지 않았다. 공개 자동터치 상품 설명은 이 버전 배포 시10회/초와 맞춰야 한다.
- 잘못된 파일 선택 시 업로드 전에 취소하고 버전76025와 파일명을 확인한다. 로컬 결과물 생성만으로 기존 앱이나 사용자 저장은 바뀌지 않는다.
- 방침12·약관9 유지. 개인정보 정책 영향 없음. 출시 시 자동터치 상품 설명 동기화 필요.
