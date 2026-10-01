import { freshState, SAVE_KEY } from '../src/state.js';
import { serializeSave } from '../src/money.js';
import { RANK_DEFINITIONS } from '../src/ranks.js';
import { FORMATIONS } from '../src/formations.js';
import { supremeRankBadge } from '../src/rank-emblem.js';
import { drawFormationPortrait } from '../src/art.js';
import { UNITS } from '../src/units.js';
if(location.origin!=='http://127.0.0.1:4197')throw Error('Separate QA origin required');
const ranks=RANK_DEFINITIONS.slice(-4);
document.querySelector('#ranks').innerHTML=ranks.map(rank=>`<figure>${supremeRankBadge(rank.marks)}<figcaption>${rank.name}</figcaption><small>${rank.required.toLocaleString('ko-KR')}</small><button data-power="${rank.required}">${rank.name} 기록</button><button data-power="${rank.required-1}">${rank.name} 진급 직전</button></figure>`).join('');
document.querySelectorAll('[data-power]').forEach(button=>button.addEventListener('click',()=>{
  const power=Number(button.dataset.power),s={...freshState(),soldiers:5000,sergeants:300,gold:1_000_000_000_000_000_000n,
    ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,campaignCleared:20,fieldTheme:'concrete'};
  let left=power-8000;
  for(const id of ['general','colonel']){const u=UNITS[id];s[u.field]=Math.floor(left/u.power);left%=u.power;}
  s.soldiers+=left;
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
  for(const id of ['transport','fighter','railgunTank','icbm'])s.equipment[id]={level:20,count:1,deployed:true};
  localStorage.removeItem(SAVE_KEY+'-backup');localStorage.setItem(SAVE_KEY,serializeSave(s));
  document.querySelector('#result').textContent=button.textContent+' 준비 완료 · 전력 '+power.toLocaleString('ko-KR');
}));
for(const id of ['alliedArmy','grandAlliedArmy','supremeCommand']){
  const f=FORMATIONS.find(f=>f.id===id),card=document.createElement('figure'),canvas=document.createElement('canvas');
  canvas.width=216;canvas.height=172;canvas.setAttribute('aria-label',f.name+' 건물');
  const caption=document.createElement('figcaption');caption.textContent=f.name;
  card.append(canvas,caption);document.querySelector('#buildings').append(card);drawFormationPortrait(canvas,id);
}
