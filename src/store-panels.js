import {STARTER_PACK} from './starter-pack.js';
import {POTIONS,POTION_COUNT_LIMIT} from './potions.js';
import {potionIcon} from './potion-art.js';
import {homeAutoTapMarkup,renderHomeAutoTap} from './home-auto-tap-ui.js';
import {STORE_TEST_GRANT} from './store-purchase.js';
import {fmt} from './format.js';

export function storeMarkup(){
  return `<div class="store-products"><article class="starter-pack" data-starter-pack aria-label="스타터팩">
    <div class="starter-promo-tag">특별 혜택 · 1회 구매!</div>
    <header><h3>스타터팩</h3></header>
    <div class="starter-showcase" aria-label="스타터팩 구성">${Object.values(POTIONS).map(p=>`<div class="starter-vial ${p.id}"><span class="starter-vial-art" aria-hidden="true">${potionIcon(p.id)}</span><strong>${p.shortName} ×${STARTER_PACK[p.id]}</strong></div>`).join('')}</div>
    <strong class="starter-price" data-starter-price>${fmt(STARTER_PACK.priceWon)}<small>원 · 예정</small></strong>
    <button type="button" data-buy-starter disabled>구매 준비 중</button>
    <p data-starter-status role="status" hidden></p>
    <details class="store-purchase-help"><summary>구매·복원 안내</summary><p>자동터치 미포함 · 부스터는 아이템에서 직접 사용합니다.</p>
    <button type="button" data-restore-starter hidden disabled>구매 처리 다시 확인</button>
    <ul>${Object.values(POTIONS).map(p=>`<li>${p.name} ×${STARTER_PACK[p.id]} · ${p.effect} · 1개당 ${p.durationLabel}</li>`).join('')}</ul>
    <p class="potion-note" data-starter-note>부스터는 아이템에서 직접 사용해요.<br>실제 결제는 아직 연결되지 않았어요. 개발 화면에서만 무료 테스트 지급을 받을 수 있어요.</p>
    </details>
  </article>${homeAutoTapMarkup()}</div>`;
}
export function renderStore(s,root,{busy=false,active=true,allowTestGrant=STORE_TEST_GRANT,billing=null,starterBilling=null}={}){
  renderHomeAutoTap(s,root,{busy,active,allowTestGrant,billing});
  const card=root.querySelector('[data-starter-pack]');if(!card)return;
  const claimed=s.starterPack?.claimed===true;
  const full=Object.keys(POTIONS).some(id=>(s.potions?.[id]?.count??0)>POTION_COUNT_LIMIT-STARTER_PACK[id]);
  const button=card.querySelector('[data-buy-starter]'),status=card.querySelector('[data-starter-status]');
  status.hidden=!(claimed||full||!active);
  const play=starterBilling?.configured===true;
  button.disabled=claimed||full||busy||!active||(play?!starterBilling.price:!allowTestGrant);
  const label=claimed?'수령 완료':play?(starterBilling.price?'구매':'상품 확인 필요'):allowTestGrant?'스타터팩 · 무료 테스트':'구매 준비 중';
  const note=claimed?'이 기기의 게임 기록에서 이미 받았어요.':full?'부스터 보관 한도를 확인해 주세요.':play?'구매창의 가격과 결제 계정을 확인하세요.':allowTestGrant?'개발용 무료 테스트 · 실제 결제 없음':'정식 결제 연결 전에는 구매할 수 없어요.';
  const restore=card.querySelector('[data-restore-starter]');
  if(restore){restore.hidden=!play;restore.disabled=busy||!active;}
  if(play){
    const price=card.querySelector('[data-starter-price]'),info=card.querySelector('[data-starter-note]');
    if(price)price.textContent=starterBilling.price||'Play 가격 확인 중';
    if(info)info.textContent='1회 구매 상품입니다. 같은 게임 기록에서 다시 지급하지 않아요. 별도 서버가 없어 재설치·다른 기기에서는 다시 지급될 수 있습니다. 게임 진행 기록은 복원되지 않아요.';
  }
  if(button.textContent!==label)button.textContent=label;
  if(status.textContent!==note)status.textContent=note;
}
