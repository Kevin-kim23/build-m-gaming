// Recruitment additions introduced in save format 24. Ranks are independent of troop names.
export const SPECIALIST_UNITS = Object.freeze([
  {id:'administrator',name:'행정병',field:'administrators',power:1,passive:3,tap:12,
    unlockRank:'일병',unlockPower:4,role:'방치 수입',price:[600,180,30],color:'#536b75'},
  {id:'driver',name:'운전병',field:'drivers',power:2,passive:2,tap:30,
    unlockRank:'상병',unlockPower:10,role:'터치 수입',price:[1800,600,100],color:'#886343'},
  {id:'medic',name:'의무병',field:'medics',power:3,passive:5,tap:35,
    unlockRank:'병장',unlockPower:15,role:'균형 성장',price:[6000,1600,240],color:'#477d75'},
].map(u=>Object.freeze({...u,school:null,schoolLevel:0,width:18,height:27,price:Object.freeze(u.price)})));
export const WARRANT_OFFICER = Object.freeze({
  id:'warrantOfficer',name:'준위',field:'warrantOfficers',power:120,passive:10000,tap:80000,
  school:'nco',schoolLevel:5,price:Object.freeze([4_000_000,400_000,18000]),
  color:'#69664a',insigniaKind:'warrant',marks:1,width:18,height:27,
});
export const NEW_RECRUITS = Object.freeze([...SPECIALIST_UNITS,WARRANT_OFFICER]);
