import {referenceArmy,simulateBattle} from '../campaign-sim.mjs';
import {STAGES,createBattle,advanceBattle,deploy,BATTLE_RULES,classMatchup,UNIT_TRAITS,stageEnemyType} from '../../src/battle.js';
import {equipmentCombatStats,equipmentCombatPower} from '../../src/battle-balance.js';
import {EQUIPMENT} from '../../src/equipment.js';
import {RANKS,rankForArmy} from '../../src/ranks.js';
export {STAGES,UNIT_TRAITS,EQUIPMENT,RANKS,equipmentCombatStats,equipmentCombatPower};
const eff=(id,lvl)=>{const s=equipmentCombatStats(id,lvl),t=UNIT_TRAITS[id];
  return t.kind==='strike'?s.damage*2/(t.cooldownMs/1000):t.kind==='heal'?0:s.damage*1000/s.intervalMs;};
// 상태: 추천 전력·지정 레벨로 해금된 모든 장비 (지정 레벨이 계급 한도보다 높아도 그대로 허용: 실험용)
export function stateFor(stage,{level=stage.recommendedLevel,powerMul=1,gearLevels={}}={}){
  const pw=BigInt(stage.recommendedPower)*BigInt(Math.round(powerMul*1000))/1000n;
  const s=referenceArmy(stage,{power:pw>320n?pw:320n,level});
  for(const id of Object.keys(s.equipment)){ if(s.equipment[id]) s.equipment[id].level=Math.max(0,Math.min(50,gearLevels[id]??level)); }
  return s;
}
export function bestDeck(state,stageId,n){
  const ids=Object.keys(state.equipment).filter(id=>state.equipment[id]&&UNIT_TRAITS[id]);
  const t=stageEnemyType(stageId);
  const score=id=>{const lvl=state.equipment[id].level;return eff(id,lvl)*classMatchup(UNIT_TRAITS[id].cls,t.main,stageId)/ UNIT_TRAITS[id].cost};
  return ids.sort((a,b)=>score(b)-score(a)).slice(0,n);
}
// 정책들. 모두 0.5초 판단 간격(사람 반응 시간)
export function run(state,stageId,{policy='best',deck,hq,noEnemy}={}){
  let b=createBattle(state,stageId,deck==='default'||deck===undefined&&policy!=='x'?undefined:{equipment:deck}),k=0,next=0,deploys=0,manaFull=0,steps=0;
  if(hq)b.enemy.hq.hp=b.enemy.hq.maxHp=hq;
  if(noEnemy)b.enemy.nextSpawnMs=Infinity;
  const lane=()=>{let l=1,n=Infinity;for(const u of b.enemy.units)if(u.x<n){n=u.x;l=u.lane;}return l;};
  while(b.status==='running'){
    steps++; if(b.mana>=99.9)manaFull++;
    if(policy!=='none'&&b.elapsedMs>=next){
      next=b.elapsedMs+500;
      const ready=b.deck.filter(c=>b.elapsedMs>=c.readyMs&&b.mana>=c.cost);
      let pick=null;
      if(ready.length){
        if(policy==='best'){ // 가장 마나 효율 좋은 카드
          pick=ready.sort((a,c)=>eff(c.id,c.level)/c.cost-eff(a.id,a.level)/a.cost)[0];
        } else if(policy==='cheap'){ pick=ready.sort((a,c)=>a.cost-c.cost)[0]; }
        else if(policy==='counter'){ // 앞선 적 분류를 이기는 카드 우선, 그다음 효율
          const front=[...b.enemy.units].sort((a,c)=>a.x-c.x)[0];
          const sc=c=>(front?classMatchup(UNIT_TRAITS[c.id].cls,front.cls,stageId):1)*eff(c.id,c.level)/c.cost;
          pick=ready.sort((a,c)=>sc(c)-sc(a))[0];
        } else if(policy==='saver'){ // 마나 80 이상일 때만 가장 강한 카드 (아끼기)
          if(b.mana>=60) pick=ready.sort((a,c)=>eff(c.id,c.level)-eff(a.id,a.level))[0];
        }
      }
      if(pick){ b=deploy(b,pick.id,lane()); deploys++; }
    }
    b=advanceBattle(b,100);
  }
  return {status:b.status,sec:b.elapsedMs/1000,hp:b.player.hq.hp/b.player.hq.maxHp,ehp:b.enemy.hq.hp/b.enemy.hq.maxHp,deploys,manaFull:manaFull/steps,deck:b.deck.map(c=>c.id)};
}
export const fmt=n=>{n=Number(n);const a=Math.abs(n);return a>=1e18?(n/1e18).toFixed(1)+'E':a>=1e15?(n/1e15).toFixed(1)+'P':a>=1e12?(n/1e12).toFixed(1)+'T':a>=1e9?(n/1e9).toFixed(1)+'G':a>=1e6?(n/1e6).toFixed(1)+'M':a>=1e3?(n/1e3).toFixed(1)+'k':n.toFixed(1)};

// 기본 방식(게임이 자동으로 고른 출전 장비 + 기존 보정에 쓰인 대응 정책)
export function runDefault(state,stageId,{policy='defend'}={}){
  const b=simulateBattle(state,stageId,{policy});
  return {status:b.status,sec:b.elapsedMs/1000,hp:b.player.hq.hp/b.player.hq.maxHp,ehp:b.enemy.hq.hp/b.enemy.hq.maxHp,deck:b.deck.map(c=>c.id)};
}
export const tag=r=>r.status==='victory'?`W${Math.round(r.sec)}s/${Math.round(r.hp*100)}%`:`${r.status==='draw'?'D':'L'}${Math.round(r.ehp*100)}%`;
