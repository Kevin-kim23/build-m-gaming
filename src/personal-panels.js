import { personalIcon } from "./personal-art.js";
import { RANKS, rankForArmy, GENERAL_MIN_SOLDIERS, GENERAL_MIN_SERGEANTS, GENERAL_RANK, RANK_REQUIREMENTS } from "./ranks.js";
import { fmt } from "./format.js";
import { COMMAND_BATON, commandBatonStatus, GENERAL_SWORD, generalSwordStatus } from "./personal-equipment.js";

function batonMarkup(s) {
  const status = commandBatonStatus(s);
  if (!status.visible)
    return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  return `<article class="personal-item${status.owned ? "" : " locked"}" data-personal-equipment="${COMMAND_BATON.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${personalIcon("baton", status.level)}</div>
      <div><span class="item-class">지휘관 개인 장비</span><h3>${COMMAND_BATON.name} <small>Lv.${status.level || 1}</small></h3><p class="personal-item-status">${status.owned ? ("보유 중 · " + RANKS[rankForArmy(s)] + " 진급 보상") : "🔒 " + COMMAND_BATON.unlockRank + " 진급 시 자동 지급"}</p></div>
    </div>
    <div class="personal-item-effect"><strong>일반병 ${COMMAND_BATON.recruitAmount}명 한 번에 모집${status.level >= 2 ? `<br>하사 ${COMMAND_BATON.recruitAmount}명 한 번에 모집` : ""}${status.level >= 3 ? `<br>중사 ${COMMAND_BATON.recruitAmount}명 한 번에 모집` : ""}</strong><p>중령 Lv.1부터 계급마다 지휘봉 레벨이 1씩 올라갑니다.<br>군대 모집에서 ${COMMAND_BATON.recruitAmount}명 모집 버튼을 사용할 수 있어요.<br>모집에 필요한 골드는 별도로 지불합니다.${status.level < 2 ? "<br>대령 진급 시 Lv.2 · 하사 100명 모집 추가" : "<br>하사 모집은 부사관학교 Lv.1, 중사는 Lv.2가 필요합니다.<br>준장 Lv.3부터 중사 100명 모집 추가"}</p></div>
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
    <div class="personal-item-heading"><div class="personal-item-art">${personalIcon("sword")}</div>
      <div><span class="item-class">장군 개인 장비</span><h3>장군검 <small>Lv.1</small></h3>
      <p class="personal-item-status">${sword.owned ? "보유 중 · 준장 진급 보상" : "🔒 준장 진급 시 자동 지급"}</p></div>
    </div><div class="personal-item-effect"><strong>30초 동안 홈 터치 골드 2배</strong><p>사용 시점부터 10분 뒤 재사용합니다.<br>방치 수입과 전투에는 적용되지 않습니다.</p></div>
    ${sword.owned ? '<button class="sword-skill-button" data-use-sword>장군검 · 30초 터치 골드 2배</button>' : `<p class="personal-item-locked">총 전력 ${fmt(RANK_REQUIREMENTS[GENERAL_RANK])} 이상 · 일반병 ${fmt(GENERAL_MIN_SOLDIERS)}명 · 하사 ${GENERAL_MIN_SERGEANTS}명 필요</p>`}
  </article>`;
  return (baton.visible ? batonMarkup(s) : "") + swordCard;
}
