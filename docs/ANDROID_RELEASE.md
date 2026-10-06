# 동람코 안드로이드 빌드 · 0.52.0

- 앱 ID: `com.dongramco.budaekiugi`. 사용자 확인: Play에 아직 업로드한 적 없음.
- 표시 이름: 부대 키우기. 저장 키·게임 저장 형식22는 유지.
- 이전 prototype 패키지와는 별도 앱입니다. 이미 설치한 시제품의 앱 내부 저장은 새 패키지로 자동 이전되지 않습니다. 브라우저 4173 저장에는 영향 없습니다.
- JDK21, Android SDK36 / Build Tools36.0.0, 프로젝트 Gradle8.14.3 사용. 기존 Android Studio·시스템 Java 설정은 변경하지 않습니다.
- 이 PC의 JDK는 LOCALAPPDATA/BudaeKiugi/build-tools에서 자동 검색합니다. 다른 PC에서는 JDK21 폴더를 BUDAE_JAVA_HOME으로, SDK를 ANDROID_HOME으로 지정하세요.
- SDK Manager에서 Android16(API36)을 설치하고 SDK 약관은 직접 확인합니다. 이미 동의된 SDK 라이선스가 있으면 Gradle이 누락된 구성요소를 설치할 수 있습니다.

## 명령

```powershell
npm ci
npm run android:doctor
npm run android:key       # 최초 1회만. 기존 키가 있으면 거부.
npm run android:apk       # 개발용 APK. Play 제출 금지.
npm run android:release   # 음원 검사·웹 빌드·동기화·서명 AAB/APK·lint
```

- Play 업로드: android/app/build/outputs/bundle/release/app-release.aab
- 직접 설치/터치 점검: android/app/build/outputs/apk/release/app-release.apk
- 개발용: android/app/build/outputs/apk/debug/app-debug.apk
- 버전은 package.json에서 읽으며 현재 0.52.0 / versionCode52000. 재업로드 때는 version을 올립니다.
- 배포 명령은 자동으로 Play 업로드하거나 휴대폰에 설치하지 않습니다.

## 업로드 서명 키와 백업

기본 보관 위치는 사용자 폴더의 `.budae-kiugi/signing/`입니다. BUDAE_SIGNING_FILE 환경변수로 외부 JSON 경로를 지정할 수 있습니다.

- upload.p12: 업로드 개인키(RSA3072, PKCS12).
- upload-signing.json: 키 경로·별칭·랜덤 비밀번호. **비밀 파일**이며 화면/채팅/공개 Git에 붙이지 마세요.
- upload-certificate.pem: 공개 인증서. 비밀번호·개인키가 아닙니다.

생성 폴더는 현재 Windows 사용자만 접근하도록 ACL을 제한합니다. **upload.p12와 upload-signing.json을 함께 암호화한 외장 저장소/개인 비밀번호 보관함에 백업**하세요. 같은 PC 폴더만으로는 백업 완료가 아닙니다. 다른 PC로 복원할 때 JSON의 storeFile을 새 절대 경로로 변경합니다. Play App Signing 설정은 Play Console에서 별도로 해야 하며 로컬 키 생성만으로 완료되지 않습니다.

release는 서명 설정이 없으면 실패합니다. 디버그 키로 대체하지 않으며 기존 키를 자동 덮어쓰지 않습니다. Gradle도 외부 파일에서만 읽고 키·비밀번호는 앱에 포함하지 않습니다.

## 실기기 확인

개발자 옵션과 USB 디버깅을 사용자가 켠 뒤 USB 연결·기기 승인 후 adb devices에 나타나야 합니다. 설치할 앱은 위 release APK입니다.

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

Temurin21은 개발용으로만 설치하고 앱에 배포하지 않습니다. 새 외부 음원·그림·앱 SDK는 추가하지 않았습니다. 이번 작업은 전체 법률 검토나 회사명/게임명 권리 확인을 대신하지 않습니다.
