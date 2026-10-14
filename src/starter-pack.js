import {POTION_COUNT_LIMIT,validPotions} from './potions.js';

// One-time starter reward. Play connection is available only in opt-in debug builds.
export const STARTER_PACK=Object.freeze({priceWon:5900,red:30,blue:30,max:10});
export const emptyStarterPack=()=>({claimed:false,source:null});
export const validStarterPack=(p,version=42)=>Boolean(p && typeof p==='object' && !Array.isArray(p) &&
  Object.keys(p).length===2 && Object.hasOwn(p,'claimed') && Object.hasOwn(p,'source') &&
  typeof p.claimed==='boolean' && (p.claimed?(p.source==='test'||(version>=42&&p.source==='play')):p.source===null));

export function grantStarterPack(state,source){
  if(!['test','play'].includes(source))return {ok:false,reason:'invalid'};
  if(!validStarterPack(state.starterPack) || !validPotions(state.potions))return {ok:false,reason:'invalid'};
  if(state.starterPack.claimed)return {ok:false,reason:'claimed'};
  const ids=['red','blue','max'];
  // Reject the entire package before changing either count: no partial grants.
  if(ids.some(id=>state.potions[id].count>POTION_COUNT_LIMIT-STARTER_PACK[id]))return {ok:false,reason:'limit'};
  state.potions=Object.fromEntries(ids.map(id=>[id,{...state.potions[id],count:state.potions[id].count+STARTER_PACK[id]}]));
  state.starterPack={claimed:true,source};
  return {ok:true};
}
export const grantTestStarterPack=state=>grantStarterPack(state,'test');
