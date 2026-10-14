import {STARTER_PACK} from './starter-pack.js';
import {POTIONS,POTION_COUNT_LIMIT} from './potions.js';
import {potionIcon} from './potion-art.js';
import {homeAutoTapMarkup,renderHomeAutoTap} from './home-auto-tap-ui.js';
import {STORE_TEST_GRANT} from './store-purchase.js';
import {fmt} from './format.js';

export function storeMarkup(){
  return `<div class="store-products"><article class="starter-pack" data-starter-pack aria-label="스타터팩">
    <div class="starter-ribbon"><span>성장 지원</span><small>현재 기기 기록당 1회</small></div>
    <header><small>STARTER PACK</small><h3>시작을 든든하게</h3><p>터치도, 방치도 두 배로!</p></header>
    <div class="starter-rewards">${Object.values(POTIONS).map(p=>`<div class="starter-reward ${p.id}"><div class="starter-potion">${potionIcon(p.id)}<b>×${STARTER_PACK[p.id]}</b></div><strong>${p.name}</strong><span>${p.effect}</span><small>1개당 ${p.durationLabel}</small></div>`).join('')}</div>
    <p class="starter-summary">물약 총 ${STARTER_PACK.red+STARTER_PACK.blue}개 · 자동터치 미포함</p>
    <div class="starter-price"><span>예정 가격</span><strong>${fmt(STARTER_PACK.priceWon)}<small>원</small></strong></div>
    <button type="button" data-buy-starter disabled>구매 준비 중</button>
    <p data-starter-status role="status"></p>
    <p class="potion-note">물약은 아이템에서 직접 사용해요.<br>실제 결제는 아직 연결되지 않았어요. 개발 화면에서만 무료 테스트 지급을 받을 수 있어요.</p>
  </article>${homeAutoTapMarkup()}</div>`;
}
export function renderStore(s,root,{busy=false,active=true,allowTestGrant=STORE_TEST_GRANT}={}){
  renderHomeAutoTap(s,root,{busy,active,allowTestGrant});
  const card=root.querySelector('[data-starter-pack]');if(!card)return;
  const claimed=s.starterPack?.claimed===true;
  const full=Object.keys(POTIONS).some(id=>(s.potions?.[id]?.count??0)>POTION_COUNT_LIMIT-STARTER_PACK[id]);
  const button=card.querySelector('[data-buy-starter]'),status=card.querySelector('[data-starter-status]');
  button.disabled=claimed||full||busy||!active||!allowTestGrant;
  const label=claimed?'수령 완료':allowTestGrant?'스타터팩 · 무료 테스트':'구매 준비 중';
  const note=claimed?'이 기기의 게임 기록에서 이미 받았어요.':full?'물약 보관 한도를 확인해 주세요.':allowTestGrant?'개발용 무료 테스트 · 실제 결제 없음':'정식 결제 연결 전에는 구매할 수 없어요.';
  if(button.textContent!==label)button.textContent=label;
  if(status.textContent!==note)status.textContent=note;
}
