# 상점 제목 글꼴 자산

확인일: 2026-10-15 (한국 시간)

## Black Han Sans Regular

- 용도: 스타터팩 제목·특별 혜택 리본 등 짧은 한글 디스플레이 문구. 본문·긴 안내는 기존 시스템 글꼴을 사용한다.
- 제작자: Zess Type / The Black Han Sans Project Authors.
- 원본: [Google Fonts 공식 저장소](https://github.com/google/fonts/tree/main/ofl/blackhansans).
- 다운로드한 폰트: [고정 커밋의 BlackHanSans-Regular.ttf](https://raw.githubusercontent.com/google/fonts/80a0a8ab22ed6dddb5e05bf6f59c0bc0dc7356ba/ofl/blackhansans/BlackHanSans-Regular.ttf).
- 2026-10-15 조회한 Google Fonts의 해당 폰트 최신 변경 커밋: `80a0a8ab22ed6dddb5e05bf6f59c0bc0dc7356ba`.
- [메타데이터](https://github.com/google/fonts/blob/main/ofl/blackhansans/METADATA.pb): Korean 지원, DISPLAY 분류, normal / weight 400.
- 앱 내 파일: `public/fonts/black-han-sans/BlackHanSans-Regular.ttf` 한 개. 원본을 수정·서브세트·형식 변환하지 않았다.
- 파일 크기: 998,424 bytes (약 975 KiB). 최종 AAB 압축 후 증가량은 별도 빌드 확인 대상이다.
- SHA-256: `31960809284026681774a8e52dc19ebcad26cf69b0ad9d560f288296fbb52739`.
- 앱 실행 시 Google Fonts 서비스에서 받지 않고 로컬 번들로 표시한다. 웹폰트 원격 요청·새 개인정보 전송은 추가하지 않는다.

## 라이선스와 고지

- [해당 폰트 OFL.txt 공식 원문](https://raw.githubusercontent.com/google/fonts/main/ofl/blackhansans/OFL.txt)을 `public/fonts/black-han-sans/OFL.txt`에 수정 없이 보관한다.
- 라이선스 파일 SHA-256: `c324192c8b3a988bae45a9a7e4ac1258b684739003bda114e0523423440457c9`.
- SIL Open Font License 1.1. 저작권문과 라이선스 전문을 함께 포함하는 조건으로 상업용 게임·앱에 번들 및 임베드할 수 있다. 폰트 파일 자체만 판매하지 않는다. 앱 코드를 OFL로 바꿀 의무는 없다.
- 확인 근거: [OFL FAQ 1.3 / 1.4 / 1.20](https://openfontlicense.org/ofl-faq/), [이 폰트의 OFL 전문](https://github.com/google/fonts/blob/main/ofl/blackhansans/OFL.txt).
- `tools/generate-notices.py`가 로컬 OFL 전문과 폰트 해시를 읽어 `docs/licenses/runtime-notices.json`, `docs/licenses/runtime-inventory.json`, 기존 `THIRD_PARTY_NOTICES.txt` 두 산출물에 반영한다. 앱의 정보 → 오픈소스 라이선스 화면에서도 전문을 읽을 수 있다.
- 기존 SDK·라이브러리 고지와 저작권문은 줄이거나 교체하지 않는다. 폰트 바이너리 복사본은 추가하지 않는다.
- 제목의 굵기는 원본 `400`을 사용한다. 원본 자체가 굵은 디스플레이 글꼴이므로 임의의 합성 굵게 처리를 추가할 필요가 없다.

## 재생성·검증

1. 기존 절차대로 Gradle의 `:app:exportNoticeDependencies` 결과를 준비한다.
2. `python tools/generate-notices.py`로 런타임 고지를 다시 생성한다.
3. `node --test tests/license-panel.test.js`로 앱 표시용 전문·해시·내장 SDK 고지 보존 및 텍스트 산출물 일치를 확인한다.
4. 빌드 결과의 폰트 파일이 한 개이며 원본과 해시가 같은지, `OFL.txt` 및 앱용 라이선스 청크가 포함되는지 확인한다.

정책 영향 없음. 로컬 글꼴 추가와 라이선스 고지 갱신이며 방침·약관 번호는 바꾸지 않는다.
