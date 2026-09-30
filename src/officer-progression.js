// Costs are per academy upgrade, not cumulative. Recommended ranks are pacing targets only.
export const OFFICER_GRADES = Object.freeze([
  { id:'lieutenant', name:'소위', field:'lieutenants', schoolLevel:1,
    power:160, passive:15_000, tap:100_000, price:[8_000_000,600_000,25_000],
    academyCost:150_000_000, recommendedRank:'소장', color:'#426074', insigniaKind:'officer', marks:1 },
  { id:'firstLieutenant', name:'중위', field:'firstLieutenants', schoolLevel:2,
    power:320, passive:45_000, tap:300_000, price:[40_000_000,3_000_000,125_000],
    academyCost:3_000_000_000, recommendedRank:'소장', color:'#3c657b', insigniaKind:'officer', marks:2 },
  { id:'captain', name:'대위', field:'captains', schoolLevel:3,
    power:640, passive:135_000, tap:900_000, price:[200_000_000,15_000_000,500_000],
    academyCost:20_000_000_000, recommendedRank:'소장', color:'#344f75', insigniaKind:'officer', marks:3 },
  { id:'major', name:'소령', field:'majors', schoolLevel:4,
    power:1_280, passive:400_000, tap:2_700_000, price:[1_000_000_000,10_000_000,100_000],
    academyCost:250_000_000_000, recommendedRank:'중장', color:'#555777', insigniaKind:'field', marks:1 },
  { id:'lieutenantColonel', name:'중령', field:'lieutenantColonels', schoolLevel:5,
    power:2_560, passive:1_200_000, tap:8_000_000, price:[5_000_000_000,40_000_000,500_000],
    academyCost:900_000_000_000, recommendedRank:'대장', color:'#665475', insigniaKind:'field', marks:2 },
].map(grade => Object.freeze({...grade, price:Object.freeze(grade.price), school:'officer', width:18, height:27})));
export const NEW_OFFICER_GRADES = Object.freeze(OFFICER_GRADES.slice(1));
