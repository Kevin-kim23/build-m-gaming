import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave,MAX_GOLD} from '../src/money.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {insignia} from '../src/home-view.js';
import {FORMATIONS} from '../src/formations.js';
import {drawFormationPortrait} from '../src/art.js';
import {FACILITIES} from '../src/facilities.js';
import {facilityIcon} from '../src/facility-art.js';
import {EQUIPMENT} from '../src/equipment.js';
import {reconcileAchievements} from '../src/achievements.js';
if(location.origin!=='http://127.0.0.1:4209')throw Error('Isolated QA origin required');
document.querySelectorAll('[data-seed]').forEach(button=>button.addEventListener('click',()=>{
  const top=button.dataset.seed==='top',rank=RANKS.indexOf(top?'부사령관':'준원수');
  const s={...freshState(),soldiers:RANK_REQUIREMENTS[rank]-3000,sergeants:300,gold:MAX_GOLD,
    ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:5,commandSchoolLevel:top?5:0};
  for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=20;
  s.facilities=FACILITIES.filter(f=>RANKS.indexOf(f.rank)<=rank).map(f=>f.id);
  s.facilityLevels=Object.fromEntries(s.facilities.map(id=>[id,top?20:1]));
  if(top)s.facilityLevels.nexus=19;
  for(const g of Object.values(EQUIPMENT))if(RANKS.indexOf(g.unlockRank)<=rank)s.equipment[g.id]={level:30,count:1,deployed:true};
  localStorage.setItem('budae-kiugi-ui-guide-off','1');
  reconcileAchievements(s);localStorage.setItem(SAVE_KEY,serializeSave(s));localStorage.setItem(SAVE_KEY+'-backup',serializeSave(s));
  document.querySelector('#result').textContent=RANKS[rank]+' 검증 기록 준비 완료';
}));
document.querySelector('#ranks').innerHTML=['소원수','중원수','대원수','특전원수','부사령관'].map(name=>`<figure>${insignia(RANKS.indexOf(name))}<figcaption>${name}</figcaption></figure>`).join('');
for(const id of ['division','corps','fieldArmy','armyGroup','galacticGroupCommand']){
  const f=FORMATIONS.find(f=>f.id===id),figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
  canvas.width=272;canvas.height=216;caption.textContent=f.name;canvas.setAttribute('aria-label',f.name);
  figure.append(canvas,caption);document.querySelector('#formations').append(figure);drawFormationPortrait(canvas,id);
}
document.querySelector('#facilities').innerHTML=FACILITIES.slice(10).map(f=>`<figure>${facilityIcon(f.id,1)}${facilityIcon(f.id,20)}<figcaption>${f.name}</figcaption><small>${f.rank} 해금 · Lv.1 → 20</small></figure>`).join('');
