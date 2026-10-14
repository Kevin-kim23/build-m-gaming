// Resolve each destination from the currently visible panel, not a remembered click count.
export function guideRoute(step,context={}) {
  if(!step?.ready||context.blocked)return null;
  const route=(selector,text)=>({selector,text});
  const destinations={recruit:['#open-recruit','군대 모집'],store:['#open-shop','상점'],
    facilities:['#open-facilities','시설'],items:['#open-items','아이템'],
    military:['#open-equipment','장비'],personal:['#open-personal','개인장비']};
  const category=step.category??(step.panel==='shop'?'recruit':'military');
  const destination=destinations[category];
  if(!destination)return null;
  if(!context.panel){
    return route(destination[0],`${destination[1]} 메뉴를 열어주세요.`);
  }
  // Independent screens have no cross-category tabs. Expose the close control
  // first; only after closing may the guide focus a non-inert home shortcut.
  if(context.panel!==step.panel||context.category!==category) {
    return route(context.panel==='equipment'?'#close-equipment':'#close-shop',
      `이 창을 닫고 홈의 ${destination[1]} 메뉴로 이동해 주세요.`);
  }
  // Military and personal equipment now expose their own action on every list row.
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
