# 동람코 안드로이드 빌드 · 0.61.0

- 정식 앱 ID: `com.dongramco.budaekiugi`. 표시 이름: 부대 키우기.
- 테스트 APK는 `com.dongramco.budaekiugi.dev` / `부대 키우기 테스트`로 별도 설치합니다. 정식 앱 저장을 덮어쓰지 않으며 테스트 앱은 별도 저장을 사용합니다.
- 저장 키와 이전 저장 읽기는 기존 게임 규칙을 따릅니다. 빌드 종류를 바꿔도 저장을 자동으로 옮기거나 초기화하지 않습니다.
- 이전 prototype 패키지와는 별도 앱입니다. 이미 설치한 시제품의 앱 내부 저장은 새 패키지로 자동 이전되지 않습니다. 브라우저 4173 저장에는 영향 없습니다.
- JDK21, Android SDK36, 프로젝트 Gradle8.14.3 / Android Gradle Plugin8.13.0을 사용합니다. 이 PC에는 Build Tools35.0.0(Gradle 기본 선택)과36.0.0이 설치되어 있습니다. 기존 Android Studio·시스템 Java 설정은 변경하지 않습니다.
- 이 PC의 JDK는 LOCALAPPDATA/BudaeKiugi/build-tools에서 자동 검색합니다. 다른 PC에서는 JDK21 폴더를 BUDAE_JAVA_HOME으로, SDK를 ANDROID_HOME으로 지정하세요.
- SDK Manager에서 Android16(API36)을 설치하고 SDK 약관은 직접 확인합니다. 이미 동의된 SDK 라이선스가 있으면 Gradle이 누락된 구성요소를 설치할 수 있습니다.

## 명령

```powershell
npm ci
npm run android:doctor
npm run android:key       # 최초 1회만. 기존 키가 있으면 거부.
npm run android:apk       # 개발용 APK. Play 제출 금지.
npm run android:unsigned  # 기존 업로드 키가 없는 PC: 서명 전 AAB. Play 제출 불가.
npm run android:release   # 음원 검사·웹 빌드·동기화·서명 AAB/APK·lint
```

- Play 업로드: android/app/build/outputs/bundle/release/app-release.aab
- 직접 설치/터치 점검: android/app/build/outputs/apk/release/app-release.apk
- 개발용: android/app/build/outputs/apk/debug/app-debug.apk
- 서명 전 전달용: android/app/build/outputs/bundle/unsigned/app-unsigned.aab
- 버전은 package.json에서 읽으며 `major × 1,000,000 + minor × 1,000 + patch`로 versionCode를 계산합니다. 재업로드 때는 version을 올립니다.
- 배포 명령은 자동으로 Play 업로드하거나 휴대폰에 설치하지 않습니다.
- `android:unsigned`는 별도 unsigned 빌드 종류로 생성하고 서명 항목이 없는지 확인합니다. 정식 `android:release`는 여전히 기존 업로드 키가 없으면 실패하며 디버그 키로 대체하지 않습니다.
- 서명 전 AAB는 설치 파일이 아니며 Play 제출도 할 수 없습니다. 집 PC에 보관 중인 **기존 업로드 키**를 복원한 뒤 정식 release를 다시 빌드하세요. 키가 다른 PC에 있다는 이유로 새 업로드 키를 생성하지 않습니다.

## 이 PC의 준비 기록 · 2026-10-07

