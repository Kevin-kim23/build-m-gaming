# 집 PC 직접 로그인 안내 · 0.83.3 · 2026-10-13

사용자가 로그인 전용 범위 보완을 승인했다. **배포 승인이 아니다.** Codex는 실제 로그인 명령을 실행하지 않는다. 구현·가짜검증·커밋/푸시 뒤 사용자가 자신의 PowerShell과 브라우저에서 직접 실행한다.

## 이번에 여는 문

은행의 출입증 발급 창구처럼, 정해진 로그인 명령에서만 문을 한 번 연다. 브라우저에서 본인이 Google 인증을 끝내면 출입증을 이 PC의 Firebase CLI 설정 파일에 저장하고 로그인 문을 닫는다. 게임 서버 설치·DB 수정 권한을 이번 도구에 열지 않는다.

- 진입은 run-login.cjs에 외부 CLI 패키지 경로와 **login --localhost**만 전달하는 방식이다. Node22, CLI15.33.0 지문, Windows의 사용자 대화형 콘솔을 요구한다. deploy/--no-localhost/--reauth/추가인자/비대화형은 로그인 시작 전에 거부한다.
- 최초 브라우저 주소 GET https://accounts.google.com/o/oauth2/auth, 코드 교환 POST https://accounts.google.com/o/oauth2/token 두 주소만 로그인 전용 허용이다. 호스트·경로·query/body·클라이언트·scope·redirect·state가 정확해야 한다.
- 브라우저 최초 주소는 가드가 검증하고, Google 화면 안에서는 사용자가 직접 조작한다. **브라우저 자체의 Google 로그인 화면 통신 전체를 Node 가드가 검사한다는 뜻은 아니다.** CLI의 토큰 교환은 가드 안에서 수행하며 HTTP 리다이렉트는 거부한다.
- 127.0.0.1에 포트0으로 한 번 bind하여 OS가 빈 임시 포트를 선택한다. redirect는 CLI와 같은 http://localhost:<그 포트>다. 외부 인터페이스에는 listen하지 않는다. state는 매번 암호학적 난수로 새로 만든다.
- GET·로컬 Host·loopback 접속·정확한state인 콜백 한 번만 받는다. 첫 요청에서 추가 연결 수신을 닫고 잘못된 응답/두 번째 응답은 거부한다. 5분 시간초과·오류·Ctrl+C도 종료한다. 원격 코드 복사 방식으로 자동 전환하지 않는다.
- 사용자 PowerShell 출력은 **대기 / 완료 / 실패**뿐이다. URL·세션·토큰·이메일·예외·개인 경로 원문을 출력하거나 파일 로그에 남기지 않는다.
- 토큰 응답의 발급자/대상/만료/필수값을 확인하고, 로그인 요청 권한을 닫은 뒤 인증 파일을 한 번 저장한다. 기존 일반 조회/배포 정책에 로그인 허용을 추가하지 않았다. 성공 후 읽기 정책으로 돌아가며 오류는 전체 중단 상태다.

## CLI 소스 근거와 의도적 차이

다음은 공식 설치 패키지 firebase-tools@15.33.0의 상대 소스 위치다. 기존 관련16개에 lib/scopes.js와 설치 의존 configstore/index.js를 추가해 지문18개를 검사한다. 원본 전체와 의존성 전체의 무결성 보증은 아니다.

| 내용 | 근거 |
| --- | --- |
| OAuth scope5개 | lib/auth.js:181~187의 SCOPES, lib/scopes.js의 상수. email, openid, cloudplatformprojects.readonly, firebase, cloud-platform. 마지막3개는 https://www.googleapis.com/auth/ 접두사 포함 |
| 로그인 주소/query | lib/auth.js:191~218의 getCallbackUrl/getLoginUrl. client_id/scope/response_type=code/state/redirect_uri만 사용. 선택 login_hint는 보내지 않음 |
| 코드 교환 | lib/auth.js:220~260의 getTokensFromAuthorizationCode. POST /o/oauth2/token, FormData의 code/client_id/client_secret/redirect_uri/grant_type=authorization_code. localhost 흐름에는 code_verifier가 없음 |
| localhost 흐름 | lib/auth.js:395~451의 loginWithLocalhostGoogle/loginWithLocalhost. 기존 CLI는 기본9005부터 portfinder를 사용하지만 사용자 요청대로 OS 임시포트 한 번·127.0.0.1로 강화 |
| state/콜백 | 같은 loginWithLocalhost. CLI의 수학난수 state 대신 crypto.randomBytes, 정확한 Host/경로/메서드·콜백1회·시간제한을 추가 |
| 인증 형식 | lib/auth.js:334~339의 recordCredentials: user/tokens/loginScopes 저장, session 삭제. 기존 설정은 보존하며 tempLoginState도 제거 |
| 정확한 설정 위치 | lib/configstore.js:6의 new Configstore(pkg.name), 설치 의존 configstore/index.js:10~22의 xdgBasedir.config 및 configstore/firebase-tools.json. 인자로 인증 경로를 바꿀 수 없고 실제 CLI 객체의 path만 사용 |
| 사용하지 않는 흐름 | lib/auth.js:341~392의 원격 로그인,453~463의 원격fallback; lib/commands/login.js의 nonInteractive 원격로그인·Gemini/통계 질문. 새 실행기는 이 경로를 호출하지 않음 |

