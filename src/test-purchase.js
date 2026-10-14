import {STARTER_PACK} from './starter-pack.js';
import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';
import {fmt} from './format.js';

// Prototype only. Shared confirmation; no billing SDK, token or real entitlement.
export function createStoreTestPurchase(root=document){
  let dialog=null,pending=null;
  const finish=status=>{const resolve=pending;pending=null;resolve?.({status,source:'test'});};
  return (id='auto')=>{
    if(id!=='auto'&&id!=='starter')return Promise.resolve({status:'unavailable'});
    if(pending)return Promise.resolve({status:'unavailable'});
    if(!dialog){
      dialog=root.createElement('dialog');dialog.id='test-purchase-modal';
      dialog.setAttribute('aria-labelledby','test-purchase-title');
      dialog.className='access-dialog';
      dialog.addEventListener('close',()=>{if(!dialog.open)finish('cancelled');});
      root.body.append(dialog);
    }
    const starter=id==='starter';
    const title=starter?'스타터팩 무료 테스트':'자동터치 무료 테스트';
    const content=starter?`빨간물약 ${STARTER_PACK.red}개 + 파랑물약 ${STARTER_PACK.blue}개`:'자동터치 · 초당 2회 · 영구 보유';
    const description=starter?'현재 기기의 게임 기록당 한 번만 받아요. 자동터치는 포함되지 않으며, 물약은 아이템에서 직접 사용합니다.':'홈에서만 동작하며 상점·전투·팝업·앱 종료 중에는 멈춥니다.';
    dialog.innerHTML=`<div class="access-head"><small>실제 결제 없음</small><h2 id="test-purchase-title">${title}</h2></div><div class="access-body"><strong>${content}</strong><p>예정 가격 ${fmt(starter?STARTER_PACK.priceWon:HOME_AUTO_TAP.priceWon)}원 · 지금은 무료 테스트입니다.</p><p>${description}</p><p>현재 기기의 게임 기록에 보유 상태를 저장합니다. 계정 기반 구매 복원은 아직 제공하지 않습니다.</p><p>실제 요금은 청구되지 않아요. 이번 확인은 향후 유료 구매나 보호자의 결제 동의를 대신하지 않습니다.</p><p>정식 유료 판매 시에는 가격·복원·청약철회·환불 조건을 구매 전에 안내합니다. 법정대리인 동의 없는 미성년자 계약은 법령에 따라 취소할 수 있습니다.</p><label class="access-check"><input type="checkbox" data-test-purchase-ack><span>무료 테스트 지급이며 실제 구매가 아님을 확인했습니다.</span></label><button type="button" class="access-primary" data-test-purchase-confirm disabled>확인하고 무료로 받기</button><div class="access-actions"><button type="button" data-test-purchase-cancel>취소</button></div></div>`;
    const confirm=dialog.querySelector('[data-test-purchase-confirm]'),ack=dialog.querySelector('[data-test-purchase-ack]');
    ack.addEventListener('change',()=>{confirm.disabled=!ack.checked;});
    confirm.addEventListener('click',()=>{if(!ack.checked)return;finish('granted');dialog.close();});
    dialog.querySelector('[data-test-purchase-cancel]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('[data-test-purchase-ack]').checked=false;
    dialog.querySelector('[data-test-purchase-confirm]').disabled=true;
    return new Promise(resolve=>{pending=resolve;try{dialog.showModal();}catch(error){pending=null;throw error;}});
  };
}
export const createAutoTapTestPurchase=root=>{
  const show=createStoreTestPurchase(root);
  return ()=>show('auto');
};
