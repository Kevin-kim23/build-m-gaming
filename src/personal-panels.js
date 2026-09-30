import { personalIcon } from "./personal-art.js";
import { RANKS, rankForArmy, GENERAL_MIN_SOLDIERS, GENERAL_MIN_SERGEANTS, GENERAL_RANK, RANK_REQUIREMENTS } from "./ranks.js";
import { fmt } from "./format.js";
import { UNITS } from "./units.js";
import { COMMAND_BATON, BULK_RECRUIT, commandBatonStatus, GENERAL_SWORD, generalSwordStatus } from "./personal-equipment.js";

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


export function personalMarkup(s) {
  const baton = commandBatonStatus(s), sword = generalSwordStatus(s);
  if (!baton.visible && !sword.visible)
    return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  const swordCard = !sword.visible ? "" : `<article class="personal-item${sword.owned ? "" : " locked"}" data-personal-equipment="${GENERAL_SWORD.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${personalIcon("sword", sword.level || 1)}</div>
      <div><span class="item-class">장군 개인 장비</span><h3>장군검 <small>Lv.${sword.level || 1}</small></h3>
      <p class="personal-item-status">${sword.owned ? "보유 중 · " + RANKS[rankForArmy(s)] + " 진급 보상" : "🔒 준장 진급 시 자동 지급"}</p></div>
    </div><div class="personal-item-effect"><strong>30초 동안 홈 터치 골드 2배</strong><p>사용 시점부터 10분 뒤 재사용합니다.<br>방치 수입과 전투에는 적용되지 않습니다.</p><strong>Lv.${GENERAL_SWORD.repeatPurchaseLevel} · 10강 장비 추가 구매</strong><p>최초 구매비와 10강까지 강화비 합계로 1문씩 추가합니다.<br>추가 장비도 10강 유지 · 문마다 수입과 전투 공격력 합산<br>같은 종류는 연병장 한 칸에 함께 배치합니다.<br>준장 Lv.1 → 소장 Lv.2 → 중장 Lv.3 → 대장 Lv.4</p></div>
    ${sword.owned ? '<button class="sword-skill-button" data-use-sword>장군검 · 30초 터치 골드 2배</button>' : `<p class="personal-item-locked">총 전력 ${fmt(RANK_REQUIREMENTS[GENERAL_RANK])} 이상 · 일반병 ${fmt(GENERAL_MIN_SOLDIERS)}명 · 하사 ${GENERAL_MIN_SERGEANTS}명 필요</p>`}
  </article>`;
  return (baton.visible ? batonMarkup(s) : "") + swordCard;
}
