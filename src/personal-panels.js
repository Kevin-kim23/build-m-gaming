import { GENERAL_MIN_SOLDIERS, GENERAL_RANK, RANK_REQUIREMENTS } from "./ranks.js";
import { fmt } from "./format.js";
import { COMMAND_BATON, commandBatonStatus, GENERAL_SWORD, generalSwordStatus } from "./personal-equipment.js";

// Original pixel geometry; no external image or insignia asset is used.
function batonIcon(level) {
  return `<svg class="command-baton-art" viewBox="0 0 96 96" role="img" aria-label="${COMMAND_BATON.name} 픽셀 그림" shape-rendering="crispEdges">
    <path fill="#111f1966" d="M45 22h14v60H45zM39 76h26v8H39z"/>
    <path fill="#283b32" d="M41 20h14v56H41z"/>
    <path fill="#556953" d="M43 20h4v56h-4z"/>
    <path fill="#192b25" d="M51 20h4v56h-4z"/>
    <path fill="#a89056" d="M37 14h22v12H37zM37 70h22v10H37zM41 39h14v6H41z"/>
    <path fill="#e9d398" d="M39 12h18v7H39zM39 70h18v4H39zM41 39h14v2H41z"/>
    <path fill="#75653e" d="M37 22h22v4H37zM37 77h22v3H37z"/>
    <path fill="#f6e5ac" d="M46 28h4v4h-4zM44 32h8v4h-8zM46 36h4v3h-4z"/>
    ${level >= 2 ? '<path fill="#efcf73" d="M37 48h22v4H37zM37 58h22v4H37zM35 10h26v3H35z"/>' : ""}
  </svg>`;
}

function batonMarkup(s) {
  const status = commandBatonStatus(s);
  if (!status.visible)
    return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  return `<article class="personal-item${status.owned ? "" : " locked"}" data-personal-equipment="${COMMAND_BATON.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${batonIcon(status.level)}</div>
      <div><span class="item-class">지휘관 개인 장비</span><h3>${COMMAND_BATON.name} <small>Lv.${status.level || 1}</small></h3><p class="personal-item-status">${status.owned ? (status.level >= 2 ? "보유 중 · 대령 진급 보상" : "보유 중 · 중령 진급 보상") : "🔒 " + COMMAND_BATON.unlockRank + " 진급 시 자동 지급"}</p></div>
    </div>
    <div class="personal-item-effect"><strong>일반병 ${COMMAND_BATON.recruitAmount}명 한 번에 모집${status.level >= 2 ? `<br>하사 ${COMMAND_BATON.recruitAmount}명 한 번에 모집` : ""}</strong><p>군대 모집에서 ${COMMAND_BATON.recruitAmount}명 모집 버튼을 사용할 수 있어요.<br>모집에 필요한 골드는 별도로 지불합니다.${status.level < 2 ? "<br>대령 진급 시 Lv.2 · 하사 100명 모집 추가" : "<br>하사 모집은 부사관학교 Lv.1도 필요합니다."}</p></div>
    ${status.owned
      ? '<button class="personal-recruit-link" data-shop-category="recruit">군대 모집으로 이동 <span aria-hidden="true">→</span></button>'
      : '<p class="personal-item-locked">진급 조건을 달성하면 자동으로 지급됩니다.</p>'}
  </article>`;
}


function swordIcon() {
  return `<svg class="command-baton-art general-sword-art" viewBox="0 0 96 96" role="img" aria-label="장군검 픽셀 그림" shape-rendering="crispEdges">
    <path fill="#17282066" d="M49 12h10v51H49zM33 62h40v6H33zM47 68h14v20H47z"/>
    <path fill="#6f9796" d="M43 17h10v42H43zM46 10h4v7H46z"/>
    <path fill="#dbe9d8" d="M44 17h4v42H44zM46 12h3v5H46z"/>
    <path fill="#91b7b4" d="M49 17h3v42H49z"/>
    <path fill="#a48340" d="M29 57h38v7H29zM39 62h18v5H39zM41 81h14v6H41z"/>
    <path fill="#eed087" d="M31 56h34v3H31zM43 81h10v3H43z"/>
    <path fill="#374c40" d="M43 65h10v16H43z"/>
    <path fill="#c3a465" d="M43 67h10v2H43zM43 73h10v2H43zM43 79h10v2H43z"/>
    <path fill="#74a6a5" d="M45 58h6v5H45z"/>
    <path fill="#dec477" d="M62 63h3v13h-3zM60 75h7v9h-7z"/>
  </svg>`;
}
export function personalMarkup(s) {
  const baton = commandBatonStatus(s), sword = generalSwordStatus(s);
  if (!baton.visible && !sword.visible)
    return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  const swordCard = !sword.visible ? "" : `<article class="personal-item${sword.owned ? "" : " locked"}" data-personal-equipment="${GENERAL_SWORD.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${swordIcon()}</div>
      <div><span class="item-class">장군 개인 장비</span><h3>장군검 <small>Lv.1</small></h3>
      <p class="personal-item-status">${sword.owned ? "보유 중 · 준장 진급 보상" : "🔒 준장 진급 시 자동 지급"}</p></div>
    </div><div class="personal-item-effect"><strong>장군의 상징</strong><p>현재는 외형·보유 표시만 제공하며 능력치 효과는 없습니다.</p></div>
    ${sword.owned ? "" : `<p class="personal-item-locked">총 전력 ${fmt(RANK_REQUIREMENTS[GENERAL_RANK])} 이상 · 일반병 ${fmt(GENERAL_MIN_SOLDIERS)}명 · 하사 40명 필요</p>`}
  </article>`;
  return (baton.visible ? batonMarkup(s) : "") + swordCard;
}
