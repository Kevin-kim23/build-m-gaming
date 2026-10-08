import { armyPower, recruitOffer } from './game.js';
import { UNITS } from './units.js';
import { SPECIALIST_UNITS } from './specialist-units.js';
import { schoolOffer } from './schools.js';
import { fmt, fmtGoldCost } from './format.js';
import { exact } from './money.js';
import { RANK_DEFINITIONS, rankForArmy, promotionProgress } from './ranks.js';
import { equipmentOf, equipmentPurchaseOffer, enhancementOffer, EQUIPMENT } from './equipment.js';
import { FACILITIES, facilityOffer, facilityLevel, facilityUpgradeOffer } from './facilities.js';

// Persisted possessions/levels are the source of completion, including older saves.
export const GUIDE_STEPS = Object.freeze(['tap','first-recruit','promote','grow','school','first-nco',
  'school-upgrade','facility','facility-upgrade','equipment','equipment-upgrade']);
const NCO_RANK = RANK_DEFINITIONS.findIndex(r=>r.name==='하사');
const step=(id,text,target=null,pulse=false)=>({id,text,target,pulse,ready:false});
const action=(id,title,text,ready,panel,category,selector,item=null)=>({
  id,title,text,ready,pulse:ready,target:panel==='equipment'?'equipment':category==='schools'?'school':'shop',
  panel,category,selector,item,
});
const price=cost=>{const n=exact(cost);return n>=10000n&&n<100000000n&&n%10000n===0n?fmt(n/10000n)+'만':fmtGoldCost(cost);};
const goal=(cost,what)=>`지휘관님, ${what}에 필요한 ${price(cost)} 골드를 모아주세요.`;

