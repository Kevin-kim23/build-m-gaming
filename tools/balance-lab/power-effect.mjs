import {STAGES,stateFor,run,runDefault,tag} from './lib.mjs';
console.log('=== 전력(군대 규모)이 승패에 주는 영향: 권장 전력 대비 0.05배 / 0.25배 / 1배 / 4배 (장비는 권장 강화)');
for(const id of [1,6,12,20,40,60,100,160]){
  const st=STAGES[id-1];
  const r=[0.05,0.25,1,4].map(m=>tag(runDefault(stateFor(st,{powerMul:m}),id)));
  console.log(' 스테이지',String(id).padStart(3),st.recommendedRank.padEnd(7),r.map((x,i)=>(['x0.05','x0.25','x1','x4'][i]+':'+x).padEnd(18)).join(''));
}
console.log('\n=== 아무것도 안 하고 가만히 있으면: 우리 기지가 무너지는 시간');
for(const id of [1,3,6,12,20,40,80,120,160]){
  const st=STAGES[id-1];const r=run(stateFor(st),id,{policy:'none'});
  console.log(' 스테이지',String(id).padStart(3),st.recommendedRank.padEnd(7),r.status==='defeat'?`패배 ${Math.round(r.sec)}초`:`${r.status} ${Math.round(r.sec)}초 (적 기지 ${Math.round(r.ehp*100)}% 남음, 내 기지 ${Math.round(r.hp*100)}%)`);
}
console.log('\n=== 최약체 조합: 권장 강화 -5 단계 + 전력 0.25배 (손해 보는 플레이어)');
for(const id of [1,6,12,20,40,60,100,140,160,170]){
  const st=STAGES[id-1];const L=Math.max(0,Math.min(50,st.recommendedLevel)-5);
  console.log(' 스테이지',String(id).padStart(3),st.recommendedRank.padEnd(7),tag(runDefault(stateFor(st,{level:L,powerMul:0.25}),id)),'(Lv'+L+')');
}
