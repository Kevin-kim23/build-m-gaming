// Presentation offsets only: retain the six existing save fields and purchase rules.
export const ACADEMY_STAGES=Object.freeze(['nco','officer','advanced','command','galactic','constellation']);
export const academyLevel=(id,level)=>Math.max(0,ACADEMY_STAGES.indexOf(id))*5+level;
export const academyName=(id,level)=>`사관학교 Lv.${academyLevel(id,level)}`;
