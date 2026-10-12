import {STAGES,stateFor,run,tag} from './lib.mjs';
const pol=['none','cheap','best','counter','saver'];
console.log('정책별 결과(권장 전력·권장 강화, 게임 기본 출전). 마나꽉참=전투 중 마나가 100으로 넘쳐 낭비된 시간 비율');
console.log('id  계급     | '+pol.map(p=>p.padEnd(22)).join(''));
for(const st of STAGES){
  if(!(st.id<=6||st.id%10===0||st.id===12||st.id===25||st.id===45||st.id===75||st.id===180)) continue;
  const cells=pol.map(p=>{const r=run(stateFor(st),st.id,{policy:p});return (tag(r)+' 출격'+r.deploys+' 꽉'+Math.round(r.manaFull*100)+'%').padEnd(22)});
  console.log(String(st.id).padStart(3),st.recommendedRank.padEnd(7),'|',cells.join(''));
}
