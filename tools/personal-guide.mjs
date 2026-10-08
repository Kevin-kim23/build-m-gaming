import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERSONAL_EQUIPMENT, PERSONAL_MAX_LEVEL } from '../src/personal-catalog.js';
import { personalUpgradeStep } from '../src/personal-enhancement.js';
import { personalLevelEffect } from '../src/personal-panels.js';

export const guideDocument = new URL('../개인장비-강화안내.md', import.meta.url);
export function renderPersonalGuide() {
  const items=Object.values(PERSONAL_EQUIPMENT),number=new Intl.NumberFormat('ko-KR');
  return [
    '# 개인 장비 강화 안내', '',
    '실제 게임의 공통 비용·능력 정의로 생성합니다. 게임의 개인 장비 → 상세보기 → 강화 비용·능력표에서도 확인할 수 있습니다.', '',
    '## 지급과 강화 규칙', '',
    ...items.map(item=>`- ${item.name}: ${item.unlockRank} 진급 보상으로 Lv.1 지급. 최대 Lv.${item.maxLevel}.`),
    '- 진급 후에는 골드로 강화하며, 표시된 비용을 지불하면 반드시 1레벨 상승합니다. 추첨과 실패가 없습니다.',
    '- 골드 부족·미보유·최대 레벨이면 강화와 비용 차감이 없습니다.',
    '- 기존 Lv.1~10 능력과 비용은 유지합니다. Lv.10→11까지 비용은 이전 단계의 2배, Lv.11→12부터는 이전 단계의 1.6배입니다. 소수 골드는 버리며 큰 금액도 정수로 정확하게 계산합니다.',
    '- 저장 형식31으로 이전하며, 형식19~30에서 얻은 개인 장비 레벨·골드·병력·장비·점령 기록을 보존합니다. 형식2~18에 적용했던 Lv.1 이전 규칙은 유지합니다.',
    '- 사용 중인 장군검·리볼버 지속시간은 바뀌지 않습니다. 강화한 능력은 다음 사용부터 적용합니다.',
    '- 군사 장비는 사단기로 최대30강까지 해금합니다. 장비 추가 구매 잠금은 유지합니다.', '',
    '## 단계별 확정 강화 비용', '',
    '| 단계 | '+items.map(item=>item.name+' (G)').join(' | ')+' |',
    '|---|'+items.map(()=>'---:|').join(''),
    ...Array.from({length:PERSONAL_MAX_LEVEL-1},(_,i)=>`| Lv.${i+1} → Lv.${i+2} | ${items.map(item=>number.format(personalUpgradeStep(item.id,i+1).cost)).join(' | ')} |`), '',
    '## 레벨별 능력', '',
    '| 레벨 | '+items.map(item=>item.name).join(' | ')+' |',
    '|---|'+items.map(()=>'---|').join(''),
    ...Array.from({length:PERSONAL_MAX_LEVEL},(_,i)=>`| Lv.${i+1} | ${items.map(item=>personalLevelEffect(item.id,i+1)).join(' | ')} |`), '',
    '## 적용 범위', '',
    '- 지휘봉: Lv.11 대령·12 준장·13 소장·14 중장·15 대장 100명 모집 추가. Lv.16~20에는 일괄 모집 합계 비용을 2~10% 할인합니다. 단일 모집에는 미적용이며 학교·전력 상한 조건은 그대로 필요합니다.',
    '- 장군검: 홈 터치·리볼버 자동 터치에 2배 적용. 사용부터 10분 재사용 대기. 방치 수입·전투에는 미적용.',
    '- 사단기: Lv.1=11강, Lv.10=20강, Lv.20=30강. 기존 강화·배치는 유지합니다.',
    '- 장군 리볼버: 0.3초마다 자동 터치, 사용부터 30분 재사용 대기. Lv.20은 250초·833회 지급, 소수 회차는 버립니다.',
    '- 언월도: 초당 수입에만 적용하며 오프라인 정산에도 반영합니다.',
    '- 제독의 나침반: 홈 터치와 리볼버 자동 터치에 적용합니다.',
    '- 전략 지휘패: 배치한 군사 장비의 수입에만 적용합니다. 보관 중 장비와 병력 자체 수입에는 미적용.',
    '- 총사령관 인장: 초당·홈 터치 수입에 적용합니다. 오프라인·자동 터치에도 반영합니다.',
    '- 수입 계산 순서: 군사 장비 수입에 지휘패 → 병력 수입 합산 → 시설 → 점령(초당) → 언월도(초당) 또는 나침반(터치) → 인장 → 장군검(터치). 각 비율 계산에서 소수 골드를 버립니다.',
    '- 군사 장비 수입: 기본 대비 10강6배·20강17배·30강34배. 전투 공격력과 수송기 회복량도 증가합니다. 캠페인 권장 강화(최대20강)는 유지하므로 추가 강화가 공략에 보탬이 됩니다.',
    '- 자체 제작 그림을 캐시합니다. 개인 장비는 Lv.11~20 장식 추가, 군사 장비는 금빛10강 → 백금빛20강 → 붉은 금빛30강으로 성장합니다.', '',
    '## 정의와 검증', '',
    '- 공통 정의: src/personal-catalog.js, src/personal-enhancement.js, src/personal-panels.js',
    '- 생성: npm run docs:personal · 일치 검사: npm test', '',
  ].join('\n');
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  const content=renderPersonalGuide();
  if(process.argv.includes('--check')) {
    if(readFileSync(guideDocument,'utf8').replace(/\r\n/g,'\n')!==content)throw Error('강화 안내를 다시 생성하세요.');
  } else writeFileSync(guideDocument,content,'utf8');
}
