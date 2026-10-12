import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {RANKS,RANK_REQUIREMENTS} from '../src/ranks.js';
import {reconcileAchievements} from '../src/achievements.js';
import {parseSave} from '../src/save.js';
import {grantTestHomeAutoTap} from '../src/home-auto-tap-rules.js';
if(location.origin!=='http://127.0.0.1:4211')throw Error('Isolated QA origin required');
document.querySelectorAll('[data-seed]').forEach(button=>button.addEventListener('click',()=>{
  const kind=button.dataset.seed,now=Date.now(),s=freshState(now);
  if(kind==='recruits'){s.soldiers=10;s.gold=1000000;}
  if(kind==='general'){
    s.soldiers=RANK_REQUIREMENTS[RANKS.indexOf('중장')]-3000;s.sergeants=300;s.gold=10000000;
    s.ncoSchoolLevel=5;s.equipment.artillery={level:7,deployed:true,count:1};
    s.facilities=['pcRoom'];s.facilityLevels={pcRoom:20};grantTestHomeAutoTap(s);
  }
  localStorage.setItem('budae-kiugi-ui-guide-off','1');reconcileAchievements(s);
  const raw=serializeSave(s);if(!parseSave(raw,now))throw Error('Invalid QA fixture');
  localStorage.setItem(SAVE_KEY,raw);localStorage.setItem(SAVE_KEY+'-backup',raw);
  document.querySelector('#result').textContent='검증 기록 준비 완료';
}));
