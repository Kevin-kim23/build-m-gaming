import {mkdirSync,writeFileSync} from 'node:fs';
import {EQUIPMENT,enhancementCost} from '../src/equipment.js';
import {personalUpgradeStep} from '../src/personal-enhancement.js';
import {equipmentCombatStats,UNIT_TRAITS} from '../src/battle-balance.js';
import {RANKS} from '../src/ranks.js';
import {exact,MAX_GOLD} from '../src/money.js';
import {fmtGoldCost} from '../src/format.js';
const newRanks=['은하단 준장','은하단 소장','은하단 중장','은하단 대장','은하단 원수'];
const rankList=RANKS;
const anchors=[[1,'대위'],[3,'소령'],[5,'중령'],[6,'대령'],[7,'준장'],[8,'소장'],[9,'중장'],[11,'대장'],[13,'준원수'],[15,'소원수'],[16,'중원수'],[17,'대원수'],[19,'특전원수'],[21,'부사령관'],[22,'은하 준장'],[24,'은하 소장'],[26,'은하 중장'],[28,'은하 대장'],[30,'은하 원수'],...newRanks.map((r,i)=>[41+i*2,r])];
const tier=l=>anchors.findLast(([n])=>l>=n)[1];
const recommended=(l,g)=>rankList[Math.max(rankList.indexOf(tier(l)),rankList.indexOf(g.unlockRank))];
const gears=Object.values(EQUIPMENT),csv=['장비,강화단계,강화비용G,0강부터누적G,설계권장계급,사단기필요레벨,장비고유공격력,장비고유체력,공격간격ms'];
const cumulative=new Map(gears.map(g=>[g.id,0n]));
const rows=[];
for(let level=1;level<=50;level++){
 const costs=gears.map(g=>exact(enhancementCost(level-1,g.id))).sort((a,b)=>a<b?-1:a>b?1:0);
 rows.push(`| ${level}강 | ${tier(level)} | ${level>10?'Lv.'+(level-10):'불필요'} | ${fmtGoldCost(costs[0])} | ${fmtGoldCost(costs.at(-1))} |`);
 for(const g of gears){const cost=exact(enhancementCost(level-1,g.id));if(cost>MAX_GOLD)throw Error('Unpayable '+g.id);cumulative.set(g.id,cumulative.get(g.id)+cost);const stat=equipmentCombatStats(g.id,level,1280,1);
 csv.push([g.name,level,cost,cumulative.get(g.id),recommended(level,g),Math.max(0,level-10),stat.damage.toFixed(3),stat.hp.toFixed(3),stat.intervalMs].join(','));}
}
let sum=0n;const flagRows=[];for(let l=1;l<40;l++){const cost=exact(personalUpgradeStep('divisionFlag',l).cost);sum+=cost;flagRows.push(`| ${l} → ${l+1} | ${fmtGoldCost(cost)} | ${l+11}강 | ${tier(l+11)} |`);}
mkdirSync('docs/balance',{recursive:true});
writeFileSync('docs/balance/ENHANCEMENT_50.csv','\ufeff'+csv.join('\n')+'\n');
writeFileSync('docs/balance/ENHANCEMENT_50.md',[
'# 사단기40·군사50강 계산표','',
'기준: 0.75.0. 가격과 강화 한도는 게임 공통 함수에서 생성한 실제 값입니다. 권장 계급은 설계 초안이며 진입 제한이 아닙니다. 은하단 5계급은 구현되어 있습니다.','',
'## 적용 범위','',
'- 사단기 Lv.40 → 군사50강. 다른 개인 장비는 Lv.30 유지. 장비 추가 구매는 기존처럼 비활성화. 구버전 보유 수량은 삭제하지 않습니다.',
'- 기존 사단기1~30·군사0~40 가격 보존. 사단기30→31은 기존 마지막 비용의2배, 이후3/2배. 군사40→41 이후는 직전 비용의3/2 증가와 해당 사단기 비용1/32 중 큰 값을 적용(1만G 올림).',
'- 17장비의850단계 견적은 모두 골드 상한 이내. 사단기 총 강화 비용: '+fmtGoldCost(sum)+'G. 누적 비용은 나누어 지출하므로 지갑 상한과 별개입니다.',
'- 이 표의 후기 가격은 상한·연속성을 검사한 1차 값입니다. 실제 구매·학교·장비·개인 강화와 연속 전투를 포함한 모형은 하루30/45/60분에서 최고 계급49.667/47/44.667일입니다. 전체 아이템 동시 만렙이나 실사용자 소요 시간을 보장하는 표는 아닙니다.','',
'## 전투 수치의 해석','',
'- CSV의 공격력·체력은 장비 종류·강화로 고정된 현재 공식 값입니다. 보유 병력이나 기존 장비 복수 수량에 의해 달라지지 않습니다.',
'- 공격력만으로 무기를 평가하지 않습니다. 공격 간격·사거리·마나·출격 대기·회복·본부 타격 특성을 함께 검증해야 합니다.',
'- 160지역 전체의 권장 장비 방어 정책은60~120초 범위입니다. 국가4 수도는 실제 이전 계급 클리어를 반영해 권장을 대원수로 낮췄습니다. 최저 승리 계급을 증명한 것은 아닙니다.',
'- 향후 권장 계급은 한 단계 아래·같은 계급·한 단계 위, 낮은/표준/과강화, 여러 출격 전략으로 검증합니다. 표준 조합60~120초를 목표로 하되 하위 계급 전략 승리를 강제로 막지 않습니다.','',
'## 단계별 군사 장비 가격 범위','',
'장비별 해금 계급이 표의 계급보다 높으면 해당 해금 계급을 우선합니다. 전체17종 개별 가격850행은 같은 폴더 CSV에 있습니다.','',
'|도달 강화|설계 권장 계급|사단기|최소 비용G|최대 비용G|','|---|---|---|---:|---:|',...rows,'',
'## 사단기 전체 가격','',
'|레벨 변경|비용G|군사 강화 한도|설계 권장 계급|','|---|---:|---|---|',...flagRows,'',
'## 함께 적용한 변경','',
'- 은하단 준장~원수5계급, 남색 우주/백금 테두리/청백색 별1~5개. 새 사관학교와 지휘봉26~30 신규100명 모집.',
'- 독립 장비 능력치와 전투력 표시, 적AI 개선, 지역별 고정 보상, 재전투5%·한국시간 하루 전체10회. 제한 이후 전투·별 갱신 가능.',
'- 성장 모형의 조건·한계와 실제 계산 결과는 CONSTELLATION_UPDATE.md를 확인합니다.',
'- 본 문서는 신규 외부 자산·개인정보·광고·결제 SDK를 추가하지 않습니다.',''
].join('\n'));
console.log(JSON.stringify({quotes:csv.length-1,flagTotal:String(sum),flag31:String(personalUpgradeStep('divisionFlag',30).cost),flag40:String(personalUpgradeStep('divisionFlag',39).cost),military41:String(enhancementCost(40,'tank')),military50:String(enhancementCost(49,'tank'))}));
