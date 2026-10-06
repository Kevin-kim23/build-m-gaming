# 게임 효과음 복원과 검증

0.51.2부터 **배경음악 없이 효과음 40개만** 사용한다. 공개 Git에는 효과음 파일이 없으므로 다른 컴퓨터에서는 비공개 효과음 묶음을 복원한다.

## 다른 컴퓨터에서

1. 최신 코드를 Git에서 받는다.
2. 이전 버전이 있다면 프로젝트의 `public/audio/music/` 폴더를 삭제한다. 새 ZIP을 덮어쓰기만 하면 예전 음악이 남는다.
3. 최신 `budae-kiugi-audio-0.51.2.zip`을 **프로젝트 최상위**에 푼다. `package.json` 옆에 `public/audio/sfx/tap.mp3`와 `public/audio/manifest.json`이 있어야 한다. 0.51.0/0.51.1 ZIP은 현재 버전에 사용하지 않는다.
4. `npm ci` 후 `npm run audio:verify`로 효과음 40개와 해시를 확인한다.
5. 웹은 `npm run dev`, Android 복사는 `npm run android:sync`로 실행한다.

음원이 없어도 코드 테스트와 일반 `npm run build`는 가능하며 기존 합성 효과음이 대체한다. **출시용 `npm run build:release`와 `npm run android:sync`는 누락·변조·중복 기록·예전 음악 파일이 있으면 실패한다.** 검사가 실패하면 표시된 파일만 확인하고, 현재 효과음 묶음으로 복원한다. 게임 저장을 지울 필요는 없다.

## 재생과 담당 코드

상단 버튼은 효과음만 켜고 끈다. 기존 소리 설정과 저장 형식은 유지한다. 홈·지도·전투의 반복 음악, 음악 전환·페이드·음량 낮추기 타이머는 없다. 진급·승패의 짧은 알림음은 효과음으로 유지한다.

효과음은 버퍼를 재사용하고 동시에 최대 10개를 재생한다. 앱 비활성·음소거·전투 정지/종료 시 재생 중인 소리를 정리한다. 로딩 완료 후 지난 동작을 늦게 재생하지 않는다.

- `src/audio-catalog.js`: 효과음 ID·음량·최소 간격.
- `src/audio.js`: 홈·상점·전투가 호출하는 공통 창구.
- `src/sound-player.js`: 버퍼 캐시·동시 음수·노드 정리.
- `src/audio-synth.js`: 파일 로딩/실패 시 기존 합성 효과음 대체 수단.
- `src/battle-audio-events.js`: 같은 시각에 생긴 출격·공격도 한 번씩 처리.
- `tools/audio-plan.mjs`, `tools/audio-source.mjs`, `tools/audio-process.mjs`: 효과음 제작 목록·원본 선택·가공.
- `tools/audio-assets.mjs`, `tools/verify-audio.mjs`: 현재 효과음만 포함하는지 출시 전에 확인.
- `public/audio/manifest.json`: 사용 중인 효과음 40개의 출처·길이·해시.

## 원본 재가공

`private-audio/`에 효과음 원본과 `sources.json`이 있을 때만 다음 명령을 쓴다. 음악 제작 기록은 과거 출처 기록이며 현재 가공 목록에 포함되지 않는다. FFmpeg는 개발 도구로만 사용하고 게임에는 포함하지 않는다.

```powershell
node tools/audio-process.mjs 'C:/path/to/ffmpeg.exe'
npm run audio:verify
```

같은 원본·처리 버전·해시는 재가공하지 않는다. 유료 생성 호출도 없다. 실제 청취·실기기·블루투스 확인은 별도로 한다. [권리 기록](AUDIO_RIGHTS.md)을 함께 확인한다.
