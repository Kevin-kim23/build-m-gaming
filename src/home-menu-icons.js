import {personalIcon} from './personal-art.js';
import {facilityIcon} from './facility-art.js';
import {potionIcon} from './potion-art.js';
// Original pixel miniatures; shared item/building artwork stays consistent with the game.
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
function miniature(kind){
 const p=[],r=(...args)=>p.push(rect(...args));
 r(4,41,40,3,'#142029');
 if(kind==='recruit'){
  r(10,29,28,11,'#283b3e');r(7,34,34,8,'#40595b');r(10,33,12,6,'#70817a');r(28,33,10,6,'#4f6866');
  r(19,25,10,8,'#a88d69');r(15,12,19,15,'#d3bb91');r(28,14,6,12,'#9d8665');r(18,23,10,3,'#c6a77d');
  r(12,10,25,11,'#334b4d');r(15,6,19,11,'#526f70');r(18,5,13,3,'#90a39a');r(15,10,6,5,'#758b80');r(24,8,8,4,'#627e77');
  r(10,18,29,4,'#253a40');r(12,18,23,1,'#a4b1a0');r(17,22,3,2,'#37474b');r(28,22,3,2,'#37474b');
  r(15,32,3,10,'#a09368');r(30,32,3,10,'#a09368');r(20,35,8,5,'#273f46');r(23,34,2,3,'#c5b57f');
 }else{
  r(4,31,40,10,'#22333b');r(6,33,36,6,'#647477');
  for(let x=8;x<40;x+=7){r(x,34,5,5,'#263940');r(x+1,35,3,2,'#9aa69b');}
  r(7,25,33,8,'#526f68');r(11,23,23,4,'#829489');r(6,30,36,2,'#a1af96');r(28,26,10,4,'#3a5553');
  r(17,15,17,9,'#4c6b67');r(20,12,11,4,'#7d9485');r(18,16,13,2,'#adbb9d');r(29,16,17,3,'#a0b3a2');r(43,15,4,5,'#3f5759');
  r(14,19,6,6,'#354e50');r(22,10,2,4,'#c0b776');r(11,26,4,3,'#bcc69c');r(35,30,3,2,'#c9b979');
 }
 return '<svg viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">'+p.join('')+'</svg>';
}
const icons={recruit:miniature('recruit'),equipment:miniature('equipment'),shop:facilityIcon('depot',5),facilities:facilityIcon('operations',5),personal:personalIcon('sword',10),items:potionIcon('blue'),battle:personalIcon('flag',10)};
export function homeMenuIcon(key){return icons[key]?`<span class="home-menu-icon" aria-hidden="true">${icons[key]}</span>`:'';}
