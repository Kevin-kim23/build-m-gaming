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

- 현재 고지는 releaseRuntimeClasspath와 debugRuntimeClasspath를 합친 외부 AAR/JAR 및 로그인·App Check·클라우드 호출 JavaScript 모듈을 포함합니다. Firebase 인증은 운영 앱에서도 사용하며, App Check debug provider는 debug 빌드에만 들어갑니다. 두 빌드가 같은 라이브러리의 다른 버전을 쓰면 둘 다 보존하므로 이 합산 목록 전체가 release 빌드에 들어간다는 뜻은 아닙니다. 각 POM 및 부모 POM의 라이선스를 사용하고 실제 파일 해시는 runtime-inventory.json에 기록합니다. 로컬 경로는 결과에 포함하지 않습니다. 기본 export는 release이므로 전체 고지를 생성할 때 위 옵션을 생략하지 않습니다.
- AndroidX 등 Apache 라이선스 원문, AAR/classes.jar의 LICENSE/NOTICE, Google SDK의 third_party_licenses.json/txt에 포함된 개별 원문을 보존합니다. 같은 원문만 SHA-256으로 중복 제거합니다.
- 프로젝트 모듈인 Capacitor core/android/app은 설치된 패키지의 MIT LICENSE를 추가합니다. 빈 Cordova 플러그인 컨테이너에는 별도 외부 코드가 없고 Cordova framework는 runtime 목록에 포함됩니다.
- Google Mobile Ads·UMP 자체의 POM 표기는 Android Software Development Kit License입니다. SDK 전체를 Apache-2.0이라고 표시하지 않습니다. SDK 안 오픈소스는 공급자가 포함한 고지 원문을 별도 제공합니다.
- Vite, Capacitor CLI, chokidar, connect 등 빌드/개발 전용 도구는 배포 앱 고지에서 제외합니다.
- 미확인 라이선스나 누락된 부모 POM이면 생성기가 실패합니다. 라이선스를 추측하지 말고 공식 원본을 확인하세요.

0.77 인증 고지: Firebase JS npm 배포에는 루트 LICENSE가 없어, npm `firebase@12.19.0`의 gitHead `9045b759b70e9d19b8cf007d69d988893d845a1e`에 있는 [공식 LICENSE](https://github.com/firebase/firebase-js-sdk/blob/9045b759b70e9d19b8cf007d69d988893d845a1e/LICENSE)를 `firebase-js-LICENSE.txt`로 보존했습니다(SHA-256 `065e45b5674f9bf76670496e5472611b3fbd87fbeaf99336725430a9909cb687`). Capawesome은 설치 패키지의 Apache-2.0 원문을, idb/tslib는 배포 원문을 읽습니다. Firebase 의존성인 javax.inject:1은 POM의 누락을 [JSR-330 공식 소스](https://github.com/javax-inject/javax-inject/blob/master/src/javax/inject/Inject.java)의 Apache-2.0·저작권으로 보완합니다. Play Core/Integrity는 POM에 있는 별도 Google 약관으로 표시하며 Apache로 바꾸지 않습니다.

## 2026-10-12 App Check 의존성 고지 검토

- Android App Check 20.0.0(core/debug/Play Integrity) 추가 후 합산 런타임 파일은 97개에서 109개로 바뀌었습니다. 좌표 기준 26개 추가·14개 제거에는 기존 의존성의 버전 교체도 포함됩니다. App Check interop 18.0.0, Play Integrity 1.4.0/Core common 2.0.4, DataStore 1.1.7 계열, Okio 3.4.0 등 전이 의존성의 POM과 내장 고지도 재수집했습니다. 기존 direct dependency 선언 버전을 일괄 변경한 것은 아닙니다.
- Firebase JS의 실제 런타임 `@firebase/app-check 0.13.1`, `@firebase/functions 0.14.0`를 추가했습니다. `*-interop-types`는 타입 선언만 제공하므로 런타임 목록에서 제외합니다. 최종 합산 고지는 231개 항목·54개 고유 원문·109개 AAR/JAR이며, 종전 217개 항목·52개 고유 원문의 원문은 모두 유지됩니다.
- `androidx.datastore:datastore-preferences-external-protobuf:1.1.7`의 POM은 BSD-3-Clause를 선언하지만 JAR에는 LICENSE/NOTICE가 없습니다. [DataStore 1.1.7 릴리스](https://developer.android.com/jetpack/androidx/releases/datastore#1.1.7)에 연결된 커밋 `420da5f291449f11801e378c6789a328a06ec6cb`의 [재패키징 설정](https://android.googlesource.com/platform/frameworks/support/+/420da5f291449f11801e378c6789a328a06ec6cb/datastore/datastore-preferences-external-protobuf/build.gradle)과 [버전 목록](https://android.googlesource.com/platform/frameworks/support/+/420da5f291449f11801e378c6789a328a06ec6cb/gradle/libs.versions.toml)에서 `protobuf-javalite 4.28.2`를 재패키징함을 확인했습니다. Protocol Buffers의 [v28.2 Java POM](https://github.com/protocolbuffers/protobuf/blob/v28.2/java/pom.xml)도 Java 버전 4.28.2와 BSD-3-Clause를 명시합니다.
- 해당 버전의 [공식 LICENSE 원문](https://github.com/protocolbuffers/protobuf/blob/v28.2/LICENSE)을 `protobuf-4.28.2-LICENSE.txt`에 보존했습니다. SHA-256은 `6e5e117324afd944dcf67f36cf329843bc1a92229a8cd9bb573d7a83130fea7d`입니다. Google의 저작권, 재배포 조건 세 가지, 면책 및 생성 코드 안내를 모두 보존합니다. 생성기는 이 좌표·버전·라이선스 이름에만 이 원문을 연결하고 해시를 검사합니다. 다른 BSD 패키지나 새 버전은 별도 검토 전 계속 실패합니다. 같은 원문은 기존 SDK 포함 고지에도 있어 원문 자체는 중복 저장하지 않습니다.
- 오프라인 화면/번들에서 App Check와 Functions 항목, 정확한 protobuf 원문, 전체 원문 해시 및 루트/public 파일 일치를 테스트합니다. 라이선스 고지 생성은 App Check 등록·인증 성공·운영 배포를 확인한 작업이 아닙니다.

공식 근거: [Google 라이브러리 고지 안내](https://developers.google.com/android/guides/opensource), [Android SDK 이용조건](https://developer.android.com/studio/terms.html). 이 생성기는 SDK 또는 실행 시 네트워크 기능을 추가하지 않습니다.