- 공식 Adoptium API가 반환한 Windows x64 JDK ZIP `OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip`을 내려받았습니다.
- 출처: [Temurin 21.0.12.1+1 공식 배포](https://github.com/adoptium/temurin21-binaries/releases/tag/jdk-21.0.12.1%2B1).
- API 제공 SHA-256과 실제 파일 SHA-256 일치: `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e`.
- 설치 경로: `%LOCALAPPDATA%/BudaeKiugi/build-tools/jdk-21.0.12.1+1`. 시스템 PATH/JAVA_HOME과 Android Studio의 Java 설정은 변경하지 않았습니다.
- 최초 점검에서 API 37.0 / Build Tools 36.0.0만 설치되어 있었고 API 36은 없었습니다. Gradle이 기존 SDK 라이선스를 확인한 뒤 API 36 revision2와 Build Tools35.0.0을 추가했습니다. 새 라이선스를 자동 승인하지 않았습니다.
- 업로드 서명 키는 사용자 확인상 집 PC에 있습니다. 이 PC에서는 업로드 키를 생성·교체하지 않았으며 테스트 APK는 Android 표준 디버그 서명을 사용합니다. 최초 `adb devices -l` 결과 연결된 실기기는 없었습니다.

## 0.61.0 빌드 확인 결과

- `npm run android:apk`, `npm run android:unsigned` 모두 종료 코드0으로 완료했습니다. Android lint는 **오류0개·경고19개**입니다.
- 경고는 기존 미사용 리소스·스플래시 이미지 구성, manifest 순서, Gradle 업데이트 권고와 세로 고정 설정 등입니다. Android16 일부 큰 화면에서 방향 고정이 무시될 수 있으므로 태블릿·가로 화면은 실제 기기에서 추가 확인해야 합니다.
- 테스트 APK: 8,051,251바이트, `com.dongramco.budaekiugi.dev`, 버전0.61.0/code61000, APK v2 디버그 서명 검증 통과.
- 서명 전 AAB: 6,894,774바이트, 정식 앱 ID와 버전0.61.0 포함. 서명 항목이 없고 `jarsigner`도 unsigned로 확인했습니다. **Play 제출용으로 사용할 수 없습니다.**
- 두 파일 내부의 시작 영상·포스터·타이틀 이미지는 승인된 에셋 해시와 일치하며 `index.html`과 JavaScript도 최종 웹 빌드와 일치합니다.
- 빌드 스크립트의 단일 작업 인자 분리와 Windows PowerShell 해시 명령 호환 문제를 실제 셸 회귀 테스트로 재현·수정했습니다. 네이티브 관련 테스트6개 통과.
- 업로드 키 생성·교체, Play 업로드, 휴대폰 설치는 하지 않았습니다. 연결된 기기가 없어 소리·터치·복귀 실기기 확인은 미완료입니다.

## 시작 영상

- Android `MainActivity`가 WebView 생성 후 미디어 재생의 사용자 제스처 요구를 해제합니다. 사용자 요청에 따른 로고 영상의 음성 자동 재생을 위한 설정입니다.
- 영상의 종료·백그라운드 정지·기존 음소거 선호는 웹 시작 화면 코드에서 관리합니다. 별도 영상 재생 SDK나 Android 권한을 추가하지 않습니다.
- 실제 기기의 소리·복귀 동작은 연결 후 직접 확인해야 합니다.

## 업로드 서명 키와 백업

기본 보관 위치는 사용자 폴더의 `.budae-kiugi/signing/`입니다. BUDAE_SIGNING_FILE 환경변수로 외부 JSON 경로를 지정할 수 있습니다.

- upload.p12: 업로드 개인키(RSA3072, PKCS12).
- upload-signing.json: 키 경로·별칭·랜덤 비밀번호. **비밀 파일**이며 화면/채팅/공개 Git에 붙이지 마세요.
- upload-certificate.pem: 공개 인증서. 비밀번호·개인키가 아닙니다.

생성 폴더는 현재 Windows 사용자만 접근하도록 ACL을 제한합니다. **upload.p12와 upload-signing.json을 함께 암호화한 외장 저장소/개인 비밀번호 보관함에 백업**하세요. 같은 PC 폴더만으로는 백업 완료가 아닙니다. 다른 PC로 복원할 때 JSON의 storeFile을 새 절대 경로로 변경합니다. Play App Signing 설정은 Play Console에서 별도로 해야 하며 로컬 키 생성만으로 완료되지 않습니다.

release는 서명 설정이 없으면 실패합니다. 디버그 키로 대체하지 않으며 기존 키를 자동 덮어쓰지 않습니다. Gradle도 외부 파일에서만 읽고 키·비밀번호는 앱에 포함하지 않습니다.

## 실기기 확인

개발자 옵션과 USB 디버깅을 사용자가 켠 뒤 USB 연결·기기 승인 후 adb devices에 나타나야 합니다. 이번에는 위 `app-debug.apk`를 설치하면 `부대 키우기 테스트`라는 별도 앱으로 확인할 수 있습니다. 정식 앱을 삭제하지 마세요. 기존 업로드 키로 만든 release APK가 준비되면 정식 패키지의 최종 동작도 별도로 확인합니다.

1. 새 설치 첫 실행, 화면 가장자리/내비게이션 바 겹침, 세로 화면 표시.
2. 카드 누르기→레인 출격, 카드 드래그 출격, 지도 한 손가락 이동·두 손가락 확대.
3. 앱 뒤로가기·홈 전환·복귀, 전투 일시정지·효과음 정지/재개.
4. 모집·장비 강화 후 앱 완전 종료·재실행 시 저장 유지.
5. 비행기 모드에서 실행·합성 효과음, 기기 음소거·블루투스 확인.

연결된 기기 없이 위 항목을 검증했다고 보고하지 않습니다. 실제 게임 밸런스·스토어 그래픽·개인정보처리방침·데이터 보안 설문·콘텐츠 등급·Play 심사는 별도입니다.

## 공식 기술 근거

- [명령어 APK/AAB 빌드](https://developer.android.com/build/building-cmdline)
- [업로드 키와 Play App Signing](https://developer.android.com/studio/publish/app-signing)
- [Capacitor 환경 설정](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Gradle Java 호환성](https://docs.gradle.org/current/userguide/compatibility.html)
- [Temurin 압축 배포와 체크섬](https://adoptium.net/installation/archives)
- [Gradle의 누락 SDK 자동 다운로드](https://developer.android.com/studio/intro/update#download-with-gradle)
- [분리된 디버그 앱 ID](https://developer.android.com/build/build-variants)
- [WebView 미디어 사용자 제스처 설정](https://developer.android.com/reference/android/webkit/WebSettings#setMediaPlaybackRequiresUserGesture(boolean))

Temurin21은 개발용으로만 설치하고 앱에 배포하지 않습니다. 새 네이티브 앱 SDK는 추가하지 않았으며 시작 영상·AI 그림의 출처와 확인 범위는 [OPENING_ASSETS.md](OPENING_ASSETS.md)에 기록합니다. 이번 작업은 전체 법률 검토나 회사명/게임명 권리 확인을 대신하지 않습니다.
