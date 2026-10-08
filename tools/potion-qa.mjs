import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {reconcileAchievements} from '../src/achievements.js';
import {parseSave} from '../src/save.js';
if(location.origin!=='http://127.0.0.1:4210')throw Error('Isolated QA origin required');
document.querySelectorAll('[data-seed]').forEach(button=>button.addEventListener('click',()=>{
  const expiry=button.dataset.seed==='expiry',now=Date.now(),rank=RANKS.indexOf(expiry?'중장':'대위');
  const s={...freshState(now),soldiers:RANK_REQUIREMENTS[rank]-(expiry?3000:0),sergeants:expiry?300:0,gold:10000000};
  s.equipment.artillery={level:7,deployed:true,count:1};s.ncoSchoolLevel=5;
  if(expiry)for(const id of ['red','blue'])s.potions[id]={count:2,startedAt:now-10000,expiresAt:now+35000};
  localStorage.setItem('budae-kiugi-ui-guide-off','1');reconcileAchievements(s);
  const raw=serializeSave(s);if(!parseSave(raw,now))throw Error('Invalid QA fixture');
  localStorage.setItem(SAVE_KEY,raw);localStorage.setItem(SAVE_KEY+'-backup',raw);
  document.querySelector('#result').textContent='검증 기록 준비 완료';
}));
