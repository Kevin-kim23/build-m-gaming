import {SCHOOLS,schoolOffer} from './schools.js';
import {ACADEMY_STAGES,academyLevel} from './academy-levels.js';
export function academyView(state) {
  const owned=ACADEMY_STAGES.filter(id=>(state[SCHOOLS[id].field]??0)>0);
  const artId=owned.at(-1)??'nco',artLevel=state[SCHOOLS[artId].field]??0;
  const id=ACADEMY_STAGES.find(id=>(state[SCHOOLS[id].field]??0)<SCHOOLS[id].maxLevel)??ACADEMY_STAGES.at(-1);
  const offer=schoolOffer(state,id);
  return {id,offer,artId,artLevel,level:owned.length?academyLevel(artId,artLevel):0,
    maxLevel:ACADEMY_STAGES.length*5,nextLevel:academyLevel(id,offer.nextLevel)};
}
