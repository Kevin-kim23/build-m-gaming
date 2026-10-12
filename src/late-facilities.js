// One permanent facility per rank. Later upgrades grow by 1.5× so Lv.20 fits the wallet cap.
export const LATE_FACILITIES = Object.freeze([
  {id:'research',name:'국방연구소',rank:'소장',cost:20_000_000_000,passive:8,tap:5,color:'#7896a7',purpose:'연구 성과로 부대의 생산과 훈련 효율을 높입니다.'},
  {id:'logistics',name:'통합군수센터',rank:'중장',cost:80_000_000_000,passive:12,tap:0,color:'#92a5a0',purpose:'대규모 군수 지원으로 초당 수입을 높입니다.'},
  {id:'simulation',name:'합동훈련센터',rank:'대장',cost:350_000_000_000,passive:0,tap:15,color:'#6c91ad',purpose:'합동 모의훈련으로 터치 수입을 높입니다.'},
  {id:'strategy',name:'전략정보원',rank:'준원수',cost:1_500_000_000_000,passive:10,tap:10,color:'#7488a4',purpose:'전략 분석으로 수입과 터치 효율을 함께 높입니다.'},
  {id:'spaceport',name:'우주항',rank:'소원수',cost:6_000_000_000_000,passive:16,tap:5,color:'#83a5b3',purpose:'우주 수송망으로 부대의 지속 수입을 지원합니다.'},
  {id:'orbital',name:'궤도관제센터',rank:'중원수',cost:24_000_000_000_000,passive:8,tap:18,color:'#728eae',purpose:'정밀 궤도 관제로 터치와 초당 수입을 높입니다.'},
  {id:'reactor',name:'융합발전소',rank:'대원수',cost:96_000_000_000_000,passive:24,tap:0,color:'#77a9a9',purpose:'대규모 에너지 공급으로 초당 수입을 높입니다.'},
  {id:'gate',name:'성간보급기지',rank:'특전원수',cost:384_000_000_000_000,passive:12,tap:24,color:'#8b9db6',purpose:'성간 보급로로 멀리 있는 부대까지 지원합니다.'},
  {id:'nexus',name:'은하통합지휘소',rank:'부사령관',cost:1_200_000_000_000_000,passive:20,tap:20,color:'#a0b2c3',purpose:'은하단 전체를 지휘해 두 가지 수입을 높입니다.'},
].map(f=>Object.freeze({...f,introducedVersion:31,upgradeNumerator:3})));
