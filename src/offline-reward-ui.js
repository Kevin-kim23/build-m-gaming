import { fmt, fmtGold } from './format.js';
import { MAX_GOLD, minMoney, subtractMoney, multiplyMoney } from './money.js';
import { createOfflineRewardController } from './offline-reward-controller.js';
import { MAX_OFFLINE_MS } from './offline-rules.js';
import { coin } from './home-view.js';

export const offlineRewardMarkup = () => `<dialog id="offline-reward-modal" aria-labelledby="offline-title" aria-describedby="offline-description">
  <div class="offline-head"><h2 id="offline-title">방치 수익</h2><button type="button" data-offline-close aria-label="보상 나중에 받기">×</button></div>
  <div class="offline-treasure" aria-hidden="true"><i>${coin}</i><i>${coin}</i><i>${coin}</i></div>
  <p id="offline-description" class="offline-time"><span data-offline-time></span> · 최대 ${MAX_OFFLINE_MS / 3600000}시간</p>
  <strong class="offline-gold" data-offline-gold></strong>
  <p class="offline-cap" data-offline-cap hidden>보유 골드 한도까지 받을 수 있어요.</p>
  <div class="offline-actions">
    <button type="button" data-offline-double><span class="offline-ad-label"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="4"/><path d="m10 8 6 4-6 4z"/></svg><span data-offline-double-label>광고 보고 2배 받기</span></span></button>
    <button type="button" data-offline-claim><span>그냥 받기</span><strong data-offline-normal></strong></button>
  </div>
  <p class="offline-message" data-offline-message role="status" aria-live="polite"></p>
</dialog>`;

// Display the payout after the wallet cap, using the same exact-money operations as claiming.
export function offlineRewardPreview(reward, gold) {
  const remaining = subtractMoney(MAX_GOLD, gold);
  const normal = minMoney(reward.amount, remaining);
  const doubled = minMoney(multiplyMoney(reward.amount, 2), remaining);
  return {normal, doubled, bonus:subtractMoney(doubled, normal), capped:doubled < multiplyMoney(reward.amount, 2)};
}

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
    const preview=offlineRewardPreview(reward,session.state.gold);
    text('[data-offline-time]',`${hours}시간${minutes%60 ? ' '+minutes%60+'분' : ''} 수익`);
    text('[data-offline-gold]',fmtGold(preview.normal)+' G');
    find('[data-offline-gold]').title=fmt(preview.normal)+' G';
    text('[data-offline-normal]','+'+fmtGold(preview.normal)+' G');
    text('[data-offline-double-label]',controller.busy ? '광고 확인 중…' : preview.capped ? '광고 보고 추가 받기' : '광고 보고 2배 받기');
    find('[data-offline-double]').title='광고 시청 완료 후 총 '+fmt(preview.doubled)+' G 지급';
    find('[data-offline-double]').hidden=preview.bonus<=0;
    find('[data-offline-cap]').hidden=!preview.capped;
    text('[data-offline-cap]',preview.bonus>0 ? '보유 한도까지 · 광고 보상 총 '+fmtGold(preview.doubled)+' G' : '보유 골드 한도까지 받을 수 있어요.');
    if(controller.busy)text('[data-offline-message]','');
    for(const selector of ['[data-offline-claim]','[data-offline-double]'])find(selector).disabled=controller.busy;
    if (!dialog.open) dialog.showModal();
  }
  function resultMessage(result) {
    if(result?.ok) { sync(); return; }
    const messages={unavailable:'지금 광고를 불러올 수 없어요. 그냥 받기도 가능해요.',
      cancelled:'시청이 완료되지 않았어요. 보상은 보관돼요.',
      'ad-error':'광고를 불러오지 못했어요. 그냥 받기도 가능해요.',
      save:'저장하지 못했어요. 보상은 보관돼요. 다시 눌러 주세요.',
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
