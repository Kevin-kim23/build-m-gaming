import {STAGES,stateFor,runDefault,tag} from './lib.mjs';
const t0=Date.now();
const keys=[-10,-5,0,5,10,'max'];
console.log('칸: 승=W(시간/내기지HP), D=무승부(남은 적 기지%), L=패배  / 기본 자동 출전 + 기존 정책(defend)');
for(const st of STAGES){
  if(!(st.id<=12||st.id%5===0||st.id===181||st.id===200)) continue;
  const res=keys.map(k=>{const L=k==='max'?50:Math.max(0,Math.min(50,st.recommendedLevel+k));return tag(runDefault(stateFor(st,{level:L}),st.id));});
  console.log(String(st.id).padStart(3),st.recommendedRank.padEnd(7),'권장Lv',String(st.recommendedLevel).padStart(2),'|',res.map((r,i)=>(keys[i]+':'+r).padEnd(17)).join(' '));
}
console.log('경과(s)',(Date.now()-t0)/1000);
