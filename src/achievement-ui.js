import { ACHIEVEMENTS } from './achievements.js';
import { armyPower } from './units.js';
import { medalSvg } from './achievement-art.js';
import { achievementDescription, achievementListMarkup } from './achievement-markup.js';
import { reportError } from './diagnostics.js';
import './achievements.css';

// Per-device display preference, kept out of the game save. Written only when the button is pressed.
const HIDE_KEY = 'budae-kiugi-ui-medals-hidden';
function readHidden() {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (error) { reportError('achievements.readHidden', error); return false; }
}
function writeHidden(hidden) {
  try { localStorage.setItem(HIDE_KEY, hidden ? '1' : '0'); } catch (error) { reportError('achievements.saveHidden', error); }
}

// Update medals only when earned IDs change; income ticks never rebuild this UI.
export function createAchievementUI(session) {
  const list = document.querySelector('#medal-list');
  const count = document.querySelector('#medal-count');
  const opener = document.querySelector('#open-achievements');
  const shelf = document.querySelector('.medal-shelf');
  const toggle = document.querySelector('#toggle-medals');
  const dialog = document.querySelector('#achievement-modal');
  let shown = [], initialized = false, selectedId = null, returnFocus = opener;
  let renderedPower = -1, renderedCampaign = -1;
  const sameIds = ids => ids.length === shown.length && ids.every((id, index) => id === shown[index]);
  function renderList() {
    const scroll = dialog.scrollTop;
    dialog.innerHTML = achievementListMarkup(session.state, selectedId);
    renderedPower = armyPower(session.state);
    renderedCampaign = session.state.campaignCleared ?? 0;
    dialog.scrollTop = scroll;
  }
  function open(id = null, source = opener) {
    selectedId = ACHIEVEMENTS.some(item => item.id === id) ? id : null;
    returnFocus = source;
    renderList();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    if (selectedId) dialog.querySelector(`[data-achievement="${selectedId}"]`)?.scrollIntoView({block:'nearest'});
  }
  function sync() {
    const earned = session.state.earnedAchievements;
    const changed = !initialized || !sameIds(earned);
    if (changed) {
      const before = new Set(shown), fragment = document.createDocumentFragment();
      for (const id of earned) {
        const definition = ACHIEVEMENTS.find(item => item.id === id);
        const item = document.createElement('li'), button = document.createElement('button');
        button.type = 'button'; button.dataset.medal = id;
        button.setAttribute('aria-label', `${definition.title} 훈장 · 도전과제 보기`);
        button.title = `${definition.title} · ${achievementDescription(definition)}`;
        button.innerHTML = medalSvg(id);
        if (initialized && !before.has(id)) button.classList.add('medal-new');
        item.append(button); fragment.append(item);
      }
      list.replaceChildren(fragment);
      count.textContent = `훈장 ${earned.length} / ${ACHIEVEMENTS.length}`;
      opener.setAttribute('aria-label', `도전과제 보기 · 훈장 ${earned.length}개 획득`);
      shown = [...earned]; initialized = true;
    }
    if (dialog.open && (changed || renderedPower !== armyPower(session.state) || renderedCampaign !== (session.state.campaignCleared ?? 0))) renderList();
  }
  function setHidden(hidden) {
    shelf.classList.toggle('medals-hidden', hidden);
    toggle.textContent = hidden ? '보이기' : '숨기기';
    toggle.setAttribute('aria-expanded', String(!hidden));
  }
  setHidden(readHidden());
  toggle.addEventListener('click', () => {
    const hidden = !shelf.classList.contains('medals-hidden');
    setHidden(hidden);
    writeHidden(hidden);
  });
  opener.addEventListener('click', () => open());
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-medal]');
    if (button) open(button.dataset.medal, button);
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('#close-achievements')) dialog.close();
    else if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }
  });
  dialog.addEventListener('close', () => (returnFocus?.isConnected ? returnFocus : opener).focus());
  return { sync };
}
