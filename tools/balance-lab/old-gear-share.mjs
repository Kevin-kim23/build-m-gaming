import {STAGES,UNIT_TRAITS,EQUIPMENT,RANKS,equipmentCombatStats,fmt} from './lib.mjs';
// 장비별 초당 피해(상성 1배). 출전 6칸 중 가장 강한 6개의 합을 "덱 화력"으로 본다.
const dps=(id,l)=>{const s=equipmentCombatStats(id,l),t=UNIT_TRAITS[id];return t.kind==='strike'?s.damage*2/(t.cooldownMs/1000):t.kind==='heal'?0:s.damage*1000/s.intervalMs};
const ids=Object.keys(EQUIPMENT).filter(id=>UNIT_TRAITS[id]);
console.log('스테이지별: 덱 화력(상위6, 권장Lv)과, 오래된 장비를 50강까지 키웠을 때 덱 화력 대비 비율(%)');
console.log('id 계급      권장Lv   덱화력/s  ' + ['artillery','tank','selfPropelled','helicopter','rocketLauncher','transport','fighter','railgunTank','icbm','carrier'].map(x=>x.slice(0,8).padEnd(9)).join(''));
for(const st of STAGES){
  if(![1,6,12,20,30,40,50,60,70,80,100,120,140,160,180].includes(st.id)) continue;
  const rank=RANKS.indexOf(st.recommendedRank);
  const unlocked=ids.filter(id=>RANKS.indexOf(EQUIPMENT[id].unlockRank)<=rank);
  const Lrec=Math.min(st.recommendedLevel,50);
  const top=unlocked.map(id=>dps(id,Lrec)).sort((a,b)=>b-a).slice(0,6).reduce((a,b)=>a+b,0);
  const cols=['artillery','tank','selfPropelled','helicopter','rocketLauncher','transport','fighter','railgunTank','icbm','carrier'].map(id=>{
    if(!unlocked.includes(id)) return '-'.padEnd(9);
    const p=dps(id,50)/top*100; return (p>=100?'>100':p>=1?p.toFixed(1):p>=0.01?p.toFixed(2):'<0.01').padEnd(9)});
  console.log(String(st.id).padStart(3),st.recommendedRank.padEnd(7),String(Lrec).padStart(4),fmt(top).padStart(10),'  '+cols.join(''));
}
