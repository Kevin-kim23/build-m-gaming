import {ACCESS_KEY,ACCESS_SCHEMA,TERMS_REVISION,ACCESS_POLICY_REVISION} from '../src/access-rules.js';
import {freshState,SAVE_KEY} from '../src/state.js';
import {serializeSave} from '../src/money.js';
import {FORMATIONS} from '../src/formations.js';
import {EQUIPMENT} from '../src/equipment.js';
if(!['http://127.0.0.1:4217','http://127.0.0.1:4225'].includes(location.origin))throw Error('Separate QA origin required');
document.querySelector('#fixture').addEventListener('click',()=>{
 const s={...freshState(),soldiers:FORMATIONS.find(f=>f.id==='alliedArmy').size,gold:100000000000000000000n,ncoSchoolLevel:5,officerSchoolLevel:5,advancedSchoolLevel:4,campaignCleared:20,fieldTheme:'concrete'};
 for(const id of Object.keys(s.personalLevels))s.personalLevels[id]=10;
 for(const id of Object.keys(EQUIPMENT).slice(0,10))s.equipment[id]={level:17,count:1,deployed:true};
 s.potions.red={count:3,startedAt:Date.now(),expiresAt:Date.now()+600000};
 s.potions.blue.count=1;
 localStorage.setItem(SAVE_KEY,serializeSave(s));
 const now=Date.now();
 // Synthetic QA consent, no person or remote account. Ads stay disabled.
 localStorage.setItem(ACCESS_KEY,JSON.stringify({schema:ACCESS_SCHEMA,ageBand:'adult',ageCheckedAt:now,termsRevision:TERMS_REVISION,policyRevision:ACCESS_POLICY_REVISION,acceptedAt:now,adsConsent:false,adNoticeRevision:0}));
 document.querySelector('#result').textContent='준비 완료';
});
