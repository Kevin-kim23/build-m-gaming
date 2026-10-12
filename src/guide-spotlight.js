import { guideRoute, spotlightLayout } from './guide-route.js';

// The hole exposes the original button: purchases still use the normal game/session actions.
export function createGuideSpotlight({onLater,doc=document,win=window}) {
  const root=doc.createElement('div');
  root.id='guide-spotlight';root.setAttribute('popover','manual');
  root.innerHTML='<div class="guide-shade"></div>'.repeat(4)+
    '<div class="guide-ring" aria-hidden="true"></div><section class="guide-dialogue" aria-label="교관 안내"><small>부대 교관</small><h2></h2><p id="guide-dialogue-text" role="status"></p><button type="button" data-guide-later>나중에 하기</button></section>';
  doc.body.append(root);
  const shades=[...root.querySelectorAll('.guide-shade')],ring=root.querySelector('.guide-ring');
  const bubble=root.querySelector('.guide-dialogue'),title=bubble.querySelector('h2'),copy=bubble.querySelector('p');
  const later=root.querySelector('[data-guide-later]');
  let step=null,enabled=false,frame=0,target=null,description=null,destroyed=false;
  const supported=typeof root.showPopover==='function';
  root.hidden=!supported;
  function clearTarget(){
    if(target){if(description===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',description);}
    target=null;description=null;sizeObserver.disconnect();
  }
  function hide(){if(supported&&root.matches(':popover-open'))root.hidePopover();clearTarget();}
  function schedule(){if(enabled&&step?.ready&&!frame&&!destroyed)frame=win.requestAnimationFrame(()=>{frame=0;render();});}
  function context(){
    const dialogs=[...doc.querySelectorAll('dialog[open]')];
    if(dialogs.some(d=>d.id!=='modal'))return {blocked:true};
    const panel=doc.querySelector('#modal[open]');
    return panel?{panel:panel.querySelector('[data-panel][aria-selected="true"]')?.dataset.panel,
      category:panel.querySelector('[data-shop-content]')?.dataset.shopContent??panel.querySelector('[data-equipment-category][aria-pressed="true"]')?.dataset.equipmentCategory,
      item:panel.querySelector('[data-select-equipment][aria-pressed="true"]')?.dataset.selectEquipment}:{};
  }
  const setBox=(node,box)=>{for(const [key,value] of Object.entries({left:box.x,top:box.y,width:box.width,height:box.height}))node.style[key]=value+'px';};
  function render(){
    if(!supported||!enabled||doc.hidden){hide();return;}
    const route=guideRoute(step,context());
    if(!route){hide();return;}
    // A body sibling becomes inert when a modal opens. Keep the popover inside the
    // active modal's subtree, while the popover top layer still uses viewport geometry.
    const host=doc.querySelector('#modal[open]')??doc.body;
    if(root.parentElement!==host){hide();host.append(root);}
    const next=doc.querySelector('#modal[open]')?.querySelector(route.selector)??doc.querySelector(route.selector);
    if(!next||next.disabled||!next.getClientRects().length){hide();return;}
    const changed=next!==target;
    if(changed){
      clearTarget();target=next;description=target.getAttribute('aria-describedby');
      target.setAttribute('aria-describedby',[description,'guide-dialogue-text'].filter(Boolean).join(' '));
      target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      sizeObserver.observe(target);
    }
    if(title.textContent!==step.title)title.textContent=step.title;
    const text=route.selector===step.selector?route.text:step.text+' '+route.text;
    if(copy.textContent!==text)copy.textContent=text;
    if(!root.matches(':popover-open'))root.showPopover();
    if(changed)target.focus({preventScroll:true});
    bubble.style.maxHeight='none';
    const css=win.getComputedStyle(root),safe={top:12+(parseFloat(css.getPropertyValue('--guide-safe-top'))||0),bottom:12+(parseFloat(css.getPropertyValue('--guide-safe-bottom'))||0)};
    const layout=spotlightLayout(target.getBoundingClientRect(),win.innerWidth,win.innerHeight,bubble.getBoundingClientRect().height,safe);
    // Very small/obstructed viewports fall back to the non-blocking coach.
    if(layout.bubble.maxHeight<72||!layout.hole.width||!layout.hole.height){hide();return;}
    shades.forEach((shade,i)=>setBox(shade,layout.shades[i]));setBox(ring,layout.hole);
    bubble.style.top=layout.bubble.top+'px';bubble.style.maxHeight=layout.bubble.maxHeight+'px';
  }
  const sizeObserver=new ResizeObserver(schedule);
  const dialogObserver=new MutationObserver(schedule);
  const watch=()=>doc.querySelectorAll('dialog').forEach(d=>dialogObserver.observe(d,{attributes:true,attributeFilter:['open']}));
  watch();
  const bodyObserver=new MutationObserver(()=>{watch();schedule();});
  bodyObserver.observe(doc.body,{childList:true});
  const panelObserver=new MutationObserver(schedule),panel=doc.querySelector('#modal');
  if(panel)panelObserver.observe(panel,{childList:true});
  const onKey=event=>{
    if(!supported||!root.matches(':popover-open'))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onLater();return;}
    if(event.key==='Tab'){
      event.preventDefault();(doc.activeElement===target?later:target)?.focus({preventScroll:true});
    }
  };
  later.addEventListener('click',onLater);
  for(const name of ['click','close','scroll','visibilitychange'])doc.addEventListener(name,schedule,true);
  doc.addEventListener('keydown',onKey,true);win.addEventListener('resize',schedule);
  return {
    sync(next,active=true){const key=g=>g?`${g.id}|${g.ready}|${g.selector}|${g.text}`:'';
      if(key(step)===key(next)&&enabled===active)return;step=next;enabled=active;
      if(!enabled||!step?.ready){win.cancelAnimationFrame(frame);frame=0;hide();}else schedule();},
    refresh:schedule,
    hide,
    destroy(){destroyed=true;win.cancelAnimationFrame(frame);hide();root.remove();
      for(const observer of [sizeObserver,dialogObserver,bodyObserver,panelObserver])observer.disconnect();
      for(const name of ['click','close','scroll','visibilitychange'])doc.removeEventListener(name,schedule,true);
      doc.removeEventListener('keydown',onKey,true);win.removeEventListener('resize',schedule);},
  };
}
