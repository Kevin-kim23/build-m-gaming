// Late-game progression: each academy level unlocks one officer. Costs are per upgrade.
export const ADVANCED_OFFICERS = Object.freeze([
  {id:'colonel',name:'대령',field:'colonels',schoolLevel:1,unlockRank:'대장',power:5120,
    passive:3_600_000,tap:24_000_000,price:[20_000_000_000,160_000_000,2_000_000],academyCost:36_000_000_000_000,color:'#625478',insigniaKind:'field',marks:3},
  {id:'brigadierGeneral',name:'준장',field:'brigadierGenerals',schoolLevel:2,unlockRank:'대장',power:10240,
    passive:10_800_000,tap:72_000_000,price:[80_000_000_000,640_000_000,8_000_000],academyCost:180_000_000_000_000,color:'#375953',insigniaKind:'general',marks:1},
  {id:'majorGeneral',name:'소장',field:'majorGenerals',schoolLevel:3,unlockRank:'대장',power:20480,
    passive:32_400_000,tap:216_000_000,price:[320_000_000_000,2_560_000_000,32_000_000],academyCost:480_000_000_000_000,color:'#365d70',insigniaKind:'general',marks:2},
  {id:'lieutenantGeneral',name:'중장',field:'lieutenantGenerals',schoolLevel:4,unlockRank:'대장',power:81920,
    passive:97_200_000,tap:648_000_000,price:[1_280_000_000_000,10_240_000_000,128_000_000],academyCost:2_400_000_000_000_000,color:'#614767',insigniaKind:'general',marks:3},
  {id:'general',name:'대장',field:'generals',schoolLevel:5,unlockRank:'대장',power:327680,
    passive:291_600_000,tap:1_944_000_000,price:[5_120_000_000_000,40_960_000_000,512_000_000],academyCost:8_400_000_000_000_000,color:'#754637',insigniaKind:'general',marks:4},
].map(grade=>Object.freeze({...grade,price:Object.freeze(grade.price),school:'advanced',width:18,height:27})));
