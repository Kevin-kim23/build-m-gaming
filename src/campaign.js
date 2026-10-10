import { rankFor, RANKS } from './ranks.js';
import { FORMATIONS } from './formations.js';
import {campaignDifficulty} from './campaign-progression.js';
import {SPACE_COUNTRY_DEFINITIONS} from './campaign-space.js';
import {REGIONS_PER_COUNTRY, COUNTRIES_PER_CONTINENT, CONTINENT_STAGE_COUNT, CAMPAIGN_STAGE_COUNT} from './campaign-constants.js';
// Original fictional geography. Shared border vertices keep the four nations contiguous.
export const CONTINENTS = Object.freeze([
  Object.freeze({id:'astera',name:'아스테라',theme:'earth',width:1000,height:2500,regionsPerCountry:REGIONS_PER_COUNTRY,firstStage:1,lastStage:CONTINENT_STAGE_COUNT}),
  Object.freeze({id:'aetherion',name:'에테리온',theme:'space',width:1000,height:2500,regionsPerCountry:REGIONS_PER_COUNTRY,firstStage:CONTINENT_STAGE_COUNT+1,lastStage:CAMPAIGN_STAGE_COUNT}),
]);
export const CONTINENT = CONTINENTS[0];
export function continentForProgress(cleared=0){return CONTINENTS.findLast(c=>cleared>=c.firstStage-1)??CONTINENT;}
const border12=[[205,1640],[310,1600],[415,1640],[520,1590],[625,1620],[720,1570],[830,1620]];
const border23=[[180,1110],[290,1070],[405,1110],[505,1060],[620,1100],[715,1050],[810,1090]];
const border34=[[230,660],[340,705],[435,665],[545,710],[645,665],[765,700]];
const definitions=[
  {id:'serdin',name:'세르딘 공국',title:'바람과 밀밭의 남부',terrain:'초원 · 하천 · 성채',color:'#99ae70',dark:'#526c48',accent:'#dbcf91',label:[480,1950],capital:[570,1730],
    polygon:[...border12,[875,1680],[858,1730],[910,1790],[875,1840],[900,1900],[855,1940],[870,2010],[805,2040],[785,2110],[735,2140],[730,2200],[665,2225],[600,2290],[535,2310],[470,2280],[430,2320],[360,2285],[320,2220],[255,2210],[240,2130],[185,2100],[210,2030],[145,1980],[178,1900],[125,1850],[165,1780],[148,1705]],
    names:['갈매기 해안','남풍 초소','은밀한 여울','호밀 들판','서쪽 등대','푸른 개울','비취 숲','돌다리 마을','바람 고개','에린 요새','수레바퀴 평원','북녘 농장','청동 채석장','안개 능선','호수 관문','황금 언덕','왕실 사냥터','세르딘 외곽','백석 방어선','수도 세르딘']},
  {id:'veloc',name:'벨로크 연방',title:'붉은 협곡의 산업 연방',terrain:'황야 · 협곡 · 공업 지대',color:'#bb9361',dark:'#866348',accent:'#e2bd7a',label:[475,1370],capital:[580,1190],
    polygon:[...border23,[858,1150],[880,1220],[846,1270],[900,1320],[870,1390],[885,1450],[842,1505],[860,1570],...border12.slice().reverse(),[160,1590],[190,1520],[128,1460],[162,1380],[118,1320],[158,1260],[143,1190]],
    names:['황토 변경','외로운 우물','붉은 채굴장','철도 분기점','먼지 초소','구리 협곡','건조한 분지','남부 제련소','기어 평원','유황 요새','검은 공장','서부 발전소','황동 창고','북부 철교','탄광 언덕','중앙 병기창','톱니 성벽','벨로크 교외','철의 방어선','수도 벨로크']},
  {id:'istra',name:'이스트라 왕국',title:'호수와 고원의 오래된 왕국',terrain:'삼림 · 호수 · 고원',color:'#9a9aab',dark:'#646783',accent:'#c6bad8',label:[510,870],capital:[590,755],
    polygon:[...border34,[805,750],[850,775],[825,825],[875,865],[836,915],[870,970],[825,1020],...border23.slice().reverse(),[137,1060],[165,1010],[118,950],[170,900],[155,840],[208,800],[180,744]],
    names:['새벽 변경','보랏빛 숲','은호수 남안','참나무 마을','왕의 가도','이끼 초소','달빛 여울','북부 수로','오래된 수원','루엔 요새','석영 채석장','독수리 고개','회색 산림','구름 전망대','은호수 북안','왕실 평원','수도 진입로','이스트라 성문','왕관 방어선','수도 이스트라']},
  {id:'norgard',name:'노르가드 제국',title:'빙하 위의 마지막 제국',terrain:'설원 · 빙하 · 산악 성채',color:'#a3bbbc',dark:'#577a83',accent:'#d6edf0',label:[500,405],capital:[560,215],
    polygon:[[230,660],[188,612],[215,560],[176,507],[222,457],[200,400],[256,360],[242,300],[300,264],[315,205],[370,192],[398,135],[450,150],[478,96],[535,125],[577,105],[620,165],[679,183],[696,245],[751,266],[732,325],[796,350],[776,410],[828,440],[798,498],[822,550],[772,600],[765,700],...border34.slice(1,-1).reverse()],
    names:['눈보라 변경','얼어붙은 다리','백야 초소','서리 계곡','은빛 침엽림','빙하 여울','버려진 광산','설원 관문','검은 얼음길','서리 요새','거인의 능선','북부 군수창','푸른 빙벽','백색 고원','왕관 산맥','제국 전초선','노르가드 외곽','강철 성문','황제의 방벽','수도 노르가드']},
];
export const COUNTRIES=Object.freeze([...definitions,...SPACE_COUNTRY_DEFINITIONS].map((c,index)=>Object.freeze({...c,index,localIndex:index%COUNTRIES_PER_CONTINENT,continentId:CONTINENTS[Math.floor(index/COUNTRIES_PER_CONTINENT)].id,theme:CONTINENTS[Math.floor(index/COUNTRIES_PER_CONTINENT)].theme,firstStage:index*REGIONS_PER_COUNTRY+1,lastStage:(index+1)*REGIONS_PER_COUNTRY,
  polygon:Object.freeze(c.polygon.map(p=>Object.freeze(p))),powers:Object.freeze(Array.from({length:REGIONS_PER_COUNTRY},(_,i)=>campaignDifficulty(index*REGIONS_PER_COUNTRY+i+1).recommendedPower)),names:Object.freeze(c.names)})));
export function countryProgress(state,id){
  const country=COUNTRIES.find(c=>c.id===id);if(!country)throw new RangeError('Unknown country');
  const cleared=state.campaignCleared??0;
  return {country,unlocked:cleared>=country.firstStage-1,cleared:Math.max(0,Math.min(REGIONS_PER_COUNTRY,cleared-country.firstStage+1)),complete:cleared>=country.lastStage};
}
export const campaignStages=Object.freeze(COUNTRIES.flatMap(country=>country.powers.map((power,i)=>Object.freeze({
  id:country.firstStage+i,countryId:country.id,continentId:country.continentId,theme:country.theme,region:i+1,name:country.names[i],enemyName:country.name,
  recommendedPower:power,recommendedRank:RANKS[rankFor(power)],
  capital:i===19,formationId:FORMATIONS.find(f=>f.size<=power).id,
  ...campaignDifficulty(country.firstStage+i),
}))));
