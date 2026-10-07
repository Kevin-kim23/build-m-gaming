import { ownedFacilities } from './facilities.js';
import { deployedEquipment } from './equipment.js';
import { ownedSchools, layoutFieldSchools, fieldArmyArea } from './field-schools.js';
import { layoutFieldArmy } from './field-layout.js';
export const FIELD_PAGE_ITEMS = 4;
export function fieldPages(state) {
  const pages=[{name:'연병장',kind:'army',items:[]}];
  for(const [kind,name,items] of [['equipment','장비',deployedEquipment(state)],['facilities','시설',ownedFacilities(state)]]) {
    for(let i=0;i<items.length;i+=FIELD_PAGE_ITEMS)pages.push({kind,name:`${name} ${i/FIELD_PAGE_ITEMS+1}`,items:items.slice(i,i+FIELD_PAGE_ITEMS)});
  }
  return pages;
}
// Fixed-width horizontal pages preserve legible sprites instead of shrinking the entire base.
export function layoutFieldWorld(state,pageWidth,height) {
  const pages=fieldPages(state),schools=layoutFieldSchools(ownedSchools(state),[],pageWidth,height-14);
  const army=layoutFieldArmy(state,fieldArmyArea(schools,[],pageWidth,height));
  const equipment=[],facilities=[];
  pages.forEach((page,index)=> {
    if(!index)return;
    page.items.forEach((item,i)=> {
      const cellWidth=(pageWidth-20)/2,cellHeight=(height-40)/2;
      const ratio=page.kind==='equipment'?35/66:72/96;
      const width=Math.max(1,Math.min(page.kind==='equipment'?66:64,cellWidth-8,(cellHeight-14)/ratio));
      const h=width*ratio;
      const placed={...item,x:index*pageWidth+10+(i%2)*cellWidth+(cellWidth-width)/2,
        y:18+Math.floor(i/2)*cellHeight+(cellHeight-14-h)/2,width,height:h};
      (page.kind==='equipment'?equipment:facilities).push(placed);
    });
  });
  return {pages,army,schools,equipment,facilities};
}
