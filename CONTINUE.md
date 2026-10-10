# 현재 작업 0.72.5

- 물약 광고 선택 카드에 로딩 문구/스피너. 컨트롤러 busyItem과 같은 수명으로 관리하며 완료·취소·실패 모두 해제. 저장·SDK·방침 변화 없음. 전체641개 테스트·웹 빌드 및 기존 키 서명 AAB72005 생성/검증 완료. 실폰 확인과 Play 업로드는 별도. 파일·해시는 검증결과.md.

# 현재 작업 0.72.4

- main 기준. 자리 비움2배 광고를 Android 보상형 광고에 연결. 기존 물약 광고 ID·동의·네이티브 프로토콜1 재사용. 권한·SDK·저장33 변화 없음.
- 설정 → 게임 정보 → 오픈소스 라이선스. `docs/licenses/runtime-notices.json`을 앱에 번들하며 Gradle runtime/POM/SDK 포함 고지로 생성. 재생성 절차는 docs/licenses/README.md.
- 미사용 sound-player/audio-catalog 및 전용 검사기 제거. 합성 효과음·음악은 유지. 비공개 음원은 절대 커밋하지 않음.
- 앱 방침7/약관4. 공개 Google Docs는 마지막 확인 개정6. 배포 전 공개 문서 문구 동기화 필요. Console/Docs를 이번 코드 작업에서 수정하거나 제출하지 않음.
- 기존 무료 자동터치 유지, 실제 Billing 작업 보류. AdMob 실제 승인 관련 업무도 별도. 법적 남은 사항은 기존 PRIVACY_RELEASE_REVIEW.md 그대로.
- 전체 검증·Android 결과는 검증결과.md. 과거 전체 상황은 docs/history/CONTINUE-through-0.72.3.md에 보관. 필요한 과거 항목만 검색해서 읽기.
