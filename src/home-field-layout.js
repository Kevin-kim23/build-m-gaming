import {fieldArmy,layoutFieldArmy} from './field-layout.js';
import {UNITS} from './units.js';
import {deployedEquipment} from './equipment.js';
import {academyView} from './academy-view.js';

export const HOME_HEADQUARTERS_SCALE=.7;

// Fixed viewport composition. Only presentation is condensed; every owned unit still earns income.
export function layoutHomeField(state,viewportWidth,viewportHeight) {
  const width=Math.max(1,Math.floor(viewportWidth)),height=Math.max(1,Math.floor(viewportHeight));
  const academy=academyView(state),gear=deployedEquipment(state),largest=fieldArmy(state).largest;
  const top=Math.min(42,height*.24),bottom=5,gap=3;
  const columns=Math.max(1,Math.min(7,Math.ceil(gear.length/3))),rows=Math.ceil(gear.length/columns);
  const schoolSpace=academy.level?Math.min(30,height*.16):0;
  const gearSpace=gear.length?Math.min(rows*25,height*.30):0;
  const armyHeight=Math.max(1,height-top-bottom-schoolSpace-gearSpace-2*gap);
  const rowTop=Math.max(top,Math.min(42,height*.35));
  const margin=Math.min(6,width*.04),columnGap=Math.min(8,width*.05);
  const armyWidth=width*.7-margin-columnGap/2;
  const schoolX=width*.7+columnGap/2,schoolWidth=width-margin-schoolX;
  const contentHeight=Math.max(1,height-bottom-gearSpace-gap-rowTop);
  const world={width,height,viewportWidth:width,army:[],schools:[],facilities:[],equipment:[]};
  if(largest&&!UNITS[largest.id]){
    // Keep the former size budget so the requested 70% is relative to the same
    // viewport/loadout, rather than enlarging again with the freed school row.
    const scale=Math.min(Math.max(1,width-20)/largest.width,Math.max(1,armyHeight-12)/largest.height,1.65)*HOME_HEADQUARTERS_SCALE;
    const w=largest.width*scale,h=largest.height*scale;
    world.army=[{...largest,x:margin+(armyWidth-w)/2,y:rowTop,width:w,height:h,boxWidth:w,boxHeight:h+14,
      label:true,labelX:margin,labelWidth:armyWidth,centered:true,wrapLabel:true}];
  }else if(largest){
    const area={x:margin,y:rowTop,width:academy.level?armyWidth:width-2*margin,height:contentHeight};
    const items=layoutFieldArmy(state,area);
    if(items.length){
      const min=Math.min(...items.map(i=>i.x)),max=Math.max(...items.map(i=>i.x+i.boxWidth));
      world.army=items.map(i=>({...i,x:i.x+area.x+(area.width-(max-min))/2-min}));
    }
  }
  if(academy.level){
    const headquarters=world.army.find(item=>!UNITS[item.id]);
    const w=Math.max(1,Math.min(schoolWidth,38,headquarters?headquarters.width*.65:32,
      headquarters?headquarters.height*.68*96/72:Infinity,Math.max(1,contentHeight-14)*96/72));
    const h=w*72/96;
    world.schools=[{id:academy.artId,name:'사관학교',level:academy.artLevel,displayLevel:academy.level,
      x:schoolX+(schoolWidth-w)/2,y:rowTop+(headquarters?headquarters.height-h:0),width:w,height:h,
      boxWidth:schoolWidth,boxHeight:h+14}];
  }
  if(gear.length){
    const cellWidth=(width-12)/columns,cellHeight=gearSpace/rows;
    const h=Math.max(1,Math.min(cellWidth*35/66,cellHeight-9)),w=h*66/35;
    world.equipment=gear.map((item,i)=>({...item,shortName:'',x:6+(i%columns)*cellWidth+(cellWidth-w)/2,
      y:height-bottom-gearSpace+Math.floor(i/columns)*cellHeight,width:w,height:h,boxWidth:Math.max(w,20)}));
  }
  return world;
}
