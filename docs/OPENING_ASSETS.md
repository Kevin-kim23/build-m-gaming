# 시작 영상과 타이틀 이미지 · 0.61.0

## 앱에서 보이는 순서

1. 제공받은 Dongramco 로고 영상 4초를 재생합니다. 원본 효과음을 포함합니다.
2. 새 세로형 부대 그림과 제목을 표시합니다. 중하단 중앙의 ‘화면을 터치하면 시작합니다’는 2.4초 주기로 천천히 밝아졌다 어두워집니다.
3. 터치하면 기존 게임 저장을 이어갑니다. 그 터치로 골드는 지급하지 않습니다. 복귀 보상·튜토리얼·개인 장비 알림은 게임 진입 뒤 표시합니다.

앱을 잠깐 내렸다 돌아올 때 영상을 처음부터 다시 틀지 않습니다. 영상 실패·재생 지연 시에도 시작 화면으로 넘어갈 수 있습니다. 동작 줄이기 설정에서는 문구가 깜빡이지 않습니다. 첫 설치에서는 로고 소리를 시도하고, 저장에 효과음 끄기가 있으면 조용히 재생합니다. 웹 브라우저가 유성 자동 재생을 막으면 같은 영상을 무음으로 재생하며 Android 앱은 로고 자동 재생을 허용합니다.

## 파일과 원본

0.61.1부터 영상·시작 그림은 네 방향 안전 영역 안에 원본 세로 비율로 맞춥니다. 휴대폰 비율이 달라도 원본 그림을 자르거나 늘리지 않으며, 남는 공간에는 어두운 배경을 표시합니다. 제목·문구 크기는 그림 프레임에 맞추고 짧은 가로 화면에서는 문구를 줄바꿈합니다. 파일 자체를 다시 생성하거나 변경한 것은 아니므로 아래 출처·해시는 그대로입니다.

- `public/opening/studio-logo.mp4`: 사용자가 제공한 `02_Blueprint_Laser_White_Mobile.mp4`를 바이트 변경 없이 복사했습니다. 1080×1920, H.264 Main, 60fps, AAC 48kHz stereo, 4.00초, 1,794,332바이트. 영상·음성 전체 디코드 240프레임 확인.
- `public/opening/studio-poster.webp`: 제공 영상의 2.85초 프레임을 무손실 WebP로 저장한 로딩용 그림.
- `public/opening/title-screen.webp`: 내장 `image_gen`으로 이번 요청에 맞춰 새로 생성한 그림. 생성 식별 파일은 `exec-ef985555-be33-41be-8f85-a07d4fd346b7.png`. 원본 PNG를 무손실 WebP로 변환했고, 디자인 수정·외부 사진 합성·타사 캐릭터 사용은 하지 않았습니다. 제목·시작 문구는 HTML로 따로 표시합니다.
- 승인 자산의 크기·SHA-256: [opening-assets.json](opening-assets.json). `npm run audio:verify`에서 파일 누락·변조를 검사합니다. 로고 영상 외 다른 녹음·영상·음원 ZIP이 섞이면 빌드를 차단합니다.
- 효과음은 게임 내 기존 합성 효과음과 로고 영상의 짧은 효과음만 사용합니다. 배경음악은 없습니다. 독립 MP3/WAV 생성 원본은 저장소에 추가하지 않습니다.

## 출처와 권리 검토 (2026-10-07)

사용자가 회사 로고로 지정한 완성 영상을 통합했습니다. 제공 폴더의 README에는 로고 원본을 업스케일하고 After Effects로 모션을 제작했으며, ElevenLabs Sound Effects v2 생성음을 편집·믹싱했다고 기록되어 있습니다. 해당 원본 로고의 상표권 등록 여부나 제3자 권리 관계까지 확인한 것은 아닙니다.

[ElevenLabs 공식 게시·상업 이용 안내](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)는 유료 구독 중 생성한 콘텐츠에 상업 이용 범위를 부여하지만 무료 생성분·베타 서비스·다른 권리 침해까지 허용하지는 않습니다. [Sound Effects 약관](https://elevenlabs.io/sound-effects-terms)과 [금지 이용 정책](https://elevenlabs.io/use-policy)도 함께 적용됩니다. 이번에는 소리를 로고 영상과 게임의 일부로 사용하며 독립 음원 묶음을 배포하지 않습니다.

사용자는 앞선 작업에서 Creator 요금제라고 확인했습니다. 다만 이번에 제공한 10월 1일 로고 음원의 **생성 당시 구독 증빙은 독립 확인하지 않았습니다**. 출시 전 해당 날짜의 유료 구독·생성 내역, 로고 원본 제작 내역을 비공개로 보관해야 합니다. Topaz 확대는 제공 파일의 과거 제작 과정이며 이번에는 해당 서비스를 다시 호출하지 않았습니다.

새 시작 그림은 가상의 병사·기지·장비를 요청해 생성했습니다. [OpenAI 이용약관](https://openai.com/policies/terms-of-use/)은 당사자 사이에서 적용 법률이 허용하는 범위의 출력 권리를 사용자에게 부여하며, 결과의 유일성이나 제3자 권리 비침해를 보장하지는 않습니다. 실제 국가 표식·알려진 게임 캐릭터·타사 로고를 프롬프트로 요청하지 않았습니다. 이번 검토가 게임 전체의 출시 법률 검토나 분쟁 부재를 보장하는 것은 아닙니다.

## 사용한 최종 이미지 프롬프트

도구: 내장 `image_gen` (CLI/API 키 방식 아님). 투명 배경 없음. 새 이미지 한 장 생성.

> Create one finished vertical 9:16 mobile game title-screen BACKGROUND illustration, very high-quality finely detailed pixel art with coherent crisp 16-bit/32-bit pixel clusters and layered atmospheric depth. This is for an original Korean idle army-building game called 부대 키우기, modern fictional military, serious and cool but inviting for teenagers and young adults. Portrait full-bleed composition: optimistic golden morning light at an orderly growing military base, deep muted teal sky and distant blue mountains; central command building with olive green roofs and warm windows; disciplined tiny friendly soldiers, one original olive-green tracked tank and one small original attack helicopter in the middle distance, military school buildings and parade ground. All original fictional designs, no real-world insignia, national flags, brands or licensed characters. Rich material details, elegant warm gold highlights against forest green and teal shadows, collectible game-art polish, not photorealistic, not a screenshot or a UI mockup. IMPORTANT overlay-safe art direction: top 8-30 percent has calm dark teal sky, no aircraft or busy details, leaving room for a large title that will be rendered separately. Main buildings/vehicles cluster around middle 35-59 percent. Around 64-76 percent keep a wide calm slightly dark empty parade-ground surface so the centered 'tap to start' prompt can be overlaid and read. Small foreground foliage, sandbags and paving can frame bottom corners without covering the central empty ground. Composition remains intelligible cropped slightly on narrow or tall phones. Absolutely NO text, letters, words, logos, watermarks, UI controls, frames, borders or buttons anywhere. Output a single beautiful production-ready portrait background image.

## 0.61.2 배치 변경
사용자 설문 1A·2A에 따라 시작 그림을 cover로 바꿨습니다. 로고는 contain과 흰색 여백을 사용합니다. 시작 중 시스템 바를 숨기고 게임에서 복원하며 건너뛰기는 제거했습니다. 원본 미디어·효과음·파일 해시는 변경하지 않았습니다. 기존 출처 및 미확인 권리 사항은 그대로입니다.
