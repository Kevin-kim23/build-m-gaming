import {incomeEffects} from './income-effects.js';
import {swordSkillStatus} from './personal-equipment.js';
const percentFormat=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});

// Rebuild the small effect lists only after roster changes, never on each tap/tick.
export function createIncomeHud(root) {
  const passive=root.querySelector('#passive-effects'),tap=root.querySelector('#tap-effects');
  const sword=root.querySelector('#tap-sword-effect');
  let signature='',multiplier=1;
  function render(node,effects) {
    node.replaceChildren(...effects.map(effect=>{
      const span=node.ownerDocument.createElement('span');
      span.textContent=`${effect.label} +${percentFormat.format(effect.percent)}%`;
      if(effect.description)span.title=effect.description;
      return span;
    }));
    node.hidden=effects.length===0;
  }
  return {
    refresh(state) {
      const effects=incomeEffects(state);
      const next=[...effects.passive,...effects.tap].map(e=>`${e.label}:${e.percent}:${e.description}`).join('|')+`/${effects.passive.length}`;
      if(next===signature)return;
      signature=next;
      render(passive,effects.passive);render(tap,effects.tap);
    },
    syncSword(state,now=Date.now()) {
      const next=swordSkillStatus(state,now).multiplier;
      if(next===multiplier)return;
      multiplier=next;sword.hidden=next===1;
      sword.textContent=next===1?'':`장군검 +${percentFormat.format((next-1)*100)}%`;
    },
  };
}
