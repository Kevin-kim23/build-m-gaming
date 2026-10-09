import { fmt, fmtGold } from './format.js';
import { MAX_GOLD, minMoney, subtractMoney, multiplyMoney } from './money.js';
import { createOfflineRewardController } from './offline-reward-controller.js';

export const offlineRewardMarkup = () => `<dialog id="offline-reward-modal" aria-labelledby="offline-title" aria-describedby="offline-description">
  <div class="offline-head"><span>복귀 보고</span><button type="button" data-offline-close aria-label="보상 나중에 받기">×</button></div>
  <h2 id="offline-title">병사들이 골드를 모았어요!</h2>
  <p id="offline-description">지휘관님이 없는 동안에도 부대는 열심히 활동했어요.</p>
  <p class="offline-time" data-offline-time></p>
  <strong class="offline-gold" data-offline-gold></strong>
  <p class="offline-note">오프라인 수입은 최대 8시간까지 쌓여요.<br>병력·장비·보너스 수입을 함께 정산해요.</p>
  <div class="offline-actions">
    <button type="button" data-offline-claim>받기<span data-offline-normal></span></button>
    <button type="button" data-offline-double>광고 보고 2배 받기<span>시청 완료 시 지급</span></button>
  </div>
  <p class="offline-note">보유 골드 상한 1,000경 적용 · 닫아도 보상은 보관돼요.</p>
  <p class="offline-message" data-offline-message role="status" aria-live="polite"></p>
</dialog>`;

export function createOfflineRewardUI(session, {root=document,showAd}={}) {
  root.body.insertAdjacentHTML('beforeend',offlineRewardMarkup());
  const dialog = root.querySelector('#offline-reward-modal');
  const find = selector => dialog.querySelector(selector);
  const text = (selector,value) => { const node=find(selector); if(node.textContent!==value)node.textContent=value; };
  let dismissed = null, shown = null;
  const controller = createOfflineRewardController(session,{showAd,onChange:()=>sync()});
  function sync() {
    const reward = session.state.offlineReward;
    if (!session.active) {
      if(dialog.open)dialog.close();
      dismissed=null; shown=null;
      return;
    }
    if (!reward) { if(dialog.open)dialog.close(); shown=null; return; }
    if (dismissed === reward.id) return;
    if (shown !== reward.id) { shown=reward.id; text('[data-offline-message]',''); }
    const minutes=Math.floor(reward.durationMs/60000),hours=Math.floor(minutes/60);
    text('[data-offline-time]',`수입 정산: ${hours}시간${minutes%60 ? ' '+minutes%60+'분' : ''}`);
    text('[data-offline-gold]',fmtGold(reward.amount)+' G');
    find('[data-offline-gold]').title=fmt(reward.amount)+' G';
    text('[data-offline-normal]','+'+fmtGold(minMoney(reward.amount,subtractMoney(MAX_GOLD,session.state.gold)))+' G');
    find('[data-offline-double]').title='광고 보상 완료 시 최대 '+fmtGold(minMoney(MAX_GOLD,multiplyMoney(reward.amount,2)))+' G';
    for(const selector of ['[data-offline-claim]','[data-offline-double]'])find(selector).disabled=controller.busy;
    if (!dialog.open) dialog.showModal();
  }
  function resultMessage(result) {
    if(result?.ok) { sync(); return; }
    const messages={unavailable:'지금 광고를 불러올 수 없어요. Android 앱의 인터넷 연결을 확인하거나 ‘받기’를 이용해 주세요.',
      cancelled:'광고 시청이 완료되지 않았어요. 보상은 그대로 보관돼요.',
      'ad-error':'광고를 불러오지 못했어요. 일반 받기를 이용할 수 있어요.',
      save:'보상을 저장하지 못했어요. 보상은 유지되니 잠시 후 다시 눌러 주세요.',
      inactive:'현재 게임 창으로 돌아온 뒤 다시 눌러 주세요.',stale:'보상 정보가 바뀌었어요. 현재 보상을 다시 확인해 주세요.'};
    text('[data-offline-message]',messages[result?.reason] ?? '잠시 후 다시 시도해 주세요.');
  }
  find('[data-offline-claim]').addEventListener('click',()=>resultMessage(controller.claim()));
  find('[data-offline-double]').addEventListener('click',async()=>resultMessage(await controller.double()));
  const dismiss = () => { dismissed=shown; dialog.close(); };
  find('[data-offline-close]').addEventListener('click',dismiss);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  // Native close is queued; a pause/resume can already have opened the next dialog.
  dialog.addEventListener('close',()=>{if(!dialog.open)dismissed=shown;});
  return {sync};
}
