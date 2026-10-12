import {STAGES,stateFor,EQUIPMENT,RANKS,fmt} from './lib.mjs';
import {fixedStageGold,battleGoldReward,regionIncomePercent,campaignBonusPercent} from '../../src/campaign-rewards.js';
import {perSecond,perTap} from '../../src/game.js';
import {enhancementCost} from '../../src/equipment.js';
const N=x=>Number(x);
console.log('보상 경제: 첫 점령 골드 / 반복 골드 vs 현재 초당 수입(군대+장비, 시설·물약·개인장비 제외) vs 최신 장비 다음 강화비');
console.log('id 계급      첫점령골드  반복(5%)   초당수입    첫점령=수입몇분  최신장비 다음강화비  첫점령/강화비   반복10회/일=수입몇분');
for(const st of STAGES){
  if(![1,5,6,10,12,20,26,30,40,50,60,70,80,81,100,120,140,160,161,180,181,200].includes(st.id)) continue;
  const s=stateFor(st);s.campaignCleared=st.id-1;
  const inc=N(perSecond(s)),first=N(fixedStageGold(st.id)),rep=first*0.05;
  const rank=RANKS.indexOf(st.recommendedRank);
  const gears=Object.values(EQUIPMENT).filter(g=>RANKS.indexOf(g.unlockRank)<=rank);
  const g=gears.at(-1),L=Math.min(g.maxLevel-1,st.recommendedLevel),ec=N(enhancementCost(L,g.id));
  console.log(String(st.id).padStart(3),st.recommendedRank.padEnd(7),fmt(first).padStart(10),fmt(rep).padStart(9),fmt(inc).padStart(10),(first/inc/60).toFixed(1).padStart(10)+'분',g.id.padStart(15)+' Lv'+L+' '+fmt(ec).padStart(8),(first/ec*100).toFixed(1).padStart(8)+'%',((rep*10)/inc/60).toFixed(1).padStart(9)+'분');
}
