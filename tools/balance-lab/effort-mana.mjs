import {STAGES,stateFor,runDefault,run,UNIT_TRAITS,EQUIPMENT,RANKS,fmt} from './lib.mjs';
import {simulateBattle} from '../campaign-sim.mjs';
import {perSecond,perTap} from '../../src/game.js';
import {fixedStageGold} from '../../src/campaign-rewards.js';
import {battleSlots,defaultLoadout} from '../../src/battle.js';
const N=Number;
// (a) 3별 조건: 일반 75초 / 수도 120초 → 필요한 최소 강화 Lv
console.log('=== (a) 3별에 필요한 강화 단계(일반 75초, 수도 120초 이내) vs 권장 강화');
const bands=[[1,12],[13,39],[40,79],[80,160],[161,180]];
for(const [a,b] of bands){
  const need=[];
  for(const st of STAGES.slice(a-1,b)){
    const lim=st.capital?120:75; let found=null;
    for(let L=0;L<=50;L++){const r=runDefault(stateFor(st,{level:L}),st.id);if(r.status==='victory'&&r.sec<=lim){found=L;break;}}
    need.push({id:st.id,rec:Math.min(50,st.recommendedLevel),found});
  }
  const ok=need.filter(x=>x.found!==null);
  console.log(` 스테이지 ${a}-${b}: 3별 가능 ${ok.length}/${need.length}, 3별 필요Lv - 권장Lv 평균 +${(ok.reduce((s,x)=>s+x.found-x.rec,0)/Math.max(1,ok.length)).toFixed(1)} (범위 ${Math.min(...ok.map(x=>x.found-x.rec))}~${Math.max(...ok.map(x=>x.found-x.rec))})`);
}
// (b) 전투 보상 vs 90초 터치 수입
console.log('\n=== (b) 전투 1회(약 90초) 보상 vs 같은 90초 동안 터치(초당 3회)로 버는 골드');
console.log(' id 계급       첫점령 보상     90초 터치수입   보상/터치   (반복 보상=첫점령의5%)');
for(const id of [1,6,12,20,30,40,60,80,100,140,160,180]){
  const st=STAGES[id-1],s=stateFor(st);s.campaignCleared=id-1;
  const tap=N(perTap(s,1800000000000))*3*90,first=N(fixedStageGold(id));
  console.log(String(id).padStart(3),st.recommendedRank.padEnd(7),fmt(first).padStart(12),fmt(tap).padStart(14),(first/tap).toFixed(2).padStart(10)+'배   반복 '+(first*.05/tap).toFixed(2)+'배');
}
// (c) 기본 자동 출전에서 장비가 빠지는 시점
console.log('\n=== (c) 게임이 자동으로 고르는 출전 장비(기본 덱)에서 처음 빠지는 스테이지');
const seen={},first={},last={};
for(const st of STAGES.slice(0,180)){
  const s=stateFor(st);const deck=defaultLoadout(s,st.id).equipment;
  for(const id of Object.keys(s.equipment)){ if(!s.equipment[id])continue; if(first[id]===undefined)first[id]=st.id; if(deck.includes(id))last[id]=st.id; }
}
for(const id of Object.keys(first)) if(UNIT_TRAITS[id]) console.log(' ',id.padEnd(15),'해금',String(first[id]).padStart(3),'~ 마지막으로 기본 덱에 든 스테이지',String(last[id]??'(한 번도 없음)').padStart(3),(last[id]?`(해금 후 ${last[id]-first[id]}개 스테이지 동안 사용)`:''));
// (d) 마나 흐름: 덱의 재출격 한계 소비율 vs 회복 10/s
console.log('\n=== (d) 마나: 덱 전체를 쿨타임마다 다시 내보낼 때 필요한 마나/초 (회복은 10/초)');
for(const id of [1,6,12,20,30,40,50,60,80,100,160]){
  const st=STAGES[id-1],s=stateFor(st),deck=defaultLoadout(s,id).equipment;
  const need=deck.reduce((a,g)=>a+UNIT_TRAITS[g].cost/(UNIT_TRAITS[g].cooldownMs/1000),0);
  console.log(' 스테이지',String(id).padStart(3),st.recommendedRank.padEnd(6),'덱',deck.length+'장','필요',need.toFixed(1)+'/s','→',need>10?`마나 부족 ${(10/need*100).toFixed(0)}%만 가동`:`마나 여유 (쿨타임이 한계, 마나 ${(need/10*100).toFixed(0)}% 사용)`);
}