CLI 로그인 권한 목록은 Google Cloud 플랫폼 권한을 포함한다. 가드는 이 인증으로 수행할 CLI 요청을 별도로 제한하며, 계정 자체의 Google 권한을 축소하거나 IAM을 변경하지 않는다. 공개 OAuth 클라이언트 상수 값·실제 인증값·계정 번호는 문서에 복사하지 않는다.

## 인증 파일 보호

- CLI가 계산한 정확한 설정 파일 하나만 저장한다. 저장소 내부, OneDrive/Dropbox/Google Drive/iCloud/Box 등 알려진 동기화 폴더 및 환경 변수로 알려진 OneDrive 경로는 거부한다. 심볼릭 링크·junction·다중 hardlink도 거부한다. 임의의 동기화 제품 전체를 탐지한다고 보장하지 않는다.
- 실제 위치의 안전성만 메타데이터로 확인했다. Codex는 이 준비 중 실제 인증 파일 내용을 읽거나 저장하지 않았다.
- 사용자 실행 시 기존 설정을 **저장 전에 한 번** 읽어 다른 설정을 보존한다. 저장 뒤 내용 읽기·출력·백업·임시 인증 파일은 만들지 않는다. 일반 fs 쓰기는 계속 막고, 해당 파일에만 묶인 일회성 쓰기 기능을 사용한다. 필요한 상위 설정 디렉터리만 생성할 수 있다.
- 저장 직전 파일 변경/교체를 감지하면 중단한다. 기존 파일은 한 파일 안에서 쓰므로 전원 차단/디스크 오류 때 부분 저장 위험이 있다. 이 경우 실패로 처리하고 자동 재로그인/삭제/재시도하지 않는다. 운영체제의 사용자 폴더 접근 권한을 상속하며 별도 Windows ACL 검증 완료를 주장하지 않는다.
- 로그인 완료 후 후속 조회에서는 CLI가 인증을 내부적으로 사용하는 것이 필요하다. 원문을 열어 보여주거나 로그인 검증용으로 저장 내용을 다시 출력하지 않는다.

## 사용자 실행 방법

**커밋·푸시·최종 검사 결과를 받은 뒤**, 게임 저장소 폴더에서 본인의 PowerShell을 열고 아래를 실행한다. 예시의 Node 경로는 이번 집 PC에서 이미 확인한 외부 설치 위치다. 다른 PC에서는 확인된 Node22 위치를 사용한다. 인증 URL/코드/이메일/화면은 채팅에 보내지 않는다.

~~~powershell
$taskNode = Join-Path $env:USERPROFILE 'Documents\Codex\2026-10-12\d\work\node22\node-v22.23.3-win-x64\node.exe'
$taskCli = Join-Path $env:LOCALAPPDATA 'BudaeKiugiTools\firebase-15.33.0\node_modules\firebase-tools'
& $taskNode .\tools\firebase-guard\run-login.cjs $taskCli login --localhost
~~~

대기 → 자동으로 열린 Google 브라우저에서 본인이 로그인 → PowerShell 완료 순서다. 브라우저의 대기는 아직 최종 완료가 아니다. PowerShell에서 완료가 나온 뒤 **“로그인 완료”만** 알려준다. 실패면 **“실패”만** 알려주고, 원본 firebase login이나 --no-localhost로 우회하지 않는다. URL을 출력해 복사하는 대체 경로는 제공하지 않는다.

## 가짜 검증과 미완료

