import { CAMPAIGN_STAGE_COUNT } from './campaign-constants.js';
import { POTION_COUNT_LIMIT, POTION_TIME_LIMIT } from './potions.js';

export const MAX_LOOT = 1_000_000_000;
export const SUPPLY_CAP = 3;
const DAY = 86_400_000;
export const OPERATIVES = Object.freeze([
  {id:'duty',name:'당직병',price:300,color:'#8fb6d0',effect:'홈 자동터치 +1회/초',detail:'홈이 보일 때만 작동해요. 유료 자동터치와 합산되며 손가락 터치 횟수에는 영향을 주지 않아요.'},
  {id:'scout',name:'정찰병',price:900,color:'#75c4bc',potion:'blue',period:DAY,effect:'24시간마다 초당 부스터 1개',detail:'초당 골드 2배 · 30분 부스터를 가져와요.'},
  {id:'supply',name:'보급장교',price:900,color:'#df9a73',potion:'red',period:DAY,effect:'24시간마다 터치 부스터 1개',detail:'터치 골드 2배 · 1분 부스터를 보급해요.'},
  {id:'quartermaster',name:'병참관',price:2400,color:'#b7a1d3',effect:'오프라인 수입 최대 12시간',detail:'기존 8시간에서 12시간으로 늘어나요. 영입 전 버려진 시간은 소급하지 않아요.'},
  {id:'operative',name:'특수공작원',price:6000,color:'#e2bd68',potion:'max',period:3*DAY,effect:'72시간마다 맥스 부스터 1개',detail:'터치 골드 10배 + 초당 골드 20배 · 10분 부스터를 확보해요.'},
].map(Object.freeze));
export const emptyLoot = () => ({balance:0,operatives:Object.fromEntries(OPERATIVES.map(o=>[o.id,null]))});
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const clockAt=(s,now)=>Math.max(now,s.lastAccrual??0);
export const operativeOwned=(s,id)=>!!s.loot?.operatives?.[id];
export const dutyEnabled=s=>operativeOwned(s,'duty')&&s.loot.operatives.duty.enabled;
export function validLoot(loot,lastAccrual) {
  return !!loot&&typeof loot==='object'&&!Array.isArray(loot)&&integer(loot.balance,MAX_LOOT)&&
    !!loot.operatives&&typeof loot.operatives==='object'&&!Array.isArray(loot.operatives)&&
    Object.keys(loot.operatives).length===OPERATIVES.length&&OPERATIVES.every(o=>{
      const p=loot.operatives[o.id];
      return p===null||!!p&&typeof p==='object'&&!Array.isArray(p)&&integer(p.hiredAt,lastAccrual)&&
        integer(p.settledAt,lastAccrual)&&p.settledAt>=p.hiredAt&&integer(p.stock,SUPPLY_CAP)&&
        typeof p.enabled==='boolean'&&(o.period?(p.settledAt-p.hiredAt)%o.period===0:p.stock===0&&p.settledAt===p.hiredAt);
    });
}
// Fixed integer quotes: no dependence on gold, income, stars, or a paid multiplier.
export function stageLoot(id,first=true) {
  if(!Number.isInteger(id)||id<1||id>CAMPAIGN_STAGE_COUNT)throw new RangeError('Unknown loot stage');
  const base=(100+(id-1)*5)*(id%20===0?3:1);
  return first?base:Math.floor(base/5);
}
export function legacyLoot(cleared=0) {
  const loot=emptyLoot();
  for(let id=1;id<=cleared;id++)loot.balance+=stageLoot(id);
  return loot;
}
export function awardLoot(s,amount) {
  if(!integer(amount,MAX_LOOT))throw new RangeError('Invalid loot amount');
  s.loot??=emptyLoot();
  const actual=Math.min(amount,MAX_LOOT-s.loot.balance);
  s.loot.balance+=actual;
  return actual;
}
export function recruitOperative(s,id,now=Date.now()) {
  const o=OPERATIVES.find(o=>o.id===id),clock=clockAt(s,now);
  if(!o||!integer(clock,POTION_TIME_LIMIT))return {ok:false,reason:'invalid'};
  if(operativeOwned(s,id))return {ok:false,reason:'owned'};
  if((s.loot?.balance??0)<o.price)return {ok:false,reason:'loot'};
  // Caller settles income first, so the new offline cap cannot apply retroactively.
  s.loot.balance-=o.price;
  s.loot.operatives[id]={hiredAt:clock,settledAt:clock,stock:o.period?1:0,enabled:true};
  // Use the same capped delivery path. A full inventory keeps the welcome supply
  // in stock, and the normal schedule remains anchored to the hiring time.
  if(o.period){
    const delivery=claimSupply(s,id,clock);
    return {ok:true,id,potion:o.potion,amount:delivery.ok?delivery.amount:0,pendingSupply:s.loot.operatives[id].stock};
  }
  return {ok:true,id};
}
export function supplyStatus(s,id,now=Date.now()) {
  const o=OPERATIVES.find(o=>o.id===id),p=s.loot?.operatives?.[id];
  if(!o?.period||!p)return {ready:0,remainingMs:0,boundary:null};
  const clock=clockAt(s,now),cycles=Math.max(0,Math.floor((clock-p.settledAt)/o.period));
  const boundary=p.settledAt+cycles*o.period;
  return {ready:Math.min(SUPPLY_CAP,p.stock+cycles),remainingMs:Math.max(0,boundary+o.period-clock),boundary};
}
export function claimSupply(s,id,now=Date.now()) {
  const o=OPERATIVES.find(o=>o.id===id);
  if(!o?.period||!integer(now,POTION_TIME_LIMIT))return {ok:false,reason:'invalid'};
  const status=supplyStatus(s,id,now),item=s.potions?.[o.potion];
  if(!status.ready||!item)return {ok:false,reason:'waiting'};
  const amount=Math.min(status.ready,POTION_COUNT_LIMIT-item.count);
  if(!amount)return {ok:false,reason:'limit'};
  item.count+=amount;
  const p=s.loot.operatives[id];p.stock=status.ready-amount;p.settledAt=status.boundary;
  return {ok:true,id,potion:o.potion,amount};
}
export function toggleDuty(s) {
  if(!operativeOwned(s,'duty'))return {ok:false,reason:'unowned'};
  const p=s.loot.operatives.duty;p.enabled=!p.enabled;
  return {ok:true,enabled:p.enabled};
}
