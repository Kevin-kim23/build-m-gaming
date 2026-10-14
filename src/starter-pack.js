import {POTION_COUNT_LIMIT,validPotions} from './potions.js';

// Planned paid product. The current development flow only records test grants.
export const STARTER_PACK=Object.freeze({priceWon:5900,red:30,blue:30,max:10});
export const emptyStarterPack=()=>({claimed:false,source:null});
export const validStarterPack=p=>Boolean(p && typeof p==='object' && !Array.isArray(p) &&
  Object.keys(p).length===2 && Object.hasOwn(p,'claimed') && Object.hasOwn(p,'source') &&
  typeof p.claimed==='boolean' && (p.claimed?p.source==='test':p.source===null));

export function grantTestStarterPack(state){
  if(!validStarterPack(state.starterPack) || !validPotions(state.potions))return {ok:false,reason:'invalid'};
  if(state.starterPack.claimed)return {ok:false,reason:'claimed'};
  const ids=['red','blue','max'];
  // Reject the entire package before changing either count: no partial grants.
  if(ids.some(id=>state.potions[id].count>POTION_COUNT_LIMIT-STARTER_PACK[id]))return {ok:false,reason:'limit'};
  state.potions=Object.fromEntries(ids.map(id=>[id,{...state.potions[id],count:state.potions[id].count+STARTER_PACK[id]}]));
  state.starterPack={claimed:true,source:'test'};
  return {ok:true};
}
