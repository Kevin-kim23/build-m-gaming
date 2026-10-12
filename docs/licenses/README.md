# 배포 라이선스 고지

설정 → 게임 정보 → 오픈소스 라이선스에서 인터넷 없이 볼 수 있습니다. `runtime-notices.json`을 앱 코드에 번들하며, 동일한 원문을 루트와 public의 THIRD_PARTY_NOTICES.txt에도 보관합니다. 별도 로컬 청크를 메뉴를 열 때만 읽으며, 목록과 원문을 나눠 긴 고지 전체를 한 번에 화면에 그리지 않습니다.

수동 화면 확인: `npx vite --config tools/license-qa.config.mjs` → http://127.0.0.1:4197/__licenses. 메모리 전용 세션으로 실제 게임 저장을 바꾸지 않습니다.

## 재생성

Android 의존성을 바꾸면 JDK21/SDK가 있는 환경에서 다음을 실행합니다.

```powershell
cd android
./gradlew.bat :app:exportNoticeDependencies -PnoticeVariant=all
cd ..
python tools/generate-notices.py
npm test
npm run build
```

- 현재 고지는 releaseRuntimeClasspath와 debugRuntimeClasspath를 합친 외부 AAR/JAR 및 개발용 인증 JavaScript 모듈을 포함합니다. 두 빌드가 같은 라이브러리의 다른 버전을 쓰면 둘 다 보존합니다. 이 목록은 Firebase 인증 SDK가 출시용에 들어간다는 뜻은 아닙니다. 각 POM 및 부모 POM의 라이선스를 사용하고 실제 파일 해시는 runtime-inventory.json에 기록합니다. 로컬 경로는 결과에 포함하지 않습니다. 기본 export는 release이므로 전체 고지를 생성할 때 위 옵션을 생략하지 않습니다.
- AndroidX 등 Apache 라이선스 원문, AAR/classes.jar의 LICENSE/NOTICE, Google SDK의 third_party_licenses.json/txt에 포함된 개별 원문을 보존합니다. 같은 원문만 SHA-256으로 중복 제거합니다.
- 프로젝트 모듈인 Capacitor core/android/app은 설치된 패키지의 MIT LICENSE를 추가합니다. 빈 Cordova 플러그인 컨테이너에는 별도 외부 코드가 없고 Cordova framework는 runtime 목록에 포함됩니다.
- Google Mobile Ads·UMP 자체의 POM 표기는 Android Software Development Kit License입니다. SDK 전체를 Apache-2.0이라고 표시하지 않습니다. SDK 안 오픈소스는 공급자가 포함한 고지 원문을 별도 제공합니다.
- Vite, Capacitor CLI, chokidar, connect 등 빌드/개발 전용 도구는 배포 앱 고지에서 제외합니다.
- 미확인 라이선스나 누락된 부모 POM이면 생성기가 실패합니다. 라이선스를 추측하지 말고 공식 원본을 확인하세요.

0.77 인증 고지: Firebase JS npm 배포에는 루트 LICENSE가 없어, npm `firebase@12.19.0`의 gitHead `9045b759b70e9d19b8cf007d69d988893d845a1e`에 있는 [공식 LICENSE](https://github.com/firebase/firebase-js-sdk/blob/9045b759b70e9d19b8cf007d69d988893d845a1e/LICENSE)를 `firebase-js-LICENSE.txt`로 보존했습니다(SHA-256 `065e45b5674f9bf76670496e5472611b3fbd87fbeaf99336725430a9909cb687`). Capawesome은 설치 패키지의 Apache-2.0 원문을, idb/tslib는 배포 원문을 읽습니다. Firebase 의존성인 javax.inject:1은 POM의 누락을 [JSR-330 공식 소스](https://github.com/javax-inject/javax-inject/blob/master/src/javax/inject/Inject.java)의 Apache-2.0·저작권으로 보완합니다. Play Core/Integrity는 POM에 있는 별도 Google 약관으로 표시하며 Apache로 바꾸지 않습니다.

공식 근거: [Google 라이브러리 고지 안내](https://developers.google.com/android/guides/opensource), [Android SDK 이용조건](https://developer.android.com/studio/terms.html). 이 생성기는 SDK 또는 실행 시 네트워크 기능을 추가하지 않습니다.
