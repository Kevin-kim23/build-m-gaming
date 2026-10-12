import { createGuideFlow } from './guide.js';
import { createGuideSpotlight } from './guide-spotlight.js';
import { reportError } from './diagnostics.js';
import './guide.css';

const OFF_KEY='budae-kiugi-ui-guide-off';
let off=false,selected=null;
try { off=localStorage.getItem(OFF_KEY)==='1'; } catch(error) {reportError('guide.readOff',error);}
function setOff(value){
  off=value;
  try {localStorage.setItem(OFF_KEY,value?'1':'0');} catch(error){reportError('guide.saveOff',error);}
}
export const currentGuide=()=>off?null:selected;
export function createGuideUI() {
  const box=document.querySelector('#coach'),text=document.querySelector('#coach-text');
  const flow=createGuideFlow();let state=null,active=false;
  const spotlight=createGuideSpotlight({onLater:()=>{
    if(selected)flow.defer(selected.id);
    sync(state,active);
  }});
  function sync(next,canRun=true){
    state=next;active=canRun;
    selected=off||!state?null:flow.next(state);
    box.hidden=!selected;
    if(selected&&text.textContent!==selected.text)text.textContent=selected.text;
    spotlight.sync(selected,canRun&&!off&&!flow.paused);
  }
  document.querySelector('#coach-off').addEventListener('click',()=>{setOff(true);sync(state,active);});
  return {sync,suspend:()=>spotlight.sync(selected,false),
    resume(){setOff(false);flow.resume();sync(state,active);},
    destroy:spotlight.destroy,
  };
}
