import {STAGES,stateFor,run,tag} from './lib.mjs';
console.log('적 부대가 아예 나오지 않는다면? (적 기지·포탑만 남김) vs 정상 전투 — 같은 정책(best), 권장 전력·강화');
for(const id of [1,6,20,40,60,80,100,140,160,180]){
  const st=STAGES[id-1];
  const a=run(stateFor(st),id,{policy:'saver'}),b=run(stateFor(st),id,{policy:'saver',noEnemy:true});
  console.log(' 스테이지',String(id).padStart(3),st.recommendedRank.padEnd(7),'정상',tag(a).padEnd(14),'적 부대 없음',tag(b).padEnd(14),'(차이 '+((b.sec-a.sec)/a.sec*100).toFixed(0)+'%)');
}
