import { compactMoney } from './money.js';

// The command academy opens one marshal per player rank. Headcount is not rank power.
const names = ['준원수','소원수','중원수','대원수','특전원수'];
const ids = ['juniorMarshal','minorMarshal','middleMarshal','grandMarshal','specialMarshal'];
const colors = ['#805943','#426c8b','#526c92','#66798d','#748a9b'];
export const COMMAND_OFFICERS = Object.freeze(names.map((name,i)=>{
  const base=200_000_000_000_000n*4n**BigInt(i);
  return Object.freeze({id:ids[i],name,field:ids[i]+'s',school:'command',schoolLevel:i+1,
    unlockRank:name, recruitRankPower:1_310_720*4**i,power:655_360*2**i,passive:900_000_000*3**i,tap:6_000_000_000*3**i,
    price:Object.freeze([base,base*8n/1000n,base/10000n].map(compactMoney)),
    academyCost:compactMoney(50_000_000_000_000_000n*4n**BigInt(i)),
    color:colors[i],insigniaKind:'marshal',marks:i===0?5:i,width:18,height:27});
}));
