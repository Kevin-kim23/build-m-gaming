import { personalIcon } from "./personal-art.js";
import { swordSkillStatus, generalSwordStatus, generalSwordDuration, generalRevolverStatus, generalRevolverDuration, autoTouchStatus } from "./personal-equipment.js";
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
      const ring = button.querySelector('[data-sword-ring]');
      const timer = button.querySelector('[data-sword-time]');
      if (ring) {
        ring.ownerSVGElement.toggleAttribute('hidden', !skill.active);
        // Starting at twelve, erase the elapsed portion clockwise. The saved
        // activation time also handles reloads and backgrounded tabs correctly.
        ring.setAttribute('stroke-dashoffset', String(-100 * (1 - skill.activeMs / skill.durationMs)));
      }
      if (timer) {
        timer.hidden = !skill.active && skill.remainingMs === 0;
        const remaining = skill.active ? `${Math.ceil(skill.activeMs / 1000)}초` : `${Math.ceil(skill.remainingMs / 1000)}초`;
        if (timer.textContent !== remaining) timer.textContent = remaining;
      }
      button.setAttribute('aria-label', skill.active ? `장군검 사용 중 · ${Math.ceil(skill.activeMs / 1000)}초 남음` : skill.remainingMs > 0 ? '장군검 재사용 대기 ' + time(skill.remainingMs) : '장군검 사용');
      continue;
    }
    const label = skill.active ? `터치 골드 2배 · ${Math.ceil(skill.activeMs / 1000)}초 남음`
      : skill.remainingMs > 0 ? `장군검 · 재사용 ${time(skill.remainingMs)}` : `장군검 · ${generalSwordDuration(state)/1000}초 터치 골드 2배`;
    if (button.textContent !== label) button.textContent = label;
  }
}
export function syncRevolverControls(root,state,writable,now=Date.now()) {
  const skill=autoTouchStatus(state,now);
  for(const button of root.querySelectorAll('[data-use-revolver]')){
    button.hidden=!skill.owned;button.disabled=!writable||!skill.canUse;
    button.classList.toggle('skill-active',skill.active);
    if(button.querySelector('[data-revolver-label]')){
      const art=button.querySelector('.revolver-mini-art'),level=generalRevolverStatus(state).level;
      if(art?.dataset&&art.dataset.level!==String(level)){art.innerHTML=personalIcon('revolver',level);art.dataset.level=String(level);}
      const timer=button.querySelector('[data-revolver-time]');
      const ring=button.querySelector('[data-revolver-ring]');
      if(ring){
        ring.ownerSVGElement.toggleAttribute('hidden',!skill.active);
        // Same clockwise erase as the sword, using this activation's saved duration.
        ring.setAttribute('stroke-dashoffset',String(-100*(1-skill.activeMs/skill.durationMs)));
      }
      timer.hidden=skill.remainingMs===0;
      const remaining=skill.active?`${Math.ceil(skill.activeMs/1000)}초`:time(skill.remainingMs);
      if(timer.textContent!==remaining)timer.textContent=remaining;
      button.setAttribute('aria-label',skill.active?`리볼버 사용 중 · ${Math.ceil(skill.activeMs/1000)}초 남음`:skill.remainingMs>0?`리볼버 재사용 대기 ${time(skill.remainingMs)}`:'리볼버 사용');
      continue;
    }
    const label=skill.active?`자동 터치 중 · ${Math.ceil(skill.activeMs/1000)}초`:skill.remainingMs>0?`자동 터치 · 재사용 ${time(skill.remainingMs)}`:`자동 터치 시작 · ${generalRevolverDuration(state)/1000}초`;
    const target=button.querySelector('[data-revolver-label]')??button;
    if(target.textContent!==label)target.textContent=label;
  }
}
