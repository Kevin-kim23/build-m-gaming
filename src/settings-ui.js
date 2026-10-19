import { openDetail, closeDetail, onDetailAction } from './detail-popup.js';
import { privacyPolicyMarkup } from './privacy-policy.js';
import './settings.css';
import {showAdPrivacyOptions} from './potion-ad.js';
import {reportError} from './diagnostics.js';

import {settingsMarkup,adSettingsMarkup,policySettingsMarkup} from './preferences-markup.js';
import './preferences-ui.css';
export {settingsMarkup};

export function createSettingsUI(session, infoUI, audio, resumeGuide=()=>{}, access, showAchievements=()=>{}) {
  function show() {
    const dialog = openDetail(settingsMarkup(session.state));
    dialog.querySelectorAll('[data-volume]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.volume;
        if (!session.active) { input.value = Math.round(session.state[key] * 100); return; }
        session.change(state => {
          state[key] = Number(input.value) / 100;
          if (key === 'sfxVolume') state.sound = state[key] > 0;
        }, {defer:true});
        dialog.querySelector(`#${key}-value`).textContent = `${input.value}%`;
      });
      input.addEventListener('change', () => {
        audio.music.unlock();
        if (input.dataset.volume === 'sfxVolume') audio.tap(session.state.sound);
      });
    });
  }
  onDetailAction(async action => {
    if(action==='settings-ad-menu')openDetail(adSettingsMarkup());
    if(action==='settings-policy-menu')openDetail(policySettingsMarkup());
    if(action==='settings-policy-back')openDetail(policySettingsMarkup());
    if(action==='settings-terms')access?.showTerms();
    if(action==='settings-ad-choice')await access?.chooseAds();
    if(action === 'settings-ad-privacy') {
      try {
        const result=await showAdPrivacyOptions();
        const node=document.querySelector('[data-ad-privacy-status]');
        if(node)node.textContent=result.status==='shown'?'광고 개인정보 선택을 반영했어요.':result.status==='not-enabled'?'광고 이용에 동의하지 않은 상태입니다. 광고 이용 선택에서 변경할 수 있어요.':result.status==='not-required'?'현재 변경할 동의 설정이 없습니다. 광고 요청 시 지역별 안내를 확인합니다.':'지금은 광고 개인정보 설정을 열 수 없습니다. Android 앱에서 다시 확인해 주세요.';
      } catch(error) { reportError('ads.privacy',error); }
    }
    if (action === 'settings-guide') { closeDetail(); resumeGuide(); }
    if (action === 'settings-achievements') { closeDetail(); showAchievements(); }
    if (action === 'settings-info') infoUI.show();
    if (action === 'settings-privacy') {const policy=privacyPolicyMarkup();openDetail({...policy,layout:'preferences',body:policy.body+'<button type="button" class="preference-back" data-detail-action="settings-policy-back">약관 · 개인정보로 돌아가기</button>'});}
    if (action === 'settings-back') show();
  });
  return { show };
}
