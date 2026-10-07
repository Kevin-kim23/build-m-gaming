// Original support facilities: one building per type, permanent additive percentage bonuses.
export const MAX_FACILITY_LEVEL = 20;
export const FACILITY_BONUS_STEP = 15; // Percent of the original bonus per upgrade.
export const FACILITIES = Object.freeze([
  { id:'kitchen', name:'취사장', rank:'상사', cost:120_000, passive:3, tap:0, purpose:'따뜻한 식사로 부대의 일상 수입을 지원합니다.', color:'#b78c58' },
  { id:'gym', name:'체력단련장', rank:'원사', cost:300_000, passive:0, tap:3, purpose:'체력 훈련으로 터치 수입을 높입니다.', color:'#739aa3' },
  { id:'futsal', name:'풋살장', rank:'준위', cost:800_000, passive:2, tap:2, purpose:'함께 운동하며 수입과 터치 효율을 높입니다.', color:'#5c9567' },
  { id:'pcRoom', name:'PC방', rank:'소위', cost:2_000_000, passive:0, tap:3, purpose:'휴식 공간에서 재충전해 터치 효율을 높입니다.', color:'#728cba' },
  { id:'infirmary', name:'의무실', rank:'중위', cost:5_000_000, passive:3, tap:0, purpose:'부대 건강을 관리해 일상 수입을 높입니다.', color:'#a4b8aa' },
  { id:'range', name:'사격장', rank:'대위', cost:12_000_000, passive:0, tap:5, purpose:'집중 사격 훈련으로 터치 수입을 높입니다.', color:'#a58a64' },
  { id:'workshop', name:'정비고', rank:'소령', cost:35_000_000, passive:5, tap:0, purpose:'정비 지원으로 부대의 초당 수입을 높입니다.', color:'#839c99' },
  { id:'depot', name:'보급창고', rank:'중령', cost:100_000_000, passive:5, tap:0, purpose:'안정적인 보급으로 부대의 초당 수입을 높입니다.', color:'#ba9a65' },
  { id:'comms', name:'통신소', rank:'대령', cost:350_000_000, passive:2, tap:2, purpose:'신속한 통신으로 수입과 터치 효율을 높입니다.', color:'#809baf' },
  { id:'operations', name:'작전지원센터', rank:'준장', cost:1_500_000_000, passive:5, tap:5, purpose:'부대 전체를 지원해 두 가지 수입을 함께 높입니다.', color:'#afa577' },
].map(Object.freeze));
export const FACILITY_BY_ID = Object.freeze(Object.fromEntries(FACILITIES.map(f=>[f.id,f])));
export const validFacilities = value => Array.isArray(value) && value.length <= FACILITIES.length &&
  new Set(value).size === value.length && value.every(id=>typeof id === 'string' && Object.hasOwn(FACILITY_BY_ID,id));

// Exactly the owned IDs must have an integer level; reject malformed or hidden extra records.
export const validFacilityLevels = (levels,owned) => !!levels && typeof levels === 'object' &&
  !Array.isArray(levels) && validFacilities(owned) && Object.keys(levels).length === owned.length &&
  owned.every(id=>Object.hasOwn(levels,id) && Number.isInteger(levels[id]) && levels[id]>=1 && levels[id]<=MAX_FACILITY_LEVEL);
