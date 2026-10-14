# 첫 출시 서버 문구 목록 · 2026-10-14

## 결정과 범위

- 첫 출시에서 Google 로그인, 닉네임, 클라우드 저장, 전력 랭킹을 제외한다.
- 서버 작업은 중단한다. `feat/firebase-server-test`는 보관하며 삭제하거나 main에 통째로 합치지 않는다.
- UI 작업은 main `80261e1`에서 새로 만든 `feat/ui-first-release`에서 진행한다. 이전 `feat/ui-improvements`도 보존한다.
- 이 문서는 **목록과 판정만** 담는다. 아래 방침·약관·스토어 원문, 공개 웹페이지, Play Console을 수정하지 않았다.
- 코드와 Git 문서는 직접 확인했다. 현재 공개된 방침·스토어 문구, 실제 서버 작동·과금 상태는 미확인이다.
- 서버 작업 중단은 이미 배포된 서버 중단을 뜻하지 않는다. 실제 클라우드 자원과 예약 작업에는 아무 조치도 하지 않았다.

## 1. 보관할 서버 브랜치의 문구

아래 링크는 서버 브랜치의 확인 시점 `89ad29d`에 고정되어 있다. 새 UI 브랜치에 없는 파일도 있으므로 **서버 브랜치 자료**라는 점에 유의한다. 범위는 대표 위치이며 동일 주제의 설명이 파일 안에 반복되기도 한다.

