import {STAGES,stateFor,fmt} from './lib.mjs';
import {simulateBattle} from '../campaign-sim.mjs';
// 100초에 승리할 수 있는 적 기지 체력의 최대치(수용 한도) 찾기
function capacity(st,level,powerMul=1){
  const s=stateFor(st,{level,powerMul});let lo=1,hi=Number(st.hqPower)*1e4,best=0;
  const ok=(hq)=>{const b=simulateBattle(s,st.id,{hqPower:hq});return b.status==='victory'&&b.elapsedMs<=100000;};
  for(let i=0;i<60;i++){const mid=Math.sqrt(lo*hi);if(ok(mid)){best=mid;lo=mid;}else hi=mid; if(hi/lo<1.002)break;}
  return best;
}
const growth=L=>1+L*.12+Math.max(0,L-10)**2*.02, speed=L=>1+L*.08;
const st180=STAGES[179];
console.log('스테이지180 기준: 장비 강화 단계별 "100초 안에 깨는 적 기지 체력 한도"');
const data=[];
for(const L of [10,20,30,40,50]){const c=capacity(st180,L);data.push([L,c]);console.log(' Lv'+L,fmt(c),'  growth',growth(L).toFixed(1),' 공격속도배율',speed(L).toFixed(2),' dps배율',(growth(L)*speed(L)).toFixed(1));}
// 지수 γ: C ∝ (growth*speed)^γ
const xs=data.map(([L])=>Math.log(growth(L)*speed(L))),ys=data.map(([,c])=>Math.log(c));
const n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;
const gamma=xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/xs.reduce((a,x)=>a+(x-mx)**2,0);
console.log('fit: 수용한도 ∝ (growth×공격속도)^'+gamma.toFixed(2));
const c50=data.at(-1)[1];
console.log('\n은하단 181~200: 실제 적 기지 체력 / (Lv50에서 100초 한도) = 필요 배수, 그리고 확장 강화로 환산한 필요 레벨');
console.log('id  적기지체력   Lv50한도      필요배수   필요 dps배율(Lv50대비)  → 필요 강화Lv(현 공식 연장)');
for(const id of [180,181,185,190,195,200]){
  const st=STAGES[id-1],cap=capacity(st,50),R=Number(st.hqPower)/cap;
  const need=Math.pow(R,1/gamma); // growth*speed 배수
  const base=growth(50)*speed(50);let L=50;while(growth(L)*speed(L)<base*need&&L<2000)L+=1;
  console.log(String(id).padStart(3),fmt(Number(st.hqPower)).padStart(10),fmt(cap).padStart(10),R.toFixed(2).padStart(10),need.toFixed(2).padStart(14),'          ',R<=1?'(이미 가능)':(L>=2000?'2000+':'Lv'+L));
}
// 전력(powerMul)이 영향이 있는지
console.log('\n전력 배수 영향(스테이지 200, Lv50): 100초 한도');
for(const m of [0.25,1,4]) console.log(' 전력×'+m,fmt(capacity(STAGES[199],50,m)));
