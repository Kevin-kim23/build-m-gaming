import { openDetail, onDetailAction } from './detail-popup.js';
import { privacyPolicyMarkup } from './privacy-policy.js';
import './settings.css';

export function settingsMarkup(state) {
  const slider = (key, title, value) => `<label class="volume-setting" for="${key}"><span>${title}</span><output id="${key}-value" for="${key}">${Math.round(value * 100)}%</output><input id="${key}" data-volume="${key}" type="range" min="0" max="100" step="1" value="${Math.round(value * 100)}"></label>`;
  return { kicker: '부대 키우기', title: '설정', body: `<section class="sound-settings" aria-label="소리 설정">${slider('sfxVolume', '효과음', state.sfxVolume)}${slider('musicVolume', '배경음', state.musicVolume)}<p>0%로 낮추면 소리가 꺼집니다.</p></section><div class="settings-links"><button data-detail-action="settings-info">게임 정보 <span>›</span></button><button data-detail-action="settings-privacy">개인정보처리방침 <span>›</span></button></div>` };
}

export function createSettingsUI(session, infoUI, audio) {
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
  onDetailAction(action => {
    if (action === 'settings-info') infoUI.show();
    if (action === 'settings-privacy') openDetail(privacyPolicyMarkup());
    if (action === 'settings-back') show();
  });
  return { show };
}
