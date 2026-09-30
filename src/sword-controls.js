import { personalIcon } from "./personal-art.js";
import { swordSkillStatus, generalSwordStatus } from "./personal-equipment.js";
const time = ms => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
export function syncSwordControls(root, state, writable, now = Date.now()) {
  const skill = swordSkillStatus(state, now);
  for (const button of root.querySelectorAll('[data-use-sword]')) {
    button.hidden = !skill.owned;
    button.disabled = !writable || !skill.canUse;
    button.classList.toggle('skill-active', skill.active);
    const iconLabel = button.querySelector?.('[data-sword-label]');
    if (iconLabel) {
      const art = button.querySelector('[data-sword-art]'), level = generalSwordStatus(state).level;
      if (art?.dataset && art.dataset.level !== String(level)) {
        art.innerHTML = personalIcon('sword', level); art.dataset.level = String(level);
      }
      // Keep the icon and short visible label intact; status remains available to assistive technology.
      button.setAttribute('aria-label', skill.active ? '장군검 사용 중' : skill.remainingMs > 0 ? '장군검 재사용 대기 ' + time(skill.remainingMs) : '장군검 사용');
      continue;
    }
    const label = skill.active ? `터치 골드 2배 · ${Math.ceil(skill.activeMs / 1000)}초 남음`
      : skill.remainingMs > 0 ? `장군검 · 재사용 ${time(skill.remainingMs)}` : '장군검 · 30초 터치 골드 2배';
    if (button.textContent !== label) button.textContent = label;
  }
}
