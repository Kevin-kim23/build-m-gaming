import {fieldArmy,layoutFieldArmy} from './field-layout.js';
import {UNITS} from './units.js';
import {deployedEquipment} from './equipment.js';
import {academyView} from './academy-view.js';

// Fixed viewport composition. Only presentation is condensed; every owned unit still earns income.
export function layoutHomeField(state,viewportWidth,viewportHeight) {
  const width=Math.max(1,Math.floor(viewportWidth)),height=Math.max(1,Math.floor(viewportHeight));
  const academy=academyView(state),gear=deployedEquipment(state),largest=fieldArmy(state).largest;
  const top=Math.min(42,height*.24),bottom=5,gap=3;
  const columns=Math.max(1,Math.min(7,Math.ceil(gear.length/3))),rows=Math.ceil(gear.length/columns);
  const schoolSpace=academy.level?Math.min(30,height*.16):0;
  const gearSpace=gear.length?Math.min(rows*25,height*.30):0;
  const armyHeight=Math.max(1,height-top-bottom-schoolSpace-gearSpace-2*gap);
  const world={width,height,viewportWidth:width,army:[],schools:[],facilities:[],equipment:[]};
  if(largest&&!UNITS[largest.id]){
    const scale=Math.min((width-20)/largest.width,Math.max(1,armyHeight-12)/largest.height,1.65);
    const w=largest.width*scale,h=largest.height*scale;
    world.army=[{...largest,x:(width-w)/2,y:top,width:w,height:h,boxWidth:w,boxHeight:h+12,label:true,labelX:10,labelWidth:width-20,centered:true,wrapLabel:true}];
  }else if(largest){
    const items=layoutFieldArmy(state,{x:8,y:top,width:width-16,height:armyHeight});
    if(items.length){
      const min=Math.min(...items.map(i=>i.x)),max=Math.max(...items.map(i=>i.x+i.boxWidth));
      world.army=items.map(i=>({...i,x:i.x+(width-(max-min))/2-min}));
    }
  }
  if(academy.level){
    const h=Math.max(1,schoolSpace-10),w=h*96/72;
    world.schools=[{id:academy.artId,name:'사관학교',level:academy.artLevel,displayLevel:academy.level,
      x:(width-w)/2,y:height-bottom-gearSpace-schoolSpace-gap,width:w,height:h,boxWidth:Math.max(w,52)}];
  }
  if(gear.length){
    const cellWidth=(width-12)/columns,cellHeight=gearSpace/rows;
    const h=Math.max(1,Math.min(cellWidth*35/66,cellHeight-9)),w=h*66/35;
    world.equipment=gear.map((item,i)=>({...item,shortName:'',x:6+(i%columns)*cellWidth+(cellWidth-w)/2,
      y:height-bottom-gearSpace+Math.floor(i/columns)*cellHeight,width:w,height:h,boxWidth:Math.max(w,20)}));
  }
  return world;
}
