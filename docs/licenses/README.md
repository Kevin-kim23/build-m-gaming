# 배포 라이선스 고지

설정 → 게임 정보 → 오픈소스 라이선스에서 인터넷 없이 볼 수 있습니다. `runtime-notices.json`을 앱 코드에 번들하며, 동일한 원문을 루트와 public의 THIRD_PARTY_NOTICES.txt에도 보관합니다. 별도 로컬 청크를 메뉴를 열 때만 읽으며, 목록과 원문을 나눠 긴 고지 전체를 한 번에 화면에 그리지 않습니다.

수동 화면 확인: `npx vite --config tools/license-qa.config.mjs` → http://127.0.0.1:4197/__licenses. 메모리 전용 세션으로 실제 게임 저장을 바꾸지 않습니다.

## 재생성

Android 의존성을 바꾸면 JDK21/SDK가 있는 환경에서 다음을 실행합니다.

```powershell
cd android
./gradlew.bat :app:exportNoticeDependencies
cd ..
python tools/generate-notices.py
npm test
npm run build
```

- releaseRuntimeClasspath의 외부 AAR/JAR, 각 POM 및 부모 POM 라이선스를 사용합니다. 실제 파일 해시는 runtime-inventory.json에 기록합니다. 로컬 경로는 생성 결과에 포함하지 않습니다.
- AndroidX 등 Apache 라이선스 원문, AAR/classes.jar의 LICENSE/NOTICE, Google SDK의 third_party_licenses.json/txt에 포함된 개별 원문을 보존합니다. 같은 원문만 SHA-256으로 중복 제거합니다.
- 프로젝트 모듈인 Capacitor core/android/app은 설치된 패키지의 MIT LICENSE를 추가합니다. 빈 Cordova 플러그인 컨테이너에는 별도 외부 코드가 없고 Cordova framework는 runtime 목록에 포함됩니다.
- Google Mobile Ads·UMP 자체의 POM 표기는 Android Software Development Kit License입니다. SDK 전체를 Apache-2.0이라고 표시하지 않습니다. SDK 안 오픈소스는 공급자가 포함한 고지 원문을 별도 제공합니다.
- Vite, Capacitor CLI, chokidar, connect 등 빌드/개발 전용 도구는 배포 앱 고지에서 제외합니다.
- 미확인 라이선스나 누락된 부모 POM이면 생성기가 실패합니다. 라이선스를 추측하지 말고 공식 원본을 확인하세요.

공식 근거: [Google 라이브러리 고지 안내](https://developers.google.com/android/guides/opensource), [Android SDK 이용조건](https://developer.android.com/studio/terms.html). 이 생성기는 SDK 또는 실행 시 네트워크 기능을 추가하지 않습니다.
