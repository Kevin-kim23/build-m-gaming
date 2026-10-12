// Pure inventory/time rules. A future ad adapter grants only after reward-earned.
export const POTIONS = Object.freeze({
  red: Object.freeze({id:'red',name:'빨간물약',kind:'tap',durationMs:60_000,durationLabel:'1분',effect:'터치 골드 2배'}),
  blue: Object.freeze({id:'blue',name:'파랑물약',kind:'passive',durationMs:1_800_000,durationLabel:'30분',effect:'초당 골드 2배'}),
});
export const POTION_TIME_LIMIT = 100_000_000_000_000;
export const POTION_COUNT_LIMIT = Number.MAX_SAFE_INTEGER;
export const isPotion = id => Object.hasOwn(POTIONS,id);
export const emptyPotions = () => Object.fromEntries(Object.keys(POTIONS).map(id=>[id,{count:0,startedAt:null,expiresAt:null}]));
export const validPotionTime = now => Number.isSafeInteger(now) && now>=0 && now<=POTION_TIME_LIMIT;
export function validPotions(value) {
  return value && typeof value==='object' && !Array.isArray(value) &&
    Object.keys(value).length===Object.keys(POTIONS).length && Object.keys(POTIONS).every(id=>{
      const p=value[id];
      return p && Number.isSafeInteger(p.count) && p.count>=0 && p.count<=POTION_COUNT_LIMIT &&
        ((p.startedAt===null && p.expiresAt===null) ||
          (validPotionTime(p.startedAt) && validPotionTime(p.expiresAt) && p.expiresAt>p.startedAt));
    });
}
export function potionStatus(state,id,now=Date.now()) {
  if(!isPotion(id))throw new RangeError('Unknown potion');
  const definition=POTIONS[id];
  const item=state.potions?.[id];
  const clock=Math.max(now,state.lastAccrual??0);
  const active=item?.startedAt!=null && clock>=item.startedAt && clock<item.expiresAt;
  const remainingMs=active?item.expiresAt-clock:0;
  return {definition,count:item?.count??0,active,remainingMs,multiplier:active?2:1,
    canUse:(item?.count??0)>0 && validPotionTime(clock) && Math.max(clock,item?.expiresAt??0)+definition.durationMs<=POTION_TIME_LIMIT};
}
export function potionBonusMs(state,id,from,to) {
  const p=state.potions?.[id];
  return p?.startedAt==null?0:Math.max(0,Math.min(to,p.expiresAt)-Math.max(from,p.startedAt));
}
export function grantPotion(state,id) {
  if(!isPotion(id))return {ok:false,reason:'item'};
  const inventory=state.potions??emptyPotions(),item=inventory[id];
  if(item.count>=POTION_COUNT_LIMIT)return {ok:false,reason:'limit'};
  state.potions={...inventory,[id]:{...item,count:item.count+1}};
  return {ok:true,id,count:item.count+1};
}
// Caller settles the old income first. Extensions preserve the original interval.
export function consumePotion(state,id,now) {
  if(!isPotion(id) || !validPotionTime(now))return {ok:false,reason:'invalid'};
  const status=potionStatus(state,id,now);
  if(!status.canUse)return {ok:false,reason:status.count?'time':'empty'};
  const clock=Math.max(now,state.lastAccrual??0),item=state.potions[id];
  state.potions={...state.potions,[id]:{count:item.count-1,
    startedAt:status.active?item.startedAt:clock,
    expiresAt:Math.max(clock,item.expiresAt??0)+status.definition.durationMs}};
  return {ok:true,id,expiresAt:state.potions[id].expiresAt};
}
