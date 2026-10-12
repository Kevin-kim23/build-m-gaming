import {STAGES,stateFor,fmt} from './lib.mjs';
import {perSecond} from '../../src/game.js';
import {enhancementCost,EQUIPMENT} from '../../src/equipment.js';
import {MAX_GOLD} from '../../src/money.js';
const N=Number;
// 현재 공식 그대로 50강 이후를 연장했을 때의 비용(은하 장비): Lv49 비용에서 레벨당 ×1.5
const g=EQUIPMENT.novaCannon;
const c49=N(enhancementCost(49,g.id));
const st=STAGES[199],s=stateFor(st);const inc=N(perSecond(s));
console.log('은하 원수 장비(핵심 무기) 기준, 스테이지 200 시점 수입(군대+장비): 초당',fmt(inc));
console.log('현재 비용 곡선(레벨당 ×1.5)을 그대로 연장했을 때 "다음 1강" 비용과 모으는 데 걸리는 시간');
console.log(' 레벨   강화비        기본수입으로    수입 5배(시설·물약·개인장비 가정)   지갑 한도 대비');
for(const L of [49,55,60,65,70,75,80,85,90,100,120]){
  const c=c49*Math.pow(1.5,L-49);
  const t=c/inc, t5=t/5;
  const f=x=>x<3600?(x/60).toFixed(0)+'분':x<86400?(x/3600).toFixed(1)+'시간':x<86400*365?(x/86400).toFixed(1)+'일':(x/86400/365).toExponential(1)+'년';
  console.log(' Lv'+String(L+1).padEnd(4),fmt(c).padEnd(10),f(t).padStart(12),f(t5).padStart(18),'      ',(c/N(MAX_GOLD)*100).toExponential(1)+'%');
}
// 확장 레벨에서의 전투 능력 배율 (현재 성장 공식 그대로)
const growth=L=>1+L*.12+Math.max(0,L-10)**2*.02,speed=L=>1+L*.08;
console.log('\n현재 성장 공식을 그대로 연장했을 때 전투력(공격속도×성장) 배율, Lv50 대비');
for(const L of [50,75,100,125,150,200,250]) console.log(' Lv'+L,((growth(L)*speed(L))/(growth(50)*speed(50))).toFixed(1)+'배  (깰 수 있는 마지막 스테이지 대략:',L>=219?'200':L>=168?'195':L>=129?'190':L>=94?'185':L>=72?'181':'180',')');
