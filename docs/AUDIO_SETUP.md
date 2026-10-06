# 합성 효과음 · 0.52.0

현재 앱은 src/audio-synth.js의 Web Audio 합성 효과음만 사용합니다. 배경음악·MP3·음원 ZIP·ElevenLabs 연결이 필요 없습니다. 이전 효과음 ZIP을 복원하지 마세요.

- `npm run audio:verify`: public/ 안에 녹음 음원이나 ZIP이 남아 있으면 실패합니다. 파일은 자동 삭제하지 않으므로 필요한 과거 자산은 앱 밖의 비공개 보관함으로 옮기세요.
- `npm run build:release`: 음원 혼입 검사 후 웹 빌드.
- `npm run android:sync`: 검사·웹 빌드 후 안드로이드 자산 복사.
- 무음 설정, 백그라운드/일시정지 시 소리 정리, 동시 12개 제한을 유지합니다.
- 실제 휴대폰 스피커/블루투스 청취는 별도 확인해야 합니다.

이전 생성 자산의 출처는 docs/audio-manifest-0.51.2.json과 AUDIO_RIGHTS.md의 과거 기록으로 보존합니다. tools/audio-plan.mjs, audio-process.mjs, audio-source.mjs, archived-audio-assets.mjs와 src/sound-player.js는 과거 제작·검증용이며 현재 앱의 진입 코드에서 불러오지 않습니다. 과거 가공기를 실행해 public/에 음원을 만들면 현재 출시 검사가 차단합니다.
