# 상점 제목 글꼴 자산

확인일: 2026-10-15 (한국 시간)

## Black Han Sans Regular

- 용도: 스타터팩 제목·특별 혜택 리본 등 짧은 한글 디스플레이 문구. 본문·긴 안내는 기존 시스템 글꼴을 사용한다.
- 제작자: Zess Type / The Black Han Sans Project Authors.
- 원본: [Google Fonts 공식 저장소](https://github.com/google/fonts/tree/main/ofl/blackhansans).
- 다운로드한 폰트: [고정 커밋의 BlackHanSans-Regular.ttf](https://raw.githubusercontent.com/google/fonts/80a0a8ab22ed6dddb5e05bf6f59c0bc0dc7356ba/ofl/blackhansans/BlackHanSans-Regular.ttf).
- 2026-10-15 조회한 Google Fonts의 해당 폰트 최신 변경 커밋: `80a0a8ab22ed6dddb5e05bf6f59c0bc0dc7356ba`.
- [메타데이터](https://github.com/google/fonts/blob/main/ofl/blackhansans/METADATA.pb): Korean 지원, DISPLAY 분류, normal / weight 400.
- 앱 내 파일: `public/fonts/black-han-sans/BlackHanSans-Regular.woff2` 한 개. 0.76.26에서 전체 글리프를 유지한 WOFF2로 변환했다. 서브셋·글자 삭제·해상도 축소는 하지 않았다.
- 앱 내 크기: **190,720 bytes**, 원본 998,424 bytes보다 **807,704 bytes(80.9%)** 감소. AAB 다운로드 크기의 감소량과는 구분한다.
- WOFF2 SHA-256: `d74df563d0af150c2bee16f157a59852eff2da56c572ae710680000ad6400b10`.
- 원본 TTF와 OFL은 `assets/source-fonts/black-han-sans/`에 보존하며 앱에는 넣지 않는다. 원본 SHA-256: `31960809284026681774a8e52dc19ebcad26cf69b0ad9d560f288296fbb52739`.
- 원본의 글리프 2,734개, 유니코드 매핑 2,733개와 모든 글자 윤곽·힌팅·글자 폭·베어링·이름·배치 테이블을 대조했다. 서명 0개의 빈 DSIG 테이블은 변환기가 제거한다. WOFF2 압축 플래그와 체크섬 등 포맷 정보가 바뀌므로 파일 자체가 바이트 단위로 같은 것은 아니다. 결과는 `docs/font-conversion.json`에 기록한다.
- 앱 실행 시 Google Fonts 서비스에서 받지 않고 로컬 번들로 표시한다. 웹폰트 원격 요청·새 개인정보 전송은 추가하지 않는다.

## 라이선스와 고지

- [해당 폰트 OFL.txt 공식 원문](https://raw.githubusercontent.com/google/fonts/main/ofl/blackhansans/OFL.txt)을 `public/fonts/black-han-sans/OFL.txt`에 수정 없이 보관한다.
- 라이선스 파일 SHA-256: `c324192c8b3a988bae45a9a7e4ac1258b684739003bda114e0523423440457c9`.
- SIL Open Font License 1.1. 저작권문과 라이선스 전문을 함께 포함하는 조건으로 상업용 게임·앱에 번들 및 임베드할 수 있다. 폰트 파일 자체만 판매하지 않는다. 앱 코드를 OFL로 바꿀 의무는 없다.
- 이 폰트의 저작권문 뒤에는 Reserved Font Name 선언이 없다. OFL 1.1/공식 FAQ 5.7은 이름을 기본 예약하지 않으므로 기존 표시 이름을 유지한다. WOFF2 변환 사실은 이 문서에 명시하며, 원 제작자가 게임을 보증하거나 변환을 승인했다는 뜻으로 표시하지 않는다.
- 확인 근거: [OFL FAQ 1.3 / 1.4 / 1.20 / 2.2 / 5.7](https://openfontlicense.org/ofl-faq/), [이 폰트의 OFL 전문](https://github.com/google/fonts/blob/main/ofl/blackhansans/OFL.txt). 2026-10-15 공식 원문 재확인.
- `tools/generate-notices.py`가 로컬 OFL 전문과 **WOFF2 해시**를 읽어 `docs/licenses/runtime-notices.json`, `docs/licenses/runtime-inventory.json`, 루트 `THIRD_PARTY_NOTICES.txt`에 반영한다. 앱의 정보 → 오픈소스 라이선스 화면에서도 전문을 읽을 수 있다. public의 중복 TXT는 제거하고 앱은 JSON 전문을 한 번만 포함한다.
- 기존 SDK·라이브러리 고지와 저작권문은 줄이거나 교체하지 않는다. 폰트 바이너리 복사본은 추가하지 않는다.
- 제목의 굵기는 원본 `400`을 사용한다. 원본 자체가 굵은 디스플레이 글꼴이므로 임의의 합성 굵게 처리를 추가할 필요가 없다.

## 재생성·검증

1. 별도 Python 가상환경에 `fonttools[woff]==4.67.0`, `Brotli==1.2.0`을 공식 PyPI에서 설치한다. 앱/npm 의존성에는 추가하지 않는다.
2. `python tools/convert-font.py`로 원본 TTF에서 WOFF2와 검증 기록을 생성한다. `python tools/convert-font.py --check`는 쓰기 없이 전체 글리프·매핑·메트릭을 다시 검증한다. 도구: [FontTools 공식 WOFF2 설명](https://fonttools.readthedocs.io/en/latest/ttLib/woff2.html).
3. 기존 절차대로 Gradle의 `:app:exportNoticeDependencies` 결과를 준비하고 `python tools/generate-notices.py`로 런타임 고지를 다시 생성한다.
4. `node --test tests/font-assets.test.js tests/license-panel.test.js`로 앱 경로·검증 기록의 파일 해시·OFL 전문·내장 SDK 고지 보존을 확인한다.
5. 빌드 결과에 WOFF2 한 개와 `OFL.txt` 및 앱용 라이선스 청크가 포함되고, 원본 TTF가 들어가지 않는지 확인한다. 상점과 홈 자동터치 소개의 한글 제목은 작은 화면에서도 별도로 확인한다.

정책 영향 없음. 로컬 글꼴 추가와 라이선스 고지 갱신이며 방침·약관 번호는 바꾸지 않는다.
