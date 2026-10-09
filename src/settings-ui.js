import { openDetail, closeDetail, onDetailAction } from './detail-popup.js';
import { privacyPolicyMarkup } from './privacy-policy.js';
import './settings.css';
import {showAdPrivacyOptions} from './potion-ad.js';
import {reportError} from './diagnostics.js';

export function settingsMarkup(state) {
  const slider = (key, title, value) => `<label class="volume-setting" for="${key}"><span>${title}</span><output id="${key}-value" for="${key}">${Math.round(value * 100)}%</output><input id="${key}" data-volume="${key}" type="range" min="0" max="100" step="1" value="${Math.round(value * 100)}"></label>`;
  return { kicker: '부대 키우기', title: '설정', body: `<section class="sound-settings" aria-label="소리 설정">${slider('sfxVolume', '효과음', state.sfxVolume)}${slider('musicVolume', '배경음', state.musicVolume)}<p>0%로 낮추면 소리가 꺼집니다.</p></section><div class="settings-links"><button data-detail-action="settings-guide">남은 가이드 다시 보기 <span>›</span></button><button data-detail-action="settings-info">게임 정보 <span>›</span></button><button data-detail-action="settings-privacy">개인정보처리방침 <span>›</span></button><button data-detail-action="settings-terms">서비스 이용약관 <span>›</span></button><button data-detail-action="settings-ad-choice">광고 이용 선택 · 동의 철회 <span>›</span></button><button data-detail-action="settings-ad-privacy">Google 광고 개인정보 설정 <span>›</span></button><p data-ad-privacy-status role="status"></p></div>` };
}

export function createSettingsUI(session, infoUI, audio, resumeGuide=()=>{}, access) {
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
    if (action === 'settings-info') infoUI.show();
    if (action === 'settings-privacy') openDetail(privacyPolicyMarkup());
    if (action === 'settings-back') show();
  });
  return { show };
}
