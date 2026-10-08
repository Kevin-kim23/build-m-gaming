// Prototype only. No billing SDK, purchase token, money charge or real entitlement.
export function createAutoTapTestPurchase(root=document){
  let dialog=null,pending=null;
  const finish=status=>{const resolve=pending;pending=null;resolve?.({status,source:'test'});};
  return ()=>{
    if(pending)return Promise.resolve({status:'unavailable'});
    if(!dialog){
      dialog=root.createElement('dialog');dialog.id='test-purchase-modal';
      dialog.setAttribute('aria-labelledby','test-purchase-title');
      dialog.innerHTML='<h2 id="test-purchase-title">유료결제 테스트!</h2><p>특별히 이번엔 그냥 드릴게요.</p><strong>자동터치 · 영구 보유</strong><p class="potion-note">실제 요금은 청구되지 않아요.</p><button type="button" data-test-purchase-confirm>무료로 받기</button><button type="button" data-test-purchase-cancel>취소</button>';
      dialog.querySelector('[data-test-purchase-confirm]').addEventListener('click',()=>{finish('granted');dialog.close();});
      dialog.querySelector('[data-test-purchase-cancel]').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{if(!dialog.open)finish('cancelled');});
      root.body.append(dialog);
    }
    return new Promise(resolve=>{pending=resolve;try{dialog.showModal();}catch(error){pending=null;throw error;}});
  };
}
