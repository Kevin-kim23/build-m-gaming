import { layoutFieldWorld } from './field-world.js';
import { createFieldGesture } from './field-gesture.js';
import { reportError } from './diagnostics.js';
export function createFieldNavigation({viewport,zone,hint,earnTap}) {
  const gestures=createFieldGesture();
  let mouse=null,worldWidth=0;
  zone.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();
      viewport.scrollTo({left:Math.max(0,Math.min(worldWidth-viewport.clientWidth,viewport.scrollLeft+(e.key==='ArrowLeft'?-80:80))),behavior:'smooth'});
    }
  });
  zone.addEventListener('pointerdown',e=>{
    if(zone.disabled||(e.pointerType==='mouse'&&e.button!==0))return;
    if(!gestures.down(e.pointerId,e.clientX,e.clientY,e.timeStamp))return;
    if(e.pointerType==='mouse')mouse={id:e.pointerId,x:e.clientX,scroll:viewport.scrollLeft};
    try {zone.setPointerCapture?.(e.pointerId);}catch(error){reportError('field.capture',error);}
  });
  zone.addEventListener('pointermove',e=>{
    if(gestures.move(e.pointerId,e.clientX,e.clientY)&&mouse?.id===e.pointerId)viewport.scrollLeft=mouse.scroll+mouse.x-e.clientX;
  });
  zone.addEventListener('pointerup',e=>{
    const tap=gestures.up(e.pointerId,e.clientX,e.clientY);
    if(mouse?.id===e.pointerId)mouse=null;
    if(tap&&!zone.disabled)earnTap({clientX:e.clientX,clientY:e.clientY,detail:1});
  });
  for(const type of ['pointercancel','lostpointercapture'])zone.addEventListener(type,e=>{gestures.cancel(e.pointerId);if(mouse?.id===e.pointerId)mouse=null;});
  zone.addEventListener('click',e=>{if(e.detail===0&&!zone.disabled)earnTap(e);});
  viewport.addEventListener('scroll',()=>gestures.scroll(),{passive:true});
  return {
    sync(state) {
      const viewportWidth=viewport.clientWidth;
      const world=layoutFieldWorld(state,viewportWidth/2,viewport.clientHeight/2);
      const width=world.width*2;
      if(width!==worldWidth){
        const scroll=viewport.scrollLeft;
        zone.style.width=`${width}px`;
        viewport.scrollLeft=Math.max(0,Math.min(scroll,width-viewportWidth));
        worldWidth=width;
      }
      zone.style.setProperty('--field-view-width',`${viewportWidth}px`);
      hint.hidden=width<=viewportWidth+1;
      return world;
    },
    clear() {gestures.clear();mouse=null;},
  };
}
