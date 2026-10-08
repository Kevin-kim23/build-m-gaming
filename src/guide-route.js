// Resolve each destination from the currently visible panel, not a remembered click count.
export function guideRoute(step,context={}) {
  if(!step?.ready||context.blocked)return null;
  const route=(selector,text)=>({selector,text});
  if(!context.panel)return route(step.panel==='shop'?'#open-shop':'#open-equipment',
    step.panel==='shop'?'먼저 상점을 열어주세요.':'장비 메뉴에서 구매와 강화를 할 수 있습니다.');
  if(context.panel!==step.panel)return route(`[data-panel="${step.panel}"]`,step.panel==='shop'?'상점 탭을 선택해 주세요.':'장비 탭을 선택해 주세요.');
  if(step.panel==='shop'&&context.category!==step.category) {
    const name={recruit:'군대 모집',schools:'군사학교',facilities:'시설'}[step.category];
    return route(`.shop-categories [data-shop-category="${step.category}"]`,`${name} 탭을 선택해 주세요.`);
  }
  if(step.panel==='equipment') {
    if(context.category!=='military')return route('[data-equipment-category="military"]','군사 장비 탭을 선택해 주세요.');
    if(context.item!==step.item)return route(`[data-select-equipment="${step.item}"]`,'안내할 장비를 선택해 주세요.');
  }
  return route(step.selector,step.text);
}

// Four non-overlapping shade rectangles leave the real control touchable.
export function spotlightLayout(rect,width,height,bubbleHeight,safe={top:12,bottom:12}) {
  const clamp=(value,max)=>Math.max(0,Math.min(max,value));
  const x=clamp(rect.left-4,width),y=clamp(rect.top-4,height);
  const right=clamp(rect.right+4,width),bottom=clamp(rect.bottom+4,height);
  const w=Math.max(0,right-x),h=Math.max(0,bottom-y),gap=12;
  const topRoom=y-safe.top-gap,bottomRoom=height-safe.bottom-bottom-gap;
  const below=bottomRoom>=bubbleHeight||bottomRoom>topRoom;
  const available=Math.max(0,below?bottomRoom:topRoom),bh=Math.min(bubbleHeight,available);
  return {hole:{x,y,width:w,height:h},bubble:{top:below?bottom+gap:y-gap-bh,maxHeight:available},
    shades:[{x:0,y:0,width,height:y},{x:0,y:bottom,width,height:height-bottom},
      {x:0,y,width:x,height:h},{x:right,y,width:width-right,height:h}]};
}
