import {layoutHomeField} from './home-field-layout.js';
import { createFieldGesture } from './field-gesture.js';
import { reportError } from './diagnostics.js';
export function createFieldNavigation({viewport,zone,hint,earnTap}) {
  const gestures=createFieldGesture();

  zone.addEventListener('pointerdown',e=>{
    if(zone.disabled||(e.pointerType==='mouse'&&e.button!==0))return;
    if(!gestures.down(e.pointerId,e.clientX,e.clientY,e.timeStamp))return;
    try {zone.setPointerCapture?.(e.pointerId);}catch(error){reportError('field.capture',error);}
  });
  zone.addEventListener('pointermove',e=>{
    gestures.move(e.pointerId,e.clientX,e.clientY);
  });
  zone.addEventListener('pointerup',e=>{
    const tap=gestures.up(e.pointerId,e.clientX,e.clientY);
    if(tap&&!zone.disabled)earnTap({clientX:e.clientX,clientY:e.clientY,detail:1});
  });
  for(const type of ['pointercancel','lostpointercapture'])zone.addEventListener(type,e=>{gestures.cancel(e.pointerId);});
  zone.addEventListener('click',e=>{if(e.detail===0&&!zone.disabled)earnTap(e);});
  viewport.addEventListener('scroll',()=>gestures.scroll(),{passive:true});
  return {
    sync(state) {
      const viewportWidth=viewport.clientWidth;
      const world=layoutHomeField(state,viewportWidth/2,viewport.clientHeight/2);
      zone.style.width='100%';zone.style.height='100%';
      viewport.scrollLeft=0;viewport.scrollTop=0;
      zone.style.setProperty('--field-view-width',`${viewportWidth}px`);
      hint.hidden=true;
      return world;
    },
    clear() {gestures.clear();},
  };
}
