import { enhancePersonalEquipment } from './game.js';
import { PERSONAL_EQUIPMENT } from './personal-catalog.js';
import { personalUpgradeOffer } from './personal-enhancement.js';
import { personalDetailMarkup, personalRatesMarkup } from './personal-panels.js';
import { openDetail, onDetailAction } from './detail-popup.js';
import { fmtGold, fmtGoldCost } from './format.js';
import { reportError } from './diagnostics.js';

const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
export function createPersonalUpgradeUI(session,audio) {
  function sync() {
    const root=document.querySelector('#detail-modal[open] [data-personal-detail]');
    if(!root)return;
    const id=root.dataset.personalDetail,offer=personalUpgradeOffer(session.state,id);
    // A different tab can enhance or promote while this detail is open but paused.
    if(Number(root.dataset.level)!==offer.level)return open(id);
    setText(root.querySelector('[data-personal-wallet]'),fmtGold(session.state.gold)+' G');
    const button=root.querySelector('[data-detail-action="enhance-personal"]');
    if(button)button.disabled=!session.active||!offer.canUpgrade;
    setText(root.querySelector('[data-personal-hint]'),!session.active?'저장 상태를 확인해 주세요.':offer.reason==='gold'?'골드가 부족해요.':'');
  }
  function open(id,message='') {openDetail(personalDetailMarkup(session.state,id,{message}));sync();}
  onDetailAction((action,data)=>{
    if(!['enhance-personal','personal-rates','personal-detail'].includes(action)||!Object.hasOwn(PERSONAL_EQUIPMENT,data.id))return;
    if(action==='personal-rates')return openDetail(personalRatesMarkup(data.id));
    if(action==='personal-detail')return open(data.id);
    if(!session.active)return;
    try {
      const result=session.change(s=>enhancePersonalEquipment(s,Date.now(),data.id));
      if(!result)return;
      audio.ui(result.ok ? result.success ? 'upgrade-success' : 'upgrade-fail' : 'error',session.state.sound);
      const message=result.ok?`${result.success?'강화 성공!':'강화 실패 · 레벨 유지'} Lv.${result.level} · ${fmtGoldCost(result.cost)} G 사용`
        :result.reason==='max'?'최대 레벨입니다.':result.reason==='locked'?'진급 후 장비를 지급받아야 합니다.':'골드가 부족해요.';
      open(data.id,message);
    } catch(error) {reportError('personal.enhance',error);open(data.id,'강화를 완료하지 못했어요. 게임 정보에서 오류 기록을 확인해 주세요.');}
  });
  return {open,sync};
}
