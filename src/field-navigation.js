import { fieldPages } from './field-world.js';
import { createFieldGesture } from './field-gesture.js';
import { reportError } from './diagnostics.js';
export function createFieldNavigation({viewport,zone,previous,next,label,earnTap}) {
  const gestures=createFieldGesture();
  let pages=fieldPages({}),mouse=null,lastWidth=0;
  const pageIndex=()=>Math.max(0,Math.min(pages.length-1,Math.round(viewport.scrollLeft/Math.max(1,viewport.clientWidth))));
  function controls() {
    const index=pageIndex();
    label.textContent=`${pages[index].name} · ${index+1}/${pages.length}`;
    previous.disabled=index===0;next.disabled=index===pages.length-1;
    label.parentElement.hidden=pages.length===1;
  }
  function turn(delta) {
    viewport.scrollTo({left:Math.max(0,Math.min(pages.length-1,pageIndex()+delta))*viewport.clientWidth,behavior:'smooth'});
  }
  previous.addEventListener('click',()=>turn(-1));next.addEventListener('click',()=>turn(1));
  zone.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();turn(e.key==='ArrowLeft'?-1:1);}});
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
  viewport.addEventListener('scroll',()=>{gestures.scroll();controls();},{passive:true});
  return {
    sync(state) {
      const oldPosition=lastWidth?viewport.scrollLeft/lastWidth:0;
      const oldIndex=Math.min(pages.length-1,Math.floor(oldPosition)),anchor=pages[oldIndex].name;
      const nextPages=fieldPages(state),width=viewport.clientWidth;
      const changed=width!==lastWidth||nextPages.map(p=>p.name).join(':')!==pages.map(p=>p.name).join(':');
      pages=nextPages;
      if(changed){
        zone.style.width=`${Math.max(1,width)*pages.length}px`;
        zone.style.setProperty('--field-page-width',`${width}px`);
        const index=pages.findIndex(p=>p.name===anchor);
        viewport.scrollLeft=Math.max(0,Math.min(pages.length-1,(index<0?oldIndex:index)+(oldPosition-oldIndex)))*width;
        lastWidth=width;
      }
      controls();
      return width;
    },
    clear() {gestures.clear();mouse=null;},
  };
}
