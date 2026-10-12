# 남성 픽셀 캐릭터 원화 · 0.74.0

제작일: 2026-10-10. 도구: Codex 내장 image_gen (CLI/API 우회 사용 없음).
사용자 요청: 모든 캐릭터 남성, 기존 픽셀 느낌 유지, 계급별 복장·장비 세부 개선. 기존 계급장 SVG는 변경하지 않음.

## 파일과 적용

public/characters/ranks-1.png ~ ranks-5.png, 각 1536×1024 RGBA, 3열×2행.
이등병~은하 원수 30개 칸. 일반병·행정병·운전병·의무병 및 간부 모집 그림은 해당 원화를 공유.
연병장·모집·상세에서 같은 캐시 사용. 계급 안내에서는 30계급 모두 표시.
원본 알파를 그대로 복사하고 런타임에 칸별 알파 경계를 찾아 비율을 유지하여 표시. 최초 로드 후 192px 높이 캔버스를 캐시.
다운로드한 타사 그림이나 음악·폰트·라이브러리 추가 없음. 매끄러운 3D풍과 여성 포함 초안은 적용하지 않음.

## 권리 확인

[OpenAI 이용약관](https://openai.com/policies/terms-of-use/)을 2026-10-10 확인: 이용자와 OpenAI 사이에서는 법이 허용하는 범위에서 출력 소유권이 이용자에게 귀속되며, 출력은 다른 출력과 비슷할 수 있습니다. AI 생성물 자체의 독점적 저작권 성립이나 제3자 권리 비침해를 보장한 것은 아닙니다.
특정 게임·작가·실존 부대·국가 문장·브랜드 복제는 요청하지 않았습니다. 의료 표식은 적십자가 아닌 녹색 더하기로 요청했습니다. 고유 캐릭터/표장에 대한 포괄적인 권리조사는 하지 않았습니다.
이번 변경은 게임 안 AI 생성 기능이 아니라 사전 제작 정적 자산 교체입니다. SDK·권한·개인정보 처리·광고 ID·유료결제 로직 변경 없음.
실제 Play Console 설명은 운영자가 새 버전에 맞춰 갱신하며, 이 문서 작성만으로 Console에 반영되지 않습니다.

## 생성 프롬프트

공통: production game sprite atlas, exactly six adult male military characters, premium detailed pixel art, sharp square pixels, stepped outlines, limited palette, three-head chibi proportions, no 3D or smooth illustration. 1536x1024, strict three columns and two rows, whole body centered within 512px cells, 30px clear margin. Genuine transparent alpha outside characters, no background, glow, ground, labels or borders; fictional uniforms, no brands or real flags. Faces, pockets, belts, boots and fabric folds readable.

### 시트 1

Six ALL MALE soldiers: private in camouflage helmet carrying compact rifle; male administrator with short black hair olive cap and clipboard; male driver goggles helmet wrench; male medic short hair helmet medical satchel with GREEN plus symbol; male sergeant navy green beret radio; male staff sergeant tan beret binoculars.

### 시트 2

Six ALL MALE officers: master sergeant olive beret crossed arms; sergeant major tan field cap moustache map; warrant officer navy uniform peaked cap silver trim tablet; second lieutenant olive dress jacket single diamond pin sidearm; first lieutenant forest green double diamond pins holding map; captain navy tunic three small diamond pins binoculars.

### 시트 3

Six ALL MALE command officers: major navy uniform gold shoulder braid and short brown hair; lieutenant colonel olive greatcoat short grey hair planning tablet; colonel navy dress uniform gold buttons folded gloves; brigadier general navy peaked cap gold epaulettes one small gold star baton; major general white navy dress uniform two stars flag; lieutenant general blue greatcoat three stars revolver held safely down.

### 시트 4

Six ALL MALE senior commanders: general navy uniform four gold stars and gold epaulettes; junior marshal black gold dress tunic five gold stars; minor marshal white blue uniform one white star dress sword; middle marshal deep blue white cape two white stars; grand marshal white gold coat three white stars; special marshal purple navy cape four white stars tactical tablet. No laurels.

### 시트 5

Six ALL MALE futuristic commanders: deputy commander midnight blue silver armoured coat white cape; galaxy brigadier dark purple copper gold light armour one copper star; galaxy major general purple armoured uniform two copper stars short gold shoulder cape; galaxy lieutenant general violet armoured coat three copper stars; galaxy general deep purple gold armour four copper stars long split cape; galaxy marshal majestic plum gold heavy command armour five copper stars broad shoulder mantle. Clear faces with short hair and distinct age. All weapons holstered.

원본 파일의 SHA-256은 character-assets.json에 기록합니다.