- 신규 로그인 검사22개: 정상 주소·권한·state/코드 흐름, 공격6종 URL변조, 외부listen거부, 실 loopback 임시포트/콜백1회/닫힘, 잘못된state/Host/메서드/중복query, 반복응답·반복교환, 외부redirect·403, 경로/동기화/링크/경합/폐기된파일권한, 저장 후읽기0, 토큰응답검사, 원문출력폐기, 비대화형/원격/deploy거부, 정상/실패/시간초과 뒤 로그인 문닫힘.
- selftest-login-cli.cjs는 실제CLI의 scope상수/FormData/설정경로 규칙과 가짜 로그인 자료를 대조한다. 브라우저·실제 인증·외부 요청 없이 통과, 현재 설정경로 안전성도 확인했다.
- 기존 가드40개와 합쳐62개 통과. 전체 npm test/npm run build 최종 결과는 검증결과.md 참조.
- **실제 사용자 로그인·인증 후 projects:list/개발 조회·함수/Run/예약 빈 상태·관리자2계정은 미확인.** 회사 문서 값은 집 직접 확인으로 올리지 않았다.
- 로그인 후 사용자 완료 응답을 받으면 기존 허용된 조회부터 실행한다. Run/Scheduler/IAM 등의 새 주소가 필요하면 소스 근거·주소/방식을 보고하고 허용 목록 조정 승인을 먼저 받는다.
- 배포 실행기·배포 계획서 작성은 내용 설명과 사용자 승인 뒤다. 실제 배포·.env는 별도 승인. .env 값은 사용자만 입력한다.

원본과 동일 보증 없음. 회사 PC 원본과 내일 비교 계획 유지. 오류 시 Ctrl+C/도구 사용 중단. 로그인 성공 후 인증 해제는 별도 승인·안내 사항이며 코드 되돌림만으로 출입증이 지워지지는 않는다. 서버 변경은 없다.

방침11·약관8·게임 저장38·테스트광고 유지. 정책 영향 없음.
# 0.83.4 수신 준비 연동 보완

- Node 22는 숫자 loopback 주소로 listen할 때도 dns.lookup을 호출한다. 로그인 수신 시작 함수의 동기 호출 구간에서만 127.0.0.1을 한 번 로컬 반환한다. all 옵션은 IPv4 주소 배열로 반환한다. 외부 DNS 요청을 보내지 않으며 허용된 Google 주소·scope는 변경하지 않는다.
- 수신 준비 함수는 로그인 모드에서 한 번만 사용할 수 있다. 외부 주소, localhost 문자열 조회, 두 번째 조회, 동기 호출 종료 후 조회, 외부 연결, 읽기 모드 사용은 거부한다. 주소 검증 실패 시 창구를 닫는다.
- PowerShell에서 여러 줄을 붙여 넣으면 구문 오류가 날 수 있다. 각 줄을 별도로 실행하거나 채팅의 절대 경로 한 줄 명령을 사용한다. 실제 로그인은 사용자가 직접 한다. 이번 로컬 수정으로 실제 로그인 성공까지 확인한 것은 아니다.
# 0.83.5 사용자 셸과 Codex 셸 진단 구분

- selftest-login-cli.cjs 실패 시 check에는 고정된 항목 이름만 나온다: cli-source(설치 소스), cli-modules(모듈 로딩), auth-origin(인증 주소), scope-session(범위·가짜 세션), token-form(가짜 요청 형식), credential-path(파일 위치 안전성). 임의 오류/파일 경로/계정/토큰을 출력하지 않는다.
- 이 검사에는 로그인·브라우저·클라우드 요청·인증 파일 내용 읽기가 없다. 로그인 실행 도구 출력은 여전히 대기/완료/실패만이다. 사용자 셸 결과와 Codex 셸 결과가 다르면 원인을 확정할 때까지 로그인 재시도를 안내하지 않는다.
# 0.83.6 집 설치 위치 직접 검사

- run-home-check.cjs는 Windows/Node22/추가 인자 없음에서만 실행한다. 사용자 프로필 아래 AppData/Local/BudaeKiugiTools/firebase-15.33.0/node_modules/firebase-tools를 사용하며 외부 CLI 경로를 별도 입력하지 않는다. 기본 위치가 아닌 설치는 자동 탐색/신뢰하지 않는다.
- source-check의 실패 reason: path-invalid, manifest-unreadable, manifest-invalid, version-mismatch, source-unreadable, source-changed. 원문 오류·경로·내용·계정은 출력하지 않는다. 버전과18개 지문은 기존 그대로이며 다른 파일을 임의 승인하지 않는다.
- 새 실행기는 오프라인 검사만 한다. 파일을 재설치/이동하거나 로그인하지 않는다. 사용자 기존 터미널의 실패 원인은 결과 확인 전 미확인이다.
# 0.83.7 최신 집 설치 위치

