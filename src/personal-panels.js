import { personalIcon } from "./personal-art.js";
import { RANKS, rankForArmy } from "./ranks.js";
import { UNITS } from "./units.js";
import { COMMAND_BATON, BULK_RECRUIT, commandBatonStatus, GENERAL_SWORD, generalSwordStatus, generalSwordDuration, DIVISION_FLAG, GENERAL_REVOLVER, divisionFlagStatus, generalRevolverStatus } from "./personal-equipment.js";

function batonMarkup(s) {
  const status = commandBatonStatus(s);
  if (!status.visible)
    return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  return `<article class="personal-item${status.owned ? "" : " locked"}" data-personal-equipment="${COMMAND_BATON.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${personalIcon("baton", status.level)}</div>
      <div><span class="item-class">지휘관 개인 장비</span><h3>${COMMAND_BATON.name} <small>Lv.${status.level || 1}</small></h3><p class="personal-item-status">${status.owned ? ("보유 중 · " + RANKS[rankForArmy(s)] + " 진급 보상") : "🔒 " + COMMAND_BATON.unlockRank + " 진급 시 자동 지급"}</p></div>
    </div>
    <div class="personal-item-effect"><strong>${Object.entries(BULK_RECRUIT).filter(([, rule]) => rule.level <= Math.max(1, status.level)).map(([id]) => UNITS[id].name + ' ' + COMMAND_BATON.recruitAmount + '명 한 번에 모집').join('<br>')}</strong><p>진급할 때마다 한 병종의 100명 모집이 추가됩니다.<br>${Object.entries(BULK_RECRUIT).map(([id, rule]) => rule.unlockRank + ' Lv.' + rule.level + ' · ' + UNITS[id].name).join('<br>')}<br>기존 모집 기능은 유지됩니다. 해당 군사학교가 필요하며, 모집 골드는 별도로 지불합니다.</p></div>
    ${status.owned
      ? '<button class="personal-recruit-link" data-shop-category="recruit">군대 모집으로 이동 <span aria-hidden="true">→</span></button>'
      : '<p class="personal-item-locked">진급 조건을 달성하면 자동으로 지급됩니다.</p>'}
  </article>`;
}


function rewardCard(item, status, icon, effect, button = '') {
  if (!status.visible) return '';
  return `<article class="personal-item${status.owned?'':' locked'}" data-personal-equipment="${item.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${personalIcon(icon,status.level||1)}</div>
    <div><span class="item-class">장군 개인 장비</span><h3>${item.name} <small>Lv.${status.level||1}</small></h3>
    <p class="personal-item-status">${status.owned?'보유 중 · 진급 보상':'🔒 '+item.unlockRank+' 진급 시 자동 지급'}</p></div></div>
    <div class="personal-item-effect">${effect}</div>${status.owned?button:'<p class="personal-item-locked">진급하면 자동 지급됩니다.</p>'}</article>`;
}
export function personalMarkup(s) {
  const baton=commandBatonStatus(s), sword=generalSwordStatus(s), flag=divisionFlagStatus(s), revolver=generalRevolverStatus(s);
  if (![baton,sword,flag,revolver].some(item=>item.visible)) return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  return (baton.visible?batonMarkup(s):'')
    + rewardCard(GENERAL_SWORD,sword,'sword',
      `<strong>${generalSwordDuration(s)/1000}초 동안 터치 골드 2배</strong><p>사용 시점부터 10분 뒤 재사용합니다.<br>준장 Lv.1 30초 → 소장 Lv.2 40초<br>중장 Lv.3 50초 → 대장 Lv.4 60초<br>홈 터치와 리볼버 자동 터치에 적용됩니다.<br>방치 수입과 전투에는 적용되지 않습니다.</p>`,
      '<button class="sword-skill-button" data-use-sword>장군검 사용</button>')
    + rewardCard(DIVISION_FLAG,flag,'flag',
      '<strong>Lv.1 · 10강 이상 장비 추가 구매</strong><p>최초 구매비와 현재 단계까지의 강화비 합계로 1문씩 추가합니다. 현재 강화 단계 유지 · 같은 종류 한 칸 · 문마다 효과 합산</p><strong>Lv.2 · 최대 20강 해금</strong><p>소장 Lv.1 → 중장 Lv.2<br>보유한 같은 종류 전체를 함께 강화하며 강화비도 보유 문수만큼 지불합니다. 11강부터 금장과 빛나는 장식이 추가됩니다.</p>',
      '<button class="personal-recruit-link" data-equipment-category="military">군사 장비 관리 →</button>')
    + rewardCard(GENERAL_REVOLVER,revolver,'revolver',
      '<strong>Lv.1 · 1분 동안 0.3초마다 자동 터치 골드</strong><p>사용 시점부터 30분 뒤 재사용합니다.<br>현재 터치 보상으로 총 200회 지급합니다.<br>장군검 사용 중에는 자동 터치도 2배입니다.<br>전투 자동 사격과는 별개이며, 재접속해도 남은 지급분만 정산합니다.</p>',
      '<button class="sword-skill-button" data-use-revolver>자동 터치 시작 · 1분</button>');
}
