import { FACILITY_BY_ID } from './facility-catalog.js';
const cache=new Map();
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
function windows(x,y,count) {
  return Array.from({length:count},(_,i)=>rect(x+i*13,y,9,11,'#263c42')+rect(x+1+i*13,y+1,6,4,'#90bac1')+rect(x+4+i*13,y,1,11,'#596d65')).join('');
}
function details(id) {
  switch(id) {
    case 'kitchen':return rect(68,9,8,21,'#514b43')+rect(66,8,12,4,'#b0aaa0')+rect(23,39,21,3,'#e4d1a0')+rect(25,36,3,12,'#e4d1a0')+rect(33,36,3,12,'#e4d1a0')+rect(41,36,3,12,'#e4d1a0');
    case 'gym':return rect(22,43,28,3,'#dce4dc')+rect(20,37,5,14,'#39464c')+rect(47,37,5,14,'#39464c')+rect(18,39,2,10,'#bcc8c6')+rect(52,39,2,10,'#bcc8c6');
    case 'pcRoom':return [22,37,52].map(x=>rect(x,37,11,9,'#273742')+rect(x+1,38,9,6,'#6bc6db')+rect(x+5,46,2,3,'#c2c9bf')+rect(x+2,49,9,2,'#4a5453')).join('');
    case 'infirmary':return rect(35,35,19,19,'#e3e1cb')+rect(42,38,5,13,'#488d78')+rect(38,42,13,5,'#488d78');
    case 'range':return [25,47,69].map(x=>rect(x,40,2,17,'#625648')+`<circle cx="${x+1}" cy="37" r="7" fill="#e3d7ba"/><circle cx="${x+1}" cy="37" r="4" fill="#9b6551"/><circle cx="${x+1}" cy="37" r="2" fill="#e3d7ba"/>`).join('');
    case 'workshop':return rect(24,32,43,27,'#34464a')+Array.from({length:5},(_,i)=>rect(26,34+i*4,39,2,'#708585')).join('')+rect(74,41,4,15,'#e8ca7e')+rect(71,40,10,4,'#e8ca7e');
    case 'depot':return [19,33,47].map((x,i)=>rect(x,44-i*3,12,14+i*3,'#b98b52')+rect(x+2,46-i*3,8,2,'#dfbd80')+rect(x+5,44-i*3,2,14+i*3,'#6c5c41')).join('');
    case 'comms':return rect(69,4,3,25,'#d4d7bf')+`<path d="M58 9 L81 9 L72 20 Z" fill="#afc7c7"/><path d="M70 9 L73 3" stroke="#4c676b" stroke-width="2"/>`;
    case 'operations':return rect(38,9,22,14,'#344e53')+windows(40,11,1)+rect(60,4,2,20,'#d0c9a6')+rect(62,5,13,7,'#c49c54')+rect(32,42,26,3,'#decd92')+rect(38,38,3,11,'#decd92')+rect(49,38,3,11,'#decd92');
    default:return '';
  }
}
export function facilityIcon(id) {
  if(cache.has(id))return cache.get(id);
  const f=Object.hasOwn(FACILITY_BY_ID,id)?FACILITY_BY_ID[id]:null;if(!f)throw new RangeError('Unknown facility art');
  let body=rect(6,58,85,9,'#334433')+rect(8,56,80,7,'#71816a');
  if(id==='futsal') {
    body+=rect(10,20,78,38,'#3f7958')+rect(12,22,74,34,'#66a374')+
      `<path d="M14 24H84V54H14Z M49 24V54" stroke="#e2e6c9" stroke-width="1.5" fill="none"/><circle cx="49" cy="39" r="8" stroke="#e2e6c9" fill="none"/>`+
      rect(9,31,8,17,'#d9e2cf')+rect(10,33,5,13,'#728e80')+rect(81,31,8,17,'#d9e2cf')+rect(83,33,5,13,'#728e80');
    for(const x of [9,29,69,89])body+=rect(x,16,1,44,'#465c53')+rect(x-2,14,5,3,'#d3dcc0');
  } else {
    body+=rect(14,25,66,34,f.color)+rect(80,27,7,32,'#485b54')+rect(14,54,66,5,'#637368')+
      `<path d="M10 26 L23 15 L77 15 L88 26Z" fill="#394d48"/>`+rect(10,26,78,4,'#273e39')+rect(23,15,54,2,'#9bab8f')+
      windows(20,31,id==='workshop'?0:3)+rect(68,39,10,20,'#273d3d')+rect(69,40,7,10,'#789b9f')+rect(69,51,2,2,'#ebcf87')+rect(64,59,18,3,'#c3be9e')+details(id);
    for(let x=17;x<78;x+=10)body+=rect(x,56,6,1,'#c9c8a3');
  }
  const svg=`<svg class="facility-art" viewBox="0 0 96 72" aria-hidden="true" shape-rendering="crispEdges">${body}</svg>`;
  cache.set(id,svg);return svg;
}
