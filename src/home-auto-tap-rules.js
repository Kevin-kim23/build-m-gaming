export const HOME_AUTO_TAP=Object.freeze({priceWon:4900,intervalMs:500,maxGapMs:1000});
export const emptyHomeAutoTap=()=>({owned:false,enabled:false,source:null});
export const validHomeAutoTap=p=>p && typeof p==='object' && !Array.isArray(p) &&
  typeof p.owned==='boolean' && typeof p.enabled==='boolean' &&
  (p.owned?p.source==='test':!p.enabled&&p.source===null);
export const homeAutoTapEnabled=s=>s.homeAutoTap?.owned===true && s.homeAutoTap.enabled===true;
export function grantTestHomeAutoTap(s){
  if(s.homeAutoTap?.owned)return {ok:false,reason:'owned'};
  s.homeAutoTap={owned:true,enabled:true,source:'test'};
  return {ok:true};
}
export function toggleHomeAutoTap(s){
  if(!s.homeAutoTap?.owned)return {ok:false,reason:'unowned'};
  s.homeAutoTap={...s.homeAutoTap,enabled:!s.homeAutoTap.enabled};
  return {ok:true,enabled:s.homeAutoTap.enabled};
}
