import {layoutFieldArmy} from './field-layout.js';
import {groupArmy} from './formations.js';
import {UNITS} from './units.js';
import {deployedEquipment} from './equipment.js';
import {academyView} from './academy-view.js';

export const HOME_HEADQUARTERS_SCALE=.94;

// Fixed viewport composition. Only presentation is condensed; every owned unit still earns income.
export function layoutHomeField(state,viewportWidth,viewportHeight) {
  const width=Math.max(1,Math.floor(viewportWidth)),height=Math.max(1,Math.floor(viewportHeight));
  const academy=academyView(state),gear=deployedEquipment(state),groups=groupArmy(state),largest=groups[0];
  const top=Math.min(42,height*.24),bottom=5,gap=3;
  const columns=Math.max(1,Math.min(7,Math.ceil(gear.length/3))),rows=Math.ceil(gear.length/columns);
  const schoolSpace=academy.level?Math.min(30,height*.16):0;
  const gearSpace=gear.length?Math.min(rows*25,height*.30):0;
  const rowTop=Math.max(top,Math.min(42,height*.35));
  const margin=Math.min(6,width*.04),columnGap=Math.min(8,width*.05);
  const armyWidth=width*.7-margin-columnGap/2;
  const schoolX=width*.7+columnGap/2,schoolWidth=width-margin-schoolX;
  const contentHeight=Math.max(1,height-bottom-gearSpace-gap-rowTop);
  const world={width,height,viewportWidth:width,army:[],schools:[],facilities:[],equipment:[]};
  if(largest&&!UNITS[largest.id]){
    // Fit the main building to its column and reserve the label and gear area.
    // No fixed sprite-scale cap: taller phones can use their available space.
    const buildings=groups.filter(item=>!UNITS[item.id]).slice(0,3);
    const scale=Math.min(armyWidth*HOME_HEADQUARTERS_SCALE/largest.width,Math.max(1,contentHeight-14)/largest.height);
    const w=largest.width*scale,h=largest.height*scale;
    world.army=[{...largest,x:margin+(armyWidth-w)/2,y:rowTop,width:w,height:h,boxWidth:w,boxHeight:h+14,
      label:true,labelX:margin,labelWidth:armyWidth,centered:true,wrapLabel:true}];
    const secondary=buildings.slice(1),cell=(schoolWidth-gap)/2;
    const secondaryHeight=Math.max(1,(contentHeight-31)/2);
    secondary.forEach((item,i)=>{
      const scale=Math.min(cell/item.width,secondaryHeight/item.height,Math.min(38,w*.65)*.8/item.width);
      const bw=item.width*scale,bh=item.height*scale;
      world.army.push({...item,x:schoolX+i*(cell+gap)+(cell-bw)/2,y:rowTop,width:bw,height:bh,boxWidth:bw,boxHeight:bh+14,label:true,labelX:schoolX+i*(cell+gap),labelWidth:cell,centered:true,wrapLabel:true});
    });
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
    const secondaryBottom=world.army.length>1&&headquarters?Math.max(...world.army.slice(1).map(item=>item.y+item.boxHeight))+gap:rowTop;
    const schoolHeightBudget=Math.max(1,rowTop+contentHeight-secondaryBottom-14);
    // A campus has a stable footprint, independent of the small early headquarters.
    const w=Math.max(1,Math.min(schoolHeightBudget*96/72,schoolWidth));
    const h=w*72/96;
    world.schools=[{id:academy.artId,name:'사관학교',level:academy.artLevel,displayLevel:academy.level,
      x:schoolX+(schoolWidth-w)/2,y:Math.max(secondaryBottom,rowTop+(headquarters?headquarters.height-h:0)),width:w,height:h,
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
