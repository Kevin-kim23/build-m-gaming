# 배경음악 출처와 복원 · 0.62.0

2026-10-07 사용자 제공 Suno MP3 4개를 앱 안에 로컬 파일로 포함합니다. 효과음은 기존 Web Audio 합성 방식이며 로고 영상 내장 ElevenLabs 효과음은 기존 예외입니다.

사용자는 네 곡 모두 Pro/Premier 유료 구독 기간에 직접 생성했다고 확인했습니다. 생성/다운로드 당시 구독 영수증과 곡 URL·생성 기록은 비공개로 보관하세요. 개발 도구가 영수증을 독립 검증한 것은 아닙니다. 다른 사람의 가사·샘플·보이스 사용 허락을 대신 보증하지 않습니다.

- https://help.suno.com/en/articles/2416769
- https://help.suno.com/en/articles/9601665
- https://suno.com/terms/

생성 당시 조건과 현재 배포 조건을 함께 확인해야 합니다. 최신 도움말은 유료 구독 중 다운로드한 곡의 상업 이용도 설명합니다. 계정 내 제한 표시나 별도 조건이 있다면 Suno에 확인하세요.

## 다른 PC에서 빌드하기

`docs/music-assets.json`의 파일명·바이트·SHA-256과 동일한 원본을 다음 경로에 복원합니다. 공개 Git에는 코드·출처·해시만 포함합니다. 파일이 없거나 변경되면 `npm run audio:verify`와 Android 빌드는 실패합니다.

| 제공 파일 | 프로젝트 내 경로 | 용도 |
|---|---|---|
| 화면을 터치하세요 노래.mp3 | public/audio/music/title.mp3 | 터치 시작 화면 반복 |
| 홈화면 음악 1.mp3 | public/audio/music/home-1.mp3 | 홈 첫 곡 |
| 홈화면 음악2.mp3 | public/audio/music/home-2.mp3 | 홈 두 번째 곡, 1→2→1 반복 |
| 전투 음악.mp3 | public/audio/music/battle.mp3 | 실제 전투 반복 |

원본 파일의 앞뒤 무음이나 곡 종료 여운은 유지합니다. 무손실 연속 루프 편집은 하지 않았습니다. 브라우저는 처음 터치하기 전 자동 재생을 막을 수 있으며 Android 앱은 기존 WebView 미디어 설정을 사용합니다. 실기기 청취·백그라운드 복귀를 확인하세요.
