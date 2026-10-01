import { personalIcon } from "./personal-art.js";
import { RANKS, rankForArmy } from "./ranks.js";
import { UNITS } from "./units.js";
import { COMMAND_BATON, BULK_RECRUIT, commandBatonStatus, GENERAL_SWORD, generalSwordStatus, generalSwordDuration, DIVISION_FLAG, GENERAL_REVOLVER, divisionFlagStatus, generalRevolverStatus } from "./personal-equipment.js";

// Compact cards expose only details. Active skills remain on the home screen.
const batonEffect = (s, status) => `<strong>${Object.entries(BULK_RECRUIT).filter(([, rule]) => rule.level <= Math.max(1, status.level)).map(([id]) => UNITS[id].name + ' ' + COMMAND_BATON.recruitAmount + '명 한 번에 모집').join('<br>') || COMMAND_BATON.recruitAmount + '명 모집은 중령 진급 시 해금'}</strong><p>진급할 때마다 한 병종의 100명 모집이 추가됩니다.<br>${Object.entries(BULK_RECRUIT).map(([id, rule]) => rule.unlockRank + ' Lv.' + rule.level + ' · ' + UNITS[id].name).join('<br>')}<br>기존 모집 기능은 유지됩니다. 해당 군사학교가 필요하며, 모집 골드는 별도로 지불합니다.</p>`;
const swordEffect = s => `<strong>${generalSwordDuration(s)/1000}초 동안 터치 골드 2배</strong><p>사용 시점부터 10분 뒤 재사용합니다.<br>준장 Lv.1 30초 → 소장 Lv.2 40초<br>중장 Lv.3 50초 → 대장 Lv.4 60초<br>원수 Lv.5 70초 → 대원수 Lv.6 80초<br>홈 터치와 리볼버 자동 터치에 적용됩니다.<br>방치 수입과 전투에는 적용되지 않습니다.</p>`;
const flagEffect = s => `<strong>장비 최대 ${10+Math.max(1,divisionFlagStatus(s).level)}강 해금</strong><p>소장에서 Lv.1을 지급하고 진급할 때마다 1레벨씩 자동 성장합니다.<br>소장 Lv.1 → 중장 Lv.2 → 대장 Lv.3 → 원수 Lv.4 → 대원수 Lv.5</p><p>${Array.from({length:DIVISION_FLAG.maxLevel},(_,i)=>`Lv.${i+1} · 최대 ${11+i}강`).join('<br>')}</p><p>Lv.6~10은 앞으로 추가될 계급에서 해금됩니다. 이미 달성한 강화 단계는 유지됩니다.<br>장비 추가 구매는 현재 잠겨 있습니다.</p>`;
const revolverEffect = '<strong>Lv.1 · 1분 동안 0.3초마다 자동 터치 골드</strong><p>사용 시점부터 30분 뒤 재사용합니다.<br>현재 터치 보상으로 총 200회 지급합니다.<br>장군검 사용 중에는 자동 터치도 2배입니다.<br>전투 자동 사격과는 별개이며, 재접속해도 남은 지급분만 정산합니다.</p>';

function personalCard(item, status, icon, kind, ownedText = '보유 중 · 진급 보상') {
  if (!status.visible) return '';
  return `<article class="personal-item${status.owned ? '' : ' locked'}" data-personal-equipment="${item.id}">
    <div class="personal-item-heading"><div class="personal-item-art">${personalIcon(icon, status.level || 1)}</div>
      <div><span class="item-class">${kind}</span><h3>${item.name} <small>Lv.${status.level || 1}</small></h3>
      <p class="personal-item-status">${status.owned ? ownedText : '🔒 ' + item.unlockRank + ' 진급 시 자동 지급'}</p></div></div>
    <div class="personal-item-actions"><button type="button" class="personal-detail" data-detail-personal="${item.id}">상세보기</button></div>
  </article>`;
}
function batonCard(s) {
  const status = commandBatonStatus(s);
  return personalCard(COMMAND_BATON, status, 'baton', '지휘관 개인 장비',
    `보유 중 · ${RANKS[rankForArmy(s)]} 진급 보상`);
}
export function personalMarkup(s) {
  const baton = commandBatonStatus(s), sword = generalSwordStatus(s), flag = divisionFlagStatus(s), revolver = generalRevolverStatus(s);
  if (![baton, sword, flag, revolver].some(item => item.visible)) return '<p class="shop-category-empty">진급하면 새로운 개인 장비가 공개됩니다.</p>';
  return batonCard(s)
    + personalCard(GENERAL_SWORD, sword, 'sword', '장군 개인 장비')
    + personalCard(DIVISION_FLAG, flag, 'flag', '장군 개인 장비')
    + personalCard(GENERAL_REVOLVER, revolver, 'revolver', '장군 개인 장비');
}

// Everything the compact card leaves out: the full effect text and exact rules.
export function personalDetailMarkup(s, id) {
  const table = {
    [COMMAND_BATON.id]: [COMMAND_BATON, commandBatonStatus(s), 'baton', '지휘관 개인 장비', batonEffect(s, commandBatonStatus(s))],
    [GENERAL_SWORD.id]: [GENERAL_SWORD, generalSwordStatus(s), 'sword', '장군 개인 장비', swordEffect(s)],
    [DIVISION_FLAG.id]: [DIVISION_FLAG, divisionFlagStatus(s), 'flag', '장군 개인 장비', flagEffect(s)],
    [GENERAL_REVOLVER.id]: [GENERAL_REVOLVER, generalRevolverStatus(s), 'revolver', '장군 개인 장비', revolverEffect],
  };
  const [item, status, icon, kicker, effect] = table[id];
  return {
    kicker, title: `${item.name} <small>Lv.${status.level || 1}</small>`,
    body: `<div class="detail-art detail-art-wide">${personalIcon(icon, status.level || 1)}</div>
      <p>${status.owned ? '보유 중 · ' + RANKS[rankForArmy(s)] + ' 진급 보상' : '🔒 ' + item.unlockRank + ' 진급 시 자동 지급'}</p>
      <div class="personal-item-effect">${effect}</div>
      ${status.owned ? '' : '<p class="personal-item-locked">진급 조건을 달성하면 자동으로 지급됩니다.</p>'}`,
  };
}
