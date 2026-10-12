import {STAGES,stateFor,runDefault} from './lib.mjs';
// 스테이지별: 이기는 최소 강화(0..50), 권장 강화에서의 시간, 50강에서의 시간
const rows=[];
for(const st of STAGES){
  const win=L=>{const r=runDefault(stateFor(st,{level:L}),st.id);return r.status==='victory'?r:null;};
  let lo=0,hi=50,minL=null;
  if(win(50)){ if(win(0)) minL=0; else { while(hi-lo>1){const mid=(lo+hi)>>1; if(win(mid))hi=mid; else lo=mid;} minL=hi; } }
  const rec=Math.min(50,st.recommendedLevel),r0=win(rec),r50=win(50);
  rows.push({id:st.id,rank:st.recommendedRank,rec,minL,t0:r0?.sec??null,t50:r50?.sec??null,hp:r0?.hp??null});
}
const bands=[[1,5],[6,19],[20,39],[40,59],[60,79],[80,100],[101,140],[141,160],[161,180],[181,200]];
console.log('구간 | 권장Lv 범위 | 이기는 최소Lv 범위 | 권장Lv-최소Lv(여유 단계) 평균 | 권장Lv 시간 평균 | 50강 시간 평균 | 50강 클리어 불가 수');
for(const [a,b] of bands){
  const r=rows.filter(x=>x.id>=a&&x.id<=b);
  const m=r.filter(x=>x.minL!==null);
  const avg=(f)=>{const v=m.map(f).filter(x=>x!==null);return v.length?(v.reduce((s,x)=>s+x,0)/v.length):NaN};
  console.log(`${a}-${b}`.padEnd(8),'| 권장',Math.min(...r.map(x=>x.rec)),'~',Math.max(...r.map(x=>x.rec)),'| 최소',m.length?Math.min(...m.map(x=>x.minL)):'-','~',m.length?Math.max(...m.map(x=>x.minL)):'-','| 여유 평균',avg(x=>x.rec-x.minL).toFixed(1),'| 권장시간',avg(x=>x.t0).toFixed(0)+'s','| 50강시간',avg(x=>x.t50).toFixed(0)+'s','| 50강 불가',r.length-m.length,'/',r.length);
}
console.log('\n"권장 강화 이하에서도 이기는 정도"가 가장 큰/작은 스테이지:');
const m=rows.filter(x=>x.minL!==null).map(x=>({...x,slack:x.rec-x.minL})).sort((a,b)=>a.slack-b.slack);
console.log(' 여유 최소(빡빡):',m.slice(0,6).map(x=>`${x.id}(${x.rank}) 권장${x.rec}/최소${x.minL}`).join(', '));
console.log(' 여유 최대(널널):',m.slice(-6).map(x=>`${x.id}(${x.rank}) 권장${x.rec}/최소${x.minL}`).join(', '));
