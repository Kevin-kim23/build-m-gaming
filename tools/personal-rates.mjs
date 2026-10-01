import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERSONAL_EQUIPMENT } from '../src/personal-catalog.js';
import { personalUpgradeStep } from '../src/personal-enhancement.js';
import { personalLevelEffect } from '../src/personal-panels.js';

export const ratesDocument = new URL('../개인장비-강화확률표.md', import.meta.url);
export function renderPersonalRates() {
  const items = Object.values(PERSONAL_EQUIPMENT);
  const number = new Intl.NumberFormat('ko-KR');
  return [
    '# 개인 장비 강화 확률표', '',
    '이 문서는 실제 게임의 공통 확률·비용·능력 정의로 생성합니다. 게임에서도 개인 장비 → 상세보기 → 강화 확률표에서 확인할 수 있습니다.', '',
    '## 지급과 강화 규칙', '',
    ...items.map(item => `- ${item.name}: ${item.unlockRank} 진급 보상으로 Lv.1 지급. 최대 Lv.${item.maxLevel}.`),
    '- 진급으로 레벨이 자동 상승하지 않습니다. 보유한 장비를 골드로 강화합니다.',
    '- 성공하면 레벨 +1, 실패하면 현재 레벨 유지. 성공·실패 모두 1회 비용을 소모합니다.',
    '- 골드가 부족하거나 미보유·최대 레벨이면 시도와 비용 차감이 없습니다.',
    '- 매 시도는 독립적입니다. 연속 실패·계급·보유 골드에 따른 숨은 확률 보정이나 확정 성공 누적은 없습니다.',
    '- 비용은 단계마다 2배가 됩니다. 아래 금액은 반올림하지 않은 정확한 G 단위입니다.',
    '- 기존 저장 형식 2~18의 개인 장비는 Lv.1로 이전합니다. 기존 골드·병력·군사 장비 강화·배치와 이미 사용 중인 스킬의 남은 시간은 유지합니다.',
    '- 형식19의 기존 개인 장비 강화 레벨은 보존하고 새 언월도만 Lv.1로 추가합니다. 신규 개인 장비는 정해진 진급 조건을 충족해야 보유 효과가 적용됩니다.',
    '- 군사 장비 강화 방식과 추가 구매 잠금은 유지합니다. 앞으로 추가하는 개인 장비도 같은 확률 강화 구조를 사용합니다.', '',
    '## 단계별 성공 확률과 1회 비용', '',
    `| 단계 | 성공 | ${items.map(item => item.name + ' (G)').join(' | ')} |`,
    '|---|---:|'+items.map(()=>'---:|').join(''),
    ...Array.from({length:9}, (_,i) => {
      const steps = items.map(item => personalUpgradeStep(item.id,i+1));
      return `| Lv.${i+1} → Lv.${i+2} | ${steps[0].chance}% | ${steps.map(step=>number.format(step.cost)).join(' | ')} |`;
    }), '', '## 레벨별 능력', '',
    `| 레벨 | ${items.map(item=>item.name).join(' | ')} |`, '|---|'+items.map(()=>'---|').join(''),
    ...Array.from({length:10}, (_,i)=>`| Lv.${i+1} | ${items.map(item=>personalLevelEffect(item.id,i+1)).join(' | ')} |`), '',
    '- 지휘봉: 해당 단계까지 해금된 병종별 100명 모집. 학교 해금과 모집 골드는 별도로 필요합니다.',
    '- 장군검: 사용부터 10분 재사용 대기. 홈 터치·리볼버 자동 터치에 2배 적용, 방치 수입·전투에는 미적용.',
    '- 사단기: Lv.1=11강, Lv.10=20강. 이미 달성한 군사 장비 강화를 낮추지는 않습니다.',
    '- 장군 리볼버: 0.3초마다 자동 터치, 사용부터 30분 재사용 대기. 1레벨마다 10초 추가(60~150초), 소수 회차는 버립니다.',
    '- 언월도: 원수 진급 보상. 초당 수입에 상시 +120~300%(2.2~4배), 레벨마다 +20%p. 병력·배치 장비의 점령 보너스까지 적용된 초당 수입을 기준으로 늘리며 소수 골드는 버립니다. 8시간 오프라인 수입에도 적용하며 터치·리볼버·전투에는 미적용입니다.',
    '- 사용 중에 강화한 스킬은 다음 사용부터 늘어난 지속시간을 적용합니다. 모든 레벨에 전용 장식과 광택이 있으며 그림은 재사용합니다.', '',
    '## 정의와 검증', '',
    '- 공통 정의: src/personal-catalog.js, src/personal-enhancement.js, src/personal-panels.js',
    '- 생성: npm run docs:personal · 일치 검사: npm test',
    '- 실제 추첨은 0~9,999 정수 중 성공 구간을 사용하며, 나머지 연산의 편향을 없앤 난수를 생성합니다. 테스트는 모든 가능한 값의 성공 개수를 검사합니다.', '',
  ].join('\n');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const content = renderPersonalRates();
  if (process.argv.includes('--check')) {
    if (readFileSync(ratesDocument,'utf8').replace(/\r\n/g,'\n') !== content) throw Error('강화 확률표를 다시 생성하세요.');
  } else writeFileSync(ratesDocument,content,'utf8');
}
