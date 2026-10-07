import {ownedFacilities} from './facilities.js';
import {deployedEquipment} from './equipment.js';
import {ownedSchools} from './field-schools.js';
import {layoutFieldArmy} from './field-layout.js';

const MARGIN=10, TOP=34, BOTTOM=12, GAP=4;
export const FIELD_GROWTH_STEP=8; // World units are half a CSS pixel size: expand by 16 CSS px.

function fieldItems(state,viewportWidth,height) {
  const army=layoutFieldArmy(state,{x:0,y:0,width:Math.max(90,viewportWidth-20),height:100000})
    .map(item=>({...item,kind:'army',labelHeight:item.label?10:0}));
  const schools=ownedSchools(state).map(item=>({...item,kind:'schools',width:40,height:30,labelHeight:16}));
  const equipment=deployedEquipment(state).map(item=>({...item,kind:'equipment',width:42,height:42*35/66,labelHeight:16}));
  const facilities=ownedFacilities(state).map(item=>({...item,kind:'facilities',width:36,height:27,labelHeight:14}));
  // One continuous base: keep the largest headquarters first, then place support buildings
  // and parked equipment together. There are no reserved category panels or empty pages.
  const items=[...army];
  for(let i=0;i<Math.max(schools.length,equipment.length,facilities.length);i++) {
    for(const list of [schools,equipment,facilities])if(list[i])items.push(list[i]);
  }
  return items.map(item=>{
    const factor=Math.min(1,Math.max(1,height-TOP-BOTTOM-item.labelHeight)/item.height);
    const width=Math.round(item.width*factor),h=Math.round(item.height*factor);
    // Labels reserve their own footprint, even when a very short screen shrinks the art.
    const boxWidth=Math.max(width,item.kind==='army'?(item.boxWidth??width):40);
    return {...item,width,height:h,boxWidth,boxHeight:h+item.labelHeight};
  });
}

function pack(items,width,height) {
  const placed=[];
  for(const item of items) {
    let best=null;
    const xs=[MARGIN,...placed.map(p=>p.x+p.boxWidth+GAP)];
    for(const x of xs) {
      if(x+item.boxWidth>width-MARGIN)continue;
      let y=TOP;
      // Move down only when rectangles collide; fill gaps below larger headquarters.
      while(true) {
        const overlaps=placed.filter(p=>x<p.x+p.boxWidth+GAP&&x+item.boxWidth+GAP>p.x&&y<p.y+p.boxHeight+GAP&&y+item.boxHeight+GAP>p.y);
        if(!overlaps.length)break;
        y=Math.max(...overlaps.map(p=>p.y+p.boxHeight+GAP));
      }
      if(y+item.boxHeight>height-BOTTOM)continue;
      if(!best||y<best.y||(y===best.y&&x<best.x))best={...item,x,y};
    }
    if(!best)return null;
    placed.push(best);
  }
  return placed;
}

export function layoutFieldWorld(state,viewportWidth,height) {
  viewportWidth=Math.max(100,Math.ceil(viewportWidth));height=Math.max(60,Math.floor(height));
  const items=fieldItems(state,viewportWidth,height);
  const minimumWidth=MARGIN*2+items.reduce((sum,i)=>sum+i.boxWidth*i.boxHeight,0)/Math.max(1,height-TOP-BOTTOM);
  let width=viewportWidth+Math.max(0,Math.ceil((minimumWidth-viewportWidth)/FIELD_GROWTH_STEP))*FIELD_GROWTH_STEP;
  let placed=pack(items,width,height);
  // Finite upper bound: every object can fit in a single row at this width.
  const maxWidth=MARGIN*2+items.reduce((sum,i)=>sum+i.boxWidth+GAP,0);
  while(!placed&&width<=maxWidth) {
    width+=FIELD_GROWTH_STEP;
    placed=pack(items,width,height);
  }
  if(!placed)throw new RangeError('Field layout could not fit all objects');
  const world={width,height,viewportWidth,army:[],schools:[],equipment:[],facilities:[]};
  for(const item of placed)world[item.kind].push(item);
  return world;
}
