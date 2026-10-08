import {RANKS} from './ranks.js';
const enlistedRanks=Object.freeze({soldier:'이등병',administrator:'일병',driver:'상병',medic:'병장'});
export function recruitRank(unit){
  const name=enlistedRanks[unit.id]??unit.name;
  return {name,index:RANKS.indexOf(name)};
}
export function recruitRankMarkup(unit,insignia){
  const rank=recruitRank(unit);
  return rank.index<0?'':`<span class="recruit-rank-badge" role="img" aria-label="${rank.name} 계급장" title="${rank.name}">${insignia(rank.index)}</span>`;
}
