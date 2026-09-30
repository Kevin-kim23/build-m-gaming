import { SCHOOLS } from './schools.js';
const drawings=new Map();
// Original pixel campus, cached per school/level and shared by its shop card.
export function schoolIcon(id,level) {
  const key=`${id}:${level}`;
  if(drawings.has(key)) return drawings.get(key);
  const floors=id==='officer'?Math.min(5,3+Math.max(1,level)):Math.max(1,level), color=id==='officer'?'#788fa1':'#8e9b74';
  const top=54-floors*7;
  let windows='';
  for(let row=0;row<floors;row++) for(let col=0;col<4;col++)
    windows+=`<path fill="#bacfc5" d="M${24+col*12} ${top+5+row*7}h6v4h-6z"/>`;
  let detail='';
  for(let row=0;row<floors;row++)for(let col=0;col<4;col++){
    const x=24+col*12,y=top+5+row*7;
    detail+=`<path fill="#354f52" d="M${x} ${y+1}h6v2h-6z"/><path fill="#e3e2bb" d="M${x+2.5} ${y}h.5v4h-.5zM${x-1} ${y+4}h8v.5h-8z"/>`;
  }
  for(let x=22;x<74;x+=7)detail+=`<path fill="#59765a" d="M${x} ${top-3}h4v2h-4z"/><path fill="#e0d7aa" d="M${x} ${top-3}h4v.5h-4z"/>`;
  detail+='<path fill="#c3c2a0" d="M39 63h18v2H39zM37 65h22v1H37zM20 60h18v.5H20zM58 60h18v.5H58z"/><path fill="#182e29" d="M43 55h4v7h-4zM49 55h4v7h-4z"/>';
  if(id==='officer') {
    // Each expansion adds its own architectural detail inside the same cached footprint.
    if(level>=2)detail+='<path fill="#344c60" d="M17 20h3v38h-3zM76 20h3v38h-3z"/><path fill="#b9c9cf" d="M18 20h1v35h-1zM77 20h1v35h-1z"/>';
    if(level>=3)detail+='<path fill="#3d5669" d="M8 44h12v17H8zM77 44h12v17H77z"/><path fill="#b7c8c8" d="M10 47h7v3h-7zM79 47h7v3h-7zM10 53h7v3h-7zM79 53h7v3h-7z"/><path fill="#d1c79f" d="M7 42h13v2H7zM77 42h13v2H77z"/>';
    if(level>=4)detail+='<path fill="#c3a663" d="M27 18h3v34h-3zM66 18h3v34h-3zM35 49h27v3H35z"/><path fill="#f1dda0" d="M27 18h1v34h-1zM66 18h1v34h-1zM35 49h27v1H35z"/>';
    if(level>=5)detail+='<path fill="#344f63" d="M37 5h22v11H37zM35 14h26v3H35z"/><path fill="#d8c78b" d="M36 4h24v2H36zM43 7h10v7H43z"/><path fill="#f1edcf" d="M45 8h6v5H45z"/><path fill="#344f63" d="M47 8h1v3h3v1h-4z"/>';
  }
  const svg=`<svg class="school-art" viewBox="0 0 96 72" role="img" aria-label="${SCHOOLS[id].name} Lv.${level} 건물" shape-rendering="crispEdges"><path fill="#15271d66" d="M13 59h75v8H13z"/><path fill="#445c48" d="M12 43h72v19H12z"/><path fill="${color}" d="M19 ${top}h58v${62-top}H19z"/><path fill="#c9c393" d="M16 ${top-4}h64v5H16z"/>${windows}<path fill="#35493d" d="M42 53h12v10H42z"/><path fill="#dac98c" d="M9 17h2v45H9z"/><path fill="${id==='officer'?'#85aabc':'#b5c18b'}" d="M11 17h16v9H11z"/><path fill="#e7d795" d="M43 ${top-10}h10v5H43z"/>${detail}</svg>`;
  drawings.set(key,svg);return svg;
}
