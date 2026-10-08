import {ownedFacilities} from './facilities.js';
import {deployedEquipment} from './equipment.js';
import {ownedSchools} from './field-schools.js';
import {layoutFieldArmy} from './field-layout.js';

const MARGIN=10, TOP=34, BOTTOM=14, GAP=4, BAND_GAP=7, MIN_LABEL_WIDTH=40;
const SUPPORT_SCALES=[1,.9,.8,.7];
export const FIELD_GROWTH_STEP=8; // 16 CSS px, never a separate page.
const SUPPORT = {
  schools:{width:46,ratio:72/96,label:16},
  facilities:{width:44,ratio:72/96,label:16},
  equipment:{width:48,ratio:35/66,label:16},
};
function band(items,kind,width,scale,maxRows=Infinity) {
  if(!items.length)return {items:[],height:0};
  const rule=SUPPORT[kind],density=items.length>=8?.8:items.length>=4?.9:1;
  const w=Math.round(rule.width*density*scale),h=Math.round(w*rule.ratio);
  const boxWidth=Math.max(MIN_LABEL_WIDTH,w),boxHeight=h+rule.label;
  const columns=Math.max(1,Math.floor((width-2*MARGIN+GAP)/(boxWidth+GAP)));
  const rows=Math.ceil(items.length/columns);
  if(rows>maxRows)return null;
  return {height:rows*boxHeight+(rows-1)*GAP,
    items:items.map((item,i)=>({...item,kind,width:w,height:h,boxWidth,boxHeight,
      x:MARGIN+(i%columns)*(boxWidth+GAP),y:Math.floor(i/columns)*(boxHeight+GAP)}))};
}
export function layoutFieldWorld(state,viewportWidth,height) {
  viewportWidth=Math.max(100,Math.ceil(viewportWidth));height=Math.max(60,Math.floor(height));
  const catalogs={schools:ownedSchools(state),facilities:ownedFacilities(state),equipment:deployedEquipment(state)};
  const kinds=Object.keys(catalogs).filter(kind=>catalogs[kind].length);
  // Short screens scroll the shared terrain vertically rather than crush four bands into unreadable icons.
  const dense=catalogs.facilities.length>=8||catalogs.equipment.length>=8;
  height=Math.max(height,dense?320:kinds.length===3?240:kinds.length===2?180:kinds.length?130:60);
  const naturalArmy=layoutFieldArmy(state,{x:0,y:0,width:Math.max(90,viewportWidth-20),height:10000});
  const armyReserve=naturalArmy.length?Math.max(45,Math.min(100,Math.max(...naturalArmy.map(i=>i.height+(i.label?10:0))))):0;
  height=Math.max(height,TOP+BOTTOM+armyReserve);
  // Keep the horizontal footprint within 1.5 screens. Further growth adds vertical rows.
  // Reserve just enough vertical space at a compact width, keeping readable labels and the large HQ.
  const preferredSteps=Math.floor(viewportWidth*.5/FIELD_GROWTH_STEP);
  const rowBound=viewportWidth+preferredSteps*FIELD_GROWTH_STEP;
  const maxColumns=Math.max(1,Math.floor((rowBound-2*MARGIN+GAP)/(MIN_LABEL_WIDTH+GAP)));
  const rowLimits=Object.fromEntries(kinds.map(kind=>[kind,Math.max(3,Math.ceil(catalogs[kind].length/maxColumns))]));
  const minimumScale=SUPPORT_SCALES.at(-1);
  const minimumSupport=kinds.reduce((sum,kind)=>sum+band(catalogs[kind],kind,rowBound,minimumScale).height+BAND_GAP,0);
  height=Math.max(height,TOP+BOTTOM+armyReserve+minimumSupport);
  for(let width=viewportWidth;width<=rowBound;width+=FIELD_GROWTH_STEP) {
    // Prefer the largest support icons that fit this width; only then extend the same ground.
    for(const scale of SUPPORT_SCALES) {
      const bands=kinds.map(kind=>({kind,...band(catalogs[kind],kind,width,scale,rowLimits[kind])}));
      if(bands.some(b=>!b.items))continue;
      const supportHeight=bands.reduce((n,b)=>n+b.height,0)+bands.length*BAND_GAP;
      const armyHeight=height-TOP-BOTTOM-supportHeight;
      if(armyHeight<armyReserve)continue;
      const army=layoutFieldArmy(state,{x:MARGIN,y:TOP,width:width-2*MARGIN,height:armyHeight});
      if(naturalArmy.length&&!army.length)continue;
      const world={width,height,viewportWidth,army,schools:[],facilities:[],equipment:[]};
      let bottom=height-BOTTOM;
      // Bottom-up: equipment, facilities, schools. No category frames or pages.
      for(const b of [...bands].reverse()) {
        const top=bottom-b.height;
        world[b.kind]=b.items.map(item=>({...item,y:top+item.y}));
        bottom=top-BAND_GAP;
      }
      return world;
    }
  }
  throw new RangeError('Field bands could not fit');
}