export function guideCandidates(state) {
  const soldier=recruitOffer(state,'soldier');
  if(armyPower(state)===0)return soldier.canBuy?[action('first-recruit','첫 병사 모집',
    '지휘관님, 일반병을 모집해 보세요. 병사는 자동 수입과 터치 수입을 함께 늘려줍니다.',true,'shop','recruit','[data-buy="soldier"]')]:[];
  const list=[],rank=rankForArmy(state),school=schoolOffer(state,'nco');
  if(school.level===0&&(rank>=NCO_RANK||school.canBuy))list.push(action('school','부사관학교 건설',
    school.canBuy?`${price(school.cost)} 골드가 모였습니다! 부사관학교를 건설하면 하사를 모집할 수 있습니다.`:goal(school.cost,'부사관학교 건설'),
    school.canBuy,'shop','schools','[data-upgrade-school="nco"]'));
  if(school.level===0)return list;
  if(school.level===1&&!(state.sergeants??0)) {
    const offer=recruitOffer(state,'sergeant');
    list.push(action('first-nco','첫 하사 모집',offer.canBuy?'학교가 준비됐습니다! 해금된 하사를 모집해 부대를 성장시켜 보세요.':goal(offer.cost,'첫 하사 모집'),
      offer.canBuy,'shop','recruit','[data-buy="sergeant"]'));
    return list;
  }
  const owned=FACILITIES.filter(f=>facilityLevel(state,f.id)>0);
  if(!owned.length) {
    const facility=FACILITIES.find(f=>!facilityOffer(state,f.id).locked);
    if(facility){const offer=facilityOffer(state,facility.id);list.push(action('facility','첫 시설 건설',
      offer.canBuy?`${facility.name}을 건설해 보세요. 연병장에 나타나며 보유하는 동안 수입을 높여줍니다.`:goal(offer.cost,facility.name+' 건설'),
      offer.canBuy,'shop','facilities',`[data-facility-action="${facility.id}"]`));}
  }
  const guns=Object.values(EQUIPMENT).filter(g=>equipmentOf(state,g.id));
  if(!guns.length) {
    const gun=Object.values(EQUIPMENT).find(g=>!equipmentPurchaseOffer(state,g.id).locked);
    if(gun){const offer=equipmentPurchaseOffer(state,gun.id);list.push(action('equipment','첫 군사 장비 구매',
      offer.canBuy?`${gun.name}를 구매해 보세요. 구매한 장비는 연병장에 배치되며 수입을 늘려줍니다.`:goal(offer.cost,gun.name+' 구매'),
      offer.canBuy,'equipment','military','[data-buy-equipment="'+gun.id+'"]',gun.id));}
  }
  if(school.level===1&&(state.sergeants??0)>0)list.push(action('school-upgrade','부사관학교 첫 증설',
    school.canBuy?'부사관학교를 Lv.2로 확장하면 중사를 모집할 수 있습니다. 모집 비용은 별도입니다.':goal(school.cost,'부사관학교 Lv.2 확장'),
    school.canBuy,'shop','schools','[data-upgrade-school="nco"]'));
  if(owned.length&&!owned.some(f=>facilityLevel(state,f.id)>=2)) {
    const f=owned.find(f=>facilityUpgradeOffer(state,f.id).canUpgrade)??owned[0],offer=facilityUpgradeOffer(state,f.id);
    list.push(action('facility-upgrade','시설 첫 강화',offer.canUpgrade?`${f.name}을 강화해 보세요. 강화는 확정 성공하며 시설 효과와 외형이 발전합니다.`:goal(offer.cost,f.name+' 강화'),
      offer.canUpgrade,'shop','facilities',`[data-facility-action="${f.id}"]`));
  }
  if(guns.length&&!guns.some(g=>equipmentOf(state,g.id).level>=1)) {
    const gun=guns.find(g=>enhancementOffer(state,g.id).canUpgrade)??guns[0],offer=enhancementOffer(state,gun.id);
    list.push(action('equipment-upgrade','군사 장비 첫 강화',offer.canUpgrade?`${gun.name}를 강화해 보세요. 초당·터치 수입과 전투 성능이 향상됩니다. 군사 장비 강화는 확정 성공입니다.`:goal(offer.cost,gun.name+' 강화'),
      offer.canUpgrade,'equipment','military','#enhance-equipment',gun.id));
  }
  return list;
}
function basicStep(state) {
  const soldier=recruitOffer(state,'soldier');
  if(!armyPower(state))return step('tap',`화면을 터치해 골드를 모으세요. 첫 병사는 ${fmtGoldCost(soldier.cost)}G예요.`);
  const rank=rankForArmy(state);
  if(rank===0)return step('promote',`병사는 가만히 있어도 골드를 벌어 줘요. 일병 진급까지 ${promotionProgress(state).text}`,'shop',soldier.canBuy);
  if(rank<NCO_RANK) {
    const next=SPECIALIST_UNITS.findLast(u=>armyPower(state)>=u.unlockPower&&!(state[u.field]??0));
    return step('grow',next?`${next.unlockRank} 해금: ${next.name}! 1명마다 초당 +${next.passive}G, 터치 +${next.tap}G. 상점에서 모집하세요.`:
      `일반병 1명마다 초당 +${UNITS.soldier.passive}G, 터치 +${UNITS.soldier.tap}G가 더해져요.`,'shop',false);
  }
  return null;
}
export function guideStep(state) {
  const choices=guideCandidates(state);
  return choices.find(g=>g.ready)??choices[0]??basicStep(state);
}
// Affordable lessons keep their place; lost funds release the spotlight immediately.
export function createGuideFlow() {
  let active=null,paused=false;const deferred=new Set();
  return {
    next(state){
      const choices=guideCandidates(state).filter(g=>!deferred.has(g.id));
      const running=choices.find(g=>g.id===active&&g.ready);
      const next=running??choices.find(g=>g.ready)??choices[0]??basicStep(state);
      active=next?.ready?next.id:null;return next;
    },
    get paused(){return paused;},
    defer(id){deferred.add(id);active=null;paused=true;},
    resume(){deferred.clear();active=null;paused=false;},
  };
}
