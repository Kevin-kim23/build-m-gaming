// Prototype only. No billing SDK, purchase token, money charge or real entitlement.
export function createAutoTapTestPurchase(root=document){
  let dialog=null,pending=null;
  const finish=status=>{const resolve=pending;pending=null;resolve?.({status,source:'test'});};
  return ()=>{
    if(pending)return Promise.resolve({status:'unavailable'});
    if(!dialog){
      dialog=root.createElement('dialog');dialog.id='test-purchase-modal';
      dialog.setAttribute('aria-labelledby','test-purchase-title');
      dialog.className='access-dialog';
      dialog.innerHTML='<div class="access-head"><small>실제 결제 없음</small><h2 id="test-purchase-title">자동터치 무료 테스트</h2></div><div class="access-body"><strong>자동터치 · 초당 2회</strong><p>홈에서만 동작하며 상점·전투·팝업·앱 종료 중에는 멈춥니다.</p><p>현재 기기의 게임 기록에 보유 상태를 저장합니다. 계정 기반 구매 복원은 아직 제공하지 않습니다.</p><p>실제 요금은 청구되지 않아요. 이번 확인은 향후 유료 구매나 보호자의 결제 동의를 대신하지 않습니다.</p><p>정식 유료 판매 시에는 가격·복원·청약철회·환불 조건을 구매 전에 안내합니다. 법정대리인 동의 없는 미성년자 계약은 법령에 따라 취소할 수 있습니다.</p><label class="access-check"><input type="checkbox" data-test-purchase-ack><span>무료 테스트 지급이며 실제 구매가 아님을 확인했습니다.</span></label><button type="button" class="access-primary" data-test-purchase-confirm disabled>확인하고 무료로 받기</button><div class="access-actions"><button type="button" data-test-purchase-cancel>취소</button></div></div>';
      const confirm=dialog.querySelector('[data-test-purchase-confirm]'),ack=dialog.querySelector('[data-test-purchase-ack]');
      ack.addEventListener('change',()=>{confirm.disabled=!ack.checked;});
      confirm.addEventListener('click',()=>{if(!ack.checked)return;finish('granted');dialog.close();});
      dialog.querySelector('[data-test-purchase-cancel]').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{if(!dialog.open)finish('cancelled');});
      root.body.append(dialog);
    }
    dialog.querySelector('[data-test-purchase-ack]').checked=false;
    dialog.querySelector('[data-test-purchase-confirm]').disabled=true;
    return new Promise(resolve=>{pending=resolve;try{dialog.showModal();}catch(error){pending=null;throw error;}});
  };
}
