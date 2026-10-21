// 전리품 상점 상품(0.80.0): 영구 강화 3종, 하루 횟수 상품 4종, 매일 바뀌는 30% 특가.
// 순수 규칙만 둔다. 골드 계산은 money.js, 날짜는 한국 자정 기준(kst-day.js).
import { addMoney, minMoney, multiplyMoney, scaleMoney, subtractMoney, MAX_GOLD } from './money.js';
import { POTIONS, POTION_COUNT_LIMIT } from './potions.js';
import { rewardDay } from './kst-day.js';

export const LOOT_PERKS = Object.freeze([
  {id:'instructors',name:'정예 교관단',price:30000,percent:10,color:'#d8b45f',effect:'모든 병력 모집 가격 −10%',detail:'한 명 모집과 100명 일괄 모집에 모두 적용돼요.'},
  {id:'lab',name:'장비 연구소',price:40000,percent:10,color:'#7fc4d8',effect:'군사 장비 강화 비용 −10%',detail:'모든 군사 장비의 골드 강화 비용이 줄어요. 개인 장비는 그대로예요.'},
  {id:'manual',name:'전투 교본',price:40000,percent:10,color:'#d98b6a',effect:'전투 아군 장비 공격·체력 +10%',detail:'점령전에서 출격하는 아군 장비의 공격력·회복량·체력이 늘어나요.'},
].map(Object.freeze));
export const LOOT_DAILY = Object.freeze([
  {id:'vault',name:'군수 금고',price:2000,limit:3,color:'#e2bd68',effect:'초당 수입 × 1시간 골드 즉시',detail:'부스터를 뺀 지금의 초당 수입으로 1시간치 골드를 바로 받아요.'},
  {id:'blue',potion:'blue',price:3000,limit:2,color:'#75c4bc'},
  {id:'red',potion:'red',price:3000,limit:2,color:'#df9a73'},
  {id:'max',potion:'max',price:30000,limit:2,color:'#c79be0'},
].map(item=>Object.freeze(item.potion?{...item,name:`${POTIONS[item.potion].name} 교환`,effect:`${POTIONS[item.potion].name} 1개`,detail:`${POTIONS[item.potion].effect} · ${POTIONS[item.potion].durationLabel}. 아이템에 바로 들어가요.`}:item)));
export const LOOT_ITEMS = Object.freeze([...LOOT_PERKS,...LOOT_DAILY]);
export const DEAL_PERCENT = 30;
export const VAULT_SECONDS = 3600;

export const emptyMarket = () => ({perks:[],day:0,bought:Object.fromEntries(LOOT_DAILY.map(item=>[item.id,0]))});
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function validMarket(market) {
  return !!market&&typeof market==='object'&&!Array.isArray(market)&&Object.keys(market).length===3&&
    Array.isArray(market.perks)&&new Set(market.perks).size===market.perks.length&&market.perks.every(id=>LOOT_PERKS.some(p=>p.id===id))&&
    integer(market.day,2_000_000)&&!!market.bought&&typeof market.bought==='object'&&!Array.isArray(market.bought)&&
    Object.keys(market.bought).length===LOOT_DAILY.length&&LOOT_DAILY.every(item=>integer(market.bought[item.id],item.limit));
}
export const lootPerkOwned = (s,id) => !!s.loot?.market?.perks?.includes(id);
// 할인 상품의 가격을 정확한 정수로 깎는다. 소유하지 않았으면 원래 금액 그대로.
export const withLootDiscount = (s,id,cost) => lootPerkOwned(s,id)?scaleMoney(cost,100-LOOT_PERKS.find(p=>p.id===id).percent,100):cost;
export const lootBattleBoostPercent = s => lootPerkOwned(s,'manual')?LOOT_PERKS.find(p=>p.id==='manual').percent:0;

const clockDay = (s,now) => Math.max(s.loot?.market?.day??0,rewardDay(Math.max(now,s.lastAccrual??0)));
export const boughtToday = (s,id,now) => clockDay(s,now)>(s.loot?.market?.day??0)?0:(s.loot?.market?.bought?.[id]??0);
// 날짜만으로 정해지는 특가. 이미 산 영구 상품은 건너뛰고 다음 상품이 특가가 된다.
export function dealItem(s,now=Date.now()) {
  const day=clockDay(s,now);
  for(let i=0;i<LOOT_ITEMS.length;i++){const item=LOOT_ITEMS[(day+i)%LOOT_ITEMS.length];if(!lootPerkOwned(s,item.id))return item;}
  return null;
}
export function lootItemOffer(s,id,now=Date.now()) {
  const item=LOOT_ITEMS.find(item=>item.id===id);
  if(!item)throw new RangeError('Unknown loot item');
  const deal=dealItem(s,now)?.id===id,price=deal?item.price*(100-DEAL_PERCENT)/100:item.price;
  const used=item.limit?boughtToday(s,id,now):0,owned=!item.limit&&lootPerkOwned(s,id);
  const full=item.potion&&(s.potions?.[item.potion]?.count??0)>=POTION_COUNT_LIMIT;
  const reason=owned?'owned':item.limit&&used>=item.limit?'limit':full?'full':(s.loot?.balance??0)<price?'loot':null;
  return {item,price,deal,used,left:item.limit?item.limit-used:null,owned,reason,canBuy:reason===null};
}
// passive: 부스터를 뺀 지금의 초당 수입. 호출하는 쪽이 game.js의 basePassiveIncome으로 넘긴다.
export function buyLootItem(s,id,now=Date.now(),passive=0) {
  const offer=lootItemOffer(s,id,now);
  if(!offer.canBuy)return {ok:false,reason:offer.reason};
  const day=clockDay(s,now);
  s.loot.market??=emptyMarket();
  const market=s.loot.market;
  if(day>market.day){market.day=day;for(const item of LOOT_DAILY)market.bought[item.id]=0;}
  s.loot.balance-=offer.price;
  if(!offer.item.limit){market.perks.push(id);return {ok:true,id,price:offer.price};}
  market.bought[id]++;
  if(offer.item.potion){const p=s.potions[offer.item.potion];s.potions={...s.potions,[offer.item.potion]:{...p,count:p.count+1}};return {ok:true,id,price:offer.price,potion:offer.item.potion};}
  const before=s.gold;
  s.gold=minMoney(MAX_GOLD,addMoney(s.gold,multiplyMoney(passive,VAULT_SECONDS)));
  return {ok:true,id,price:offer.price,gold:subtractMoney(s.gold,before)};
}