- 아래 AppData 기준은 과거 기록이다. 현재 run-home-check.cjs는 실행 중인 node.exe의 위치를 기준으로 `<작업폴더>/node22/node-v22.*-win-x64/node.exe`에서 `<작업폴더>/firebase-cli-15.33.0/node_modules/firebase-tools`를 찾는다. CLI 경로는 저장소 밖이어야 하며 잘못된 배치나 다른 버전 폴더는 거부한다.
- USERPROFILE/LOCALAPPDATA로 CLI 위치를 추정하지 않는다. 설치본의 버전과18개 지문 검사는 유지한다. 사용자 셸에서 이 오프라인 검사 통과를 확인하기 전 로그인 재시도를 안내하지 않는다. 나중에 로그인할 때에도 새 CLI 경로를 명시하고 사용자가 직접 실행한다.
- 새 설치에는 공개 패키지 명세/lock과 의존성만 있으며 회사/집 인증 파일을 복사하지 않았다. 기존 설치와 사용자 로그인 정보는 보존했다.
# 0.83.8 콜백 거부 진단

- 사용자 직접 로그인 명령이 실패로 끝난 직후, 별도 PowerShell 명령 `$LASTEXITCODE`로 고정 숫자를 확인할 수 있다. 인증값이 아니며 로그인 프로그램 stdout/stderr는 여전히 대기/완료/실패뿐이다. 새 파일 로그를 만들지 않는다.
- 번호:1 일반 실패,41 잘못된 단계/중복응답,42 요청 방식,43 Host,44 loopback 상대 주소,45 요청 경로,46 URL 구조,47 중복 항목,48 state 불일치,49 Google 오류 응답,50 미허용 필드,51 코드 누락/길이,52 미허용 iss 필드,53 access_denied 응답. 0은 성공이다. 번호는 원문/값을 포함하지 않는다.
- 52는 iss를 허용했다는 뜻이 아니다. 다른 미허용 필드와 같이 계속 거부하며, 실제 번호를 보기 전 이것이 사용자 실패 원인이라고 단정하지 않는다. 허용 주소/방식/scope는 변경하지 않는다. 원문 인증 URL이나 토큰을 요청하지 않는다.
# 0.83.9 승인된 발급자 검증 · 최신

- 2026-10-13 사용자 승인으로 콜백 iss는 정확히 `https://accounts.google.com` 한 문자열만 허용한다. 디코딩된 쿼리 값을 `===`로 비교한다. 공백 제거, 대소문자 변환, URL 정규화, 슬래시 제거, 부분 일치로 통과시키지 않는다. 문자열 변환은 이미 거부된 형태를 분류하는 데만 사용한다. 원문 URL의 공백·제어문자는 URL 파싱 전 거부한다.
- 누락/중복/잘못된 값은 코드 교환 전에 중단한다. 기존 state 일치/loopback/1회 콜백/정확 scope/출력3상태/파일보호를 유지한다. 새 외부 주소·방식·배포 권한을 추가하지 않는다. 실제 값이 다르면 자동 대체하지 않고 고정 형태 번호만 보고한다.
- 소스 근거: 설치된 firebase-tools15.33.0 `lib/api.js:46`의 authOrigin 기본값은 위 HTTPS 주소다. `lib/auth.js:206` getLoginUrl이 이 주소로 인증 요청을 구성한다. `lib/auth.js:415` loginWithLocalhost는 state/code를 읽으며 원본 CLI 자체에는 이 엄격한 iss 비교가 없다. CLI가 이미 검증한다고 주장하지 않는다.
- 프로토콜 근거(2026-10-13 확인): [Google OIDC reference](https://developers.google.com/identity/openid-connect/reference)의 Authorization Endpoint / Response parameters는 iss가 `https://accounts.google.com`으로 반환됨을 명시한다. [공개 Discovery](https://accounts.google.com/.well-known/openid-configuration)와 [RFC9207 §2.4](https://www.rfc-editor.org/rfc/rfc9207.html#section-2.4)의 발급자 정확 비교가 근거다. ID token의 레거시 발급자 설명을 콜백 허용 값 확장에 사용하지 않는다. 문서 열람은 도구 밖 조사이며 로그인 가드에 Discovery 요청을 추가하지 않았다.
- 최신 종료 번호:52 다른 발급자,54 iss 누락,55 앞뒤 공백,56 대소문자 차이,57 끝 슬래시,58 HTTPS 형식 차이. 중복47/state48/미허용 필드50/다른 오류 번호는 유지한다. 이전52의 ‘iss 자체 미허용’ 설명은 과거다. 원문/실제 값을 기록하지 않는다.
- 사용자 요청의 잔여 인증 점검: 점검한 설정 파일 자체는 있지만 인증 항목이 없고 오늘 이전 수정이었다. 로그인 프로세스/해당 수신0. 정상 로그인 완료 후 파일 재열람은 기존 원칙대로 하지 않는다. 실제 사용자 재로그인 성공은 별도 확인해야 한다.