| 문서/파일 | 위치 | 들어 있는 서버 내용 | 첫 출시에서의 취급 |
| --- | --- | --- | --- |
| [앱 개인정보 안내](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/src/privacy-policy.js#L19) | 19–43, 73행 | 선택형 로그인·서버 저장, 예산 중단, 앱 확인·호출 제한, 신고·보관, 서버 복원용 로컬 백업 | 서버 부분을 첫 출시 원문에 가져오지 않음 |
| [계정 처리 안내](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/src/account-policy.js#L3) | 3–13행 | Google 계정 정보·인증, 닉네임, 클라우드 저장, 국외 처리, 탈퇴·재시도·보관 | 전부 서버 기능용 설명. 실제 완료 여부를 뜻하지 않음 |
| [개발용 계정 안내](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/src/development-policy.js#L3) | 3–14행 | 개발 빌드의 로그인·서버 데이터 처리 | 개발 서버 자료로 보관 |
| [앱 약관](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/src/service-terms.js#L6) | 6–11행 | 서버 일시 중단, 서버 저장·복원, 닉네임·신고 | 첫 출시 기능 설명으로 사용하지 않음 |
| [공개 방침 원고](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/PRIVACY_POLICY.md#L15) | 15, 22–50행 | 선택형 로그인, 서버 기록·보안·신고, 복원 백업 | 공개 게시본과 향후 대조 필요. 이번에는 수정 안 함 |
| [방침 HTML](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/privacy/index.html#L1) | 1행, 한 줄로 생성된 전체 문서 | 위 개인정보 방침의 HTML 사본 | 실제 게시 버전 미확인. 이번에 재생성·배포 안 함 |
| [약관 원고](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/SERVICE_TERMS.md#L5) | 5–7, 13–27행 | 서버 중단, 클라우드 복원, 닉네임·신고 | 서버 약관을 첫 출시 약관으로 복사하지 않음 |
| [스토어 소개](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/PLAY_STORE_LISTING.md#L46) | 2–10, 46행 | 서버 검증 후 공개 조건, 예산 중단 예정, 선택형 Google 로그인·닉네임·저장·불러오기 소개 | 특히 46행은 이용자에게 기능을 약속하는 문구. 첫 출시 범위와 불일치 |
| [서버 데이터 보안 초안](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/SERVER_DATA_SAFETY_DRAFT.md#L5) | 5–33행 | 계정 식별 정보·닉네임·저장·신고·삭제 처리 및 제출 검토 | 서버용 초안으로 보관. 첫 출시 데이터 보안 답변에 그대로 사용 금지 |
| [계정 삭제 초안](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/ACCOUNT_DELETION_DRAFT.md#L5) | 5–46행 | 회원 삭제 흐름, 서버 기록 삭제·보관, 예약 재처리 | 계정 기능 없는 첫 출시와 분리. 이미 존재하는 개발 기록은 별도 운영 문제 |
| [계정 정책 할 일](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/ACCOUNT_POLICY_TODO.md#L1) | 1–42, 63–86, 100행 부근 | 로그인·클라우드·탈퇴·방침 동기화 단계 | 서버 재개 시 참고할 보관 자료 |
| [첫 업로드 점검](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/FIRST_UPLOAD.md#L1) | 1–73행 | 개발 시험 기록 정리, 서버·예산·정책 검증 조건 | 집 PC의 서버 운영 과제와 게임 첫 출시 과제를 혼동하지 않음 |
| [법적 위험 점검](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/LEGAL_RISKS.md#L2) | 2–62행 | 서버 로그인·국외 처리·신고·삭제·비용 보호 초안 | 서버 관련 추가분을 구분. 기존 광고·저작권 점검은 여전히 필요 |
| [정책 동기화 상태](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/POLICY_SYNC_STATUS.md#L4) | 4–40행 | 서버 예산, 신고·삭제, Firebase 및 공개 정책 반영 상태 | 과거 서버 작업 상태. 첫 출시 완료 증거로 사용 금지 |
| [Google 데이터 처리 점검](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/GOOGLE_DATA_PROCESSING_REVIEW.md#L1) | 1–5행 | Firebase 로그인 구성 요소·권한·인증 처리 추가 검토 | 아래의 광고 관련 Google 처리와 분리 |
| [0.77.1 검토 기록](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/store/RELEASE_0771_REVIEW.md#L6) | 6, 11, 25행 | 당시 앱에 Firebase 인증 없음, 개발용 정책 분리, 미완성 서버 기능 홍보 금지 | 역사적 검토 기록. 현재 앱·게시 상태를 증명하지 않음 |
| [개인정보 관리](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/PRIVACY_MANAGEMENT.md#L2) | 2–62행 | 서버 단계별 계정·신고·삭제·예산·공개 정책 과제 | 서버 과제 보관. 문의·접근 관리 등 기존 과제는 유지 |
| [수익화 점검표](https://github.com/Kevin-kim23/build-m-gaming/blob/89ad29d/docs/MONETIZATION_CHECKLIST.md#L2) | 2–62행 | 서버 단계별 정책 검토 추가분 | 광고·결제 과제와 분리해서 판단 |

랭킹은 서버 브랜치 문서에서도 미구현·향후 검토로 적힌 부분이 있다. 이 목록은 문구가 있다는 뜻이며, 로그인·저장·랭킹이 출시 가능한 상태라는 뜻이 아니다.

## 2. 새 UI 브랜치(main 기준)에 이미 있는 설명

| 파일 | 대표 위치 | 직접 확인한 내용 |
| --- | --- | --- |
| `src/privacy-policy.js` | 13, 21–28행 | 회원가입·게임 서버 없음, 기기 내 저장, 서버 복원 없음 |
| `src/service-terms.js` | 6행 | 기기 내 저장 및 계정·서버 동기화 미제공 |
| `docs/store/PRIVACY_POLICY.md` | 15, 25, 30행 | 위 개인정보 안내와 같은 범위 |
| `docs/store/SERVICE_TERMS.md` | 9–11행 | 기기 내 저장, 서버 동기화 없음 |
| `docs/privacy/index.html` | 1행 | 현재 main의 개인정보 안내 HTML |
| `docs/store/PLAY_STORE_LISTING.md` | 35, 70행 | 로그인 없이 이용, 회원가입·로그인 없음 |
| `docs/store/FIRST_UPLOAD.md` | 59행 | 로그인·가입 없는 앱 접근 안내 |
| `docs/store/PRIVACY_RELEASE_DRAFT.md` | 23, 30, 97행 | 서버 없는 게임, 기기 내 기록, 복원 한계 |
| `docs/store/PRIVACY_RELEASE_REVIEW.md` | 9–10, 24행 | 게임 로컬 기록과 광고 데이터 처리 구분 |

기준은 [main 80261e1](https://github.com/Kevin-kim23/build-m-gaming/tree/80261e1)이다. 이 문서들을 이번 작업에서 고치지 않았다. 앱 방침 번호 7, 약관 번호 4를 유지했다. 보관 서버 브랜치의 번호 11·8을 가져오거나 수정하지 않았다.

## 3. 로그인 서버를 빼도 삭제 대상으로 볼 수 없는 문구

- 광고 도구(AdMob·UMP)가 Google 서버로 보내는 정보, 동의 처리, 국외 처리 안내는 **게임 로그인 서버와 별개**다. `src/privacy-policy.js:38`, `src/service-terms.js:21`, `docs/store/PRIVACY_POLICY.md:40`, `GOOGLE_DATA_PROCESSING_REVIEW.md`의 광고 처리 부분 등이 해당한다.
- `docs/store/LEGAL_RISKS.md:24`, `docs/MONETIZATION_CHECKLIST.md:11`의 “운영자 게임 서버가 없어도 광고 도구의 데이터 처리는 존재할 수 있음”이라는 점검 취지는 유지된다.
- 향후 클라우드 기능 도입 시 별도 고지한다는 조건문은 현재 기능 제공 약속과 다르다.
- 개발자 콘솔 계정, 문의 처리용 계정, 결제 서비스 계정에 대한 설명은 게임 회원 계정과 다르다.
- `docs/store/26.10.09 첫 광고 게시 구글 보고서.md`, `docs/store/PRIVACY_FINAL_AUDIT.md`는 이번 비교에서 서버 브랜치 쪽 PC 경로 안내 추가만으로도 변경 목록에 나타났다. 단순히 “계정” 단어가 있다고 서버 기능 안내로 분류하지 않았다.

## 4. 다음 승인 후 할 수 있는 정책 작업(이번에는 미실행)

1. 실제 공개 방침·약관·Play 소개가 어느 브랜치 버전인지 확인한다.
2. 공개본이 서버 초안이라면 첫 출시 구현과 대조한 수정안을 별도로 만든다.
3. 광고·결제 도구의 실제 데이터 처리와 스토어 데이터 보안 답변을 함께 대조한다.
4. 사용자 승인 후 필요한 공개 문구를 반영한다. 현재 문서만으로 법적 적합성이나 공개본 일치를 확정하지 않는다.
5. 개발 서버에 남은 데이터·예약 작업·비용은 집 PC에서 별도 승인 후 다룬다. 이번 UI 브랜치 작업으로 꺼지거나 삭제되지 않는다.

정책 동기화 필요
