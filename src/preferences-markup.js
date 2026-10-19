// Labels/actions here are trusted application text, never saved or user-entered content.
export const preferenceLink = (action, label, hint = '') => `<button type="button" data-detail-action="${action}"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><span aria-hidden="true">›</span></button>`;
const back = '<button type="button" class="preference-back" data-detail-action="settings-back">설정으로 돌아가기</button>';
export function settingsMarkup(state) {
  const slider = (key, title, value) => `<label class="volume-setting" for="${key}"><span>${title}</span><output id="${key}-value" for="${key}">${Math.round(value * 100)}%</output><input id="${key}" data-volume="${key}" type="range" min="0" max="100" step="1" value="${Math.round(value * 100)}"></label>`;
  return {layout:'preferences',kicker:'부대 키우기',title:'설정',body:`
    <section class="sound-settings" aria-label="소리 설정"><h3 class="preference-section-title">소리</h3>${slider('sfxVolume','효과음',state.sfxVolume)}${slider('musicVolume','배경음',state.musicVolume)}</section>
    <h3 class="preference-section-title">게임</h3><div class="preference-links">${preferenceLink('settings-achievements','도전과제 · 훈장')}${preferenceLink('settings-guide','가이드 다시 보기')}</div>
    <h3 class="preference-section-title">이용 안내</h3><div class="preference-links">${preferenceLink('settings-ad-menu','광고 이용 설정','광고 선택 · 동의 철회')}${preferenceLink('settings-policy-menu','약관 · 개인정보')}${preferenceLink('settings-info','게임 정보','버전 · 저장 상태 · 문의')}</div>`};
}
export function adSettingsMarkup() {
  return {layout:'preferences',kicker:'설정',title:'광고 이용 설정',body:`<p class="preference-note">광고는 선택 사항이에요.<br>광고 없이도 기본 게임을 즐길 수 있어요.</p><div class="preference-links">${preferenceLink('settings-ad-choice','광고 이용 선택 · 동의 철회','게임의 광고 기능 켜기 / 끄기')}${preferenceLink('settings-ad-privacy','Google 광고 개인정보 설정','지원되는 지역의 Google 동의 선택')}</div><p data-ad-privacy-status role="status" class="preference-note"></p>${back}`};
}
export function policySettingsMarkup() {
  return {layout:'preferences',kicker:'설정',title:'약관 · 개인정보',body:`<div class="preference-links">${preferenceLink('settings-terms','서비스 이용약관')}${preferenceLink('settings-privacy','개인정보처리방침')}</div>${back}`};
}
