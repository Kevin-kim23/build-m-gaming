import {STAGES,stateFor,UNIT_TRAITS,EQUIPMENT,RANKS,tag} from './lib.mjs';
import {simulateBattle} from '../campaign-sim.mjs';
import {battleSlots} from '../../src/battle.js';
function combos(a,k){if(k===0)return[[]];if(a.length<k)return[];const[h,...t]=a;return[...combos(t,k-1).map(c=>[h,...c]),...combos(t,k)];}
for(const sid of [30,40,60,80,120,160]){
  const st=STAGES[sid-1],state=stateFor(st),slots=battleSlots(state);
  const owned=Object.keys(state.equipment).filter(id=>state.equipment[id]&&UNIT_TRAITS[id]);
  const decks=combos(owned,Math.min(slots,owned.length));
  let win=0,times=[],best=null,bestT=1e9;
  const ranked=[];
  for(const d of decks){
    const b=simulateBattle(state,sid,{policy:'defend',deck:d});
    const ok=b.status==='victory';
    if(ok){win++;times.push(b.elapsedMs/1000);}
    ranked.push({d,ok,t:ok?b.elapsedMs/1000:999,e:b.enemy.hq.hp/b.enemy.hq.maxHp});
  }
  ranked.sort((a,b)=>a.t-b.t);
  // 각 장비가 "이기는 덱"에 포함된 비율
  const inWin={};for(const id of owned){const w=ranked.filter(r=>r.ok);inWin[id]=w.length?Math.round(w.filter(r=>r.d.includes(id)).length/w.length*100):0;}
  console.log(`\n스테이지 ${sid} (${st.recommendedRank}, 보유 ${owned.length}종, 출전 ${slots}칸): 가능한 덱 ${decks.length}개 중 승리 ${win}개 (${(win/decks.length*100).toFixed(0)}%)`);
  if(win){const med=times.sort((a,b)=>a-b)[Math.floor(times.length/2)];console.log(`  승리 시간 최소 ${Math.round(times[0])}s / 중앙값 ${Math.round(med)}s / 최대 ${Math.round(times.at(-1))}s`);}
  console.log('  승리 덱에 포함된 비율(%):',Object.entries(inWin).map(([k,v])=>`${k}:${v}`).join(' '));
  console.log('  최단 덱:',ranked[0].d.join(','),Math.round(ranked[0].t)+'s','| 최악 승리 덱 시간:',Math.round(ranked.filter(r=>r.ok).at(-1)?.t??0)+'s');
}
